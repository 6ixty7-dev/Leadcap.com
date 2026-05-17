// ============================================================
// Lead Intelligence OS — Discovery Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { startDiscoveryJob, getJobs, getJobDetails } from '../services/scraper.service';
import { queryOne, queryAll } from '../database';

const router = Router();

// POST /api/discovery/start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { industry, city, filters } = req.body;
    if (!industry || !city) {
      res.status(400).json({ success: false, error: 'Industry and city are required' });
      return;
    }

    const jobId = await startDiscoveryJob(industry, city, filters || {});
    res.json({ success: true, data: { jobId }, message: 'Discovery job started' });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      provider: "discovery-engine",
      error: error.message || "Failed to start discovery job" 
    });
  }
});

// GET /api/discovery/jobs
router.get('/jobs', (_req: Request, res: Response) => {
  try {
    const jobs = getJobs();
    res.json({ success: true, data: jobs });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/discovery/jobs/:id
router.get('/jobs/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid ID' });
      return;
    }
    const job = getJobDetails(id);
    if (!job) {
      res.status(404).json({ success: false, error: 'Job not found' });
      return;
    }
    res.json({ success: true, data: job });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug discovery execution
router.get('/debug/latest', (req, res) => {
  const latestJob = queryOne(`SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 1`);
  if (!latestJob) return res.status(404).json({ success: false, error: 'No jobs found' });
  
  const rawResults = queryAll(`SELECT * FROM raw_provider_results WHERE job_id = ?`, [latestJob.id]);
  const leads = queryAll(`SELECT * FROM leads WHERE source_id = ?`, [latestJob.id]);
  
  res.json({
    success: true,
    job: {
      ...latestJob,
      logs: JSON.parse(latestJob.logs || '[]')
    },
    raw_provider_data: rawResults.map(r => ({ ...r, raw_payload: JSON.parse(r.raw_payload || '[]') })),
    captured_leads_count: leads.length,
    captured_leads: leads
  });
});

// Test Playwright extraction directly
router.get('/test-playwright', async (req, res) => {
  const { industry = 'Salons', city = 'Kochi' } = req.query;
  const { PlaywrightProvider } = require('../providers/playwright.provider');
  const provider = new PlaywrightProvider();
  
  try {
    const results = await provider.search({ industry, city }, (msg: string) => console.log('[TestPW]', msg));
    res.json({
      success: true,
      query: { industry, city },
      count: results.length,
      data: results
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
