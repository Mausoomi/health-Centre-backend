import { Router } from 'express';
import {
  getAllEnquiries,
  getEnquiryById,
  updateEnquiry,
  addEnquiryNote,
  deleteEnquiry,
  bulkDeleteEnquiries,
} from '../../controllers/admin/adminContactController';

const router = Router();

/**
 * ============================================================================
 * ADMIN SIDE - CONTACT US & ENQUIRIES MODERATION ROUTES
 * Base URL: /api/v1/admin/contact (and /api/v1/admin/enquiries)
 * ============================================================================
 */

// List & search all contact enquiries
router.get('/', getAllEnquiries);

// Bulk delete enquiries
router.post('/bulk-delete', bulkDeleteEnquiries);

// Get single enquiry by ID or ticket ID
router.get('/:id', getEnquiryById);

// Update status, assignment, guidance
router.patch('/:id', updateEnquiry);

// Append persistent internal note
router.post('/:id/notes', addEnquiryNote);

// Delete single enquiry permanently
router.delete('/:id', deleteEnquiry);

export const adminContactRoutes = router;
