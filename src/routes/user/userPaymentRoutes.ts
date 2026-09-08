import { Router } from 'express';
import { createStripeSession, verifySession } from '../../controllers/paymentController';

const router = Router();

// Stripe Checkout & Verification endpoints
router.post('/stripe/create-checkout-session', createStripeSession);
router.post('/stripe/verify-session', verifySession);

export const userPaymentRoutes = router;
