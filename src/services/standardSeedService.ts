import { CareRecord } from '../models/standard/CareRecord';
import { SymptomReport } from '../models/standard/SymptomReport';
import { Medication } from '../models/standard/Medication';
import { LabTest } from '../models/standard/LabTest';
import { CareChatShare } from '../models/standard/CareChatShare';
import { CareSecureGrant } from '../models/standard/CareSecureGrant';
import { User } from '../models/User';
import { Types } from 'mongoose';

/**
 * Ensures the authenticated user has an initialized, clean CareRecord.
 * Removes any legacy hardcoded mock/seeded entries so all data is strictly dynamic.
 */
export async function ensureStandardUserSeed(userId: Types.ObjectId | string, userObj?: any) {
  const uid = new Types.ObjectId(userId.toString());

  // Fetch actual user details from DB if available
  let userDoc: any = null;
  try {
    userDoc = await User.findById(uid).lean();
  } catch (err) {
    // fallback to provided userObj
  }

  const realName = userDoc?.name || userObj?.name || '';
  const realEmail = userDoc?.email || userObj?.email || '';
  const realPhone = userDoc?.phone || userObj?.phone || '';
  const realGender = userDoc?.gender || userObj?.gender || '';
  const realDob = userDoc?.dateOfBirth && userDoc.dateOfBirth !== '1988-05-14' && userDoc.dateOfBirth !== '14 May 1988' ? userDoc.dateOfBirth : (userObj?.dateOfBirth || '');
  const realCountry = userDoc?.country || userObj?.country || '';
  const realState = userDoc?.state || userObj?.state || '';
  const realAddress = (userDoc?.address && !userDoc.address.includes('Kensington')) ? userDoc.address : (userObj?.address || '');
  const realBloodGroup = userDoc?.bloodGroup || userObj?.bloodGroup || '';
  const realGenotype = userDoc?.genotype || userObj?.genotype || '';
  const realAvatar = userDoc?.avatar || userObj?.avatar || '';
  const realMemberId = userDoc?.memberId || userObj?.memberId || `HC-${uid.toString().slice(-5).toUpperCase()}`;
  const realReferralCode = `HCA-${realMemberId.replace(/[^a-zA-Z0-9]/g, '')}`;

  let bloodPart = '';
  let rhPart = '';
  if (realBloodGroup) {
    if (realBloodGroup.endsWith('+')) {
      bloodPart = realBloodGroup.slice(0, -1);
      rhPart = '+';
    } else if (realBloodGroup.endsWith('-')) {
      bloodPart = realBloodGroup.slice(0, -1);
      rhPart = '-';
    } else {
      bloodPart = realBloodGroup;
    }
  }

  // 1. Ensure CareRecord exists with real user data and NO fake static data
  let careRecord = await CareRecord.findOne({ userId: uid });
  if (!careRecord) {
    careRecord = await CareRecord.create({
      userId: uid,
      patientDetails: {
        name: realName,
        memberId: realMemberId,
        nhsNumber: '',
        dateOfBirth: realDob,
        dob: realDob,
        gender: realGender,
        sex: realGender,
        bloodGroup: realBloodGroup,
        blood: bloodPart,
        rh: rhPart,
        genotype: realGenotype,
        phone: realPhone,
        email: realEmail,
        address: realAddress,
        marital: '',
        country: realCountry,
        region: realState,
        religion: '',
        contactName: '',
        relationship: '',
        contactPhone: '',
        referralCode: realReferralCode,
        isPrivate: false,
        notes: '',
        children: [],
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: '',
        },
        gpDetails: {
          practiceName: '',
          doctorName: '',
          phone: '',
          address: '',
        },
        plan: userDoc?.plan || userObj?.plan || 'Standard Digital Health',
        planExpiry: '',
        avatar: realAvatar,
      },
      conditions: [],
      familyHistory: [],
      socialHabits: [],
      disabilities: [],
      allergies: [],
      immunisations: [],
      operations: [],
      hospitalAdmissions: [],
      bloodPressureLogs: [],
      weightHeightLogs: [],
      documents: [],
    });
  } else {
    // If careRecord already exists, ensure patientDetails is initialized and dynamic identity is always kept in sync
    let needsUpdate = false;
    if (!careRecord.patientDetails) {
      careRecord.patientDetails = {} as any;
      needsUpdate = true;
    }
    const pd = careRecord.patientDetails as any;

    // Dynamic sync of user account identity
    if (realName && pd.name !== realName) {
      pd.name = realName;
      needsUpdate = true;
    }
    if (realEmail && pd.email !== realEmail) {
      pd.email = realEmail;
      needsUpdate = true;
    }
    if (realMemberId && (!pd.memberId || pd.memberId !== realMemberId)) {
      pd.memberId = realMemberId;
      pd.referralCode = realReferralCode;
      needsUpdate = true;
    }
    if (realPhone && !pd.phone) {
      pd.phone = realPhone;
      needsUpdate = true;
    }
    if (realAvatar && !pd.avatar) {
      pd.avatar = realAvatar;
      needsUpdate = true;
    }
    if (realDob && !pd.dob) {
      pd.dob = realDob;
      pd.dateOfBirth = realDob;
      needsUpdate = true;
    }
    if (realGender && !pd.gender) {
      pd.gender = realGender;
      pd.sex = realGender;
      needsUpdate = true;
    }
    if (realAddress && !pd.address) {
      pd.address = realAddress;
      needsUpdate = true;
    }
    if (realCountry && !pd.country) {
      pd.country = realCountry;
      needsUpdate = true;
    }
    if (realState && !pd.region) {
      pd.region = realState;
      needsUpdate = true;
    }
    if (realBloodGroup && (pd.bloodGroup !== realBloodGroup || !pd.blood)) {
      pd.bloodGroup = realBloodGroup;
      pd.blood = bloodPart;
      pd.rh = rhPart;
      needsUpdate = true;
    }
    if (realGenotype && (pd.genotype !== realGenotype || !pd.genotype)) {
      pd.genotype = realGenotype;
      needsUpdate = true;
    }
    if (!pd.referralCode && realReferralCode) {
      pd.referralCode = realReferralCode;
      needsUpdate = true;
    }

    // Clean up any legacy seeded dummy data from existing records
    if (
      pd.name === 'Alex Morgan' ||
      pd.contactName === 'David Morgan' ||
      pd.dob === '14 May 1988' ||
      pd.dob === '1988-05-14' ||
      pd.dateOfBirth === '1988-05-14' ||
      pd.address === '14 St. Jude Crescent, Kensington, London, W8 4QN'
    ) {
      if (pd.name === 'Alex Morgan') pd.name = realName;
      if (pd.contactName === 'David Morgan') pd.contactName = '';
      if (pd.dob === '14 May 1988' || pd.dob === '1988-05-14') pd.dob = realDob;
      if (pd.dateOfBirth === '1988-05-14') pd.dateOfBirth = realDob;
      if (pd.address === '14 St. Jude Crescent, Kensington, London, W8 4QN') pd.address = realAddress;
      needsUpdate = true;
    }

    // Clean up seeded conditions if they match mock list
    if (
      careRecord.conditions &&
      careRecord.conditions.some((c) => c.name === 'Asthma' || c.name === 'Type 2 diabetes')
    ) {
      careRecord.conditions = [];
      needsUpdate = true;
    }

    // Clean up seeded family history
    if (
      careRecord.familyHistory &&
      careRecord.familyHistory.some((f) => f.condition === 'Cardiovascular Disease')
    ) {
      careRecord.familyHistory = [];
      needsUpdate = true;
    }

    // Clean up seeded social habits
    if (
      careRecord.socialHabits &&
      careRecord.socialHabits.some((s) => s.details?.includes('2008-2015'))
    ) {
      careRecord.socialHabits = [];
      needsUpdate = true;
    }

    // Clean up seeded disabilities
    if (
      careRecord.disabilities &&
      careRecord.disabilities.some((d) => d.title?.includes('Hearing Impairment'))
    ) {
      careRecord.disabilities = [];
      needsUpdate = true;
    }

    // Clean up seeded allergies
    if (
      careRecord.allergies &&
      careRecord.allergies.some((a) => a.name?.includes('Penicillin'))
    ) {
      careRecord.allergies = [];
      needsUpdate = true;
    }

    // Clean up seeded immunisations
    if (
      careRecord.immunisations &&
      careRecord.immunisations.some((i) => i.name?.includes('Moderna') || i.batchNumber === 'MOD-99420-UK')
    ) {
      careRecord.immunisations = [];
      needsUpdate = true;
    }

    // Clean up seeded operations
    if (
      careRecord.operations &&
      careRecord.operations.some((o) => o.name?.includes('Appendicectomy'))
    ) {
      careRecord.operations = [];
      needsUpdate = true;
    }

    // Clean up seeded hospital admissions
    if (
      careRecord.hospitalAdmissions &&
      careRecord.hospitalAdmissions.some((h) => h.hospital?.includes('St Mary’s Hospital'))
    ) {
      careRecord.hospitalAdmissions = [];
      needsUpdate = true;
    }

    // Clean up seeded blood pressure logs
    if (
      careRecord.bloodPressureLogs &&
      careRecord.bloodPressureLogs.some((b) => b.device === 'Omron Platinum Upper Arm' || (b.systolic === 128 && b.diastolic === 82))
    ) {
      careRecord.bloodPressureLogs = [];
      needsUpdate = true;
    }

    // Clean up seeded weight & height logs
    if (
      careRecord.weightHeightLogs &&
      careRecord.weightHeightLogs.some((w) => w.weightKg === 74 && w.heightCm === 175)
    ) {
      careRecord.weightHeightLogs = [];
      needsUpdate = true;
    }

    // Clean up seeded documents
    if (
      careRecord.documents &&
      careRecord.documents.some((d) => d.fileName === 'Cardiology_Consultation_Letter_2026.pdf')
    ) {
      careRecord.documents = [];
      needsUpdate = true;
    }

    if (needsUpdate) {
      await careRecord.save();
    }
  }

  // 2. Clean up any legacy seeded mock items from other standard collections only if matching specific legacy mock titles
  await Promise.all([
    SymptomReport.deleteMany({
      userId: uid,
      reportId: { $in: ['SCR-2026-0818-0042', 'SCR-2026-0802-0019'] },
      title: { $in: ['Chest Tightness & Cough', 'Mild Headache & Fatigue'] }
    }),
    Medication.deleteMany({
      userId: uid,
      name: 'LegacySeededDummyMedication'
    }),
    LabTest.deleteMany({
      userId: uid,
      name: 'LegacySeededDummyLab'
    }),
    CareChatShare.deleteMany({
      userId: uid,
      shareId: 'CC-190826-1420',
      recipientName: 'Dr. Michael Adebayo'
    }),
    CareSecureGrant.deleteMany({
      userId: uid,
      accessId: 'CS-260825-0845',
      trustedContactName: 'Sarah Jenkins'
    }),
  ]);
}
