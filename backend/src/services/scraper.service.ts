// ============================================================
// Lead Intelligence OS — Geo-Intelligent Discovery Engine (v4.1)
// ============================================================

import { runSql, queryOne, queryAll } from '../database';
import { runValidationPipeline } from './validation.service';
import { calculateScore } from './scoring.service';
import { isDuplicate } from './import.service';
import { analyzeLeadBackground } from './ai.service';
import { GeoEngine, GeoLocation } from './geo.service';
import { PlaywrightProvider } from '../providers/playwright.provider';
import { ApifyProvider } from '../providers/apify.provider';
import { DiscoveryQuery, DiscoveredLead } from '../providers';
import { FeatureFlags, ModuleStatus } from '../config/feature-flags';

export interface DiscoveryJob {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  industry: string;
  city: string;
  filters: string;
  progress: number;
  total_found: number;
  validated_count: number;
  rejected_count: number;
  error_message: string | null;
  logs: string;
  created_at: string;
  completed_at: string | null;
}

const activeJobs = new Map<number, boolean>();
const MAX_CONCURRENT_JOBS = 2;
const jobQueue: Array<() => void> = [];

// Lazy-initialize providers to avoid startup crashes
let playwrightProvider: PlaywrightProvider | null = null;
let apifyProvider: ApifyProvider | null = null;

function getProviders() {
  try {
    if (!playwrightProvider && FeatureFlags.PLAYWRIGHT_SCRAPING) {
      playwrightProvider = new PlaywrightProvider();
    }
    if (!apifyProvider && FeatureFlags.APIFY_INTEGRATION) {
      apifyProvider = new ApifyProvider();
    }
  } catch (e) {
    console.error('[ScraperService] Provider initialization failed:', e);
  }
  return { playwright: playwrightProvider, apify: apifyProvider };
}

function processNextJob() {
  if (activeJobs.size < MAX_CONCURRENT_JOBS && jobQueue.length > 0) {
    const nextJob = jobQueue.shift();
    if (nextJob) {
      nextJob();
    }
  }
}

export async function startDiscoveryJob(industry: string, city: string, filters: any): Promise<number> {
  const jobId = runSql(
    `INSERT INTO scraping_jobs (industry, city, filters, status, progress, total_found, validated_count, rejected_count, logs) 
     VALUES (?, ?, ?, 'pending', 0, 0, 0, 0, '[]')`,
    [industry, city, JSON.stringify(filters)]
  );
  
  const executeFn = () => {
    executeJob(jobId, { industry, city, filters }).catch(err => {
      console.error(`\x1b[41m[CRITICAL] Job ${jobId} failed unexpectedly:\x1b[0m`, err);
      updateJobState(jobId, 0, 0, `FATAL PIPELINE CRASH: ${err.message}`);
      runSql(`UPDATE scraping_jobs SET status = 'failed', error_message = ? WHERE id = ?`, [err.message, jobId]);
    }).finally(() => {
      processNextJob();
    });
  };

  // Queue or Execute
  if (activeJobs.size >= MAX_CONCURRENT_JOBS) {
    jobQueue.push(executeFn);
    updateJobState(jobId, 0, 0, `Queued. Waiting for available slot...`);
  } else {
    setImmediate(executeFn);
  }

  return jobId;
}

export function getActiveJobCount() {
  return activeJobs.size;
}

export function getQueuedJobCount() {
  return jobQueue.length;
}

async function updateJobState(jobId: number, progress: number, found: number, logMsg?: string) {
  try {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    const job = queryOne(`SELECT logs FROM scraping_jobs WHERE id = ?`, [jobId]);
    const logs = JSON.parse(job?.logs || '[]');
    if (logMsg) logs.push(`${timestamp}: ${logMsg}`);
    const newProgress = progress >= 0 ? progress : undefined;
    runSql(
      `UPDATE scraping_jobs SET 
        ${newProgress !== undefined ? 'progress = ?,' : ''} 
        total_found = ?, 
        logs = ? 
      WHERE id = ?`, 
      newProgress !== undefined ? [newProgress, found, JSON.stringify(logs), jobId] : [found, JSON.stringify(logs), jobId]
    );
  } catch (e) {
    console.error(`[ScraperService] Failed to update job ${jobId} state:`, e);
  }
}

