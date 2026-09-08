import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { News } from '../../models/News';
import { Report } from '../../models/Report';

/**
 * Get Published News for public homepage slider & public news page
 * GET /api/v1/news/public
 */
export const getPublicNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { country, state, search } = req.query;

    const query: any = {
      status: { $in: ['Published', 'Active'] },
    };

    if (search && typeof search === 'string') {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ title: regex }, { summary: regex }, { content: regex }];
    }

    if (country && country !== 'ALL') {
      query.$or = [
        ...(query.$or || []),
        { country: 'ALL' },
        { country: country },
      ];
    }

    if (state && state !== 'ALL') {
      query.$or = [
        ...(query.$or || []),
        { state: 'ALL' },
        { state: state },
      ];
    }

    const newsList = await News.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: newsList.length,
      data: newsList,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single News article by ID & increment view count
 * GET /api/v1/news/:id
 */
export const getNewsById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id || '');

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ newsId: id }, { _id: id }] }
      : { newsId: id };

    let article = await News.findOne(query);

    if (!article) {
      res.status(404).json({ success: false, message: 'News article not found.' });
      return;
    }

    // Increment views
    article.views = (article.views || 0) + 1;
    await article.save();

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Like a News article
 * POST /api/v1/news/:id/like
 */
export const likeNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id || '');
    const { userId } = req.body;

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ newsId: id }, { _id: id }] }
      : { newsId: id };

    const article = await News.findOne(query);

    if (!article) {
      res.status(404).json({ success: false, message: 'News article not found.' });
      return;
    }

    const userKey = userId || req.ip || 'anonymous';
    const hasLiked = article.likedBy.includes(userKey);

    if (hasLiked) {
      article.likedBy = article.likedBy.filter((k) => k !== userKey);
      article.likes = Math.max(0, article.likes - 1);
    } else {
      article.likedBy.push(userKey);
      article.likes += 1;
    }

    await article.save();

    res.status(200).json({
      success: true,
      likes: article.likes,
      hasLiked: !hasLiked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report a News article
 * POST /api/v1/news/:id/report
 */
export const reportNews = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const id = String(req.params.id || '');
    const { reasons, note, reporterEmail } = req.body;

    const query = mongoose.isValidObjectId(id)
      ? { $or: [{ newsId: id }, { _id: id }] }
      : { newsId: id };

    const article = await News.findOne(query);

    if (!article) {
      res.status(404).json({ success: false, message: 'News article not found.' });
      return;
    }

    const reportId = `REP-NEWS-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const reasonsArray = Array.isArray(reasons) ? reasons : [reasons || 'Inappropriate Content'];

    const newReport = {
      id: reportId,
      reasons: reasonsArray,
      note: note || '',
      reporterEmail: reporterEmail || '',
      createdAt: new Date(),
    };

    article.reports.push(newReport);
    await article.save();

    // Create entry in central Report collection
    await Report.create({
      reportId,
      itemType: 'news',
      itemId: article.newsId || String(article._id),
      itemTitle: article.title || 'Untitled News Article',
      itemContent: (article.summary || '') + (article.content ? `\n\n${article.content}` : ''),
      itemImage: article.image || '',
      itemAuthor: article.author || 'HealthCentre Editorial Team',
      itemLocation: article.countryName || article.country || 'Global',
      reporterName: reporterEmail ? reporterEmail.split('@')[0] : 'Reader',
      reporterEmail: reporterEmail?.trim() || '',
      reasons: reasonsArray,
      note: note?.trim() || '',
      status: 'New',
      adminNotes: [],
    });

    res.status(200).json({
      success: true,
      message: 'Report submitted successfully. Our editorial team will review this article.',
      reportId,
    });
  } catch (error) {
    next(error);
  }
};
