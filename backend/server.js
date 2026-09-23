const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const teamRoutes = require('./routes/teams');
const gameRoutes = require('./routes/games');
const historyRoutes = require('./routes/history');
const favoriteRoutes = require('./routes/favorites');

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';

// ── Proxy trust (Render / Vercel / any reverse proxy) ─────────────────────
app.set('trust proxy', 1);

// ── Security headers ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false // API-only; CSP handled by frontend host
}));

// ── Gzip responses ────────────────────────────────────────────────────────
app.use(compression());

// ── CORS: strict allowlist for prod + permissive for any localhost dev ────
const staticAllowed = new Set([
  'https://imposter-points-table.vercel.app',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001'
]);

// Allow any localhost / 127.0.0.1 port during local dev (CRA sometimes shifts ports)
const isLocalDevOrigin = (origin) => {
  try {
    const { hostname, protocol } = new URL(origin);
    if (!/^https?:$/.test(protocol)) return false;
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
};

const corsOptions = {
  origin(origin, callback) {
    // Non-browser tools (curl, health checks, server-to-server)
    if (!origin) return callback(null, true);
    if (staticAllowed.has(origin)) return callback(null, true);
    if (!IS_PROD && isLocalDevOrigin(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400 // cache preflight 24h
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ── Body parser with size cap ─────────────────────────────────────────────
app.use(express.json({ limit: '100kb' }));

// ── NoSQL injection sanitization (strips $ and . from keys) ───────────────
app.use(mongoSanitize());

// ── Request logger (dev only) ─────────────────────────────────────────────
if (!IS_PROD) {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ── MongoDB connection with retry + graceful shutdown ─────────────────────
const connectDB = async (retries = 5, delayMs = 3000) => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not set. Exiting.');
    process.exit(1);
  }
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 10
      });
      console.log('✅ MongoDB connected successfully');
      return;
    } catch (err) {
      console.error(`❌ MongoDB connection attempt ${attempt}/${retries} failed:`, err.message);
      if (attempt === retries) {
        console.error('❌ Exhausted DB connection retries. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});
mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

connectDB();

// ── Health check (public) ─────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  const dbStates = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    version: 'v1',
    env: NODE_ENV,
    db: dbStates[mongoose.connection.readyState] || 'unknown',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// ── API v1 routes (hard-cut, no legacy /api/*) ────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/teams', teamRoutes);
app.use('/api/v1/games', gameRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/favorites', favoriteRoutes);

// ── 410 Gone for retired unversioned /api/* ───────────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path === '/' || !req.path.startsWith('/v1')) {
    return res.status(410).json({
      message: 'This API path is retired. Use /api/v1/* instead.',
      example: '/api/v1/health'
    });
  }
  return next();
});

// ── 404 for unknown /api/v1/* paths ───────────────────────────────────────
app.use('/api/v1', (_req, res) => {
  res.status(404).json({ message: 'API endpoint not found.' });
});

// ── Root ping (helpful for Render/uptime checks) ──────────────────────────
app.get('/', (_req, res) => {
  res.status(200).json({ service: 'imposter-game-api', version: 'v1' });
});

// ── Global error handler — never leak stack traces in production ──────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (err && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ message: 'CORS policy: origin not allowed.' });
  }

  // Payload too large
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Request payload too large.' });
  }

  // Malformed JSON body
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON payload.' });
  }

  console.error('[Server Error]', err.stack || err);

  const status = err.status || err.statusCode || 500;
  const payload = { message: status >= 500 ? 'Something went wrong.' : (err.message || 'Request failed.') };
  if (!IS_PROD) payload.error = err.message;

  res.status(status).json(payload);
});

// ── Start server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} [${NODE_ENV}]`);
  console.log(`📡 API base: /api/v1`);
});

// ── Graceful shutdown ─────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed.');
    } catch (e) {
      console.error('Error closing MongoDB:', e);
    }
    process.exit(0);
  });
  // Force exit after 10s if hanging
  setTimeout(() => {
    console.error('⏱️  Force exit after timeout.');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  shutdown('uncaughtException');
});

module.exports = app;