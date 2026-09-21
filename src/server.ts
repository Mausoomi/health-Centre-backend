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

      // Auto Keep-Alive Self-Ping for Render Free Tier (Prevents 50s cold-start spin-downs)
      startKeepAlive();
    });

    server.on('error', (err: any) => {
      console.error('Server listen error:', err);
    });
  } catch (error) {
    console.error('Error in startServer:', error);
  }
};

const startKeepAlive = () => {
  const renderUrl =
    process.env.RENDER_EXTERNAL_URL ||
    process.env.APP_URL ||
    'https://health-centre-backend-stsx.onrender.com';

  if (!renderUrl) return;

  // Ping every 10 minutes (600,000 ms)
  const PING_INTERVAL_MS = 10 * 60 * 1000;

  setInterval(async () => {
    try {
      const pingUrl = `${renderUrl.replace(/\/$/, '')}/api/v1/health`;
      const res = await fetch(pingUrl);
      if (res.ok) {
        console.log(`[KEEP-ALIVE] Pinged ${pingUrl} at ${new Date().toISOString()} (Status: ${res.status})`);
      }
    } catch (err: any) {
      // Silently ignore ping errors
      console.log(`[KEEP-ALIVE PING NOTICE] ${err?.message || 'Server ping cycle'}`);
    }
  }, PING_INTERVAL_MS);
};

startServer();
