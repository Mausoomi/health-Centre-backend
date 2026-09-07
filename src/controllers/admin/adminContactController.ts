import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ContactInquiry } from '../../models/ContactInquiry';

/**
 * List all contact enquiries with live search, status filtering, and pagination
 * GET /api/v1/admin/contact
 */
export const getAllEnquiries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        { sender: searchRegex },
        { firstName: searchRegex },
        { surname: searchRegex },
        { email: searchRegex },
        { ticketId: searchRegex },
        { subject: searchRegex },
        { category: searchRegex },
        { message: searchRegex },
        { content: searchRegex },
      ];
    }

    const total = await ContactInquiry.countDocuments(query);
    const inquiries = await ContactInquiry.find(query)
      .sort(String(sort))
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    const formatted = inquiries.map((enq) => {
      const date = enq.createdAt ? new Date(enq.createdAt) : new Date();
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      const hh = String(date.getHours()).padStart(2, '0');
      const min = String(date.getMinutes()).padStart(2, '0');

      return {
        _id: String(enq._id),
        id: enq.ticketId || `ENQ-${String(enq._id).slice(-5).toUpperCase()}`,
        ticketId: enq.ticketId,
        sender: enq.sender || `${enq.firstName} ${enq.surname}`,
        firstName: enq.firstName,
        surname: enq.surname,
        email: enq.email,
        country: enq.country || 'Nigeria',
        category: enq.category || 'General Enquiry',
        subject: enq.subject || 'General Enquiry',
        content: enq.content || enq.message,
        message: enq.message || enq.content,
        status: enq.status || 'New',
        assignedAdmin: enq.assignedAdmin || '',
        guidance: enq.guidance || '',
        responseEmail: enq.responseEmail || enq.email,
        notes: enq.notes || [],
        received: `${dd}/${mm}/${yyyy}`,
        receivedDetailed: `${dd}/${mm}/${yyyy}, ${hh}:${min}`,
        createdAt: enq.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      enquiries: formatted,
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
 * Get single enquiry details
 * GET /api/v1/admin/contact/:id
 */
export const getEnquiryById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const inquiry = await ContactInquiry.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { ticketId: id },
      ],
    });

    if (!inquiry) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    res.status(200).json({
      success: true,
      enquiry: inquiry,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update enquiry status / assignment / guidance
 * PATCH /api/v1/admin/contact/:id
 */
export const updateEnquiry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, assignedAdmin, guidance, responseEmail } = req.body;
    const isObjectId = mongoose.isValidObjectId(id);

    const updateFields: any = {};
    if (status !== undefined) updateFields.status = status;
    if (assignedAdmin !== undefined) updateFields.assignedAdmin = assignedAdmin;
    if (guidance !== undefined) updateFields.guidance = guidance;
    if (responseEmail !== undefined) updateFields.responseEmail = responseEmail;

    const updated = await ContactInquiry.findOneAndUpdate(
      {
        $or: [
          ...(isObjectId ? [{ _id: id }] : []),
          { ticketId: id },
        ],
      },
      { $set: updateFields },
      { new: true }
    );

    if (!updated) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Enquiry updated successfully',
      enquiry: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an internal admin note to an enquiry
 * POST /api/v1/admin/contact/:id/notes
 */
export const addEnquiryNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { note, createdBy = 'Admin' } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ message: 'Note content is required.' });
      return;
    }

    const isObjectId = mongoose.isValidObjectId(id);
    const inquiry = await ContactInquiry.findOne({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { ticketId: id },
      ],
    });

    if (!inquiry) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      note: note.trim(),
      createdAt: new Date(),
      createdBy,
    };

    if (!inquiry.notes) {
      inquiry.notes = [];
    }
    inquiry.notes.unshift(newNote);
    await inquiry.save();

    res.status(201).json({
      success: true,
      message: 'Internal note added successfully',
      note: newNote,
      notes: inquiry.notes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an enquiry permanently
 * DELETE /api/v1/admin/contact/:id
 */
export const deleteEnquiry = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const deleted = await ContactInquiry.findOneAndDelete({
      $or: [
        ...(isObjectId ? [{ _id: id }] : []),
        { ticketId: id },
      ],
    });

    if (!deleted) {
      res.status(404).json({ message: 'Enquiry not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Enquiry deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete enquiries
 * POST /api/v1/admin/contact/bulk-delete
 */
export const bulkDeleteEnquiries = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ message: 'No enquiry IDs provided.' });
      return;
    }

    const objectIds = ids.filter((id) => mongoose.isValidObjectId(id));

    await ContactInquiry.deleteMany({
      $or: [
        { _id: { $in: objectIds } },
        { ticketId: { $in: ids } },
      ],
    });

    res.status(200).json({
      success: true,
      message: `${ids.length} enquiries deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};
