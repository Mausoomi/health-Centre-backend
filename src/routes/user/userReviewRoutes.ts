import { Router } from 'express';
import {
  submitReview,
  getPublishedReviews,
  toggleLikeReview,
  reportReview,
} from '../../controllers/user/userReviewController';

const router = Router();

/**
 * ============================================================================
 * USER SIDE - REVIEW ROUTES
 * Base URL: /api/v1/reviews (and /api/v1/user/reviews)
 * ============================================================================
 */

// Submit a new review
router.post('/', submitReview);

// Fetch all published reviews for community page
router.get('/published', getPublishedReviews);

// Like or unlike a review
router.post('/:id/like', toggleLikeReview);

// Report a review for moderation
router.post('/:id/report', reportReview);

export const userReviewRoutes = router;
