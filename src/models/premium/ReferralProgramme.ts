import mongoose, { Schema, Document } from 'mongoose';

export interface IReferralItem {
  citizenName: string;
  registrationDate: Date;
  plan: string;
  status: string;
  commissionEarned: number;
}

export interface IReferralProgramme extends Document {
  userId: mongoose.Types.ObjectId;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  bankConfirmed: boolean;
  termsAccepted: boolean;
  isJoined: boolean;
  referralCode: string;
  commissionRate: number;
  referralCount: number;
  activePremiumCount: number;
  totalEarnings: number;
  availablePayout: number;
  subscriptionEarnings: number;
  renewalEarnings: number;
  advertRevenue: number;
  nextPayoutDate: string;
  referralsList: IReferralItem[];
  cdhaProgress: {
    activePremiumAccount: string;
    cdhaTraining: string;
    capacityCurrent: number;
    capacityTotal: number;
    pdhoReferred: string;
    attachedPdho: string;
    enhancedCommissionStatus: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ReferralItemSchema = new Schema<IReferralItem>({
  citizenName: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  plan: { type: String, default: 'Premium' },
  status: { type: String, default: 'Active' },
  commissionEarned: { type: Number, default: 0 },
});

const ReferralProgrammeSchema = new Schema<IReferralProgramme>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accountHolderName: { type: String, required: true, trim: true },
    bankName: { type: String, required: true, trim: true },
    accountNumber: { type: String, required: true, trim: true },
    bankConfirmed: { type: Boolean, default: false },
    termsAccepted: { type: Boolean, default: false },
    isJoined: { type: Boolean, default: false },
    referralCode: { type: String, required: true, unique: true },
    commissionRate: { type: Number, default: 25 },
    referralCount: { type: Number, default: 0 },
    activePremiumCount: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    availablePayout: { type: Number, default: 0 },
    subscriptionEarnings: { type: Number, default: 0 },
    renewalEarnings: { type: Number, default: 0 },
    advertRevenue: { type: Number, default: 0 },
    nextPayoutDate: { type: String, default: '30 June 2025' },
    referralsList: [ReferralItemSchema],
    cdhaProgress: {
      activePremiumAccount: { type: String, default: 'Complete' },
      cdhaTraining: { type: String, default: 'Complete' },
      capacityCurrent: { type: Number, default: 0 },
      capacityTotal: { type: Number, default: 50 },
      pdhoReferred: { type: String, default: 'Complete' },
      attachedPdho: { type: String, default: 'Kisumu Health Hub' },
      enhancedCommissionStatus: { type: String, default: 'Pending' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IReferralProgramme>('ReferralProgramme', ReferralProgrammeSchema);
