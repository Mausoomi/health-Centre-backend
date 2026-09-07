import { Router } from 'express';
import {
  getAllReviews,
  getReviewById,
  updateReviewStatus,
  addReviewAdminNote,
  deleteReview,
} from '../../controllers/admin/adminReviewController';

const router = Router();

/**
 * ============================================================================
 * ADMIN PORTAL - REVIEWS MODERATION ROUTES
 * Base URL: /api/v1/admin/reviews
 * ============================================================================
 */

// List all reviews with search & status filters (?search, ?status, ?sort, ?limit)
router.get('/', getAllReviews);

// Get single review details with reports & internal notes
router.get('/:id', getReviewById);

// Update review status (Published, Pending, Hidden, Flagged)
router.patch('/:id/status', updateReviewStatus);

// Add persistent internal moderation note
router.post('/:id/notes', addReviewAdminNote);

// Delete review permanently
router.delete('/:id', deleteReview);

export const adminReviewRoutes = router;
