import { Schema, model, Document } from 'mongoose';

export interface IPayment extends Document {
  paymentId: string;
  customer: string;
  email: string;
  purpose: string;
  amount: number;
  currency: string;
  gateway: string;
  status: 'Successful' | 'Pending' | 'Failed' | 'Refunded';
  reference: string;
  date: Date;
  metadata?: Record<string, any>;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentId: { type: String, required: true, unique: true },
    customer: { type: String, default: 'Customer' },
    email: { type: String, required: true },
    purpose: { type: String, default: 'Advert Placement' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    gateway: { type: String, default: 'Stripe' },
    status: {
      type: String,
      enum: ['Successful', 'Pending', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    reference: { type: String, default: '' },
    date: { type: Date, default: Date.now },
    metadata: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  }
);

export const Payment = model<IPayment>('Payment', PaymentSchema);
