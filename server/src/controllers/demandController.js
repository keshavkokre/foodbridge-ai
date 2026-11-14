import { repo } from '../storage/repository.js';
import { DEMAND_STATUS } from '../config/constants.js';

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

    const ngoId = req.user._id || req.user.id;

    const demand = await repo.demands.create({
      ngoId,
      requestedCategories,
      requestedServings: Number(requestedServings),
      fulfilledServings: 0,
      remainingServings: Number(requestedServings),
      urgencyLevel: urgencyLevel || 'STANDARD',
      requiredBefore: new Date(requiredBefore),
      notes: notes || '',
      status: DEMAND_STATUS.ACTIVE,
      isDemo: Boolean(isDemo || req.user.isDemo)
    });

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
    const ngoId = req.user._id || req.user.id;
    const demands = await repo.demands.find({ ngoId });
    return res.json(demands);
  } catch (error) {
    next(error);
  }
}

export async function getAllActiveDemands(req, res, next) {
  try {
    const demands = await repo.demands.find({
      status: { $in: [DEMAND_STATUS.ACTIVE, DEMAND_STATUS.PARTIALLY_FULFILLED] }
    });
    return res.json(demands);
  } catch (error) {
    next(error);
  }
}
