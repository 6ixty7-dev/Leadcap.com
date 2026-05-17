// ============================================================
// Lead Intelligence OS — Export Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { exportToCSV, exportToJSON, getExportData } from '../services/export.service';
import { LeadFilters } from '../types';

const router = Router();

function extractFilters(query: any): LeadFilters {
  return {
    search: query.search,
    category: query.category,
    quality_label: query.quality_label,
    status: query.status,
    city: query.city,
    min_score: query.min_score ? Number(query.min_score) : undefined,
    max_score: query.max_score ? Number(query.max_score) : undefined,
  };
}

// GET /api/export/csv — Export as CSV file
router.get('/csv', (req: Request, res: Response) => {
  try {
    const filters = extractFilters(req.query);
    const columns = req.query.columns ? (req.query.columns as string).split(',') : undefined;
    const csv = exportToCSV(filters, columns);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=leads-export-${Date.now()}.csv`);
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/export/json — Export as JSON file
router.get('/json', (req: Request, res: Response) => {
  try {
    const filters = extractFilters(req.query);
    const json = exportToJSON(filters);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=leads-export-${Date.now()}.json`);
    res.send(json);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/export/data — Get raw export data (for frontend xlsx generation)
router.get('/data', (req: Request, res: Response) => {
  try {
    const filters = extractFilters(req.query);
    const data = getExportData(filters);
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
