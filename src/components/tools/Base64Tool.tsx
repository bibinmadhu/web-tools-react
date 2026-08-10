import React, { useState } from 'react';
import { Copy, Check, ArrowRightLeft } from 'lucide-react';
import { base64Encode, base64Decode } from '../../utils/toolFunctions';

export const Base64Tool: React.FC = () => {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('Hello DevHub Utilities!');
  const [copied, setCopied] = useState(false);

  const outputResult = mode === 'encode' ? base64Encode(input) : base64Decode(input).decoded;
  const errorMsg = mode === 'decode' ? base64Decode(input).error : undefined;

  const handleCopy = () => {
    if (outputResult) {
      navigator.clipboard.writeText(outputResult);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 p-1 rounded-lg bg-slate-200 dark:bg-slate-800">
          <button
            onClick={() => setMode('encode')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              mode === 'encode'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Encode
          </button>
          <button
            onClick={() => setMode('decode')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              mode === 'decode'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Decode
          </button>
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Result'}</span>
        </button>
      </div>

      {/* Textareas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            {mode === 'encode' ? 'PLAIN TEXT INPUT' : 'BASE64 INPUT'}
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'encode' ? 'Type text to encode...' : 'Paste Base64 string to decode...'}
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            {mode === 'encode' ? 'BASE64 OUTPUT' : 'DECODED TEXT'}
          </label>
          {errorMsg ? (
            <div className="w-full h-80 p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 font-mono text-xs text-rose-600 dark:text-rose-400">
              {errorMsg}
            </div>
          ) : (
            <textarea
              readOnly
              value={outputResult}
              placeholder="Output will appear here..."
              className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none resize-none"
            />
          )}
        </div>
      </div>
    </div>
  );
};
