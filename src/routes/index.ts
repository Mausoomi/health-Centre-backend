import { Router } from 'express';
import { adminRoutes } from './admin';
import {
  userRoutes,
  userAuthRoutes,
  userReviewRoutes,
  userContactRoutes,
  userAdvertRoutes,
  userVoucherRoutes,
  userPaymentRoutes,
  userNewsRoutes,
} from './user';
import { requireAuth } from '../middlewares/auth';

const router = Router();

/**
 * ============================================================================
 *                         HEALTH CENTRE API ROUTER
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/*                        1. HEALTH & DIAGNOSTICS                             */
/* -------------------------------------------------------------------------- */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

/* -------------------------------------------------------------------------- */
/*                        2. USER SIDE ROUTES                                 */
/* -------------------------------------------------------------------------- */
// Primary User Auth endpoints (/api/v1/auth/*)
router.use('/auth', userAuthRoutes);

// Public & User Reviews endpoints (/api/v1/reviews/*)
router.use('/reviews', userReviewRoutes);

// Public & User Contact Us endpoints (/api/v1/contact/*)
router.use('/contact', userContactRoutes);

// Public & User Adverts endpoints (/api/v1/adverts/*)
router.use('/adverts', userAdvertRoutes);

// Public & User News endpoints (/api/v1/news/*)
router.use('/news', userNewsRoutes);

// User Vouchers endpoints (/api/v1/vouchers/*)
router.use('/vouchers', userVoucherRoutes);

// User Payments & Stripe Checkout endpoints (/api/v1/payments/*)
router.use('/payments', userPaymentRoutes);

// Namespaced User endpoints (/api/v1/user/*)
router.use('/user', userRoutes);

// Authenticated User Profile endpoint (/api/v1/profile)
router.get('/profile', requireAuth, (req: any, res) => {
  res.status(200).json({
    message: 'Profile retrieved successfully',
    user: req.user,
  });
});

/* -------------------------------------------------------------------------- */
/*                        3. ADMIN SIDE ROUTES                                */
/* -------------------------------------------------------------------------- */
// Namespaced Admin endpoints (/api/v1/admin/*) -> includes /admin/users, /admin/reviews, /admin/dashboard
router.use('/admin', adminRoutes);

export const apiRouter = router;
