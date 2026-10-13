import mongoose, { Schema, Document } from 'mongoose';

export interface IChildGrowthMeasurement {
  date: Date;
  weightKg: number;
  lengthCm?: number;
  headCircumferenceCm?: number;
  notes?: string;
  measuredBy?: string;
}

export interface IChildImmunisationRecord {
  _id?: any;
  vaccineName: string;
  doseNumber?: string;
  status: 'Due now' | 'Upcoming' | 'Completed' | 'Overdue';
  dueDate?: Date;
  administeredDate?: Date;
  administeredLocation?: string;
  notes?: string;
}

export interface IChildProfile extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  middleName?: string;
  surname: string;
  dob: Date;
  sex: 'Male' | 'Female' | 'Other';
  relationship: string;
  country: string;
  stateRegion?: string;
  reference?: string;
  placeOfBirth?: string;
  birthWeightKg?: number;
  gestationWeeks?: number;
  growthStatus: string;
  newbornCareNote?: string;
  growthMeasurements: IChildGrowthMeasurement[];
  immunisationRecords: IChildImmunisationRecord[];
  paymentStatus?: 'Paid' | 'Pending' | 'Free';
  paymentReference?: string;
  paymentAmount?: number;
  paymentCurrency?: string;
  paymentDate?: Date;
  subscriptionRenewalDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ChildGrowthMeasurementSchema = new Schema<IChildGrowthMeasurement>({
  date: { type: Date, default: Date.now },
  weightKg: { type: Number, required: true },
  lengthCm: { type: Number },
  headCircumferenceCm: { type: Number },
  notes: { type: String },
  measuredBy: { type: String, default: 'Parent' },
});

const ChildImmunisationRecordSchema = new Schema<IChildImmunisationRecord>({
  vaccineName: { type: String, required: true },
  doseNumber: { type: String },
  status: { type: String, enum: ['Due now', 'Upcoming', 'Completed', 'Overdue'], default: 'Upcoming' },
  dueDate: { type: Date },
  administeredDate: { type: Date },
  administeredLocation: { type: String },
  notes: { type: String },
});

const ChildProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    surname: { type: String, required: true, trim: true },
    dob: { type: Date, required: true },
    sex: { type: String, enum: ['Male', 'Female', 'Other'], required: true },
    relationship: { type: String, default: 'Parent' },
    country: { type: String, default: 'Ghana' },
    stateRegion: { type: String },
    reference: { type: String },
    placeOfBirth: { type: String },
    birthWeightKg: { type: Number },
    gestationWeeks: { type: Number },
    growthStatus: { type: String, default: 'On track' },
    newbornCareNote: { type: String },
    growthMeasurements: [ChildGrowthMeasurementSchema],
    immunisationRecords: [ChildImmunisationRecordSchema],
    paymentStatus: { type: String, enum: ['Paid', 'Pending', 'Free'], default: 'Paid' },
    paymentReference: { type: String },
    paymentAmount: { type: Number, default: 6000 },
    paymentCurrency: { type: String, default: 'NGN' },
    paymentDate: { type: Date, default: Date.now },
    subscriptionRenewalDate: { type: Date },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IChildProfile>('ChildProfile', ChildProfileSchema);
