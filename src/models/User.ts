import { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole =
  | 'SuperAdmin'
  | 'Admin'
  | 'Provider'
  | 'EndUser'
  | 'Global Admin'
  | 'Operations Admin'
  | 'Content Admin'
  | 'Moderation Admin';
export type UserStatus =
  | 'Active'
  | 'Watch'
  | 'Suspended'
  | 'Deactivated'
  | 'active'
  | 'inactive'
  | 'pending_mfa'
  | 'Awaiting First Login'
  | 'Pending';

export interface IUserNote {
  id: string;
  note: string;
  createdAt: Date;
  createdBy: string;
}

export interface IUser extends Document {
  id?: string;
  memberId?: string;
  email: string;
  password?: string;
  phone?: string;
  title?: string;
  name: string;
  gender?: string;
  dateOfBirth?: string;
  bloodGroup?: string;
  genotype?: string;
  country?: string;
  state?: string;
  address?: string;
  plan?: string;
  role: UserRole;
  status: UserStatus;
  avatar?: string;
  isVerified?: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  mfaSecret?: string;
  isMFAEnabled: boolean;
  notes?: IUserNote[];
  advertsCount?: number;
  vouchersCount?: number;
  paymentsCount?: number;
  lastActive?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserNoteSchema = new Schema<IUserNote>(
  {
    id: { type: String, required: true },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'Admin' },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    memberId: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      trim: true,
      default: 'Male',
    },
    dateOfBirth: {
      type: String,
      trim: true,
      default: '1988-05-14',
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: 'O+',
    },
    genotype: {
      type: String,
      trim: true,
      default: 'AA',
    },
    country: {
      type: String,
      trim: true,
      default: 'Nigeria',
    },
    state: {
      type: String,
      trim: true,
      default: 'Lagos State',
    },
    address: {
      type: String,
      trim: true,
      default: 'Victoria Island',
    },
    plan: {
      type: String,
      trim: true,
      default: 'Free Plan',
    },
    role: {
      type: String,
      default: 'EndUser',
    },
    status: {
      type: String,
      default: 'Active',
    },
    avatar: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    mfaSecret: {
      type: String,
    },
    isMFAEnabled: {
      type: Boolean,
      default: false,
    },
    notes: [UserNoteSchema],
    advertsCount: {
      type: Number,
      default: 0,
    },
    vouchersCount: {
      type: Number,
      default: 0,
    },
    paymentsCount: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret.memberId || `HC-${String(ret._id).slice(-5).toUpperCase()}`;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Hash password before saving
UserSchema.pre('save', async function () {
  const user = this as unknown as IUser;
  if (!user.isModified('password') || !user.password) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export const User = model<IUser>('User', UserSchema);
