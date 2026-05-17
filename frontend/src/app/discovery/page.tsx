'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { startDiscoveryJob, fetchDiscoveryJobs, fetchDiscoveryJobDetails, fetchProviderStatus } from '@/lib/api';
import { DiscoveryJob, Lead } from '@/types';
import { formatDateTime } from '@/lib/utils';
import {
  Compass, Clock, CheckCircle, XCircle, Loader2, Users, 
  Terminal, Search, ChevronRight, Zap, Target, Globe, Smartphone, AtSign
} from 'lucide-react';
import Link from 'next/link';
import DiscoveryForm from '@/components/discovery-form';
import DiscoveryLogs from '@/components/discovery-logs';
import DiscoveryDiagnostics from '@/components/discovery-diagnostics';

export default function DiscoveryPage() {
  const [jobs, setJobs] = useState<DiscoveryJob[]>([]);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [activeJobDetails, setActiveJobDetails] = useState<any>(null);
  const [providerStats, setProviderStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadJobs = async () => {
    try {
      const res = await fetchDiscoveryJobs();
      if (res.data) setJobs(res.data);
    } catch (err) {}
  };

  const loadActiveDetails = async () => {
    if (!activeJobId) return;
    try {
      const res = await fetchDiscoveryJobDetails(activeJobId);
      if (res.data) {
        setActiveJobDetails(res.data);
        // If it was running but now finished, refresh global list
        if (res.data.status !== 'running' && res.data.status !== 'pending') {
          loadJobs();
        }
      }
    } catch (err) {}
  };

  const loadProviderStatus = async () => {
    try {
      const res = await fetchProviderStatus();
      if (res.data) setProviderStats(res.data);
    } catch (err) {}
  };

  useEffect(() => {
    loadJobs();
    loadProviderStatus();
    const interval = setInterval(() => {
      loadJobs();
      loadProviderStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeJobId) return;
    loadActiveDetails();
    const interval = setInterval(loadActiveDetails, 5000);
    return () => clearInterval(interval);
  }, [activeJobId]);

  const handleStartDiscovery = async (industry: string, city: string, radius: number, filters: any) => {
    setLoading(true);
    setError(null);
    try {
      const res = await startDiscoveryJob(industry, city, { ...filters, radiusKm: radius });
      if (res.data) {
        setActiveJobId(res.data.jobId);
        // Reset active details to show transition
        setActiveJobDetails({ status: 'pending', progress: 0, total_found: 0, logs: ['Initiating request...'] });
        loadJobs();
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-zinc-500" />;
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Compass className="w-8 h-8 text-indigo-500" />
            Lead Discovery Engine
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Multi-provider acquisition, AI scoring, and automated validation pipeline.</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800">
          <div className="px-4 py-1 border-r border-zinc-800">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total Found</p>
            <p className="text-sm font-bold text-white">{jobs.reduce((acc, j) => acc + (j.total_found || 0), 0)}</p>
          </div>
          <div className="px-4 py-1">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Active Jobs</p>
            <p className="text-sm font-bold text-indigo-400">{jobs.filter(j => j.status === 'running').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Control Panel */}
        <div className="lg:col-span-4 space-y-8">
          <DiscoveryForm onStart={handleStartDiscovery} isLoading={loading} />
          
          <DiscoveryDiagnostics 
            isPlaywrightRunning={activeJobDetails?.status === 'running'} 
            providers={[
              { name: 'Playwright Maps', status: 'active', quota: '98/100 remaining', icon: Globe },
              { name: 'Apify Cloud', status: 'active', quota: '450/500 units', icon: Target },
              { name: 'Firecrawl API', status: 'active', quota: 'Unlimited (Pro)', icon: Zap },
              { name: 'Gemini AI', status: 'active', quota: 'Rate-limited', icon: AtSign },
            ]}
          />

          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Recent Activity
            </h3>
            <div className="space-y-4">
              {jobs.slice(0, 5).map(job => (
                <div 
                  key={job.id} 
                  onClick={() => setActiveJobId(job.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${activeJobId === job.id ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-zinc-900/30 border-zinc-800/50 hover:bg-zinc-800/30'}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-xl ${job.status === 'running' ? 'bg-indigo-500/10 shadow-[0_0_10px_rgba(99,102,241,0.3)]' : 'bg-zinc-800'}`}>
                        {getStatusIcon(job.status)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{job.industry}</h4>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{job.city} • {formatDateTime(job.created_at)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-white">{job.total_found}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">Leads</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live Execution Monitoring & Results */}
        <div className="lg:col-span-8 space-y-8 flex flex-col h-full">
          {activeJobId ? (
            <>
              <div className="flex-1">
                <DiscoveryLogs 
                  logs={activeJobDetails?.logs || ['Awaiting initialization...']} 
                  progress={activeJobDetails?.progress || 0} 
                  status={activeJobDetails?.status || 'pending'}
                  stats={{
                    found: activeJobDetails?.total_found || 0,
                    validated: activeJobDetails?.validated_count || 0,
                    filtered: activeJobDetails?.rejected_count || 0
                  }}
                />
              </div>

              <AnimatePresence>
                {activeJobDetails?.leads && activeJobDetails.leads.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl"
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <h3 className="text-sm font-bold text-white">Streaming Qualified Leads</h3>
                      </div>
                      <Link href={`/leads?source_id=${activeJobId}`} className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-widest flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-xl border border-indigo-500/20 transition-all">
                        Full CRM Feed <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeJobDetails.leads.map((lead: Lead) => (
                        <motion.div 
                          layout
                          key={lead.id} 
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between hover:border-zinc-700 transition-all"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{lead.business_name}</p>
                            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{lead.city}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <div className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black text-indigo-400">
                              {lead.score}
                            </div>
                            <span className="text-[9px] text-zinc-600 font-bold uppercase">{lead.status}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-[2.5rem] flex flex-col items-center justify-center text-center p-20 space-y-6">
              <div className="w-24 h-24 rounded-[2rem] bg-zinc-900 flex items-center justify-center border border-zinc-800 shadow-2xl relative">
                <Terminal className="w-10 h-10 text-zinc-700" />
                <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white tracking-tighter">Engine Standby</h3>
                <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">The multi-provider discovery engine is idle. Launch a discovery job to start real-time intelligence gathering.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
