import { Schema, model, Document, Types } from 'mongoose';

export interface IFeaturePermission {
  featureName: string;
  rights: string[];
}

export interface ICareSecureAuditLog {
  _id?: Types.ObjectId;
  title: string;
  detail: string;
  timestamp: string;
  performedBy?: string;
}

export interface ICareSecureGrant extends Document {
  userId: Types.ObjectId;
  accessId: string;
  name: string;
  type: string;
  organisation: string;
  purpose: string;
  reason?: string;
  accessLevel: 'View Only' | 'Support' | 'Full';
  granted: string;
  grantedAt: string;
  expires: string;
  status: 'Active' | 'Pending Verification' | 'Expired' | 'Revoked';
  invitationMethod: string;
  recipientContact?: string;
  otpCode?: string;
  otpExpiresAt?: Date;
  featurePermissions: IFeaturePermission[];
  auditLogs: ICareSecureAuditLog[];
  createdAt: Date;
  updatedAt: Date;
}

const FeaturePermissionSchema = new Schema<IFeaturePermission>(
  {
    featureName: { type: String, required: true },
    rights: [{ type: String }],
  },
  { _id: false }
);

const CareSecureAuditLogSchema = new Schema<ICareSecureAuditLog>(
  {
    title: { type: String, required: true },
    detail: { type: String, required: true },
    timestamp: { type: String, default: () => new Date().toISOString() },
    performedBy: { type: String, default: 'Patient' },
  },
  { timestamps: true }
);

const CareSecureGrantSchema = new Schema<ICareSecureGrant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    accessId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, default: 'Healthcare Professional' },
    organisation: { type: String, default: '' },
    purpose: { type: String, default: 'Ongoing care' },
    reason: { type: String, default: '' },
    accessLevel: { type: String, enum: ['View Only', 'Support', 'Full'], default: 'Support' },
    granted: { type: String, default: () => new Date().toLocaleDateString('en-GB') },
    grantedAt: { type: String, default: () => new Date().toLocaleString() },
    expires: { type: String, required: true },
    status: {
      type: String,
      enum: ['Active', 'Pending Verification', 'Expired', 'Revoked'],
      default: 'Pending Verification',
    },
    invitationMethod: { type: String, default: 'WhatsApp secure link sent · Mobile OTP pending' },
    recipientContact: { type: String, default: '' },
    otpCode: { type: String },
    otpExpiresAt: { type: Date },
    featurePermissions: [FeaturePermissionSchema],
    auditLogs: [CareSecureAuditLogSchema],
  },
  {
    timestamps: true,
  }
);

export const CareSecureGrant = model<ICareSecureGrant>('CareSecureGrant', CareSecureGrantSchema);
