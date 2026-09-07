import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Voucher } from '../../models/Voucher';

function generateCode(prefix = 'HCA'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const cleanPrefix = (prefix || 'HCA').trim().toUpperCase();
  let codePart = '';
  for (let i = 0; i < 5; i++) {
    codePart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${cleanPrefix}-${codePart}`;
}

/**
 * Get all vouchers with search, group filter, and target expiration filter for Admin
 * GET /api/v1/admin/vouchers
 */
export const getAllVouchers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, group, target, sort = '-createdAt', page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 100);

    const query: any = {};

    // Group Filter
    if (group && typeof group === 'string' && group.trim() && group !== 'all') {
      const g = group.trim().toLowerCase();
      if (g === 'purchased') {
        query.source = 'Purchased';
      } else if (g === 'redeemed') {
        query.status = 'Redeemed';
      } else if (g === 'unredeemed') {
        query.status = { $in: ['Available', 'Unredeemed'] };
      } else if (g === 'expired') {
        query.status = 'Expired';
      } else if (g === 'bulk') {
        query.source = 'Bulk';
      } else if (g === 'internal') {
        query.source = 'Internal';
      }
    }

    // Target Filter (Days to expiry or status)
    if (target && typeof target === 'string' && target.trim() && target !== 'all') {
      const t = target.trim().toLowerCase();
      const now = new Date();

      if (t === 'unredeemed') {
        query.status = { $in: ['Available', 'Unredeemed'] };
      } else if (t === 'expired') {
        query.$or = [{ status: 'Expired' }, { expiresAt: { $lt: now } }];
      } else if (!isNaN(Number(t))) {
        const days = Number(t);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        query.expiresAt = { $gte: now, $lte: futureDate };
      }
    }

    // Search term across code, purchaser, redeemer
    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { code: searchRegex },
        { voucherId: searchRegex },
        { name: searchRegex },
        { offer: searchRegex },
        { purchaserName: searchRegex },
        { purchaserEmail: searchRegex },
        { redeemerName: searchRegex },
        { redeemerEmail: searchRegex },
      ];
    }

    const total = await Voucher.countDocuments(query);
    const vouchers = await Voucher.find(query)
      .sort(String(sort))
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    // Compute live counts for the 6 group cards
    const now = new Date();
    const [
      purchasedCount,
      redeemedCount,
      unredeemedCount,
      expiredCount,
      bulkCount,
      internalCount,
    ] = await Promise.all([
      Voucher.countDocuments({ source: 'Purchased' }),
      Voucher.countDocuments({ status: 'Redeemed' }),
      Voucher.countDocuments({ status: { $in: ['Available', 'Unredeemed'] } }),
      Voucher.countDocuments({ $or: [{ status: 'Expired' }, { expiresAt: { $lt: now } }] }),
      Voucher.countDocuments({ source: 'Bulk' }),
      Voucher.countDocuments({ source: 'Internal' }),
    ]);

    // Compute newly added (last 7 days) counts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      newPurchased,
      newRedeemed,
      newUnredeemed,
      newExpired,
      newBulk,
      newInternal,
    ] = await Promise.all([
      Voucher.countDocuments({ source: 'Purchased', createdAt: { $gte: sevenDaysAgo } }),
      Voucher.countDocuments({ status: 'Redeemed', updatedAt: { $gte: sevenDaysAgo } }),
      Voucher.countDocuments({ status: { $in: ['Available', 'Unredeemed'] }, createdAt: { $gte: sevenDaysAgo } }),
      Voucher.countDocuments({ status: 'Expired', updatedAt: { $gte: sevenDaysAgo } }),
      Voucher.countDocuments({ source: 'Bulk', createdAt: { $gte: sevenDaysAgo } }),
      Voucher.countDocuments({ source: 'Internal', createdAt: { $gte: sevenDaysAgo } }),
    ]);

    const formattedGroups = [
      { key: 'purchased', label: 'Purchased', total: purchasedCount, newCount: newPurchased },
      { key: 'redeemed', label: 'Redeemed', total: redeemedCount, newCount: newRedeemed },
      { key: 'unredeemed', label: 'Unredeemed', total: unredeemedCount, newCount: newUnredeemed },
      { key: 'expired', label: 'Expired', total: expiredCount, newCount: newExpired },
      { key: 'bulk', label: 'Bulk', total: bulkCount, newCount: newBulk },
      { key: 'internal', label: 'Internal', total: internalCount, newCount: newInternal },
    ];

    const formattedVouchers = vouchers.map((v) => {
      const purDate = v.createdAt ? new Date(v.createdAt) : new Date();
      const dd = String(purDate.getDate()).padStart(2, '0');
      const mm = String(purDate.getMonth() + 1).padStart(2, '0');
      const yyyy = purDate.getFullYear();

      let expFormatted = 'Starts on redemption';
      if (v.expiresAt) {
        const expD = new Date(v.expiresAt);
        expFormatted = `${String(expD.getDate()).padStart(2, '0')}/${String(expD.getMonth() + 1).padStart(2, '0')}/${expD.getFullYear()}`;
      }

      return {
        _id: String(v._id),
        id: v.voucherId || String(v._id),
        voucherId: v.voucherId,
        code: v.code,
        purchaserName: v.purchaserName || 'Valued Customer',
        purchaserEmail: v.purchaserEmail || '',
        redeemerName: v.redeemerName || '',
        redeemerEmail: v.redeemerEmail || '',
        offer: v.offer || v.name,
        name: v.name,
        description: v.description,
        plan: v.plan,
        amount: v.amount,
        purchasedAt: `${dd}/${mm}/${yyyy}`,
        expiresAt: expFormatted,
        rawExpiry: v.expiresAt,
        status: v.status,
        source: v.source,
        paymentStatus: v.paymentStatus,
        noticesSent: v.noticesSent || [],
        createdAt: v.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      vouchers: formattedVouchers,
      groups: formattedGroups,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create single or bulk vouchers from Admin
 * POST /api/v1/admin/vouchers
 */
export const createAdminVoucher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      mode = 'Single',
      name,
      description,
      discountType = 'Percentage',
      percentage,
      validFrom,
      expiry,
      quantity = '1',
      prefix = 'HCA',
      active = true,
    } = req.body;

    if (!name || !description) {
      res.status(400).json({ success: false, message: 'Name and description are required.' });
      return;
    }

    const qty = mode === 'Bulk' ? Math.max(1, parseInt(String(quantity), 10) || 1) : 1;
    const source = mode === 'Bulk' ? 'Bulk' : 'Internal';
    const status = active ? 'Active' : 'Unredeemed';

    const parsedExpiry = expiry ? new Date(expiry) : undefined;
    const parsedValidFrom = validFrom ? new Date(validFrom) : new Date();

    const created = [];

    for (let i = 0; i < qty; i++) {
      const randNum = Math.floor(10000 + Math.random() * 90000);
      const voucherId = `VCH-${randNum}`;
      const code = generateCode(prefix);

      const voucher = await Voucher.create({
        voucherId,
        code,
        name: name.trim(),
        offer: discountType === 'Percentage' ? `${percentage || 20}% off - ${name.trim()}` : name.trim(),
        description: description.trim(),
        plan: 'Promotional Plan',
        durationYears: 1,
        discountType: discountType === 'Percentage' ? 'Percentage' : 'Fixed amount',
        discountValue: Number(percentage) || 0,
        amount: discountType === 'Fixed amount' ? Number(percentage) || 0 : 0,
        currency: 'NGN',
        purchaserName: 'HealthCentreApp Admin',
        purchaserEmail: 'admin@healthcentreapp.com',
        isGuest: false,
        status,
        source,
        paymentStatus: 'Paid',
        paymentProvider: 'System (Internal)',
        validFrom: parsedValidFrom,
        expiresAt: parsedExpiry,
      });

      created.push(voucher);
    }

    res.status(201).json({
      success: true,
      message: `${created.length} voucher(s) created successfully.`,
      vouchers: created,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single voucher by ID for Admin
 * GET /api/v1/admin/vouchers/:id
 */
export const getVoucherById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const voucher = await Voucher.findOne({
      $or: [...(isObjectId ? [{ _id: id }] : []), { voucherId: id }, { code: id }],
    });

    if (!voucher) {
      res.status(404).json({ success: false, message: 'Voucher not found' });
      return;
    }

    res.status(200).json({
      success: true,
      voucher,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update voucher status (e.g. Revoke, Expire)
 * PATCH /api/v1/admin/vouchers/:id/status
 */
export const updateVoucherStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status } = req.body;

    const isObjectId = mongoose.isValidObjectId(id);
    const voucher = await Voucher.findOne({
      $or: [...(isObjectId ? [{ _id: id }] : []), { voucherId: id }, { code: id }],
    });

    if (!voucher) {
      res.status(404).json({ success: false, message: 'Voucher not found' });
      return;
    }

    if (status) {
      voucher.status = status;
      await voucher.save();
    }

    res.status(200).json({
      success: true,
      message: 'Voucher status updated successfully',
      voucher,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Send notice to selected voucher holders
 * POST /api/v1/admin/vouchers/send-notice
 */
export const sendVoucherNotice = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { voucherIds, message, sentBy = 'Admin' } = req.body;

    if (!Array.isArray(voucherIds) || voucherIds.length === 0) {
      res.status(400).json({ success: false, message: 'Select at least one voucher.' });
      return;
    }

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, message: 'Notice message is required.' });
      return;
    }

    const noticeItem = {
      id: `NT-${Date.now()}`,
      message: message.trim(),
      sentAt: new Date(),
      sentBy: String(sentBy),
    };

    await Voucher.updateMany(
      {
        $or: [
          { voucherId: { $in: voucherIds } },
          { _id: { $in: voucherIds.filter((id) => mongoose.isValidObjectId(id)) } },
        ],
      },
      {
        $push: { noticesSent: noticeItem },
      }
    );

    res.status(200).json({
      success: true,
      message: `Voucher notice sent to ${voucherIds.length} recipient${voucherIds.length === 1 ? '' : 's'}.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single voucher
 * DELETE /api/v1/admin/vouchers/:id
 */
export const deleteVoucher = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const deleted = await Voucher.findOneAndDelete({
      $or: [...(isObjectId ? [{ _id: id }] : []), { voucherId: id }],
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Voucher not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Voucher deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete vouchers
 * POST /api/v1/admin/vouchers/bulk-delete
 */
export const bulkDeleteVouchers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'Provide an array of voucher IDs to delete.' });
      return;
    }

    const objectIds = ids.filter((id: string) => mongoose.isValidObjectId(id));

    const result = await Voucher.deleteMany({
      $or: [{ voucherId: { $in: ids } }, { _id: { $in: objectIds } }],
    });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${result.deletedCount} voucher(s).`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};
