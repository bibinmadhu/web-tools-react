import React, { useState, useEffect } from 'react';
import { Copy, Check, Trash2, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { beautifyJson } from '../../utils/toolFunctions';

export const JsonBeautifierTool: React.FC = () => {
  const sampleJson = `{\n  "appName": "DevHub",\n  "version": "1.0.0",\n  "features": ["Formatters", "Converters", "Security", "Generators"],\n  "settings": {\n    "theme": "dark",\n    "autoSave": true\n  }\n}`;

  const [input, setInput] = useState(sampleJson);
  const [indent, setIndent] = useState(2);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState(() => beautifyJson(sampleJson, 2));

  useEffect(() => {
    setResult(beautifyJson(input, indent));
  }, [input, indent]);

  const handleCopy = () => {
    if (result.output) {
      navigator.clipboard.writeText(result.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleMinify = () => {
    try {
      const parsed = JSON.parse(input);
      setInput(JSON.stringify(parsed));
    } catch (e) {
      // invalid JSON, ignore
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Indent:
          </label>
          <select
            value={indent}
            onChange={(e) => setIndent(Number(e.target.value))}
            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono focus:outline-none"
          >
            <option value={2}>2 Spaces</option>
            <option value={4}>4 Spaces</option>
            <option value={8}>8 Spaces</option>
          </select>

          <button
            onClick={handleMinify}
            className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Minify JSON
          </button>

          <button
            onClick={() => setInput(sampleJson)}
            className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
          >
            Load Sample
          </button>
        </div>

        <div className="flex items-center gap-3">
          {result.isValid ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-semibold font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" /> Valid JSON
            </span>
          ) : input.trim() ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 text-xs font-semibold font-mono">
              <AlertCircle className="w-3.5 h-3.5" /> Invalid Syntax
            </span>
          ) : null}

          <button
            onClick={() => setInput('')}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Clear Input"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Formatted'}</span>
          </button>
        </div>
      </div>

      {/* Inputs & Output Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            RAW JSON INPUT
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste raw JSON here..."
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            BEAUTIFIED OUTPUT
          </label>
          {result.error ? (
            <div className="w-full h-80 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 font-mono text-xs text-rose-600 dark:text-rose-400 overflow-y-auto">
              <div className="font-bold mb-1 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Syntax Error:
              </div>
              {result.error}
            </div>
          ) : (
            <textarea
              readOnly
              value={result.output}
              placeholder="Formatted output will appear here..."
              className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-blue-400 font-mono text-xs focus:outline-none resize-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};
