import mongoose, { Document, Schema } from 'mongoose';

export interface IAdminReportNote {
  id?: string;
  author: string;
  note: string;
  createdAt: Date;
}

export interface IReport extends Document {
  reportId: string;
  itemType: 'review' | 'news' | 'advert';
  itemId: string;
  itemTitle: string;
  itemContent: string;
  itemImage?: string;
  itemAuthor?: string;
  itemLocation?: string;
  reporterName: string;
  reporterEmail?: string;
  reasons: string[];
  note?: string;
  status: 'New' | 'Reviewing' | 'Resolved' | 'Dismissed';
  assignee?: string;
  actionTaken?: string;
  adminNotes: IAdminReportNote[];
  createdAt: Date;
  updatedAt: Date;
}

const AdminReportNoteSchema = new Schema<IAdminReportNote>(
  {
    id: { type: String, default: () => `note-${Date.now()}` },
    author: { type: String, default: 'Admin' },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReportSchema = new Schema<IReport>(
  {
    reportId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    itemType: {
      type: String,
      required: true,
      enum: ['review', 'news', 'advert'],
      index: true,
    },
    itemId: {
      type: String,
      required: true,
      index: true,
    },
    itemTitle: {
      type: String,
      required: true,
      trim: true,
      default: 'Untitled Item',
    },
    itemContent: {
      type: String,
      default: '',
    },
    itemImage: {
      type: String,
      default: '',
    },
    itemAuthor: {
      type: String,
      default: '',
    },
    itemLocation: {
      type: String,
      default: '',
    },
    reporterName: {
      type: String,
      default: 'Community Member',
    },
    reporterEmail: {
      type: String,
      default: '',
      trim: true,
    },
    reasons: {
      type: [String],
      default: ['Inappropriate Content'],
    },
    note: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['New', 'Reviewing', 'Resolved', 'Dismissed'],
      default: 'New',
      index: true,
    },
    assignee: {
      type: String,
      default: '',
    },
    actionTaken: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: [AdminReportNoteSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

ReportSchema.index({ createdAt: -1 });

export const Report = mongoose.model<IReport>('Report', ReportSchema);
