'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { rescoreLeads } from '@/lib/api';
import { Settings, Zap, Database, Brain, RefreshCw, Loader2, CheckCircle, Server } from 'lucide-react';

export default function SettingsPage() {
  const [rescoring, setRescoring] = useState(false);
  const [rescoreResult, setRescoreResult] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');

  const handleRescore = async () => {
    setRescoring(true);
    setRescoreResult(null);
    try {
      const res = await rescoreLeads();
      setRescoreResult(res.message || 'All leads re-scored');
    } catch (err: any) {
      setRescoreResult(`Error: ${err.message}`);
    }
    setRescoring(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-yellow-400" />
          Settings
        </h1>
        <p className="text-zinc-500 text-sm mt-0.5">Configure your Lead Intelligence OS</p>
      </div>

      {/* Backend Connection */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Server className="w-4 h-4 text-emerald-400" /> Backend Connection
        </h3>
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-zinc-300">Connected to local backend</span>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/30">
          <p className="text-xs text-zinc-500 mb-1">API URL</p>
          <code className="text-xs text-yellow-400 font-mono">
            {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}
          </code>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-400" /> AI Configuration
        </h3>
        <p className="text-xs text-zinc-500">
          AI is configured via the backend .env file. Set your GEMINI_API_KEY there.
        </p>
        <div className="p-3 rounded-xl bg-zinc-800/30">
          <p className="text-xs text-zinc-500 mb-1">Current Provider</p>
          <p className="text-sm text-zinc-300">Google Gemini (gemini-2.0-flash)</p>
        </div>
        <div className="p-3 rounded-xl bg-yellow-400/5 border border-yellow-400/10">
          <p className="text-xs text-yellow-400/80">
            💡 Architecture supports future Claude & OpenAI switching. Provider can be changed in backend settings.
          </p>
        </div>
      </div>

      {/* Scoring */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" /> Scoring Engine
        </h3>
        <p className="text-xs text-zinc-500">
          Re-calculate scores for all existing leads using the current scoring algorithm.
        </p>
        <button onClick={handleRescore} disabled={rescoring} className="btn-secondary text-sm flex items-center gap-2">
          {rescoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {rescoring ? 'Re-scoring...' : 'Re-score All Leads'}
        </button>
        {rescoreResult && (
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400">{rescoreResult}</span>
          </div>
        )}
      </div>

      {/* Database */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Database className="w-4 h-4 text-blue-400" /> Database
        </h3>
        <div className="p-3 rounded-xl bg-zinc-800/30">
          <p className="text-xs text-zinc-500 mb-1">Engine</p>
          <p className="text-sm text-zinc-300">SQLite (Local)</p>
        </div>
        <div className="p-3 rounded-xl bg-zinc-800/30">
          <p className="text-xs text-zinc-500 mb-1">Location</p>
          <code className="text-xs text-zinc-400 font-mono">./data/leads.db</code>
        </div>
      </div>

      {/* Chrome Extension */}
      <div className="glass-card p-6 space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          🧩 Chrome Extension
        </h3>
        <p className="text-xs text-zinc-500">
          Chrome Extension architecture is prepared. The extension will capture leads while browsing and send them to the backend API.
        </p>
        <div className="p-3 rounded-xl bg-zinc-800/30">
          <p className="text-xs text-zinc-500 mb-1">Extension API Endpoint</p>
          <code className="text-xs text-zinc-400 font-mono">POST /api/import/extension</code>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-zinc-800 text-zinc-500 border border-zinc-700">
          Coming Soon
        </span>
      </div>
    </motion.div>
  );
}
