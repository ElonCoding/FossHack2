"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboardController_1 = require("../controllers/dashboardController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.get('/stats', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), dashboardController_1.getDashboardStats);
router.get('/events/:eventId/registrations', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), dashboardController_1.getEventRegistrations);
exports.default = router;
//# sourceMappingURL=dashboardRoutes.js.map