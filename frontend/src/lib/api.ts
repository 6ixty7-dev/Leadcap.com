// ============================================================
// Lead Intelligence OS — API Client
// ============================================================

import { ApiResponse, PaginatedResponse, Lead, LeadDetail, DashboardStats, ImportResult, ImportHistory, LeadFilters, AIAnalysis, DiscoveryJob } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function request<T>(endpoint: string, options?: RequestInit, retries = 2): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json', ...options?.headers },
      ...options,
    });

    if (!res.ok) {
      let errorData;
      try {
        errorData = await res.json();
      } catch (e) {
        errorData = { error: `Server returned ${res.status}` };
      }
      throw new Error(errorData.error || `API Error: ${res.status}`);
    }

    return await res.json();
  } catch (error: any) {
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 1500)); // Wait before retry
        return request(endpoint, options, retries - 1);
      }
      throw new Error('Could not connect to the backend server. The Lead Intelligence OS server might be restarting or offline.');
    }
    throw error;
  }
}

// ---- Health & Diagnostics ----

export async function checkBackendHealth(): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/health');
}

export async function fetchStartupDebug(): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/debug/startup');
}

export async function fetchDiagnostics(): Promise<any> {
  return request<any>('/diagnostics');
}

// ---- Leads ----

export async function fetchLeads(filters: LeadFilters = {}): Promise<PaginatedResponse<Lead>> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  });
  return request<PaginatedResponse<Lead>>(`/leads?${params.toString()}`);
}

export async function fetchLead(id: number): Promise<ApiResponse<LeadDetail>> {
  return request<ApiResponse<LeadDetail>>(`/leads/${id}`);
}

export async function createLead(data: Partial<Lead>): Promise<ApiResponse<Lead>> {
  return request<ApiResponse<Lead>>('/leads', { method: 'POST', body: JSON.stringify(data) });
}

