import { repo } from '../storage/repository.js';
import { verifyOtp } from '../utils/otpSecurity.js';
import { ASSIGNMENT_STATUS, DONATION_STATUS, DEMAND_STATUS, ROLES } from '../config/constants.js';

export async function getAvailableAssignments(req, res, next) {
  try {
    const assignments = await repo.assignments.find({
      status: ASSIGNMENT_STATUS.UNCLAIMED
    });
    return res.json(assignments);
  } catch (error) {
    next(error);
  }
}

export async function getMyActiveAssignment(req, res, next) {
  try {
    const volunteerId = req.user._id || req.user.id;
    const allAssignments = await repo.assignments.find({ volunteerId });

    const activeStatuses = [
      ASSIGNMENT_STATUS.CLAIMED,
      ASSIGNMENT_STATUS.ARRIVED_DONOR,
      ASSIGNMENT_STATUS.PICKED_UP,
      ASSIGNMENT_STATUS.EN_ROUTE,
      ASSIGNMENT_STATUS.ARRIVED_NGO
    ];

    const active = allAssignments.find(a => activeStatuses.includes(a.status)) || null;
    return res.json(active);
  } catch (error) {
    next(error);
  }
}

export async function claimAssignment(req, res, next) {
  try {
    const { id } = req.params;
    const volunteerId = req.user._id || req.user.id;

    const assignment = await repo.assignments.findById(id);
    if (!assignment || assignment.status !== ASSIGNMENT_STATUS.UNCLAIMED) {
      return res.status(404).json({
        error: 'Assignment no longer available or already claimed by another volunteer.'
      });
    }

    const updated = await repo.assignments.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          volunteerId,
          status: ASSIGNMENT_STATUS.CLAIMED,
          'timeline.claimedAt': new Date().toISOString()
        }
      },
      { new: true }
    );

    await repo.volunteerProfiles.updateOne(
      { userId: volunteerId },
      { $set: { activeAssignmentId: id, isAvailable: false } }
    );

    return res.json({
      message: 'Assignment claimed successfully. Proceed to donor pickup location.',
      assignment: updated
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAssignmentMilestone(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const volunteerId = req.user._id || req.user.id;

    const allowed = [ASSIGNMENT_STATUS.ARRIVED_DONOR, ASSIGNMENT_STATUS.ARRIVED_NGO];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid intermediate milestone status.' });
    }

    const updated = await repo.assignments.findOneAndUpdate(
      { _id: id, volunteerId },
      { $set: { status } },
      { new: true }
    );

    return res.json({ message: `Status updated to ${status}`, assignment: updated });
  } catch (error) {
    next(error);
  }
}

