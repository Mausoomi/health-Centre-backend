import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import { connectDB } from './config/db';
import { seedInitialUsersIfEmpty } from './utils/seedUsers';
import { seedDefaultAdmins } from './services/adminAuthService';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    // Seed initial users if empty
    await seedInitialUsersIfEmpty();

    // Seed / ensure admin accounts exist
    await seedDefaultAdmins();

    // Start Express Server
    const server = app.listen(PORT, () => {
      console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });

    server.on('error', (err: any) => {
      console.error('Server listen error:', err);
    });
  } catch (error) {
    console.error('Error in startServer:', error);
  }
};

startServer();
