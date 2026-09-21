import { Response } from 'express';
import { AuthenticatedRequest } from '../../../middlewares/auth';
import { CareSecureGrant } from '../../../models/standard/CareSecureGrant';
import { ensureStandardUserSeed } from '../../../services/standardSeedService';
import { Types } from 'mongoose';

// List all CareSecure access grants
export const getCareSecureGrants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId || req.user?.id || req.user?._id;
    if (!userId) {
      res.status(401).json({ message: 'User not authenticated' });
      return;
    }

    await ensureStandardUserSeed(userId, req.user);
    const grants = await CareSecureGrant.find({ userId: new Types.ObjectId(userId.toString()) }).sort({ createdAt: -1 });

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

    const grant = await CareSecureGrant.findOne(query);
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

    const accessId = `CS-${Date.now().toString().slice(-6)}`;
    const grantedTime = new Date().toLocaleString();

    const auditLogs = [
      {
        title: 'Access Granted',
        detail: `${grantedTime} · You · ${req.body.accessLevel || 'Support'} rights granted · Access ID ${accessId}`,
        timestamp: new Date().toISOString(),
      },
      {
        title: 'Invitation Sent',
        detail: `${grantedTime} · HealthCentreApp · ${req.body.invitationMethod || 'WhatsApp secure link sent to recipient'}`,
        timestamp: new Date().toISOString(),
      },
    ];

    const newGrant = await CareSecureGrant.create({
      ...req.body,
      userId: new Types.ObjectId(userId.toString()),
      accessId,
      grantedAt: grantedTime,
      status: 'Pending Verification',
      auditLogs,
    });

    res.status(201).json({
      success: true,
      message: 'CareSecure delegate access granted',
      data: newGrant,
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
