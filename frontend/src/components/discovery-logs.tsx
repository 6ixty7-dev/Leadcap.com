'use client';

import { motion } from 'framer-motion';
import { Terminal, Activity, CheckCircle2, AlertCircle, Loader2, Database, ShieldCheck, Globe, Search, MapPin } from 'lucide-react';

interface DiscoveryLog {
  timestamp: string;
  level: 'info' | 'success' | 'warning' | 'error' | 'debug';
  message: string;
}

interface DiscoveryLogsProps {
  logs: string[];
  progress: number;
  status: string;
  stats: {
    found: number;
    validated: number;
    filtered: number;
  };
}

export default function DiscoveryLogs({ logs, progress, status, stats }: DiscoveryLogsProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden flex flex-col h-full shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <Activity className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold">Execution Engine</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{status}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Progress</p>
            <p className="text-xs font-mono font-bold text-indigo-400">{progress}%</p>
          </div>
          <div className="w-24 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-3 gap-px bg-zinc-800 border-b border-zinc-800">
        <div className="bg-zinc-950 p-4 flex flex-col items-center justify-center">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Found</span>
          <span className="text-xl font-black text-white">{stats.found}</span>
        </div>
        <div className="bg-zinc-950 p-4 flex flex-col items-center justify-center">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Validated</span>
          <span className="text-xl font-black text-emerald-400">{stats.validated}</span>
        </div>
        <div className="bg-zinc-950 p-4 flex flex-col items-center justify-center">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mb-1">Rejected</span>
          <span className="text-xl font-black text-red-400">{stats.filtered}</span>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="flex-1 overflow-y-auto p-4 bg-black/40 font-mono text-[11px] space-y-2 selection:bg-indigo-500/30">
        <div className="flex items-center gap-2 text-zinc-500 mb-4 pb-2 border-b border-zinc-800/50">
          <Terminal className="w-3.5 h-3.5" />
          <span>REAL-TIME PIPELINE LOGS</span>
        </div>
        
        {logs.map((log, i) => {
          const isSuccess = log.includes('successfully') || log.includes('Active') || log.includes('Found');
          const isWarning = log.includes('Insufficient') || log.includes('Fallback');
          const isError = log.includes('failed') || log.includes('Error');
          const isEngine = log.includes('Initializing') || log.includes('Routing');

          return (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-start gap-3 group"
            >
              <span className={`
                ${isSuccess ? 'text-emerald-400' : 
                  isError ? 'text-red-400' : 
                  isWarning ? 'text-amber-400' : 
                  isEngine ? 'text-indigo-400 font-bold' : 'text-zinc-400'}
              `}>
                <span className="text-zinc-600 mr-2">›</span>
                {log}
              </span>
            </motion.div>
          );
        })}
        {status === 'running' && (
          <div className="flex items-center gap-2 text-indigo-400 mt-2 animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing next node in pipeline...</span>
          </div>
        )}
      </div>

      {/* Pipeline Visualization Footer */}
      <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-around">
        <div className="flex flex-col items-center gap-1 opacity-50 group">
          <MapPin className={`w-4 h-4 ${progress > 5 ? 'text-indigo-400 opacity-100' : ''}`} />
          <div className={`w-8 h-1 rounded-full ${progress > 5 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50 group">
          <Search className={`w-4 h-4 ${progress > 20 ? 'text-indigo-400 opacity-100' : ''}`} />
          <div className={`w-8 h-1 rounded-full ${progress > 20 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50">
          <Database className={`w-4 h-4 ${progress > 45 ? 'text-indigo-400 opacity-100' : ''}`} />
          <div className={`w-8 h-1 rounded-full ${progress > 45 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50">
          <Globe className={`w-4 h-4 ${progress > 70 ? 'text-indigo-400 opacity-100' : ''}`} />
          <div className={`w-8 h-1 rounded-full ${progress > 70 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50">
          <ShieldCheck className={`w-4 h-4 ${progress > 90 ? 'text-indigo-400 opacity-100' : ''}`} />
          <div className={`w-8 h-1 rounded-full ${progress > 90 ? 'bg-indigo-500' : 'bg-zinc-800'}`} />
        </div>
        <div className="flex flex-col items-center gap-1 opacity-50">
          <CheckCircle2 className={`w-4 h-4 ${progress === 100 ? 'text-emerald-400 opacity-100' : ''}`} />
          <div className={`w-8 h-1 rounded-full ${progress === 100 ? 'bg-emerald-500' : 'bg-zinc-800'}`} />
        </div>
      </div>
    </div>
  );
}
