import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { seedInitialUsersIfEmpty } from './utils/seedUsers';
import { seedDefaultAdmins } from './services/adminAuthService';

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});

const PORT = Number(process.env.PORT) || 5000;

// Start Express Server immediately on 0.0.0.0 for cloud environments (Render)
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

server.on('error', (err: any) => {
  console.error('Server listen error:', err);
});

// Initialize database & default seed data in background
const initServices = async () => {
  try {
    await connectDB();
    await seedInitialUsersIfEmpty();
    await seedDefaultAdmins();
  } catch (error) {
    console.error('Error during database/admin initialization:', error);
  }
};

initServices();

