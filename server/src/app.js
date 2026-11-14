import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import donationRoutes from './routes/donationRoutes.js';
import demandRoutes from './routes/demandRoutes.js';
import allocationRoutes from './routes/allocationRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import impactRoutes from './routes/impactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { getStorageMode } from './storage/dbAdapter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST = path.join(__dirname, '../../client/dist');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

// Rate Limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'test' ? 1000 : 300,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Health Check & Preflight (addresses Render cold start & persistence status)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'FoodBridge AI Core Engine',
    version: '1.0.0',
    theme: 'Harvest Signal',
    storage: getStorageMode(),
    timestamp: new Date().toISOString(),
    isDemoInstance: process.env.IS_DEMO_INSTANCE === 'true' || true
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/donations', donationRoutes);
app.use('/api/demands', demandRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/admin', adminRoutes);

// Single Service Deployment: Serve built React frontend if client/dist exists
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

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
