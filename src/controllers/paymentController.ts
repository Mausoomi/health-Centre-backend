import { Request, Response, NextFunction } from 'express';
import { createAdvertCheckoutSession, verifyStripeSession } from '../services/stripeService';

export const createStripeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { advertId, title, budget, currency, customerEmail, customerName, originUrl, advertData } = req.body;
    if (!customerEmail) {
      res.status(400).json({ message: 'Customer email is required for payment checkout.' });
      return;
    }

    const session = await createAdvertCheckoutSession({
      advertId,
      title,
      budget: Number(budget) || 100,
      currency: currency || 'usd',
      customerEmail,
      customerName,
      originUrl: originUrl || req.headers.origin || 'https://healthcentreapp.netlify.app',
      advertData,
    });

    res.status(200).json({
      success: true,
      sessionId: session.sessionId,
      url: session.url,
      advertId: session.advertId,
    });
  } catch (err: any) {
    console.error('[STRIPE ERROR]', err);
    res.status(500).json({ message: err.message || 'Error initializing Stripe payment' });
  }
};

export const verifySession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      res.status(400).json({ message: 'Session ID is required.' });
      return;
    }

    const result = await verifyStripeSession(sessionId);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('[STRIPE VERIFY ERROR]', err);
    res.status(500).json({ message: err.message || 'Error verifying Stripe payment' });
  }
};
