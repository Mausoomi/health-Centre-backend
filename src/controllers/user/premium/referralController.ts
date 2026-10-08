import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import ReferralProgramme from '../../../models/premium/ReferralProgramme';
import { User } from '../../../models/User';

// Helper to extract user ID from authenticated request
const extractUserId = (req: AuthenticatedRequest): string | undefined => {
  return req.user?.userId || req.user?.id || req.user?._id;
};

// Helper to generate a unique referral code
const generateReferralCode = (userName?: string): string => {
  const prefix = userName
    ? userName.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '')
    : 'HEALTH';
  const cleanPrefix = prefix.length > 0 ? prefix : 'HEALTH';
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${cleanPrefix}-HEALTH-${randomDigits}`;
};

/**
 * Core helper function to credit a referral partner when a new citizen registers or uses a referral link.
 */
export const recordReferralCredit = async (referralCode: string, newUserName: string): Promise<boolean> => {
  if (!referralCode || !referralCode.trim()) return false;
  try {
    const cleanCode = referralCode.trim().toUpperCase();
    let referrer = await ReferralProgramme.findOne({ referralCode: cleanCode });

    // If referral programme record does not exist yet for this code, try finding matching user
    if (!referrer) {
      const codePrefix = cleanCode.split('-')[0];
      const matchingUser = await User.findOne({
        $or: [
          { name: new RegExp(`^${codePrefix}`, 'i') },
          { firstName: new RegExp(`^${codePrefix}`, 'i') },
        ],
      });

      if (matchingUser) {
        referrer = new ReferralProgramme({
          userId: matchingUser._id,
          accountHolderName: matchingUser.name || 'Referral Partner',
          bankName: 'Equity Bank',
          accountNumber: '',
          bankConfirmed: true,
          termsAccepted: true,
          isJoined: true,
          referralCode: cleanCode,
          commissionRate: 25,
          referralCount: 0,
          activePremiumCount: 0,
          totalEarnings: 0,
          availablePayout: 0,
          subscriptionEarnings: 0,
          renewalEarnings: 0,
          advertRevenue: 0,
          referralsList: [],
        });
      }
    }

    if (!referrer) return false;

    const citizenNameTrim = newUserName && newUserName.trim() ? newUserName.trim() : 'New Premium Member';

    // Check if citizen was already added to prevent duplicate commissions for the same name
    const alreadyExists = referrer.referralsList.some(
      (item) => item.citizenName.toLowerCase() === citizenNameTrim.toLowerCase()
    );

    if (!alreadyExists) {
      const commissionAmount = 6250; // 25% of ₦25,000 Premium plan
      referrer.referralCount = (referrer.referralCount || 0) + 1;
      referrer.activePremiumCount = (referrer.activePremiumCount || 0) + 1;
      referrer.subscriptionEarnings = (referrer.subscriptionEarnings || 0) + commissionAmount;
      referrer.availablePayout = (referrer.availablePayout || 0) + commissionAmount;
      referrer.totalEarnings = (referrer.totalEarnings || 0) + commissionAmount;
      if (referrer.cdhaProgress) {
        referrer.cdhaProgress.capacityCurrent = (referrer.cdhaProgress.capacityCurrent || 0) + 1;
      }

      referrer.referralsList.unshift({
        citizenName: citizenNameTrim,
        registrationDate: new Date(),
        plan: 'Premium',
        status: 'Active',
        commissionEarned: commissionAmount,
      });

      await referrer.save();
      console.log(`[Referral] Successfully credited ${cleanCode} for citizen: ${citizenNameTrim}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error recording referral credit:', err);
    return false;
  }
};

/**
 * GET /api/v1/user/premium/referrals
 * Retrieve the logged-in user's referral programme profile.
 */
export const getReferralProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. User token missing.' });
      return;
    }

    let referral = await ReferralProgramme.findOne({ userId });

    // Fetch user details for name if referral doesn't exist yet
    let userName = 'Health Member';
    const userDoc = await User.findById(userId).select('name firstName lastName email');
    if (userDoc) {
      userName = (userDoc as any).name || `${(userDoc as any).firstName || ''} ${(userDoc as any).lastName || ''}`.trim() || 'Health Member';
    }

    // Auto-create referral profile for logged-in user if not existing
    if (!referral) {
      const newCode = generateReferralCode(userName);
      referral = new ReferralProgramme({
        userId,
        accountHolderName: userName,
        bankName: 'Equity Bank',
        accountNumber: '',
        bankConfirmed: true,
        termsAccepted: true,
        isJoined: true,
        referralCode: newCode,
        commissionRate: 25,
        referralCount: 0,
        activePremiumCount: 0,
        totalEarnings: 0,
        availablePayout: 0,
        subscriptionEarnings: 0,
        renewalEarnings: 0,
        advertRevenue: 0,
        referralsList: [],
      });
      await referral.save();
    }

    res.status(200).json({
      success: true,
      data: referral,
    });
  } catch (error: any) {
    console.error('Error fetching referral profile:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error fetching referral profile' });
  }
};

