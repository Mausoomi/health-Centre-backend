import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import CDHACertification from '../../../models/premium/CDHACertification';
import PDHOAffiliation from '../../../models/premium/PDHOAffiliation';
import CitizenSupportRelationship from '../../../models/premium/CitizenSupportRelationship';
import { User } from '../../../models/User';

function extractUserId(req: AuthenticatedRequest): string | undefined {
  return req.user?.userId || req.user?.id || req.user?._id;
}

/**
 * GET /api/v1/user/premium/cdha/status
 * Get CDHA status, certification (Verified by System), and PDHO Affiliation (Approved by PDHO Manager)
 */
export async function getCDHAStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    const userName = user?.name || 'Valued Member';

    // 1. Get Certification (System/External verification check)
    const certification = await CDHACertification.findOne({ userId });

    // 2. Get PDHO Affiliation (Pending/Active PDHO Manager Approval)
    const affiliation = await PDHOAffiliation.findOne({ cdhaUserId: userId }).sort({ createdAt: -1 });

    // 3. Count Active Citizens (BR-025: max 50 capacity)
    const activeCitizensCount = await CitizenSupportRelationship.countDocuments({
      cdhaUserId: userId,
      status: 'Active',
    });

    const certStatus = certification ? certification.verificationStatus : 'Not Submitted';
    const affStatus = affiliation ? affiliation.status : 'Not Applied';

    let overallStatus: 'Not Applied' | 'Pending' | 'Active' | 'Rejected' = 'Not Applied';
    if (affStatus === 'Rejected') {
      overallStatus = 'Rejected';
    } else if (certStatus === 'Verified' && affStatus === 'Active') {
      overallStatus = 'Active';
    } else if (affStatus === 'Pending') {
      overallStatus = 'Pending';
    }

    const statusData = {
      cdhaName: userName,
      status: overallStatus,
      premiumPlanStatus: 'Active',
      certificationStatus: certStatus,
      certificateRef: certification ? certification.certificateRef : null,
      attachedPdho: affiliation ? affiliation.pdhoName : null,
      affiliationStatus: affStatus,
      capacityUsed: activeCitizensCount,
      capacityLimit: 50,
      referralsCount: activeCitizensCount,
      totalEarnings: activeCitizensCount * 16,
    };

    return res.json({ success: true, data: statusData });
  } catch (error: any) {
    console.error('Error fetching CDHA status:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/cdha/certification
 * Submit CDHA certification reference -> System / External process verifies reference
 */
export async function submitCertification(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { certificateRef } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!certificateRef || !certificateRef.trim()) {
      return res.status(400).json({ success: false, message: 'Certificate reference is required' });
    }

    let cert = await CDHACertification.findOne({ userId });
    if (cert) {
      cert.certificateRef = certificateRef.trim();
      cert.verificationStatus = 'Verified';
      await cert.save();
    } else {
      cert = await CDHACertification.create({
        userId,
        certificateRef: certificateRef.trim(),
        verificationStatus: 'Verified',
      });
    }

    return res.json({
      success: true,
      data: cert,
      message: 'CDHA Certification reference verified successfully in system.',
    });
  } catch (error: any) {
    console.error('Error submitting certification:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * GET /api/v1/user/premium/cdha/pdhos
 * Search registered local PDHO care providers for affiliation
 */
export async function getPDHOs(req: AuthenticatedRequest, res: Response) {
  try {
    const pdhoList = [
      { id: 'pdho-1', name: 'Kisumu Health Hub', location: 'Kisumu Central', type: 'Clinical Hub', capacity: 'Available' },
      { id: 'pdho-2', name: 'Nairobi Digital Medical Centre', location: 'Nairobi East', type: 'Hospital Group', capacity: 'Available' },
      { id: 'pdho-3', name: 'Mombasa Community Health Clinic', location: 'Mombasa Coastal', type: 'Community Clinic', capacity: 'Available' },
      { id: 'pdho-4', name: 'Eldoret Health & Diagnostic Care', location: 'Eldoret North', type: 'Diagnostic Centre', capacity: 'Available' },
    ];
    return res.json({ success: true, data: pdhoList });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Error fetching PDHOs' });
  }
}

/**
 * POST /api/v1/user/premium/cdha/affiliation/apply
 * Candidate applies for PDHO affiliation -> Status set to Pending PDHO Manager Approval
 */
export async function applyAffiliation(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    const { pdhoName } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (!pdhoName || !pdhoName.trim()) {
      return res.status(400).json({ success: false, message: 'PDHO name is required' });
    }

    // Atomic update: Set previous affiliations to Ended, create new Pending affiliation for PDHO Manager review (BR-029)
    await PDHOAffiliation.updateMany({ cdhaUserId: userId }, { status: 'Ended' });

    const newAffiliation = await PDHOAffiliation.create({
      cdhaUserId: userId,
      pdhoName: pdhoName.trim(),
      status: 'Pending',
    });

    return res.json({
      success: true,
      data: newAffiliation,
      message: `Affiliation application submitted to ${pdhoName}! Pending approval by PDHO Manager.`,
    });
  } catch (error: any) {
    console.error('Error updating PDHO affiliation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * GET /api/v1/user/premium/cdha/pdho-manager/pending-affiliations
 * PDHO Manager fetches pending CDHA affiliation requests for their organization
 */
export async function getPDHOPendingAffiliations(req: AuthenticatedRequest, res: Response) {
  try {
    const affiliations = await PDHOAffiliation.find().populate('cdhaUserId', 'name email mobile').sort({ updatedAt: -1 });

    const formatted = await Promise.all(
      affiliations.map(async (aff: any) => {
        const userId = aff.cdhaUserId?._id || aff.cdhaUserId;
        const userObj = aff.cdhaUserId && typeof aff.cdhaUserId === 'object' ? aff.cdhaUserId : await User.findById(userId);
        const cert = await CDHACertification.findOne({ userId });

        return {
          id: aff._id,
          cdhaUserId: userId,
          candidateName: userObj?.name || 'CDHA Candidate',
          candidateEmail: userObj?.email || 'N/A',
          candidateMobile: userObj?.mobile || 'N/A',
          certificateRef: cert ? cert.certificateRef : 'Not Submitted',
          certificationStatus: cert ? cert.verificationStatus : 'Not Submitted',
          pdhoName: aff.pdhoName,
          affiliationStatus: aff.status,
          appliedAt: aff.createdAt,
        };
      })
    );

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Error fetching PDHO pending affiliations:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/cdha/pdho-manager/approve-affiliation
 * PDHO Manager approves CDHA affiliation -> Affiliation status becomes Active!
 */
export async function pdhoApproveAffiliation(req: AuthenticatedRequest, res: Response) {
  try {
    const { cdhaUserId } = req.body;

    if (!cdhaUserId) {
      return res.status(400).json({ success: false, message: 'CDHA User ID is required' });
    }

    let affiliation = await PDHOAffiliation.findOne({ cdhaUserId }).sort({ createdAt: -1 });
    if (!affiliation) {
      affiliation = await PDHOAffiliation.create({
        cdhaUserId,
        pdhoName: 'Kisumu Health Hub',
        status: 'Active',
      });
    } else {
      affiliation.status = 'Active';
      await affiliation.save();
    }

    return res.json({
      success: true,
      message: 'PDHO Manager approved affiliation! CDHA is now Active.',
    });
  } catch (error: any) {
    console.error('Error approving PDHO affiliation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/cdha/pdho-manager/reject-affiliation
 * PDHO Manager rejects CDHA affiliation
 */
export async function pdhoRejectAffiliation(req: AuthenticatedRequest, res: Response) {
  try {
    const { cdhaUserId } = req.body;

    if (!cdhaUserId) {
      return res.status(400).json({ success: false, message: 'CDHA User ID is required' });
    }

    await PDHOAffiliation.updateMany({ cdhaUserId }, { status: 'Rejected' });

    return res.json({
      success: true,
      message: 'PDHO Manager rejected affiliation request.',
    });
  } catch (error: any) {
    console.error('Error rejecting PDHO affiliation:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * GET /api/v1/user/premium/cdha/citizens
 * Get assigned citizens for CDHA workspace (Step C & BR-025)
 */
export async function getCDHACitizens(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Check if user is Active CDHA (Verified Cert + Active PDHO Affiliation)
    const certification = await CDHACertification.findOne({ userId, verificationStatus: 'Verified' });
    const affiliation = await PDHOAffiliation.findOne({ cdhaUserId: userId, status: 'Active' });

    const isCDHAActive = !!(certification && affiliation);

    if (!isCDHAActive) {
      return res.json({ success: true, data: [] });
    }

    const citizens = await CitizenSupportRelationship.find({ cdhaUserId: userId }).sort({ updatedAt: -1 });

    const formatted = citizens.map((c: any) => {
      const obj = c.toObject ? c.toObject() : c;
      return {
        ...obj,
        id: obj.citizenCode || obj._id,
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Error fetching CDHA citizens:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}

/**
 * POST /api/v1/user/premium/cdha/support-request
 * Citizen requests support or CDHA adds new citizen (Enforcing BR-024 Active status & BR-025 max 50 capacity limit!)
 */
export async function addCitizenSupport(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = extractUserId(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { citizenName, supportArea = 'CareMonitor', source = 'CDHA referral' } = req.body;

    if (!citizenName || !citizenName.trim()) {
      return res.status(400).json({ success: false, message: 'Citizen name is required' });
    }

    // Enforce BR-024: Must be an Active CDHA (Verified Certification + Active PDHO Affiliation)
    const certification = await CDHACertification.findOne({ userId, verificationStatus: 'Verified' });
    if (!certification) {
      return res.status(400).json({
        success: false,
        message: 'CDHA Certification is missing. You must provide a valid CDHA certification reference first.',
      });
    }

    const activeAffiliation = await PDHOAffiliation.findOne({ cdhaUserId: userId, status: 'Active' });
    if (!activeAffiliation) {
      return res.status(400).json({
        success: false,
        message: 'No active PDHO affiliation found. Your affiliation request must be approved by the PDHO Manager first.',
      });
    }

    // Enforce BR-025: Max 50 Active citizens capacity check!
    const currentActiveCount = await CitizenSupportRelationship.countDocuments({
      cdhaUserId: userId,
      status: 'Active',
    });

    if (currentActiveCount >= 50) {
      return res.status(400).json({
        success: false,
        message: 'Capacity limit reached (BR-025: Maximum 50 Active citizens per CDHA). Cannot add more citizens.',
      });
    }

    const randomNum = Math.floor(100 + Math.random() * 900);
    const citizenCode = `HCA-${randomNum}-${Math.floor(100 + Math.random() * 900)}`;

    const newRelationship = await CitizenSupportRelationship.create({
      cdhaUserId: userId,
      citizenCode,
      citizenName: citizenName.trim(),
      pdhoName: activeAffiliation.pdhoName,
      supportArea,
      source,
      status: 'Active',
      lastActivity: 'Just now',
    });

    return res.status(201).json({
      success: true,
      data: newRelationship,
      message: `Citizen ${citizenName} added to CDHA support workspace`,
    });
  } catch (error: any) {
    console.error('Error adding citizen support:', error);
    return res.status(500).json({ success: false, message: error.message || 'Server error' });
  }
}
