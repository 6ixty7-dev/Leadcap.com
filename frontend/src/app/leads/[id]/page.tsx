'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { fetchLead, updateLeadStatus, analyzeLead as analyzeLeadAPI, deleteLead } from '@/lib/api';
import { LeadDetail } from '@/types';
import { cn, getQualityColor, getScoreColor, getStatusColor, formatDateTime } from '@/lib/utils';
import {
  ArrowLeft, Globe, AtSign, Phone, Mail, MapPin, Star, MessageSquare,
  Shield, Brain, Trash2, ExternalLink, CheckCircle, XCircle, AlertCircle, Loader2,
  RefreshCw, Sparkles
} from 'lucide-react';

const statusOptions = ['new', 'contacted', 'qualified', 'converted', 'rejected', 'archived'];

function ValidationBadge({ valid, label, details }: { valid: number | null; label: string; details: string | null }) {
  if (valid === null) return null;
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl border',
      valid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
    )}>
      {valid ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
      <div>
        <p className={cn('text-sm font-medium', valid ? 'text-emerald-400' : 'text-red-400')}>{label}</p>
        {details && <p className="text-xs text-zinc-500 mt-0.5">{details}</p>}
      </div>
    </div>
  );
}

function ScoreFactorRow({ factor }: { factor: { name: string; points: number; maxPoints: number; reason: string } }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className={cn(
        'text-sm font-mono font-bold w-10 text-right',
        factor.points > 0 ? 'text-emerald-400' : factor.points < 0 ? 'text-red-400' : 'text-zinc-500'
      )}>
        {factor.points > 0 ? '+' : ''}{factor.points}
      </span>
      <div className="flex-1">
        <p className="text-sm text-zinc-300">{factor.name}</p>
        <p className="text-xs text-zinc-500">{factor.reason}</p>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const id = Number(params.id);

  useEffect(() => {
    if (isNaN(id)) return;
    fetchLead(id)
      .then(res => { if (res.data) setLead(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: string) => {
    await updateLeadStatus(id, status);
    const res = await fetchLead(id);
    if (res.data) setLead(res.data);
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await analyzeLeadAPI(id);
      const res = await fetchLead(id);
      if (res.data) setLead(res.data);
    } catch (err) { console.error(err); }
    setAnalyzing(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lead permanently?')) return;
    await deleteLead(id);
    router.push('/leads');
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-2xl" />
          <div className="skeleton h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-zinc-600" />
        <p className="text-zinc-400">Lead not found</p>
        <button onClick={() => router.push('/leads')} className="btn-secondary mt-4 text-sm">Back to Leads</button>
      </div>
    );
  }

  const aiTags = lead.ai_analysis?.tags ? JSON.parse(lead.ai_analysis.tags) : [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/leads')} className="btn-ghost p-2">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{lead.business_name}</h1>
            <div className="flex items-center gap-3 mt-1">
              {lead.category && <span className="text-xs text-zinc-500 bg-zinc-800/50 px-2 py-0.5 rounded-md">{lead.category}</span>}
              {lead.city && (
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />{lead.city}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={async () => {
              setAnalyzing(true);
              try {
                await (await import('@/lib/api')).retestLead(id);
                const res = await (await import('@/lib/api')).fetchLead(id);
                if (res.data) setLead(res.data);
              } catch (e) {}
              setAnalyzing(false);
            }} 
            disabled={analyzing} 
            className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold"
          >
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {analyzing ? 'Retesting...' : 'Retest Lead'}
          </button>
          <button onClick={handleAnalyze} disabled={analyzing} className="p-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold">
            {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
            {analyzing ? 'Analyzing...' : 'AI Analyze'}
          </button>
          <button onClick={handleDelete} className="p-2.5 bg-zinc-900 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 border border-zinc-800 rounded-2xl transition-all flex items-center gap-2 text-xs font-bold">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Score & Ranking Reason */}
          <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-[2rem]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Score Circle */}
                <div className="relative w-20 h-20">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className="text-zinc-800" strokeWidth="4" />
                    <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" className={getScoreColor(lead.score)}
                      strokeWidth="4" strokeDasharray={`${(lead.score / 100) * 220} 220`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn('text-xl font-bold font-mono', getScoreColor(lead.score))}>{lead.score}</span>
                  </div>
                </div>
                <div>
                  <span className={cn('px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border', getQualityColor(lead.quality_label))}>
                    {lead.quality_label}
                  </span>
                  <p className="text-xs text-zinc-500 mt-2 font-bold uppercase tracking-widest">Outreach Potential</p>
                </div>
              </div>
              
              <div className="flex-1 max-w-md">
                {lead.ranking_reason && (
                  <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Ranking Insight
                    </p>
                    <p className="text-sm text-zinc-400 italic font-medium leading-relaxed">"{lead.ranking_reason}"</p>
                  </div>
                )}
              </div>

              <select
                className={cn('text-sm font-bold uppercase tracking-widest rounded-xl px-4 py-2.5 border bg-zinc-900 cursor-pointer focus:ring-0', getStatusColor(lead.status))}
                value={lead.status}
                onChange={e => handleStatusChange(e.target.value)}
              >
                {statusOptions.map(s => (
                  <option key={s} value={s} className="bg-zinc-900 text-white">
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Info */}
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem]">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-yellow-500" /> Contact Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.phone && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Phone</p>
                    <p className="text-sm font-bold text-white">{lead.phone}</p>
                  </div>
                </div>
              )}
              {lead.email && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <Mail className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Email</p>
                    <a href={`mailto:${lead.email}`} className="text-sm font-bold text-white hover:text-indigo-400 transition-colors">{lead.email}</a>
                  </div>
                </div>
              )}
              {lead.website && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Website</p>
                    <a href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-1 truncate">
                      {lead.website} <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  </div>
                </div>
              )}
              {lead.instagram && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <AtSign className="w-4 h-4 text-pink-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Instagram</p>
                    <a href={lead.instagram.includes('instagram.com') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-white hover:text-indigo-400 transition-colors flex items-center gap-1">
                      {lead.instagram} <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              )}
              {lead.address && (
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900 border border-zinc-800 md:col-span-2">
                  <MapPin className="w-4 h-4 text-orange-400" />
                  <div>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">Address</p>
                    <p className="text-sm font-bold text-white">{lead.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI Intelligence Dashboard */}
          {lead.ai_analysis && (
            <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem]">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-8 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" /> Deep AI Analysis
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 rounded-[2rem] bg-zinc-900 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Credibility</p>
                      <p className="text-2xl font-black text-white">{lead.ai_analysis.credibility_score || 0}%</p>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: `${lead.ai_analysis.credibility_score || 0}%` }} />
                      </div>
                    </div>
                    <div className="p-5 rounded-[2rem] bg-zinc-900 border border-zinc-800">
                      <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest mb-1">Opportunity</p>
                      <p className="text-2xl font-black text-white">{lead.ai_analysis.opportunity_score || 0}%</p>
                      <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-3 overflow-hidden">
                        <div className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" style={{ width: `${lead.ai_analysis.opportunity_score || 0}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Business Maturity</span>
                      <span className={cn(
                        "text-xs font-black px-3 py-1 rounded-xl",
                        lead.ai_analysis.business_maturity === 'Scaling' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        lead.ai_analysis.business_maturity === 'Growing' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        lead.ai_analysis.business_maturity === 'Established' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        lead.ai_analysis.business_maturity === 'Startup' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        lead.ai_analysis.business_maturity === 'Declining' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-zinc-800 text-zinc-300'
                      )}>{lead.ai_analysis.business_maturity || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Classification</span>
                      <span className={cn(
                        "text-xs font-black px-3 py-1 rounded-xl uppercase border",
                        lead.ai_analysis.classification === 'premium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        lead.ai_analysis.classification === 'mid-tier' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                        lead.ai_analysis.classification === 'franchise' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                        lead.ai_analysis.classification === 'micro-business' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' :
                        'bg-zinc-800/50 text-zinc-400 border-zinc-700'
                      )}>{lead.ai_analysis.classification || 'Standard'}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-zinc-900/50 rounded-2xl border border-zinc-800/50">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Responsiveness</span>
                      <span className={cn(
                        "text-xs font-black px-3 py-1 rounded-xl border",
                        lead.ai_analysis.responsiveness_likelihood === 'High' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                        lead.ai_analysis.responsiveness_likelihood === 'Low' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      )}>{lead.ai_analysis.responsiveness_likelihood || 'Medium'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {lead.ai_analysis.summary && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">AI Executive Summary</p>
                      <p className="text-sm text-zinc-300 leading-relaxed font-medium italic p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800">"{lead.ai_analysis.summary}"</p>
                    </div>
                  )}
                  {aiTags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Priority Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {aiTags.map((tag: string, i: number) => (
                          <span key={i} className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Outreach Hooks */}
              {lead.ai_analysis.suggested_outreach_hooks && (
                <div className="mt-10 pt-8 border-t border-zinc-800">
                   <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" /> Recommended Outreach Hooks
                  </p>
                  <div className="p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Sparkles className="w-12 h-12 text-indigo-500" />
                    </div>
                    <p className="text-sm text-indigo-200/90 leading-relaxed whitespace-pre-wrap font-medium">{lead.ai_analysis.suggested_outreach_hooks}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Validation */}
          {lead.validation && (
            <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem]">
              <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" /> Live Validation
              </h3>
              <div className="space-y-3">
                <ValidationBadge valid={lead.validation.phone_valid} label="Phone Line" details={lead.validation.phone_details} />
                <ValidationBadge valid={lead.validation.email_valid} label="Email Server" details={lead.validation.email_details} />
                <ValidationBadge valid={lead.validation.website_valid} label="Domain Reachability" details={lead.validation.website_details} />
                <ValidationBadge valid={lead.validation.instagram_valid} label="Social Presence" details={lead.validation.instagram_details} />
              </div>
            </div>
          )}

          {/* Meta Information */}
          <div className="bg-zinc-950 border border-zinc-800 p-8 rounded-[2rem]">
            <h4 className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em] mb-6">Pipeline Metadata</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-zinc-600 uppercase tracking-wider">Discovered</span>
                <span className="text-zinc-300">{formatDateTime(lead.created_at)}</span>
              </div>
              <div className="flex justify-between items-center text-[11px] font-bold">
                <span className="text-zinc-600 uppercase tracking-wider">Last Activity</span>
                <span className="text-zinc-300">{formatDateTime(lead.updated_at)}</span>
              </div>
              {lead.last_verified_at && (
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-indigo-500 uppercase tracking-wider">Verified At</span>
                  <span className="text-indigo-300">{formatDateTime(lead.last_verified_at)}</span>
                </div>
              )}
              <div className="pt-4 border-t border-zinc-800/50 flex justify-between items-center text-[11px] font-bold">
                <span className="text-zinc-600 uppercase tracking-wider">Intelligence ID</span>
                <span className="text-zinc-400 font-mono">#{lead.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
    </motion.div>
  );
}
