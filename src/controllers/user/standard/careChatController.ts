import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { CareChatShare } from '../../../models/standard/CareChatShare';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { Types } from 'mongoose';

// List all sharing packages in history
export const getCareChatHistory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    await ensureStandardUserSeed(userId, req.user);
    const shares = await CareChatShare.find({ userId: new Types.ObjectId(userId.toString()) }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: shares,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving sharing history', error: (error as Error).message });
  }
};

// Create a new point-in-time sharing package
export const createCareChatShare = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const { reports, name, channel } = req.body;
    const shareId = `CC-${Date.now()}`;
    const dateFormatted =
      new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ', ' +
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newShare = await CareChatShare.create({
      userId: new Types.ObjectId(userId.toString()),
      shareId,
      name: name || (reports?.length > 1 ? `HealthCentreApp Shared Reports - ${dateFormatted}.pdf` : (reports?.[0]?.title || 'Shared Health Report.pdf')),
      reports: reports || [],
      status: 'Share Initiated',
      channel: channel || 'WhatsApp',
      date: dateFormatted,
      confirmed: false,
    });

    res.status(201).json({
      success: true,
      message: 'CareChat sharing package prepared',
      data: newShare,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating share package', error: (error as Error).message });
  }
};

// Confirm whether user sent report on WhatsApp
export const confirmCareChatShare = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { shareId } = req.params;
    const { confirmed } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const share = await CareChatShare.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()), shareId },
      {
        $set: {
          confirmed: Boolean(confirmed),
          status: confirmed ? 'Shared' : 'Share Initiated',
        },
      },
      { new: true }
    );

    if (!share) {
      res.status(404).json({ message: 'Share record not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: confirmed ? 'Report marked as Shared' : 'Report status updated',
      data: share,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error confirming share', error: (error as Error).message });
  }
};
