import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { News } from '../../models/News';
import { AuthenticatedRequest } from '../../middlewares/auth';

/**
 * Get all News articles for Admin News Management
 * GET /api/v1/admin/news
 */
export const getAllAdminNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, search, country } = req.query;

    const query: any = {};

    if (status && status !== 'All') {
      query.status = status;
    }

    if (country && country !== 'ALL') {
      query.country = country;
    }

    if (search && typeof search === 'string') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { summary: regex }, { content: regex }, { newsId: regex }];
    }

    const newsList = await News.find(query).sort({ createdAt: -1 });

    const totalCount = await News.countDocuments();
    const publishedCount = await News.countDocuments({ status: 'Published' });
    const scheduledCount = await News.countDocuments({ status: 'Scheduled' });
    const draftCount = await News.countDocuments({ status: 'Draft' });
    const archivedCount = await News.countDocuments({ status: 'Archived' });

    res.status(200).json({
      success: true,
      data: newsList,
      stats: {
        total: totalCount,
        published: publishedCount,
        scheduled: scheduledCount,
        draft: draftCount,
        archived: archivedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new News article (Admin only)
 * POST /api/v1/admin/news
 */
export const createNews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      title,
      summary,
      content,
      image,
      country,
      countryName,
      state,
      startDate,
      endDate,
      noEndDate,
      status,
      author,
    } = req.body;

    if (!title || !content) {
      res.status(400).json({ success: false, message: 'Title and content are required.' });
      return;
    }

    const newsId = `NEWS-${Math.floor(1000 + Math.random() * 9000)}`;

    const newArticle = await News.create({
      newsId,
      title: title.trim(),
      summary: summary ? summary.trim() : title.trim(),
      content: content.trim(),
      image: image || '',
      country: country || 'ALL',
      countryName: countryName || (country === 'ALL' ? 'All Countries' : 'Selected Country'),
      state: state || 'ALL',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || null,
      noEndDate: noEndDate !== undefined ? noEndDate : !endDate,
      status: status || 'Published',
      author: author || req.user?.email || 'Global Admin',
      views: 0,
      likes: 0,
      likedBy: [],
      reports: [],
      type: 'news',
    });

    res.status(201).json({
      success: true,
      message: 'News article created successfully.',
      data: newArticle,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a News article (Admin only)
 * PUT /api/v1/admin/news/:id
 */
export const updateNews = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id || '');
    const updateData = { ...req.body };

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ newsId: id }, { _id: id }] }
      : { newsId: id };

    const article = await News.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true }
    );

    if (!article) {
      res.status(404).json({ success: false, message: 'News article not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'News article updated successfully.',
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update News status (e.g. Publish, Archive, Draft)
 * PATCH /api/v1/admin/news/:id/status
 */
export const updateNewsStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id || '');
    const { status } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'Status is required.' });
      return;
    }

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ newsId: id }, { _id: id }] }
      : { newsId: id };

    const article = await News.findOneAndUpdate(
      query,
      { $set: { status } },
      { new: true }
    );

    if (!article) {
      res.status(404).json({ success: false, message: 'News article not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `News article status updated to ${status}.`,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a News article (Admin only)
 * DELETE /api/v1/admin/news/:id
 */
export const deleteNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id || '');

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ newsId: id }, { _id: id }] }
      : { newsId: id };

    const article = await News.findOneAndDelete(query);

    if (!article) {
      res.status(404).json({ success: false, message: 'News article not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'News article deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
