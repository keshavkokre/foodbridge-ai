import { FoodDonation } from '../models/FoodDonation.js';
import { NGOFoodDemand } from '../models/NGOFoodDemand.js';
import { NGOProfile } from '../models/NGOProfile.js';
import { Allocation } from '../models/Allocation.js';
import { User } from '../models/User.js';
import { parseUnstructuredDonation, generateAllocationRationale } from '../engine/geminiExplainer.js';
import { computeMultiNgoAllocations } from '../engine/multiAllocator.js';
import { DONATION_STATUS, ALLOCATION_STATUS, DEMAND_STATUS, ROLES } from '../config/constants.js';

/**
 * Handles creation of a food donation, runs allocation engine, and creates allocation proposals.
 */
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

    const donorId = req.user._id;

    // Build pickup coordinates from address or user profile
    const coords = pickupAddress?.location?.coordinates ||
      req.user.address?.location?.coordinates ||
      [77.5946, 12.9716];

    const donation = new FoodDonation({
      donorId,
      title,
      category,
      items: items && items.length > 0 ? items : [{ name: title, quantity: totalServings, unit: 'servings' }],
      totalServings,
      remainingServings: totalServings,
      preparationTime: new Date(preparationTime),
      safeUseDeadline: new Date(safeUseDeadline),
      storageCondition,
      allergenAlerts: allergenAlerts || [],
      packagingDescription: packagingDescription || 'Food-grade sealed containers',
      pickupAddress: {
        street: pickupAddress?.street || req.user.address?.street || '',
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

    await donation.save();

    // Trigger allocation matching against active NGO demands
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

/**
 * Runs matching engine for a donation batch and persists proposed allocations.
 */
export async function runAllocationForDonation(donation) {
  // Query active demands that match criteria
  const activeDemands = await NGOFoodDemand.find({
    status: { $in: [DEMAND_STATUS.ACTIVE, DEMAND_STATUS.PARTIALLY_FULFILLED] },
    remainingServings: { $gte: 5 }
  }).populate('ngoId', 'fullName email address');

  // Load NGO profiles
  const ngoIds = activeDemands.map(d => d.ngoId?._id || d.ngoId);
  const profiles = await NGOProfile.find({ userId: { $in: ngoIds } });
  const profilesMap = new Map();
  profiles.forEach(p => {
    profilesMap.set(p.userId.toString(), p);
  });

  // Execute Bounded Multi-NGO Allocator
  const allocationOutput = computeMultiNgoAllocations(donation, activeDemands, profilesMap);

  const createdAllocations = [];

  for (const alloc of allocationOutput.allocations) {
    const profile = profilesMap.get(alloc.ngoId.toString());

    // Generate explainable rationale (Gemini or deterministic template)
    const rationale = await generateAllocationRationale(alloc, donation, profile || {});

    const newAlloc = new Allocation({
      donationId: donation._id,
      ngoId: alloc.ngoId,
      demandId: alloc.demandId,
      allocatedServings: alloc.allocatedServings,
      matchScore: alloc.matchScore,
      scoreBreakdown: alloc.scoreBreakdown,
      recommendationRationale: rationale,
      responseDeadline: alloc.responseDeadline,
      status: ALLOCATION_STATUS.PROPOSED,
      isDemo: donation.isDemo
    });

    await newAlloc.save();
    createdAllocations.push(newAlloc);

    // Update NGO profile committed load to prevent over-allocation during acceptance window
    if (profile) {
      await NGOProfile.updateOne(
        { _id: profile._id },
        { $inc: { activeCommittedServings: alloc.allocatedServings } }
      );
    }
  }

  // Update donation remainingServings and status
  const finalStatus = allocationOutput.isFullyAllocated
    ? DONATION_STATUS.ALLOCATED
    : (allocationOutput.totalAllocated > 0 ? DONATION_STATUS.PARTIALLY_ALLOCATED : DONATION_STATUS.SUBMITTED);

  await FoodDonation.updateOne(
    { _id: donation._id },
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

/**
 * Parses raw text input using Gemini or deterministic fallback parser.
 */
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

/**
 * Lists donations for the authenticated user or all donations for admin.
 */
export async function getDonations(req, res, next) {
  try {
    const filter = {};
    if (req.user.role === ROLES.DONOR) {
      filter.donorId = req.user._id;
    }

    const donations = await FoodDonation.find(filter)
      .sort({ createdAt: -1 })
      .populate('donorId', 'fullName email address');

    return res.json(donations);
  } catch (error) {
    next(error);
  }
}

/**
 * Gets detailed record of a single donation including its allocations.
 */
export async function getDonationById(req, res, next) {
  try {
    const { id } = req.params;
    const donation = await FoodDonation.findById(id).populate('donorId', 'fullName phone email address');
    if (!donation) {
      return res.status(404).json({ error: 'Donation not found.' });
    }

    const allocations = await Allocation.find({ donationId: id })
      .populate('ngoId', 'fullName address phone')
      .populate('demandId');

    return res.json({
      donation,
      allocations
    });
  } catch (error) {
    next(error);
  }
}
