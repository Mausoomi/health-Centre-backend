import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Review } from '../../models/Review';

export const getAllReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { search, status, sort = '-createdAt', limit = 100 } = req.query;

    const query: any = {};

    if (status && status !== 'All' && status !== 'All statuses') {
      query.status = status;
    }

    if (search && typeof search === 'string' && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { reviewerName: searchRegex },
        { title: searchRegex },
        { text: searchRegex },
        { service: searchRegex },
        { country: searchRegex },
      ];
    }

    const reviews = await Review.find(query)
      .sort(String(sort))
      .limit(Number(limit));

    const formattedReviews = reviews.map((r) => {
      const d = new Date(r.createdAt);
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      const formattedDate = `${dd}/${mm}/${yyyy}, ${hh}:${min}`;

      return {
        id: String(r._id),
        _id: String(r._id),
        reviewer: r.reviewerName,
        reviewerName: r.reviewerName,
        reviewerEmail: r.reviewerEmail,
        rating: r.rating,
        title: r.title || r.text.slice(0, 40) + '...',
        summary: r.text.slice(0, 70) + (r.text.length > 70 ? '...' : ''),
        fullText: r.text,
        service: r.service,
        country: r.country,
        avatar: r.avatar,
        image: r.image,
        submitted: `${dd}/${mm}/${yyyy}`,
        submittedDetailed: formattedDate,
        status: r.status,
        likes: r.likes,
        reportCount: (r.reports || []).length,
        reportContext: (r.reports || []).length > 0
          ? `${r.reports.length} report(s) filed. Latest reason: ${r.reports[r.reports.length - 1].reason}`
          : 'No moderation reports recorded for this review.',
        reports: r.reports || [],
        notes: (r.adminNotes || []).map((n) => ({
          id: n.id,
          note: n.note,
          createdBy: n.createdBy,
          createdAt: n.createdAt,
        })),
      };
    });

    res.status(200).json({
      success: true,
      count: formattedReviews.length,
      reviews: formattedReviews,
    });
  } catch (error) {
    next(error);
  }
};

export const getReviewById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid review ID format' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.status(200).json({
      success: true,
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const updateReviewStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['Published', 'Pending', 'Hidden', 'Flagged'].includes(status)) {
      res.status(400).json({ message: 'Valid status is required (Published, Pending, Hidden, Flagged).' });
      return;
    }

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid review ID format' });
      return;
    }

    const review = await Review.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Review status updated to ${status}`,
      review,
    });
  } catch (error) {
    next(error);
  }
};

export const addReviewAdminNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { note, createdBy = 'Moderation Admin' } = req.body;

    if (!note || !note.trim()) {
      res.status(400).json({ message: 'Note text is required.' });
      return;
    }

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid review ID format' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const newNote = {
      id: `note-${Date.now()}`,
      note: note.trim(),
      createdBy,
      createdAt: new Date(),
    };

    if (!review.adminNotes) {
      review.adminNotes = [];
    }
    review.adminNotes.unshift(newNote);
    await review.save();

    res.status(201).json({
      success: true,
      message: 'Admin note added successfully',
      note: newNote,
      notes: review.adminNotes,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid review ID format' });
      return;
    }

    const review = await Review.findByIdAndDelete(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Review permanently deleted',
      reviewId: id,
    });
  } catch (error) {
    next(error);
  }
};
