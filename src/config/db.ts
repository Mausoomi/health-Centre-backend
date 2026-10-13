import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/healthcenter';

export const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 50,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('MongoDB Connected successfully.');
  } catch (error: any) {
    console.error('MongoDB Connection Error:', error?.message || error);
    if (!process.env.MONGODB_URI) {
      console.warn('[DB WARNING] MONGODB_URI environment variable is not defined on Render!');
    }
  }
};
