import { Router } from 'express';
import {
  createAdvert,
  getPublicAdverts,
  getMyAdverts,
  getAdvertById,
  likeAdvert,
  trackClick,
  trackImpression,
  reportAdvert,
} from '../../controllers/user/userAdvertController';

const router = Router();

/**
 * ============================================================================
 * USER & PUBLIC ADVERT ROUTES
 * Base URL: /api/v1/adverts (and /api/v1/user/adverts)
 * ============================================================================
 */

// Create a new advert campaign
router.post('/', createAdvert);

// Get active & published sponsored adverts for homepage slider & modal
router.get('/public', getPublicAdverts);

// Get user's own adverts for their dashboard
router.get('/my-adverts', getMyAdverts);

// Get single advert details
router.get('/:id', getAdvertById);

// Like / unlike advert
router.post('/:id/like', likeAdvert);

// Track click on advert
router.post('/:id/click', trackClick);

// Track impression on advert
router.post('/:id/impression', trackImpression);

// Report advert
router.post('/:id/report', reportAdvert);

export const userAdvertRoutes = router;
