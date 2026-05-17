import { queryOne, runSql } from '../database';

export interface DiscoveryQuery {
  industry: string;
  city: string;
  location?: string; // Landmark, Building, or URL
  radiusKm?: number;
  lat?: number;
  lng?: number;
  filters?: any;
}

export interface DiscoveredLead {
  business_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  rating: number | null;
  review_count: number | null;
  latitude?: number | null;
  longitude?: number | null;
  source_provider: string;
}

export interface DiscoveryProvider {
  name: string;
  isFree: boolean;
  dailyQuota: number;
  
  isAvailable(): boolean;
  search(query: DiscoveryQuery, onProgress?: (msg: string) => void): Promise<DiscoveredLead[]>;
  enrich?(url: string): Promise<Partial<DiscoveredLead> | null>;
}

export class ProviderRateLimiter {
  static checkQuota(providerName: string, maxCalls: number): boolean {
    const today = new Date().toISOString().split('T')[0];
    const record = queryOne(`SELECT calls FROM provider_usage WHERE provider_name = ? AND date = ?`, [providerName, today]);
    
    if (!record) return true;
    return record.calls < maxCalls;
  }

  static incrementQuota(providerName: string): void {
    const today = new Date().toISOString().split('T')[0];
    runSql(`
      INSERT INTO provider_usage (provider_name, date, calls) 
      VALUES (?, ?, 1)
      ON CONFLICT(provider_name, date) 
      DO UPDATE SET calls = calls + 1
    `, [providerName, today]);
  }
}

export function normalizeKeyword(keyword: string): string {
  if (!keyword) return '';
  let k = keyword.toLowerCase().trim();
  
  // Spell Correction & Synonyms Dictionary
  const dict: Record<string, string[]> = {
    'salon': ['saloons', 'saloon', 'slone', 'saln', 'haircut', 'beauty parlor'],
    'restaurant': ['restuarant', 'restauraunt', 'restarant', 'diner', 'eatery'],
    'gym': ['gyms', 'fitness center', 'workout', 'gim'],
    'boutique': ['boutiques', 'apparel', 'clothing store'],
    'hotel': ['hotels', 'motel', 'lodge', 'inn'],
    'cafe': ['cafes', 'coffee shop', 'cofe'],
  };

  // Check dictionary
  for (const [canonical, variations] of Object.entries(dict)) {
    if (k === canonical || variations.includes(k)) return canonical;
    // Basic fuzzy match
    for (const v of variations) {
      if (k.includes(v) || v.includes(k)) return canonical;
    }
  }

  // Location Normalization (Basic)
  const locDict: Record<string, string[]> = {
    'Thrissur': ['thrisur', 'thrisyr', 'thrisoor'],
    'Kochi': ['cochin', 'ernakulam']
  };
  for (const [canonical, variations] of Object.entries(locDict)) {
    if (k === canonical.toLowerCase() || variations.includes(k)) return canonical;
  }

  return k;
}
