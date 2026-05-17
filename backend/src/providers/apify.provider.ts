import { DiscoveryProvider, DiscoveryQuery, DiscoveredLead, ProviderRateLimiter } from './index';

export class ApifyProvider implements DiscoveryProvider {
  name = 'apify';
  isFree = false; // requires token
  dailyQuota = 500;

  isAvailable(): boolean {
    const token = process.env.APIFY_API_TOKEN;
    return !!token && token !== 'your_apify_api_token_here' && ProviderRateLimiter.checkQuota(this.name, this.dailyQuota);
  }

  async search(query: DiscoveryQuery, onProgress?: (msg: string) => void): Promise<DiscoveredLead[]> {
    const token = process.env.APIFY_API_TOKEN;
    if (!token) return [];
    
    ProviderRateLimiter.incrementQuota(this.name);
    
    const searchQuery = `${query.industry} in ${query.city}`;
    if (onProgress) onProgress(`[Apify] Triggering cloud scraper for: ${searchQuery}`);

    try {
      // Trigger Google Maps Scraper (Apify actor: compass/google-maps-scraper)
      const response = await fetch(`https://api.apify.com/v2/acts/compass~google-maps-scraper/runs?token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries: [searchQuery],
          maxResults: 20,
          zoom: 14,
          language: 'en'
        })
      });

      if (!response.ok) throw new Error(`Apify start error: ${response.statusText}`);
      
      const runData = (await response.json() as any).data;
      const runId = runData.id;
      const datasetId = runData.defaultDatasetId;

      if (onProgress) onProgress(`[Apify] Job started (RunID: ${runId}). Waiting for results...`);

      // Poll for completion
      let status = 'RUNNING';
      let retries = 0;
      const MAX_RETRIES = 36; // 3 minutes max wait

      while ((status === 'RUNNING' || status === 'READY') && retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, 5000));
        const statusRes = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
        const statusData = (await statusRes.json() as any).data;
        status = statusData.status;
        retries++;
        if (onProgress) onProgress(`[Apify] Cloud status: ${status}... (${retries}/${MAX_RETRIES})`);
      }

      if (status !== 'SUCCEEDED') throw new Error(`Apify run failed or timed out. Status: ${status}`);

      // Fetch results
      const resultsRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}`);
      const items = (await resultsRes.json() as any[]);

      if (onProgress) onProgress(`[Apify] Successfully extracted ${items.length} businesses from cloud.`);

      return items.map((item: any) => ({
        business_name: item.title || item.name,
        phone: item.phone,
        email: item.email,
        website: item.website,
        instagram: null,
        address: item.address,
        city: query.city,
        category: query.industry,
        rating: item.totalScore,
        review_count: item.reviewsCount,
        source_provider: this.name
      }));

    } catch (err: any) {
      console.error('[Apify Error]', err.message);
      if (onProgress) onProgress(`[Apify] Error: ${err.message}`);
      return [];
    }
  }
}
