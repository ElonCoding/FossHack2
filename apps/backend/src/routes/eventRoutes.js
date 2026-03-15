"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const eventController_1 = require("../controllers/eventController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/', eventController_1.getEvents);
router.get('/:id', eventController_1.getEventById);
// Protected routes (Organizer & Admin only)
router.post('/', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), eventController_1.createEvent);
router.put('/:id', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), eventController_1.updateEvent);
router.patch('/:id/status', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), eventController_1.updateEventStatus);
exports.default = router;
//# sourceMappingURL=eventRoutes.js.map