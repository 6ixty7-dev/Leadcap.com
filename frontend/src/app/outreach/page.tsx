'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchCampaigns, createCampaign } from '@/lib/api';
import Link from 'next/link';
import { Megaphone, Plus, Search, Calendar, ChevronRight, Activity, Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function OutreachDashboard() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', objective: '', offer: '', cta: '' });

  const loadCampaigns = async () => {
    setLoading(true);
    try {
      const res = await fetchCampaigns();
      if (res.data) setCampaigns(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async () => {
    if (!newCampaign.name) return;
    try {
      await createCampaign(newCampaign);
      setIsCreating(false);
      setNewCampaign({ name: '', objective: '', offer: '', cta: '' });
      loadCampaigns();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-[1600px] mx-auto pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-indigo-500" />
            Outreach Campaigns
          </h1>
          <p className="text-zinc-500 text-sm mt-1">AI-powered communication engine. Master prompts, bulk personalization, and automated sending.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-2xl text-sm flex items-center gap-2 shadow-[0_0_15px_rgba(79,70,229,0.4)] transition-all"
        >
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl mb-8 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" /> Create Master Campaign
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Campaign Name</label>
                  <input
                    type="text" value={newCampaign.name} onChange={(e) => setNewCampaign({...newCampaign, name: e.target.value})}
                    placeholder="e.g. Q4 Real Estate Push"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Primary Objective (Context for AI)</label>
                  <input
                    type="text" value={newCampaign.objective} onChange={(e) => setNewCampaign({...newCampaign, objective: e.target.value})}
                    placeholder="e.g. Get salon owners to book a 15-minute consultation."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">The Offer</label>
                  <textarea
                    value={newCampaign.offer} onChange={(e) => setNewCampaign({...newCampaign, offer: e.target.value})}
                    placeholder="e.g. Free SEO audit and 1 month trial of our booking software."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 h-24"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-2">Call to Action (CTA)</label>
                  <textarea
                    value={newCampaign.cta} onChange={(e) => setNewCampaign({...newCampaign, cta: e.target.value})}
                    placeholder="e.g. Reply 'YES' to see a demo, or book via link."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 h-24"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button onClick={() => setIsCreating(false)} className="px-5 py-2.5 rounded-xl text-zinc-400 font-bold text-sm hover:text-white transition-all">Cancel</button>
                <button onClick={handleCreate} disabled={!newCampaign.name} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50 transition-all">Create Campaign</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
           [...Array(3)].map((_, i) => (
             <div key={i} className="h-48 bg-zinc-900/50 border border-zinc-800 rounded-3xl animate-pulse" />
           ))
        ) : campaigns.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-zinc-950 border border-zinc-800 rounded-3xl">
            <Megaphone className="w-12 h-12 mx-auto mb-4 text-zinc-700" />
            <h3 className="text-xl font-bold text-zinc-400">No Campaigns Yet</h3>
            <p className="text-zinc-600 text-sm mt-2 max-w-xs mx-auto">Create a master prompt to start generating personalized AI outreach at scale.</p>
          </div>
        ) : (
          campaigns.map((camp) => (
            <Link href={`/outreach/${camp.id}`} key={camp.id} className="block group">
              <div className="bg-zinc-950 border border-zinc-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 shadow-xl hover:shadow-[0_0_30px_rgba(79,70,229,0.1)] h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors leading-tight">
                      {camp.name}
                    </h3>
                    <span className="px-2.5 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed mb-6">
                    {camp.objective || 'No specific objective defined.'}
                  </p>
                </div>
                
                <div className="border-t border-zinc-800/50 pt-4 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> {formatDateTime(camp.created_at).split(',')[0]}
                  </div>
                  <div className="flex items-center gap-1 text-indigo-400 font-bold text-xs uppercase tracking-widest">
                    Manage <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </motion.div>
  );
}
