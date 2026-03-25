import { Router } from 'express';
import { forgotPassword, getMe, login, logout, register, resetPassword } from '../controllers/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', authMiddleware, getMe);

export default router;
