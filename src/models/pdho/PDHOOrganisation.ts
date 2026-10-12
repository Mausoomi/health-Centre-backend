import mongoose, { Schema, Document } from 'mongoose';

export interface IPDHOContactPerson {
  title?: string;
  otherTitle?: string;
  firstName: string;
  surname: string;
  email: string;
  role?: string;
  mobile?: string;
  relationship?: string;
}

export interface IPDHOOrganisationDetails {
  name: string;
  facilityType: string;
  registrationNumber: string;
  organisationEmail: string;
  telephone: string;
  website?: string;
  facilityReference?: string;
}

export interface IPDHOLocation {
  country: string;
  region: string;
  city: string;
  postcode: string;
  address: string;
}

export interface IPDHOOrganisation extends Document {
  userId?: mongoose.Types.ObjectId | string;
  contactPerson: IPDHOContactPerson;
  organisation: IPDHOOrganisationDetails;
  certificateFile?: string;
  location: IPDHOLocation;
  services?: Record<string, boolean>;
  googlePlaceId?: string;
  googleMapsListing?: string;
  referredByCdhaId?: mongoose.Types.ObjectId | string;
  referredByCdhaCode?: string;
  status: 'Draft' | 'Submitted' | 'Pending Verification' | 'Approved' | 'Active' | 'Rejected';
  rejectionReason?: string;
  approvedAt?: Date;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PDHOOrganisationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: false, index: true },
    contactPerson: {
      title: { type: String, default: '' },
      otherTitle: { type: String, default: '' },
      firstName: { type: String, required: true, trim: true },
      surname: { type: String, required: true, trim: true },
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      role: { type: String, default: '' },
      mobile: { type: String, default: '' },
      relationship: { type: String, default: '' },
    },
    organisation: {
      name: { type: String, required: true, trim: true },
      facilityType: { type: String, required: true },
      registrationNumber: { type: String, required: true, trim: true },
      organisationEmail: { type: String, required: true, lowercase: true, trim: true },
      telephone: { type: String, required: true },
      website: { type: String, default: '' },
      facilityReference: { type: String, default: '' },
    },
    certificateFile: { type: String, default: '' },
    location: {
      country: { type: String, required: true },
      region: { type: String, required: true },
      city: { type: String, required: true },
      postcode: { type: String, required: true },
      address: { type: String, required: true },
    },
    services: { type: Schema.Types.Mixed, default: {} },
    googlePlaceId: { type: String, default: '' },
    googleMapsListing: { type: String, default: '' },
    referredByCdhaId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    referredByCdhaCode: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Draft', 'Submitted', 'Pending Verification', 'Approved', 'Active', 'Rejected'],
      default: 'Pending Verification',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    approvedAt: { type: Date },
    approvedBy: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPDHOOrganisation>('PDHOOrganisation', PDHOOrganisationSchema);
