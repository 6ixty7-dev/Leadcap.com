'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchProviderStatus, testProvider } from '@/lib/api';
import { Plug, ShieldCheck, ShieldAlert, Key, Zap, CheckCircle2, XCircle, AlertTriangle, RefreshCw, Play } from 'lucide-react';

export default function ProvidersPage() {
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const res = await fetchProviderStatus();
      if (res.data) setProviders(res.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleTest = async (providerId: string) => {
    const p = providers.find(x => x.id === providerId);
    if (!p) return;
    
    setProviders(prev => prev.map(x => x.id === providerId ? { ...x, testing: true, testResult: null } : x));
    
    try {
      const payload = p.type === 'enrichment' ? { url: 'https://apple.com' } : { industry: 'Salons', city: 'London' };
      const res = await testProvider(providerId, payload);
      setProviders(prev => prev.map(x => x.id === providerId ? { ...x, testing: false, testResult: { success: true, data: res.data } } : x));
    } catch (err: any) {
      setProviders(prev => prev.map(x => x.id === providerId ? { ...x, testing: false, testResult: { success: false, error: err.message } } : x));
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="w-6 h-6 text-yellow-400" />
            Providers & Integrations
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Manage credentials, API keys, and scraping quotas.</p>
        </div>
        <button onClick={loadStatus} className="btn-secondary text-xs flex items-center gap-2">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Status
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-red-400">Failed to load provider status</p>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Warnings Banner */}
      {providers.some(p => !p.isConfigured && p.requiresKey) && (
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-bold text-orange-400">Missing Credentials Detected</p>
            <p className="text-xs text-orange-400/80 mt-1">
              Some integrations are currently disabled because they are missing API keys. 
              The discovery engine will automatically fall back to available providers.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {providers.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`p-6 rounded-2xl border transition-colors ${
              p.isConfigured 
                ? 'bg-zinc-900/50 border-emerald-500/20' 
                : 'bg-zinc-900/30 border-zinc-800'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${p.isConfigured ? 'bg-emerald-500/10' : 'bg-zinc-800'}`}>
                  {p.type === 'discovery' ? <Plug className={`w-5 h-5 ${p.isConfigured ? 'text-emerald-400' : 'text-zinc-500'}`} /> : 
                   p.type === 'enrichment' ? <Zap className={`w-5 h-5 ${p.isConfigured ? 'text-blue-400' : 'text-zinc-500'}`} /> : 
                   <ShieldCheck className={`w-5 h-5 ${p.isConfigured ? 'text-purple-400' : 'text-zinc-500'}`} />}
                </div>
                <div>
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500">{p.type}</span>
                    {p.isFree && <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-400/10 px-1.5 rounded">Free Tier</span>}
                  </div>
                </div>
              </div>
              <div>
                {p.isConfigured ? (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-800 px-2 py-1 rounded-full">
                    <XCircle className="w-3.5 h-3.5" /> Disabled
                  </span>
                )}
              </div>
            </div>

            {!p.isConfigured && p.requiresKey && (
              <div className="mt-4 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 space-y-2">
                <p className="text-xs font-medium text-orange-400 flex items-center gap-2">
                  <Key className="w-3.5 h-3.5" /> Missing Required Environment Variable
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-black/40 px-2 py-1 rounded text-orange-300 font-mono flex-1">
                    {p.envVar}="YOUR_API_KEY"
                  </code>
                </div>
                <p className="text-[10px] text-orange-400/70">Add this to your backend /.env file and restart the server to enable.</p>
              </div>
            )}

            {p.isConfigured && (
              <div className="mt-6 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Daily Quota Usage</span>
                  <span className="font-mono text-zinc-300">
                    <span className={p.quotaUsed >= p.dailyQuota ? 'text-red-400' : 'text-emerald-400'}>{p.quotaUsed}</span> / {p.dailyQuota}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div 
                    className={`h-full ${p.quotaUsed >= p.dailyQuota ? 'bg-red-400' : 'bg-emerald-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (p.quotaUsed / p.dailyQuota) * 100)}%` }}
                  />
                </div>
                
                {/* Test Actions */}
                <div className="pt-4 mt-4 border-t border-zinc-800">
                  <button 
                    onClick={() => handleTest(p.id)}
                    disabled={p.testing}
                    className="w-full btn-secondary text-xs flex items-center justify-center gap-2"
                  >
                    {p.testing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    {p.testing ? 'Testing...' : `Test ${p.name}`}
                  </button>
                  
                  {p.testResult && (
                    <div className={`mt-3 p-3 rounded-lg text-xs font-mono overflow-auto max-h-40 ${p.testResult.success ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {p.testResult.success ? (
                        <>
                          <span className="block mb-1 font-bold text-emerald-300">✓ Test Succeeded</span>
                          {JSON.stringify(p.testResult.data, null, 2)}
                        </>
                      ) : (
                        <>
                          <span className="block mb-1 font-bold text-red-300">✗ Test Failed</span>
                          {p.testResult.error}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
