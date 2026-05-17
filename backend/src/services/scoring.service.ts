import { DiscoveredLead } from '../providers';
import { FeatureFlags } from '../config/feature-flags';

export interface ScoreResult {
  total: number;
  label: string;
  tier: string;
  reasons: string[];
  insight: string;
  breakdown: {
    completeness: number;
    popularity: number;
    presence: number;
    credibility: number;
    reachability: number;
  };
}

// ── Tier Definitions ──────────────────────────────────────────
// Each tier has a clear business meaning for outreach prioritization.
const TIERS = [
  { min: 90, label: '🔥 Elite',      tier: 'S',  color: 'gold' },
  { min: 75, label: '⚡ High Value',  tier: 'A',  color: 'indigo' },
  { min: 60, label: '✅ Qualified',   tier: 'B',  color: 'emerald' },
  { min: 45, label: '📋 Prospect',    tier: 'C',  color: 'blue' },
  { min: 30, label: '🔍 Research',    tier: 'D',  color: 'zinc' },
  { min: 0,  label: '❄️ Cold',        tier: 'F',  color: 'red' },
] as const;

/**
 * Lead Intelligence OS — Multi-Signal Ranking Engine (v5.0)
 *
 * Scores leads on 5 independent dimensions (0–100 each), then
 * computes a weighted composite that maps to an outreach tier.
 *
 * Weights are tuned for B2B local-service outreach campaigns.
 */
export function calculateScore(lead: DiscoveredLead & { ai_analysis?: any }): ScoreResult {
  const defaultResult: ScoreResult = {
    total: 50,
    label: '📋 Prospect',
    tier: 'C',
    reasons: ['Base scoring — ranking engine idle'],
    insight: 'Ranking engine is currently disabled.',
    breakdown: { completeness: 0, popularity: 0, presence: 0, credibility: 0, reachability: 0 }
  };

  if (!FeatureFlags.RANKING_ENGINE) return defaultResult;

  try {
    const reasons: string[] = [];
    const bd = { completeness: 0, popularity: 0, presence: 0, credibility: 0, reachability: 0 };

    // ────────────────────────────────────────────────────
    // 1. COMPLETENESS  (weight 20%)  — How much data do we have?
    // ────────────────────────────────────────────────────
    let compRaw = 0;
    if (lead.business_name?.trim())            compRaw += 10;
    if (lead.phone)                            { compRaw += 25; reasons.push('Phone captured'); }
    if (lead.email)                            { compRaw += 20; reasons.push('Email captured'); }
    if (lead.website)                          { compRaw += 15; reasons.push('Website found'); }
    if (lead.instagram)                        compRaw += 10;
    if (lead.address)                          compRaw += 10;
    if (lead.city)                             compRaw += 5;
    if (lead.category)                         compRaw += 5;
    bd.completeness = Math.min(compRaw, 100);

    // ────────────────────────────────────────────────────
    // 2. POPULARITY  (weight 25%)  — Social proof & reputation
    // ────────────────────────────────────────────────────
    let popRaw = 0;
    if (lead.rating) {
      // Non-linear: 4.5+ is elite territory
      if (lead.rating >= 4.5)      { popRaw += 45; reasons.push('Outstanding rating (' + lead.rating + '★)'); }
      else if (lead.rating >= 4.0) { popRaw += 35; reasons.push('Strong rating (' + lead.rating + '★)'); }
      else if (lead.rating >= 3.5)   popRaw += 20;
      else if (lead.rating >= 3.0)   popRaw += 10;
      else                           popRaw += 3;
    }
    if (lead.review_count) {
      // Logarithmic scale — diminishing returns past ~200
      const revScore = Math.min(Math.log10(lead.review_count + 1) * 18, 55);
      popRaw += revScore;
      if (lead.review_count > 100)       reasons.push('High engagement (' + lead.review_count + ' reviews)');
      else if (lead.review_count > 30)   reasons.push('Active customer base');
    }
    bd.popularity = Math.min(Math.round(popRaw), 100);

    // ────────────────────────────────────────────────────
    // 3. DIGITAL PRESENCE  (weight 20%)  — Online footprint
    // ────────────────────────────────────────────────────
    let presRaw = 0;
    if (lead.website) {
      presRaw += 30;
      if (lead.website.startsWith('https'))  { presRaw += 10; reasons.push('Secure website (HTTPS)'); }
      // Custom domain vs free hosting signals professionalism
      const freeHosts = ['wixsite', 'wordpress.com', 'blogspot', 'weebly', 'squarespace'];
      const isFree = freeHosts.some(h => lead.website!.includes(h));
      if (!isFree) { presRaw += 10; reasons.push('Custom domain detected'); }
    }
    if (lead.instagram) {
      presRaw += 25;
      reasons.push('Instagram presence');
    }
    if (lead.email) {
      presRaw += 15;
      // Business email vs generic
      const generic = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com'];
      const isGeneric = generic.some(g => lead.email!.includes(g));
      if (!isGeneric) { presRaw += 10; reasons.push('Professional email domain'); }
    }
    bd.presence = Math.min(Math.round(presRaw), 100);

    // ────────────────────────────────────────────────────
    // 4. AI CREDIBILITY  (weight 20%)  — Intelligence layer
    // ────────────────────────────────────────────────────
    let credRaw = 0;
    if (lead.ai_analysis) {
      const ai = lead.ai_analysis;
      credRaw += (ai.credibility_score || 0) * 0.4;
      credRaw += (ai.opportunity_score || 0) * 0.4;
      credRaw += (ai.priority_score || 0) * 0.2;

      if (ai.classification === 'premium')        reasons.push('AI: Premium branding');
      else if (ai.classification === 'mid-tier')  reasons.push('AI: Mid-tier business');

      if (ai.business_maturity === 'Established')      reasons.push('AI: Established business');
      else if (ai.business_maturity === 'Scaling')      reasons.push('AI: Scaling business');

      if (ai.responsiveness_likelihood === 'High')      reasons.push('AI: High response likelihood');
    } else {
      credRaw = 40; // neutral default when AI hasn't run
    }
    bd.credibility = Math.min(Math.round(credRaw), 100);

    // ────────────────────────────────────────────────────
    // 5. REACHABILITY  (weight 15%)  — Can we actually contact them?
    // ────────────────────────────────────────────────────
    let reachRaw = 0;
    const channels: string[] = [];
    if (lead.phone)     { reachRaw += 35; channels.push('Phone'); }
    if (lead.email)     { reachRaw += 30; channels.push('Email'); }
    if (lead.instagram) { reachRaw += 20; channels.push('Instagram'); }
    if (lead.website)   { reachRaw += 15; channels.push('Website'); }

    if (channels.length >= 3)      reasons.push(`Multi-channel (${channels.join(', ')})`);
    else if (channels.length === 0) reasons.push('No direct contact channels');

    bd.reachability = Math.min(Math.round(reachRaw), 100);

    // ────────────────────────────────────────────────────
    // COMPOSITE SCORE  — Weighted average
    // ────────────────────────────────────────────────────
    const weights = { completeness: 0.20, popularity: 0.25, presence: 0.20, credibility: 0.20, reachability: 0.15 };

    let composite =
      bd.completeness * weights.completeness +
      bd.popularity   * weights.popularity +
      bd.presence     * weights.presence +
      bd.credibility  * weights.credibility +
      bd.reachability * weights.reachability;

    // Penalty: zero contact channels is a hard cap
    if (!lead.phone && !lead.email && !lead.instagram) {
      composite = Math.min(composite, 25);
    }

    composite = Math.min(Math.round(composite), 100);
    composite = Math.max(composite, 0);

    // ── Tier Assignment ──
    const tierInfo = TIERS.find(t => composite >= t.min) || TIERS[TIERS.length - 1];

    // ── Generate a human-readable Insight ──
    const insight = generateInsight(lead, bd, composite, reasons);

    return {
      total: composite,
      label: tierInfo.label,
      tier: tierInfo.tier,
      reasons: reasons.slice(0, 6),
      insight,
      breakdown: bd
    };

  } catch (err) {
    console.error('[ScoringService] Ranking failed, using fallback:', err);
    return defaultResult;
  }
}

