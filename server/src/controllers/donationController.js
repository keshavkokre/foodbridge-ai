import { repo } from '../storage/repository.js';
import { parseUnstructuredDonation, generateAllocationRationale } from '../engine/geminiExplainer.js';
import { computeMultiNgoAllocations } from '../engine/multiAllocator.js';
import { DONATION_STATUS, ALLOCATION_STATUS, DEMAND_STATUS, ROLES } from '../config/constants.js';

export async function createDonation(req, res, next) {
  try {
    const {
      title,
      category,
      items,
      totalServings,
      preparationTime,
      safeUseDeadline,
      storageCondition,
      allergenAlerts,
      packagingDescription,
      pickupAddress,
      isDemo
    } = req.body;

    const donorId = req.user._id || req.user.id;

    const coords = pickupAddress?.location?.coordinates ||
      pickupAddress?.coordinates ||
      req.user.address?.location?.coordinates ||
      [77.5946, 12.9716];

    const donation = await repo.donations.create({
      donorId,
      title,
      category,
      items: items && items.length > 0 ? items : [{ name: title, quantity: totalServings, unit: 'servings' }],
      totalServings: Number(totalServings),
      remainingServings: Number(totalServings),
      preparationTime: new Date(preparationTime),
      safeUseDeadline: new Date(safeUseDeadline),
      storageCondition,
      allergenAlerts: allergenAlerts || [],
      packagingDescription: packagingDescription || 'Food-grade sealed containers',
      pickupAddress: {
        street: pickupAddress?.street || req.user.address?.street || 'Central Donor Bay',
        city: pickupAddress?.city || req.user.address?.city || 'Bangalore',
        location: {
          type: 'Point',
          coordinates: coords
        }
      },
      status: DONATION_STATUS.ALLOCATING,
      donorCertifiedSafe: true,
      isDemo: Boolean(isDemo || req.user.isDemo)
    });

    // Run Intelligent Allocation Engine
    const matchingResult = await runAllocationForDonation(donation);

    return res.status(201).json({
      message: 'Donation successfully registered and processed through Intelligent Allocation Engine.',
      donation,
      matchingResult
    });
  } catch (error) {
    next(error);
  }
}

export async function runAllocationForDonation(donation, excludedNgoIds = []) {
  const donationId = donation._id || donation.id;

  // Retrieve active NGO demands
  const allDemands = await repo.demands.find({
    status: { $in: [DEMAND_STATUS.ACTIVE, DEMAND_STATUS.PARTIALLY_FULFILLED] }
  });

  // Filter demands with remaining need and not in excluded list
  const activeDemands = allDemands.filter(d => {
    const ngoIdStr = (d.ngoId?._id || d.ngoId?.id || d.ngoId).toString();
    const hasRemaining = (d.remainingServings || 0) >= 5;
    const notExcluded = !excludedNgoIds.map(x => x.toString()).includes(ngoIdStr);
    return hasRemaining && notExcluded;
  });

  // Load NGO profiles
  const allProfiles = await repo.ngoProfiles.find({});
  const profilesMap = new Map();
  allProfiles.forEach(p => {
    const uId = (p.userId?._id || p.userId?.id || p.userId).toString();
    profilesMap.set(uId, p);
  });

  // Run Bounded Multi-NGO Allocator
  const allocationOutput = computeMultiNgoAllocations(donation, activeDemands, profilesMap);

  const createdAllocations = await Promise.all(
    allocationOutput.allocations.map(async (alloc) => {
      const ngoId = (alloc.ngoId?._id || alloc.ngoId?.id || alloc.ngoId).toString();
      const demandId = (alloc.demandId?._id || alloc.demandId?.id || alloc.demandId).toString();
      const profile = profilesMap.get(ngoId);

      // Explainable rationale
      const rationale = await generateAllocationRationale(alloc, donation, profile || {});

      const newAlloc = await repo.allocations.create({
        donationId,
        ngoId,
        demandId,
        allocatedServings: alloc.allocatedServings,
        matchScore: alloc.matchScore,
        scoreBreakdown: alloc.scoreBreakdown,
        recommendationRationale: rationale,
        responseDeadline: alloc.responseDeadline,
        status: ALLOCATION_STATUS.PROPOSED,
        isDemo: donation.isDemo
      });

      // Update NGO committed capacity
      if (profile) {
        await repo.ngoProfiles.updateOne(
          { userId: profile.userId },
          { $inc: { activeCommittedServings: alloc.allocatedServings } }
        );
      }

      return newAlloc;
    })
  );

  // Update donation remaining servings and status
  const finalStatus = allocationOutput.isFullyAllocated
    ? DONATION_STATUS.ALLOCATED
    : (allocationOutput.totalAllocated > 0 ? DONATION_STATUS.PARTIALLY_ALLOCATED : DONATION_STATUS.SUBMITTED);

  await repo.donations.updateOne(
    { _id: donationId },
    {
      $set: {
        remainingServings: allocationOutput.unallocatedServings,
        status: finalStatus
      }
    }
  );

  return {
    allocatedCount: createdAllocations.length,
    totalAllocatedServings: allocationOutput.totalAllocated,
    unallocatedServings: allocationOutput.unallocatedServings,
    allocations: createdAllocations
  };
}

export async function extractDetailsFromText(req, res, next) {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Description text is required for AI extraction.' });
    }

    const structured = await parseUnstructuredDonation(text);
    return res.json(structured);
  } catch (error) {
    next(error);
  }
}

export async function getDonations(req, res, next) {
  try {
    const filter = {};
    if (req.user.role === ROLES.DONOR) {
      filter.donorId = req.user._id || req.user.id;
    }

    const donations = await repo.donations.find(filter);
    return res.json(donations);
  } catch (error) {
    next(error);
  }
}

export async function getDonationById(req, res, next) {
  try {
    const { id } = req.params;
    const donation = await repo.donations.findById(id);
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    const allocations = await repo.allocations.find({ donationId: id });

    return res.json({
      donation,
      allocations
    });
  } catch (error) {
    next(error);
  }
}
