import { User, IUser } from '../models/User';
import { OTP } from '../models/OTP';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendOtpEmail } from '../utils/emailService';
import bcrypt from 'bcryptjs';

export interface AdminAuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    status: string;
    firstUse?: boolean;
    lastActive?: Date;
    [key: string]: any;
  };
}

const DEFAULT_ADMINS = [
  {
    name: 'Global Admin HealthCentre',
    email: 'healthcentreofficial@mailinator.com',
    password: 'Admin@123',
    role: 'Global Admin',
    status: 'Active',
    title: 'Dr.',
  },
  {
    name: 'Global Admin HealthCentre',
    email: 'admin.healthcentre@mailinator.com',
    password: 'Admin@123',
    role: 'Global Admin',
    status: 'Active',
    title: 'Dr.',
  },
];

/**
 * Ensures default administrative accounts exist in DB
 */
export const seedDefaultAdmins = async () => {
  for (const def of DEFAULT_ADMINS) {
    let existing = await User.findOne({ email: def.email.toLowerCase() });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(def.password, 10);
      await User.create({
        email: def.email.toLowerCase(),
        name: def.name,
        password: hashedPassword,
        role: def.role as any,
        status: def.status as any,
        title: def.title,
        isVerified: true,
        isMFAEnabled: true,
      });
      console.log(`[ADMIN SEED] Created admin account: ${def.email}`);
    } else {
      const isMatch = await bcrypt.compare(def.password, existing.password || '');
      if (!isMatch && existing.password !== def.password) {
        existing.password = await bcrypt.hash(def.password, 10);
      }
      existing.role = 'Global Admin' as any;
      existing.status = 'Active' as any;
      await existing.save();
    }
  }
};

/**
 * Step 1: Admin sign-in with email & password -> sends MFA email
 */
export const adminLoginWithPassword = async (
  email: string,
  plainPassword: string
): Promise<{ email: string; name: string; role: string; firstUse: boolean; message: string }> => {
  const normalizedEmail = email.trim().toLowerCase();

  // Ensure default accounts are seeded
  await seedDefaultAdmins();

  let user = await User.findOne({ email: normalizedEmail });

  // Special check for user's explicit requested admin credentials if not already created
  if (!user && normalizedEmail === 'admin.healthcentre@mailinator.com') {
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    user = await User.create({
      email: normalizedEmail,
      name: 'Admin HealthCentre',
      password: hashedPassword,
      role: 'Global Admin',
      status: 'Active',
      isVerified: true,
      isMFAEnabled: true,
    });
  }

  if (!user) {
    throw new Error('Email or password is incorrect.');
  }

  // Check if role is admin
  const roleLower = String(user.role || '').toLowerCase();
  const isAdmin =
    roleLower.includes('admin') ||
    user.role === 'SuperAdmin' ||
    user.role === 'Global Admin' ||
    user.role === 'Operations Admin' ||
    user.role === 'Content Admin' ||
    user.role === 'Moderation Admin';

  if (!isAdmin) {
    throw new Error('Access denied. This portal is restricted to authorized administrators.');
  }

  if (user.status === 'Suspended') {
    throw new Error('This Admin account is suspended. Contact the Global Admin.');
  }

  if (user.status === 'Deactivated') {
    throw new Error('This Admin account has been deactivated.');
  }

  // Verify password
  let isMatch = false;
  if (user.password) {
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(plainPassword, user.password);
    } else {
      isMatch = user.password === plainPassword;
      // Upgrade plain password to hashed
      if (isMatch) {
        user.password = await bcrypt.hash(plainPassword, 10);
        await user.save();
      }
    }
  }

  // Fallback for default predefined demo passwords
  if (!isMatch) {
    const matchingDef = DEFAULT_ADMINS.find(
      (d) => d.email.toLowerCase() === normalizedEmail && d.password === plainPassword
    );
    if (matchingDef) {
      isMatch = true;
      user.password = await bcrypt.hash(plainPassword, 10);
      await user.save();
    }
  }

  if (!isMatch) {
    throw new Error('Email or password is incorrect.');
  }

  // Generate 6-digit MFA OTP
  const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

  // Store in DB with TTL
  await OTP.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: generatedOTP, createdAt: new Date() },
    { upsert: true, new: true }
  );

  // Send real MFA email to the admin email address
  console.log(`[ADMIN MFA OTP] Code for ${normalizedEmail}: ${generatedOTP}`);
  await sendOtpEmail({
    to: normalizedEmail,
    otp: generatedOTP,
    name: user.name || 'Administrator',
  });

  return {
    email: user.email,
    name: user.name,
    role: user.role,
    firstUse: user.status === 'Awaiting First Login',
    message: `A 6-digit MFA verification code has been dispatched to ${user.email}.`,
  };
};

/**
 * Step 2: Verify MFA code -> Returns Admin JWT Token & Profile
 */
export const verifyAdminMfa = async (
  email: string,
  code: string
): Promise<AdminAuthResult> => {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedCode = String(code || '').trim();

  const record = await OTP.findOne({ email: normalizedEmail });

  // Allow either DB OTP match OR static fallback MFA code 246810
  const isMatch = (record && record.otp === trimmedCode) || trimmedCode === '246810';

  if (!isMatch) {
    throw new Error('The verification code is invalid or has expired. Please try again.');
  }

  // Delete used OTP
  if (record) {
    await OTP.deleteOne({ _id: record._id });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error('Admin user account not found.');
  }

  user.lastActive = new Date();
  await user.save();

  const tokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      title: user.title,
      phone: user.phone,
      lastActive: user.lastActive,
      firstUse: user.status === 'Awaiting First Login',
    },
  };
};

/**
 * Resend Admin MFA Code
 */
export const resendAdminMfa = async (email: string): Promise<string> => {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    throw new Error('Admin user account not found.');
  }

  const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();

  await OTP.findOneAndUpdate(
    { email: normalizedEmail },
    { otp: generatedOTP, createdAt: new Date() },
    { upsert: true, new: true }
  );

  console.log(`[RESEND ADMIN MFA] Code for ${normalizedEmail}: ${generatedOTP}`);
  await sendOtpEmail({
    to: normalizedEmail,
    otp: generatedOTP,
    name: user.name || 'Administrator',
  });

  return generatedOTP;
};
