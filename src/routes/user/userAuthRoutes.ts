import { Router } from 'express';
import {
  register,
  login,
  sendOTP,
  verifyOTP,
  refreshToken,
  getMe,
  updateProfile,
} from '../../controllers/authController';
import { authLimiter } from '../../middlewares/rateLimiter';
import { requireAuth } from '../../middlewares/auth';

const router = Router();

/**
 * ============================================================================
 * USER SIDE - AUTHENTICATION & PROFILE ROUTES
 * Base URL: /api/v1/auth (and /api/v1/user/auth)
 * ============================================================================
 */

// User registration & password login (Restricted strictly to EndUsers)
router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

// Passwordless OTP send & verify
router.post('/otp/send', authLimiter, sendOTP);
router.post('/otp/verify', authLimiter, verifyOTP);

// JWT token refresh
router.post('/refresh-token', refreshToken);

// Authenticated user profile retrieval & update
router.get('/me', requireAuth, getMe);
router.put('/profile', requireAuth, updateProfile);

export const userAuthRoutes = router;
