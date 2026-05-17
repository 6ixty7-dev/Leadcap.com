// ============================================================
// Lead Intelligence OS — Lead CRUD Service
// ============================================================

import { queryAll, queryOne, runSql, saveDatabase } from '../database';
import { Lead, LeadFilters, PaginatedResponse, DashboardStats, LeadCreateInput } from '../types';
import { calculateScore } from './scoring.service';
import { validateLead } from './validation.service';

export function getLeads(filters: LeadFilters): PaginatedResponse<Lead> {
  const page = filters.page || 1;
  const limit = filters.limit || 25;
  const offset = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (filters.search) {
    whereClause += ' AND (LOWER(business_name) LIKE ? OR LOWER(category) LIKE ? OR LOWER(city) LIKE ? OR LOWER(phone) LIKE ? OR LOWER(email) LIKE ?)';
    const searchTerm = `%${filters.search.toLowerCase()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (filters.category) {
    whereClause += ' AND LOWER(category) = LOWER(?)';
    params.push(filters.category);
  }

  if (filters.quality_label) {
    whereClause += ' AND quality_label = ?';
    params.push(filters.quality_label);
  }

  if (filters.status) {
    whereClause += ' AND status = ?';
    params.push(filters.status);
  }

  if (filters.city) {
    whereClause += ' AND LOWER(city) = LOWER(?)';
    params.push(filters.city);
  }

  if (filters.min_score !== undefined) {
    whereClause += ' AND score >= ?';
    params.push(filters.min_score);
  }

  if (filters.max_score !== undefined) {
    whereClause += ' AND score <= ?';
    params.push(filters.max_score);
  }

  const validSortColumns = ['business_name', 'score', 'quality_label', 'category', 'status', 'created_at', 'updated_at', 'rating', 'review_count'];
  const sortBy = validSortColumns.includes(filters.sort_by || '') ? filters.sort_by : 'created_at';
  const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

  const countResult = queryOne(`SELECT COUNT(*) as count FROM leads ${whereClause}`, params);
  const total = countResult?.count || 0;

  const leads = queryAll(
    `SELECT * FROM leads ${whereClause} ORDER BY ${sortBy} ${sortOrder} LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  ) as Lead[];

  return {
    success: true,
    data: leads,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export function getLeadById(id: number) {
  const lead = queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead | null;
  if (!lead) return null;

  const validation = queryOne('SELECT * FROM validation_results WHERE lead_id = ? ORDER BY validated_at DESC LIMIT 1', [id]);
  const aiAnalysis = queryOne('SELECT * FROM ai_analysis WHERE lead_id = ? ORDER BY analyzed_at DESC LIMIT 1', [id]);
  const scoreBreakdown = calculateScore(lead as any);

  return { ...lead, validation, ai_analysis: aiAnalysis, score_breakdown: scoreBreakdown };
}

export function createLead(input: LeadCreateInput): Lead {
  const scoreResult = calculateScore(input as any);
  const validation = validateLead(input);

  const leadId = runSql(
    `INSERT INTO leads (business_name, phone, email, website, instagram, category, address, city, rating, review_count, score, quality_label, status, notes, tags)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?)`,
    [
      input.business_name, input.phone || null, input.email || null,
      input.website || null, input.instagram || null, input.category || null,
      input.address || null, input.city || null, input.rating || null,
      input.review_count || null, scoreResult.total, scoreResult.label,
      input.notes || null, input.tags ? JSON.stringify(input.tags) : null,
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

  return queryOne('SELECT * FROM leads WHERE id = ?', [leadId]) as Lead;
}

export function updateLead(id: number, updates: Partial<LeadCreateInput>): Lead | null {
  const existing = queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead | null;
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  const aiAnalysis = queryOne('SELECT * FROM ai_analysis WHERE lead_id = ?', [id]);
  const scoreResult = calculateScore({ ...merged, ai_analysis: aiAnalysis } as any);

  runSql(
    `UPDATE leads SET
      business_name = ?, phone = ?, email = ?, website = ?, instagram = ?,
      category = ?, address = ?, city = ?, rating = ?, review_count = ?,
      score = ?, quality_label = ?, ranking_reason = ?, notes = ?, tags = ?,
      updated_at = datetime('now')
    WHERE id = ?`,
    [
      merged.business_name, merged.phone || null, merged.email || null,
      merged.website || null, merged.instagram || null, merged.category || null,
      merged.address || null, merged.city || null, merged.rating || null,
      merged.review_count || null, scoreResult.total, scoreResult.label,
      scoreResult.insight || scoreResult.reasons.join(' | '),
      updates.notes !== undefined ? updates.notes : existing.notes,
      updates.tags ? JSON.stringify(updates.tags) : existing.tags,
      id,
    ]
  );

  return queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead;
}

export function updateLeadStatus(id: number, status: string): Lead | null {
  const validStatuses = ['new', 'contacted', 'qualified', 'converted', 'rejected', 'archived'];
  if (!validStatuses.includes(status)) return null;

  runSql("UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
  return queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead | null;
}

export function deleteLead(id: number): boolean {
  const existing = queryOne('SELECT id FROM leads WHERE id = ?', [id]);
  if (!existing) return false;
  runSql('DELETE FROM leads WHERE id = ?', [id]);
  return true;
}

export function bulkDeleteLeads(ids: number[]): number {
  const placeholders = ids.map(() => '?').join(',');
  const before = queryOne(`SELECT COUNT(*) as c FROM leads WHERE id IN (${placeholders})`, ids);
  runSql(`DELETE FROM leads WHERE id IN (${placeholders})`, ids);
  return before?.c || 0;
}

export async function retestLead(id: number): Promise<Lead | null> {
  const { runValidationPipeline } = require('./validation.service');
  const { analyzeLead } = require('./ai.service');
  
  const lead = queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead | null;
  if (!lead) return null;

  const timestamp = new Date().toISOString();
  let logs = `[Retest started at ${timestamp}]\n`;

  try {
    // 1. Re-validate
    logs += 'Running Validation Pipeline...\n';
    await runValidationPipeline(id);
    
    // 2. Re-analyze AI
    logs += 'Running AI Quality Analysis...\n';
    await analyzeLead(id);
    
    // 3. Re-calculate Score
    const updatedLead = queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead;
    const aiAnalysis = queryOne('SELECT * FROM ai_analysis WHERE lead_id = ?', [id]);
    const scoreResult = calculateScore({ ...updatedLead, ai_analysis: aiAnalysis } as any);
    
    runSql(
      `UPDATE leads SET 
        score = ?, 
        quality_label = ?, 
        last_verified_at = datetime('now'),
        ranking_reason = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
      [scoreResult.total, scoreResult.label, scoreResult.insight || scoreResult.reasons.join(' | '), id]
    );

    logs += `Retest complete. New Score: ${scoreResult.total} (${scoreResult.label}).\n`;
    runSql('INSERT INTO retest_logs (lead_id, status, logs) VALUES (?, ?, ?)', [id, 'success', logs]);
    
    return queryOne('SELECT * FROM leads WHERE id = ?', [id]) as Lead;
  } catch (err: any) {
    logs += `Retest failed: ${err.message}\n`;
    runSql('INSERT INTO retest_logs (lead_id, status, logs) VALUES (?, ?, ?)', [id, 'failed', logs]);
    throw err;
  }
}


export function getDashboardStats(): DashboardStats {
  const totalLeads = queryOne('SELECT COUNT(*) as count FROM leads')?.count || 0;
  const highQuality = queryOne("SELECT COUNT(*) as count FROM leads WHERE quality_label = 'High Quality'")?.count || 0;
  const good = queryOne("SELECT COUNT(*) as count FROM leads WHERE quality_label = 'Good'")?.count || 0;
  const medium = queryOne("SELECT COUNT(*) as count FROM leads WHERE quality_label = 'Medium'")?.count || 0;
  const lowQuality = queryOne("SELECT COUNT(*) as count FROM leads WHERE quality_label = 'Low Quality'")?.count || 0;
  const avgScore = queryOne('SELECT COALESCE(AVG(score), 0) as avg FROM leads')?.avg || 0;
  const recentImports = queryOne("SELECT COUNT(*) as count FROM import_history WHERE created_at >= datetime('now', '-7 days')")?.count || 0;

  const categoryRows = queryAll('SELECT category, COUNT(*) as count FROM leads WHERE category IS NOT NULL GROUP BY category ORDER BY count DESC LIMIT 10');
  const categoryCounts: Record<string, number> = {};
  categoryRows.forEach((row: any) => { categoryCounts[row.category] = row.count; });

  const statusRows = queryAll('SELECT status, COUNT(*) as count FROM leads GROUP BY status');
  const statusCounts: Record<string, number> = {};
  statusRows.forEach((row: any) => { statusCounts[row.status] = row.count; });

  const scoreDistribution = [
    { range: '0-20', count: queryOne('SELECT COUNT(*) as c FROM leads WHERE score BETWEEN 0 AND 20')?.c || 0 },
    { range: '21-40', count: queryOne('SELECT COUNT(*) as c FROM leads WHERE score BETWEEN 21 AND 40')?.c || 0 },
    { range: '41-60', count: queryOne('SELECT COUNT(*) as c FROM leads WHERE score BETWEEN 41 AND 60')?.c || 0 },
    { range: '61-80', count: queryOne('SELECT COUNT(*) as c FROM leads WHERE score BETWEEN 61 AND 80')?.c || 0 },
    { range: '81-100', count: queryOne('SELECT COUNT(*) as c FROM leads WHERE score BETWEEN 81 AND 100')?.c || 0 },
  ];

  return { totalLeads, highQuality, good, medium, lowQuality, avgScore: Math.round(avgScore * 10) / 10, recentImports, categoryCounts, statusCounts, scoreDistribution };
}

export function getCategories(): string[] {
  return queryAll('SELECT DISTINCT category FROM leads WHERE category IS NOT NULL ORDER BY category').map((r: any) => r.category);
}

export function getCities(): string[] {
  return queryAll('SELECT DISTINCT city FROM leads WHERE city IS NOT NULL ORDER BY city').map((r: any) => r.city);
}

export function rescoreAllLeads(): number {
  const leads = queryAll('SELECT * FROM leads') as Lead[];
  let updated = 0;
  for (const lead of leads) {
    const aiAnalysis = queryOne('SELECT * FROM ai_analysis WHERE lead_id = ?', [lead.id]);
    const result = calculateScore({ ...lead, ai_analysis: aiAnalysis } as any);
    runSql(
      "UPDATE leads SET score = ?, quality_label = ?, ranking_reason = ?, updated_at = datetime('now') WHERE id = ?", 
      [result.total, result.label, result.insight || result.reasons.join(' | '), lead.id]
    );
    updated++;
  }
  saveDatabase();
  return updated;
}
