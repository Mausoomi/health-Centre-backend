import { Request, Response, NextFunction } from 'express';
import {
  adminLoginWithPassword,
  verifyAdminMfa,
  resendAdminMfa,
} from '../../services/adminAuthService';
import { AuthenticatedRequest } from '../../middlewares/auth';
import { User } from '../../models/User';

/**
 * Admin Login with Email & Password
 * POST /api/v1/admin/auth/login
 */
export const adminLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ ok: false, message: 'Email and password are required.' });
      return;
    }

    const result = await adminLoginWithPassword(email, password);
    res.status(200).json({
      ok: true,
      success: true,
      message: result.message,
      otp: (result as any).otp,
      user: {
        email: result.email,
        name: result.name,
        role: result.role,
        firstUse: result.firstUse,
      },
    });
  } catch (error) {
    const msg = (error as Error).message || 'Invalid admin credentials.';
    const status = msg.includes('suspended') || msg.includes('denied') ? 403 : 400;
    res.status(status).json({
      ok: false,
      success: false,
      message: msg,
    });
  }
};

/**
 * Admin Verify 6-digit MFA Code
 * POST /api/v1/admin/auth/verify-mfa
 */
export const adminVerifyMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, code, otp } = req.body;
    const mfaCode = code || otp;

    if (!email || !mfaCode) {
      res.status(400).json({ ok: false, message: 'Email and 6-digit verification code are required.' });
      return;
    }

    const { accessToken, refreshToken, user } = await verifyAdminMfa(email, mfaCode);

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      ok: true,
      success: true,
      message: 'Admin authentication successful.',
      accessToken,
      user,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      success: false,
      message: (error as Error).message || 'MFA verification failed.',
    });
  }
};

/**
 * Admin Resend MFA Code
 * POST /api/v1/admin/auth/resend-mfa
 */
export const adminResendMfa = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ ok: false, message: 'Email is required to resend MFA code.' });
      return;
    }

    await resendAdminMfa(email);
    res.status(200).json({
      ok: true,
      success: true,
      message: `A new verification code has been dispatched to ${email}.`,
    });
  } catch (error) {
    res.status(400).json({
      ok: false,
      success: false,
      message: (error as Error).message || 'Failed to resend verification code.',
    });
  }
};

/**
 * Get Current Admin Profile
 * GET /api/v1/admin/auth/me
 */
export const getAdminMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('-password');
    if (!user) {
      res.status(404).json({ ok: false, message: 'Admin not found' });
      return;
    }

    res.status(200).json({
      ok: true,
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({ ok: false, message: (error as Error).message });
  }
};

/**
 * Admin Sign Out
 * POST /api/v1/admin/auth/logout
 */
export const adminLogout = (req: Request, res: Response): void => {
  res.clearCookie('refreshToken');
  res.status(200).json({ ok: true, message: 'Admin logged out successfully' });
};
