import mongoose, { Schema, Document } from 'mongoose';

export interface IPDHOAffiliation extends Document {
  cdhaUserId: mongoose.Types.ObjectId | string;
  pdhoName: string;
  status: 'Not Applied' | 'Pending' | 'Active' | 'Rejected' | 'Ended';
  createdAt: Date;
  updatedAt: Date;
}

const PDHOAffiliationSchema: Schema = new Schema(
  {
    cdhaUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pdhoName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['Not Applied', 'Pending', 'Active', 'Rejected', 'Ended'], default: 'Pending' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPDHOAffiliation>('PDHOAffiliation', PDHOAffiliationSchema);
