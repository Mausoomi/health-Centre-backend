import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { CareSecureGrant } from '../../../models/standard/CareSecureGrant';
import { User } from '../../../models/User';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { sendCareSecureInvitationEmail } from '../../../utils/emailService';
import { Types } from 'mongoose';
import crypto from 'crypto';

const computeExpiryDate = (durationStr: string): Date => {
  const now = new Date();
  if (durationStr?.includes('24 hours')) {
    return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  } else if (durationStr?.includes('7 days')) {
    return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (durationStr?.includes('90 days')) {
    return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  } else if (durationStr?.includes('30 days')) {
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  } else if (durationStr && !isNaN(Date.parse(durationStr))) {
    return new Date(durationStr);
  }
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
};

// List all CareSecure access grants
export const getCareSecureGrants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const uid = new Types.ObjectId(userId.toString());
    await ensureStandardUserSeed(userId, req.user);
    const grants = await CareSecureGrant.find({ userId: uid }).sort({ createdAt: -1 }).lean();

    res.status(200).json({
      success: true,
      data: grants,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving access grants', error: (error as Error).message });
  }
};

// Get single grant with full audit log
export const getCareSecureGrantById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { accessId: id }];
    } else {
      query.accessId = id;
    }

    const grant = await CareSecureGrant.findOne(query).lean();
    if (!grant) {
      res.status(404).json({ message: 'Access grant not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: grant,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving grant', error: (error as Error).message });
  }
};

// Grant new access
export const createCareSecureGrant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const grantorUser = await User.findById(userId).lean();
    const grantorName = grantorUser?.name || req.user?.name || 'Patient';

    const accessId = `CS-${Date.now().toString().slice(-6)}`;
    const grantedTime = new Date().toLocaleString();
    const grantToken = crypto.randomBytes(32).toString('hex');
    const grantTokenExpiresAt = computeExpiryDate(req.body.expires || '30 days');

    const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:3000';
    const accessUrl = `${clientBaseUrl}/caresecure/shared-access/${grantToken}`;

    const recipientContact = req.body.recipientContact || '';
    const isEmailMethod = (req.body.invitationMethod || '').toLowerCase().includes('email') || recipientContact.includes('@');

    let emailSentStatus = false;
    let invitationLogDetail = `${grantedTime} · HealthCentreApp · ${req.body.invitationMethod || 'Invitation link created'}`;

    if (isEmailMethod && recipientContact) {
      const featureNames = (req.body.featurePermissions || [])
        .map((fp: any) => `${fp.featureName} (${(fp.rights || []).join(', ')})`)
        .join(', ') || 'CareRecord, Medication';

      const emailRes = await sendCareSecureInvitationEmail({
        to: recipientContact,
        recipientName: req.body.name || 'Caregiver',
        grantorName,
        accessLevel: req.body.accessLevel || 'Support',
        duration: req.body.expires || '30 days',
        accessUrl,
        featuresSummary: featureNames,
      });

      emailSentStatus = emailRes.sent;
      if (emailSentStatus) {
        invitationLogDetail = `${grantedTime} · HealthCentreApp · Secure access email dispatched to ${recipientContact}`;
      } else {
        invitationLogDetail = `${grantedTime} · HealthCentreApp · Failed to send email to ${recipientContact}, fallback link generated`;
      }
    }

    const auditLogs = [
      {
        title: 'Access Granted',
        detail: `${grantedTime} · You · ${req.body.accessLevel || 'Support'} rights granted · Access ID ${accessId}`,
        timestamp: new Date().toISOString(),
      },
      {
        title: 'Invitation Sent',
        detail: invitationLogDetail,
        timestamp: new Date().toISOString(),
      },
    ];

    const newGrant = await CareSecureGrant.create({
      ...req.body,
      userId: new Types.ObjectId(userId.toString()),
      accessId,
      grantToken,
      grantTokenExpiresAt,
      grantedAt: grantedTime,
      status: 'Pending Verification',
      invitationMethod: isEmailMethod ? `Email sent to ${recipientContact}` : (req.body.invitationMethod || 'Secure link created'),
      auditLogs,
    });

    res.status(201).json({
      success: true,
      message: emailSentStatus
        ? 'CareSecure access granted & invitation email sent successfully'
        : 'CareSecure access granted',
      data: newGrant,
      accessUrl,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error granting access', error: (error as Error).message });
  }
};

// Update access grant / permissions
export const updateCareSecureGrant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { accessId: id }];
    } else {
      query.accessId = id;
    }

    const grant = await CareSecureGrant.findOne(query);
    if (!grant) {
      res.status(404).json({ message: 'Access grant not found' });
      return;
    }

    Object.assign(grant, req.body);
    grant.auditLogs.unshift({
      title: 'Permissions Updated',
      detail: `${new Date().toLocaleString()} · You · Updated access settings for ${grant.name}`,
      timestamp: new Date().toISOString(),
    } as any);

    await grant.save();

    res.status(200).json({
      success: true,
      message: 'Access permissions updated successfully',
      data: grant,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating grant', error: (error as Error).message });
  }
};

// Revoke access immediately
export const revokeCareSecureGrant = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    const { id } = req.params;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    const query: any = { userId: new Types.ObjectId(userId.toString()) };
    if (Types.ObjectId.isValid(id)) {
      query.$or = [{ _id: id }, { accessId: id }];
    } else {
      query.accessId = id;
    }

    const grant = await CareSecureGrant.findOne(query);
    if (!grant) {
      res.status(404).json({ message: 'Access grant not found' });
      return;
    }

    grant.status = 'Revoked';
    grant.auditLogs.unshift({
      title: 'Access Revoked',
      detail: `${new Date().toLocaleString()} · You · Access immediately revoked`,
      timestamp: new Date().toISOString(),
    } as any);

    await grant.save();

    res.status(200).json({
      success: true,
      message: 'Access grant revoked',
      data: grant,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error revoking grant', error: (error as Error).message });
  }
};
