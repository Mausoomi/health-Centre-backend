import { Router } from 'express';
import { userAuthRoutes } from './userAuthRoutes';
import { userReviewRoutes } from './userReviewRoutes';
import { userContactRoutes } from './userContactRoutes';
import { userAdvertRoutes } from './userAdvertRoutes';
import { userVoucherRoutes } from './userVoucherRoutes';
import { userPaymentRoutes } from './userPaymentRoutes';
import { userNewsRoutes } from './userNewsRoutes';
import standardRoutes from './standard';
import premiumRoutes from './premium';
import pdhoRegistrationRoutes from './pdhoRegistrationRoutes';

const router = Router();

/**
 * ============================================================================
 * USER SIDE ROUTER AGGREGATOR
 * Base URL: /api/v1/user
 * ============================================================================
 */

// User authentication & profile
router.use('/auth', userAuthRoutes);

// User reviews (submission, list published, like, report)
router.use('/reviews', userReviewRoutes);

// User contact inquiries
router.use('/contact', userContactRoutes);

// User advert campaigns & tracking
router.use('/adverts', userAdvertRoutes);

// User voucher purchases, dashboard, and redemption
router.use('/vouchers', userVoucherRoutes);

// User payment checkout & verification
router.use('/payments', userPaymentRoutes);

// Public & User news
router.use('/news', userNewsRoutes);

// Standard Digital Health flow routes (/api/v1/user/standard/*)
router.use('/standard', standardRoutes);

// Premium Digital Health flow routes (/api/v1/user/premium/*)
router.use('/premium', premiumRoutes);

// PDHO Organisation Registration & Approval routes (/api/v1/user/pdho/*)
router.use('/pdho', pdhoRegistrationRoutes);

export {
  router as userRoutes,
  userAuthRoutes,
  userReviewRoutes,
  userContactRoutes,
  userAdvertRoutes,
  userVoucherRoutes,
  userPaymentRoutes,
  userNewsRoutes,
  standardRoutes,
  premiumRoutes,
};


