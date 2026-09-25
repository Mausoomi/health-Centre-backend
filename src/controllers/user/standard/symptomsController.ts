import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { SymptomReport } from '../../../models/standard/SymptomReport';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { Types } from 'mongoose';

// List all symptom reports
export const getSymptomReports = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const uid = new Types.ObjectId(userId.toString());
    await ensureStandardUserSeed(userId, req.user);
    const reports = await SymptomReport.find({ userId: uid }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: reports,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving symptom reports', error: (error as Error).message });
  }
};

// Get single report by reportId or _id
export const getSymptomReportById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { reportId: id }];
    } else {
      query.reportId = id;
    }

    const report = await SymptomReport.findOne(query).lean();
    if (!report) {
      res.status(404).json({ message: 'Symptom report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving symptom report', error: (error as Error).message });
  }
};

// Create new symptom report
export const createSymptomReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const count = await SymptomReport.countDocuments();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const reportId = req.body.reportId || `SCR-${dateStr}-${String(count + 1).padStart(4, '0')}`;

    const newReport = await SymptomReport.create({
      ...req.body,
      userId: new Types.ObjectId(userId.toString()),
      reportId,
    });

    res.status(201).json({
      success: true,
      message: 'Symptom report created successfully',
      data: newReport,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating symptom report', error: (error as Error).message });
  }
};

// Update symptom report
export const updateSymptomReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { reportId: id }];
    } else {
      query.reportId = id;
    }

    const updated = await SymptomReport.findOneAndUpdate(query, { $set: req.body }, { new: true });

    if (!updated) {
      res.status(404).json({ message: 'Symptom report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Symptom report updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating symptom report', error: (error as Error).message });
  }
};

// Delete symptom report
export const deleteSymptomReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { reportId: id }];
    } else {
      query.reportId = id;
    }

    const deleted = await SymptomReport.findOneAndDelete(query);
    if (!deleted) {
      res.status(404).json({ message: 'Symptom report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Symptom report deleted successfully',
      data: deleted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting symptom report', error: (error as Error).message });
  }
};
