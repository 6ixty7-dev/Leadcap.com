// ============================================================
// Lead Intelligence OS — Shared TypeScript Types (Frontend)
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
  tags: string | null;
  latitude: number | null;
  longitude: number | null;
  last_verified_at: string | null;
  ranking_reason: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type QualityLabel = 'High Quality' | 'Good' | 'Medium' | 'Low Quality' | 'Unscored';
export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected' | 'archived';

export interface ValidationResult {
  id: number;
  lead_id: number;
  phone_valid: number | null;
  phone_details: string | null;
  email_valid: number | null;
  email_details: string | null;
  website_valid: number | null;
  website_details: string | null;
  instagram_valid: number | null;
  instagram_details: string | null;
  validated_at: string;
}

export interface AIAnalysis {
  id: number;
  lead_id: number;
  tags: string | null;
  business_style: string | null;
  audience_type: string | null;
  branding_quality: string | null;
  outreach_potential: string | null;
  summary: string | null;
  model_used: string | null;
  credibility_score: number | null;
  opportunity_score: number | null;
  responsiveness_likelihood: string | null;
  business_maturity: string | null;
  classification: string | null;
  analyzed_at: string;
}

export interface ScoreFactor {
  name: string;
  points: number;
  maxPoints: number;
  reason: string;
}

export interface ScoreBreakdown {
  total: number;
  label: QualityLabel;
  factors: ScoreFactor[];
}

export interface LeadDetail extends Lead {
  validation: ValidationResult | null;
  ai_analysis: AIAnalysis | null;
  score_breakdown: ScoreBreakdown;
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

export interface ImportResult {
  imported: number;
  duplicates: number;
  failed: number;
  errors: string[];
  lead_ids: number[];
}

export interface ImportHistory {
  id: number;
  filename: string;
  source: string;
  total_rows: number;
  imported_rows: number;
  duplicate_rows: number;
  failed_rows: number;
  errors: string | null;
  created_at: string;
}

export interface DiscoveryJob {
  id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  industry: string;
  city: string;
  filters: string;
  progress: number;
  total_found: number;
  error_message: string | null;
  logs?: string[];
  created_at: string;
  completed_at: string | null;
  leads?: Lead[]; // Optional, populated when fetching details
}

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
