import { Router } from 'express';
import { createTicketType, getTicketTypes, createOrder, getMyTickets } from '../controllers/ticketController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

// Ticket Types
router.get('/types/:eventId', getTicketTypes);
router.post('/types/:eventId', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), createTicketType);

// Orders & Tickets
router.get('/my-tickets', authMiddleware, getMyTickets);
router.post('/order', authMiddleware, createOrder);

export default router;
