import { Router } from 'express';
import { requireAuth } from '../../../middlewares/auth';
import {
  getCareSecureGrants,
  getCareSecureGrantById,
  createCareSecureGrant,
  updateCareSecureGrant,
  revokeCareSecureGrant,
} from '../../../controllers/user/standard/careSecureController';

const router = Router();

router.use(requireAuth);

router.get('/', getCareSecureGrants);
router.post('/', createCareSecureGrant);
router.get('/:id', getCareSecureGrantById);
router.put('/:id', updateCareSecureGrant);
router.post('/:id/revoke', revokeCareSecureGrant);

export default router;
