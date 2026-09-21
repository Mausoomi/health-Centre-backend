import { Schema, model, Document, Types } from 'mongoose';

export interface IAttachment {
  name: string;
  fileName?: string;
  date?: string;
  description?: string;
  fileUrl?: string;
  url?: string;
  type?: string;
  size?: string;
}

export interface ICondition {
  _id?: Types.ObjectId;
  name: string;
  status: 'Current' | 'Resolved' | 'Past' | 'In Remission' | string;
  recorded?: string;
  date?: string;
  approx?: boolean;
  notes?: string;
  privacy: 'Standard' | 'Private';
  attachments?: IAttachment[];
}

export interface IFamilyHistory {
  _id?: Types.ObjectId;
  condition: string;
  relationship: string;
  onsetAge?: string;
  status?: string;
  notes?: string;
  privacy: 'Standard' | 'Private';
}

export interface ISocialHabit {
  _id?: Types.ObjectId;
  category: string;
  type: string;
  status: string;
  details?: string;
  frequency?: string;
  notes?: string;
  updated?: string;
  privacy: 'Standard' | 'Private';
}

export interface IDisability {
  _id?: Types.ObjectId;
  title?: string;
  name?: string;
  type?: string;
  status: string;
  onset?: string;
  recordedDate?: string;
  impact?: string;
  accommodations?: string;
  aids?: string;
  notes?: string;
  privacy: 'Standard' | 'Private';
  attachments?: IAttachment[];
}

export interface IAllergy {
  _id?: Types.ObjectId;
  name: string;
  allergen?: string;
  type: string;
  severity: 'Mild' | 'Moderate' | 'Severe';
  severityLabel?: string;
  status: 'Active' | 'Inactive';
  reaction?: string;
  diagnosedDate?: string;
  onset?: string;
  notes?: string;
  privacy: 'Standard' | 'Private';
  attachments?: IAttachment[];
}

export interface IImmunisation {
  _id?: Types.ObjectId;
  name: string;
  vaccineName?: string;
  date?: string;
  dateAdministered?: string;
  batchNumber?: string;
  provider?: string;
  administeredBy?: string;
  notes?: string;
  recent?: boolean;
  upcoming?: boolean;
  privacy: 'Standard' | 'Private';
  attachments?: IAttachment[];
}

export interface IOperation {
  _id?: Types.ObjectId;
  name: string;
  procedureName?: string;
  hospital?: string;
  facility?: string;
  surgeon?: string;
  date?: string;
  reason?: string;
  outcome?: string;
  notes?: string;
  recoveryNotes?: string;
  attachments?: IAttachment[];
  recent?: boolean;
  privacy: 'Standard' | 'Private';
}

export interface IHospitalAdmission {
  _id?: Types.ObjectId;
  hospital: string;
  hospitalName?: string;
  reason: string;
  admissionReason?: string;
  admissionDate?: string;
  dischargeDate?: string;
  date?: string;
  attendingDoctor?: string;
  outcome?: string;
  notes?: string;
  dischargeSummary?: string;
  attachments?: IAttachment[];
  recent?: boolean;
  privacy: 'Standard' | 'Private';
}

export interface IBloodPressureLog {
  _id?: Types.ObjectId;
  date: string;
  time?: string;
  systolic: number;
  diastolic: number;
  pulse?: number;
  category?: string;
  notes?: string;
  arm?: string;
  device?: string;
  privacy?: 'Standard' | 'Private';
  attachments?: IAttachment[];
}

export interface IWeightHeightLog {
  _id?: Types.ObjectId;
  date: string;
  weightKg: number;
  heightCm: number;
  bmi: number;
  category?: string;
  notes?: string;
  privacy?: 'Standard' | 'Private';
  attachments?: IAttachment[];
}

export interface IMedicalDocument {
  _id?: Types.ObjectId;
  title: string;
  category: string;
  dateUploaded: string;
  fileName: string;
  fileSize?: string;
  fileUrl?: string;
  uploadedBy?: string;
  privacy: 'Standard' | 'Private';
}

