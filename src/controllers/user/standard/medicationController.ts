import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { Medication } from '../../../models/standard/Medication';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { Types } from 'mongoose';

// List all medications for user
export const getMedications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const uid = new Types.ObjectId(userId.toString());
    await ensureStandardUserSeed(userId, req.user);
    const medications = await Medication.find({ userId: uid }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: medications,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving medications', error: (error as Error).message });
  }
};

// Get single medication
export const getMedicationById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { medicationId: id }];
    } else {
      query.medicationId = id;
    }

    const med = await Medication.findOne(query).lean();
    if (!med) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: med,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving medication', error: (error as Error).message });
  }
};

// Create new medication
export const createMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const count = await Medication.countDocuments({ userId: new Types.ObjectId(userId.toString()) });
    const medicationId = req.body.medicationId || `MED-${Date.now().toString().slice(-6)}-${count + 1}`;

    const newMed = await Medication.create({
      ...req.body,
      userId: new Types.ObjectId(userId.toString()),
      medicationId,
    });

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: newMed,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating medication', error: (error as Error).message });
  }
};

// Update medication
export const updateMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { medicationId: id }];
    } else {
      query.medicationId = id;
    }

    const updated = await Medication.findOneAndUpdate(query, { $set: req.body }, { new: true });
    if (!updated) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Medication updated successfully',
      data: updated,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating medication', error: (error as Error).message });
  }
};

// Delete medication
export const deleteMedication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { medicationId: id }];
    } else {
      query.medicationId = id;
    }

    const deleted = await Medication.findOneAndDelete(query);
    if (!deleted) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Medication deleted successfully',
      data: deleted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting medication', error: (error as Error).message });
  }
};

// Record a Dose (Taken, Late Dose, Missed Dose)
export const logDoseAction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    const { status, time, notes } = req.body;

    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { medicationId: id }];
    } else {
      query.medicationId = id;
    }

    const med = await Medication.findOne(query);
    if (!med) {
      res.status(404).json({ message: 'Medication not found' });
      return;
    }

    const newLog = {
      time: time || `Today · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      recordTime: `Recorded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      status: status || 'Taken',
      notes: notes || '',
    };

    med.recentHistory.unshift(newLog as any);
    await med.save();

    res.status(200).json({
      success: true,
      message: `Dose recorded as ${status || 'Taken'}`,
      data: med,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error recording dose', error: (error as Error).message });
  }
};
