import { Router } from 'express';
import { submitContactInquiry } from '../../controllers/user/userContactController';

const router = Router();

/**
 * ============================================================================
 * USER SIDE - CONTACT US INQUIRY ROUTES
 * Base URL: /api/v1/contact
 * ============================================================================
 */

// Submit a new contact message / enquiry
router.post('/', submitContactInquiry);

export const userContactRoutes = router;
