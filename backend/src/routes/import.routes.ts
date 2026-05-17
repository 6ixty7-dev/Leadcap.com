// ============================================================
// Lead Intelligence OS — Import Routes
// ============================================================

import { Router, Request, Response } from 'express';
import { batchImport, importFromJSON, parseRow } from '../services/import.service';
import { queryAll } from '../database';

const router = Router();

// POST /api/import/csv
router.post('/csv', (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({ success: false, error: 'CSV data is required as an array of row objects' });
      return;
    }
    const result = batchImport(data, filename || 'csv-upload', 'csv');
    res.json({
      success: true, data: result,
      message: `Imported ${result.imported} leads. ${result.duplicates} duplicates skipped. ${result.failed} rows failed.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/import/json
router.post('/json', (req: Request, res: Response) => {
  try {
    const { data, filename } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({ success: false, error: 'JSON data array is required' });
      return;
    }
    const result = importFromJSON(data, filename || 'json-import');
    res.json({
      success: true, data: result,
      message: `Imported ${result.imported} leads. ${result.duplicates} duplicates skipped. ${result.failed} rows failed.`,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/import/extension
router.post('/extension', (req: Request, res: Response) => {
  try {
    const { leads } = req.body;
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      res.status(400).json({ success: false, error: 'Leads array is required' });
      return;
    }
    const result = batchImport(leads, 'chrome-extension', 'extension');
    res.json({ success: true, data: result, message: `Imported ${result.imported} leads from extension.` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/import/history
router.get('/history', (_req: Request, res: Response) => {
  try {
    const history = queryAll('SELECT * FROM import_history ORDER BY created_at DESC LIMIT 50');
    res.json({ success: true, data: history });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/import/preview
router.post('/preview', (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data || !Array.isArray(data) || data.length === 0) {
      res.status(400).json({ success: false, error: 'CSV data required for preview' });
      return;
    }
    const preview = data.slice(0, 5).map((row: Record<string, string>, index: number) => {
      const parsed = parseRow(row);
      return { row: index + 1, original: row, parsed, valid: parsed !== null };
    });
    res.json({
      success: true,
      data: { totalRows: data.length, previewRows: preview, detectedColumns: Object.keys(data[0] || {}) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
