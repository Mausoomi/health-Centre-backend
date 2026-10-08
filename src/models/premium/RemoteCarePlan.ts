import mongoose, { Schema, Document } from 'mongoose';

export interface IRecipient {
  name: string;
  relationship: string;
  method: string;
}

export interface IRemoteCarePlan extends Document {
  userId: mongoose.Types.ObjectId | string;
  planName: string;
  triggerType: 'scheduled' | 'event';
  scheduleType?: 'daily' | 'selected-days' | 'one-off';
  selectedDays?: string[];
  scheduleDate?: string;
  scheduleTime?: string;
  eventMonitor?: string;
  status: 'Active' | 'Paused' | 'Ended';
  recipients: IRecipient[];
  selectedAction?: string;
  customActionText?: string;
  lastTriggered?: string;
  nextTrigger?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecipientSchema = new Schema<IRecipient>({
  name: { type: String, required: true },
  relationship: { type: String, required: true },
  method: { type: String, default: 'Phone' },
});

const RemoteCarePlanSchema = new Schema<IRemoteCarePlan>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planName: { type: String, required: true },
    triggerType: { type: String, enum: ['scheduled', 'event'], default: 'scheduled' },
    scheduleType: { type: String, enum: ['daily', 'selected-days', 'one-off'], default: 'daily' },
    selectedDays: [{ type: String }],
    scheduleDate: { type: String },
    scheduleTime: { type: String, default: '20:00' },
    eventMonitor: { type: String, default: 'Blood Pressure' },
    status: { type: String, enum: ['Active', 'Paused', 'Ended'], default: 'Active' },
    recipients: [RecipientSchema],
    selectedAction: { type: String, default: 'Call me' },
    customActionText: { type: String, default: '' },
    lastTriggered: { type: String, default: 'Never' },
    nextTrigger: { type: String, default: 'Today, 20:00' },
  },
  { timestamps: true }
);

export default mongoose.model<IRemoteCarePlan>('RemoteCarePlan', RemoteCarePlanSchema);
