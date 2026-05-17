// ============================================================
// Lead Intelligence OS — Express Server Entry Point (v4.1)
// ============================================================

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase, closeDatabase } from './database';
import { safeLoad } from './lib/safe-loader';
import { ModuleStatus, StartupErrors, FeatureFlags } from './config/feature-flags';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ---- Global Error Boundaries ----
process.on('uncaughtException', (err) => {
  console.error('\x1b[41m[UNCAUGHT EXCEPTION]\x1b[0m', err);
  // In a production app, you might want to restart the process here
  // For now, we'll keep it alive to allow diagnostics
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\x1b[41m[UNHANDLED REJECTION]\x1b[0m at:', promise, 'reason:', reason);
});

// Import routes
import leadRoutes from './routes/lead.routes';
import importRoutes from './routes/import.routes';
import aiRoutes from './routes/ai.routes';
import exportRoutes from './routes/export.routes';
import discoveryRoutes from './routes/discovery.routes';
import providerRoutes from './routes/provider.routes';
import outreachRoutes from './routes/outreach.routes';

const app = express();
const PORT = process.env.PORT || 3001;

// ---- Middleware ----
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---- Routes ----
app.use('/api/leads', leadRoutes);
app.use('/api/import', importRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/outreach', outreachRoutes);

import { BrowserManager } from './lib/browser-manager';
import { getActiveJobCount, getQueuedJobCount } from './services/scraper.service';

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ 
    success: true, 
    server: "online", 
    database: ModuleStatus.DATABASE,
    modules: ModuleStatus,
    timestamp: new Date().toISOString(),
    errors: StartupErrors.length > 0 ? StartupErrors : undefined
  });
});

// Diagnostics endpoint for memory, browser and jobs
app.get('/api/diagnostics', (_req, res) => {
  const memoryUsage = process.memoryUsage();
  res.json({
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
    },
    browser: BrowserManager.getDiagnostics(),
    jobs: {
      active: getActiveJobCount(),
      queued: getQueuedJobCount(),
    }
  });
});

// Debug startup diagnostics
app.get('/api/debug/startup', (_req, res) => {
  res.json({
    boot_time: new Date().toISOString(),
    status: ModuleStatus,
    errors: StartupErrors,
    features: FeatureFlags,
    env_vars: {
      apify: !!process.env.APIFY_API_TOKEN,
      gemini: !!process.env.GEMINI_API_KEY,
      firecrawl: !!process.env.FIRECRAWL_API_KEY
    }
  });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ---- Start Server ----
async function start() {
  console.log('\x1b[35m%s\x1b[0m', '---------------------------------------------------');
  console.log('\x1b[35m%s\x1b[0m', '   LEAD INTELLIGENCE OS — BACKEND INITIALIZING     ');
  console.log('\x1b[35m%s\x1b[0m', '---------------------------------------------------');

  // Load Database
  await safeLoad('DATABASE', async () => {
    await initDatabase();
  }, { required: true });

  // Load Other Modules (Dummy loads for registry)
  ModuleStatus.EXPRESS = 'active';
  ModuleStatus.DISCOVERY_ENGINE = 'active';
  ModuleStatus.APIFY = process.env.APIFY_API_TOKEN ? 'active' : 'disabled';
  ModuleStatus.FIRECRAWL = process.env.FIRECRAWL_API_KEY ? 'active' : 'disabled';

  app.listen(PORT, () => {
    console.log('\x1b[36m%s\x1b[0m', `[BOOT] Express ready on :${PORT}`);
    console.log(`[BOOT] Database status: ${ModuleStatus.DATABASE}`);
    console.log(`[BOOT] Geo engine status: ${FeatureFlags.GEO_INTELLIGENCE ? 'ENABLED' : 'DISABLED'}`);
    console.log(`[BOOT] AI engine status: ${FeatureFlags.GEMINI_ANALYSIS ? 'ENABLED' : 'DISABLED'}`);
    console.log('\x1b[32m%s\x1b[0m', '[BOOT] Server online and reachable.');
    console.log('\x1b[35m%s\x1b[0m', '---------------------------------------------------');
  }).on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\x1b[41m[FATAL] Port ${PORT} is already in use. Try killing the existing process.\x1b[0m`);
    } else {
      console.error('\x1b[41m[FATAL] Server failed to listen:\x1b[0m', err);
    }
    process.exit(1);
  });
}

start();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

export default app;
