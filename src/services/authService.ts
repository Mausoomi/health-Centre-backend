import crypto from 'crypto';
import { OTP } from '../models/OTP';
import { User, IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendOtpEmail, sendVerificationEmail } from '../utils/emailService';

export interface AuthResult {
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id: string;
    memberId?: string;
    email: string;
    name: string;
    role: string;
    status: string;
    plan?: string;
    avatar?: string;
    title?: string;
    phone?: string;
    gender?: string;
    dateOfBirth?: string;
    bloodGroup?: string;
    genotype?: string;
    country?: string;
    state?: string;
    address?: string;
    isVerified?: boolean;
    createdAt?: Date;
    lastActive?: Date;
    [key: string]: any;
  };
  isVerified?: boolean;
  message?: string;
}

export const requestOTP = async (email: string): Promise<string> => {
  const normalizedEmail = email.trim().toLowerCase();
  // Generate a 6-digit OTP code
  const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in DB with TTL
  await OTP.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: generatedOTP, createdAt: new Date() },
    { upsert: true, new: true }
  );

  // Check if existing user has a name
  const existingUser = await User.findOne({ email: normalizedEmail });

  // Dispatch actual email in background
  sendOtpEmail({
    to: normalizedEmail,
    otp: generatedOTP,
    name: existingUser?.name,
  }).catch((err) => {
    console.error('[USER OTP EMAIL ERROR]', err);
  });

  return generatedOTP;
};

export const verifyUserOTP = async (email: string, otp: string, name?: string): Promise<AuthResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const record = await OTP.findOne({ email: normalizedEmail });
  if (!record || record.otp !== otp) {
    throw new Error('Invalid or expired OTP');
  }

  // Delete the verified OTP
  await OTP.deleteOne({ _id: record._id });

  // Find or create User
  let user = await User.findOne({ email: normalizedEmail });
  if (user) {
    const isAdminAccount =
      user.role &&
      user.role !== 'EndUser' &&
      (user.role.toLowerCase().includes('admin') || user.role === 'SuperAdmin');

    if (isAdminAccount) {
      throw new Error('This portal is for registered members only.');
    }

    try {
      user.isVerified = true;
      user.status = 'Active';
      user.lastActive = new Date();
      await user.save();
    } catch (e) {
      // ignore
    }
  } else {
    const randomMemberNum = Math.floor(10000 + Math.random() * 90000);
    user = await User.create({
      email: normalizedEmail,
      memberId: `HC-${randomMemberNum}`,
      name: name || normalizedEmail.split('@')[0],
      role: 'EndUser',
      status: 'Active',
      isVerified: true,
      plan: 'Free Plan',
      avatar: '',
      lastActive: new Date(),
    });
  }

  if (user.status === 'Suspended' || user.status === 'Deactivated') {
    throw new Error(`Your account has been ${user.status.toLowerCase()}. Please contact support.`);
  }

  const payload = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
      memberId: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      plan: user.plan || 'Free Plan',
      avatar: user.avatar || '',
      title: user.title || '',
      phone: user.phone || '',
      gender: user.gender || 'Male',
      dateOfBirth: user.dateOfBirth || '1988-05-14',
      bloodGroup: user.bloodGroup || 'O+',
      genotype: user.genotype || 'AA',
      country: user.country || 'Nigeria',
      state: user.state || 'Lagos State',
      address: user.address || 'Victoria Island',
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    },
  };
};

