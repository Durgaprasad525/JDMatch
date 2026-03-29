import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers/index.js';
import { createContext } from './context.js';
import { handleVapiWebhook } from './routers/interviews.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the project root (one level up from server directory)
dotenv.config({ path: path.join(__dirname, '..', '.env') });



const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(morgan('combined'));

// CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    const allowed = [
      'http://localhost:5173',
      'http://localhost:3000',
    ];

    // Allow any Vercel preview/production URL for this project
    if (
      origin.endsWith('.vercel.app') ||
      allowed.includes(origin) ||
      (process.env.APP_URL && origin === process.env.APP_URL)
    ) {
      return callback(null, true);
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Rate limiting - Per minute
const minuteLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 20, // 20 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - Per hour
const hourlyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.RATE_LIMIT_HOURLY_MAX) || 300, // 300 requests per hour
  message: 'Hourly rate limit exceeded, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/trpc', minuteLimiter, hourlyLimiter);

// Body parsing middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Vapi webhook — plain POST route (bypasses tRPC for compatibility)
app.post('/api/vapi-webhook', async (req, res) => {
  try {
    const messageType = req.body?.message?.type || req.body?.type || 'unknown';
    console.log(`[Vapi Webhook] type=${messageType}, callId=${req.body?.message?.call?.id || req.body?.call?.id || 'none'}`);

    // Vapi may send the payload with or without the "message" wrapper
    const body = req.body?.message ? req.body : { message: req.body };
    await handleVapiWebhook(body);
    res.json({ received: true });
  } catch (err) {
    console.error('Vapi webhook error:', err.message);
    res.status(200).json({ received: true }); // always 200 so Vapi doesn't retry
  }
});

// tRPC middleware
app.use('/api/trpc', createExpressMiddleware({
  router: appRouter,
  createContext,
}));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// For Vercel, we don't need app.listen()
// The serverless function will handle the app
// But for local development, we need to start the server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 tRPC endpoint: http://localhost:${PORT}/api/trpc`);
    console.log(`❤️  Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
