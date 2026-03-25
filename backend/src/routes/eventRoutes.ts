import { Router } from 'express';
import { createEvent, getEvents, getEventById, updateEvent, updateEventStatus } from '../controllers/eventController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getEvents);
router.get('/:id', getEventById);

// Protected routes (Organizer & Admin only)
router.post('/', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), createEvent);
router.put('/:id', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), updateEvent);
router.patch('/:id/status', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), updateEventStatus);

export default router;
