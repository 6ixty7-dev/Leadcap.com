// ============================================================
// Lead Intelligence OS — AI Analysis Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { analyzeLead, batchAnalyze } from '../services/ai.service';

const router = Router();

// POST /api/ai/analyze/:id — Analyze a single lead
router.post('/analyze/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid lead ID' });
      return;
    }

    const analysis = await analyzeLead(id);
    if (!analysis) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }

    res.json({ success: true, data: analysis });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/ai/batch-analyze — Analyze multiple leads
router.post('/batch-analyze', async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'Array of lead IDs required' });
      return;
    }

    // Limit batch size to prevent abuse
    if (ids.length > 50) {
      res.status(400).json({ success: false, error: 'Maximum 50 leads per batch' });
      return;
    }

    const result = await batchAnalyze(ids);
    res.json({
      success: true,
      data: result,
      message: `Analyzed ${result.analyzed} leads. ${result.errors.length} errors.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
