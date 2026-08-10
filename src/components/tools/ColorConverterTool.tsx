import React, { useState } from 'react';
import { Copy, Check, Palette } from 'lucide-react';
import { convertColor } from '../../utils/toolFunctions';

export const ColorConverterTool: React.FC = () => {
  const [hexInput, setHexInput] = useState('#3B82F6');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const converted = convertColor(hexInput);

  const copyToClipboard = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Visual Swatch & Inputs */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div
          className="w-16 h-16 rounded-xl border border-slate-300 dark:border-slate-600 shadow-sm shrink-0"
          style={{ backgroundColor: converted.isValid ? converted.hex : '#3B82F6' }}
        />

        <div className="flex-1 space-y-1">
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">
            COLOR PICKER / HEX INPUT
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={converted.isValid ? converted.hex : '#3B82F6'}
              onChange={(e) => setHexInput(e.target.value)}
              className="w-10 h-10 p-0 rounded-lg border-0 cursor-pointer bg-transparent"
            />
            <input
              type="text"
              value={hexInput}
              onChange={(e) => setHexInput(e.target.value)}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Conversion Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {[
          { label: 'HEX', key: 'hex', val: converted.hex },
          { label: 'RGB', key: 'rgb', val: converted.rgb },
          { label: 'HSL', key: 'hsl', val: converted.hsl },
          { label: 'CMYK', key: 'cmyk', val: converted.cmyk },
        ].map((item) => (
          <div
            key={item.key}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between"
          >
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase font-mono">{item.label}</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5">
                {item.val}
              </div>
            </div>

            <button
              onClick={() => copyToClipboard(item.key, item.val)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              aria-label={`Copy ${item.label}`}
            >
              {copiedKey === item.key ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
