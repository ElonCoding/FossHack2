"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ticketController_1 = require("../controllers/ticketController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Ticket Types
router.get('/types/:eventId', ticketController_1.getTicketTypes);
router.post('/types/:eventId', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), ticketController_1.createTicketType);
// Registrations & Payments
router.get('/my-registrations', authMiddleware_1.authMiddleware, ticketController_1.getUserRegistrations);
router.post('/register', authMiddleware_1.authMiddleware, ticketController_1.registerForEvent);
router.post('/registrations/:id/verify-payment', authMiddleware_1.authMiddleware, ticketController_1.verifyPayment);
exports.default = router;
//# sourceMappingURL=ticketRoutes.js.map