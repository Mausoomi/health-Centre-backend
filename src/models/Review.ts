import { Schema, model, Document } from 'mongoose';

export type ReviewStatus = 'Published' | 'Pending' | 'Hidden' | 'Flagged';

export interface IReviewReport {
  id: string;
  reason: string;
  comment?: string;
  reporterEmail?: string;
  createdAt: Date;
}

export interface IReviewNote {
  id: string;
  note: string;
  createdBy: string;
  createdAt: Date;
}

export interface IReview extends Document {
  id?: string;
  rating: number;
  title: string;
  text: string;
  country: string;
  reviewerName: string;
  reviewerEmail?: string;
  userId?: string;
  avatar: string;
  image?: string;
  service: string;
  status: ReviewStatus;
  likes: number;
  likedBy: string[];
  reports: IReviewReport[];
  adminNotes: IReviewNote[];
  createdAt: Date;
  updatedAt: Date;
}

const ReviewReportSchema = new Schema<IReviewReport>(
  {
    id: { type: String, required: true },
    reason: { type: String, required: true },
    comment: { type: String, default: '' },
    reporterEmail: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewNoteSchema = new Schema<IReviewNote>(
  {
    id: { type: String, required: true },
    note: { type: String, required: true },
    createdBy: { type: String, default: 'Admin' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ReviewSchema = new Schema<IReview>(
  {
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    title: {
      type: String,
      trim: true,
      default: '',
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
      default: 'Nigeria',
    },
    reviewerName: {
      type: String,
      trim: true,
      default: 'Community Member',
    },
    reviewerEmail: {
      type: String,
      trim: true,
      default: '',
    },
    userId: {
      type: String,
      trim: true,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    image: {
      type: String,
      default: '',
    },
    service: {
      type: String,
      trim: true,
      default: 'Clinic Visit',
    },
    status: {
      type: String,
      enum: ['Published', 'Pending', 'Hidden', 'Flagged'],
      default: 'Pending',
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
    reports: [ReviewReportSchema],
    adminNotes: [ReviewNoteSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Review = model<IReview>('Review', ReviewSchema);
