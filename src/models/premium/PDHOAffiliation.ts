import mongoose, { Schema, Document } from 'mongoose';

export interface IPDHOAffiliation extends Document {
  cdhaUserId: mongoose.Types.ObjectId | string;
  pdhoId?: mongoose.Types.ObjectId | string;
  pdhoName: string;
  status: 'None' | 'Pending' | 'Active' | 'Declined' | 'Ended';
  referredByThisCdha?: boolean;
  requestedAt?: Date;
  respondedAt?: Date;
  endedAt?: Date;
  endedBy?: 'CDHA' | 'PDHO';
  createdAt: Date;
  updatedAt: Date;
}

const PDHOAffiliationSchema: Schema = new Schema(
  {
    cdhaUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    pdhoId: { type: Schema.Types.ObjectId, ref: 'PDHOOrganisation', index: true },
    pdhoName: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['None', 'Pending', 'Active', 'Declined', 'Ended'],
      default: 'Pending',
      index: true,
    },
    referredByThisCdha: { type: Boolean, default: false },
    requestedAt: { type: Date, default: Date.now },
    respondedAt: { type: Date },
    endedAt: { type: Date },
    endedBy: { type: String, enum: ['CDHA', 'PDHO'] },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPDHOAffiliation>('PDHOAffiliation', PDHOAffiliationSchema);
