import { Schema, model, Document, Types } from 'mongoose';

export interface ISymptomAttachment {
  name: string;
  fileName?: string;
  date?: string;
  note?: string;
  description?: string;
  fileUrl?: string;
  url?: string;
  type?: string;
  mimeType?: string;
}

export interface IAssociatedSymptom {
  name: string;
  severity?: string;
  notes?: string;
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
  symptomName?: string;
  onsetDate?: string;
  onsetTime?: string;
  startType?: string;
  onset?: string;
  duration?: string;
  durationValue?: string;
  durationUnit?: string;
  location?: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | number;
  severityLabel?: string;
  progression?: string;
  description: string;
  makesWorse?: string;
  makesBetter?: string;
  hasAssociated?: boolean;
  associatedSymptoms?: string;
  associatedSymptomsList?: IAssociatedSymptom[];
  impactActivities?: string[];
  impactLevel?: string;
  impactNotes?: string;
  impact?: string;
  hadBefore?: string;
  previousAction?: string;
  didItHelp?: string;
  previousEpisodes?: string;
  triedAnything?: string;
  triedWhat?: string;
  actionsTaken?: string;
  currentConditions?: string;
  currentMedication?: string;
  allergies?: string;
  helpSeeking?: string;
  worriedAbout?: string;
  userConcern?: string;
  notes?: string;
  attachment?: ISymptomAttachment;
  attachments?: ISymptomAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const SymptomAttachmentSchema = new Schema<ISymptomAttachment>(
  {
    name: { type: String, required: true },
    fileName: { type: String },
    date: { type: String },
    note: { type: String },
    description: { type: String },
    fileUrl: { type: String },
    url: { type: String },
    type: { type: String },
    mimeType: { type: String },
  },
  { _id: false }
);

const AssociatedSymptomSchema = new Schema<IAssociatedSymptom>(
  {
    name: { type: String },
    severity: { type: String, default: 'Moderate' },
    notes: { type: String, default: '' },
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
    symptomName: { type: String },
    onsetDate: { type: String },
    onsetTime: { type: String },
    startType: { type: String },
    onset: { type: String },
    duration: { type: String },
    durationValue: { type: String },
    durationUnit: { type: String },
    location: { type: String },
    severity: { type: Schema.Types.Mixed, default: 'Moderate' },
    severityLabel: { type: String },
    progression: { type: String },
    description: { type: String, default: '' },
    makesWorse: { type: String },
    makesBetter: { type: String },
    hasAssociated: { type: Boolean, default: false },
    associatedSymptoms: { type: String },
    associatedSymptomsList: [AssociatedSymptomSchema],
    impactActivities: [{ type: String }],
    impactLevel: { type: String },
    impactNotes: { type: String },
    impact: { type: String },
    hadBefore: { type: String },
    previousAction: { type: String },
    didItHelp: { type: String },
    previousEpisodes: { type: String },
    triedAnything: { type: String },
    triedWhat: { type: String },
    actionsTaken: { type: String },
    currentConditions: { type: String },
    currentMedication: { type: String },
    allergies: { type: String },
    helpSeeking: { type: String },
    worriedAbout: { type: String },
    userConcern: { type: String },
    notes: { type: String, default: '' },
    attachment: SymptomAttachmentSchema,
    attachments: [SymptomAttachmentSchema],
  },
  {
    timestamps: true,
  }
);

export const SymptomReport = model<ISymptomReport>('SymptomReport', SymptomReportSchema);
