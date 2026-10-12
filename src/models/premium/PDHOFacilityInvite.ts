import mongoose, { Schema, Document } from 'mongoose';

export interface IPDHOFacilityInvite extends Document {
  cdhaUserId: mongoose.Types.ObjectId | string;
  facilityName: string;
  googlePlaceId?: string;
  googleMapsListing?: string;
  address?: string;
  facilityEmail?: string;
  facilityPhone?: string;
  inviteCode: string;
  status: 'Pending' | 'Registered' | 'Verified';
  registeredPdhoId?: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const PDHOFacilityInviteSchema: Schema = new Schema(
  {
    cdhaUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    facilityName: { type: String, required: true, trim: true },
    googlePlaceId: { type: String, trim: true },
    googleMapsListing: { type: String, trim: true },
    address: { type: String, trim: true },
    facilityEmail: { type: String, trim: true, lowercase: true },
    facilityPhone: { type: String, trim: true },
    inviteCode: { type: String, required: true, unique: true, trim: true },
    status: {
      type: String,
      enum: ['Pending', 'Registered', 'Verified'],
      default: 'Pending',
      index: true,
    },
    registeredPdhoId: { type: Schema.Types.ObjectId, ref: 'PDHOOrganisation' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPDHOFacilityInvite>('PDHOFacilityInvite', PDHOFacilityInviteSchema);
