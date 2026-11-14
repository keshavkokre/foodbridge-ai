import { Allocation } from '../models/Allocation.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { ALLOCATION_STATUS, DONATION_STATUS } from '../config/constants.js';

/**
 * Idempotent Application-Level Expiration & Reallocation Scanner.
 * 
 * Replaces MongoDB TTL document deletion with an auditable state-preserving workflow:
 * 1. Identifies allocations with status 'PROPOSED' where responseDeadline has elapsed.
 * 2. Idempotently updates status to 'EXPIRED' with audit timestamps.
 * 3. Restores reserved servings back to the parent donation.
 * 4. Re-triggers matching engine if reallocation handler is provided.
 */
export async function scanAndReallocateExpiredAllocations(reallocationHandler = null) {
  const now = new Date();

  // Find proposed allocations where the deadline has elapsed
  const expiredCandidates = await Allocation.find({
    status: ALLOCATION_STATUS.PROPOSED,
    responseDeadline: { $lte: now }
  });

  const processed = [];

  for (const alloc of expiredCandidates) {
    // Atomic state update ensures idempotency (only transitions if still 'PROPOSED')
    const transitioned = await Allocation.findOneAndUpdate(
      {
        _id: alloc._id,
        status: ALLOCATION_STATUS.PROPOSED
      },
      {
        $set: {
          status: ALLOCATION_STATUS.EXPIRED,
          declinedReason: 'Response deadline expired (TTL auto-reclaim)'
        }
      },
      { new: true }
    );

    if (transitioned) {
      // Safely restore unallocated servings to parent donation
      const updatedDonation = await FoodDonation.findOneAndUpdate(
        { _id: alloc.donationId },
        {
          $inc: { remainingServings: alloc.allocatedServings },
          $set: { status: DONATION_STATUS.PARTIALLY_ALLOCATED }
        },
        { new: true }
      );

      processed.push({
        allocationId: alloc._id,
        donationId: alloc.donationId,
        reclaimedServings: alloc.allocatedServings,
        newRemainingServings: updatedDonation?.remainingServings
      });

      // Optionally invoke reallocation handler if passed
      if (typeof reallocationHandler === 'function') {
        try {
          await reallocationHandler(alloc.donationId);
        } catch (err) {
          console.warn(`[REALLOCATION WARNING] Failed re-dispatch for donation ${alloc.donationId}:`, err.message);
        }
      }
    }
  }

  return {
    scannedCount: expiredCandidates.length,
    reclaimedCount: processed.length,
    processed
  };
}

/**
 * Starts in-memory periodic scanner interval.
 */
export function startExpirationScannerInterval(intervalMs = 120000, reallocationHandler = null) {
  console.log(`[EXPIRATION SCANNER] Initialized with interval of ${intervalMs / 1000}s`);
  const timer = setInterval(() => {
    scanAndReallocateExpiredAllocations(reallocationHandler).catch(err => {
      console.warn('[EXPIRATION SCANNER ERROR]', err.message);
    });
  }, intervalMs);

  return timer;
}

