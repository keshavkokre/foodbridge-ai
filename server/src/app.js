import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Rate Limiter for general APIs
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 200,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Preflight & Health Check (addresses Render free cold start & uptime pinging)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'FoodBridge AI Core Engine',
    version: '1.0.0',
    theme: 'Harvest Signal',
    timestamp: new Date().toISOString(),
    isDemoInstance: process.env.IS_DEMO_INSTANCE === 'true' || true
  });
});

// Routes
app.use('/api/auth', authRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

export default app;