async function incrementJobCount(jobId: number, type: 'validated' | 'rejected') {
  try {
    const column = type === 'validated' ? 'validated_count' : 'rejected_count';
    runSql(`UPDATE scraping_jobs SET ${column} = ${column} + 1 WHERE id = ?`, [jobId]);
  } catch (e) {}
}

async function processLeadImmediately(jobId: number, raw: DiscoveredLead, origin?: GeoLocation, radiusKm?: number): Promise<number | null> {
  try {
    const cleanName = raw.business_name.trim();
    
    // 1. Distance Filtering
    if (origin && raw.latitude && raw.longitude && radiusKm && FeatureFlags.GEO_INTELLIGENCE) {
      const dist = GeoEngine.calculateDistance(origin.lat, origin.lng, raw.latitude, raw.longitude);
      if (dist > radiusKm) {
        await updateJobState(jobId, -1, -1, `[Filtered] ${cleanName} is ${dist.toFixed(1)}km away (Radius: ${radiusKm}km)`);
        await incrementJobCount(jobId, 'rejected');
        return null;
      }
    }

    // 2. Deduplication
    if (isDuplicate(raw as any)) {
      await incrementJobCount(jobId, 'rejected');
      return null;
    }

    const scoreData = calculateScore(raw as any);
    const rankingReason = scoreData.insight || scoreData.reasons.join(' | ');

    const leadId = runSql(
      `INSERT INTO leads (
        business_name, phone, email, website, instagram, category, 
        address, city, rating, review_count, source, source_id,
        latitude, longitude, score, quality_label, ranking_reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cleanName, raw.phone, raw.email, raw.website, raw.instagram, raw.category,
        raw.address, raw.city, raw.rating, raw.review_count, raw.source_provider, jobId,
        raw.latitude || null, raw.longitude || null, scoreData.total, scoreData.label, rankingReason
      ]
    );
    await incrementJobCount(jobId, 'validated');

    // 3. Intelligence Pipeline (Backgrounded)
    setImmediate(async () => {
      try {
        if (FeatureFlags.REAL_TIME_VALIDATION) runValidationPipeline(leadId);
        if (FeatureFlags.GEMINI_ANALYSIS && scoreData.total >= 40) await analyzeLeadBackground(leadId);
      } catch (e) {
        console.error(`[ScraperService] Intelligence pipeline failed for lead ${leadId}:`, e);
      }
    });

    return leadId;
  } catch (err: any) {
    console.error(`[ScraperService] Lead processing failed:`, err);
    return null;
  }
}

async function executeJob(jobId: number, query: DiscoveryQuery) {
  if (activeJobs.has(jobId)) return;
  activeJobs.set(jobId, true);

  try {
    await updateJobState(jobId, 5, 0, `Initializing Intelligent Pipeline v4.1...`);
    runSql(`UPDATE scraping_jobs SET status = 'running' WHERE id = ?`, [jobId]);

    const { playwright, apify } = getProviders();
    let totalInserted = 0;
    const seenNames = new Set<string>();
    let currentQuery = { ...query };
    let origin: GeoLocation | null = null;

    // Phase 1: Geo-Intelligence Resolution
    if (query.filters?.location && FeatureFlags.GEO_INTELLIGENCE) {
      await updateJobState(jobId, 10, 0, `[Geo] Resolving semantic location: "${query.filters.location}"...`);
      try {
        origin = await GeoEngine.resolveLocation(query.filters.location);
        if (origin) {
          currentQuery.lat = origin.lat;
          currentQuery.lng = origin.lng;
          await updateJobState(jobId, 15, 0, `[Geo] Resolved to ${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)} (${origin.name || 'Custom Area'})`);
        } else {
          await updateJobState(jobId, 15, 0, `[Geo] Warning: Could not resolve specific coordinates. Using city-wide search.`);
        }
      } catch (e) {
        await updateJobState(jobId, 15, 0, `[Geo] Resolver failed. Falling back to basic search.`);
      }
    }

    let attempt = 0;
    const maxAttempts = 3;
    const minTarget = 8;
    const radius = query.filters?.radius || 10;

    while (attempt < maxAttempts && totalInserted < minTarget) {
      attempt++;
      await updateJobState(jobId, 20 + (attempt * 20), totalInserted, `--- DISCOVERY CYCLE ${attempt}/${maxAttempts} ---`);
      
      let rawResults: DiscoveredLead[] = [];

      // Provider 1: Playwright
      if (playwright && playwright.isAvailable() && FeatureFlags.PLAYWRIGHT_SCRAPING) {
        await updateJobState(jobId, -1, totalInserted, `Launching Geo-Scoped Scraper...`);
        try {
          const results = await playwright.search(currentQuery, (msg) => updateJobState(jobId, -1, totalInserted, msg));
          rawResults.push(...results);
        } catch (e: any) {
          await updateJobState(jobId, -1, totalInserted, `[Error] Playwright module failed: ${e.message}`);
        }
      }

      // Provider 2: Apify Fallback
      if (rawResults.length < 5 && apify && apify.isAvailable() && FeatureFlags.APIFY_INTEGRATION) {
        await updateJobState(jobId, -1, totalInserted, `Low yield. Activating Cloud Expansion...`);
        try {
          const cloudResults = await apify.search(currentQuery, (msg) => updateJobState(jobId, -1, totalInserted, msg));
          rawResults.push(...cloudResults);
        } catch (e: any) {
          await updateJobState(jobId, -1, totalInserted, `[Error] Apify module failed: ${e.message}`);
        }
      }

      // Pipeline Phase 2: Processing & Geospatial Filtering
      if (rawResults.length > 0) {
        for (const raw of rawResults) {
          const normName = raw.business_name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (seenNames.has(normName)) continue;
          seenNames.add(normName);

          const leadId = await processLeadImmediately(jobId, raw, origin || undefined, radius);
          if (leadId) totalInserted++;
        }
      }

      // Phase 3: Smart Query Expansion
      if (totalInserted < minTarget && attempt < maxAttempts) {
        const expansion = attempt === 1 ? "Keyword synonym expansion" : "Geo-radius expansion";
        await updateJobState(jobId, -1, totalInserted, `Target not met. Applying ${expansion}...`);
        if (attempt === 1) currentQuery.industry = `Best ${currentQuery.industry} near ${query.city}`;
        else currentQuery.radiusKm = (currentQuery.radiusKm || radius) + 5;
      }
    }

    const finalStatus = totalInserted > 0 ? 'completed' : 'failed';
    runSql(`UPDATE scraping_jobs SET status = ?, progress = 100, total_found = ?, completed_at = datetime('now') WHERE id = ?`, [finalStatus, totalInserted, jobId]);
    await updateJobState(jobId, 100, totalInserted, `Pipeline Finished. ${totalInserted} leads captured.`);

  } catch (err: any) {
    console.error(`[Job ${jobId}] Pipeline execution failed:`, err);
    await updateJobState(jobId, 0, 0, `PIPELINE ERROR: ${err.message}`);
    runSql(`UPDATE scraping_jobs SET status = 'failed', error_message = ? WHERE id = ?`, [err.message, jobId]);
  } finally {
    activeJobs.delete(jobId);
  }
}

export function getJobs(): DiscoveryJob[] {
  return queryAll(`SELECT * FROM scraping_jobs ORDER BY created_at DESC LIMIT 20`);
}

export function getJobDetails(id: number): any {
  const job = queryOne(`SELECT * FROM scraping_jobs WHERE id = ?`, [id]);
  if (!job) return null;
  const leads = queryAll(`SELECT * FROM leads WHERE source_id = ? ORDER BY score DESC`, [id]);
  const logs = JSON.parse(job.logs || '[]');
  return { ...job, leads, logs };
}

