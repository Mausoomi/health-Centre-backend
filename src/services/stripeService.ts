import { Advert } from '../models/Advert';
import { Payment } from '../models/Payment';

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
}: CreateStripeAdvertSessionParams) => {
  let targetAdvertId = advertId;

  // If advert doesn't exist yet, save it to DB as pending
  if (!targetAdvertId && advertData) {
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
  bodyParams.append(
    'line_items[0][price_data][product_data][name]',
    `HealthCentreApp Advert: ${title || 'Healthcare Campaign'}`
  );
  bodyParams.append(
    'line_items[0][price_data][product_data][description]',
    `Advert campaign booking on HealthCentreApp for ${title || 'Healthcare Campaign'}`
  );
  bodyParams.append(
    'line_items[0][price_data][product_data][tax_code]',
    'txcd_10501000'
  );
  bodyParams.append('line_items[0][quantity]', '1');
  bodyParams.append('metadata[advertId]', targetAdvertId || '');
  bodyParams.append('metadata[customerEmail]', customerEmail);
  bodyParams.append('metadata[title]', title || '');

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

  if (isPaid && advertId) {
    // Update Advert in DB
    const updatedAdvert = await Advert.findOneAndUpdate(
      { $or: [{ advertId: advertId }, { _id: advertId }] },
      { paymentStatus: 'Paid', status: 'Submitted' },
      { new: true }
    );

    // Record Payment
    await Payment.create({
      paymentId: `PAY-${Date.now().toString().slice(-6)}`,
      customer: session.customer_details?.name || customerEmail?.split('@')[0] || 'Advertiser',
      email: customerEmail || 'customer@healthcentreapp.com',
      purpose: 'Advert Placement',
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
      advert: updatedAdvert,
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
