import { Schema, model, Document } from 'mongoose';

export type VoucherStatus =
  | 'Available'
  | 'Unredeemed'
  | 'Redeemed'
  | 'Active'
  | 'Expired'
  | 'Revoked';

export type VoucherSource = 'Purchased' | 'Bulk' | 'Internal' | 'Promotional' | 'Unredeemed';

export interface IVoucherNotice {
  id: string;
  message: string;
  sentAt: Date;
  sentBy: string;
}

export interface IVoucher extends Document {
  id?: string;
  voucherId: string;
  code: string;
  name: string;
  offer: string;
  description: string;
  plan: string;
  durationYears: number;
  discountType: 'Percentage' | 'Fixed amount' | 'Full Plan';
  discountValue: number;
  amount: number;
  currency: string;
  purchaserId?: string;
  purchaserName: string;
  purchaserEmail: string;
  isGuest: boolean;
  redeemerId?: string;
  redeemerName?: string;
  redeemerEmail?: string;
  redeemedAt?: Date;
  status: VoucherStatus;
  source: VoucherSource;
  paymentStatus: 'Pending' | 'Paid' | 'Failed' | 'Refunded';
  paymentReference?: string;
  paymentProvider?: string;
  validFrom?: Date;
  expiresAt?: Date;
  noticesSent: IVoucherNotice[];
  createdAt: Date;
  updatedAt: Date;
}

const VoucherNoticeSchema = new Schema<IVoucherNotice>(
  {
    id: { type: String, required: true },
    message: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
    sentBy: { type: String, default: 'Admin' },
  },
  { _id: false }
);

const VoucherSchema = new Schema<IVoucher>(
  {
    voucherId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    offer: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    plan: {
      type: String,
      trim: true,
      default: 'Standard Plan',
    },
    durationYears: {
      type: Number,
      default: 1,
      min: 1,
    },
    discountType: {
      type: String,
      enum: ['Percentage', 'Fixed amount', 'Full Plan'],
      default: 'Full Plan',
    },
    discountValue: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
      default: 6000,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    purchaserId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    purchaserName: {
      type: String,
      required: true,
      trim: true,
      default: 'Valued Customer',
    },
    purchaserEmail: {
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
    redeemerId: {
      type: String,
      trim: true,
      default: '',
      index: true,
    },
    redeemerName: {
      type: String,
      trim: true,
      default: '',
    },
    redeemerEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    redeemedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['Available', 'Unredeemed', 'Redeemed', 'Active', 'Expired', 'Revoked'],
      default: 'Available',
      index: true,
    },
    source: {
      type: String,
      enum: ['Purchased', 'Bulk', 'Internal', 'Promotional', 'Unredeemed'],
      default: 'Purchased',
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
    validFrom: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
    },
    noticesSent: {
      type: [VoucherNoticeSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret.voucherId || String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Voucher = model<IVoucher>('Voucher', VoucherSchema);
