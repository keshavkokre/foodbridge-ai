import { NGOFoodDemand } from '../models/NGOFoodDemand.js';
import { DEMAND_STATUS, ROLES } from '../config/constants.js';

export async function createDemand(req, res, next) {
  try {
    const {
      requestedCategories,
      requestedServings,
      urgencyLevel,
      requiredBefore,
      notes,
      isDemo
    } = req.body;

    const ngoId = req.user._id;

    const demand = new NGOFoodDemand({
      ngoId,
      requestedCategories,
      requestedServings,
      remainingServings: requestedServings,
      urgencyLevel: urgencyLevel || 'STANDARD',
      requiredBefore: new Date(requiredBefore),
      notes: notes || '',
      status: DEMAND_STATUS.ACTIVE,
      isDemo: Boolean(isDemo || req.user.isDemo)
    });

    await demand.save();

    return res.status(201).json({
      message: 'Nutritional food demand registered successfully in Demand-First pool.',
      demand
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyDemands(req, res, next) {
  try {
    const demands = await NGOFoodDemand.find({ ngoId: req.user._id })
      .sort({ createdAt: -1 });

    return res.json(demands);
  } catch (error) {
    next(error);
  }
}

export async function getAllActiveDemands(req, res, next) {
  try {
    const demands = await NGOFoodDemand.find({
      status: { $in: [DEMAND_STATUS.ACTIVE, DEMAND_STATUS.PARTIALLY_FULFILLED] }
    })
      .sort({ createdAt: -1 })
      .populate('ngoId', 'fullName address phone');

    return res.json(demands);
  } catch (error) {
    next(error);
  }
}
