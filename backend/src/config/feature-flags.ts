/**
 * Lead Intelligence OS — Feature Flags (v4.1)
 * Controls the availability of advanced modules to prevent global crashes.
 */

export const FeatureFlags = {
  // Discovery & Scraping
  PLAYWRIGHT_SCRAPING: true,
  APIFY_INTEGRATION: true,
  FIRECRAWL_ENRICHMENT: true,
  
  // Intelligence Engine
  GEMINI_ANALYSIS: true,
  RANKING_ENGINE: true,
  GEO_INTELLIGENCE: true,
  
  // Validation
  REAL_TIME_VALIDATION: true,
  
  // Performance
  PARALLEL_PROCESSING: false, // Experimental
  LIGHTWEIGHT_MODE: process.env.NODE_ENV !== 'production', // true for development
};

/**
 * Registry to track module status dynamically
 */
export const ModuleStatus = {
  DATABASE: 'pending',
  EXPRESS: 'pending',
  GEO_ENGINE: 'pending',
  AI_ENGINE: 'pending',
  RANKING_ENGINE: 'pending',
  DISCOVERY_ENGINE: 'pending',
  APIFY: 'pending',
  FIRECRAWL: 'pending'
};

export const StartupErrors: string[] = [];

export function logStartupError(module: string, error: any) {
  const message = error instanceof Error ? error.message : String(error);
  StartupErrors.push(`[${module}] ${message}`);
  console.error(`\x1b[31m[BOOT ERROR] ${module} failed to initialize:\x1b[0m`, error);
}
