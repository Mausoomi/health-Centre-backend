import { Router } from 'express';
import {
  getSharedCareSecureAccess,
  addSharedCareSecureEntry
} from '../../controllers/public/publicCareSecureController';

const router = Router();

// Unauthenticated public endpoints for CareSecure shared token access
router.get('/access/:token', getSharedCareSecureAccess);
router.post('/access/:token/entry', addSharedCareSecureEntry);

export default router;
