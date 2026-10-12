import mongoose, { Schema, Document } from 'mongoose';

export interface ICDHACertificate extends Document {
  userId: mongoose.Types.ObjectId | string;
  certificateNumber: string;
  courseName: string;
  trainingCompleted: boolean;
  trainingCompletedAt?: Date;
  roleActivated: boolean;
  roleActivatedAt?: Date;
  isRevoked: boolean;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CDHACertificateSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certificateNumber: { type: String, required: true, unique: true, trim: true },
    courseName: { type: String, default: 'HealthCentreApp Community Digital Health Assistant (CDHA) Training' },
    trainingCompleted: { type: Boolean, default: true },
    trainingCompletedAt: { type: Date, default: Date.now },
    roleActivated: { type: Boolean, default: false },
    roleActivatedAt: { type: Date },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICDHACertificate>('CDHACertificate', CDHACertificateSchema);
