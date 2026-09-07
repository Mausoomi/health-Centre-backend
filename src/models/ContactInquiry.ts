import { Schema, model, Document } from 'mongoose';

export type EnquiryStatus = 'New' | 'In Progress' | 'Awaiting User' | 'Resolved' | 'Closed';

export interface IEnquiryNote {
  id: string;
  note: string;
  createdAt: Date;
  createdBy: string;
}

export interface IContactInquiry extends Document {
  id?: string;
  ticketId: string;
  title?: string;
  customTitle?: string;
  firstName: string;
  surname: string;
  sender: string;
  email: string;
  country?: string;
  category: string;
  subject: string;
  message: string;
  content: string;
  status: EnquiryStatus;
  assignedAdmin?: string;
  guidance?: string;
  responseEmail?: string;
  notes?: IEnquiryNote[];
  createdAt: Date;
  updatedAt: Date;
}

const EnquiryNoteSchema = new Schema<IEnquiryNote>(
  {
    id: { type: String, required: true },
    note: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: String, default: 'Admin' },
  },
  { _id: false }
);

const ContactInquirySchema = new Schema<IContactInquiry>(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    customTitle: {
      type: String,
      trim: true,
      default: '',
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    surname: {
      type: String,
      required: true,
      trim: true,
    },
    sender: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'Nigeria',
    },
    category: {
      type: String,
      trim: true,
      default: 'General Enquiry',
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Enquiry',
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['New', 'In Progress', 'Awaiting User', 'Resolved', 'Closed'],
      default: 'New',
    },
    assignedAdmin: {
      type: String,
      trim: true,
      default: '',
    },
    guidance: {
      type: String,
      trim: true,
      default: '',
    },
    responseEmail: {
      type: String,
      trim: true,
    },
    notes: [EnquiryNoteSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret.ticketId || `ENQ-${String(ret._id).slice(-5).toUpperCase()}`;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Auto-fill sender and content before saving if not present
ContactInquirySchema.pre('save', function () {
  const self = this as unknown as IContactInquiry;
  if (!self.sender) {
    const titlePart = self.title && self.title !== 'Select title' ? `${self.title} ` : '';
    self.sender = `${titlePart}${self.firstName} ${self.surname}`.trim();
  }
  if (!self.content) {
    self.content = self.message;
  }
  if (!self.responseEmail) {
    self.responseEmail = self.email;
  }
});

export const ContactInquiry = model<IContactInquiry>('ContactInquiry', ContactInquirySchema);
