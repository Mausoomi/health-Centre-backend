import { Schema, model, Document } from 'mongoose';

export type AdvertStatus =
  | 'Submitted'
  | 'Approved'
  | 'Changes Required'
  | 'Scheduled'
  | 'Published'
  | 'Active'
  | 'Paused'
  | 'Expired'
  | 'Rejected';

export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';

export interface IAdvertLocation {
  id?: string | number;
  country: string;
  region: string;
  start: string;
  days: number;
  endDate?: string;
}

export interface IAdvertReport {
  id: string;
  reasons: string[];
  note?: string;
  reporterEmail?: string;
  createdAt: Date;
}

export interface IAdvertAdminNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: Date;
}

export interface IAdvert extends Document {
  id?: string;
  advertId: string;
  userId?: string;
  customerName: string;
  customerEmail: string;
  isGuest: boolean;
  name: string;
  title: string;
  description: string;
  image: string;
  address?: string;
  telephone?: string;
  email?: string;
  website?: string;
  contactPerson?: string;
  locations: IAdvertLocation[];
  totalDays: number;
  totalCost: number;
  currency: string;
  status: AdvertStatus;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paymentProvider?: string;
  reviewReason?: string;
  assignedAdmin?: string;
  adminNotes: IAdvertAdminNote[];
  views: number;
  clicks: number;
  likes: number;
  likedBy: string[];
  reports: IAdvertReport[];
  startDate?: string;
  endDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdvertLocationSchema = new Schema<IAdvertLocation>(
  {
    country: { type: String, required: true, trim: true, default: 'Nigeria' },
    region: { type: String, required: true, trim: true },
    start: { type: String, required: true, trim: true },
    days: { type: Number, required: true, min: 1 },
    endDate: { type: String, trim: true },
  },
  { _id: false }
);

const AdvertReportSchema = new Schema<IAdvertReport>(
  {
    id: { type: String, required: true },
    reasons: { type: [String], default: [] },
    note: { type: String, default: '' },
    reporterEmail: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AdvertAdminNoteSchema = new Schema<IAdvertAdminNote>(
  {
    id: { type: String, required: true },
    note: { type: String, required: true },
    createdBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const AdvertSchema = new Schema<IAdvert>(
  {
    advertId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    userId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    customerName: {
      type: String,
      required: true,
      trim: true,
      default: 'Valued Customer',
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    isGuest: {
      type: Boolean,
      default: false,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
    },
    telephone: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      trim: true,
      default: '',
    },
    website: {
      type: String,
      trim: true,
      default: '',
    },
    contactPerson: {
      type: String,
      trim: true,
      default: '',
    },
    locations: {
      type: [AdvertLocationSchema],
      default: [],
    },
    totalDays: {
      type: Number,
      default: 200,
      min: 1,
    },
    totalCost: {
      type: Number,
      default: 2000,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    status: {
      type: String,
      enum: [
        'Submitted',
        'Approved',
        'Changes Required',
        'Scheduled',
        'Published',
        'Active',
        'Paused',
        'Expired',
        'Rejected',
      ],
      default: 'Submitted',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Paid',
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    paymentProvider: {
      type: String,
      trim: true,
      default: 'Paystack (Simulated)',
    },
    reviewReason: {
      type: String,
      trim: true,
      default: '',
    },
    assignedAdmin: {
      type: String,
      trim: true,
      default: '',
    },
    adminNotes: {
      type: [AdvertAdminNoteSchema],
      default: [],
    },
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
    reports: {
      type: [AdvertReportSchema],
      default: [],
    },
    startDate: {
      type: String,
      default: '',
    },
    endDate: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret.advertId || String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Advert = model<IAdvert>('Advert', AdvertSchema);
