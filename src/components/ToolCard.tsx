import React from 'react';
import { Star } from 'lucide-react';
import { DevTool } from '../types';

interface ToolCardProps {
  tool: DevTool;
  isFavorite: boolean;
  onToggleFavorite: (toolId: string, e: React.MouseEvent) => void;
  onOpenTool: (tool: DevTool) => void;
  viewMode?: 'grid' | 'list';
}

export const ToolCard: React.FC<ToolCardProps> = ({
  tool,
  isFavorite,
  onToggleFavorite,
  onOpenTool,
  viewMode = 'grid',
}) => {
  if (viewMode === 'list') {
    return (
      <div
        id={`tool-card-${tool.id}`}
        onClick={() => onOpenTool(tool)}
        className="group relative flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1E293B] shadow-xs hover:border-indigo-500/50 hover:shadow-md dark:hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all cursor-pointer"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 shrink-0">
            {tool.iconText}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {tool.name}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              {tool.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-1.5">
            {tool.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-medium font-mono border border-slate-200 dark:border-slate-700/50"
              >
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={(e) => onToggleFavorite(tool.id, e)}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-amber-500 dark:hover:text-amber-400 transition-colors"
            aria-label={isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
          >
            <Star
              className={`w-5 h-5 transition-transform group-hover:scale-110 ${
                isFavorite ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400' : 'text-slate-300 dark:text-slate-600'
              }`}
            />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`tool-card-${tool.id}`}
      onClick={() => onOpenTool(tool)}
      className="group relative flex flex-col justify-between p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#1E293B] shadow-sm hover:shadow-md dark:shadow-xl hover:border-indigo-500/50 hover:shadow-indigo-500/10 dark:hover:shadow-[0_10px_25px_rgba(79,70,229,0.15)] hover:-translate-y-0.5 transition-all cursor-pointer min-h-[180px]"
    >
      {/* Top row: Icon box & Favorite button */}
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400 shadow-2xs">
          {tool.iconText}
        </div>

        <button
          onClick={(e) => onToggleFavorite(tool.id, e)}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          aria-label={isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
        >
          <Star
            className={`w-5 h-5 transition-transform group-hover:scale-110 ${
              isFavorite ? 'text-amber-500 dark:text-amber-400 fill-amber-500 dark:fill-amber-400' : 'text-slate-300 dark:text-slate-600'
            }`}
          />
        </button>
      </div>

      {/* Middle: Title & Description */}
      <div className="my-3">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {tool.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-1 leading-relaxed">
          {tool.description}
        </p>
      </div>

      {/* Bottom: Tags */}
      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/60">
        {tool.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[10px] font-medium font-mono border border-slate-200 dark:border-slate-700/50"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
