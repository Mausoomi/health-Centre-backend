import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Advert } from '../../models/Advert';
import { Report } from '../../models/Report';

/**
 * Submit a new advert campaign from workflow / checkout
 * POST /api/v1/adverts
 */
export const createAdvert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      title,
      description,
      image,
      address,
      telephone,
      email,
      website,
      contactPerson,
      locations,
      totalDays,
      totalCost,
      currency,
      customerName,
      customerEmail,
      userId,
      isGuest,
      paymentReference,
      paymentProvider,
    } = req.body;

    if (!name || !title || !description) {
      res.status(400).json({
        success: false,
        message: 'Campaign name, title, and description are required.',
      });
      return;
    }

    // Generate unique Advert ID
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const advertId = `ADV-${randomNum}`;

    // Compute campaign start and end dates from locations
    let startDate = '';
    let endDate = '';
    const locs = Array.isArray(locations) ? locations : [];

    if (locs.length > 0) {
      const starts = locs.map((l: any) => l.start || l.startDate).filter(Boolean);
      if (starts.length > 0) {
        startDate = starts.sort()[0];
      }
      const ends = locs.map((l: any) => {
        if (l.endDate || l.end) {
          const e = String(l.endDate || l.end);
          if (e.includes('-')) return e;
        }
        if ((l.start || l.startDate) && l.days) {
          try {
            const d = new Date((l.start || l.startDate) + 'T00:00:00');
            d.setDate(d.getDate() + Number(l.days) - 1);
            return d.toISOString().split('T')[0];
          } catch {
            return '';
          }
        }
        return '';
      }).filter(Boolean);

      if (ends.length > 0) {
        endDate = ends.sort().reverse()[0];
      }
    }

    if (!startDate) {
      startDate = req.body.startDate || new Date().toISOString().split('T')[0];
    }

    if (!endDate) {
      if (req.body.endDate && String(req.body.endDate).includes('-')) {
        endDate = req.body.endDate;
      } else {
        const days = Number(totalDays) || 200;
        try {
          const d = new Date(startDate.includes('T') ? startDate : startDate + 'T00:00:00');
          d.setDate(d.getDate() + days - 1);
          endDate = d.toISOString().split('T')[0];
        } catch {
          endDate = '';
        }
      }
    }

    const newAdvert = await Advert.create({
      advertId,
      userId: userId || '',
      customerName: customerName || 'Valued Customer',
      customerEmail: (customerEmail || email || '').trim().toLowerCase(),
      isGuest: !!isGuest,
      name: name.trim(),
      title: title.trim(),
      description: description.trim(),
      image: image || '',
      address: address || '',
      telephone: telephone || '',
      email: email || customerEmail || '',
      website: website || '',
      contactPerson: contactPerson || '',
      locations: locs,
      totalDays: Number(totalDays) || 200,
      totalCost: Number(totalCost) || 2000,
      currency: currency || 'NGN',
      status: 'Submitted',
      paymentStatus: 'Paid',
      paymentReference: paymentReference || `PAY-ADV-${randomNum}`,
      paymentProvider: paymentProvider || 'Paystack (Simulated)',
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '',
      views: 0,
      clicks: 0,
      likes: 0,
      likedBy: [],
      reports: [],
      adminNotes: [],
    });

    res.status(201).json({
      success: true,
      message: 'Advert created and submitted for review successfully.',
      advert: newAdvert,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active & published sponsored adverts for homepage slider / modal
 * GET /api/v1/adverts/public
 */
export const getPublicAdverts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { location } = req.query;
    const query: any = {
      status: { $in: ['Published', 'Active', 'Approved'] },
    };

    if (location && typeof location === 'string' && location.trim()) {
      const locRegex = new RegExp(location.trim(), 'i');
      query.$or = [
        { 'locations.country': locRegex },
        { 'locations.region': locRegex },
        { address: locRegex },
      ];
    }

    const adverts = await Advert.find(query).sort('-createdAt').limit(20);

    const formatted = adverts.map((ad) => {
      const locString =
        ad.locations && ad.locations.length > 0
          ? ad.locations.map((l) => `${l.region}, ${l.country}`).join('; ')
          : ad.address || 'Nigeria';

      return {
        id: ad.advertId || String(ad._id),
        advertId: ad.advertId,
        image: ad.image || '',
        alt: ad.name,
        title: ad.title,
        message: ad.description,
        ctaLabel: 'Visit Website',
        ctaUrl: ad.website || '#',
        telephone: ad.telephone || '',
        email: ad.email || ad.customerEmail || '',
        website: ad.website || '',
        location: locString,
        views: ad.views || 0,
        clicks: ad.clicks || 0,
        likes: ad.likes || 0,
        reports: ad.reports ? ad.reports.length : 0,
        status: ad.status,
      };
    });

    res.status(200).json({
      success: true,
      adverts: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get adverts belonging to the current user (for user advert dashboard)
 * GET /api/v1/adverts/my-adverts
 */
export const getMyAdverts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { userId, email, status } = req.query;

    const query: any = {};
    if (userId && typeof userId === 'string' && userId.trim()) {
      query.$or = [{ userId: userId.trim() }];
      if (email && typeof email === 'string' && email.trim()) {
        query.$or.push({ customerEmail: email.trim().toLowerCase() });
      }
    } else if (email && typeof email === 'string' && email.trim()) {
      query.customerEmail = email.trim().toLowerCase();
    }

    if (status && status !== 'All') {
      if (status === 'Active') {
        query.status = { $in: ['Active', 'Published', 'Approved'] };
      } else if (status === 'Pending Review' || status === 'Pending') {
        query.status = 'Submitted';
      } else {
        query.status = status;
      }
    }

    const adverts = await Advert.find(query).sort('-createdAt');

    const formatted = adverts.map((ad) => {
      const locString =
        ad.locations && ad.locations.length > 0
          ? ad.locations.map((l) => `${l.region}`).filter(Boolean).join(' and ') || ad.locations[0].country
          : 'Nigeria';

      const countryString =
        ad.locations && ad.locations.length > 0 ? ad.locations[0].country : 'Nigeria';

      // Compute effective start date
      let effectiveStart = ad.startDate;
      if (!effectiveStart && ad.createdAt) {
        effectiveStart = new Date(ad.createdAt).toISOString().split('T')[0];
      } else if (!effectiveStart) {
        effectiveStart = new Date().toISOString().split('T')[0];
      }

      // Compute effective end date
      let effectiveEnd = ad.endDate;
      if (!effectiveEnd && effectiveStart) {
        // Try calculating from locations first
        if (ad.locations && ad.locations.length > 0) {
          const locEnds = ad.locations.map((l: any) => {
            if (l.endDate || l.end) return l.endDate || l.end;
            if ((l.start || l.startDate) && l.days) {
              try {
                const d = new Date((l.start || l.startDate) + 'T00:00:00');
                d.setDate(d.getDate() + Number(l.days) - 1);
                return d.toISOString().split('T')[0];
              } catch {
                return '';
              }
            }
            return '';
          }).filter(Boolean);
          if (locEnds.length > 0) {
            effectiveEnd = locEnds.sort().reverse()[0];
          }
        }

        if (!effectiveEnd) {
          const days = Number(ad.totalDays) || 200;
          try {
            const d = new Date(effectiveStart.includes('T') ? effectiveStart : effectiveStart + 'T00:00:00');
            d.setDate(d.getDate() + days - 1);
            effectiveEnd = d.toISOString().split('T')[0];
          } catch {
            effectiveEnd = '';
          }
        }
      }

      // Compute remaining days
      let remainingText = 'Not started';
      if (effectiveEnd) {
        try {
          const end = new Date(effectiveEnd.includes('T') ? effectiveEnd : effectiveEnd + 'T00:00:00');
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays > 1) {
            remainingText = `${diffDays} days`;
          } else if (diffDays === 1) {
            remainingText = '1 day';
          } else if (diffDays === 0) {
            remainingText = 'Expires today';
          } else {
            remainingText = '0 days (Expired)';
          }
        } catch {
          remainingText = 'Not started';
        }
      }

      let displayStatus: string = ad.status;
      if (ad.status === 'Submitted') displayStatus = 'Pending Review';
      if (ad.status === 'Approved' || ad.status === 'Published') displayStatus = 'Active';

      const formatDateDisplay = (dateStr?: string) => {
        if (!dateStr || dateStr === 'Pending approval') return '';
        try {
          const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
          if (isNaN(d.getTime())) return dateStr;
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch {
          return dateStr;
        }
      };

      return {
        _id: String(ad._id),
        id: ad.advertId || String(ad._id),
        advertId: ad.advertId,
        title: ad.title || ad.name,
        name: ad.name,
        status: displayStatus,
        rawStatus: ad.status,
        amount: `₦${Number(ad.totalCost || 2000).toLocaleString('en-NG')}`,
        image: ad.image || '',
        details: ad.description,
        country: countryString,
        state: locString,
        start: formatDateDisplay(effectiveStart) || 'Pending approval',
        end: formatDateDisplay(effectiveEnd) || 'Pending approval',
        remaining: remainingText,
        impressions: (ad.views || 0).toLocaleString(),
        clicks: (ad.clicks || 0).toLocaleString(),
        likes: (ad.likes || 0).toLocaleString(),
        reports: ad.reports ? String(ad.reports.length) : '0',
        paymentStatus: ad.paymentStatus,
        paymentReference: ad.paymentReference,
        locations: ad.locations,
        totalDays: ad.totalDays,
        createdAt: ad.createdAt,
      };
    });

    res.status(200).json({
      success: true,
      adverts: formatted,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single advert details
 * GET /api/v1/adverts/:id
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
 * Toggle like on an advert
 * POST /api/v1/adverts/:id/like
 */
export const likeAdvert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { userIdentifier = 'guest' } = req.body;
    const isObjectId = mongoose.isValidObjectId(id);

    const advert = await Advert.findOne({
      $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }],
    });

    if (!advert) {
      res.status(404).json({ message: 'Advert not found' });
      return;
    }

    const hasLiked = advert.likedBy.includes(userIdentifier);
    if (hasLiked) {
      advert.likedBy = advert.likedBy.filter((u) => u !== userIdentifier);
      advert.likes = Math.max(0, advert.likes - 1);
    } else {
      advert.likedBy.push(userIdentifier);
      advert.likes += 1;
    }

    await advert.save();

    res.status(200).json({
      success: true,
      likes: advert.likes,
      isLiked: !hasLiked,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track click on an advert
 * POST /api/v1/adverts/:id/click
 */
export const trackClick = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const advert = await Advert.findOneAndUpdate(
      { $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }] },
      { $inc: { clicks: 1 } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      clicks: advert ? advert.clicks : 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Track impression on an advert
 * POST /api/v1/adverts/:id/impression
 */
export const trackImpression = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const isObjectId = mongoose.isValidObjectId(id);

    const advert = await Advert.findOneAndUpdate(
      { $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }] },
      { $inc: { views: 1 } },
      { new: true }
    );

    res.status(200).json({
      success: true,
      views: advert ? advert.views : 1,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Report an advert
 * POST /api/v1/adverts/:id/report
 */
export const reportAdvert = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { reasons, note, reporterEmail } = req.body;

    const isObjectId = mongoose.isValidObjectId(id);
    const advert = await Advert.findOne({
      $or: [...(isObjectId ? [{ _id: id }] : []), { advertId: id }],
    });

    if (!advert) {
      res.status(404).json({ message: 'Advert not found' });
      return;
    }

    const reportId = `REP-ADV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const reasonsArray = Array.isArray(reasons) ? reasons : [reasons || 'Inappropriate content'];

    const reportItem = {
      id: reportId,
      reasons: reasonsArray,
      note: note || '',
      reporterEmail: reporterEmail || '',
      createdAt: new Date(),
    };

    if (!advert.reports) advert.reports = [];
    advert.reports.push(reportItem);
    await advert.save();

    const locString =
      advert.locations && advert.locations.length > 0
        ? advert.locations.map((l: any) => `${l.region}, ${l.country}`).join('; ')
        : advert.address || 'Nigeria';

    // Create entry in central Report collection
    await Report.create({
      reportId,
      itemType: 'advert',
      itemId: advert.advertId || String(advert._id),
      itemTitle: advert.title ? `Advert: "${advert.title}"` : `Advert: ${advert.name}`,
      itemContent: (advert.description || '') + (advert.website ? `\nWebsite: ${advert.website}` : '') + (advert.telephone ? `\nTel: ${advert.telephone}` : ''),
      itemImage: advert.image || '',
      itemAuthor: advert.contactPerson || advert.name || advert.customerName || 'Advertiser',
      itemLocation: locString,
      reporterName: reporterEmail ? reporterEmail.split('@')[0] : 'Community Member',
      reporterEmail: reporterEmail?.trim() || '',
      reasons: reasonsArray,
      note: note?.trim() || '',
      status: 'New',
      adminNotes: [],
    });

    res.status(201).json({
      success: true,
      message: 'Advert report submitted successfully.',
      reportsCount: advert.reports.length,
      reportId,
    });
  } catch (error) {
    next(error);
  }
};
