import { Request, Response, NextFunction } from 'express';
import { Review } from '../../models/Review';
import { Report } from '../../models/Report';

export const submitReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      rating,
      title,
      text,
      country,
      reviewerName,
      reviewerEmail,
      userId,
      avatar,
      image,
      service,
    } = req.body;

    if (!rating || !text) {
      res.status(400).json({ message: 'Rating and review text are required.' });
      return;
    }

    // Reviewer name fallback
    const finalReviewerName = reviewerName?.trim() || 'Community Member';

    const numRating = Number(rating);
    if (numRating < 1 || numRating > 5) {
      res.status(400).json({ message: 'Rating must be between 1 and 5 stars.' });
      return;
    }

    const reviewTitle = title?.trim() || text.trim().slice(0, 50) + (text.length > 50 ? '...' : '');

    const newReview = await Review.create({
      rating: numRating,
      title: reviewTitle,
      text: text.trim(),
      country: country?.trim() || 'Nigeria',
      reviewerName: finalReviewerName,
      reviewerEmail: reviewerEmail?.trim() || '',
      userId: userId || '',
      avatar: avatar || '',
      image: image || '',
      service: service?.trim() || 'Clinic Visit',
      status: 'Pending', // Requires administrative moderation before publishing
      likes: 0,
      likedBy: [],
      reports: [],
      adminNotes: [],
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully and is pending administrative approval.',
      review: newReview,
    });
  } catch (error) {
    next(error);
  }
};

export const getPublishedReviews = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { country, sort = '-createdAt', limit = 50 } = req.query;

    const query: any = {
      status: 'Published',
    };

    if (country && typeof country === 'string' && country.trim()) {
      query.country = new RegExp(country.trim(), 'i');
    }

    const reviews = await Review.find(query)
      .sort(String(sort))
      .limit(Number(limit));

    const formattedReviews = reviews.map((r) => {
      const createdDate = new Date(r.createdAt);
      const day = createdDate.getDate();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[createdDate.getMonth()];
      const year = createdDate.getFullYear();
      const countryDate = `${r.country || 'Nigeria'} · ${day} ${month} ${year}`;

      return {
        id: String(r._id),
        _id: String(r._id),
        name: r.reviewerName,
        reviewerName: r.reviewerName,
        countryDate,
        country: r.country,
        rating: r.rating,
        title: r.title,
        text: r.text,
        avatar: r.avatar,
        image: r.image || null,
        likes: r.likes || 0,
        isLiked: false,
        service: r.service,
        createdAt: r.createdAt,
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

export const toggleLikeReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { userIdentifier } = req.body; // e.g. userId or browser token

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const identifier = userIdentifier || req.ip || 'anonymous-user';
    const hasLiked = review.likedBy.includes(identifier);

    if (hasLiked) {
      review.likedBy = review.likedBy.filter((i) => i !== identifier);
      review.likes = Math.max(0, review.likes - 1);
    } else {
      review.likedBy.push(identifier);
      review.likes += 1;
    }

    await review.save();

    res.status(200).json({
      success: true,
      likes: review.likes,
      isLiked: !hasLiked,
    });
  } catch (error) {
    next(error);
  }
};

export const reportReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason, comment, reporterEmail } = req.body;

    if (!reason || !reason.trim()) {
      res.status(400).json({ message: 'Reason for report is required.' });
      return;
    }

    const review = await Review.findById(id);
    if (!review) {
      res.status(404).json({ message: 'Review not found' });
      return;
    }

    const reportId = `REP-REV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newReport = {
      id: reportId,
      reason: reason.trim(),
      comment: comment?.trim() || '',
      reporterEmail: reporterEmail?.trim() || '',
      createdAt: new Date(),
    };

    review.reports.push(newReport);
    // If reports exceed threshold, flag review for moderation
    if (review.reports.length >= 2) {
      review.status = 'Flagged';
    }

    await review.save();

    // Create entry in central Report collection
    await Report.create({
      reportId,
      itemType: 'review',
      itemId: String(review._id),
      itemTitle: review.title ? `Review: "${review.title}"` : `Review by ${review.reviewerName || 'Member'}`,
      itemContent: review.text,
      itemImage: review.image || '',
      itemAuthor: review.reviewerName || 'Member',
      itemLocation: review.country || 'Nigeria',
      reporterName: reporterEmail ? reporterEmail.split('@')[0] : 'Community Member',
      reporterEmail: reporterEmail?.trim() || '',
      reasons: [reason.trim()],
      note: comment?.trim() || '',
      status: 'New',
      adminNotes: [],
    });

    res.status(201).json({
      success: true,
      message: 'Report submitted for administrative review',
      reportId,
    });
  } catch (error) {
    next(error);
  }
};
