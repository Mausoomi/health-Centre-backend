import { Router } from 'express';
import { adminUserRoutes } from './adminUserRoutes';
import { adminReviewRoutes } from './adminReviewRoutes';
import { adminContactRoutes } from './adminContactRoutes';
import { adminAdvertRoutes } from './adminAdvertRoutes';
import { adminVoucherRoutes } from './adminVoucherRoutes';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

/**
 * ============================================================================
 * ADMIN SIDE ROUTER AGGREGATOR
 * Base URL: /api/v1/admin
 * ============================================================================
 */

// Admin User Management (Free Plan registered members CRUD & status)
router.use('/users', adminUserRoutes);

// Admin Reviews Management (Community reviews moderation, notes, status)
router.use('/reviews', adminReviewRoutes);

// Admin Contact Us & Inquiries Management
router.use('/contact', adminContactRoutes);
router.use('/enquiries', adminContactRoutes);

// Admin Advert Management (Campaigns, moderation, reviews, status)
router.use('/adverts', adminAdvertRoutes);

// Admin Voucher Management (Vouchers list, filters, groups, creation, notices)
router.use('/vouchers', adminVoucherRoutes);

// Admin Dashboard & metrics
router.get('/dashboard', requireAuth, requireRoles(['Admin', 'SuperAdmin', 'Global Admin', 'Operations Admin']), (req, res) => {
  res.status(200).json({
    message: 'Welcome Admin! This is the live admin dashboard metrics.',
  });
});

export const adminRoutes = router;
export { adminUserRoutes, adminReviewRoutes, adminContactRoutes, adminAdvertRoutes, adminVoucherRoutes };
