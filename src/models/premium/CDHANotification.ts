import mongoose, { Schema, Document } from 'mongoose';

export interface ICDHANotification extends Document {
  userId: mongoose.Types.ObjectId | string;
  type: 'PDHO_VERIFIED' | 'AFFILIATION_ACCEPTED' | 'AFFILIATION_DECLINED' | 'AFFILIATION_ENDED';
  title: string;
  message: string;
  pdhoId?: mongoose.Types.ObjectId | string;
  pdhoName?: string;
  isRead: boolean;
  cta?: {
    label: string;
    action: string;
    link?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const CDHANotificationSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['PDHO_VERIFIED', 'AFFILIATION_ACCEPTED', 'AFFILIATION_DECLINED', 'AFFILIATION_ENDED'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    pdhoId: { type: Schema.Types.ObjectId, ref: 'PDHOOrganisation' },
    pdhoName: { type: String },
    isRead: { type: Boolean, default: false },
    cta: {
      label: { type: String, default: 'Request Affiliation' },
      action: { type: String, default: 'REQUEST_AFFILIATION' },
      link: { type: String, default: '/user/premium/cdha' },
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICDHANotification>('CDHANotification', CDHANotificationSchema);
