import { Request, Response } from 'express';
import { CareSecureGrant } from '../../models/standard/CareSecureGrant';
import { User } from '../../models/User';
import { CareRecord } from '../../models/standard/CareRecord';
import { Medication } from '../../models/standard/Medication';
import { SymptomReport } from '../../models/standard/SymptomReport';
import { LabTest } from '../../models/standard/LabTest';

/**
 * Validate CareSecure grant token and return permitted patient records
 * Endpoint: GET /api/public/caresecure/access/:token
 */
export const getSharedCareSecureAccess = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    if (!token) {
      res.status(400).json({ success: false, message: 'Access token required' });
      return;
    }

    const grant = await CareSecureGrant.findOne({ grantToken: token });
    if (!grant) {
      res.status(404).json({ success: false, message: 'Invalid or expired access token' });
      return;
    }

    // Check Revoked status
    if (grant.status === 'Revoked') {
      res.status(403).json({
        success: false,
        message: 'This CareSecure access grant has been revoked by the patient.',
        status: 'Revoked'
      });
      return;
    }

    // Check Token Expiry
    if (grant.grantTokenExpiresAt && new Date() > grant.grantTokenExpiresAt) {
      if (grant.status !== 'Expired') {
        grant.status = 'Expired';
        await grant.save();
      }
      res.status(403).json({
        success: false,
        message: 'This CareSecure access link has expired.',
        status: 'Expired'
      });
      return;
    }

    // Update status from Pending Verification to Active on first access
    if (grant.status === 'Pending Verification') {
      grant.status = 'Active';
      grant.auditLogs.unshift({
        title: 'Portal Accessed',
        detail: `${new Date().toLocaleString()} · ${grant.name} (Recipient) · Opened shared access portal for first time`,
        timestamp: new Date().toISOString(),
        performedBy: grant.name
      } as any);
      await grant.save();
    }

    // Fetch Grantor Patient user info
    const patient = await User.findById(grant.userId).select('name email memberId phone gender bloodGroup dateOfBirth').lean();
    if (!patient) {
      res.status(404).json({ success: false, message: 'Patient account not found' });
      return;
    }

    // Build permissions map (Filtering strictly for Standard features: CareRecord, Medication, MySymptoms, MyLabTests, CareChat)
    const allowedStandardFeatures = ['CareRecord', 'Medication', 'MySymptoms', 'MyLabTests', 'CareChat'];
    const permissionsMap: Record<string, string[]> = {};
    const filteredPermissions = (grant.featurePermissions || [])
      .filter(fp => allowedStandardFeatures.includes(fp.featureName))
      .map(fp => {
        const rights = [...(fp.rights || [])];
        if (fp.featureName === 'CareChat' && ['Support', 'Full'].includes(grant.accessLevel) && !rights.some(r => /share/i.test(r))) {
          rights.push('Share');
        }
        permissionsMap[fp.featureName] = rights;
        return {
          featureName: fp.featureName,
          rights
        };
      });

    const records: Record<string, any> = {};

    // 1. CareRecord
    if (permissionsMap['CareRecord'] && permissionsMap['CareRecord'].length > 0) {
      const careRecord = await CareRecord.findOne({ userId: grant.userId }).lean();
      records.careRecord = careRecord ? {
        patientDetails: careRecord.patientDetails,
        conditions: careRecord.conditions || [],
        allergies: careRecord.allergies || [],
        immunisations: careRecord.immunisations || [],
        bloodPressureLogs: careRecord.bloodPressureLogs || [],
        weightHeightLogs: careRecord.weightHeightLogs || [],
        documents: careRecord.documents || [],
      } : null;
    }

    // 2. Medication
    if (permissionsMap['Medication'] && permissionsMap['Medication'].length > 0) {
      const medications = await Medication.find({ userId: grant.userId }).sort({ createdAt: -1 }).lean();
      records.medications = medications;
    }

    // 3. MySymptoms
    if (permissionsMap['MySymptoms'] && permissionsMap['MySymptoms'].length > 0) {
      const symptoms = await SymptomReport.find({ userId: grant.userId }).sort({ createdAt: -1 }).lean();
      records.symptoms = symptoms;
    }

    // 4. MyLabTests
    if (permissionsMap['MyLabTests'] && permissionsMap['MyLabTests'].length > 0) {
      const labTests = await LabTest.find({ userId: grant.userId }).sort({ testDate: -1 }).lean();
      records.labTests = labTests;
    }

    res.status(200).json({
      success: true,
      data: {
        grant: {
          accessId: grant.accessId,
          name: grant.name,
          type: grant.type,
          organisation: grant.organisation,
          purpose: grant.purpose,
          accessLevel: grant.accessLevel,
          grantedAt: grant.grantedAt,
          expires: grant.expires,
          status: grant.status,
          featurePermissions: filteredPermissions
        },
        patient: {
          name: patient.name || 'Patient',
          memberId: patient.memberId || (patient as any)._id,
          gender: (patient as any).gender || 'Not specified',
          bloodGroup: (patient as any).bloodGroup || 'Not recorded',
          dateOfBirth: (patient as any).dateOfBirth || ''
        },
        records
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load shared health records', error: (error as Error).message });
  }
};

/**
 * Add or Update a health entry on behalf of patient if 'Add / Update' right is granted
 * Endpoint: POST /api/public/caresecure/access/:token/entry
 */
export const addSharedCareSecureEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;
    const { featureType, payload } = req.body;

    if (!token || !featureType || !payload) {
      res.status(400).json({ success: false, message: 'Token, featureType and payload are required' });
      return;
    }

    const grant = await CareSecureGrant.findOne({ grantToken: token });
    if (!grant || grant.status === 'Revoked' || grant.status === 'Expired') {
      res.status(403).json({ success: false, message: 'Access link is invalid, expired or revoked' });
      return;
    }

    // Verify Add / Update permission for feature
    const targetPerm = (grant.featurePermissions || []).find(fp => fp.featureName === featureType);
    const hasAddRight = targetPerm && targetPerm.rights.includes('Add / Update');

    if (!hasAddRight) {
      res.status(403).json({
        success: false,
        message: `You do not have 'Add / Update' permission for ${featureType}.`
      });
      return;
    }

    let createdEntry = null;

    if (featureType === 'MySymptoms') {
      if (payload.entryId || payload._id) {
        const targetId = payload.entryId || payload._id;
        delete payload.entryId;
        createdEntry = await SymptomReport.findOneAndUpdate(
          { _id: targetId, userId: grant.userId },
          { $set: payload },
          { new: true }
        );
      } else {
        const reportId = `SR-${Date.now().toString().slice(-6)}`;
        const symptomTitle = payload.symptomName || payload.title || 'Symptom Entry';
        const rDate = payload.onset || payload.reportDate || new Date().toISOString().slice(0, 10);

        createdEntry = await SymptomReport.create({
          userId: grant.userId,
          reportId,
          title: symptomTitle,
          reportDate: rDate,
          symptomName: symptomTitle,
          onsetDate: rDate,
          severity: payload.severity || 'Moderate',
          location: payload.bodyLocation || payload.location || '',
          description: payload.notes || payload.description || `Logged by ${grant.name} (Delegate)`,
          notes: payload.notes || `Logged by ${grant.name} (Delegate)`,
          status: 'Treating',
          sharingState: 'Not Shared',
          isPrivate: false
        });
      }
    } else if (featureType === 'Medication') {
      if (payload.action === 'logDose') {
        const targetId = payload.entryId || payload._id;
        const now = new Date();
        const timeStr = `Today · ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        const recordTimeStr = payload.status === 'Missed Dose'
          ? 'No record time'
          : `Recorded ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const newLog = {
          time: timeStr,
          recordTime: recordTimeStr,
          status: payload.status || 'Taken',
          notes: payload.notes || `Logged by ${grant.name} (Delegate)`
        };

        createdEntry = await Medication.findOneAndUpdate(
          { _id: targetId, userId: grant.userId },
          { $push: { recentHistory: { $each: [newLog], $position: 0 } } },
          { new: true }
        );
      } else if (payload.entryId || payload._id) {
        const targetId = payload.entryId || payload._id;
        delete payload.entryId;
        createdEntry = await Medication.findOneAndUpdate(
          { _id: targetId, userId: grant.userId },
          {
            $set: {
              name: payload.medicineName || payload.name,
              strength: payload.strength || '',
              form: payload.form || 'Tablet',
              dose: payload.dose || payload.dosage || '1 Tablet',
              frequency: payload.frequency || 'Daily',
              route: payload.route || 'Oral',
              foodInstruction: payload.foodInstruction || 'With food',
              startDate: payload.startDate || '',
              endDate: payload.endDate || '',
              reason: payload.reason || '',
              prescriber: payload.prescribedBy || payload.prescriber || '',
              instructions: payload.instructions || '',
              notes: payload.notes || ''
            }
          },
          { new: true }
        );
      } else {
        const medicationId = `MED-${Date.now().toString().slice(-6)}`;
        const medName = payload.medicineName || payload.name || 'Prescription';

        createdEntry = await Medication.create({
          userId: grant.userId,
          medicationId,
          name: medName,
          strength: payload.strength || '',
          form: payload.form || 'Tablet',
          dose: payload.dose || payload.dosage || '1 Tablet',
          frequency: payload.frequency || 'Daily',
          route: payload.route || 'Oral',
          foodInstruction: payload.foodInstruction || 'With food',
          startDate: payload.startDate || new Date().toISOString().slice(0, 10),
          endDate: payload.endDate || '',
          reason: payload.reason || '',
          prescriber: payload.prescribedBy || payload.prescriber || `${grant.name} (Delegate)`,
          instructions: payload.instructions || '',
          notes: payload.notes || '',
          status: 'Current',
          isPrivate: false,
          reminder: { enabled: false, times: [], days: [] },
          recentHistory: [],
          attachments: []
        });
      }
    } else if (featureType === 'MyLabTests') {
      if (payload.entryId || payload._id) {
        const targetId = payload.entryId || payload._id;
        delete payload.entryId;
        createdEntry = await LabTest.findOneAndUpdate(
          { _id: targetId, userId: grant.userId },
          { $set: payload },
          { new: true }
        );
      } else {
        const labReportId = `LAB-${Date.now().toString().slice(-6)}`;
        const rName = payload.reportName || payload.testName || 'Lab Diagnostic Report';
        const tDate = payload.testDate || new Date().toISOString().slice(0, 10);

        createdEntry = await LabTest.create({
          userId: grant.userId,
          labReportId,
          reportName: rName,
          testDate: tDate,
          laboratoryProvider: payload.laboratoryProvider || `${grant.name} (Delegate)`,
          status: 'Completed',
          isPrivate: false,
          approximateDate: false,
          results: payload.results || [
            {
              testName: rName,
              value: payload.value || 'Normal',
              unit: payload.unit || '',
              referenceRange: payload.referenceRange || '',
              resultDate: tDate,
              status: 'Normal'
            }
          ],
          attachments: []
        });
      }
    } else if (featureType === 'CareRecord') {
      let careRecord = await CareRecord.findOne({ userId: grant.userId });
      if (!careRecord) {
        careRecord = await CareRecord.create({ userId: grant.userId });
      }

      if (payload.weightKg || payload.heightCm) {
        const w = Number(payload.weightKg || 70);
        const h = Number(payload.heightCm || 170);
        const bmi = Number((w / Math.pow(h / 100, 2)).toFixed(1));
        const newWh = {
          date: new Date().toISOString().slice(0, 10),
          weightKg: w,
          heightCm: h,
          bmi,
          category: bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : 'Overweight',
          notes: payload.notes || `Logged by ${grant.name} (Delegate)`,
          privacy: 'Standard'
        };
        await CareRecord.updateOne(
          { _id: careRecord._id },
          { $push: { weightHeightLogs: { $each: [newWh], $position: 0 } } }
        );
      } else if (payload.conditionName || payload.name) {
        const newCondition = {
          name: payload.conditionName || payload.name || 'General Condition',
          status: payload.status || 'Current',
          recorded: new Date().toISOString().slice(0, 10),
          date: payload.diagnosedDate || new Date().toISOString().slice(0, 10),
          approx: false,
          notes: payload.notes || `Logged by ${grant.name} (Delegate)`,
          privacy: 'Standard',
          attachments: []
        };
        await CareRecord.updateOne(
          { _id: careRecord._id },
          { $push: { conditions: { $each: [newCondition], $position: 0 } } }
        );
      } else if (payload.systolic && payload.diastolic) {
        const newBp = {
          date: new Date().toISOString().slice(0, 10),
          time: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          systolic: Number(payload.systolic),
          diastolic: Number(payload.diastolic),
          pulse: payload.pulse ? Number(payload.pulse) : undefined,
          category: 'Recorded',
          notes: `Logged by ${grant.name} (Delegate)`,
          privacy: 'Standard'
        };
        await CareRecord.updateOne(
          { _id: careRecord._id },
          { $push: { bloodPressureLogs: { $each: [newBp], $position: 0 } } }
        );
      }
      createdEntry = { success: true };
    }

    // Add audit log
    grant.auditLogs.unshift({
      title: 'Record Updated',
      detail: `${new Date().toLocaleString()} · ${grant.name} (Delegate) · Logged/Updated ${featureType} entry`,
      timestamp: new Date().toISOString(),
      performedBy: grant.name
    } as any);
    await grant.save();

    res.status(201).json({
      success: true,
      message: `${featureType} record updated successfully`,
      data: createdEntry
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add shared entry', error: (error as Error).message });
  }
};
