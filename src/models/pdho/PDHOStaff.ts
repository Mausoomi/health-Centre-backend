import mongoose, { Schema, Document } from 'mongoose';

export interface IPDHOStaff extends Document {
  pdhoId: mongoose.Types.ObjectId | string;
  pdhoName: string;
  firstName: string;
  surname: string;
  email: string;
  mobile?: string;
  role: string;
  status: 'Active' | 'Inactive' | 'Invitation pending';
  authorised: boolean;
  dateAdded: string;
  lastAccess: string;
  createdAt: Date;
  updatedAt: Date;
}

const PDHOStaffSchema: Schema = new Schema(
  {
    pdhoId: { type: Schema.Types.ObjectId, ref: 'PDHOOrganisation', required: true, index: true },
    pdhoName: { type: String, required: true, trim: true },
    firstName: { type: String, required: true, trim: true },
    surname: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    mobile: { type: String, default: '' },
    role: { type: String, default: 'Digital Health Staff' },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Invitation pending'],
      default: 'Active',
      index: true,
    },
    authorised: { type: Boolean, default: true },
    dateAdded: {
      type: String,
      default: () =>
        new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    lastAccess: { type: String, default: 'Just now' },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IPDHOStaff>('PDHOStaff', PDHOStaffSchema);
