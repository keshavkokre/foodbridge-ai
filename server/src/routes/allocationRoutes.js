import express from 'express';
import { getIncomingAllocations, acceptAllocation, declineAllocation } from '../controllers/allocationController.js';
import { authGuard } from '../middleware/authGuard.js';
import { roleGuard } from '../middleware/roleGuard.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.get('/incoming', authGuard, roleGuard([ROLES.NGO, ROLES.ADMIN]), getIncomingAllocations);
router.post('/:id/accept', authGuard, roleGuard([ROLES.NGO, ROLES.ADMIN]), acceptAllocation);
router.post('/:id/decline', authGuard, roleGuard([ROLES.NGO, ROLES.ADMIN]), declineAllocation);

export default router;

