require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────────────────────
// Set FRONTEND_URL in your .env (or Cloud Code Engine config) for production.
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// AI limiter: 20 AI calls per hour, keyed by Firebase UID after auth
// Applied directly on the two AI route handlers in stories.js, but we
// also mount it here as a belt-and-suspenders guard on the path prefix.
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // req.user is not yet populated at this middleware level (auth runs inside
    // the route), so fall back to IP. The per-UID check is inside the route.
    return req.ip;
  },
  message: { error: 'AI usage limit reached. Please wait before running more checks.' },
});

app.use('/api', apiLimiter);
app.use('/api/stories/:id/process-text', aiLimiter);
app.use('/api/stories/:id/check-continuity', aiLimiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', project: 'CanonVault', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/stories', require('./src/routes/stories'));
app.use('/api/publish', require('./src/routes/publish'));
app.use('/api/books', require('./src/routes/books'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`CanonVault backend running on http://localhost:${PORT}`);
});

module.exports = app;
