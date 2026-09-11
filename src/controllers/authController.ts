import { Request, Response, NextFunction } from 'express';
import {
  requestOTP,
  verifyUserOTP,
  registerUser,
  loginWithPassword,
  verifyEmailToken,
  resendVerificationEmail,
  getUserProfileById,
  updateUserProfileById,
  changeUserPassword,
} from '../services/authService';
import { User } from '../models/User';
import { generateAccessToken, verifyRefreshToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../middlewares/auth';

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password, name, title, phone, gender, country } = req.body;
    if (!email || !name) {
      res.status(400).json({ message: 'Name and email are required.' });
      return;
    }

    const result = await registerUser({
      email,
      password,
      name,
      title,
      phone,
      gender,
      country,
    });

    res.status(201).json({
      success: true,
      isVerified: false,
      email: result.email,
      name: result.name,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required.' });
      return;
    }

    const { accessToken, refreshToken: rToken, user } = await loginWithPassword(email, password);

    res.cookie('refreshToken', rToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user,
    });
  } catch (error: any) {
    const msg = error?.message || '';
    if (error?.code === 'EMAIL_NOT_VERIFIED' || msg.toLowerCase().includes('verify your email')) {
      res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        isVerified: false,
        email: error?.email || req.body.email,
        message: 'Please verify your email address first. A verification link has been sent to your email.',
      });
      return;
    }

    if (msg.toLowerCase().includes('suspended') || msg.toLowerCase().includes('deactivated')) {
      res.status(403).json({ success: false, message: msg });
      return;
    }

    if (error?.code === 'EMAIL_NOT_REGISTERED' || msg.toLowerCase().includes('not registered')) {
      res.status(404).json({ success: false, code: 'EMAIL_NOT_REGISTERED', message: 'This email is not registered.' });
      return;
    }

    res.status(400).json({ success: false, message: 'Incorrect login password.' });
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const email = (req.query.email as string) || req.body.email;
    const token = (req.query.token as string) || req.body.token;

    if (!email || !token) {
      res.status(400).json({ success: false, message: 'Email address and verification token are required.' });
      return;
    }

    const result = await verifyEmailToken(email, token);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const result = await resendVerificationEmail(email);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ success: false, message: (error as Error).message });
  }
};

