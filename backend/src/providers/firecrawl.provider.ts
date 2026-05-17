import { DiscoveryProvider, DiscoveryQuery, DiscoveredLead, ProviderRateLimiter } from './index';

export class FirecrawlProvider implements DiscoveryProvider {
  name = 'firecrawl';
  isFree = false;
  dailyQuota = 1000;

  isAvailable(): boolean {
    const key = process.env.FIRECRAWL_API_KEY;
    return !!key && key !== 'your_firecrawl_api_key_here' && ProviderRateLimiter.checkQuota(this.name, this.dailyQuota);
  }

  async search(_query: DiscoveryQuery): Promise<DiscoveredLead[]> {
    // Firecrawl is primary used for enrichment, not discovery of businesses by geo
    return [];
  }

  async enrich(url: string): Promise<Partial<DiscoveredLead> | null> {
    const key = process.env.FIRECRAWL_API_KEY;
    if (!key) return null;

    ProviderRateLimiter.incrementQuota(this.name);

    try {
      const response = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify({
          url,
          extractorOptions: {
            mode: 'llm',
            extractionSchema: {
              type: 'object',
              properties: {
                email: { type: 'string' },
                instagram: { type: 'string' },
                phone: { type: 'string' }
              }
            }
          }
        })
      });

      if (!response.ok) return null;
      
      const res = (await response.json() as any);
      const data = res.data?.llm_extraction || res.data;

      if (!data) return null;

      return {
        email: data.email || null,
        instagram: data.instagram || null,
        phone: data.phone || null
      };
    } catch (err) {
      console.error('[Firecrawl Error]', err);
      return null;
    }
  }
}