export interface ICareRecord extends Document {
  userId: Types.ObjectId;
  patientDetails: {
    name?: string;
    memberId?: string;
    nhsNumber?: string;
    dateOfBirth?: string;
    dob?: string;
    age?: number;
    sex?: string;
    gender?: string;
    phone?: string;
    email?: string;
    address?: string;
    postcode?: string;
    marital?: string;
    bloodGroup?: string;
    blood?: string;
    rh?: string;
    genotype?: string;
    religion?: string;
    ethnicity?: string;
    nationality?: string;
    country?: string;
    region?: string;
    state?: string;
    passportNumber?: string;
    nationalId?: string;
    contactName?: string;
    relationship?: string;
    contactPhone?: string;
    referralCode?: string;
    isPrivate?: boolean;
    notes?: string;
    children?: Array<{ gender: string; dob: string; approx?: boolean }>;
    emergencyContact?: {
      name?: string;
      relationship?: string;
      phone?: string;
      email?: string;
    };
    gpDetails?: {
      practiceName?: string;
      doctorName?: string;
      phone?: string;
      address?: string;
    };
    plan?: string;
    planExpiry?: string;
    avatar?: string;
    attachments?: IAttachment[];
  };
  conditions: ICondition[];
  familyHistory: IFamilyHistory[];
  socialHabits: ISocialHabit[];
  disabilities: IDisability[];
  allergies: IAllergy[];
  immunisations: IImmunisation[];
  operations: IOperation[];
  hospitalAdmissions: IHospitalAdmission[];
  bloodPressureLogs: IBloodPressureLog[];
  weightHeightLogs: IWeightHeightLog[];
  documents: IMedicalDocument[];
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>(
  {
    name: { type: String, required: true },
    fileName: { type: String },
    date: { type: String },
    description: { type: String },
    fileUrl: { type: String },
    url: { type: String },
    type: { type: String, default: 'file' },
    size: { type: String },
  },
  { _id: false }
);

const ConditionSchema = new Schema<ICondition>({
  name: { type: String, required: true },
  status: { type: String, enum: ['Current', 'Resolved', 'Past', 'In Remission'], default: 'Current' },
  recorded: { type: String },
  date: { type: String },
  approx: { type: Boolean, default: false },
  notes: { type: String, default: '' },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
  attachments: [AttachmentSchema],
});

const FamilyHistorySchema = new Schema<IFamilyHistory>({
  condition: { type: String, required: true },
  relationship: { type: String, required: true },
  onsetAge: { type: String },
  status: { type: String, default: 'Living' },
  notes: { type: String, default: '' },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
});

const SocialHabitSchema = new Schema<ISocialHabit>({
  category: { type: String, required: true },
  type: { type: String, required: true },
  status: { type: String, required: true },
  details: { type: String },
  frequency: { type: String },
  notes: { type: String, default: '' },
  updated: { type: String },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
});

const DisabilitySchema = new Schema<IDisability>({
  title: { type: String, default: '' },
  name: { type: String, default: '' },
  type: { type: String, default: 'General' },
  status: { type: String, default: 'Current' },
  onset: { type: String },
  recordedDate: { type: String },
  impact: { type: String },
  accommodations: { type: String },
  aids: { type: String },
  notes: { type: String, default: '' },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
  attachments: [AttachmentSchema],
});

const AllergySchema = new Schema<IAllergy>({
  name: { type: String, required: true },
  allergen: { type: String },
  type: { type: String, default: 'General' },
  severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Moderate' },
  severityLabel: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  reaction: { type: String },
  diagnosedDate: { type: String },
  onset: { type: String },
  notes: { type: String, default: '' },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
  attachments: [AttachmentSchema],
});

const ImmunisationSchema = new Schema<IImmunisation>({
  name: { type: String, required: true },
  vaccineName: { type: String },
  date: { type: String },
  dateAdministered: { type: String },
  batchNumber: { type: String },
  provider: { type: String },
  administeredBy: { type: String },
  notes: { type: String, default: '' },
  recent: { type: Boolean, default: false },
  upcoming: { type: Boolean, default: false },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
  attachments: [AttachmentSchema],
});

const OperationSchema = new Schema<IOperation>({
  name: { type: String, required: true },
  procedureName: { type: String },
  hospital: { type: String },
  facility: { type: String },
  surgeon: { type: String },
  date: { type: String },
  reason: { type: String },
  outcome: { type: String },
  notes: { type: String, default: '' },
  recoveryNotes: { type: String },
  attachments: [AttachmentSchema],
  recent: { type: Boolean, default: false },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
});

const HospitalAdmissionSchema = new Schema<IHospitalAdmission>({
  hospital: { type: String, required: true },
  hospitalName: { type: String },
  reason: { type: String, required: true },
  admissionReason: { type: String },
  admissionDate: { type: String },
  dischargeDate: { type: String },
  date: { type: String },
  attendingDoctor: { type: String },
  outcome: { type: String },
  notes: { type: String, default: '' },
  dischargeSummary: { type: String },
  attachments: [AttachmentSchema],
  recent: { type: Boolean, default: false },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
});

const BloodPressureLogSchema = new Schema<IBloodPressureLog>({
  date: { type: String, required: true },
  time: { type: String },
  systolic: { type: Number, required: true },
  diastolic: { type: Number, required: true },
  pulse: { type: Number },
  category: { type: String },
  notes: { type: String, default: '' },
  arm: { type: String, default: 'Left Arm' },
  device: { type: String, default: 'Home Monitor' },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
  attachments: [AttachmentSchema],
});

const WeightHeightLogSchema = new Schema<IWeightHeightLog>({
  date: { type: String, required: true },
  weightKg: { type: Number, required: true },
  heightCm: { type: Number, required: true },
  bmi: { type: Number, required: true },
  category: { type: String },
  notes: { type: String, default: '' },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
  attachments: [AttachmentSchema],
});

const MedicalDocumentSchema = new Schema<IMedicalDocument>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  dateUploaded: { type: String, default: () => new Date().toISOString().split('T')[0] },
  fileName: { type: String, required: true },
  fileSize: { type: String },
  fileUrl: { type: String },
  uploadedBy: { type: String },
  privacy: { type: String, enum: ['Standard', 'Private'], default: 'Standard' },
});