/**
 * POST /api/v1/user/premium/referrals/join
 * Join the Referral Programme by submitting bank details.
 */
export const joinReferralProgramme = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. User token missing.' });
      return;
    }

    const { bankName, accountNumber, bankConfirmed, termsAccepted, accountHolderName } = req.body;

    if (!bankName || !accountNumber) {
      res.status(400).json({ success: false, message: 'Bank name and account number are required.' });
      return;
    }

    if (!bankConfirmed || !termsAccepted) {
      res.status(400).json({ success: false, message: 'You must confirm your bank details and accept Terms & Conditions.' });
      return;
    }

    let userDoc = await User.findById(userId).select('name firstName lastName');
    const resolvedName = accountHolderName || (userDoc ? (userDoc as any).name || `${(userDoc as any).firstName || ''} ${(userDoc as any).lastName || ''}`.trim() : 'Health Member');

    let referral = await ReferralProgramme.findOne({ userId });

    if (!referral) {
      const newCode = generateReferralCode(resolvedName);
      referral = new ReferralProgramme({
        userId,
        accountHolderName: resolvedName,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        bankConfirmed: Boolean(bankConfirmed),
        termsAccepted: Boolean(termsAccepted),
        isJoined: true,
        referralCode: newCode,
        commissionRate: 25,
        referralCount: 0,
        activePremiumCount: 0,
        totalEarnings: 0,
        availablePayout: 0,
        subscriptionEarnings: 0,
        renewalEarnings: 0,
        advertRevenue: 0,
        referralsList: [],
      });
    } else {
      referral.accountHolderName = resolvedName;
      referral.bankName = bankName.trim();
      referral.accountNumber = accountNumber.trim();
      referral.bankConfirmed = Boolean(bankConfirmed);
      referral.termsAccepted = Boolean(termsAccepted);
      referral.isJoined = true;
    }

    await referral.save();

    res.status(200).json({
      success: true,
      message: 'Successfully joined the Referral Programme!',
      data: referral,
    });
  } catch (error: any) {
    console.error('Error joining referral programme:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error joining referral programme' });
  }
};

/**
 * PUT /api/v1/user/premium/referrals/bank-details
 * Update bank account details for active referral partner.
 */
export const updateBankDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      res.status(401).json({ success: false, message: 'Unauthorized. User token missing.' });
      return;
    }

    const { bankName, accountNumber, accountHolderName } = req.body;

    if (!bankName || !accountNumber) {
      res.status(400).json({ success: false, message: 'Bank name and account number are required.' });
      return;
    }

    const referral = await ReferralProgramme.findOne({ userId });
    if (!referral) {
      res.status(404).json({ success: false, message: 'Referral profile not found. Please join first.' });
      return;
    }

    if (accountHolderName) referral.accountHolderName = accountHolderName.trim();
    referral.bankName = bankName.trim();
    referral.accountNumber = accountNumber.trim();

    await referral.save();

    res.status(200).json({
      success: true,
      message: 'Bank details updated successfully!',
      data: referral,
    });
  } catch (error: any) {
    console.error('Error updating bank details:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error updating bank details' });
  }
};

/**
 * POST /api/v1/user/premium/referrals/claim
 * Claim/record a referral attribution using referral code.
 */
export const claimReferral = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { referralCode, citizenName } = req.body;
    const userId = extractUserId(req);
    let resolvedName = citizenName;

    if (!resolvedName && userId) {
      const userDoc = await User.findById(userId).select('name firstName lastName');
      if (userDoc) {
        resolvedName = (userDoc as any).name || `${(userDoc as any).firstName || ''} ${(userDoc as any).lastName || ''}`.trim();
      }
    }

    if (!referralCode) {
      res.status(400).json({ success: false, message: 'Referral code is required.' });
      return;
    }

    const credited = await recordReferralCredit(referralCode, resolvedName || 'New Premium Citizen');

    res.status(200).json({
      success: true,
      credited,
      message: credited ? 'Referral credited successfully!' : 'Referral already recorded or code invalid.',
    });
  } catch (error: any) {
    console.error('Error claiming referral:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error claiming referral' });
  }
};
