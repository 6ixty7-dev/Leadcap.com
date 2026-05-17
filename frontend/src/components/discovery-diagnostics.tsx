'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, AlertCircle, CheckCircle2, Zap, Globe, Cpu, Smartphone, Search, Database } from 'lucide-react';

interface ProviderStatus {
  name: string;
  status: 'active' | 'disabled' | 'error';
  quota: string;
  latency?: string;
  icon: any;
}

interface DiscoveryDiagnosticsProps {
  providers: ProviderStatus[];
  isPlaywrightRunning: boolean;
}

export default function DiscoveryDiagnostics({ providers, isPlaywrightRunning }: DiscoveryDiagnosticsProps) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5" /> Engine Diagnostics
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-bold text-emerald-500 uppercase">Core Online</span>
        </div>
      </div>

      {/* Provider Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {providers.map((p) => (
          <div key={p.name} className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-zinc-800 ${p.status === 'active' ? 'text-indigo-400' : 'text-zinc-600'}`}>
                <p.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white capitalize">{p.name}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">{p.quota}</p>
              </div>
            </div>
            {p.status === 'active' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-zinc-600" />
            )}
          </div>
        ))}
      </div>

      {/* Real-time Browser Status */}
      <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-white">Browser Instance</span>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${isPlaywrightRunning ? 'bg-indigo-500 text-white' : 'bg-zinc-800 text-zinc-500'}`}>
            {isPlaywrightRunning ? 'EXECUTING' : 'IDLE'}
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase">
            <span>Chromium Cluster</span>
            <span className="text-zinc-400">ready</span>
          </div>
          <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-500"
              initial={{ width: '0%' }}
              animate={{ width: isPlaywrightRunning ? '100%' : '10%' }}
              transition={{ duration: 2, repeat: isPlaywrightRunning ? Infinity : 0 }}
            />
          </div>
        </div>
      </div>

      {/* Database & Queue Status */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Persistence</span>
          </div>
          <p className="text-xs font-bold text-emerald-500">Connected</p>
        </div>
        <div className="p-3 rounded-2xl border border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-3 h-3 text-zinc-500" />
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AI Agent</span>
          </div>
          <p className="text-xs font-bold text-white">Active</p>
        </div>
      </div>
    </div>
  );
}
