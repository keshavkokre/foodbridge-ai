import express from 'express';
import { z } from 'zod';
import {
  createDonation,
  extractDetailsFromText,
  getDonations,
  getDonationById
} from '../controllers/donationController.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { ROLES, FOOD_CATEGORIES, STORAGE_CONDITIONS } from '../config/constants.js';

const router = express.Router();

const createDonationSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  category: z.enum(Object.values(FOOD_CATEGORIES)),
  totalServings: z.number().min(1, 'Total servings must be at least 1'),
  preparationTime: z.string().or(z.date()),
  safeUseDeadline: z.string().or(z.date()),
  storageCondition: z.enum(Object.values(STORAGE_CONDITIONS)),
  items: z.array(z.object({
    name: z.string(),
    quantity: z.number(),
    unit: z.string().optional()
  })).optional(),
  allergenAlerts: z.array(z.string()).optional(),
  packagingDescription: z.string().optional(),
  pickupAddress: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z.array(z.number()).length(2)
    }).optional()
  }).optional(),
  isDemo: z.boolean().optional()
});

router.post(
  '/',
  authGuard,
  roleGuard([ROLES.DONOR, ROLES.ADMIN]),
  validateRequest(createDonationSchema),
  createDonation
);

router.post('/ai-extract', authGuard, extractDetailsFromText);
router.get('/', authGuard, getDonations);
router.get('/:id', authGuard, getDonationById);

export default router;

