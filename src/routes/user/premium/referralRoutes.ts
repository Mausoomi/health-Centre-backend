import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getReferralProfile,
  joinReferralProgramme,
  updateBankDetails,
  claimReferral,
} from '../../../controllers/user/premium/referralController';

const router = Router();

// Protect all referral routes with token authentication
router.use(requireAuth);

// GET /api/v1/user/premium/referrals - Get user's referral profile
router.get('/', getReferralProfile as any);

// POST /api/v1/user/premium/referrals/join - Join referral programme
router.post('/join', joinReferralProgramme as any);

// PUT /api/v1/user/premium/referrals/bank-details - Update bank details
router.put('/bank-details', updateBankDetails as any);

// POST /api/v1/user/premium/referrals/claim - Claim referral attribution
router.post('/claim', claimReferral as any);

export default router;
