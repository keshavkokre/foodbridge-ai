import express from 'express';
import { z } from 'zod';
import { createDemand, getMyDemands, getAllActiveDemands } from '../controllers/demandController.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { ROLES, FOOD_CATEGORIES, URGENCY_LEVELS } from '../config/constants.js';

const router = express.Router();

const createDemandSchema = z.object({
  requestedCategories: z.array(z.enum(Object.values(FOOD_CATEGORIES))).min(1, 'At least one food category is required'),
  requestedServings: z.number().min(1, 'Requested servings must be at least 1'),
  urgencyLevel: z.enum(Object.values(URGENCY_LEVELS)).optional(),
  requiredBefore: z.string().or(z.date()),
  notes: z.string().optional(),
  isDemo: z.boolean().optional()
});

router.post(
  '/',
  authGuard,
  roleGuard([ROLES.NGO, ROLES.ADMIN]),
  validateRequest(createDemandSchema),
  createDemand
);

router.get('/my-active', authGuard, roleGuard([ROLES.NGO, ROLES.ADMIN]), getMyDemands);
router.get('/', authGuard, getAllActiveDemands);

export default router;

