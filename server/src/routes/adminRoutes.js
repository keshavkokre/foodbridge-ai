import express from 'express';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { ROLES } from '../config/constants.js';
import {
  getOverview,
  getVerificationQueue,
  approveNgo,
  rejectNgo,
  bootstrapAdmin
} from '../controllers/adminController.js';

const router = express.Router();

// Public bootstrap endpoint (requires secret key in body)
router.post('/bootstrap', bootstrapAdmin);

// Protected Admin Routes
router.use(authGuard);
router.use(roleGuard([ROLES.ADMIN]));

router.get('/overview', getOverview);
router.get('/verification-queue', getVerificationQueue);
router.post('/ngos/:id/approve', approveNgo);
router.post('/ngos/:id/reject', rejectNgo);

export default router;
