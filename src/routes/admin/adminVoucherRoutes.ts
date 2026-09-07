import { Router } from 'express';
import {
  getAllVouchers,
  createAdminVoucher,
  getVoucherById,
  updateVoucherStatus,
  sendVoucherNotice,
  deleteVoucher,
  bulkDeleteVouchers,
} from '../../controllers/admin/adminVoucherController';

const router = Router();

/**
 * ============================================================================
 * ADMIN VOUCHER ROUTES
 * Base URL: /api/v1/admin/vouchers
 * ============================================================================
 */

// List vouchers with search, group filter, and target expiration filter
router.get('/', getAllVouchers);

// Create single or bulk vouchers
router.post('/', createAdminVoucher);

// Bulk delete vouchers
router.post('/bulk-delete', bulkDeleteVouchers);

// Send notice to selected vouchers
router.post('/send-notice', sendVoucherNotice);

// Get single voucher detail
router.get('/:id', getVoucherById);

// Update voucher status (e.g. Revoke, Expire)
router.patch('/:id/status', updateVoucherStatus);

// Delete single voucher
router.delete('/:id', deleteVoucher);

export const adminVoucherRoutes = router;
