import express from 'express';
import { getImpactSummary, getRecentRescues } from '../controllers/impactController.js';

const router = express.Router();

router.get('/summary', getImpactSummary);
router.get('/recent', getRecentRescues);

export default router;

