import React, { useState } from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { DevTool, ToolCategory } from '../types';
import { ToolCard } from './ToolCard';

interface ToolGridProps {
  tools: DevTool[];
  activeCategory: ToolCategory;
  favorites: string[];
  onToggleFavorite: (toolId: string, e: React.MouseEvent) => void;
  onOpenTool: (tool: DevTool) => void;
}

export const ToolGrid: React.FC<ToolGridProps> = ({
  tools,
  activeCategory,
  favorites,
  onToggleFavorite,
  onOpenTool,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const categoryTitles: Record<ToolCategory, string> = {
    favorites: 'FAVORITES',
    converters: 'CONVERTERS & PARSERS',
    formatters: 'FORMATTERS & VALIDATORS',
    security: 'SECURITY & ENCRYPTION',
    generators: 'GENERATORS & UTILITIES',
    network: 'NETWORK & WEB TOOLS',
    documents: 'DOCUMENTS & PDF UTILITIES',
    all: 'ALL DEVELOPER TOOLS',
  };

  return (
    <div className="flex-1">
      {/* Category Header Bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
          <h2 className="text-xs font-bold tracking-wider text-slate-700 dark:text-slate-300 uppercase font-mono">
            {categoryTitles[activeCategory] || activeCategory.toUpperCase()}
          </h2>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            aria-label="Grid View"
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
            aria-label="List View"
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid or List */}
      {tools.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30">
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
            No tools found in this category.
          </p>
          {activeCategory === 'favorites' && (
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Click the star icon on any tool card to add it to your favorites.
            </p>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isFavorite={favorites.includes(tool.id)}
              onToggleFavorite={onToggleFavorite}
              onOpenTool={onOpenTool}
              viewMode="grid"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tools.map((tool) => (
            <ToolCard
              key={tool.id}
              tool={tool}
              isFavorite={favorites.includes(tool.id)}
              onToggleFavorite={onToggleFavorite}
              onOpenTool={onOpenTool}
              viewMode="list"
            />
          ))}
        </div>
      )}
    </div>
  );
};