export const registerUser = async (data: {
  email: string;
  password?: string;
  name: string;
  title?: string;
  phone?: string;
  gender?: string;
  country?: string;
}): Promise<{ email: string; name: string; isVerified: boolean; message: string }> => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const randomMemberNum = Math.floor(10000 + Math.random() * 90000);
  const memberId = `HC-${randomMemberNum}`;

  // Generate cryptographically secure email verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationTokenExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours

  const user = await User.create({
    email: normalizedEmail,
    password: data.password,
    name: data.name.trim(),
    title: data.title || '',
    phone: data.phone || '',
    gender: data.gender || 'Male',
    country: data.country || 'Nigeria',
    dateOfBirth: '1988-05-14',
    bloodGroup: 'O+',
    genotype: 'AA',
    state: 'Lagos State',
    address: 'Victoria Island',
    memberId,
    role: 'EndUser',
    status: 'Pending',
    plan: 'Free Plan',
    avatar: '',
    isVerified: false,
    verificationToken,
    verificationTokenExpires,
    lastActive: new Date(),
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

  // Send verification email via Nodemailer in background
  sendVerificationEmail({
    to: normalizedEmail,
    name: user.name,
    verificationUrl,
  }).catch((err) => {
    console.error('[USER VERIFICATION EMAIL ERROR]', err);
  });

  return {
    email: user.email,
    name: user.name,
    isVerified: false,
    message: 'Registration successful! A verification email has been sent. Please check your inbox and verify your email before logging in.',
  };
};

export const loginWithPassword = async (email: string, password: string): Promise<AuthResult> => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  if (!user) {
    throw new Error('Incorrect login password.');
  }

  // Strictly disallow Admin accounts from logging in through the regular User Portal
  const isAdminAccount =
    user.role &&
    user.role !== 'EndUser' &&
    (user.role.toLowerCase().includes('admin') || user.role === 'SuperAdmin');

  if (isAdminAccount) {
    throw new Error('Incorrect login password.');
  }

  if (!user.password) {
    throw new Error('Incorrect login password.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('Incorrect login password.');
  }

  // Check if email has been verified
  if (user.isVerified === false) {
    const error: any = new Error('Please verify your email address first. A verification link has been sent to your email.');
    error.code = 'EMAIL_NOT_VERIFIED';
    error.email = user.email;
    throw error;
  }

  if (user.status === 'Suspended' || user.status === 'Deactivated') {
    throw new Error(`Your account is ${user.status.toLowerCase()}. Please contact support.`);
  }

  try {
    user.lastActive = new Date();
    await user.save();
  } catch (err) {
    console.warn('Could not update lastActive on login:', err);
  }

  const payload = {
    userId: String(user._id),
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
      memberId: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      plan: user.plan || 'Free Plan',
      avatar: user.avatar || '',
      title: user.title || '',
      phone: user.phone || '',
      gender: user.gender || 'Male',
      dateOfBirth: user.dateOfBirth || '1988-05-14',
      bloodGroup: user.bloodGroup || 'O+',
      genotype: user.genotype || 'AA',
      country: user.country || 'Nigeria',
      state: user.state || 'Lagos State',
      address: user.address || 'Victoria Island',
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    },
  };
};

export const verifyEmailToken = async (
  email: string,
  token: string
): Promise<{ success: boolean; message: string; user?: any }> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  const user = await User.findOne({ email: normalizedEmail }).select(
    '+verificationToken +verificationTokenExpires'
  );

  if (!user) {
    throw new Error('User account not found.');
  }

  if (user.isVerified) {
    return {
      success: true,
      message: 'Your email address is already verified. You can log in to your account.',
      user: {
        email: user.email,
        name: user.name,
        isVerified: true,
      },
    };
  }

  if (!user.verificationToken || user.verificationToken !== trimmedToken) {
    throw new Error('The verification link is invalid or has already been used.');
  }

  if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
    throw new Error('The verification link has expired. Please request a new verification email.');
  }

  // Mark user as verified and active
  user.isVerified = true;
  user.status = 'Active';
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  return {
    success: true,
    message: 'Your email address has been successfully verified! You can now log in to your account.',
    user: {
      id: user.memberId || `HC-${String(user._id).slice(-5).toUpperCase()}`,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      isVerified: true,
    },
  };
};

export const resendVerificationEmail = async (
  email: string
): Promise<{ success: boolean; message: string }> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    throw new Error('No registered account found with this email address.');
  }

  if (user.isVerified) {
    return {
      success: true,
      message: 'Your email address is already verified. You can log in directly.',
    };
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  user.verificationToken = verificationToken;
  user.verificationTokenExpires = new Date(Date.now() + 24 * 3600 * 1000); // 24 hours
  await user.save();

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(normalizedEmail)}`;

  sendVerificationEmail({
    to: normalizedEmail,
    name: user.name,
    verificationUrl,
  }).catch((err) => {
    console.error('[USER RESEND VERIFICATION EMAIL ERROR]', err);
  });

  return {
    success: true,
    message: `A fresh verification link has been dispatched to ${normalizedEmail}. Please check your inbox.`,
  };
};

export const getUserProfileById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId);
};

export const updateUserProfileById = async (userId: string, updateData: Partial<IUser>): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
};
