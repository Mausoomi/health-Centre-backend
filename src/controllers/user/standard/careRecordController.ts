import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { CareRecord } from '../../../models/standard/CareRecord';
import { User } from '../../../models/User';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { Types } from 'mongoose';

// Get or initialize the user's CareRecord
export const getCareRecord = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    await ensureStandardUserSeed(userId, req.user);
    const careRecord = await CareRecord.findOne({ userId: new Types.ObjectId(userId.toString()) });

    res.status(200).json({
      success: true,
      data: careRecord,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving CareRecord', error: (error as Error).message });
  }
};

// Update Patient Details
export const updatePatientDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    await ensureStandardUserSeed(userId, req.user);
    const existing = await CareRecord.findOne({ userId: new Types.ObjectId(userId.toString()) });
    const existingPd = existing?.patientDetails || ({} as any);

    // Compute unified bloodGroup from blood and rh
    let computedBloodGroup = req.body.bloodGroup || existingPd.bloodGroup || '';
    if (req.body.blood !== undefined) {
      const bloodVal = req.body.blood || '';
      const rhVal = req.body.rh || '';
      let rhSym = '';
      if (rhVal.includes('+') || rhVal === '+') rhSym = '+';
      else if (rhVal.includes('-') || rhVal === '-') rhSym = '-';
      computedBloodGroup = bloodVal ? `${bloodVal}${rhSym}` : '';
    }

    // Preserve core account identity if not explicitly passed
    const mergedPd = {
      ...existingPd,
      ...req.body,
      bloodGroup: computedBloodGroup,
      name: existingPd.name || req.body.name || req.user?.name || '',
      email: existingPd.email || req.body.email || req.user?.email || '',
      memberId: existingPd.memberId || req.body.memberId || req.user?.memberId || '',
    };

    const updated = await CareRecord.findOneAndUpdate(
      { userId: new Types.ObjectId(userId.toString()) },
      { $set: { patientDetails: mergedPd } },
      { new: true }
    );

    // Two-way synchronization with User document
    try {
      const userUpdate: any = {};
      if (mergedPd.bloodGroup !== undefined) userUpdate.bloodGroup = mergedPd.bloodGroup;
      if (mergedPd.country !== undefined) userUpdate.country = mergedPd.country;
      if (mergedPd.region !== undefined) userUpdate.state = mergedPd.region;
      if (mergedPd.state !== undefined) userUpdate.state = mergedPd.state;
      if (mergedPd.address !== undefined) userUpdate.address = mergedPd.address;
      if (mergedPd.marital !== undefined) userUpdate.marital = mergedPd.marital;
      if (mergedPd.religion !== undefined) userUpdate.religion = mergedPd.religion;
      if (mergedPd.dob !== undefined) userUpdate.dateOfBirth = mergedPd.dob;
      if (mergedPd.dateOfBirth !== undefined) userUpdate.dateOfBirth = mergedPd.dateOfBirth;
      if (mergedPd.gender !== undefined) userUpdate.gender = mergedPd.gender;
      if (mergedPd.sex !== undefined) userUpdate.gender = mergedPd.sex;
      if (mergedPd.genotype !== undefined) userUpdate.genotype = mergedPd.genotype;

      if (Object.keys(userUpdate).length > 0) {
        await User.findByIdAndUpdate(new Types.ObjectId(userId.toString()), { $set: userUpdate });
      }
    } catch (uSyncErr) {
      console.error('User sync error in updatePatientDetails:', uSyncErr);
    }

    res.status(200).json({
      success: true,
      message: 'Patient details updated successfully',
      data: updated?.patientDetails,
      bloodGroup: computedBloodGroup,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating patient details', error: (error as Error).message });
  }
};

// Generic helper for Subsection CRUD
export const addSubsectionItem = (sectionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      await ensureStandardUserSeed(userId, req.user);
      const newItem = { ...req.body };
      if (sectionKey === 'disabilities') {
        newItem.title = newItem.title || newItem.name || '';
        newItem.name = newItem.name || newItem.title || '';
      }

      const record = await CareRecord.findOneAndUpdate(
        { userId: new Types.ObjectId(userId.toString()) },
        { $push: { [sectionKey]: { $each: [newItem], $position: 0 } } },
        { new: true }
      );

      res.status(201).json({
        success: true,
        message: `Item added to ${sectionKey} successfully`,
        data: (record as any)?.[sectionKey],
      });
    } catch (error) {
      res.status(500).json({ message: `Error adding to ${sectionKey}`, error: (error as Error).message });
    }
  };
};

