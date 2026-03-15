import { Router } from 'express';
import { checkInUser } from '../controllers/checkinController';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), checkInUser);

export default router;
