import mongoose, { Schema, Document } from 'mongoose';

export interface ICitizenSupportRelationship extends Document {
  cdhaUserId: mongoose.Types.ObjectId | string;
  citizenUserId?: mongoose.Types.ObjectId | string;
  citizenCode: string;
  citizenName: string;
  pdhoId?: mongoose.Types.ObjectId | string;
  pdhoName: string;
  supportArea: string;
  source: string;
  status: 'Active' | 'Inactive';
  lastActivity: string;
  createdAt: Date;
  updatedAt: Date;
}

const CitizenSupportRelationshipSchema: Schema = new Schema(
  {
    cdhaUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    citizenUserId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    citizenCode: { type: String, required: true, trim: true },
    citizenName: { type: String, required: true, trim: true },
    pdhoId: { type: Schema.Types.ObjectId, ref: 'PDHOOrganisation', index: true },
    pdhoName: { type: String, default: 'None' },
    supportArea: { type: String, default: 'CareMonitor' },
    source: { type: String, default: 'CDHA referral' },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
    lastActivity: { type: String, default: 'Just now' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICitizenSupportRelationship>('CitizenSupportRelationship', CitizenSupportRelationshipSchema);
