import { Router } from 'express';
import { adminAuthRoutes } from './adminAuthRoutes';
import { adminUserRoutes } from './adminUserRoutes';
import { adminReviewRoutes } from './adminReviewRoutes';
import { adminContactRoutes } from './adminContactRoutes';
import { adminAdvertRoutes } from './adminAdvertRoutes';
import { adminVoucherRoutes } from './adminVoucherRoutes';
import { adminNewsRoutes } from './adminNewsRoutes';
import { adminReportRoutes } from './adminReportRoutes';
import { requireAuth, requireRoles } from '../../middlewares/auth';

const router = Router();

/**
 * ============================================================================
 * ADMIN SIDE ROUTER AGGREGATOR
 * Base URL: /api/v1/admin
 * ============================================================================
 */

// Admin Authentication (Sign-in with email & password, MFA OTP, Profile)
router.use('/auth', adminAuthRoutes);

// Admin User Management (Free Plan registered members CRUD & status)
router.use('/users', adminUserRoutes);

// Admin Reviews Management (Community reviews moderation, notes, status)
router.use('/reviews', adminReviewRoutes);

// Admin Reports & Moderation (Unified Review, News, and Advert reports)
router.use('/reports', adminReportRoutes);
router.use('/moderation', adminReportRoutes);

// Admin Contact Us & Inquiries Management
router.use('/contact', adminContactRoutes);
router.use('/enquiries', adminContactRoutes);

// Admin Advert Management (Campaigns, moderation, reviews, status)
router.use('/adverts', adminAdvertRoutes);

// Admin Voucher Management (Vouchers list, filters, groups, creation, notices)
router.use('/vouchers', adminVoucherRoutes);

// Admin News Management (Articles CRUD, scheduling, publishing)
router.use('/news', adminNewsRoutes);

import { getAdminDashboardMetrics } from '../../controllers/admin/adminDashboardController';

// Admin Dashboard & dynamic live metrics
router.get('/dashboard', getAdminDashboardMetrics);

export const adminRoutes = router;
export {
  adminAuthRoutes,
  adminUserRoutes,
  adminReviewRoutes,
  adminReportRoutes,
  adminContactRoutes,
  adminAdvertRoutes,
  adminVoucherRoutes,
  adminNewsRoutes,
};

