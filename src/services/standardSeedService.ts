import { CareRecord } from '../models/standard/CareRecord';
import { User } from '../models/User';
import { Types } from 'mongoose';

// In-memory cache of verified user IDs to avoid redundant DB queries on every API hit
const verifiedUserSeeds = new Set<string>();

/**
 * Ensures the authenticated user has an initialized, clean CareRecord.
 * Runs only once per user session / when CareRecord does not exist yet.
 */
export async function ensureStandardUserSeed(userId: Types.ObjectId | string, userObj?: any): Promise<void> {
  if (!userId) return;
  const uidStr = userId.toString();

  // Instant 0ms return if user was already verified in memory
  if (verifiedUserSeeds.has(uidStr)) {
    return;
  }

  const uid = new Types.ObjectId(uidStr);

  // Fast check if CareRecord already exists for this user
  const exists = await CareRecord.exists({ userId: uid });
  if (exists) {
    verifiedUserSeeds.add(uidStr);
    return;
  }

  // Fetch actual user details from DB if available for initial creation only
  let userDoc: any = null;
  try {
    userDoc = await User.findById(uid).lean();
  } catch (err) {
    // fallback
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
  const realMemberId = userDoc?.memberId || userObj?.memberId || `HC-${uidStr.slice(-5).toUpperCase()}`;
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

  try {
    await CareRecord.create({
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
  } catch (err: any) {
    // If concurrent insert happened, ignore duplicate key error
    if (err?.code !== 11000) {
      console.error('Error creating initial CareRecord:', err);
    }
  }

  verifiedUserSeeds.add(uidStr);
}
