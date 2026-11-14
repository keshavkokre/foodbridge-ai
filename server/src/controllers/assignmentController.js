import { PickupAssignment } from '../models/PickupAssignment.js';
import { HandoverVerification } from '../models/HandoverVerification.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { NGOFoodDemand } from '../models/NGOFoodDemand.js';
import { DonorProfile } from '../models/DonorProfile.js';
import { NGOProfile } from '../models/NGOProfile.js';
import { VolunteerProfile } from '../models/VolunteerProfile.js';
import { Allocation } from '../models/Allocation.js';
import { verifyOtp } from '../utils/otpSecurity.js';
import { ASSIGNMENT_STATUS, DONATION_STATUS, DEMAND_STATUS, ROLES } from '../config/constants.js';

/**
 * Gets unclaimed pickup assignments for the volunteer dispatch board.
 */
export async function getAvailableAssignments(req, res, next) {
  try {
    const assignments = await PickupAssignment.find({
      status: ASSIGNMENT_STATUS.UNCLAIMED
    })
      .populate('donationId')
      .populate('ngoId', 'fullName address phone')
      .sort({ createdAt: -1 });

    return res.json(assignments);
  } catch (error) {
    next(error);
  }
}

/**
 * Gets the volunteer's currently active assignment.
 */
export async function getMyActiveAssignment(req, res, next) {
  try {
    const assignment = await PickupAssignment.findOne({
      volunteerId: req.user._id,
      status: {
        $in: [
          ASSIGNMENT_STATUS.CLAIMED,
          ASSIGNMENT_STATUS.ARRIVED_DONOR,
          ASSIGNMENT_STATUS.PICKED_UP,
          ASSIGNMENT_STATUS.EN_ROUTE,
          ASSIGNMENT_STATUS.ARRIVED_NGO
        ]
      }
    })
      .populate('donationId')
      .populate('ngoId', 'fullName address phone');

    return res.json(assignment);
  } catch (error) {
    next(error);
  }
}

/**
 * Volunteer claims a dispatch assignment.
 */
