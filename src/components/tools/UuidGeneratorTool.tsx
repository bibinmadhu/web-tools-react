import React, { useState } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { generateUuid } from '../../utils/toolFunctions';

export const UuidGeneratorTool: React.FC = () => {
  const [count, setCount] = useState(5);
  const [uuids, setUuids] = useState<string[]>(() => Array.from({ length: 5 }, () => generateUuid()));
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setUuids(Array.from({ length: count }, () => generateUuid()));
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(uuids.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Options Bar */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Quantity: <span className="font-mono font-bold">{count}</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-32 accent-blue-600 cursor-pointer"
          />

          <button
            onClick={handleGenerate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-500" />
            <span>Generate New</span>
          </button>
        </div>

        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied All!' : 'Copy All UUIDs'}</span>
        </button>
      </div>

      {/* UUID List */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 font-mono text-xs text-blue-400 space-y-2 max-h-80 overflow-y-auto">
        {uuids.map((id, index) => (
          <div key={index} className="flex items-center justify-between py-1 border-b border-slate-900/80">
            <span>{id}</span>
            <button
              onClick={() => navigator.clipboard.writeText(id)}
              className="text-[10px] text-slate-500 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800"
            >
              Copy
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
