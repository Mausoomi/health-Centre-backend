import { Request, Response, NextFunction } from 'express';
import { Voucher } from '../../models/Voucher';

function generateVoucherCode(prefix = 'HCA'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const segment = (len = 4) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `${prefix}-${segment(4)}-${segment(4)}`;
}

function generateDisplayCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const seg = () => {
    let res = '';
    for (let i = 0; i < 4; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `${seg()} ${seg()} ${seg()} ${seg()}`;
}

/**
 * Persist purchased vouchers upon checkout completion
 * POST /api/v1/vouchers/purchase
 */
export const purchaseVouchers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      voucher,
      items,
      customer,
      pricing,
      payment,
      orderReference,
    } = req.body;

    const purchaserName = customer?.name || 'Valued Customer';
    const purchaserEmail = (customer?.email || '').trim().toLowerCase();
    const purchaserId = customer?.userId || '';
    const isGuest = !!customer?.isGuest;
    const paymentRef = payment?.paymentReference || orderReference || `PAY-VCH-${Date.now()}`;
    const paymentProvider = payment?.provider || 'Paystack (Simulated)';

    const voucherItems = Array.isArray(items) && items.length > 0
      ? items
      : Array.isArray(voucher?.items) && voucher.items.length > 0
      ? voucher.items
      : [
          {
            plan: voucher?.plan || 'Standard Plan',
            years: parseInt(voucher?.duration) || 1,
            quantity: voucher?.quantity || 1,
            price: pricing?.baseAmount || 6000,
          },
        ];

    const createdVouchers = [];

    for (const item of voucherItems) {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const planName = item.plan || 'Standard Plan';
      const duration = Math.max(1, Number(item.years) || 1);
      const unitPrice = Number(item.price) || 6000;

      for (let q = 0; q < qty; q++) {
        const randomNum = Math.floor(10000 + Math.random() * 90000);
        const voucherId = `VCH-${randomNum}`;
        const code = generateDisplayCode();

        // Calculate expiration date (e.g. 1 year validity from purchase)
        const expDate = new Date();
        expDate.setFullYear(expDate.getFullYear() + duration);

        const newVoucher = await Voucher.create({
          voucherId,
          code,
          name: `${planName} (${duration} ${duration === 1 ? 'Year' : 'Years'})`,
          offer: `${planName} Gift Subscription`,
          description: `Full access subscription to ${planName} for ${duration} year(s).`,
          plan: planName,
          durationYears: duration,
          discountType: 'Full Plan',
          discountValue: unitPrice,
          amount: unitPrice,
          currency: pricing?.baseCurrency || 'NGN',
          purchaserId,
          purchaserName,
          purchaserEmail: purchaserEmail || 'customer@healthcentreapp.com',
          isGuest,
          status: 'Available',
          source: 'Purchased',
          paymentStatus: 'Paid',
          paymentReference: paymentRef,
          paymentProvider,
          validFrom: new Date(),
          expiresAt: expDate,
        });

        createdVouchers.push(newVoucher);
      }
    }

    res.status(201).json({
      success: true,
      message: `${createdVouchers.length} voucher(s) created successfully.`,
      vouchers: createdVouchers,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's purchased & available vouchers for User Dashboard
 * GET /api/v1/vouchers/my-vouchers
 */
export const getMyVouchers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, email, status } = req.query;

    const conditions: any[] = [];
    if (userId && typeof userId === 'string' && userId.trim()) {
      conditions.push({ purchaserId: userId.trim() });
    }
    if (email && typeof email === 'string' && email.trim()) {
      const cleanEmail = email.trim().toLowerCase();
      conditions.push({ purchaserEmail: cleanEmail });
      conditions.push({ redeemerEmail: cleanEmail });
    }

    let query: any = conditions.length > 0 ? { $or: conditions } : {};

    if (status && status !== 'All') {
      query.status = status;
    }

    const vouchers = await Voucher.find(query).sort('-createdAt');

    // Compute live metric counters
    const allUserVouchers = conditions.length > 0 ? await Voucher.find({ $or: conditions }) : vouchers;

    const purchasedCount = allUserVouchers.length;
    const availableCount = allUserVouchers.filter((v) => v.status === 'Available' || v.status === 'Unredeemed').length;
    const redeemedCount = allUserVouchers.filter((v) => v.status === 'Redeemed').length;
    const expiredCount = allUserVouchers.filter((v) => v.status === 'Expired').length;

    const formatted = vouchers.map((v) => {
      const expStr = v.expiresAt
        ? new Date(v.expiresAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Starts on redemption';

      return {
        id: v.voucherId || String(v._id),
        voucherId: v.voucherId,
        code: v.code,
        plan: v.plan,
        name: v.name,
        offer: v.offer,
        recipient: v.redeemerName ? `Redeemed by ${v.redeemerName}` : 'Ready to share',
        redeemerName: v.redeemerName || '',
        redeemerEmail: v.redeemerEmail || '',
        purchaserName: v.purchaserName,
        purchaserEmail: v.purchaserEmail,
        expiry: expStr,
        expiresAt: v.expiresAt,
        status: v.status,
        value: `₦${Number(v.amount || 6000).toLocaleString('en-NG')}`,
        amount: v.amount,
        createdAt: v.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      vouchers: formatted,
      summary: {
        purchased: purchasedCount,
        available: availableCount,
        redeemed: redeemedCount,
        expired: expiredCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Redeem a voucher code
 * POST /api/v1/vouchers/redeem
 */
export const redeemVoucher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { code, redeemerName, redeemerEmail, redeemerId } = req.body;

    if (!code || !code.trim()) {
      res.status(400).json({ success: false, message: 'Voucher code is required' });
      return;
    }

    const cleanCode = code.trim().replace(/\s+/g, ' ').toUpperCase();
    const noSpaceCode = code.trim().replace(/\s+/g, '').toUpperCase();

    const voucher = await Voucher.findOne({
      $or: [
        { code: cleanCode },
        { code: noSpaceCode },
      ],
    });

    if (!voucher) {
      res.status(404).json({ success: false, message: 'Invalid voucher code.' });
      return;
    }

    if (voucher.status === 'Redeemed') {
      res.status(400).json({
        success: false,
        message: `This voucher has already been redeemed${voucher.redeemedAt ? ' on ' + new Date(voucher.redeemedAt).toLocaleDateString('en-GB') : ''}.`,
      });
      return;
    }

    if (voucher.status === 'Expired' || voucher.status === 'Revoked') {
      res.status(400).json({
        success: false,
        message: `This voucher is ${voucher.status.toLowerCase()} and cannot be redeemed.`,
      });
      return;
    }

    // Check expiry date
    if (voucher.expiresAt && new Date(voucher.expiresAt) < new Date()) {
      voucher.status = 'Expired';
      await voucher.save();
      res.status(400).json({
        success: false,
        message: 'This voucher has expired.',
      });
      return;
    }

    voucher.status = 'Redeemed';
    voucher.redeemerName = (redeemerName || 'Member').trim();
    voucher.redeemerEmail = (redeemerEmail || '').trim().toLowerCase();
    voucher.redeemerId = redeemerId || '';
    voucher.redeemedAt = new Date();

    await voucher.save();

    res.status(200).json({
      success: true,
      message: 'Voucher redeemed successfully!',
      voucher: {
        id: voucher.voucherId,
        code: voucher.code,
        plan: voucher.plan,
        name: voucher.name,
        offer: voucher.offer,
        status: voucher.status,
        redeemedAt: voucher.redeemedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
