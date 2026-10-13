import { Advert } from '../models/Advert';
import { Payment } from '../models/Payment';
import { User } from '../models/User';

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || '';

export interface CreateStripeAdvertSessionParams {
  advertId?: string;
  title: string;
  budget: number;
  currency?: string;
  customerEmail: string;
  customerName?: string;
  originUrl?: string;
  advertData?: any;
  orderType?: string;
}

export const createAdvertCheckoutSession = async ({
  advertId,
  title,
  budget,
  currency = 'usd',
  customerEmail,
  customerName,
  originUrl = 'https://healthcentreapp.netlify.app',
  advertData,
  orderType,
}: CreateStripeAdvertSessionParams) => {
  let targetAdvertId = advertId || (orderType?.includes('Premium') ? `PREM-${Date.now().toString().slice(-6)}` : undefined);

  // If advert doesn't exist yet and it's an advert order, save it to DB as pending
  if (!targetAdvertId && advertData && !orderType?.includes('Premium')) {
    const randomRef = `ADV-${Math.floor(100000 + Math.random() * 900000)}`;
    const newAdvert = await Advert.create({
      ...advertData,
      advertId: randomRef,
      customerName: customerName || customerEmail.split('@')[0],
      customerEmail: customerEmail,
      title: title || advertData.title || 'Healthcare Campaign',
      totalCost: budget || 100,
      currency: currency.toUpperCase(),
      paymentStatus: 'Pending',
      status: 'Submitted',
    });
    targetAdvertId = newAdvert.advertId || String(newAdvert._id);
  }

  const isPremium = orderType?.includes('Premium') || targetAdvertId?.startsWith('PREM-');
  const productName = isPremium ? 'HealthCentreApp Premium Plan Subscription' : `HealthCentreApp Advert: ${title || 'Healthcare Campaign'}`;
  const productDesc = isPremium ? `1-Year Premium Digital Health Plan subscription for ${customerEmail}` : `Advert campaign booking on HealthCentreApp for ${title || 'Healthcare Campaign'}`;

  // Unit amount in smallest currency unit (cents/kobo)
  const unitAmount = Math.max(100, Math.round(Number(budget || 100) * 100));
  const successUrl = `${originUrl}/adverts/payment-success?session_id={CHECKOUT_SESSION_ID}&advert_id=${targetAdvertId}`;
  const cancelUrl = `${originUrl}/adverts/payment-cancelled?advert_id=${targetAdvertId}`;

  const bodyParams = new URLSearchParams();
  bodyParams.append('mode', 'payment');
  bodyParams.append('customer_email', customerEmail);
  bodyParams.append('success_url', successUrl);
  bodyParams.append('cancel_url', cancelUrl);
  bodyParams.append('line_items[0][price_data][currency]', currency.toLowerCase());
  bodyParams.append('line_items[0][price_data][unit_amount]', String(unitAmount));
  bodyParams.append('line_items[0][price_data][product_data][name]', productName);
  bodyParams.append('line_items[0][price_data][product_data][description]', productDesc);
  bodyParams.append('line_items[0][price_data][product_data][tax_code]', 'txcd_10501000');
  bodyParams.append('line_items[0][quantity]', '1');
  bodyParams.append('metadata[advertId]', targetAdvertId || '');
  bodyParams.append('metadata[customerEmail]', customerEmail);
  bodyParams.append('metadata[title]', title || '');
  bodyParams.append('metadata[orderType]', orderType || '');

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: bodyParams.toString(),
  });

  const session: any = await response.json();
  if (!response.ok) {
    throw new Error(session?.error?.message || 'Failed to create Stripe Checkout session');
  }

  return {
    sessionId: session.id,
    url: session.url,
    advertId: targetAdvertId,
  };
};

export const verifyStripeSession = async (sessionId: string) => {
  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET}`,
    },
  });

  const session: any = await response.json();
  if (!response.ok) {
    throw new Error(session?.error?.message || 'Failed to retrieve Stripe session');
  }

  const isPaid = session.payment_status === 'paid';
  const advertId = session.metadata?.advertId;
  const customerEmail = session.customer_email || session.metadata?.customerEmail;
  const amountTotal = (session.amount_total || 0) / 100;
  const currency = (session.currency || 'usd').toUpperCase();
  const orderType = session.metadata?.orderType;

  if (isPaid && (advertId || customerEmail)) {
    const isChild = (advertId && advertId.startsWith('CH-')) || orderType?.includes('Child');
    const isPremium = ((advertId && advertId.startsWith('PREM-')) || orderType?.includes('Premium')) && !isChild;

    if (isPremium && customerEmail) {
      // Auto upgrade user plan to Premium Plan in Database
      await User.findOneAndUpdate(
        { email: customerEmail.toLowerCase() },
        { plan: 'Premium Plan' }
      ).catch((err) => console.error('Error upgrading user plan on Stripe success:', err));
    } else if (advertId && !isChild) {
      // Update Advert in DB
      await Advert.findOneAndUpdate(
        { $or: [{ advertId: advertId }, { _id: advertId }] },
        { paymentStatus: 'Paid', status: 'Submitted' },
        { new: true }
      ).catch(() => {});
    }

    // Record Payment in Payments DB
    await Payment.create({
      paymentId: `PAY-${Date.now().toString().slice(-6)}`,
      customer: session.customer_details?.name || customerEmail?.split('@')[0] || 'Subscriber',
      email: customerEmail || 'customer@healthcentreapp.com',
      purpose: isChild ? 'ChildHealth Profile Subscription' : isPremium ? 'Premium Plan Subscription' : 'Advert Placement',
      amount: amountTotal,
      currency: currency,
      gateway: 'Stripe',
      status: 'Successful',
      reference: session.payment_intent || session.id,
      date: new Date(),
    }).catch(() => {});

    return {
      success: true,
      paid: true,
      isPremium,
      isChild,
      session: {
        id: session.id,
        amountTotal,
        currency,
        customerEmail,
        paymentStatus: session.payment_status,
      },
    };
  }

  return {
    success: false,
    paid: isPaid,
    session,
  };
};
