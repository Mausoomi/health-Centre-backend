import { Router } from 'express';
import {
  getAllAdverts,
  getAdvertById,
  updateAdvertStatus,
  approveAdvert,
  failAdvert,
  addAdvertNote,
  deleteAdvert,
  bulkDeleteAdverts,
} from '../../controllers/admin/adminAdvertController';

const router = Router();

/**
 * ============================================================================
 * ADMIN PORTAL - ADVERT MANAGEMENT ROUTES
 * Base URL: /api/v1/admin/adverts
 * ============================================================================
 */

// List all adverts with search, status filters, and pagination
router.get('/', getAllAdverts);

// Bulk delete adverts
router.post('/bulk-delete', bulkDeleteAdverts);

// Get single advert details
router.get('/:id', getAdvertById);

// Update advert status
router.patch('/:id', updateAdvertStatus);

// Quick approve advert
router.patch('/:id/approve', approveAdvert);

// Fail advert / request changes with reason
router.patch('/:id/fail', failAdvert);

// Add internal admin note
router.post('/:id/notes', addAdvertNote);

// Delete single advert
router.delete('/:id', deleteAdvert);

export const adminAdvertRoutes = router;
