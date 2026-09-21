import { Schema, model, Document, Types } from 'mongoose';

export interface ICareChatReportRef {
  title: string;
  source?: string;
  category?: string;
  date?: string;
}

export interface ICareChatShare extends Document {
  userId: Types.ObjectId;
  shareId: string;
  name: string;
  reports: ICareChatReportRef[];
  status: 'Shared' | 'Share Initiated' | 'Pending Confirmation';
  channel: string;
  date: string;
  confirmed: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CareChatReportRefSchema = new Schema<ICareChatReportRef>(
  {
    title: { type: String, required: true },
    source: { type: String },
    category: { type: String },
    date: { type: String },
  },
  { _id: false }
);

const CareChatShareSchema = new Schema<ICareChatShare>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shareId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    reports: [CareChatReportRefSchema],
    status: {
      type: String,
      enum: ['Shared', 'Share Initiated', 'Pending Confirmation'],
      default: 'Share Initiated',
    },
    channel: { type: String, default: 'WhatsApp' },
    date: { type: String, default: () => new Date().toISOString() },
    confirmed: { type: Boolean, default: false },
    notes: { type: String, default: '' },
  },
  {
    timestamps: true,
  }
);

export const CareChatShare = model<ICareChatShare>('CareChatShare', CareChatShareSchema);