/**
 * Generate a one-line human insight explaining why this lead scored the way it did.
 */
function generateInsight(
  lead: DiscoveredLead & { ai_analysis?: any },
  bd: { completeness: number; popularity: number; presence: number; credibility: number; reachability: number },
  score: number,
  reasons: string[]
): string {
  // Find the strongest and weakest signals
  const dims = [
    { key: 'popularity',   val: bd.popularity,   highLabel: 'highly popular', lowLabel: 'low visibility' },
    { key: 'presence',     val: bd.presence,      highLabel: 'strong digital footprint', lowLabel: 'weak online presence' },
    { key: 'completeness', val: bd.completeness,  highLabel: 'rich data profile', lowLabel: 'limited info' },
    { key: 'reachability', val: bd.reachability,  highLabel: 'easily reachable', lowLabel: 'hard to contact' },
    { key: 'credibility',  val: bd.credibility,   highLabel: 'AI-verified credible', lowLabel: 'unverified credibility' },
  ];
  dims.sort((a, b) => b.val - a.val);
  const strongest = dims[0];
  const weakest = dims[dims.length - 1];

  if (score >= 80) {
    return `Top-tier lead — ${strongest.highLabel} with ${dims.filter(d => d.val >= 60).length}/5 strong signals. Prioritize for outreach.`;
  } else if (score >= 60) {
    return `Solid prospect — ${strongest.highLabel} but ${weakest.lowLabel}. ${weakest.key === 'presence' ? 'Could benefit from digital services.' : 'Enrich data before outreach.'}`;
  } else if (score >= 40) {
    return `Potential lead — ${strongest.highLabel} offsets ${weakest.lowLabel}. Research recommended before contact.`;
  } else {
    return `Low-priority — ${weakest.lowLabel} and ${dims[dims.length - 2]?.lowLabel || 'sparse data'}. Consider bulk re-validation.`;
  }
}
