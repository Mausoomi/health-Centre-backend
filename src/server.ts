import app from './app';
import { connectDB } from './config/db';
import { seedInitialUsersIfEmpty } from './utils/seedUsers';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Seed initial users if empty
  await seedInitialUsersIfEmpty();

  // Start Express Server
  app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
};

startServer();
