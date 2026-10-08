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

    // Automatically purge legacy auto-seeded sample profiles from DB
    await ChildProfile.deleteMany({
      userId,
      firstName: { $in: ['Amina', 'Zuri', 'Kofi'] },
    });

    // Clear auto-seeded unadministered vaccine records so users start with 0 records
    await ChildProfile.updateMany(
      { userId, 'immunisationRecords.administeredDate': { $exists: false }, 'immunisationRecords.administeredLocation': { $exists: false } },
      { $set: { immunisationRecords: [] } }
    );

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
      birthWeightKg,
      gestationWeeks,
    } = req.body;

    if (!firstName || !surname || !dob || !sex) {
      res.status(400).json({ success: false, error: 'First name, surname, date of birth, and sex are required' });
      return;
    }

    const initialMeasurements: any[] = [];
    if (birthWeightKg) {
      initialMeasurements.push({
        date: new Date(dob),
        weightKg: Number(birthWeightKg),
        measuredBy: 'Birth Record',
      });
    }

    const child = new ChildProfile({
      userId,
      firstName,
      middleName,
      surname,
      dob: new Date(dob),
      sex,
      relationship: relationship || 'Parent',
      country: country || 'Ghana',
      stateRegion,
      reference,
      placeOfBirth,
      birthWeightKg: birthWeightKg ? Number(birthWeightKg) : undefined,
      gestationWeeks: gestationWeeks ? Number(gestationWeeks) : undefined,
      growthStatus: 'Steady',
      newbornCareNote: `Ensure responsive feeding, track sleep patterns, and maintain warmth for ${firstName}.`,
      growthMeasurements: initialMeasurements,
      immunisationRecords: [],
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

    const child = await ChildProfile.findOneAndUpdate(
      { _id: id, userId },
      { $set: req.body },
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
    const { vaccineName, doseNumber, status, administeredDate, administeredLocation, notes } = req.body;

    if (!vaccineName) {
      res.status(400).json({ success: false, error: 'Vaccine name is required' });
      return;
    }

    const child = await ChildProfile.findOne({ _id: id, userId });
    if (!child) {
      res.status(404).json({ success: false, error: 'Child profile not found' });
      return;
    }

    const existingIndex = child.immunisationRecords.findIndex(
      (v) => v.vaccineName.toLowerCase() === vaccineName.toLowerCase()
    );

    if (existingIndex >= 0) {
      child.immunisationRecords[existingIndex].status = status || 'Completed';
      if (administeredDate) child.immunisationRecords[existingIndex].administeredDate = new Date(administeredDate);
      if (administeredLocation) child.immunisationRecords[existingIndex].administeredLocation = administeredLocation;
      if (notes) child.immunisationRecords[existingIndex].notes = notes;
    } else {
      child.immunisationRecords.push({
        vaccineName,
        doseNumber,
        status: status || 'Completed',
        administeredDate: administeredDate ? new Date(administeredDate) : new Date(),
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
