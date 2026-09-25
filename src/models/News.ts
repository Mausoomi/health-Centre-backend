import { Schema, model, Document } from 'mongoose';

export type NewsStatus = 'Draft' | 'Published' | 'Scheduled' | 'Archived' | 'Expired';

export interface INewsReport {
  id: string;
  reasons: string[];
  note?: string;
  reporterEmail?: string;
  createdAt: Date;
}

export interface INews extends Document {
  id?: string;
  newsId: string;
  title: string;
  summary: string;
  content: string;
  image: string;
  country: string;
  countryName: string;
  state: string;
  startDate?: string;
  endDate?: string;
  noEndDate: boolean;
  status: NewsStatus;
  author: string;
  views: number;
  likes: number;
  likedBy: string[];
  reports: INewsReport[];
  type: 'news';
  createdAt: Date;
  updatedAt: Date;
}

const NewsReportSchema = new Schema<INewsReport>(
  {
    id: { type: String, required: true },
    reasons: { type: [String], default: [] },
    note: { type: String, default: '' },
    reporterEmail: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const NewsSchema = new Schema<INews>(
  {
    newsId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      type: String,
      default: '',
    },
    country: {
      type: String,
      default: 'ALL',
      trim: true,
    },
    countryName: {
      type: String,
      default: 'All Countries',
      trim: true,
    },
    state: {
      type: String,
      default: 'ALL',
      trim: true,
    },
    startDate: {
      type: String,
      default: '',
    },
    endDate: {
      type: String,
      default: '',
    },
    noEndDate: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Published', 'Scheduled', 'Archived', 'Expired'],
      default: 'Published',
      index: true,
    },
    author: {
      type: String,
      default: 'HealthCentre Editorial Team',
      trim: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: {
      type: [String],
      default: [],
    },
    reports: {
      type: [NewsReportSchema],
      default: [],
    },
    type: {
      type: String,
      default: 'news',
      enum: ['news'],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret: any) {
        ret.id = ret.newsId || String(ret._id);
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const News = model<INews>('News', NewsSchema);
