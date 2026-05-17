import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-amber-400';
  if (score >= 75) return 'text-indigo-400';
  if (score >= 60) return 'text-emerald-400';
  if (score >= 45) return 'text-blue-400';
  if (score >= 30) return 'text-zinc-400';
  return 'text-red-400';
}

export function getScoreBgColor(score: number): string {
  if (score >= 90) return 'bg-amber-400/10 border-amber-400/20';
  if (score >= 75) return 'bg-indigo-400/10 border-indigo-400/20';
  if (score >= 60) return 'bg-emerald-400/10 border-emerald-400/20';
  if (score >= 45) return 'bg-blue-400/10 border-blue-400/20';
  if (score >= 30) return 'bg-zinc-400/10 border-zinc-400/20';
  return 'bg-red-400/10 border-red-400/20';
}

export function getQualityColor(label: string): string {
  // New v5 tier labels (may contain emoji prefix)
  const l = label?.toLowerCase() || '';
  if (l.includes('elite'))      return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
  if (l.includes('high value'))  return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/30';
  if (l.includes('qualified'))   return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
  if (l.includes('prospect'))    return 'text-blue-400 bg-blue-400/10 border-blue-400/30';
  if (l.includes('research'))    return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
  if (l.includes('cold'))        return 'text-red-400 bg-red-400/10 border-red-400/30';
  // Legacy labels
  switch (label) {
    case 'High Quality': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'Good': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30';
    case 'Medium': return 'text-orange-400 bg-orange-400/10 border-orange-400/30';
    case 'Low Quality': return 'text-red-400 bg-red-400/10 border-red-400/30';
    default: return 'text-zinc-400 bg-zinc-400/10 border-zinc-400/30';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'new': return 'text-blue-400 bg-blue-400/10';
    case 'contacted': return 'text-purple-400 bg-purple-400/10';
    case 'qualified': return 'text-yellow-400 bg-yellow-400/10';
    case 'converted': return 'text-emerald-400 bg-emerald-400/10';
    case 'rejected': return 'text-red-400 bg-red-400/10';
    case 'archived': return 'text-zinc-500 bg-zinc-500/10';
    default: return 'text-zinc-400 bg-zinc-400/10';
  }
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + '...';
}
