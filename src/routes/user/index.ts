import { Router } from 'express';
import { userAuthRoutes } from './userAuthRoutes';
import { userReviewRoutes } from './userReviewRoutes';
import { userContactRoutes } from './userContactRoutes';
import { userAdvertRoutes } from './userAdvertRoutes';
import { userVoucherRoutes } from './userVoucherRoutes';

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

export const userRoutes = router;
export { userAuthRoutes, userReviewRoutes, userContactRoutes, userAdvertRoutes, userVoucherRoutes };