export async function claimAssignment(req, res, next) {
  try {
    const { id } = req.params;

    const assignment = await PickupAssignment.findOneAndUpdate(
      {
        _id: id,
        status: ASSIGNMENT_STATUS.UNCLAIMED
      },
      {
        $set: {
          volunteerId: req.user._id,
          status: ASSIGNMENT_STATUS.CLAIMED,
          'timeline.claimedAt': new Date()
        }
      },
      { new: true }
    ).populate('donationId');

    if (!assignment) {
      return res.status(404).json({
        error: 'Assignment no longer available or already claimed by another volunteer.'
      });
    }

    // Attach active assignment to volunteer profile
    await VolunteerProfile.updateOne(
      { userId: req.user._id },
      { $set: { activeAssignmentId: assignment._id, isAvailable: false } }
    );

    return res.json({
      message: 'Assignment claimed successfully. Proceed to donor pickup location.',
      assignment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update milestone status (e.g. Arrived at Donor, Arrived at NGO)
 */
export async function updateAssignmentMilestone(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = [ASSIGNMENT_STATUS.ARRIVED_DONOR, ASSIGNMENT_STATUS.ARRIVED_NGO];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid intermediate milestone status.' });
    }

    const assignment = await PickupAssignment.findOneAndUpdate(
      { _id: id, volunteerId: req.user._id },
      { $set: { status } },
      { new: true }
    );

    return res.json({ message: `Status updated to ${status}`, assignment });
  } catch (error) {
    next(error);
  }
}

/**
 * Volunteer verifies pickup by submitting the Donor OTP.
 */
export async function verifyDonorPickup(req, res, next) {
  try {
    const { assignmentId, otpCode } = req.body;

    const record = await HandoverVerification.findOne({ assignmentId });
    if (!record) {
      return res.status(404).json({ error: 'Handover verification record not found.' });
    }

    if (record.isLocked || record.donorFailedAttempts >= 3) {
      return res.status(403).json({
        error: 'Verification locked due to too many failed attempts. Supervisor override required.'
      });
    }

    const isValid = verifyOtp(otpCode, record.donorOtpSalt, record.donorOtpHash);
    if (!isValid) {
      record.donorFailedAttempts += 1;
      if (record.donorFailedAttempts >= 3) {
        record.isLocked = true;
        await PickupAssignment.updateOne(
          { _id: assignmentId },
          { $set: { status: ASSIGNMENT_STATUS.VERIFICATION_LOCKED } }
        );
      }
      await record.save();

      return res.status(400).json({
        error: 'Invalid Donor OTP code.',
        attemptsRemaining: Math.max(0, 3 - record.donorFailedAttempts)
      });
    }

    // Valid OTP
    record.donorConfirmedAt = new Date();
    await record.save();

    const assignment = await PickupAssignment.findByIdAndUpdate(
      assignmentId,
      {
        $set: {
          status: ASSIGNMENT_STATUS.EN_ROUTE,
          'timeline.pickedUpAt': new Date()
        }
      },
      { new: true }
    );

    if (assignment) {
      await FoodDonation.updateOne(
        { _id: assignment.donationId },
        { $set: { status: DONATION_STATUS.IN_TRANSIT } }
      );
    }

    return res.json({
      message: 'Donor pickup verified successfully. Food batch is now en route to recipient NGO.',
      assignment
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Volunteer verifies final delivery by submitting the NGO OTP.
 */
export async function verifyNgoDelivery(req, res, next) {
  try {
    const { assignmentId, otpCode, receivedServings, storageConditionAtReceipt } = req.body;

    const record = await HandoverVerification.findOne({ assignmentId });
    if (!record) {
      return res.status(404).json({ error: 'Handover verification record not found.' });
    }

    if (record.isLocked || record.ngoFailedAttempts >= 3) {
      return res.status(403).json({
        error: 'Delivery verification locked due to excessive failed attempts.'
      });
    }

    const isValid = verifyOtp(otpCode, record.ngoOtpSalt, record.ngoOtpHash);
    if (!isValid) {
      record.ngoFailedAttempts += 1;
      if (record.ngoFailedAttempts >= 3) {
        record.isLocked = true;
      }
      await record.save();

      return res.status(400).json({
        error: 'Invalid NGO Receipt OTP code.',
        attemptsRemaining: Math.max(0, 3 - record.ngoFailedAttempts)
      });
    }

    const verifiedCount = Number(receivedServings) || 0;

    // Valid NGO OTP! Finalize rescue transaction
    record.ngoConfirmedAt = new Date();
    record.receivedServings = verifiedCount;
    record.storageConditionAtReceipt = storageConditionAtReceipt || 'compliant';
    await record.save();

    const assignment = await PickupAssignment.findByIdAndUpdate(
      assignmentId,
      {
        $set: {
          status: ASSIGNMENT_STATUS.DELIVERED,
          'timeline.deliveredAt': new Date()
        }
      },
      { new: true }
    );

    // Update Allocation
    const allocation = await Allocation.findById(assignment.allocationId);

    // Update NGO Demand fulfilled count
    if (allocation) {
      await NGOFoodDemand.updateOne(
        { _id: allocation.demandId },
        {
          $inc: {
            fulfilledServings: verifiedCount,
            remainingServings: -verifiedCount
          },
          $set: { status: DEMAND_STATUS.PARTIALLY_FULFILLED }
        }
      );

      // Check if demand fully satisfied
      const demand = await NGOFoodDemand.findById(allocation.demandId);
      if (demand && demand.remainingServings <= 0) {
        demand.status = DEMAND_STATUS.FULFILLED;
        await demand.save();
      }
    }

    // Update Donor Profile Stats
    const donation = await FoodDonation.findById(assignment.donationId);
    if (donation) {
      await DonorProfile.updateOne(
        { userId: donation.donorId },
        {
          $inc: {
            totalDonationsCount: 1,
            totalServingsDonated: verifiedCount
          }
        }
      );
      if (donation.remainingServings <= 0) {
        await FoodDonation.updateOne({ _id: donation._id }, { $set: { status: DONATION_STATUS.COMPLETED } });
      }
    }

    // Release volunteer active assignment
    await VolunteerProfile.updateOne(
      { userId: req.user._id },
      {
        $inc: { completedDeliveriesCount: 1 },
        $set: { activeAssignmentId: null, isAvailable: true }
      }
    );

    return res.json({
      message: 'Rescue completed and verified! Servings added to verified impact ledger.',
      assignment,
      verifiedServings: verifiedCount
    });
  } catch (error) {
    next(error);
  }
}
