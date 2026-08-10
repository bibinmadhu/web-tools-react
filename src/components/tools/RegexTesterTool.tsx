import React, { useState } from 'react';
import { Search, AlertCircle, CheckCircle2 } from 'lucide-react';
import { testRegex } from '../../utils/toolFunctions';

export const RegexTesterTool: React.FC = () => {
  const [pattern, setPattern] = useState('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}');
  const [flags, setFlags] = useState('gi');
  const [testText, setTestText] = useState(
    'Please contact our support team at support@devhub.io or sales@testcompany.org for inquiries.'
  );

  const presets = [
    { label: 'Email Address', pattern: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', flags: 'gi' },
    { label: 'URL / Domain', pattern: 'https?://[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(/[^\\s]*)?', flags: 'gi' },
    { label: 'IPv4 Address', pattern: '\\b(?:\\d{1,3}\\.){3}\\d{1,3}\\b', flags: 'g' },
    { label: 'Hex Color Code', pattern: '#?([a-fA-F0-9]{6}|[a-fA-F0-9]{3})\\b', flags: 'gi' },
    { label: 'YYYY-MM-DD Date', pattern: '\\b\\d{4}-\\d{2}-\\d{2}\\b', flags: 'g' },
  ];

  const { matches, error } = testRegex(pattern, flags, testText);

  return (
    <div className="space-y-4">
      {/* Pattern Bar */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-[240px] flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs shadow-2xs">
            <span className="text-slate-400 font-bold mr-1">/</span>
            <input
              type="text"
              value={pattern}
              onChange={(e) => setPattern(e.target.value)}
              placeholder="Enter regex pattern..."
              className="w-full bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
            <span className="text-slate-400 font-bold ml-1">/</span>
          </div>

          <div className="w-24 flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 px-3 py-2 font-mono text-xs shadow-2xs">
            <input
              type="text"
              value={flags}
              onChange={(e) => setFlags(e.target.value)}
              placeholder="flags"
              className="w-full bg-transparent text-slate-900 dark:text-white focus:outline-none"
            />
          </div>

          <select
            onChange={(e) => {
              const selected = presets.find((p) => p.label === e.target.value);
              if (selected) {
                setPattern(selected.pattern);
                setFlags(selected.flags);
              }
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:outline-none"
          >
            <option value="">-- Load Preset --</option>
            {presets.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="text-xs text-rose-600 dark:text-rose-400 font-mono flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Syntax Error: {error}
          </div>
        ) : (
          <div className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pattern Valid ({matches.length} matches found)
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            TEST STRING / SAMPLE CONTENT
          </label>
          <textarea
            value={testText}
            onChange={(e) => setTestText(e.target.value)}
            placeholder="Type or paste text to test regex matches against..."
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            MATCH RESULTS ({matches.length})
          </label>
          <div className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-slate-100 font-mono text-xs overflow-y-auto space-y-2">
            {matches.length === 0 ? (
              <div className="text-slate-500 py-8 text-center font-sans">No matches found.</div>
            ) : (
              matches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-bold text-blue-400">Match #{idx + 1}</span>
                    <span>Index: {m.index}</span>
                  </div>
                  <div className="text-emerald-400 font-semibold break-all bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                    {m.match}
                  </div>
                  {m.groups.length > 0 && (
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Groups: {m.groups.map((g, i) => `$${i + 1}: ${g}`).join(', ')}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
