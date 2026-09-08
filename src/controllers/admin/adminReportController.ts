import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Report } from '../../models/Report';
import { Review } from '../../models/Review';
import { News } from '../../models/News';
import { Advert } from '../../models/Advert';

/**
 * Get all moderation reports with live stats and filters
 * GET /api/v1/admin/reports
 */
export const getAllReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, itemType, search, sort = '-createdAt', limit = 100, page = 1 } = req.query;

    const query: any = {};

    if (status && typeof status === 'string' && status !== 'All' && status !== 'All statuses') {
      query.status = status;
    }

    if (itemType && typeof itemType === 'string' && itemType !== 'all' && itemType !== 'All') {
      query.itemType = itemType.toLowerCase();
    }

    if (search && typeof search === 'string' && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { reportId: regex },
        { itemTitle: regex },
        { itemContent: regex },
        { reporterName: regex },
        { reporterEmail: regex },
        { reasons: regex },
        { note: regex },
        { assignee: regex },
      ];
    }

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.max(1, Number(limit) || 100);
    const skip = (pageNum - 1) * limitNum;

    const [reports, totalCount, statsData] = await Promise.all([
      Report.find(query)
        .sort(String(sort))
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Report.countDocuments(query),
      Report.aggregate([
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            newCount: {
              $sum: { $cond: [{ $eq: ['$status', 'New'] }, 1, 0] },
            },
            reviewingCount: {
              $sum: { $cond: [{ $eq: ['$status', 'Reviewing'] }, 1, 0] },
            },
            resolvedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'Resolved'] }, 1, 0] },
            },
            dismissedCount: {
              $sum: { $cond: [{ $eq: ['$status', 'Dismissed'] }, 1, 0] },
            },
            reviewsCount: {
              $sum: { $cond: [{ $eq: ['$itemType', 'review'] }, 1, 0] },
            },
            newsCount: {
              $sum: { $cond: [{ $eq: ['$itemType', 'news'] }, 1, 0] },
            },
            advertsCount: {
              $sum: { $cond: [{ $eq: ['$itemType', 'advert'] }, 1, 0] },
            },
          },
        },
      ]),
    ]);

    const stats = statsData[0] || {
      total: 0,
      newCount: 0,
      reviewingCount: 0,
      resolvedCount: 0,
      dismissedCount: 0,
      reviewsCount: 0,
      newsCount: 0,
      advertsCount: 0,
    };

    // Format reports for clean frontend consumption
    const formatted = reports.map((r: any) => {
      const createdDate = new Date(r.createdAt);
      const day = createdDate.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[createdDate.getMonth()];
      const year = createdDate.getFullYear();
      const timeStr = createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

      return {
        id: String(r._id),
        _id: String(r._id),
        reportId: r.reportId,
        itemType: r.itemType,
        itemId: r.itemId,
        itemTitle: r.itemTitle,
        itemContent: r.itemContent,
        itemImage: r.itemImage || '',
        itemAuthor: r.itemAuthor || '',
        itemLocation: r.itemLocation || '',
        reporter: r.reporterName || r.reporterEmail || 'Member',
        reporterEmail: r.reporterEmail || '',
        reasons: r.reasons || [],
        reason: (r.reasons && r.reasons.length > 0) ? r.reasons.join(', ') : 'Inappropriate Content',
        subject: r.itemTitle,
        type: r.itemType === 'review' ? 'Review Report' : r.itemType === 'news' ? 'News Report' : 'Sponsored Advert Report',
        content: r.itemContent,
        note: r.note || '',
        status: r.status,
        assignee: r.assignee || '',
        actionTaken: r.actionTaken || '',
        adminNotes: r.adminNotes || [],
        submitted: `${day} ${month} ${year}`,
        submittedDetailed: `${day} ${month} ${year}, ${timeStr}`,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      stats,
      total: totalCount,
      page: pageNum,
      reports: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single report details by ID
 * GET /api/v1/admin/reports/:id
 */
export const getReportById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { reportId: id }] }
      : { reportId: id };

    const report = await Report.findOne(query);

    if (!report) {
      res.status(404).json({ success: false, message: 'Report case not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update report status / assignee
 * PATCH /api/v1/admin/reports/:id/status
 */
export const updateReportStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, assignee } = req.body;

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { reportId: id }] }
      : { reportId: id };

    const report = await Report.findOne(query);

    if (!report) {
      res.status(404).json({ success: false, message: 'Report case not found.' });
      return;
    }

    if (status) {
      report.status = status;
    }

    if (assignee !== undefined) {
      report.assignee = assignee;
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report status updated successfully.',
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Take direct moderation action on the reported item & resolve report
 * POST /api/v1/admin/reports/:id/action
 */
export const takeReportAction = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { action, note, adminUser = 'Admin' } = req.body;

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { reportId: id }] }
      : { reportId: id };

    const report = await Report.findOne(query);

    if (!report) {
      res.status(404).json({ success: false, message: 'Report case not found.' });
      return;
    }

    let actionLabel = '';

    // Handle actions on target item
    if (action === 'hide_item' || action === 'flag_item') {
      if (report.itemType === 'review') {
        const revQuery = mongoose.isValidObjectId(report.itemId)
          ? { _id: report.itemId }
          : { id: report.itemId };
        await Review.findOneAndUpdate(revQuery, { status: 'Flagged' });
        actionLabel = 'Review Hidden & Flagged';
      } else if (report.itemType === 'news') {
        const newsQuery = mongoose.isValidObjectId(report.itemId)
          ? { $or: [{ _id: report.itemId }, { newsId: report.itemId }] }
          : { newsId: report.itemId };
        await News.findOneAndUpdate(newsQuery, { status: 'Draft' });
        actionLabel = 'News Article Unpublished to Draft';
      } else if (report.itemType === 'advert') {
        const adQuery = mongoose.isValidObjectId(report.itemId)
          ? { $or: [{ _id: report.itemId }, { advertId: report.itemId }] }
          : { advertId: report.itemId };
        await Advert.findOneAndUpdate(adQuery, { status: 'Paused' });
        actionLabel = 'Sponsored Advert Paused';
      }
      report.status = 'Resolved';
      report.actionTaken = actionLabel;
    } else if (action === 'restore_item' || action === 'approve_item') {
      if (report.itemType === 'review') {
        const revQuery = mongoose.isValidObjectId(report.itemId)
          ? { _id: report.itemId }
          : { id: report.itemId };
        await Review.findOneAndUpdate(revQuery, { status: 'Published' });
        actionLabel = 'Review Approved & Published';
      } else if (report.itemType === 'news') {
        const newsQuery = mongoose.isValidObjectId(report.itemId)
          ? { $or: [{ _id: report.itemId }, { newsId: report.itemId }] }
          : { newsId: report.itemId };
        await News.findOneAndUpdate(newsQuery, { status: 'Published' });
        actionLabel = 'News Article Restored to Published';
      } else if (report.itemType === 'advert') {
        const adQuery = mongoose.isValidObjectId(report.itemId)
          ? { $or: [{ _id: report.itemId }, { advertId: report.itemId }] }
          : { advertId: report.itemId };
        await Advert.findOneAndUpdate(adQuery, { status: 'Live' });
        actionLabel = 'Sponsored Advert Set to Live';
      }
      report.status = 'Resolved';
      report.actionTaken = actionLabel;
    } else if (action === 'dismiss') {
      report.status = 'Dismissed';
      report.actionTaken = 'Dismissed with no violation found';
    } else if (action === 'resolve') {
      report.status = 'Resolved';
      report.actionTaken = 'Marked as Resolved';
    } else if (action === 'reopen') {
      report.status = 'Reviewing';
      report.actionTaken = 'Reopened for investigation';
    }

    if (note && typeof note === 'string' && note.trim()) {
      report.adminNotes.push({
        id: `note-${Date.now()}`,
        author: adminUser,
        note: note.trim(),
        createdAt: new Date(),
      });
    }

    await report.save();

    res.status(200).json({
      success: true,
      message: `Action '${actionLabel || report.status}' executed successfully.`,
      data: report,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add an internal admin note to a report
 * POST /api/v1/admin/reports/:id/notes
 */
export const addReportNote = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { note, author = 'Admin' } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ success: false, message: 'Note text is required.' });
      return;
    }

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { reportId: id }] }
      : { reportId: id };

    const report = await Report.findOne(query);

    if (!report) {
      res.status(404).json({ success: false, message: 'Report case not found.' });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      author: author.trim(),
      note: note.trim(),
      createdAt: new Date(),
    };

    report.adminNotes.push(newNote);
    await report.save();

    res.status(201).json({
      success: true,
      message: 'Internal note added successfully.',
      notes: report.adminNotes,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a single report
 * DELETE /api/v1/admin/reports/:id
 */
export const deleteReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ _id: id }, { reportId: id }] }
      : { reportId: id };

    const report = await Report.findOneAndDelete(query);

    if (!report) {
      res.status(404).json({ success: false, message: 'Report case not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Report case removed from database.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk delete reports
 * POST /api/v1/admin/reports/bulk-delete
 */
export const bulkDeleteReports = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, message: 'Report IDs array is required.' });
      return;
    }

    const objectIds = ids.filter((id) => mongoose.isValidObjectId(id));
    const reportIds = ids.filter((id) => !mongoose.isValidObjectId(id));

    await Report.deleteMany({
      $or: [
        { _id: { $in: objectIds } },
        { reportId: { $in: reportIds } },
      ],
    });

    res.status(200).json({
      success: true,
      message: `Successfully deleted ${ids.length} moderation case(s).`,
    });
  } catch (error) {
    next(error);
  }
};
