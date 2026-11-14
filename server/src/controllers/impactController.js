import { HandoverVerification } from '../models/HandoverVerification.js';
import { FoodDonation } from '../models/FoodDonation.js';
import { NGOFoodDemand } from '../models/NGOFoodDemand.js';
import { User } from '../models/User.js';

export async function getImpactSummary(req, res, next) {
  try {
    const isDemo = req.query.demo === 'true' || process.env.IS_DEMO_INSTANCE === 'true';

    // Query completed handovers
    const query = {
      donorConfirmedAt: { $ne: null },
      ngoConfirmedAt: { $ne: null }
    };
    if (req.query.demo !== undefined) {
      query.isDemo = isDemo;
    }

    const verifiedHandovers = await HandoverVerification.find(query);

    const totalVerifiedRescues = verifiedHandovers.length;
    const totalServingsRedistributed = verifiedHandovers.reduce(
      (sum, h) => sum + (h.receivedServings || 0),
      0
    );

    // Environmental Estimates (FAO / UNEP Food Waste Benchmarks)
    // 1 serving approx 0.42 kg edible food weight
    const estimatedWastePreventedKg = Math.round(totalServingsRedistributed * 0.42 * 10) / 10;
    // 1 kg food waste avoided prevents ~2.5 kg CO2e greenhouse gas emissions
    const estimatedCo2eAvoidedKg = Math.round(estimatedWastePreventedKg * 2.5 * 10) / 10;
    // 1 kg food represents ~350 liters of embodied agricultural water footprint
    const estimatedWaterSavedLiters = Math.round(estimatedWastePreventedKg * 350);

    // Participating organizations count
    const totalDonors = await User.countDocuments({ role: 'donor' });
    const totalNgos = await User.countDocuments({ role: 'ngo' });
    const totalVolunteers = await User.countDocuments({ role: 'volunteer' });

    return res.json({
      metrics: {
        totalVerifiedRescues,
        totalServingsRedistributed,
        estimatedWastePreventedKg,
        estimatedCo2eAvoidedKg,
        estimatedWaterSavedLiters,
        activeDonorsCount: totalDonors,
        activeNgosCount: totalNgos,
        activeVolunteersCount: totalVolunteers
      },
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
    const handovers = await HandoverVerification.find({
      donorConfirmedAt: { $ne: null },
      ngoConfirmedAt: { $ne: null }
    })
      .sort({ ngoConfirmedAt: -1 })
      .limit(10)
      .populate({
        path: 'assignmentId',
        populate: [
          { path: 'donationId', select: 'title category pickupAddress' },
          { path: 'ngoId', select: 'fullName address' }
        ]
      });

    const recent = handovers.map(h => {
      const assignment = h.assignmentId;
      return {
        id: h._id,
        completedAt: h.ngoConfirmedAt,
        servings: h.receivedServings,
        category: assignment?.donationId?.category || 'cooked_meals',
        title: assignment?.donationId?.title || 'Surplus Food Rescue',
        donorCity: assignment?.donationId?.pickupAddress?.city || 'Bangalore',
        recipientName: assignment?.ngoId?.fullName || 'Community Shelter',
        isDemo: h.isDemo
      };
    });

    return res.json(recent);
  } catch (error) {
    next(error);
  }
}
