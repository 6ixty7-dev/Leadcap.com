// ============================================================
// Lead Intelligence OS — Export Service
// ============================================================

import { queryAll } from '../database';
import { Lead, LeadFilters } from '../types';

function getFilteredLeads(filters: LeadFilters): Lead[] {
  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    whereClause += ' AND (LOWER(business_name) LIKE ? OR LOWER(category) LIKE ?)';
    const term = `%${filters.search.toLowerCase()}%`;
    params.push(term, term);
  }
  if (filters.category) { whereClause += ' AND LOWER(category) = LOWER(?)'; params.push(filters.category); }
  if (filters.quality_label) { whereClause += ' AND quality_label = ?'; params.push(filters.quality_label); }
  if (filters.status) { whereClause += ' AND status = ?'; params.push(filters.status); }
  if (filters.city) { whereClause += ' AND LOWER(city) = LOWER(?)'; params.push(filters.city); }
  if (filters.min_score !== undefined) { whereClause += ' AND score >= ?'; params.push(filters.min_score); }
  if (filters.max_score !== undefined) { whereClause += ' AND score <= ?'; params.push(filters.max_score); }

  return queryAll(`SELECT * FROM leads ${whereClause} ORDER BY score DESC`, params) as Lead[];
}

export function exportToCSV(filters: LeadFilters, columns?: string[]): string {
  const leads = getFilteredLeads(filters);
  const defaultColumns = [
    'business_name', 'category', 'phone', 'email', 'website',
    'instagram', 'address', 'city', 'rating', 'review_count',
    'score', 'quality_label', 'status'
  ];
  const cols = columns && columns.length > 0 ? columns : defaultColumns;
  const header = cols.join(',');
  const rows = leads.map(lead => {
    return cols.map(col => {
      const value = (lead as any)[col];
      if (value === null || value === undefined) return '';
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',');
  });
  return [header, ...rows].join('\n');
}

export function exportToJSON(filters: LeadFilters): string {
  return JSON.stringify(getFilteredLeads(filters), null, 2);
}

export function getExportData(filters: LeadFilters): Lead[] {
  return getFilteredLeads(filters);
}