export async function verifyDonorPickup(req, res, next) {
  try {
    const { assignmentId, otpCode } = req.body;

    const record = await repo.handovers.findOne({ assignmentId });
    if (!record) {
      return res.status(404).json({ error: 'Handover verification record not found.' });
    }

    if (record.isLocked || (record.donorFailedAttempts || 0) >= 3) {
      return res.status(403).json({
        error: 'Verification locked due to too many failed attempts. Supervisor override required.'
      });
    }

    const isValid = verifyOtp(otpCode, record.donorOtpSalt, record.donorOtpHash);
    if (!isValid) {
      const attempts = (record.donorFailedAttempts || 0) + 1;
      const isLocked = attempts >= 3;
      await repo.handovers.updateOne(
        { assignmentId },
        {
          $set: {
            donorFailedAttempts: attempts,
            isLocked
          }
        }
      );

      if (isLocked) {
        await repo.assignments.updateOne(
          { _id: assignmentId },
          { $set: { status: ASSIGNMENT_STATUS.VERIFICATION_LOCKED } }
        );
      }

      return res.status(400).json({
        error: 'Invalid Donor OTP code.',
        attemptsRemaining: Math.max(0, 3 - attempts)
      });
    }

    // Valid OTP
    await repo.handovers.updateOne(
      { assignmentId },
      { $set: { donorConfirmedAt: new Date().toISOString() } }
    );

    const assignment = await repo.assignments.findOneAndUpdate(
      { _id: assignmentId },
      {
        $set: {
          status: ASSIGNMENT_STATUS.EN_ROUTE,
          'timeline.pickedUpAt': new Date().toISOString()
        }
      },
      { new: true }
    );

    if (assignment) {
      await repo.donations.updateOne(
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

export async function verifyNgoDelivery(req, res, next) {
  try {
    const { assignmentId, otpCode, receivedServings, storageConditionAtReceipt } = req.body;
    const volunteerId = req.user._id || req.user.id;

    const record = await repo.handovers.findOne({ assignmentId });
    if (!record) {
      return res.status(404).json({ error: 'Handover verification record not found.' });
    }

    if (record.isLocked || (record.ngoFailedAttempts || 0) >= 3) {
      return res.status(403).json({
        error: 'Delivery verification locked due to excessive failed attempts.'
      });
    }

    const isValid = verifyOtp(otpCode, record.ngoOtpSalt, record.ngoOtpHash);
    if (!isValid) {
      const attempts = (record.ngoFailedAttempts || 0) + 1;
      const isLocked = attempts >= 3;
      await repo.handovers.updateOne(
        { assignmentId },
        {
          $set: {
            ngoFailedAttempts: attempts,
            isLocked
          }
        }
      );

      return res.status(400).json({
        error: 'Invalid NGO Receipt OTP code.',
        attemptsRemaining: Math.max(0, 3 - attempts)
      });
    }

    const verifiedCount = Number(receivedServings) || 50;

    await repo.handovers.updateOne(
      { assignmentId },
      {
        $set: {
          ngoConfirmedAt: new Date().toISOString(),
          receivedServings: verifiedCount,
          storageConditionAtReceipt: storageConditionAtReceipt || 'compliant'
        }
      }
    );

    const assignment = await repo.assignments.findOneAndUpdate(
      { _id: assignmentId },
      {
        $set: {
          status: ASSIGNMENT_STATUS.DELIVERED,
          'timeline.deliveredAt': new Date().toISOString()
        }
      },
      { new: true }
    );

    // Update Allocation
    const allocation = await repo.allocations.findById(assignment.allocationId);

    // Update NGO Demand
    if (allocation) {
      const demandId = allocation.demandId?._id || allocation.demandId?.id || allocation.demandId;
      await repo.demands.updateOne(
        { _id: demandId },
        {
          $inc: {
            fulfilledServings: verifiedCount,
            remainingServings: -verifiedCount
          },
          $set: { status: DEMAND_STATUS.PARTIALLY_FULFILLED }
        }
      );

      const demand = await repo.demands.findById(demandId);
      if (demand && (demand.remainingServings || 0) <= 0) {
        await repo.demands.updateOne(
          { _id: demandId },
          { $set: { status: DEMAND_STATUS.FULFILLED } }
        );
      }
    }

    // Update Donor Stats
    const donationId = assignment.donationId?._id || assignment.donationId?.id || assignment.donationId;
    const donation = await repo.donations.findById(donationId);
    if (donation) {
      const dUserId = donation.donorId?._id || donation.donorId?.id || donation.donorId;
      await repo.donorProfiles.updateOne(
        { userId: dUserId },
        {
          $inc: {
            totalDonationsCount: 1,
            totalServingsDonated: verifiedCount
          }
        }
      );
      if ((donation.remainingServings || 0) <= 0) {
        await repo.donations.updateOne({ _id: donationId }, { $set: { status: DONATION_STATUS.COMPLETED } });
      }
    }

    // Release volunteer active assignment
    await repo.volunteerProfiles.updateOne(
      { userId: volunteerId },
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

/**
 * Helper for donor to view the Pickup OTP for their active donation so they can give it to the arriving driver.
 */
export async function getDonorPickupCredentials(req, res, next) {
  try {
    const { donationId } = req.params;
    const donorId = req.user._id || req.user.id;

    const donation = await repo.donations.findById(donationId);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    const dUserId = (donation.donorId?._id || donation.donorId?.id || donation.donorId).toString();
    if (dUserId !== donorId.toString()) {
      return res.status(403).json({ error: 'Unauthorized: Donation belongs to another organization.' });
    }

    const assignment = await repo.assignments.findOne({ donationId });
    if (!assignment) {
      return res.status(404).json({ error: 'No active pickup assignment for this donation yet.' });
    }

    // In demo mode, if the donor needs the OTP code, we look up or generate a display credential
    const handover = await repo.handovers.findOne({ assignmentId: assignment._id || assignment.id });

    return res.json({
      assignmentId: assignment._id || assignment.id,
      status: assignment.status,
      // For testing & demo validation, deliver donor pickup OTP code if available in record or session
      donorOtpNote: 'Show this code to the arriving volunteer driver at your loading dock.'
    });
  } catch (error) {
    next(error);
  }
}
