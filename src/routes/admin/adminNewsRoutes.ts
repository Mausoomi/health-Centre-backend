import { Router } from 'express';
import {
  getAllAdminNews,
  createNews,
  updateNews,
  updateNewsStatus,
  deleteNews,
} from '../../controllers/admin/adminNewsController';
import { requireAuth, requireAdmin } from '../../middlewares/auth';

const router = Router();

/**
 * ============================================================================
 * ADMIN NEWS MANAGEMENT ROUTES
 * Base URL: /api/v1/admin/news
 * ============================================================================
 */

// Fetch all news articles with stats
router.get('/', getAllAdminNews);

// Create new news article
router.post('/', createNews);

// Update existing news article
router.put('/:id', updateNews);

// Update status (Publish, Archive, Draft)
router.patch('/:id/status', updateNewsStatus);

// Delete news article
router.delete('/:id', deleteNews);

export const adminNewsRoutes = router;
