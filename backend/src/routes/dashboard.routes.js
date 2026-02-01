import express from 'express';
import { getDashboard, getChartData } from '../controllers/dashboard.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/', getDashboard);
router.get('/charts', getChartData);

export default router;
