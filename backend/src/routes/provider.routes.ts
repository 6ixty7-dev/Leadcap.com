import { Router, Request, Response } from 'express';
import { queryOne } from '../database';

const router = Router();

// GET /api/providers/status
router.get('/status', (req: Request, res: Response) => {
  const today = new Date().toISOString().split('T')[0];

  const getUsage = (name: string) => {
    const record = queryOne(`SELECT calls FROM provider_usage WHERE provider_name = ? AND date = ?`, [name, today]);
    return record ? record.calls : 0;
  };

  const providers = [
    {
      id: 'playwright',
      name: 'Playwright (Google Maps)',
      type: 'discovery',
      isFree: true,
      requiresKey: false,
      isConfigured: true, // Installed locally
      quotaUsed: getUsage('playwright-maps'),
      dailyQuota: 100,
      envVar: null
    },
    {
      id: 'apify',
      name: 'Apify (Google Maps Fallback)',
      type: 'discovery',
      isFree: false,
      requiresKey: true,
      isConfigured: !!process.env.APIFY_API_TOKEN,
      quotaUsed: getUsage('apify-google-maps'),
      dailyQuota: 20,
      envVar: 'APIFY_API_TOKEN'
    },
    {
      id: 'firecrawl',
      name: 'Firecrawl (Enrichment)',
      type: 'enrichment',
      isFree: false,
      requiresKey: true,
      isConfigured: !!process.env.FIRECRAWL_API_KEY,
      quotaUsed: getUsage('firecrawl-enrichment'),
      dailyQuota: 50,
      envVar: 'FIRECRAWL_API_KEY'
    },
    {
      id: 'gemini',
      name: 'Google Gemini (AI)',
      type: 'ai',
      isFree: false,
      requiresKey: true,
      isConfigured: !!process.env.GEMINI_API_KEY,
      quotaUsed: getUsage('gemini-analysis'),
      dailyQuota: 1000,
      envVar: 'GEMINI_API_KEY'
    }
  ];

  res.json({ success: true, data: providers });
});

// POST /api/providers/test
router.post('/test', async (req: Request, res: Response) => {
  const { providerId, url, industry, city } = req.body;
  
  try {
    let result = null;
    
    if (providerId === 'apify') {
      const { ApifyProvider } = await import('../providers/apify.provider');
      const provider = new ApifyProvider();
      if (!provider.isAvailable()) throw new Error('Apify is not configured or quota exceeded');
      result = await provider.search({ industry: industry || 'Gyms', city: city || 'Austin' });
    } 
    else if (providerId === 'playwright') {
      const { PlaywrightProvider } = await import('../providers/playwright.provider');
      const provider = new PlaywrightProvider();
      if (!provider.isAvailable()) throw new Error('Playwright is not available');
      result = await provider.search({ industry: industry || 'Gyms', city: city || 'Austin' });
    }
    else if (providerId === 'firecrawl') {
      const { FirecrawlProvider } = await import('../providers/firecrawl.provider');
      const provider = new FirecrawlProvider();
      if (!provider.isAvailable()) throw new Error('Firecrawl is not configured');
      result = await provider.enrich(url || 'https://example.com');
    }
    else {
      throw new Error('Unknown provider ID');
    }

    res.json({ success: true, provider: providerId, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
