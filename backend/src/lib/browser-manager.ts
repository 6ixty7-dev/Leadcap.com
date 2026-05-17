import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { FeatureFlags } from '../config/feature-flags';

export class BrowserManager {
  private static browser: Browser | null = null;
  private static context: BrowserContext | null = null;
  private static activePages = 0;
  private static MAX_PAGES = 3; // Limit concurrency
  private static requestQueue: ((page: Page) => void)[] = [];
  private static idleTimer: NodeJS.Timeout | null = null;

  static async getPage(): Promise<Page> {
    if (!this.browser) {
      console.log('[BrowserManager] Launching Singleton Chromium Instance...');
      const args = [
        '--disable-gpu',
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled'
      ];
      
      if (FeatureFlags.LIGHTWEIGHT_MODE) {
        args.push('--js-flags="--max-old-space-size=512"');
        args.push('--disable-extensions');
        args.push('--mute-audio');
        args.push('--disable-background-networking');
      }

      this.browser = await chromium.launch({
        headless: true,
        timeout: 30000,
        args
      });
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
      });
      
      this.browser.on('disconnected', () => {
        console.log('[BrowserManager] Browser disconnected, cleaning up...');
        this.browser = null;
        this.context = null;
        this.activePages = 0;
      });
    }

    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    if (this.activePages >= this.MAX_PAGES) {
      return new Promise<Page>((resolve) => {
        this.requestQueue.push(resolve);
      });
    }

    this.activePages++;
    const page = await this.context!.newPage();
    return page;
  }

  static async releasePage(page: Page) {
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (e) {
      console.error('[BrowserManager] Error closing page:', e);
    } finally {
      this.activePages--;
      
      if (this.requestQueue.length > 0) {
        const nextReq = this.requestQueue.shift();
        if (nextReq && this.context) {
          this.activePages++;
          this.context.newPage().then(nextReq).catch(err => {
            this.activePages--;
            console.error('[BrowserManager] Error creating queued page:', err);
          });
        }
      } else if (this.activePages <= 0) {
        this.scheduleCleanup();
      }
    }
  }

  private static scheduleCleanup() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(async () => {
      console.log('[BrowserManager] Closing idle browser instance...');
      if (this.browser) {
        await this.browser.close().catch(() => {});
        this.browser = null;
        this.context = null;
        this.activePages = 0;
      }
    }, 60000); // Close after 1 min of inactivity
  }

  static getDiagnostics() {
    return {
      browserActive: this.browser !== null,
      activePages: this.activePages,
      queuedRequests: this.requestQueue.length,
    };
  }

  static async forceCleanup() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.context = null;
    }
    this.activePages = 0;
    this.requestQueue = [];
    if (this.idleTimer) clearTimeout(this.idleTimer);
  }
}
