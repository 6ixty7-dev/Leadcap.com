'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, CheckCircle2, XCircle, Activity, Server, Database, Globe, Zap, AlertTriangle, RefreshCcw } from 'lucide-react';
import { checkBackendHealth, fetchStartupDebug, fetchDiagnostics } from '@/lib/api';

/**
 * Lead Intelligence OS — Backend Diagnostic Panel (v4.1)
 * Shows real-time status of backend modules and startup errors.
 */
export function BackendDiagnostic() {
  const [status, setStatus] = useState<any>(null);
  const [debug, setDebug] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [healthRes, debugRes, diagRes] = await Promise.all([
        checkBackendHealth(),
        fetchStartupDebug(),
        fetchDiagnostics().catch(() => null)
      ]);
      setStatus(healthRes);
      setDebug(debugRes);
      setDiagnostics(diagRes);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  if (error && !status) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-red-500/10 backdrop-blur-md border border-red-500/50 p-4 rounded-xl shadow-2xl flex items-center gap-3">
          <XCircle className="text-red-500 w-6 h-6 animate-pulse" />
          <div>
            <div className="text-red-400 font-bold text-sm">BACKEND OFFLINE</div>
            <div className="text-zinc-400 text-xs">{error}</div>
          </div>
          <button 
            onClick={fetchData}
            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
          >
            <RefreshCcw className="w-4 h-4 text-red-400" />
          </button>
        </div>
      </div>
    );
  }

  if (!status) return null;

  const modules = status.modules || {};
  const startupErrors = status.errors || [];
  const hasErrors = startupErrors.length > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {!isMinimized && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-zinc-950/90 backdrop-blur-xl border border-zinc-800 p-4 rounded-2xl shadow-2xl w-80 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold tracking-widest text-zinc-400 uppercase">System Diagnostics</span>
              </div>
              <button 
                onClick={() => setIsMinimized(true)}
                className="text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>

            {/* Module Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <ModuleTag name="Database" status={modules.DATABASE} icon={<Database className="w-3 h-3" />} />
              <ModuleTag name="Express" status={modules.EXPRESS} icon={<Server className="w-3 h-3" />} />
              <ModuleTag name="Geo Engine" status={modules.GEO_ENGINE} icon={<Globe className="w-3 h-3" />} />
              <ModuleTag name="AI Engine" status={modules.AI_ENGINE} icon={<Zap className="w-3 h-3" />} />
              <ModuleTag name="Discovery" status={modules.DISCOVERY_ENGINE} icon={<Activity className="w-3 h-3" />} />
              <ModuleTag name="Ranking" status={modules.RANKING_ENGINE} icon={<Zap className="w-3 h-3" />} />
            </div>

            {/* Live Diagnostics */}
            {diagnostics && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-3 mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><Server className="w-3 h-3" /> Mem RSS</span>
                  <span className="font-mono text-white">{diagnostics.memory?.rss || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> Browsers</span>
                  <span className="font-mono text-emerald-400">{diagnostics.browser?.activePages || 0} active</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Jobs</span>
                  <span className="font-mono text-indigo-400">{diagnostics.jobs?.active || 0} run / {diagnostics.jobs?.queued || 0} q</span>
                </div>
              </div>
            )}

            {/* Error Panel */}
            {hasErrors && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-2">
                <div className="flex items-center gap-2 text-red-400 text-xs font-bold mb-2">
                  <ShieldAlert className="w-3 h-3" />
                  STARTUP EXCEPTIONS
                </div>
                <div className="space-y-1">
                  {startupErrors.map((err: string, i: number) => (
                    <div key={i} className="text-[10px] text-zinc-400 font-mono break-words bg-black/30 p-1 rounded">
                      {err}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-[10px] text-zinc-600 flex items-center justify-between mt-2">
              <span>Uptime: Active</span>
              <span className="font-mono">v4.1.0-stable</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Toggle */}
      <motion.button
        layout
        onClick={() => setIsMinimized(!isMinimized)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
          hasErrors 
            ? 'bg-red-500/10 border-red-500/30 text-red-400' 
            : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
        } backdrop-blur-md shadow-lg`}
      >
        <Zap className={`w-4 h-4 ${hasErrors ? 'animate-bounce' : ''}`} />
        <span className="text-xs font-bold uppercase tracking-wider">
          {isMinimized ? (hasErrors ? 'System Alert' : 'Diagnostics') : 'Collapse'}
        </span>
      </motion.button>
    </div>
  );
}

function ModuleTag({ name, status, icon }: { name: string; status: string; icon: React.ReactNode }) {
  const getStatusColor = () => {
    switch (status) {
      case 'active': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'failed': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'disabled': return 'text-zinc-500 bg-zinc-800/50 border-zinc-800';
      default: return 'text-zinc-600 bg-zinc-900/50 border-zinc-900';
    }
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border ${getStatusColor()} text-[10px] font-medium`}>
      {icon}
      <span className="truncate">{name}</span>
      <div className={`w-1 h-1 rounded-full ml-auto ${
        status === 'active' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 
        status === 'failed' ? 'bg-red-400' : 'bg-zinc-700'
      }`} />
    </div>
  );
}
