import { Router, Request, Response } from 'express';
import { queryOne, queryAll, runSql } from '../database';
import { outreachService } from '../services/outreach.service';

const router = Router();

// POST /api/outreach/generate
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { leadId, context, intent, tone, campaignId } = req.body;

    if (!leadId || (!intent && !campaignId)) {
      res.status(400).json({ success: false, error: 'leadId and intent (or campaignId) are required' });
      return;
    }

    const data = await outreachService.generateOutreach(leadId, context, intent || '', tone, campaignId);
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('[Outreach Generate Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/send-email
router.post('/send-email', async (req: Request, res: Response) => {
  try {
    const { leadId, subject, body, campaignId } = req.body;

    if (!leadId || !subject || !body) {
      res.status(400).json({ success: false, error: 'leadId, subject, and body are required' });
      return;
    }

    const result = await outreachService.sendEmail(leadId, subject, body, campaignId);
    res.json(result);
  } catch (error: any) {
    console.error('[Outreach Email Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/log-whatsapp
router.post('/log-whatsapp', async (req: Request, res: Response) => {
  try {
    const { leadId, message, campaignId } = req.body;

    if (!leadId || !message) {
      res.status(400).json({ success: false, error: 'leadId and message are required' });
      return;
    }

    const result = await outreachService.logWhatsApp(leadId, message, campaignId);
    res.json(result);
  } catch (error: any) {
    console.error('[Outreach WhatsApp Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/log-call
router.post('/log-call', async (req: Request, res: Response) => {
  try {
    const { leadId, notes, outcome, duration } = req.body;

    if (!leadId) {
      res.status(400).json({ success: false, error: 'leadId is required' });
      return;
    }

    const id = runSql(
      `INSERT INTO call_logs (lead_id, notes, outcome, duration) VALUES (?, ?, ?, ?)`,
      [leadId, notes || '', outcome || 'unknown', duration || 0]
    );

    runSql(`UPDATE leads SET last_contact_at = datetime('now'), status = 'contacted' WHERE id = ?`, [leadId]);

    res.json({ success: true, id });
  } catch (error: any) {
    console.error('[Outreach Call Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/outreach/logs/:leadId
router.get('/logs/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    
    const messages = queryAll(`SELECT * FROM outreach_logs WHERE lead_id = ? ORDER BY created_at DESC`, [leadId]);
    const calls = queryAll(`SELECT * FROM call_logs WHERE lead_id = ? ORDER BY created_at DESC`, [leadId]);

    res.json({ success: true, data: { messages, calls } });
  } catch (error: any) {
    console.error('[Outreach Logs Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/outreach/campaigns
router.get('/campaigns', async (req: Request, res: Response) => {
  try {
    const campaigns = queryAll(`SELECT * FROM campaigns ORDER BY created_at DESC`);
    res.json({ success: true, data: campaigns });
  } catch (error: any) {
    console.error('[Outreach Campaigns Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/campaigns
router.post('/campaigns', async (req: Request, res: Response) => {
  try {
    const { name, objective, offer, cta } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Campaign name is required' });
      return;
    }

    const id = runSql(
      `INSERT INTO campaigns (name, objective, offer, cta) VALUES (?, ?, ?, ?)`,
      [name, objective || '', offer || '', cta || '']
    );

    res.json({ success: true, id });
  } catch (error: any) {
    console.error('[Outreach Create Campaign Error]', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/outreach/campaigns/:id
router.get('/campaigns/:id', async (req: Request, res: Response) => {
  try {
    const campaign = queryOne(`SELECT * FROM campaigns WHERE id = ?`, [req.params.id]);
    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }
    res.json({ success: true, data: campaign });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/outreach/campaigns/:id/leads
router.get('/campaigns/:id/leads', async (req: Request, res: Response) => {
  try {
    const leads = queryAll(`
      SELECT cl.*, l.business_name, l.city, l.category, l.score, l.quality_label, l.email, l.phone
      FROM campaign_leads cl
      JOIN leads l ON cl.lead_id = l.id
      WHERE cl.campaign_id = ?
    `, [req.params.id]);
    res.json({ success: true, data: leads });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/outreach/campaigns/:id/leads
router.post('/campaigns/:id/leads', async (req: Request, res: Response) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds)) {
      res.status(400).json({ success: false, error: 'leadIds must be an array' });
      return;
    }

    const campaignId = req.params.id;
    for (const leadId of leadIds) {
      runSql(`
        INSERT OR IGNORE INTO campaign_leads (campaign_id, lead_id)
        VALUES (?, ?)
      `, [campaignId, leadId]);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT /api/outreach/campaigns/:id/leads/:leadId
router.put('/campaigns/:id/leads/:leadId', async (req: Request, res: Response) => {
  try {
    const { status, draft_email_subject, draft_email_body, draft_whatsapp } = req.body;
    
    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [];

    if (status !== undefined) { updates.push('status = ?'); params.push(status); }
    if (draft_email_subject !== undefined) { updates.push('draft_email_subject = ?'); params.push(draft_email_subject); }
    if (draft_email_body !== undefined) { updates.push('draft_email_body = ?'); params.push(draft_email_body); }
    if (draft_whatsapp !== undefined) { updates.push('draft_whatsapp = ?'); params.push(draft_whatsapp); }

    if (updates.length > 0) {
      params.push(req.params.id, req.params.leadId);
      runSql(`
        UPDATE campaign_leads
        SET ${updates.join(', ')}
        WHERE campaign_id = ? AND lead_id = ?
      `, params);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