export const sendOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email is required.' });
      return;
    }

    const generatedOTP = await requestOTP(email);

    console.log(`[DEV OTP] Generated OTP ${generatedOTP} for email ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      email,
      otp: process.env.NODE_ENV !== 'production' ? generatedOTP : undefined,
    });
  } catch (error: any) {
    const msg = error?.message || '';
    if (error?.code === 'EMAIL_NOT_VERIFIED' || msg.toLowerCase().includes('verify your email')) {
      res.status(403).json({
        success: false,
        code: 'EMAIL_NOT_VERIFIED',
        email: error?.email || req.body.email,
        message: 'Please verify your email address first. A verification link has been sent to your email.',
      });
      return;
    }

    if (error?.code === 'EMAIL_NOT_REGISTERED' || msg.toLowerCase().includes('not registered')) {
      res.status(404).json({
        success: false,
        code: 'EMAIL_NOT_REGISTERED',
        message: 'This email is not registered.',
      });
      return;
    }

    res.status(400).json({
      success: false,
      message: msg || 'Failed to send login code. Please try again.',
    });
  }
};

export const verifyOTP = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, otp, name } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP are required.' });
      return;
    }

    const { accessToken, refreshToken: rToken, user } = await verifyUserOTP(email, otp, name);

    res.cookie('refreshToken', rToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      accessToken,
      user,
    });
  } catch (error: any) {
    const msg = error?.message || '';
    if (error?.code === 'EMAIL_NOT_REGISTERED' || msg.toLowerCase().includes('not registered')) {
      res.status(404).json({
        success: false,
        code: 'EMAIL_NOT_REGISTERED',
        message: 'This email is not registered.',
      });
      return;
    }

    res.status(400).json({ success: false, message: msg || 'Invalid or expired OTP.' });
  }
};

export const refreshToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rToken) {
      res.status(401).json({ message: 'Refresh token is required' });
      return;
    }

    const payload = verifyRefreshToken(rToken);
    const user = await User.findById(payload.userId);
    if (!user) {
      res.status(401).json({ message: 'User no longer exists' });
      return;
    }

    const newPayload = {
      userId: String(user._id),
      email: user.email,
      role: user.role,
    };

    const accessToken = generateAccessToken(newPayload);

    res.status(200).json({
      accessToken,
      user: {
        id: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        plan: user.plan,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired refresh token', error: (error as Error).message });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await getUserProfileById(req.user.userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      user: {
        id: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
        memberId: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
        email: user.email,
        name: user.name,
        title: user.title || '',
        phone: user.phone || '',
        gender: user.gender || 'Male',
        dateOfBirth: user.dateOfBirth || '1988-05-14',
        bloodGroup: user.bloodGroup || 'O+',
        genotype: user.genotype || 'AA',
        country: user.country || 'Nigeria',
        state: user.state || 'Lagos State',
        address: user.address || 'Victoria Island',
        plan: user.plan || 'Free Plan',
        activePlan: user.plan || 'Free Plan',
        role: user.role,
        status: user.status,
        avatar: user.avatar || '',
        hasPassword: Boolean(user.password),
        createdAt: user.createdAt,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const {
      name,
      title,
      phone,
      gender,
      dateOfBirth,
      bloodGroup,
      genotype,
      country,
      state,
      address,
      avatar,
      plan,
    } = req.body;

    const updateFields: any = {};
    if (name !== undefined) updateFields.name = name;
    if (title !== undefined) updateFields.title = title;
    if (phone !== undefined) updateFields.phone = phone;
    if (gender !== undefined) updateFields.gender = gender;
    if (dateOfBirth !== undefined) updateFields.dateOfBirth = dateOfBirth;
    if (bloodGroup !== undefined) updateFields.bloodGroup = bloodGroup;
    if (genotype !== undefined) updateFields.genotype = genotype;
    if (country !== undefined) updateFields.country = country;
    if (state !== undefined) updateFields.state = state;
    if (address !== undefined) updateFields.address = address;
    if (avatar !== undefined) updateFields.avatar = avatar;
    if (plan !== undefined) updateFields.plan = plan;

    const updated = await updateUserProfileById(req.user.userId, updateFields);

    if (!updated) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      message: 'Profile updated successfully',
      user: {
        id: updated.memberId || `HC-${String(updated._id).slice(-5).toUpperCase()}`,
        memberId: updated.memberId || `HC-${String(updated._id).slice(-5).toUpperCase()}`,
        email: updated.email,
        name: updated.name,
        title: updated.title || '',
        phone: updated.phone || '',
        gender: updated.gender || 'Male',
        dateOfBirth: updated.dateOfBirth || '1988-05-14',
        bloodGroup: updated.bloodGroup || 'O+',
        genotype: updated.genotype || 'AA',
        country: updated.country || 'Nigeria',
        state: updated.state || 'Lagos State',
        address: updated.address || 'Victoria Island',
        plan: updated.plan || 'Free Plan',
        activePlan: updated.plan || 'Free Plan',
        role: updated.role,
        status: updated.status,
        avatar: updated.avatar || '',
        createdAt: updated.createdAt,
        lastActive: updated.lastActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user || !req.user.userId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const { currentPassword, newPassword } = req.body;
    if (!newPassword) {
      res.status(400).json({ message: 'New password is required.' });
      return;
    }

    const result = await changeUserPassword(req.user.userId, {
      currentPassword,
      newPassword,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: (error as Error).message || 'Failed to update password',
    });
  }
};
