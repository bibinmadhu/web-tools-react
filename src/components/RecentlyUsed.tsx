import React from 'react';
import { DevTool } from '../types';

interface RecentlyUsedProps {
  recentTools: DevTool[];
  onSelectTool: (tool: DevTool) => void;
}

export const RecentlyUsed: React.FC<RecentlyUsedProps> = ({ recentTools, onSelectTool }) => {
  if (recentTools.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
          RECENTLY USED UTILITIES
        </h2>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          FAST ACCESS
        </span>
      </div>
      <div className="flex flex-wrap gap-3">
        {recentTools.map((tool) => (
          <button
            key={tool.id}
            id={`recently-used-${tool.id}`}
            onClick={() => onSelectTool(tool)}
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1E293B] shadow-xs hover:border-indigo-500/50 hover:shadow-md dark:hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] transition-all group cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400 shrink-0">
              {tool.iconText}
            </div>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
              {tool.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
