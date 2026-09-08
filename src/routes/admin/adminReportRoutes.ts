import { Router } from 'express';
import {
  getAllReports,
  getReportById,
  updateReportStatus,
  takeReportAction,
  addReportNote,
  deleteReport,
  bulkDeleteReports,
} from '../../controllers/admin/adminReportController';

const router = Router();

/**
 * ============================================================================
 * ADMIN REPORT & MODERATION ROUTES
 * Base URL: /api/v1/admin/reports & /api/v1/admin/moderation
 * ============================================================================
 */

// List all reports with search, status filters, itemType filters & live stats
router.get('/', getAllReports);

// Bulk delete reports
router.post('/bulk-delete', bulkDeleteReports);

// Get single report with target content details
router.get('/:id', getReportById);

// Update status & assignee
router.patch('/:id/status', updateReportStatus);

// Take direct moderation action on the target item
router.post('/:id/action', takeReportAction);

// Add internal admin note to report
router.post('/:id/notes', addReportNote);

// Delete single report
router.delete('/:id', deleteReport);

export const adminReportRoutes = router;
