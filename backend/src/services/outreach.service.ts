import nodemailer from 'nodemailer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { queryOne, runSql, queryAll } from '../database';

export class OutreachService {
  private mailTransporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initMailTransporter();
  }

  private initMailTransporter() {
    // We try to get settings from db
    const smtpHost = queryOne("SELECT value FROM settings WHERE key = 'smtp_host'")?.value || 'smtp.gmail.com';
    const smtpPort = queryOne("SELECT value FROM settings WHERE key = 'smtp_port'")?.value || 587;
    const smtpUser = queryOne("SELECT value FROM settings WHERE key = 'smtp_user'")?.value || process.env.SMTP_USER || 'tejaschristopher67@gmail.com';
    const smtpPass = queryOne("SELECT value FROM settings WHERE key = 'smtp_pass'")?.value || process.env.SMTP_PASS || '';

    if (smtpUser && smtpPass) {
      this.mailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: Number(smtpPort),
        secure: Number(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }
  }

  async generateOutreach(leadId: number, context: string, intent: string, tone: string, campaignId?: number) {
    const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (!lead) throw new Error('Lead not found');

    const analysis = queryOne(`SELECT * FROM ai_analysis WHERE lead_id = ?`, [leadId]);
    let campaignContext = '';
    
    if (campaignId) {
      const campaign = queryOne(`SELECT * FROM campaigns WHERE id = ?`, [campaignId]);
      if (campaign) {
        campaignContext = `
          MASTER CAMPAIGN OBJECTIVE: ${campaign.objective}
          OFFER: ${campaign.offer}
          CALL TO ACTION: ${campaign.cta}
        `;
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('Gemini API key is not configured');

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `
      You are an elite B2B sales copywriter. Your goal is to generate high-conversion outreach messages.
      Do NOT use spammy language. Keep it human, concise, and highly personalized.
      
      Target Business Data:
      Name: ${lead.business_name}
      City: ${lead.city || 'Unknown'}
      Category: ${lead.category || 'Unknown'}
      Website: ${lead.website || 'No website'}
      AI Analysis/Context: ${analysis ? JSON.stringify(analysis) : 'None'}
      
      Outreach Instructions:
      ${campaignContext}
      Context/Offer: ${context || 'General inquiry'}
      Specific Hook/Intent: ${intent}
      Tone: ${tone || 'professional'}
      
      Rules for Message Quality Engine:
      1. Write short, readable English (no fluff, no corporate jargon).
      2. Start with a personalized intro acknowledging their business type (e.g. "As a premium salon in [City]...").
      3. Focus on their pain points based on their category.
      4. Use a clear, low-friction Call to Action (CTA).
      5. Email should look like it was hand-typed by a human.
      6. WhatsApp should be very concise, friendly, and under 50 words. Use 1-2 emojis.
      7. Instagram DM should be casual and direct.
      
      Return ONLY a valid JSON object in this exact format (no markdown code blocks, no backticks, just raw JSON):
      {
        "email_subject": "...",
        "email_body": "...",
        "whatsapp_message": "...",
        "instagram_dm": "..."
      }
    `;

    const response = await model.generateContent(prompt);
    let text = response.response.text().trim();
    if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '');
    if (text.startsWith('```')) text = text.replace(/```/g, '');
    
    return JSON.parse(text);
  }

  async sendEmail(leadId: number, subject: string, body: string, campaignId?: number) {
    if (!this.mailTransporter) {
      this.initMailTransporter(); // try again in case settings were updated
      if (!this.mailTransporter) {
        throw new Error('Email sending is not configured. Please set SMTP settings.');
      }
    }

    const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (!lead) throw new Error('Lead not found');
    if (!lead.email) throw new Error('Lead does not have an email address');

    const fromAddress = queryOne("SELECT value FROM settings WHERE key = 'smtp_user'")?.value || 'tejaschristopher67@gmail.com';

    let logId: number = 0;
    try {
      // Create draft log
      logId = runSql(
        `INSERT INTO outreach_logs (lead_id, campaign_id, type, status, subject, content) VALUES (?, ?, ?, ?, ?, ?)`,
        [leadId, campaignId || null, 'email', 'draft', subject, body]
      );

      await this.mailTransporter.sendMail({
        from: `"LeadOS Outreach" <${fromAddress}>`,
        to: lead.email,
        subject: subject,
        text: body,
      });

      // Update log
      runSql(`UPDATE outreach_logs SET status = 'sent', sent_at = datetime('now') WHERE id = ?`, [logId]);
      
      // Update lead
      runSql(`UPDATE leads SET last_contact_at = datetime('now'), status = 'contacted' WHERE id = ?`, [leadId]);

      return { success: true, logId };
    } catch (error: any) {
      if (logId) {
        runSql(`UPDATE outreach_logs SET status = 'failed', error_message = ? WHERE id = ?`, [error.message, logId]);
      }
      throw error;
    }
  }

  async logWhatsApp(leadId: number, message: string, campaignId?: number) {
    const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [leadId]);
    if (!lead) throw new Error('Lead not found');

    const logId = runSql(
      `INSERT INTO outreach_logs (lead_id, campaign_id, type, status, content, sent_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [leadId, campaignId || null, 'whatsapp', 'sent', message]
    );

    runSql(`UPDATE leads SET last_contact_at = datetime('now'), status = 'contacted' WHERE id = ?`, [leadId]);
    
    return { success: true, logId };
  }

  // Follow-up generation based on previous outreach logs
  async generateFollowUp(leadId: number, campaignId?: number) {
     const logs = queryAll(`SELECT * FROM outreach_logs WHERE lead_id = ? ORDER BY created_at DESC LIMIT 5`, [leadId]);
     if (logs.length === 0) throw new Error('No previous outreach found to follow up on');

     const lead = queryOne(`SELECT * FROM leads WHERE id = ?`, [leadId]);
     const apiKey = process.env.GEMINI_API_KEY;
     if (!apiKey) throw new Error('Gemini API key is not configured');

     const genAI = new GoogleGenerativeAI(apiKey);
     const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

     const prompt = `
       You are an expert sales copywriter. Generate a follow-up message to a lead.
       
       Target Business: ${lead.business_name}
       
       Previous Outreach Messages:
       ${JSON.stringify(logs, null, 2)}
       
       Generate a polite, concise, high-converting follow-up message.
       Return ONLY JSON:
       {
         "email_subject": "...",
         "email_body": "..."
       }
     `;

     const response = await model.generateContent(prompt);
     let text = response.response.text().trim();
     if (text.startsWith('```json')) text = text.replace(/```json/g, '').replace(/```/g, '');
     if (text.startsWith('```')) text = text.replace(/```/g, '');
     
     return JSON.parse(text);
  }
}

export const outreachService = new OutreachService();
