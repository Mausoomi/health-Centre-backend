import mongoose, { Schema, Document } from 'mongoose';

export interface IMonitorReading {
  value: string;
  recordedAt: Date;
  note?: string;
  isPrimary?: boolean;
}

export interface ICareMonitor extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  category: 'Standard' | 'Custom';
  icon: string;
  unit: string;
  description?: string;
  measuredWhat?: string;
  enableThreshold: boolean;
  thresholdType?: string;
  thresholdValue?: string;
  status: 'active' | 'archived';
  readings: IMonitorReading[];
  createdAt: Date;
  updatedAt: Date;
}

const MonitorReadingSchema = new Schema<IMonitorReading>({
  value: { type: String, required: true },
  recordedAt: { type: Date, default: Date.now },
  note: { type: String },
  isPrimary: { type: Boolean, default: false },
});

const CareMonitorSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ['Standard', 'Custom'], default: 'Standard' },
    icon: { type: String, default: 'lucide:activity' },
    unit: { type: String, default: '' },
    description: { type: String },
    measuredWhat: { type: String },
    enableThreshold: { type: Boolean, default: false },
    thresholdType: { type: String },
    thresholdValue: { type: String },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    readings: [MonitorReadingSchema],
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICareMonitor>('CareMonitor', CareMonitorSchema);
