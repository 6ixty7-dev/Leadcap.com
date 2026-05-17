// ============================================================
// Lead Intelligence OS — Type Definitions
// ============================================================

export interface Lead {
  id: number;
  business_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  category: string | null;
  address: string | null;
  city: string | null;
  rating: number | null;
  review_count: number | null;
  score: number;
  quality_label: QualityLabel;
  status: LeadStatus;
  notes: string | null;
  tags: string | null; // JSON array stored as string
  created_at: string;
  updated_at: string;
}

export type QualityLabel = 'High Quality' | 'Good' | 'Medium' | 'Low Quality' | 'Unscored';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected' | 'archived';

export interface LeadCreateInput {
  business_name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  category?: string | null;
  address?: string | null;
  city?: string | null;
  rating?: number | null;
  review_count?: number | null;
  notes?: string | null;
  tags?: string[];
}

export interface ImportHistory {
  id: number;
  filename: string;
  source: 'csv' | 'json' | 'manual' | 'extension' | 'apify';
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
  failed_rows: number;
  errors: string | null; // JSON
  created_at: string;
}

export interface ValidationResult {
  id: number;
  lead_id: number;
  phone_valid: boolean | null;
  phone_details: string | null;
  email_valid: boolean | null;
  email_details: string | null;
  website_valid: boolean | null;
  website_details: string | null;
  instagram_valid: boolean | null;
  instagram_details: string | null;
  validated_at: string;
}

export interface AIAnalysis {
  id: number;
  lead_id: number;
  tags: string | null; // JSON array
  business_style: string | null;
  audience_type: string | null;
  branding_quality: string | null;
  outreach_potential: string | null;
  summary: string | null;
  raw_response: string | null;
  model_used: string | null;
  analyzed_at: string;
  // Upgraded fields
  priority_score: number | null;
  priority_reasoning: string | null;
  competitor_weaknesses: string | null;
  website_seo_issues: string | null;
  suggested_outreach_hooks: string | null;
  credibility_score: number | null;
  opportunity_score: number | null;
  responsiveness_likelihood: string | null;
  business_maturity: string | null;
  classification: string | null;
}

export interface Setting {
  id: number;
  key: string;
  value: string;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface LeadFilters {
  search?: string;
  category?: string;
  quality_label?: QualityLabel;
  status?: LeadStatus;
  city?: string;
  min_score?: number;
  max_score?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ImportResult {
  imported: number;
  duplicates: number;
  failed: number;
  errors: string[];
  lead_ids: number[];
}

export interface ScoreBreakdown {
  total: number;
  label: QualityLabel;
  factors: ScoreFactor[];
}

export interface ScoreFactor {
  name: string;
  points: number;
  maxPoints: number;
  reason: string;
}

export interface DashboardStats {
  totalLeads: number;
  highQuality: number;
  good: number;
  medium: number;
  lowQuality: number;
  avgScore: number;
  recentImports: number;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  scoreDistribution: { range: string; count: number }[];
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  filters?: LeadFilters;
  columns?: string[];
}
