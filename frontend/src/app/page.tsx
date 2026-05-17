'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchStats } from '@/lib/api';
import { DashboardStats } from '@/types';
import { getScoreColor } from '@/lib/utils';
import {
  Users, TrendingUp, Star, AlertTriangle, Upload,
  BarChart3, ArrowUpRight, Zap
} from 'lucide-react';

const container: any = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item: any = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

function StatCard({ title, value, subtitle, icon: Icon, color, delay = 0 }: {
  title: string; value: string | number; subtitle?: string;
  icon: any; color: string; delay?: number;
}) {
  return (
    <motion.div variants={item} className="glass-card-hover p-5 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</p>
          <p className={`text-3xl font-bold mt-2 tracking-tight ${color}`}>{value}</p>
          {subtitle && <p className="text-xs text-zinc-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color.replace('text-', 'bg-')}/10 border border-current/10`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
}

function ScoreBar({ range, count, total }: { range: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-zinc-500 w-12 text-right font-mono">{range}</span>
      <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
          className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-yellow-400"
        />
      </div>
      <span className="text-xs text-zinc-400 w-8 font-mono">{count}</span>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(res => { if (res.data) setStats(res.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  const s = stats || {
    totalLeads: 0, highQuality: 0, good: 0, medium: 0, lowQuality: 0,
    avgScore: 0, recentImports: 0, categoryCounts: {}, statusCounts: {},
    scoreDistribution: [],
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="w-6 h-6 text-yellow-400" />
            Dashboard
          </h1>
          <p className="text-zinc-500 text-sm mt-0.5">Lead intelligence overview</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-600 font-mono">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Leads" value={s.totalLeads} icon={Users} color="text-white" />
        <StatCard title="High Quality" value={s.highQuality} subtitle={`${s.totalLeads > 0 ? Math.round((s.highQuality / s.totalLeads) * 100) : 0}% of total`} icon={Star} color="text-emerald-400" />
        <StatCard title="Avg Score" value={s.avgScore} icon={TrendingUp} color={getScoreColor(s.avgScore)} />
        <StatCard title="Recent Imports" value={s.recentImports} subtitle="Last 7 days" icon={Upload} color="text-yellow-400" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Score Distribution</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Lead quality breakdown</p>
            </div>
            <BarChart3 className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="space-y-3">
            {(s.scoreDistribution.length > 0 ? s.scoreDistribution : [
              { range: '0-20', count: 0 }, { range: '21-40', count: 0 },
              { range: '41-60', count: 0 }, { range: '61-80', count: 0 },
              { range: '81-100', count: 0 },
            ]).map(d => (
              <ScoreBar key={d.range} range={d.range} count={d.count} total={s.totalLeads} />
            ))}
          </div>
        </motion.div>

        {/* Quality Breakdown */}
        <motion.div variants={item} className="glass-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold">Quality Breakdown</h3>
              <p className="text-xs text-zinc-500 mt-0.5">Leads by quality label</p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="space-y-4">
            {[
              { label: 'High Quality', count: s.highQuality, color: 'bg-emerald-400', textColor: 'text-emerald-400' },
              { label: 'Good', count: s.good, color: 'bg-yellow-400', textColor: 'text-yellow-400' },
              { label: 'Medium', count: s.medium, color: 'bg-orange-400', textColor: 'text-orange-400' },
              { label: 'Low Quality', count: s.lowQuality, color: 'bg-red-400', textColor: 'text-red-400' },
            ].map(q => (
              <div key={q.label} className="flex items-center gap-4">
                <div className={`w-2.5 h-2.5 rounded-full ${q.color}`} />
                <span className="text-sm text-zinc-300 flex-1">{q.label}</span>
                <span className={`text-sm font-bold font-mono ${q.textColor}`}>{q.count}</span>
                <span className="text-xs text-zinc-600 w-12 text-right">
                  {s.totalLeads > 0 ? Math.round((q.count / s.totalLeads) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>

          {/* Low Quality Warning */}
          {s.lowQuality > 0 && s.totalLeads > 0 && (s.lowQuality / s.totalLeads) > 0.3 && (
            <div className="mt-5 flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs text-red-400">
                {Math.round((s.lowQuality / s.totalLeads) * 100)}% of leads are low quality — consider filtering
              </span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Categories */}
      {Object.keys(s.categoryCounts).length > 0 && (
        <motion.div variants={item} className="glass-card p-6">
          <h3 className="text-sm font-semibold mb-4">Top Categories</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(s.categoryCounts).slice(0, 12).map(([cat, count]) => (
              <div key={cat} className="px-3 py-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/30 text-xs">
                <span className="text-zinc-300">{cat}</span>
                <span className="text-yellow-400 ml-2 font-mono font-bold">{count}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
