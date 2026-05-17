'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { fetchLeads, deleteLead, updateLeadStatus, fetchCategories, getExportURL, retestLead } from '@/lib/api';
import { Lead, LeadFilters, PaginatedResponse } from '@/types';
import { cn, getQualityColor, getStatusColor, getScoreColor, truncate } from '@/lib/utils';
import {
  Search, Filter, ChevronLeft, ChevronRight,
  Trash2, Eye, Download, RefreshCw,
  Users, Globe, AtSign, Phone, ArrowUpDown,
  Zap, Send, Sparkles, MessageSquare, AlertCircle, MapPin, ShieldCheck, Target
} from 'lucide-react';
import OutreachModal from '@/components/outreach-modal';

const statusOptions = ['new', 'contacted', 'replied', 'interested', 'closed', 'ignored'];

export default function LeadsPage() {
  const [data, setData] = useState<PaginatedResponse<Lead> | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LeadFilters>({ page: 1, limit: 25, sort_by: 'score', sort_order: 'desc' });
  const [searchInput, setSearchInput] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedLeadForOutreach, setSelectedLeadForOutreach] = useState<Lead | null>(null);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLeads(filters);
      setData(res);
    } catch (err) { console.error(err); }
    setLoading(false);
  }, [filters]);

  useEffect(() => { loadLeads(); }, [loadLeads]);

  useEffect(() => {
    fetchCategories().then(res => { if (res.data) setCategories(res.data); }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(f => ({ ...f, search: searchInput, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (col: string) => {
    setFilters(f => ({
      ...f,
      sort_by: col,
      sort_order: f.sort_by === col && f.sort_order === 'desc' ? 'asc' : 'desc',
    }));
  };

  const handleStatusChange = async (id: number, status: string) => {
    await updateLeadStatus(id, status);
    loadLeads();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lead?')) return;
    await deleteLead(id);
    loadLeads();
  };

  const leads = data?.data || [];
  const pagination = data?.pagination || { page: 1, limit: 25, total: 0, totalPages: 0 };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-[1600px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-500" />
            Lead Intelligence Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-1">{pagination.total} high-quality business leads discovered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.open(getExportURL('csv', filters), '_blank')} className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all">
            <Download className="w-3.5 h-3.5" /> Export Intelligence
          </button>
          <button onClick={loadLeads} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Feed
          </button>
        </div>
      </div>

      {/* Advanced Filters Bar */}
      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl flex flex-wrap items-center gap-3 shadow-xl">
        <div className="relative flex-1 min-w-[280px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text" placeholder="Filter by name, industry, city..."
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </div>

        <div className="h-8 w-px bg-zinc-800 mx-1 hidden md:block" />

        <div className="flex items-center gap-2">
          <select
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={filters.quality_label || ''}
            onChange={e => setFilters(f => ({ ...f, quality_label: e.target.value as any || undefined, page: 1 }))}
          >
            <option value="">AI Quality</option>
            <option value="High Quality">High Quality</option>
            <option value="Good">Good</option>
            <option value="Medium">Medium</option>
          </select>

          <select
            className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            value={filters.status || ''}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value as any || undefined, page: 1 }))}
          >
            <option value="">All Status</option>
            {statusOptions.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          [...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-zinc-900/50 border border-zinc-800 rounded-3xl animate-pulse" />
          ))
        ) : leads.length === 0 ? (
          <div className="col-span-full py-32 text-center bg-zinc-950 border border-zinc-800 rounded-3xl">
            <Users className="w-16 h-16 mx-auto mb-4 text-zinc-800" />
            <h3 className="text-xl font-bold text-zinc-400">Zero Leads Matches</h3>
            <p className="text-zinc-600 text-sm mt-2 max-w-xs mx-auto">Try adjusting your filters or start a new discovery job to find fresh business leads.</p>
          </div>
        ) : (
          <AnimatePresence>
            {leads.map((lead, index) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(79,70,229,0.1)]"
              >
                {/* Tier Badge */}
                <div className="absolute top-6 right-6 flex items-center gap-2">
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 shadow-lg",
                    lead.score >= 90 ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-amber-500/10" :
                    lead.score >= 75 ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" :
                    lead.score >= 60 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
                    lead.score >= 45 ? "bg-blue-500/10 border-blue-500/30 text-blue-400" :
                    lead.score >= 30 ? "bg-zinc-700/30 border-zinc-600 text-zinc-400" :
                    "bg-red-500/10 border-red-500/20 text-red-400"
                  )}>
                    <Zap className="w-3 h-3 fill-current" />
                    {lead.quality_label || `Score ${lead.score}`}
                  </div>
                </div>

                {/* Lead Content */}
                <div className="space-y-5">
                  <div>
                    <Link href={`/leads/${lead.id}`} className="inline-block">
                      <h3 className="text-lg font-black text-white hover:text-indigo-400 transition-colors leading-tight">
                        {lead.business_name}
                      </h3>
                    </Link>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800">
                        {lead.category || 'General'}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {lead.city}
                      </span>
                    </div>
                  </div>

                  {/* AI Prediction Labels */}
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
                      <Globe className="w-3 h-3" /> {lead.website ? 'Web Active' : 'No Website'}
                    </span>
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400">
                      <AtSign className="w-3 h-3" /> {lead.instagram ? 'IG Found' : 'No Social'}
                    </span>
                    {lead.last_verified_at && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-bold text-indigo-400">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </span>
                    )}
                  </div>

                  {/* Ranking Reason */}
                  {lead.ranking_reason && (
                    <div className="p-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/50">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-indigo-500" /> Ranking Insight
                      </p>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
                        {lead.ranking_reason}
                      </p>
                    </div>
                  )}

                  {/* CRM Status & Actions */}
                  <div className="pt-5 border-t border-zinc-800/50 flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <select
                        className={cn(
                          'text-[10px] font-black uppercase tracking-widest rounded-xl px-3 py-2 border-0 bg-zinc-900 cursor-pointer focus:ring-0 transition-all',
                          getStatusColor(lead.status)
                        )}
                        value={lead.status}
                        onChange={e => handleStatusChange(lead.id, e.target.value)}
                      >
                        {statusOptions.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {lead.last_verified_at && (
                        <span className="text-[8px] text-zinc-600 font-bold uppercase pl-1">
                          Refreshed: {new Date(lead.last_verified_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={async () => {
                          try {
                            await retestLead(lead.id);
                            loadLeads();
                          } catch (e) {}
                        }}
                        title="Retest Lead"
                        className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-2xl transition-all"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedLeadForOutreach(lead)}
                        className="p-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-2xl text-white transition-all shadow-lg active:scale-95 group/btn"
                      >
                        <Sparkles className="w-4 h-4 group-hover/btn:scale-125 transition-transform" />
                      </button>
                      <button 
                        onClick={() => handleDelete(lead.id)}
                        className="p-2.5 bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-2xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-10">
          <button
            onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
            disabled={pagination.page <= 1}
            className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl disabled:opacity-30 hover:bg-zinc-900 transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-zinc-400" />
          </button>
          <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
            Page <span className="text-white">{pagination.page}</span> of {pagination.totalPages}
          </div>
          <button
            onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
            disabled={pagination.page >= pagination.totalPages}
            className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl disabled:opacity-30 hover:bg-zinc-900 transition-all"
          >
            <ChevronRight className="w-5 h-5 text-zinc-400" />
          </button>
        </div>
      )}

      {/* Outreach Modal */}
      <AnimatePresence>
        {selectedLeadForOutreach && (
          <OutreachModal 
            lead={selectedLeadForOutreach} 
            onClose={() => setSelectedLeadForOutreach(null)} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="currentColor"/>
    </svg>
  );
}
