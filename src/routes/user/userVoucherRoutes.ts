import { Router } from 'express';
import {
  purchaseVouchers,
  getMyVouchers,
  redeemVoucher,
} from '../../controllers/user/userVoucherController';

const router = Router();

/**
 * ============================================================================
 * USER VOUCHER ROUTES
 * Base URL: /api/v1/vouchers OR /api/v1/user/vouchers
 * ============================================================================
 */

// Purchase & generate vouchers upon simulated checkout
router.post('/purchase', purchaseVouchers);

// Get user's purchased & redeemed vouchers
router.get('/my-vouchers', getMyVouchers);

// Redeem a voucher
router.post('/redeem', redeemVoucher);

export const userVoucherRoutes = router;
