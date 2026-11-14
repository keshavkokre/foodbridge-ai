import { repo } from '../storage/repository.js';
import { getStorageMode } from '../storage/dbAdapter.js';

export async function getImpactSummary(req, res, next) {
  try {
    const isDemo = req.query.demo === 'true' || process.env.IS_DEMO_INSTANCE === 'true' || true;

    // Retrieve verified handovers
    const allHandovers = await repo.handovers.find({});
    const verifiedHandovers = allHandovers.filter(h => h.donorConfirmedAt && h.ngoConfirmedAt);

    const totalVerifiedRescues = verifiedHandovers.length;
    const totalServingsRedistributed = verifiedHandovers.reduce(
      (sum, h) => sum + (Number(h.receivedServings) || 0),
      0
    );

    // UNEP / FAO Environmental Models
    const estimatedWastePreventedKg = Math.round(totalServingsRedistributed * 0.42 * 10) / 10;
    const estimatedCo2eAvoidedKg = Math.round(estimatedWastePreventedKg * 2.5 * 10) / 10;
    const estimatedWaterSavedLiters = Math.round(estimatedWastePreventedKg * 350);

    const totalDonors = await repo.users.count({ role: 'donor' });
    const totalNgos = await repo.users.count({ role: 'ngo' });
    const totalVolunteers = await repo.users.count({ role: 'volunteer' });

    // Active pipeline metrics
    const allDonations = await repo.donations.find({});
    const pendingDonations = allDonations.filter(d => ['SUBMITTED', 'ALLOCATING', 'PARTIALLY_ALLOCATED'].includes(d.status)).length;
    const allAllocations = await repo.allocations.find({});
    const activeAllocations = allAllocations.filter(a => a.status === 'PROPOSED').length;
    const acceptedAllocations = allAllocations.filter(a => a.status === 'ACCEPTED').length;
    const allocationSuccessRate = allAllocations.length > 0
      ? Math.round((acceptedAllocations / allAllocations.length) * 100)
      : 100;

    const storageInfo = getStorageMode();

    return res.json({
      metrics: {
        totalVerifiedRescues,
        totalServingsRedistributed,
        estimatedWastePreventedKg,
        estimatedCo2eAvoidedKg,
        estimatedWaterSavedLiters,
        pendingDonations,
        activeAllocations,
        allocationSuccessRate,
        activeDonorsCount: totalDonors,
        activeNgosCount: totalNgos,
        activeVolunteersCount: totalVolunteers
      },
      storage: storageInfo,
      audit: {
        isDemoEnvironment: isDemo,
        verifiedHandoverSource: 'Digital dual-OTP verified chain of custody',
        environmentalModelingReferences: [
          'UNEP Food Waste Index Baseline (0.42 kg per standard meal)',
          'FAO Food Wastage Footprint: Impacts on Natural Resources (2.5 kg CO2e / kg waste)',
          'Water Footprint Network agricultural baseline (350 L / kg composite food)'
        ],
        disclaimer: 'Environmental metrics are modeled approximations based on FAO benchmarks. Serving counts reflect 100% verified digital handovers.'
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getRecentRescues(req, res, next) {
  try {
    const allHandovers = await repo.handovers.find({});
    const verified = allHandovers
      .filter(h => h.donorConfirmedAt && h.ngoConfirmedAt)
      .sort((a, b) => new Date(b.ngoConfirmedAt) - new Date(a.ngoConfirmedAt))
      .slice(0, 10);

    const recent = [];
    for (const h of verified) {
      const assignment = await repo.assignments.findById(h.assignmentId);
      const donation = assignment ? await repo.donations.findById(assignment.donationId) : null;
      const ngo = assignment ? await repo.users.findById(assignment.ngoId) : null;

      recent.push({
        id: h._id || h.id,
        completedAt: h.ngoConfirmedAt,
        servings: h.receivedServings || 50,
        category: donation?.category || 'cooked_meals',
        title: donation?.title || 'Surplus Food Rescue',
        donorCity: donation?.pickupAddress?.city || 'Bangalore',
        recipientName: ngo?.fullName || 'Community Shelter',
        isDemo: h.isDemo ?? true
      });
    }

    return res.json(recent);
  } catch (error) {
    next(error);
  }
}
