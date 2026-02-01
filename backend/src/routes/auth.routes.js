import express from 'express';
import {
  register,
  login,
  logout,
  getMe,
  updateMe,
  updatePassword,
  forgotPassword,
  resetPassword,
  refreshToken
} from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

router.get('/me', protect, getMe);
router.put('/me', protect, updateMe);
router.put('/password', protect, updatePassword);

export default router;