export const updateSubsectionItem = (sectionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      const { itemId } = req.params;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const uid = new Types.ObjectId(userId.toString());
      const record = await CareRecord.findOne({ userId: uid });
      if (!record) {
        res.status(404).json({ message: 'CareRecord not found' });
        return;
      }

      const list = (record as any)[sectionKey] || [];
      const itemIndex = list.findIndex((item: any) => item._id?.toString() === itemId || item.id?.toString() === itemId);

      if (itemIndex === -1) {
        res.status(404).json({ message: `Item not found in ${sectionKey}` });
        return;
      }

      const updateData = { ...req.body };
      if (sectionKey === 'disabilities') {
        updateData.title = updateData.title || updateData.name || '';
        updateData.name = updateData.name || updateData.title || '';
      }

      Object.assign(list[itemIndex], updateData);
      record.markModified(sectionKey);
      await record.save();

      res.status(200).json({
        success: true,
        message: `Item updated in ${sectionKey} successfully`,
        data: list,
      });
    } catch (error) {
      res.status(500).json({ message: `Error updating in ${sectionKey}`, error: (error as Error).message });
    }
  };
};

export const deleteSubsectionItem = (sectionKey: string) => {
  return async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = req.user?.userId || req.user?.id || req.user?._id;
      const { itemId } = req.params;
      if (!userId) {
        res.status(401).json({ message: 'User not authenticated' });
        return;
      }

      const uid = new Types.ObjectId(userId.toString());
      const isObjectId = Types.ObjectId.isValid(itemId);
      const pullFilter: any = isObjectId
        ? { $or: [{ _id: new Types.ObjectId(itemId) }, { _id: itemId }, { id: itemId }] }
        : { $or: [{ _id: itemId }, { id: itemId }] };

      const updated = await CareRecord.findOneAndUpdate(
        { userId: uid },
        { $pull: { [sectionKey]: pullFilter } },
        { new: true }
      );

      if (updated) {
        res.status(200).json({
          success: true,
          message: `Item removed from ${sectionKey} successfully`,
          data: (updated as any)?.[sectionKey],
        });
        return;
      }

      // Fallback
      const record = await CareRecord.findOne({ userId: uid });
      if (!record) {
        res.status(404).json({ message: 'CareRecord not found' });
        return;
      }

      const list = (record as any)[sectionKey] || [];
      const filtered = list.filter((item: any) => {
        const idStr = (item._id || item.id || '').toString();
        return idStr !== itemId;
      });

      (record as any)[sectionKey] = filtered;
      record.markModified(sectionKey);
      await record.save();

      res.status(200).json({
        success: true,
        message: `Item removed from ${sectionKey} successfully`,
        data: (record as any)?.[sectionKey],
      });
    } catch (error) {
      res.status(500).json({ message: `Error deleting from ${sectionKey}`, error: (error as Error).message });
    }
  };
};

// Summary Endpoint for CareRecord Summary Page
export const getCareRecordSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    await ensureStandardUserSeed(userId, req.user);
    const careRecord = await CareRecord.findOne({ userId: new Types.ObjectId(userId.toString()) });

    const getLogTimestamp = (item: any) => {
      if (!item) return 0;
      if (item.createdAt) {
        const t = new Date(item.createdAt).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      const idStr = item._id?.toString?.() || String(item._id || '');
      if (idStr.length === 24) {
        const t = parseInt(idStr.substring(0, 8), 16) * 1000;
        if (!isNaN(t) && t > 0) return t;
      }
      if (item.date) {
        const t = new Date(item.date).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return 0;
    };

    const sortedWH = [...(careRecord?.weightHeightLogs || [])].sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a));
    const sortedBP = [...(careRecord?.bloodPressureLogs || [])].sort((a, b) => getLogTimestamp(b) - getLogTimestamp(a));

    const summary = {
      patientDetails: careRecord?.patientDetails || {},
      patient: careRecord?.patientDetails || {},
      weightHeight: sortedWH[0] || {},
      bloodPressure: sortedBP[0] || {},
      conditions: careRecord?.conditions || [],
      allergies: careRecord?.allergies || [],
      immunisations: careRecord?.immunisations || [],
      operations: careRecord?.operations || [],
      documents: careRecord?.documents || [],
      hasPrivateRecords: careRecord?.patientDetails?.isPrivate || false,
      generatedAt: new Date().toLocaleString('en-GB'),
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving summary', error: (error as Error).message });
  }
};
