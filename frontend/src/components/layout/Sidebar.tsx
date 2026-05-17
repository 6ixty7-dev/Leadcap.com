'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Upload,
  Settings,
  Zap,
  ChevronRight,
  Compass,
  Plug
} from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/discovery', label: 'Discovery', icon: Compass },
  { href: '/providers', label: 'Providers', icon: Plug },
  { href: '/leads', label: 'Leads', icon: Users },
  { href: '/import', label: 'Import', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-screen w-[260px] bg-zinc-950 border-r border-zinc-800/50 flex flex-col z-50">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-zinc-800/50">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/20 group-hover:shadow-yellow-400/40 transition-shadow">
            <Zap className="w-5 h-5 text-black" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              Lead<span className="text-yellow-400">Cap</span>
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 font-medium">Intelligence OS</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <motion.div
                className={cn(
                  'nav-link relative group',
                  isActive && 'nav-link-active'
                )}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <item.icon className={cn(
                  'w-[18px] h-[18px] transition-colors',
                  isActive ? 'text-yellow-400' : 'text-zinc-500 group-hover:text-zinc-300'
                )} />
                <span className="flex-1 text-sm font-medium">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-4 h-4 text-yellow-400/50" />
                )}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-yellow-400 rounded-r-full"
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800/50">
        <div className="glass-card px-4 py-3">
          <p className="text-xs text-zinc-500">Backend Status</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Connected</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
