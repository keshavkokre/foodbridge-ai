import { Allocation } from '../models/Allocation.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { NGOProfile } from '../models/NGOProfile.js';
import { PickupAssignment } from '../models/PickupAssignment.js';
import { HandoverVerification } from '../models/HandoverVerification.js';
import { createOtpCredentials } from '../utils/otpSecurity.js';
import { runAllocationForDonation } from './donationController.js';
import { ALLOCATION_STATUS, DONATION_STATUS, ASSIGNMENT_STATUS, ROLES } from '../config/constants.js';

/**
 * Gets incoming proposed allocations awaiting action by the calling NGO.
 */
export async function getIncomingAllocations(req, res, next) {
  try {
    const filter = {
      ngoId: req.user._id,
      status: ALLOCATION_STATUS.PROPOSED,
      responseDeadline: { $gt: new Date() }
    };

    const allocations = await Allocation.find(filter)
      .populate('donationId')
      .populate('demandId')
      .sort({ createdAt: -1 });

    return res.json(allocations);
  } catch (error) {
    next(error);
  }
}

/**
 * NGO accepts an allocation proposal.
 * Generates secure hashed OTP credentials and dispatches a PickupAssignment for volunteers.
 */
export async function acceptAllocation(req, res, next) {
  try {
    const { id } = req.params;

    // Atomically find and update allocation
    const allocation = await Allocation.findOneAndUpdate(
      {
        _id: id,
        ngoId: req.user._id,
        status: ALLOCATION_STATUS.PROPOSED
      },
      {
        $set: { status: ALLOCATION_STATUS.ACCEPTED }
      },
      { new: true }
    ).populate('donationId');

    if (!allocation) {
      return res.status(404).json({
        error: 'Allocation proposal not found, expired, or already processed.'
      });
    }

    const donation = allocation.donationId;

    // Create PickupAssignment for volunteer dispatch
    const assignment = new PickupAssignment({
      allocationId: allocation._id,
      donationId: donation._id,
      ngoId: req.user._id,
      pickupAddress: {
        street: donation.pickupAddress?.street,
        city: donation.pickupAddress?.city,
        coordinates: donation.pickupAddress?.location?.coordinates || [77.5946, 12.9716]
      },
      dropoffAddress: {
        street: req.user.address?.street,
        city: req.user.address?.city,
        coordinates: req.user.address?.location?.coordinates || [77.6000, 12.9750]
      },
      status: ASSIGNMENT_STATUS.UNCLAIMED,
      isDemo: allocation.isDemo
    });

    await assignment.save();

    // Generate two independent cryptographically hashed OTP credentials
    const donorCredentials = createOtpCredentials();
    const ngoCredentials = createOtpCredentials();

    const handoverRecord = new HandoverVerification({
      assignmentId: assignment._id,
      donorOtpHash: donorCredentials.hash,
      donorOtpSalt: donorCredentials.salt,
      ngoOtpHash: ngoCredentials.hash,
      ngoOtpSalt: ngoCredentials.salt,
      isDemo: allocation.isDemo
    });

    await handoverRecord.save();

    // Update donation status
    await FoodDonation.updateOne(
      { _id: donation._id },
      { $set: { status: DONATION_STATUS.PICKUP_SCHEDULED } }
    );

    // Note: Return raw OTP code ONLY to the authenticated NGO receiver
    return res.json({
      message: 'Allocation accepted. Pickup dispatch created for volunteer pool.',
      allocation,
      assignmentId: assignment._id,
      ngoReceiptOtp: ngoCredentials.rawOtp // To be shown only on NGO receiving screen
    });
  } catch (error) {
    next(error);
  }
}

/**
 * NGO declines an allocation proposal.
 * Immediately restores servings to donation and triggers dynamic reallocation to next candidate.
 */
export async function declineAllocation(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const allocation = await Allocation.findOneAndUpdate(
      {
        _id: id,
        ngoId: req.user._id,
        status: ALLOCATION_STATUS.PROPOSED
      },
      {
        $set: {
          status: ALLOCATION_STATUS.DECLINED,
          declinedReason: reason || 'Declined by NGO supervisor'
        }
      },
      { new: true }
    );

    if (!allocation) {
      return res.status(404).json({
        error: 'Allocation proposal not found or already processed.'
      });
    }

    // Release NGO active committed load
    await NGOProfile.updateOne(
      { userId: req.user._id },
      { $inc: { activeCommittedServings: -allocation.allocatedServings } }
    );

    // Atomically restore servings to donation
    const restoredDonation = await FoodDonation.findOneAndUpdate(
      { _id: allocation.donationId },
      {
        $inc: { remainingServings: allocation.allocatedServings },
        $set: { status: DONATION_STATUS.PARTIALLY_ALLOCATED }
      },
      { new: true }
    );

    // Dynamically trigger matching engine for remaining portion!
    let reallocResult = null;
    if (restoredDonation) {
      reallocResult = await runAllocationForDonation(restoredDonation);
    }

    return res.json({
      message: 'Allocation declined. Unallocated quota restored and reallocated to next optimal candidate.',
      allocation,
      restoredServings: allocation.allocatedServings,
      reallocationResult: reallocResult
    });
  } catch (error) {
    next(error);
  }
}
