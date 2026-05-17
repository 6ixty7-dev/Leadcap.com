'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, MapPin, Target, Layers, Filter, 
  ChevronDown, Zap, Globe, AtSign, Star,
  Smartphone, ShieldCheck, Clock, RefreshCw
} from 'lucide-react';

interface DiscoveryFormProps {
  onStart: (industry: string, city: string, radius: number, filters: any) => void;
  isLoading: boolean;
}

export default function DiscoveryForm({ onStart, isLoading }: DiscoveryFormProps) {
  const [industry, setIndustry] = useState('');
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(5);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState({
    minRating: 4.0,
    minReviews: 10,
    hasWebsite: false,
    hasInstagram: false,
    openNow: false,
    premiumOnly: false,
    aiHighPriority: true
  });

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!industry || !city) return;
    onStart(industry, city, radius, filters);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-950 border border-zinc-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden"
    >
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

      <form onSubmit={handleStart} className="space-y-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Search className="w-3 h-3" /> Target Industry
            </label>
            <input 
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Salons..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <MapPin className="w-3 h-3" /> City
            </label>
            <input 
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Kochi..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Target className="w-3 h-3" /> Landmark / Area (Optional)
            </label>
            <input 
              type="text"
              value={filters.location || ''}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              placeholder="e.g. Lulu Mall, MG Road..."
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl px-5 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-zinc-600 text-sm"
            />
          </div>
        </div>

        {/* Radius Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
              <Target className="w-3 h-3" /> Search Radius
            </label>
            <span className="text-xs font-bold text-indigo-400">{radius}km</span>
          </div>
          <input 
            type="range"
            min="1"
            max="50"
            value={radius}
            onChange={(e) => setRadius(parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 font-medium">
            <span>1km (Local)</span>
            <span>25km (City-wide)</span>
            <span>50km (Regional)</span>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="pt-2 border-t border-zinc-800/50">
          <button 
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest hover:text-white transition-colors"
          >
            <Filter className="w-3 h-3" /> 
            Advanced Intelligence Filters 
            <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          {showAdvanced && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-2"><Star className="w-3.5 h-3.5 text-yellow-500" /> Min Rating</span>
                  <input 
                    type="number" step="0.1" min="0" max="5" 
                    value={filters.minRating}
                    onChange={(e) => setFilters({...filters, minRating: parseFloat(e.target.value)})}
                    className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs text-center"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400 flex items-center gap-2"><Layers className="w-3.5 h-3.5 text-blue-500" /> Min Reviews</span>
                  <input 
                    type="number" 
                    value={filters.minReviews}
                    onChange={(e) => setFilters({...filters, minReviews: parseInt(e.target.value)})}
                    className="w-16 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs text-center"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={filters.hasWebsite}
                      onChange={(e) => setFilters({...filters, hasWebsite: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-indigo-600 transition-all" />
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-2"><Globe className="w-3.5 h-3.5" /> Website Required</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={filters.hasInstagram}
                      onChange={(e) => setFilters({...filters, hasInstagram: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-pink-600 transition-all" />
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-2"><AtSign className="w-3.5 h-3.5" /> Instagram Required</span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={filters.aiHighPriority}
                      onChange={(e) => setFilters({...filters, aiHighPriority: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-emerald-600 transition-all" />
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-emerald-400/80 group-hover:text-emerald-400 transition-colors flex items-center gap-2 font-bold"><ShieldCheck className="w-3.5 h-3.5" /> AI Priority Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={filters.openNow}
                      onChange={(e) => setFilters({...filters, openNow: e.target.checked})}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-zinc-800 rounded-full peer peer-checked:bg-amber-600 transition-all" />
                    <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-4" />
                  </div>
                  <span className="text-xs text-zinc-400 group-hover:text-zinc-200 transition-colors flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Currently Open</span>
                </label>
              </div>
            </motion.div>
          )}
        </div>

        <button 
          disabled={isLoading || !industry || !city}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black py-5 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-3 group"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Initializing Intelligent Discovery Engine...</span>
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 fill-current group-hover:scale-125 transition-transform" />
              <span className="text-lg">Acquire High-Quality Leads</span>
            </>
          )}
        </button>

        <p className="text-center text-zinc-600 text-[10px] font-medium uppercase tracking-[0.2em]">
          Powered by Gemini AI + Multi-Provider Extraction Engine
        </p>
      </form>
    </motion.div>
  );
}
