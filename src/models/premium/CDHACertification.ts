import mongoose, { Schema, Document } from 'mongoose';

export interface ICDHACertification extends Document {
  userId: mongoose.Types.ObjectId | string;
  certificateRef: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  createdAt: Date;
  updatedAt: Date;
}

const CDHACertificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    certificateRef: { type: String, required: true, trim: true },
    verificationStatus: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Verified' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICDHACertification>('CDHACertification', CDHACertificationSchema);
