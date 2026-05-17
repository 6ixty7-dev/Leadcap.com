import { GoogleGenerativeAI } from '@google/generative-ai';
import { queryOne, runSql } from '../database';
import { Lead, AIAnalysis } from '../types';
import { FeatureFlags } from '../config/feature-flags';
import dotenv from 'dotenv';
import path from 'path';

// Load env safely
try {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
} catch (e) {}

// Initialize Gemini safely
let genAI: GoogleGenerativeAI | null = null;
function getGenAIClient(): GoogleGenerativeAI | null {
  if (!genAI && process.env.GEMINI_API_KEY) {
    try {
      genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    } catch (e) {
      console.error('[AIService] Failed to initialize Gemini client:', e);
    }
  }
  return genAI;
}

interface AIAnalysisResult {
  tags: string[];
  business_style: string;
  audience_type: string;
  branding_quality: string;
  outreach_potential: string;
  summary: string;
  priority_score: number;
  priority_reasoning: string;
  competitor_weaknesses: string;
  website_seo_issues: string;
  suggested_outreach_hooks: string;
  // New upgraded fields
  credibility_score: number;
  opportunity_score: number;
  responsiveness_likelihood: string; // High, Medium, Low
  business_maturity: string; // Startup, Established, Scaling, Legacy
  classification: string; // premium, mid-tier, low-budget
}

function getProvider() {
  return {
    name: 'gemini-2.5-flash',
    analyze: async (lead: Lead): Promise<AIAnalysisResult> => {
      const client = getGenAIClient();
      if (!client) {
        throw new Error('Gemini API key missing or client failed to initialize');
      }

      const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      const prompt = `
You are a B2B business intelligence analyst evaluating a local business for outreach viability.

## LEAD DATA
- Business Name: ${lead.business_name}
- Category: ${lead.category || 'Unknown'}
- Location: ${lead.city || 'Unknown'}, ${lead.address || 'No address'}
- Website: ${lead.website || 'None'}
- Email: ${(lead as any).email || 'None'}
- Phone: ${(lead as any).phone || 'None'}
- Instagram: ${(lead as any).instagram || 'None'}
- Google Rating: ${lead.rating || 'N/A'} (${lead.review_count || 0} reviews)

## SCORING CRITERIA (be strict and honest)

### credibility_score (0-100)
Score based on:
- Does the business name sound real and professional? (not spammy/generic)
- Is there a consistent digital trail? (website + social + reviews alignment)
- Do the reviews look organic? (low count + perfect 5.0 can be suspicious)
- Is the address a real commercial location?
Award 80+ only for businesses with multiple verifiable signals.

### opportunity_score (0-100)
How likely is this business to NEED and PAY FOR services? Score based on:
- Missing website or outdated website = high opportunity
- No social media but many reviews = needs digital help
- High rating but low online visibility = untapped potential
- Growing review count = business is active and investing
Award 80+ only when there's a clear, specific pain point.

### priority_score (0-100)
Overall outreach priority combining credibility + opportunity + reachability.

### classification
Must be EXACTLY one of: "premium", "mid-tier", "low-budget", "franchise", "micro-business"
- premium: High-end branding, curated experience, price-insensitive clientele
- mid-tier: Solid business, competitive pricing, growth-oriented
- low-budget: Price-driven, minimal branding, cost-sensitive
- franchise: Part of a chain/franchise (outreach may need HQ approval)
- micro-business: Solo operator or family-run, very small scale

### business_maturity
Must be EXACTLY one of: "Startup", "Growing", "Established", "Scaling", "Legacy", "Declining"

### responsiveness_likelihood
Must be EXACTLY one of: "High", "Medium", "Low"
- High: Active social media, responds to reviews, modern presence
- Medium: Has presence but not consistently active
- Low: Stale/outdated profiles, no recent activity

## OUTREACH HOOKS
Generate 3 specific, personalized outreach hooks based on the actual data above.
Each hook should reference something concrete about THIS business.
Do NOT be generic. Example: "Your 4.8★ rating across 200+ reviews is impressive but your website doesn't appear in local search results — we can fix that."

Return ONLY a valid JSON object (no markdown, no backticks):
{
  "tags": ["tag1", "tag2", "tag3"],
  "business_style": "description of their brand aesthetic and positioning",
  "audience_type": "who their customers likely are",
  "branding_quality": "assessment of their visual brand quality",
  "outreach_potential": "High/Medium/Low with 1-sentence reason",
  "summary": "2-3 sentence executive summary of this business as an outreach target",
  "priority_score": 0-100,
  "priority_reasoning": "1-2 sentences explaining the priority score",
  "competitor_weaknesses": "specific weaknesses we can leverage in outreach",
  "website_seo_issues": "specific SEO/website issues found, or 'N/A' if no website",
  "suggested_outreach_hooks": "3 specific personalized hooks separated by newlines",
  "credibility_score": 0-100,
  "opportunity_score": 0-100,
  "responsiveness_likelihood": "High|Medium|Low",
  "business_maturity": "Startup|Growing|Established|Scaling|Legacy|Declining",
  "classification": "premium|mid-tier|low-budget|franchise|micro-business"
}`;

      try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const match = text.match(/\{.*\}/s);
        if (!match) throw new Error('Invalid AI response format');
        
        const parsed = JSON.parse(match[0]);
        
        // Validate and clamp scores to 0-100
        parsed.credibility_score = Math.max(0, Math.min(100, Number(parsed.credibility_score) || 50));
        parsed.opportunity_score = Math.max(0, Math.min(100, Number(parsed.opportunity_score) || 50));
        parsed.priority_score = Math.max(0, Math.min(100, Number(parsed.priority_score) || 50));
        
        // Validate enums
        const validClassifications = ['premium', 'mid-tier', 'low-budget', 'franchise', 'micro-business'];
        if (!validClassifications.includes(parsed.classification)) parsed.classification = 'mid-tier';
        
        const validMaturities = ['Startup', 'Growing', 'Established', 'Scaling', 'Legacy', 'Declining'];
        if (!validMaturities.includes(parsed.business_maturity)) parsed.business_maturity = 'Established';
        
        const validResponsiveness = ['High', 'Medium', 'Low'];
        if (!validResponsiveness.includes(parsed.responsiveness_likelihood)) parsed.responsiveness_likelihood = 'Medium';
        
        return parsed;
      } catch (err: any) {
        console.error('[AI Service] Gemini Error:', err.message);
        throw err;
      }
    }
  };
}

