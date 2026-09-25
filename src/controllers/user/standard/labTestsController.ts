import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { LabTest } from '../../../models/standard/LabTest';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { Types } from 'mongoose';

// List all lab tests
export const getLabTests = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const uid = new Types.ObjectId(userId.toString());
    await ensureStandardUserSeed(userId, req.user);
    const labTests = await LabTest.find({ userId: uid }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: labTests,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving lab tests', error: (error as Error).message });
  }
};

// Get single lab test
export const getLabTestById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { labReportId: id }];
    } else {
      query.labReportId = id;
    }

    const test = await LabTest.findOne(query).lean();
    if (!test) {
      res.status(404).json({ message: 'Lab report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving lab test', error: (error as Error).message });
  }
};

// Create new lab test
export const createLabTest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const count = await LabTest.countDocuments({ userId: new Types.ObjectId(userId.toString()) });
    const labReportId = req.body.labReportId || `LR-${Date.now().toString().slice(-6)}-${count + 1}`;

    const newLabTest = await LabTest.create({
      ...req.body,
      userId: new Types.ObjectId(userId.toString()),
      labReportId,
    });

    res.status(201).json({
      success: true,
      message: 'Lab report created successfully',
      data: newLabTest,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating lab report', error: (error as Error).message });
  }
};

// Update lab test
export const updateLabTest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { labReportId: id }];
    } else {
      query.labReportId = id;
    }

    const updated = await LabTest.findOneAndUpdate(query, { $set: req.body }, { new: true });
    if (!updated) {
      res.status(404).json({ message: 'Lab report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Lab report updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating lab report', error: (error as Error).message });
  }
};

// Delete lab test
export const deleteLabTest = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { labReportId: id }];
    } else {
      query.labReportId = id;
    }

    const deleted = await LabTest.findOneAndDelete(query);
    if (!deleted) {
      res.status(404).json({ message: 'Lab report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Lab report deleted successfully',
      data: deleted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting lab report', error: (error as Error).message });
  }
};
