import { Request, Response, NextFunction } from 'express';
import { User } from '../../models/User';
import { Advert } from '../../models/Advert';
import { Voucher } from '../../models/Voucher';
import { Payment } from '../../models/Payment';
import { News } from '../../models/News';
import { Report } from '../../models/Report';
import { ContactInquiry } from '../../models/ContactInquiry';

/**
 * Get dynamic, live metrics and recent activity for Admin Dashboard
 * GET /api/v1/admin/dashboard
 */
export const getAdminDashboardMetrics = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Parallel fetch counts directly from live MongoDB collections
    const [
      totalUsers,
      usersThisMonth,
      activeAdverts,
      submittedAdverts,
      activeVouchers,
      purchasedVouchers,
      totalPayments,
      reportsRequiringAttention,
      reportsLast24h,
      publishedNews,
      draftNews,
      pendingContactEnquiries,
      recentUsers,
      recentVouchers,
      recentNews,
      recentAdverts,
      recentReports
    ] = await Promise.all([
      // Users
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      // Adverts (Live or Published or Active)
      Advert.countDocuments({ status: { $in: ['Live', 'Published', 'Active'] } }),
      Advert.countDocuments({ status: { $in: ['Submitted', 'Pending Review', 'Pending Approval', 'PendingApproval'] } }),
      // Vouchers
      Voucher.countDocuments({ status: { $in: ['Available', 'Unredeemed', 'Active'] } }),
      Voucher.countDocuments({ source: 'Purchased' }),
      // Payments
      Payment.countDocuments(),
      // Reports
      Report.countDocuments({ status: { $in: ['New', 'Reviewing', 'Open', 'Pending'] } }),
      Report.countDocuments({ createdAt: { $gte: last24h } }),
      // News
      News.countDocuments({ status: 'Published' }),
      News.countDocuments({ status: 'Draft' }),
      // Contact Enquiries
      ContactInquiry.countDocuments({ status: { $in: ['New', 'In Progress', 'Awaiting User'] } }),
      // Recent activities from DB
      User.find().sort({ createdAt: -1 }).limit(4).select('name email role createdAt'),
      Voucher.find().sort({ createdAt: -1 }).limit(4).select('code name offer purchaserName source createdAt'),
      News.find({ status: 'Published' }).sort({ createdAt: -1 }).limit(4).select('title summary createdAt'),
      Advert.find().sort({ createdAt: -1 }).limit(4).select('name title customerName status createdAt'),
      Report.find().sort({ createdAt: -1 }).limit(4).select('reportId itemType itemTitle reporterName createdAt status')
    ]);

    // Build real chronological recent activity feed
    const activities: Array<{
      id: string;
      title: string;
      description: string;
      time: string;
      timestamp: Date;
      type: 'user' | 'voucher' | 'news' | 'advert' | 'report';
    }> = [];

    (recentUsers as any[]).forEach(u => {
      activities.push({
        id: `user-${u._id}`,
        title: 'New Free user registered',
        description: `${u.name || u.email} joined HealthCentreApp.`,
        time: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
        timestamp: u.createdAt ? new Date(u.createdAt) : new Date(),
        type: 'user'
      });
    });

    (recentVouchers as any[]).forEach(v => {
      activities.push({
        id: `voucher-${v._id}`,
        title: v.source === 'Purchased' ? 'Voucher purchased' : 'Voucher issued',
        description: `${v.name || v.offer || v.code} was ${v.source === 'Purchased' ? 'purchased' : 'created'} (${v.code}).`,
        time: v.createdAt ? new Date(v.createdAt).toISOString() : new Date().toISOString(),
        timestamp: v.createdAt ? new Date(v.createdAt) : new Date(),
        type: 'voucher'
      });
    });

    (recentNews as any[]).forEach(n => {
      activities.push({
        id: `news-${n._id}`,
        title: 'News published',
        description: `${n.title}`,
        time: n.createdAt ? new Date(n.createdAt).toISOString() : new Date().toISOString(),
        timestamp: n.createdAt ? new Date(n.createdAt) : new Date(),
        type: 'news'
      });
    });

    (recentAdverts as any[]).forEach(a => {
      activities.push({
        id: `advert-${a._id}`,
        title: `Advert ${a.status ? String(a.status).toLowerCase() : 'submitted'}`,
        description: `"${a.name || a.title || 'Campaign'}" by ${a.customerName || 'Customer'}.`,
        time: a.createdAt ? new Date(a.createdAt).toISOString() : new Date().toISOString(),
        timestamp: a.createdAt ? new Date(a.createdAt) : new Date(),
        type: 'advert'
      });
    });

    (recentReports as any[]).forEach(r => {
      activities.push({
        id: `report-${r._id}`,
        title: 'Report submitted',
        description: `${r.itemType ? String(r.itemType).toUpperCase() : 'ITEM'} report: "${r.itemTitle || 'Content'}" (${r.status || 'New'})`,
        time: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
        timestamp: r.createdAt ? new Date(r.createdAt) : new Date(),
        type: 'report'
      });
    });

    // Sort by timestamp descending and take top 6
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const recentActivities = activities.slice(0, 6);

    res.status(200).json({
      success: true,
      data: {
        metrics: {
          registeredUsers: {
            total: totalUsers,
            addedThisMonth: usersThisMonth,
          },
          activeAdverts: {
            total: activeAdverts,
            requiringReview: submittedAdverts,
          },
          activeVouchers: {
            total: activeVouchers,
            purchased: purchasedVouchers,
          },
          payments: {
            total: totalPayments,
            subtitle: totalPayments > 0 ? `${totalPayments} completed transactions` : '0 transactions recorded',
          },
          reports: {
            total: reportsRequiringAttention,
            receivedLast24h: reportsLast24h,
          },
          publishedNews: {
            total: publishedNews,
            drafts: draftNews,
          },
        },
        requiresAttention: {
          submittedAdvertsCount: submittedAdverts,
          newReportsCount: reportsRequiringAttention,
          contactEnquiriesCount: pendingContactEnquiries,
        },
        recentActivity: recentActivities,
      },
    });
  } catch (error) {
    next(error);
  }
};
