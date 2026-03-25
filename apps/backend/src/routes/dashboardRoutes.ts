import { Router } from 'express';
import { getDashboardStats, getEventRegistrations } from '../controllers/dashboardController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/stats', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), getDashboardStats);
router.get('/events/:eventId/registrations', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), getEventRegistrations);

export default router;
