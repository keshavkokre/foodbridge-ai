import express from 'express';
import { z } from 'zod';
import { register, login, getMe } from '../controllers/authController.js';
import { authGuard } from '../middleware/authGuard.js';
import { validateRequest } from '../middleware/validateRequest.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

const registerSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum([ROLES.DONOR, ROLES.NGO, ROLES.VOLUNTEER, ROLES.ADMIN]),
  fullName: z.string().min(2, 'Full name is required'),
  phone: z.string().min(7, 'Valid contact phone number is required'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    location: z.object({
      type: z.literal('Point').default('Point'),
      coordinates: z.array(z.number()).length(2) // [lng, lat]
    }).optional()
  }).optional(),
  profileData: z.record(z.any()).optional(),
  isDemo: z.boolean().optional()
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required')
});

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.get('/me', authGuard, getMe);

export default router;

