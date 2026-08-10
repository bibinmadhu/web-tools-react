import React from 'react';
import { Star, RefreshCw, Paintbrush, ShieldCheck, Box, Globe, LayoutGrid } from 'lucide-react';
import { ToolCategory } from '../types';

interface SidebarProps {
  activeCategory: ToolCategory;
  onSelectCategory: (cat: ToolCategory) => void;
  favoritesCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeCategory,
  onSelectCategory,
  favoritesCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const categories: { id: ToolCategory; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'favorites',
      label: 'Favorites',
      icon: <Star className="w-4 h-4" />,
      badge: favoritesCount,
    },
    {
      id: 'converters',
      label: 'Converters',
      icon: <RefreshCw className="w-4 h-4" />,
    },
    {
      id: 'formatters',
      label: 'Formatters',
      icon: <Paintbrush className="w-4 h-4" />,
    },
    {
      id: 'security',
      label: 'Security',
      icon: <ShieldCheck className="w-4 h-4" />,
    },
    {
      id: 'generators',
      label: 'Generators',
      icon: <Box className="w-4 h-4" />,
    },
    {
      id: 'network',
      label: 'Network',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      id: 'all',
      label: 'All Tools',
      icon: <LayoutGrid className="w-4 h-4" />,
    },
  ];

  const content = (
    <div className="w-64 h-full flex flex-col bg-[#0F172A] border-r border-slate-800/60 p-4 shrink-0">
      <div className="px-3 py-2 mb-1">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
          DEVELOPMENT
        </h2>
      </div>

      <nav className="flex-1 space-y-1">
        {categories.map((cat) => {
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              id={`sidebar-category-${cat.id}`}
              onClick={() => {
                onSelectCategory(cat.id);
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-md font-medium text-sm transition-colors text-left ${
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-indigo-400' : 'text-slate-500 opacity-80'}>
                  {cat.icon}
                </span>
                <span>{cat.label}</span>
              </div>
              {cat.badge !== undefined && cat.badge > 0 && (
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
                    isActive
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {cat.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sleek API Status Box */}
      <div className="pt-4 border-t border-slate-800/60">
        <div className="bg-slate-800/40 p-3.5 rounded-xl border border-slate-700/50">
          <div className="text-[10px] text-slate-500 mb-1 font-mono uppercase tracking-wider">API STATUS</div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-200">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Connected & Ready</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-[calc(100vh-4rem)] sticky top-16">{content}</div>

      {/* Mobile Drawer Overlay */}
      {isOpenMobile && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-50 w-64 bg-white dark:bg-slate-900 h-full shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
