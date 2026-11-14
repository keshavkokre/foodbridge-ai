import { repo } from '../storage/repository.js';
import { createOtpCredentials } from '../utils/otpSecurity.js';
import { runAllocationForDonation } from './donationController.js';
import { ALLOCATION_STATUS, DONATION_STATUS, ASSIGNMENT_STATUS } from '../config/constants.js';

export async function getIncomingAllocations(req, res, next) {
  try {
    const ngoId = (req.user._id || req.user.id).toString();
    const allAllocations = await repo.allocations.find({});

    const now = new Date();
    const active = allAllocations.filter(a => {
      const aNgoId = (a.ngoId?._id || a.ngoId?.id || a.ngoId).toString();
      const isMine = aNgoId === ngoId;
      const isProposed = a.status === ALLOCATION_STATUS.PROPOSED;
      const notExpired = new Date(a.responseDeadline) > now;
      return isMine && isProposed && notExpired;
    });

    return res.json(active);
  } catch (error) {
    next(error);
  }
}

export async function acceptAllocation(req, res, next) {
  try {
    const { id } = req.params;
    const ngoId = (req.user._id || req.user.id).toString();

    const allocation = await repo.allocations.findById(id);
    if (!allocation || allocation.status !== ALLOCATION_STATUS.PROPOSED) {
      return res.status(404).json({
        error: 'Allocation proposal not found, expired, or already processed.'
      });
    }

    // Verify ownership
    const allocNgoIdStr = (allocation.ngoId?._id || allocation.ngoId?.id || allocation.ngoId).toString();
    if (allocNgoIdStr !== ngoId) {
      return res.status(403).json({ error: 'Unauthorized: Allocation belongs to another organization.' });
    }

    // Update allocation to ACCEPTED
    const updatedAlloc = await repo.allocations.findOneAndUpdate(
      { _id: id },
      { $set: { status: ALLOCATION_STATUS.ACCEPTED } },
      { new: true }
    );

    const donationId = (allocation.donationId?._id || allocation.donationId?.id || allocation.donationId).toString();
    const donation = await repo.donations.findById(donationId);

    // Create PickupAssignment for volunteer dispatch
    const assignment = await repo.assignments.create({
      allocationId: id,
      donationId,
      ngoId,
      pickupAddress: {
        street: donation?.pickupAddress?.street || 'Donor Dock',
        city: donation?.pickupAddress?.city || 'Bangalore',
        coordinates: donation?.pickupAddress?.location?.coordinates || [77.5946, 12.9716]
      },
      dropoffAddress: {
        street: req.user.address?.street || 'Relief Facility',
        city: req.user.address?.city || 'Bangalore',
        coordinates: req.user.address?.location?.coordinates || [77.6000, 12.9750]
      },
      status: ASSIGNMENT_STATUS.UNCLAIMED,
      isDemo: allocation.isDemo
    });

    const assignmentId = (assignment._id || assignment.id).toString();

    // Generate separate hashed OTP credentials
    const donorCredentials = createOtpCredentials();
    const ngoCredentials = createOtpCredentials();

    await repo.handovers.create({
      assignmentId,
      donorOtpHash: donorCredentials.hash,
      donorOtpSalt: donorCredentials.salt,
      ngoOtpHash: ngoCredentials.hash,
      ngoOtpSalt: ngoCredentials.salt,
      isDemo: allocation.isDemo
    });

    // Update donation status
    await repo.donations.updateOne(
      { _id: donationId },
      { $set: { status: DONATION_STATUS.PICKUP_SCHEDULED } }
    );

    return res.json({
      message: 'Allocation accepted. Pickup dispatch created for volunteer pool.',
      allocation: updatedAlloc,
      assignmentId,
      ngoReceiptOtp: ngoCredentials.rawOtp // Delivered ONLY to the authenticated NGO receiver
    });
  } catch (error) {
    next(error);
  }
}

export async function declineAllocation(req, res, next) {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const ngoId = (req.user._id || req.user.id).toString();

    const allocation = await repo.allocations.findById(id);
    if (!allocation || allocation.status !== ALLOCATION_STATUS.PROPOSED) {
      return res.status(404).json({
        error: 'Allocation proposal not found or already processed.'
      });
    }

    // Verify ownership
    const allocNgoIdStr = (allocation.ngoId?._id || allocation.ngoId?.id || allocation.ngoId).toString();
    if (allocNgoIdStr !== ngoId) {
      return res.status(403).json({ error: 'Unauthorized: Allocation belongs to another organization.' });
    }

    // Mark allocation DECLINED with audit reason
    const declinedAlloc = await repo.allocations.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          status: ALLOCATION_STATUS.DECLINED,
          declinedReason: reason || 'Declined by NGO supervisor'
        }
      },
      { new: true }
    );

    // Release NGO active committed load
    await repo.ngoProfiles.updateOne(
      { userId: ngoId },
      { $inc: { activeCommittedServings: -allocation.allocatedServings } }
    );

    const donationId = (allocation.donationId?._id || allocation.donationId?.id || allocation.donationId).toString();

    // Restore unallocated servings to parent donation
    const restoredDonation = await repo.donations.findOneAndUpdate(
      { _id: donationId },
      {
        $inc: { remainingServings: allocation.allocatedServings },
        $set: { status: DONATION_STATUS.PARTIALLY_ALLOCATED }
      },
      { new: true }
    );

    // GATHER ALL PREVIOUSLY ALLOCATED OR DECLINED NGOS FOR THIS DONATION TO EXCLUDE
    const allDonationAllocs = await repo.allocations.find({ donationId });
    const excludedNgoIds = Array.from(new Set(
      allDonationAllocs.map(a => (a.ngoId?._id || a.ngoId?.id || a.ngoId).toString())
    ));

    // DYNAMIC REALLOCATION TO BACKUP NGOS
    let reallocationResult = null;
    if (restoredDonation && (restoredDonation.remainingServings || 0) > 0) {
      reallocationResult = await runAllocationForDonation(restoredDonation, excludedNgoIds);
    }

    return res.json({
      message: 'Allocation declined. Unallocated quota restored and dynamically reallocated.',
      declinedAllocation: declinedAlloc,
      restoredServings: allocation.allocatedServings,
      reallocationResult
    });
  } catch (error) {
    next(error);
  }
}
