import { Schema, model, Document, Types } from 'mongoose';

export interface ITestResultItem {
  _id?: Types.ObjectId;
  resultId?: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  status?: string;
}

export interface ILabAttachment {
  name: string;
  date?: string;
  description?: string;
  originalFilename?: string;
  mimeType?: string;
  fileUrl?: string;
  size?: string;
}

export interface ILabTest extends Document {
  userId: Types.ObjectId;
  labReportId: string;
  reportName: string;
  testDate: string;
  laboratoryProvider?: string;
  requestedBy?: string;
  reportSource?: string;
  notes?: string;
  findingsSummary?: string;
  isPrivate: boolean;
  approximateDate: boolean;
  status: 'Completed' | 'Pending Review' | 'In Progress';
  results: ITestResultItem[];
  attachments: ILabAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

const TestResultItemSchema = new Schema<ITestResultItem>(
  {
    resultId: { type: String },
    testName: { type: String, required: true },
    value: { type: String, required: true },
    unit: { type: String, default: '' },
    referenceRange: { type: String, default: '' },
    status: { type: String, default: 'Normal' },
  },
  { _id: true }
);

const LabAttachmentSchema = new Schema<ILabAttachment>(
  {
    name: { type: String, required: true },
    date: { type: String },
    description: { type: String },
    originalFilename: { type: String },
    mimeType: { type: String },
    fileUrl: { type: String },
    size: { type: String },
  },
  { _id: false }
);

const LabTestSchema = new Schema<ILabTest>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    labReportId: { type: String, required: true, unique: true, index: true },
    reportName: { type: String, required: true },
    testDate: { type: String, required: true },
    laboratoryProvider: { type: String, default: '' },
    requestedBy: { type: String, default: '' },
    reportSource: { type: String, default: 'Laboratory' },
    notes: { type: String, default: '' },
    findingsSummary: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    approximateDate: { type: Boolean, default: false },
    status: { type: String, enum: ['Completed', 'Pending Review', 'In Progress'], default: 'Completed' },
    results: [TestResultItemSchema],
    attachments: [LabAttachmentSchema],
  },
  {
    timestamps: true,
  }
);

export const LabTest = model<ILabTest>('LabTest', LabTestSchema);
