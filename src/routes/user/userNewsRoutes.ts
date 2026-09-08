import { Router } from 'express';
import {
  getPublicNews,
  getNewsById,
  likeNews,
  reportNews,
} from '../../controllers/user/userNewsController';

const router = Router();

/**
 * ============================================================================
 * PUBLIC & USER NEWS ROUTES
 * Base URL: /api/v1/news
 * ============================================================================
 */

// Fetch active published news for public slider & news page
router.get('/public', getPublicNews);

// Get single news article by ID
router.get('/:id', getNewsById);

// Toggle like on a news article
router.post('/:id/like', likeNews);

// Submit user moderation report on a news article
router.post('/:id/report', reportNews);

export const userNewsRoutes = router;
