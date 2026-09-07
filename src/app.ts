import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { apiRouter } from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { apiLimiter } from './middlewares/rateLimiter';

const app = express();

// Set security HTTP headers
app.use(helmet());

// Enable CORS
app.use(
  cors({
    origin: true, // Configured for dev; in production specify domain
    credentials: true,
  })
);

// Apply rate limiter to API routes
app.use('/api/', apiLimiter);

// Parsing request bodies (supports image uploads / Base64 attachments)
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

// Parsing cookies
app.use(cookieParser());

// Root welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to the HealthCenter Backend API',
    status: 'Running',
    version: '1.0.0',
  });
});

// API Routes mounting
app.use('/api/v1', apiRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