export async function updateLead(id: number, data: Partial<Lead>): Promise<ApiResponse<Lead>> {
  return request<ApiResponse<Lead>>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

export async function updateLeadStatus(id: number, status: string): Promise<ApiResponse<Lead>> {
  return request<ApiResponse<Lead>>(`/leads/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function deleteLead(id: number): Promise<ApiResponse> {
  return request<ApiResponse>(`/leads/${id}`, { method: 'DELETE' });
}

export async function bulkDeleteLeads(ids: number[]): Promise<ApiResponse> {
  return request<ApiResponse>('/leads/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) });
}

export async function rescoreLeads(): Promise<ApiResponse> {
  return request<ApiResponse>('/leads/rescore', { method: 'POST' });
}

export async function retestLead(id: number): Promise<ApiResponse<Lead>> {
  return request<ApiResponse<Lead>>(`/leads/${id}/retest`, { method: 'POST' });
}

// ---- Dashboard ----

export async function fetchStats(): Promise<ApiResponse<DashboardStats>> {
  return request<ApiResponse<DashboardStats>>('/leads/stats');
}

export async function fetchCategories(): Promise<ApiResponse<string[]>> {
  return request<ApiResponse<string[]>>('/leads/categories');
}

export async function fetchCities(): Promise<ApiResponse<string[]>> {
  return request<ApiResponse<string[]>>('/leads/cities');
}

// ---- Import ----

export async function importCSV(data: Record<string, string>[], filename: string): Promise<ApiResponse<ImportResult>> {
  return request<ApiResponse<ImportResult>>('/import/csv', {
    method: 'POST',
    body: JSON.stringify({ data, filename }),
  });
}

export async function importJSON(data: Record<string, string>[], filename: string): Promise<ApiResponse<ImportResult>> {
  return request<ApiResponse<ImportResult>>('/import/json', {
    method: 'POST',
    body: JSON.stringify({ data, filename }),
  });
}

export async function previewImport(data: Record<string, string>[]): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/import/preview', {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export async function fetchImportHistory(): Promise<ApiResponse<ImportHistory[]>> {
  return request<ApiResponse<ImportHistory[]>>('/import/history');
}

// ---- AI ----

export async function analyzeLead(id: number): Promise<ApiResponse<AIAnalysis>> {
  return request<ApiResponse<AIAnalysis>>(`/ai/analyze/${id}`, { method: 'POST' });
}

export async function batchAnalyze(ids: number[]): Promise<ApiResponse<{ analyzed: number; errors: string[] }>> {
  return request<ApiResponse<{ analyzed: number; errors: string[] }>>('/ai/batch-analyze', {
    method: 'POST',
    body: JSON.stringify({ ids }),
  });
}

// ---- Outreach ----

export async function generateOutreach(leadId: number, context: string, intent: string, tone: string, campaignId?: number): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/outreach/generate', {
    method: 'POST',
    body: JSON.stringify({ leadId, context, intent, tone, campaignId }),
  });
}

export async function sendEmailOutreach(leadId: number, subject: string, body: string, campaignId?: number): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/outreach/send-email', {
    method: 'POST',
    body: JSON.stringify({ leadId, subject, body, campaignId }),
  });
}

export async function logWhatsAppOutreach(leadId: number, message: string, campaignId?: number): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/outreach/log-whatsapp', {
    method: 'POST',
    body: JSON.stringify({ leadId, message, campaignId }),
  });
}

export async function logCall(leadId: number, notes: string, outcome: string, duration: number): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/outreach/log-call', {
    method: 'POST',
    body: JSON.stringify({ leadId, notes, outcome, duration }),
  });
}

export async function fetchOutreachLogs(leadId: number): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>(`/outreach/logs/${leadId}`);
}

export async function fetchCampaigns(): Promise<ApiResponse<any[]>> {
  return request<ApiResponse<any[]>>('/outreach/campaigns');
}

export async function fetchCampaign(id: number): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>(`/outreach/campaigns/${id}`);
}

export async function createCampaign(data: { name: string, objective?: string, offer?: string, cta?: string }): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/outreach/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchCampaignLeads(id: number): Promise<ApiResponse<any[]>> {
  return request<ApiResponse<any[]>>(`/outreach/campaigns/${id}/leads`);
}

export async function addLeadsToCampaign(id: number, leadIds: number[]): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>(`/outreach/campaigns/${id}/leads`, {
    method: 'POST',
    body: JSON.stringify({ leadIds }),
  });
}

export async function updateCampaignLead(campaignId: number, leadId: number, data: any): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>(`/outreach/campaigns/${campaignId}/leads/${leadId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ---- Discovery ----

export async function startDiscoveryJob(industry: string, city: string, filters: any): Promise<ApiResponse<{ jobId: number }>> {
  return request<ApiResponse<{ jobId: number }>>('/discovery/start', {
    method: 'POST',
    body: JSON.stringify({ industry, city, filters }),
  });
}

export async function fetchDiscoveryJobs(): Promise<ApiResponse<DiscoveryJob[]>> {
  return request<ApiResponse<DiscoveryJob[]>>('/discovery/jobs');
}

export async function fetchDiscoveryJobDetails(id: number): Promise<ApiResponse<DiscoveryJob>> {
  return request<ApiResponse<DiscoveryJob>>(`/discovery/jobs/${id}`);
}

// ---- Providers ----

export async function fetchProviderStatus(): Promise<ApiResponse<any[]>> {
  return request<ApiResponse<any[]>>('/providers/status');
}

export async function testProvider(providerId: string, payload?: any): Promise<ApiResponse<any>> {
  return request<ApiResponse<any>>('/providers/test', {
    method: 'POST',
    body: JSON.stringify({ providerId, ...payload })
  });
}

// ---- Export ----

export function getExportURL(format: 'csv' | 'json', filters: LeadFilters = {}): string {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  });
  return `${API_BASE}/export/${format}?${params.toString()}`;
}
