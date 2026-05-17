import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';
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
      console.error('[GeoEngine] Failed to initialize Gemini client:', e);
    }
  }
  return genAI;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
}

/**
 * Lead Intelligence OS — Geo-Intelligence Engine (v4.1)
 */
export class GeoEngine {
  /**
   * Semantically normalize a location description using Gemini
   */
  static async resolveLocation(description: string): Promise<GeoLocation | null> {
    if (!FeatureFlags.GEO_INTELLIGENCE) {
      console.warn('[GeoEngine] Geolocation is disabled by feature flag.');
      return null;
    }

    try {
      // 1. Detect if it's a Google Maps URL
      if (description.includes('google.com/maps') || description.includes('goo.gl/maps')) {
        return this.extractFromMapsUrl(description);
      }

      // 2. Semantic Analysis using Gemini
      const client = getGenAIClient();
      if (!client) {
        console.warn('[GeoEngine] Gemini not available for location resolution.');
        return null;
      }

      const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        Analyze this location description: "${description}"
        Identify the primary landmark, building, or area name.
        If it's a city or specific area in Kerala (or India), provide the canonical name.
        Return ONLY a JSON object: { "name": "string", "area": "string", "likely_lat": number, "likely_lng": number }
        Example: "near Lulu Mall Kochi" -> { "name": "Lulu Mall", "area": "Kochi", "likely_lat": 10.0271, "likely_lng": 76.3080 }
      `;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{.*\}/s);
      if (match) {
        const data = JSON.parse(match[0]);
        return {
          lat: data.likely_lat,
          lng: data.likely_lng,
          name: data.name,
          address: `${data.name}, ${data.area}`
        };
      }
    } catch (e) {
      console.error('[GeoEngine] Location resolution failed:', e);
    }

    return null;
  }

  /**
   * Extract coordinates from a Google Maps URL
   */
  static async extractFromMapsUrl(url: string): Promise<GeoLocation | null> {
    try {
      // Regex for @lat,lng
      const match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2])
        };
      }

      // If it's a short URL, we might need to resolve it
      if (url.includes('goo.gl/maps')) {
        const response = await axios.get(url, { 
          maxRedirects: 5,
          timeout: 5000,
          validateStatus: (status) => status < 400 
        });
        const finalUrl = response.request.res.responseUrl || url;
        const finalMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (finalMatch) {
          return {
            lat: parseFloat(finalMatch[1]),
            lng: parseFloat(finalMatch[2])
          };
        }
      }
    } catch (e) {
      console.error('[GeoEngine] URL Extraction failed:', e);
    }
    return null;
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    try {
      if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;

      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    } catch (e) {
      return 9999;
    }
  }
}
