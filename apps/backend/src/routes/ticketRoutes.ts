import { Router } from 'express';
import { createTicketType, getTicketTypes, registerForEvent, verifyPayment, getUserRegistrations } from '../controllers/ticketController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Ticket Types
router.get('/types/:eventId', getTicketTypes);
router.post('/types/:eventId', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), createTicketType);

// Registrations & Payments
router.get('/my-registrations', authMiddleware, getUserRegistrations);
router.post('/register', authMiddleware, registerForEvent);
router.post('/registrations/:id/verify-payment', authMiddleware, verifyPayment);

export default router;
