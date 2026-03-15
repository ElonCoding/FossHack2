"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const checkinController_1 = require("../controllers/checkinController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
router.post('/', authMiddleware_1.authMiddleware, (0, authMiddleware_1.requireRole)(['ORGANIZER', 'ADMIN']), checkinController_1.checkInUser);
exports.default = router;
//# sourceMappingURL=checkinRoutes.js.map