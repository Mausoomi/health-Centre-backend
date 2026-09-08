import { Router } from 'express';
import {
  adminLogin,
  adminVerifyMfa,
  adminResendMfa,
  getAdminMe,
  adminLogout,
} from '../../controllers/admin/adminAuthController';
import { authLimiter } from '../../middlewares/rateLimiter';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

/**
 * ADMIN AUTHENTICATION ROUTES
 * Base URL: /api/v1/admin/auth
 */

// Step 1: Admin sign in with email & password -> triggers MFA email
router.post('/login', authLimiter, adminLogin);

// Step 2: Verify MFA code -> issues JWT token
router.post('/verify-mfa', authLimiter, adminVerifyMfa);

// Resend MFA code to admin email
router.post('/resend-mfa', authLimiter, adminResendMfa);

// Admin Profile
router.get(
  '/me',
  requireAuth,
  requireRoles(['Admin', 'SuperAdmin', 'Global Admin', 'Operations Admin', 'Content Admin', 'Moderation Admin']),
  getAdminMe
);
router.get(
  '/current-admin',
  requireAuth,
  requireRoles(['Admin', 'SuperAdmin', 'Global Admin', 'Operations Admin', 'Content Admin', 'Moderation Admin']),
  getAdminMe
);

// Admin Sign Out
router.post('/logout', adminLogout);

export const adminAuthRoutes = router;
