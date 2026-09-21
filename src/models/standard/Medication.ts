import { Schema, model, Document, Types } from 'mongoose';

export interface IDoseHistoryLog {
  _id?: Types.ObjectId;
  time: string;
  recordTime: string;
  status: 'Taken' | 'Late Dose' | 'Missed Dose';
  notes?: string;
}

export interface IMedicationAttachment {
  name: string;
  fileName?: string;
  date?: string;
  note?: string;
  description?: string;
  type?: string;
  url?: string;
  fileUrl?: string;
  size?: string;
}

export interface IMedication extends Document {
  userId: Types.ObjectId;
  medicationId: string;
  name: string;
  strength?: string;
  form?: string;
  dose?: string;
  frequency?: string;
  route?: string;
  foodInstruction?: string;
  startDate?: string;
  endDate?: string;
  reason?: string;
  prescriber?: string;
  instructions?: string;
  refillRemaining?: string;
  category?: string;
  notes?: string;
  status: 'Current' | 'Previous';
  isPrivate: boolean;
  reminder: {
    enabled: boolean;
    times: string[];
    days: string[];
  };
  recentHistory: IDoseHistoryLog[];
  attachments: IMedicationAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const DoseHistoryLogSchema = new Schema<IDoseHistoryLog>(
  {
    time: { type: String, required: true },
    recordTime: { type: String, default: () => `Recorded ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` },
    status: { type: String, enum: ['Taken', 'Late Dose', 'Missed Dose'], default: 'Taken' },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

const MedicationAttachmentSchema = new Schema<IMedicationAttachment>(
  {
    name: { type: String, required: true },
    fileName: { type: String },
    date: { type: String },
    note: { type: String },
    description: { type: String },
    type: { type: String },
    url: { type: String },
    fileUrl: { type: String },
    size: { type: String },
  },
  { _id: false }
);

const MedicationSchema = new Schema<IMedication>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    medicationId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    strength: { type: String, default: '' },
    form: { type: String, default: 'Tablet' },
    dose: { type: String, default: '' },
    frequency: { type: String, default: '' },
    route: { type: String, default: 'Oral' },
    foodInstruction: { type: String, default: '' },
    startDate: { type: String, default: '' },
    endDate: { type: String, default: '' },
    reason: { type: String, default: '' },
    prescriber: { type: String, default: '' },
    instructions: { type: String, default: '' },
    refillRemaining: { type: String, default: '' },
    category: { type: String, default: 'General' },
    notes: { type: String, default: '' },
    status: { type: String, enum: ['Current', 'Previous'], default: 'Current' },
    isPrivate: { type: Boolean, default: false },
    reminder: {
      enabled: { type: Boolean, default: false },
      times: [{ type: String }],
      days: [{ type: String }],
    },
    recentHistory: [DoseHistoryLogSchema],
    attachments: [MedicationAttachmentSchema],
  },
  {
    timestamps: true,
  }
);

export const Medication = model<IMedication>('Medication', MedicationSchema);
