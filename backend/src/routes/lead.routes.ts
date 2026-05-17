// ============================================================
// Lead Intelligence OS — Lead Routes
// ============================================================

import { Router, Request, Response } from 'express';
import * as leadService from '../services/lead.service';
import { LeadFilters } from '../types';

const router = Router();

// GET /api/leads — List leads with filters
router.get('/', (req: Request, res: Response) => {
  try {
    const filters: LeadFilters = {
      search: req.query.search as string,
      category: req.query.category as string,
      quality_label: req.query.quality_label as any,
      status: req.query.status as any,
      city: req.query.city as string,
      min_score: req.query.min_score ? Number(req.query.min_score) : undefined,
      max_score: req.query.max_score ? Number(req.query.max_score) : undefined,
      sort_by: req.query.sort_by as string,
      sort_order: req.query.sort_order as 'asc' | 'desc',
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 25,
    };

    const result = leadService.getLeads(filters);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/stats — Dashboard statistics
router.get('/stats', (_req: Request, res: Response) => {
  try {
    const stats = leadService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/categories — All unique categories
router.get('/categories', (_req: Request, res: Response) => {
  try {
    const categories = leadService.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/cities — All unique cities
router.get('/cities', (_req: Request, res: Response) => {
  try {
    const cities = leadService.getCities();
    res.json({ success: true, data: cities });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/rescore — Re-score all leads
router.post('/rescore', (_req: Request, res: Response) => {
  try {
    const updated = leadService.rescoreAllLeads();
    res.json({ success: true, message: `Re-scored ${updated} leads` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/leads/:id — Get single lead
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid lead ID' });
      return;
    }

    const lead = leadService.getLeadById(id);
    if (!lead) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }

    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads — Create a lead manually
router.post('/', (req: Request, res: Response) => {
  try {
    const { business_name } = req.body;

    if (!business_name || business_name.trim() === '') {
      res.status(400).json({ success: false, error: 'Business name is required' });
      return;
    }

    const lead = leadService.createLead(req.body);
    res.status(201).json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/leads/:id — Update a lead
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid lead ID' });
      return;
    }

    const lead = leadService.updateLead(id, req.body);
    if (!lead) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }

    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PATCH /api/leads/:id/status — Update lead status
router.patch('/:id/status', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    const { status } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid lead ID' });
      return;
    }

    if (!status) {
      res.status(400).json({ success: false, error: 'Status is required' });
      return;
    }

    const lead = leadService.updateLeadStatus(id, status);
    if (!lead) {
      res.status(400).json({ success: false, error: 'Invalid status or lead not found' });
      return;
    }

    res.json({ success: true, data: lead });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/:id/retest — Retest a lead
router.post('/:id/retest', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid lead ID' });
      return;
    }

    const lead = await leadService.retestLead(id);
    if (!lead) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }

    res.json({ success: true, data: lead, message: 'Retest successful' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE /api/leads/:id — Delete a lead
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: 'Invalid lead ID' });
      return;
    }

    const deleted = leadService.deleteLead(id);
    if (!deleted) {
      res.status(404).json({ success: false, error: 'Lead not found' });
      return;
    }

    res.json({ success: true, message: 'Lead deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/leads/bulk-delete — Bulk delete leads
router.post('/bulk-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: 'Array of IDs is required' });
      return;
    }

    const deleted = leadService.bulkDeleteLeads(ids);
    res.json({ success: true, message: `Deleted ${deleted} leads` });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
