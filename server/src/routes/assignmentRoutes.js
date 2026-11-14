import express from 'express';
import {
  getAvailableAssignments,
  getMyActiveAssignment,
  claimAssignment,
  updateAssignmentMilestone,
  verifyDonorPickup,
  verifyNgoDelivery
} from '../controllers/assignmentController.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.get('/available', authGuard, roleGuard([ROLES.VOLUNTEER, ROLES.ADMIN]), getAvailableAssignments);
router.get('/active', authGuard, roleGuard([ROLES.VOLUNTEER, ROLES.ADMIN]), getMyActiveAssignment);
router.post('/:id/claim', authGuard, roleGuard([ROLES.VOLUNTEER, ROLES.ADMIN]), claimAssignment);
router.patch('/:id/milestone', authGuard, roleGuard([ROLES.VOLUNTEER, ROLES.ADMIN]), updateAssignmentMilestone);
router.post('/verify-pickup', authGuard, roleGuard([ROLES.VOLUNTEER, ROLES.ADMIN]), verifyDonorPickup);
router.post('/verify-delivery', authGuard, roleGuard([ROLES.VOLUNTEER, ROLES.ADMIN]), verifyNgoDelivery);

export default router;
