// ============================================================
// Lead Intelligence OS — CSV/JSON Import Service
// ============================================================

import { queryOne, runSql, saveDatabase, getDatabase } from '../database';
import { LeadCreateInput, ImportResult } from '../types';
import { calculateScore } from './scoring.service';
import { validateLead } from './validation.service';

// Common column name mappings for CSV imports
const COLUMN_MAPPINGS: Record<string, string> = {
  'business_name': 'business_name', 'businessname': 'business_name',
  'business name': 'business_name', 'name': 'business_name',
  'company': 'business_name', 'company_name': 'business_name',
  'companyname': 'business_name', 'title': 'business_name',
  'place_name': 'business_name',
  'phone': 'phone', 'phone_number': 'phone', 'phonenumber': 'phone',
  'telephone': 'phone', 'tel': 'phone', 'mobile': 'phone', 'contact': 'phone',
  'email': 'email', 'email_address': 'email', 'emailaddress': 'email',
  'e-mail': 'email', 'mail': 'email',
  'website': 'website', 'url': 'website', 'web': 'website',
  'site': 'website', 'website_url': 'website', 'homepage': 'website',
  'instagram': 'instagram', 'ig': 'instagram',
  'instagram_url': 'instagram', 'insta': 'instagram',
  'category': 'category', 'type': 'category',
  'business_type': 'category', 'industry': 'category', 'categories': 'category',
  'address': 'address', 'full_address': 'address',
  'location': 'address', 'street': 'address',
  'city': 'city', 'town': 'city', 'locality': 'city',
  'rating': 'rating', 'stars': 'rating',
  'average_rating': 'rating', 'avg_rating': 'rating', 'total_score': 'rating',
  'review_count': 'review_count', 'reviewcount': 'review_count',
  'reviews': 'review_count', 'review_number': 'review_count',
  'total_reviews': 'review_count', 'reviews_count': 'review_count',
  'num_reviews': 'review_count',
};

export function normalizeColumnName(header: string): string | null {
  const normalized = header.trim().toLowerCase().replace(/[^a-z0-9_\s-]/g, '');
  return COLUMN_MAPPINGS[normalized] || null;
}

export function parseRow(row: Record<string, string>): LeadCreateInput | null {
  const mapped: Record<string, string> = {};

  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = normalizeColumnName(key);
    if (normalizedKey && value && value.trim() !== '') {
      mapped[normalizedKey] = value.trim();
    }
  }

  if (!mapped.business_name) return null;

  return {
    business_name: mapped.business_name,
    phone: mapped.phone || null,
    email: mapped.email || null,
    website: mapped.website || null,
    instagram: mapped.instagram || null,
    category: mapped.category || null,
    address: mapped.address || null,
    city: mapped.city || null,
    rating: mapped.rating ? parseFloat(mapped.rating) : null,
    review_count: mapped.review_count ? parseInt(mapped.review_count, 10) : null,
  };
}

export function isDuplicate(lead: LeadCreateInput): boolean {
  if (lead.phone) {
    const existing = queryOne(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER(?) AND phone = ?',
      [lead.business_name, lead.phone]
    );
    if (existing) return true;
  }

  if (lead.email) {
    const existing = queryOne(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER(?) AND email = ?',
      [lead.business_name, lead.email]
    );
    if (existing) return true;
  }

  if (lead.website) {
    const existing = queryOne(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER(?) AND website = ?',
      [lead.business_name, lead.website]
    );
    if (existing) return true;
  }

  if (!lead.phone && !lead.email && !lead.website && lead.address) {
    const existing = queryOne(
      'SELECT id FROM leads WHERE LOWER(business_name) = LOWER(?) AND address = ?',
      [lead.business_name, lead.address]
    );
    if (existing) return true;
  }

  return false;
}

export function importLead(lead: LeadCreateInput): number {
  const scoreResult = calculateScore(lead as any);
  const validation = validateLead(lead);

  const leadId = runSql(
    `INSERT INTO leads (business_name, phone, email, website, instagram, category, address, city, rating, review_count, score, quality_label, status, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)`,
    [
      lead.business_name, lead.phone, lead.email, lead.website,
      lead.instagram, lead.category, lead.address, lead.city,
      lead.rating, lead.review_count, scoreResult.total, scoreResult.label,
      lead.tags ? JSON.stringify(lead.tags) : null,
    ]
  );

  runSql(
    `INSERT INTO validation_results (lead_id, phone_valid, phone_details, email_valid, email_details, website_valid, website_details, instagram_valid, instagram_details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      leadId,
      validation.phone?.valid ? 1 : validation.phone ? 0 : null,
      validation.phone?.details || null,
      validation.email?.valid ? 1 : validation.email ? 0 : null,
      validation.email?.details || null,
      validation.website?.valid ? 1 : validation.website ? 0 : null,
      validation.website?.details || null,
      validation.instagram?.valid ? 1 : validation.instagram ? 0 : null,
      validation.instagram?.details || null,
    ]
  );

  return leadId;
}

export function batchImport(rows: Record<string, string>[], filename: string, source: string = 'csv'): ImportResult {
  const result: ImportResult = {
    imported: 0,
    duplicates: 0,
    failed: 0,
    errors: [],
    lead_ids: [],
  };

  for (let i = 0; i < rows.length; i++) {
    try {
      const parsed = parseRow(rows[i]);
      if (!parsed) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: Missing business name or could not parse`);
        continue;
      }

      if (isDuplicate(parsed)) {
        result.duplicates++;
        continue;
      }

      const leadId = importLead(parsed);
      result.imported++;
      result.lead_ids.push(leadId);
    } catch (err: any) {
      result.failed++;
      result.errors.push(`Row ${i + 1}: ${err.message}`);
    }
  }

  // Log import history
  runSql(
    `INSERT INTO import_history (filename, source, total_rows, imported_rows, duplicate_rows, failed_rows, errors)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [filename, source, rows.length, result.imported, result.duplicates, result.failed,
     result.errors.length > 0 ? JSON.stringify(result.errors) : null]
  );

  saveDatabase();
  return result;
}

export function importFromJSON(data: Record<string, string>[], filename: string = 'json-import'): ImportResult {
  return batchImport(data, filename, 'json');
}