export async function analyzeLead(leadId: number): Promise<AIAnalysis | null> {
  if (!FeatureFlags.GEMINI_ANALYSIS) {
    console.warn('[AIService] AI analysis is disabled by feature flag.');
    return null;
  }

  try {
    const lead = queryOne('SELECT * FROM leads WHERE id = ?', [leadId]) as Lead | null;
    if (!lead) return null;

    // Check cache (refresh if older than 7 days)
    const cached = queryOne(
      "SELECT * FROM ai_analysis WHERE lead_id = ? AND analyzed_at >= datetime('now', '-7 days') ORDER BY analyzed_at DESC LIMIT 1",
      [leadId]
    ) as AIAnalysis | null;
    if (cached && cached.credibility_score !== null) return cached;

    const provider = getProvider();
    const result = await provider.analyze(lead);

    runSql(
      `INSERT INTO ai_analysis (
        lead_id, tags, business_style, audience_type, branding_quality, outreach_potential, summary, model_used,
        priority_score, priority_reasoning, competitor_weaknesses, website_seo_issues, suggested_outreach_hooks,
        credibility_score, opportunity_score, responsiveness_likelihood, business_maturity, classification
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(lead_id) DO UPDATE SET
        tags=excluded.tags, business_style=excluded.business_style, audience_type=excluded.audience_type,
        branding_quality=excluded.branding_quality, outreach_potential=excluded.outreach_potential,
        summary=excluded.summary, priority_score=excluded.priority_score, priority_reasoning=excluded.priority_reasoning,
        credibility_score=excluded.credibility_score, opportunity_score=excluded.opportunity_score,
        responsiveness_likelihood=excluded.responsiveness_likelihood, business_maturity=excluded.business_maturity,
        classification=excluded.classification, analyzed_at=datetime('now')`,
      [
        leadId, JSON.stringify(result.tags), result.business_style, result.audience_type, result.branding_quality, 
        result.outreach_potential, result.summary, provider.name,
        result.priority_score, result.priority_reasoning, result.competitor_weaknesses, result.website_seo_issues, result.suggested_outreach_hooks,
        result.credibility_score, result.opportunity_score, result.responsiveness_likelihood, result.business_maturity, result.classification
      ]
    );

    return queryOne('SELECT * FROM ai_analysis WHERE lead_id = ?', [leadId]) as AIAnalysis;
  } catch (e) {
    console.error(`[AIService] Failed to analyze lead ${leadId}:`, e);
    return null;
  }
}

export async function analyzeLeadBackground(leadId: number) {
  if (!FeatureFlags.GEMINI_ANALYSIS) return;
  analyzeLead(leadId).catch(err => console.error(`[AI Background] Lead ${leadId} failed:`, err));
}

export async function batchAnalyze(leadIds: number[]): Promise<{ analyzed: number; errors: string[] }> {
  let analyzed = 0;
  const errors: string[] = [];
  
  if (!FeatureFlags.GEMINI_ANALYSIS) {
    return { analyzed: 0, errors: ['AI Analysis is disabled'] };
  }

  for (const id of leadIds) {
    try {
      const res = await analyzeLead(id);
      if (res) analyzed++;
      else errors.push(`Lead ${id}: Failed to generate analysis`);
    } catch (err: any) {
      errors.push(`Lead ${id}: ${err.message}`);
    }
  }
  return { analyzed, errors };
}
