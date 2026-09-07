import { OTP } from '../models/OTP';
import { User, IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { sendOtpEmail } from '../utils/emailService';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
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
    createdAt?: Date;
    lastActive?: Date;
    [key: string]: any;
  };
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

  // Dispatch actual email
  await sendOtpEmail({
    to: normalizedEmail,
    otp: generatedOTP,
    name: existingUser?.name,
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
}): Promise<AuthResult> => {
  const normalizedEmail = data.email.trim().toLowerCase();

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error('An account with this email address already exists.');
  }

  const randomMemberNum = Math.floor(10000 + Math.random() * 90000);
  const memberId = `HC-${randomMemberNum}`;

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
    status: 'Active',
    plan: 'Free Plan',
    avatar: '',
    lastActive: new Date(),
  });

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
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    },
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

  if (user.status === 'Suspended' || user.status === 'Deactivated') {
    throw new Error(`Your account is ${user.status.toLowerCase()}. Please contact support.`);
  }

  try {
    user.lastActive = new Date();
    await user.save();
  } catch (err) {
    // Non-fatal if lastActive update encounters validation issue
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
      createdAt: user.createdAt,
      lastActive: user.lastActive,
    },
  };
};

export const getUserProfileById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId);
};

export const updateUserProfileById = async (userId: string, updateData: Partial<IUser>): Promise<IUser | null> => {
  return User.findByIdAndUpdate(userId, { $set: updateData }, { new: true });
};
