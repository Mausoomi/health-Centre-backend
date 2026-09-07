import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Advert } from '../../models/Advert';

/**
 * List all adverts for admin moderation with search and status filters
 * GET /api/v1/admin/adverts
 */
export const getAllAdverts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status, sort = '-createdAt', page = 1, limit = 100 } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.max(1, parseInt(String(limit), 10) || 100);

    const query: any = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { title: searchRegex },
        { description: searchRegex },
        { customerName: searchRegex },
        { customerEmail: searchRegex },
        { advertId: searchRegex },
        { 'locations.country': searchRegex },
        { 'locations.region': searchRegex },
        { address: searchRegex },
      ];
    }

    const total = await Advert.countDocuments(query);
    const adverts = await Advert.find(query)
      .sort(String(sort))
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const formatted = adverts.map((ad) => {
      const date = ad.createdAt ? new Date(ad.createdAt) : new Date();
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');

      const locString =
        ad.locations && ad.locations.length > 0
          ? ad.locations.map((l) => `${l.region}`).filter(Boolean).join(', ') || ad.locations[0].country
          : 'Nigeria';

      return {
        _id: String(ad._id),
        id: ad.advertId || String(ad._id),
        advertId: ad.advertId,
        customerId: ad.userId || 'guest',
        name: ad.name,
        title: ad.title,
        details: ad.description,
        description: ad.description,
        customer: ad.customerName || 'Valued Customer',
        email: ad.customerEmail || ad.email || '',
        submitted: `${dd}/${mm}/${yyyy}, ${hh}:${min}`,
        locations: locString,
        locationsList: ad.locations || [],
        start: ad.startDate || `${dd}/${mm}/${yyyy}`,
        endDate: ad.endDate || '',
        days: ad.totalDays || 200,
        amount: `₦${Number(ad.totalCost || 2000).toLocaleString('en-NG')}`,
        payment: ad.paymentStatus || 'Paid',
        reference: ad.paymentReference || `PAY-${ad.advertId}`,
        status: ad.status || 'Submitted',
        imageUrl: ad.image || '',
        reviewReason: ad.reviewReason || '',
        assignedAdmin: ad.assignedAdmin || '',
        adminNotes: ad.adminNotes || [],
        views: ad.views || 0,
        clicks: ad.clicks || 0,
        likes: ad.likes || 0,
        reports: ad.reports || [],
        createdAt: ad.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      adverts: formatted,
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
 * Get single advert details for admin
 * GET /api/v1/admin/adverts/:id
 */
export const getAdvertById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const advert = await Advert.findOne({
      $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }],
    });

    if (!advert) {
      res.status(404).json({ success: false, message: 'Advert not found' });
      return;
    }

    res.status(200).json({
      success: true,
      advert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update advert status / review / assignment
 * PATCH /api/v1/admin/adverts/:id
 */
export const updateAdvertStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, reviewReason, assignedAdmin } = req.body;
    const isObjectId = mongoose.isValidObjectId(id);

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (reviewReason !== undefined) updateFields.reviewReason = reviewReason;
    if (assignedAdmin !== undefined) updateFields.assignedAdmin = assignedAdmin;

    const updated = await Advert.findOneAndUpdate(
      { $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }] },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Advert not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Advert status updated successfully.',
      advert: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve an advert for scheduling / publishing
 * PATCH /api/v1/admin/adverts/:id/approve
 */
export const approveAdvert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const updated = await Advert.findOneAndUpdate(
      { $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }] },
      { $set: { status: 'Approved', reviewReason: '' } },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Advert not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Advert approved successfully.',
      advert: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Fail an advert review and request changes with reason
 * PATCH /api/v1/admin/adverts/:id/fail
 */
export const failAdvert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ success: false, message: 'A reason is required to fail the advert review.' });
      return;
    }

    const isObjectId = mongoose.isValidObjectId(id);
    const updated = await Advert.findOneAndUpdate(
      { $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }] },
      { $set: { status: 'Changes Required', reviewReason: reason.trim() } },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ success: false, message: 'Advert not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Advert review marked as Changes Required.',
      advert: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add internal admin moderation note
 * POST /api/v1/admin/adverts/:id/notes
 */
export const addAdvertNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { note, createdBy = 'Admin' } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ success: false, message: 'Note text is required.' });
      return;
    }

    const isObjectId = mongoose.isValidObjectId(id);
    const advert = await Advert.findOne({
      $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }],
    });

    if (!advert) {
      res.status(404).json({ success: false, message: 'Advert not found' });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      note: note.trim(),
      createdBy,
      createdAt: new Date(),
    };

    if (!advert.adminNotes) advert.adminNotes = [];
    advert.adminNotes.unshift(newNote);
    await advert.save();

    res.status(201).json({
      success: true,
      message: 'Admin note added successfully.',
      note: newNote,
      adminNotes: advert.adminNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete single advert
 * DELETE /api/v1/admin/adverts/:id
 */
export const deleteAdvert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const deleted = await Advert.findOneAndDelete({
      $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }],
    });

    if (!deleted) {
      res.status(404).json({ success: false, message: 'Advert not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Advert deleted successfully.',
      id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete adverts
 * POST /api/v1/admin/adverts/bulk-delete
 */
export const bulkDeleteAdverts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'No advert IDs provided.' });
      return;
    }

    const objectIds = ids.filter((id) => mongoose.isValidObjectId(id));

    await Advert.deleteMany({
      $or: [
        { _id: { $in: objectIds } },
        { advertId: { $in: ids } },
      ],
    });

    res.status(200).json({
      success: true,
      message: `${ids.length} adverts deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
