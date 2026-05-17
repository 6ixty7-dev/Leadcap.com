import { DiscoveryProvider, DiscoveryQuery, DiscoveredLead, ProviderRateLimiter, normalizeKeyword } from './index';
import { BrowserManager } from '../lib/browser-manager';

export class PlaywrightProvider implements DiscoveryProvider {
  name = 'playwright-maps';
  isFree = true;
  dailyQuota = 100;

  isAvailable(): boolean {
    return ProviderRateLimiter.checkQuota(this.name, this.dailyQuota);
  }

  async search(query: DiscoveryQuery, onProgress?: (msg: string) => void): Promise<DiscoveredLead[]> {
    ProviderRateLimiter.incrementQuota(this.name);
    
    const industry = normalizeKeyword(query.industry);
    const searchQuery = `${industry} in ${query.city}`;
    
    if (onProgress) onProgress(`[Playwright] Initializing Engine: ${searchQuery}`);
    
    const leads: DiscoveredLead[] = [];
    let page;
    
    try {
      page = await BrowserManager.getPage();
      
      // Navigate to Google Maps
      const url = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;
      if (onProgress) onProgress(`[Playwright] Navigating to Maps (DOM Load phase)...`);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      if (onProgress) onProgress(`[Playwright] Waiting for results feed...`);
      
      // Step 2: Scrolling to load results
      const scrollSelector = 'div[role="feed"]';
      try {
        await page.waitForSelector(scrollSelector, { timeout: 15000 });
        if (onProgress) onProgress(`[Playwright] Feed detected. Loading results...`);
        
        // Scroll to load ~30-40 results
        for (let i = 0; i < 4; i++) {
          await page.evaluate((sel) => {
            // @ts-ignore
            const feed = (document as any).querySelector(sel);
            if (feed) {
              feed.scrollBy(0, 1000);
            }
          }, scrollSelector);
          await page.waitForTimeout(2000);
        }
      } catch (e) {
        if (onProgress) onProgress(`[Playwright] Warning: Results feed not found. Maps might have blocked this request or UI changed.`);
        // Try fallback selector for immediate results if feed missing
      }

      // Step 3: Extraction using robust selectors
      if (onProgress) onProgress(`[Playwright] Extracting business data...`);
      
      const results = await page.evaluate(() => {
        // Selector heuristics found via browser investigation
        // @ts-ignore
        const containers = Array.from((document as any).querySelectorAll('div[role="article"], div.Nv2Ybe, a.hfpxzc'));
        const extracted = [];
        const seenNames = new Set();

        for (const el of containers) {
          const item = el as any;
          
          // Get Name: Main link aria-label is most reliable
          let name = item.getAttribute('aria-label') || '';
          if (!name) {
            const headline = item.querySelector('div.fontHeadlineSmall') || item.querySelector('h3');
            name = headline?.textContent || '';
          }
          
          name = name.trim();
          if (!name || seenNames.has(name)) continue;
          seenNames.add(name);

          // Find specific buttons/links
          const websiteLink = item.querySelector('a.lcr4fd') || item.querySelector('a[data-value="Website"]');
          const website = websiteLink?.getAttribute('href') || null;

          // Get all text content for heuristic parsing
          const parent = item.closest('div.Nv2Ybe') || item.parentElement;
          const fullText = parent?.innerText || item.innerText || '';
          
          extracted.push({
            name,
            fullText,
            website
          });
        }
        return extracted;
      });

      if (onProgress) onProgress(`[Playwright] Parsed ${results.length} raw cards from DOM.`);

      for (const res of results) {
        // Heuristic parsers
        const phoneMatch = res.fullText.match(/(\+?\d{1,4}[\s\-]?)?(\(?\d{3}\)?[\s\-]?)?\d{3}[\s\-]?\d{4}/);
        const ratingMatch = res.fullText.match(/(\d\.\d)\s?★/);
        const reviewsMatch = res.fullText.match(/\((\d{1,5})\)/);
        
        // Clean address (often lines following the name/rating)
        const lines = res.fullText.split('\n').filter((l: string) => l.trim().length > 5);
        const address = lines.length > 1 ? lines[1] : null;

        leads.push({
          business_name: res.name,
          phone: phoneMatch ? phoneMatch[0].trim() : null,
          email: null,
          website: res.website || (res.fullText.match(/(https?:\/\/[^\s]+)/)?.[0] || null),
          instagram: null,
          address: address,
          city: query.city,
          category: industry,
          rating: ratingMatch ? parseFloat(ratingMatch[1]) : null,
          review_count: reviewsMatch ? parseInt(reviewsMatch[1].replace(/[^0-9]/g, '')) : 0,
          source_provider: this.name
        });
      }

      if (onProgress) onProgress(`[Playwright] Discovery complete. Produced ${leads.length} leads.`);

    } catch (err: any) {
      console.error('[Playwright Provider Fatal]', err);
      if (onProgress) onProgress(`[Playwright] CRITICAL ERROR: ${err.message}`);
    } finally {
      if (page) {
        await BrowserManager.releasePage(page);
      }
    }

    return leads;
  }
}
