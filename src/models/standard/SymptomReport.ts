import { Schema, model, Document, Types } from 'mongoose';

export interface ISymptomAttachment {
  name: string;
  date?: string;
  note?: string;
  fileUrl?: string;
  mimeType?: string;
}

export interface ISymptomReport extends Document {
  userId: Types.ObjectId;
  reportId: string;
  title: string;
  reportDate: string;
  reportTime?: string;
  status: 'New' | 'Treating' | 'Treated' | 'Cleared';
  sharingState: 'Not Shared' | 'Shared' | 'Pending';
  isPrivate: boolean;
  onset?: string;
  duration?: string;
  location?: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | number;
  severityLabel?: string;
  progression?: string;
  description: string;
  associatedSymptoms?: string;
  impact?: string;
  previousEpisodes?: string;
  actionsTaken?: string;
  currentConditions?: string;
  currentMedication?: string;
  allergies?: string;
  userConcern?: string;
  notes?: string;
  attachment?: ISymptomAttachment;
  createdAt: Date;
  updatedAt: Date;
}

const SymptomAttachmentSchema = new Schema<ISymptomAttachment>(
  {
    name: { type: String, required: true },
    date: { type: String },
    note: { type: String },
    fileUrl: { type: String },
    mimeType: { type: String },
  },
  { _id: false }
);

const SymptomReportSchema = new Schema<ISymptomReport>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reportId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    reportDate: { type: String, required: true },
    reportTime: { type: String },
    status: {
      type: String,
      enum: ['New', 'Treating', 'Treated', 'Cleared'],
      default: 'Treating',
    },
    sharingState: {
      type: String,
      enum: ['Not Shared', 'Shared', 'Pending'],
      default: 'Not Shared',
    },
    isPrivate: { type: Boolean, default: false },
    onset: { type: String },
    duration: { type: String },
    location: { type: String },
    severity: { type: Schema.Types.Mixed, default: 'Moderate' },
    severityLabel: { type: String },
    progression: { type: String },
    description: { type: String, default: '' },
    associatedSymptoms: { type: String },
    impact: { type: String },
    previousEpisodes: { type: String },
    actionsTaken: { type: String },
    currentConditions: { type: String },
    currentMedication: { type: String },
    allergies: { type: String },
    userConcern: { type: String },
    notes: { type: String, default: '' },
    attachment: SymptomAttachmentSchema,
  },
  {
    timestamps: true,
  }
);

export const SymptomReport = model<ISymptomReport>('SymptomReport', SymptomReportSchema);