const CareRecordSchema = new Schema<ICareRecord>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    patientDetails: {
      name: { type: String, default: '' },
      memberId: { type: String, default: '' },
      nhsNumber: { type: String, default: '' },
      dateOfBirth: { type: String, default: '' },
      dob: { type: String, default: '' },
      age: { type: Number },
      gender: { type: String, default: '' },
      sex: { type: String, default: '' },
      bloodGroup: { type: String, default: '' },
      blood: { type: String, default: '' },
      rh: { type: String, default: '' },
      genotype: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
      address: { type: String, default: '' },
      marital: { type: String, default: '' },
      country: { type: String, default: '' },
      region: { type: String, default: '' },
      religion: { type: String, default: '' },
      contactName: { type: String, default: '' },
      relationship: { type: String, default: '' },
      contactPhone: { type: String, default: '' },
      referralCode: { type: String, default: '' },
      isPrivate: { type: Boolean, default: false },
      notes: { type: String, default: '' },
      children: [
        {
          gender: { type: String },
          dob: { type: String },
          approx: { type: Boolean, default: false },
        },
      ],
      emergencyContact: {
        name: { type: String, default: '' },
        relationship: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
      },
      gpDetails: {
        practiceName: { type: String, default: '' },
        doctorName: { type: String, default: '' },
        phone: { type: String, default: '' },
        address: { type: String, default: '' },
      },
      plan: { type: String, default: 'Standard Digital Health' },
      planExpiry: { type: String, default: '' },
      avatar: { type: String, default: '' },
      attachments: [AttachmentSchema],
    },
    conditions: [ConditionSchema],
    familyHistory: [FamilyHistorySchema],
    socialHabits: [SocialHabitSchema],
    disabilities: [DisabilitySchema],
    allergies: [AllergySchema],
    immunisations: [ImmunisationSchema],
    operations: [OperationSchema],
    hospitalAdmissions: [HospitalAdmissionSchema],
    bloodPressureLogs: [BloodPressureLogSchema],
    weightHeightLogs: [WeightHeightLogSchema],
    documents: [MedicalDocumentSchema],
  },
  {
    timestamps: true,
  }
);

export const CareRecord = model<ICareRecord>('CareRecord', CareRecordSchema);
