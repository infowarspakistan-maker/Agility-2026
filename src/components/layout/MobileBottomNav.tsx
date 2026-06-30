import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Shield, Briefcase, GraduationCap } from 'lucide-react';
import { cn } from '@/src/lib/utils';

const NAV_ITEMS = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'VISA', icon: Shield, path: '/packages/visa' },
  { label: 'EXPO', icon: Briefcase, path: '/packages/expo' },
  { label: 'STUDY', icon: GraduationCap, path: '/packages/study-abroad' },
];

export default function MobileBottomNav() {
  return (
    <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-md">
      <nav className="bg-white/80 backdrop-blur-xl border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2rem] px-4 py-3 flex items-center justify-between">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-300",
              isActive 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20 scale-105" 
                : "text-slate-400 hover:text-slate-600 active:scale-90"
            )}
          >
            <item.icon size={20} className={cn("transition-transform", "group-active:scale-90")} />
            <span className="text-[10px] font-black uppercase tracking-[0.1em] leading-none">
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
