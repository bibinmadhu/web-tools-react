import React from 'react';
import { Menu, Wrench, Search, Star, Moon, Sun, TestTube2, CheckCircle2 } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenSearch: () => void;
  favoritesCount: number;
  onSelectFavoritesCategory: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenTestRunner: () => void;
  testPassCount?: number;
  testTotalCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onOpenSearch,
  favoritesCount,
  onSelectFavoritesCategory,
  darkMode,
  onToggleDarkMode,
  onOpenTestRunner,
  testPassCount = 12,
  testTotalCount = 12,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md px-4 sm:px-8 transition-colors">
      {/* Left: Mobile Toggle & Brand */}
      <div className="flex items-center gap-3">
        <button
          id="toggle-sidebar-btn"
          onClick={onToggleSidebar}
          className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Toggle Navigation Sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 font-bold text-lg text-slate-900 dark:text-white tracking-tight">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] shrink-0">
            <Wrench className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-900 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-indigo-200 bg-clip-text text-transparent">
            DevFlow Pro
          </span>
        </div>
      </div>

      {/* Center: Search Trigger (Cmd + K) */}
      <div className="flex-1 max-w-xl mx-6 hidden sm:block">
        <button
          id="search-trigger-btn"
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-4 py-1.5 rounded-full border border-slate-200 bg-slate-100/90 text-slate-500 hover:border-indigo-400 hover:bg-white dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-400 dark:hover:border-indigo-500/50 dark:hover:bg-slate-900 transition-all text-xs shadow-xs group"
          aria-label="Search tools"
        >
          <div className="flex items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 dark:text-slate-500 dark:group-hover:text-indigo-400 transition-colors" />
            <span className="text-slate-600 dark:text-slate-300 font-normal">
              Quick search tools... <span className="text-slate-400 dark:text-slate-500 text-xs hidden md:inline">(Cmd + K)</span>
            </span>
          </div>
          <kbd className="hidden md:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-semibold text-slate-500 bg-slate-200/80 border border-slate-300 dark:text-slate-400 dark:bg-slate-800/80 dark:border-slate-700/60 rounded-full font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Mobile Search Button */}
      <button
        onClick={onOpenSearch}
        className="sm:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
        aria-label="Open Search"
      >
        <Search className="w-5 h-5" />
      </button>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Unit Tests Button */}
        <button
          id="unit-test-modal-btn"
          onClick={onOpenTestRunner}
          className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-semibold"
          title="Run Automated Component & Utility Unit Tests"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Tests ({testPassCount}/{testTotalCount})</span>
        </button>

        {/* Favorites Badge Button */}
        <button
          id="favorites-category-btn"
          onClick={onSelectFavoritesCategory}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/20 transition-colors text-xs font-medium shadow-2xs"
          aria-label={`View ${favoritesCount} Favorite Tools`}
        >
          <Star className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400" />
          <span className="font-semibold">Favs ({favoritesCount})</span>
        </button>

        {/* Dark Mode Toggle */}
        <button
          id="dark-mode-toggle-btn"
          onClick={onToggleDarkMode}
          className="flex items-center justify-center p-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-white transition-colors text-sm"
          aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {darkMode ? (
            <div className="flex items-center gap-1 text-xs font-mono text-amber-400">
              <Sun className="w-4 h-4" />
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs font-mono text-indigo-600">
              <Moon className="w-4 h-4" />
            </div>
          )}
        </button>
      </div>
    </header>
  );
};
