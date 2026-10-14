import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import ChildProfile from '../../../models/premium/ChildHealth';

/**
 * Calculate human-readable age text from date of birth
 */
function calculateAgeText(dob: Date): string {
  const diffMs = Date.now() - new Date(dob).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 30) {
    return `${Math.max(1, diffDays)} days old`;
  }
  const diffMonths = Math.floor(diffDays / 30.4375);
  if (diffMonths < 24) {
    return `${diffMonths} months old`;
  }
  const diffYears = Math.floor(diffMonths / 12);
  return `${diffYears} years old`;
}

/**
 * Format child profile object with calculated UI helper properties
 */
function formatChildResponse(child: any) {
  const obj = child.toObject ? child.toObject() : child;
  const ageText = calculateAgeText(obj.dob);

  const measurements = obj.growthMeasurements || [];
  const latestMeasurement = measurements.length > 0
    ? measurements[measurements.length - 1]
    : null;

  const weight = latestMeasurement ? `${latestMeasurement.weightKg} kg` : 'Not recorded';
  const length = latestMeasurement && latestMeasurement.lengthCm ? `${latestMeasurement.lengthCm} cm` : 'Not recorded';
  const weightTime = latestMeasurement
    ? new Date(latestMeasurement.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    : 'No logs';

  const vaccines = obj.immunisationRecords || [];
  const dueVaccine = vaccines.find((v: any) => v.status === 'Due now') || vaccines.find((v: any) => v.status === 'Upcoming');

  return {
    ...obj,
    id: obj._id,
    name: obj.firstName,
    fullName: `${obj.firstName} ${obj.middleName ? obj.middleName + ' ' : ''}${obj.surname}`,
    ageText,
    weight,
    length,
    weightTime,
    growthStatus: obj.growthStatus || 'Steady',
    nextVaccine: dueVaccine ? dueVaccine.vaccineName : 'No vaccines due',
    nextVaccineDue: dueVaccine ? dueVaccine.status : 'Up to date',
    nextCareContact: 'Routine Check-up',
    nextCareDue: 'As scheduled',
    hospitalName: obj.hospitalName || obj.placeOfBirth || '',
    birthTime: obj.birthTime || obj.time || '',
    time: obj.time || obj.birthTime || '',
    placeOfBirth: obj.placeOfBirth || obj.hospitalName || '',
    newbornCareNote: obj.newbornCareNote || `Ensure responsive feeding, track sleep patterns, and practice daily tummy time for ${obj.firstName}.`,
    exploreNote: `For ${obj.firstName} now`,
  };
}

/**
 * GET /api/v1/user/premium/child-health
 * List all child profiles for authenticated user
 */
export async function getChildProfiles(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const profiles = await ChildProfile.find({ userId }).sort({ createdAt: -1 });
    const formatted = profiles.map(formatChildResponse);
    res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Error fetching child profiles:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/child-health
 * Create a new child profile
 */
export async function createChildProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const {
      firstName,
      middleName,
      surname,
      dob,
      sex,
      relationship,
      country,
      stateRegion,
      reference,
      placeOfBirth,
      hospitalName,
      birthTime,
      time,
      birthWeightKg,
      gestationWeeks,
      paymentStatus,
      paymentReference,
      paymentAmount,
      paymentCurrency,
    } = req.body;

    if (!firstName || !surname || !dob || !sex) {
      res.status(400).json({ success: false, error: 'First name, surname, date of birth, and sex are required' });
      return;
    }

    const resolvedHospital = (hospitalName || placeOfBirth || '').trim() || undefined;
    const resolvedTime = (birthTime || time || '').trim() || undefined;

    const initialMeasurements: any[] = [];
    if (birthWeightKg) {
      initialMeasurements.push({
        date: new Date(dob),
        weightKg: Number(birthWeightKg),
        measuredBy: 'Birth Record',
      });
    }

    const now = new Date();
    const renewalDate = new Date();
    renewalDate.setFullYear(now.getFullYear() + 1);

    const child = new ChildProfile({
      userId,
      firstName,
      middleName,
      surname,
      dob: new Date(dob),
      sex,
      relationship: relationship || 'Parent',
      country: (country || '').trim() || undefined,
      stateRegion,
      reference: reference || ('HCA-CH-' + Math.floor(10000 + Math.random() * 90000)),
      placeOfBirth: resolvedHospital,
      hospitalName: resolvedHospital,
      birthTime: resolvedTime,
      time: resolvedTime,
      birthWeightKg: birthWeightKg ? Number(birthWeightKg) : undefined,
      gestationWeeks: gestationWeeks ? Number(gestationWeeks) : undefined,
      growthStatus: 'Steady',
      newbornCareNote: `Ensure responsive feeding, track sleep patterns, and maintain warmth for ${firstName}.`,
      growthMeasurements: initialMeasurements,
      immunisationRecords: [],
      paymentStatus: paymentStatus || 'Paid',
      paymentReference: paymentReference || `PAY-CH-${Date.now().toString().slice(-6)}`,
      paymentAmount: paymentAmount !== undefined ? Number(paymentAmount) : 6000,
      paymentCurrency: paymentCurrency || 'NGN',
      paymentDate: now,
      subscriptionRenewalDate: renewalDate,
    });

    await child.save();
    res.status(201).json({ success: true, data: formatChildResponse(child) });
  } catch (error: any) {
    console.error('Error creating child profile:', error);
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * GET /api/v1/user/premium/child-health/:id
 * Get single child profile by ID
 */
export async function getChildProfileById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;

    const child = await ChildProfile.findOne({ _id: id, userId });
    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    res.json({ success: true, data: formatChildResponse(child) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * PUT /api/v1/user/premium/child-health/:id
 * Update child profile
 */
export async function updateChildProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;

    const updates = { ...req.body };
    if (updates.hospitalName && !updates.placeOfBirth) updates.placeOfBirth = updates.hospitalName;
    if (updates.placeOfBirth && !updates.hospitalName) updates.hospitalName = updates.placeOfBirth;
    if (updates.birthTime && !updates.time) updates.time = updates.birthTime;
    if (updates.time && !updates.birthTime) updates.birthTime = updates.time;

    const child = await ChildProfile.findOneAndUpdate(
      { _id: id, userId },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    res.json({ success: true, data: formatChildResponse(child) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * DELETE /api/v1/user/premium/child-health/:id
 * Delete child profile
 */
export async function deleteChildProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;

    const deleted = await ChildProfile.findOneAndDelete({ _id: id, userId });
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    res.json({ success: true, message: 'Child profile deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/child-health/:id/growth
 * Add a growth measurement (weight, height, head circumference)
 */
export async function addGrowthMeasurement(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    const { weightKg, lengthCm, headCircumferenceCm, date, notes } = req.body;

    if (!weightKg) {
      res.status(400).json({ success: false, error: 'Weight in kg is required' });
      return;
    }

    const child = await ChildProfile.findOne({ _id: id, userId });
    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    child.growthMeasurements.push({
      date: date ? new Date(date) : new Date(),
      weightKg: Number(weightKg),
      lengthCm: lengthCm ? Number(lengthCm) : undefined,
      headCircumferenceCm: headCircumferenceCm ? Number(headCircumferenceCm) : undefined,
      notes,
      measuredBy: 'Parent',
    });

    await child.save();
    res.json({ success: true, data: formatChildResponse(child) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/child-health/:id/immunisation
 * Add or update an immunisation record
 */
export async function addImmunisationRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    const {
      vaccineName,
      doseNumber,
      status,
      dueDate,
      administeredDate,
      administeredLocation,
      notes,
      recordId,
    } = req.body;

    if (!vaccineName || !vaccineName.trim()) {
      res.status(400).json({ success: false, error: 'Vaccine name is required' });
      return;
    }

    const child = await ChildProfile.findOne({ _id: id, userId });
    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    // Check if updating an existing record by recordId or vaccineName
    let existingRecord: any = null;
    if (recordId) {
      existingRecord = (child.immunisationRecords as any).find(
        (v: any) => v._id?.toString() === recordId
      );
    }

    if (!existingRecord) {
      existingRecord = (child.immunisationRecords as any).find(
        (v: any) => v.vaccineName?.toLowerCase() === vaccineName.trim().toLowerCase()
      );
    }

    if (existingRecord) {
      existingRecord.vaccineName = vaccineName.trim();
      if (doseNumber !== undefined) existingRecord.doseNumber = doseNumber;
      if (status !== undefined) existingRecord.status = status;
      if (dueDate !== undefined) existingRecord.dueDate = dueDate ? new Date(dueDate) : undefined;
      if (administeredDate !== undefined) {
        existingRecord.administeredDate = administeredDate ? new Date(administeredDate) : undefined;
      } else if (status === 'Completed' && !existingRecord.administeredDate) {
        existingRecord.administeredDate = new Date();
      }
      if (administeredLocation !== undefined) existingRecord.administeredLocation = administeredLocation;
      if (notes !== undefined) existingRecord.notes = notes;
    } else {
      (child.immunisationRecords as any).push({
        vaccineName: vaccineName.trim(),
        doseNumber,
        status: status || 'Upcoming',
        dueDate: dueDate ? new Date(dueDate) : undefined,
        administeredDate: administeredDate
          ? new Date(administeredDate)
          : status === 'Completed'
          ? new Date()
          : undefined,
        administeredLocation,
        notes,
      });
    }

    await child.save();
    res.json({ success: true, data: formatChildResponse(child) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * PUT /api/v1/user/premium/child-health/:id/immunisation/:vaccineId
 * Update an existing immunisation record by its ID or name
 */
export async function updateImmunisationRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id, vaccineId } = req.params;
    const {
      vaccineName,
      doseNumber,
      status,
      dueDate,
      administeredDate,
      administeredLocation,
      notes,
    } = req.body;

    const child = await ChildProfile.findOne({ _id: id, userId });
    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    const decodedId = decodeURIComponent(vaccineId);
    const record: any = (child.immunisationRecords as any).find(
      (v: any) => v._id?.toString() === decodedId || v.vaccineName?.toLowerCase() === decodedId.toLowerCase()
    );

    if (!record) {
      res.status(404).json({ success: false, error: 'Immunisation record not found' });
      return;
    }

    if (vaccineName && vaccineName.trim()) record.vaccineName = vaccineName.trim();
    if (doseNumber !== undefined) record.doseNumber = doseNumber;
    if (status !== undefined) record.status = status;
    if (dueDate !== undefined) record.dueDate = dueDate ? new Date(dueDate) : undefined;
    if (administeredDate !== undefined) {
      record.administeredDate = administeredDate ? new Date(administeredDate) : undefined;
    } else if (status === 'Completed' && !record.administeredDate) {
      record.administeredDate = new Date();
    }
    if (administeredLocation !== undefined) record.administeredLocation = administeredLocation;
    if (notes !== undefined) record.notes = notes;

    await child.save();
    res.json({ success: true, data: formatChildResponse(child) });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}

/**
 * DELETE /api/v1/user/premium/child-health/:id/immunisation/:vaccineId
 * Delete an immunisation record by its ID or name
 */
export async function deleteImmunisationRecord(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id, vaccineId } = req.params;

    const child = await ChildProfile.findOne({ _id: id, userId });
    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    const decodedId = decodeURIComponent(vaccineId);
    const initialCount = child.immunisationRecords.length;

    child.immunisationRecords = (child.immunisationRecords as any).filter(
      (v: any) => v._id?.toString() !== decodedId && v.vaccineName?.toLowerCase() !== decodedId.toLowerCase()
    );

    if (child.immunisationRecords.length === initialCount) {
      res.status(404).json({ success: false, error: 'Immunisation record not found' });
      return;
    }

    await child.save();
    res.json({
      success: true,
      message: 'Immunisation record deleted successfully',
      data: formatChildResponse(child),
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
}
