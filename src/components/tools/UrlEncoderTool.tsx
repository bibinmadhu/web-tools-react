import React, { useState } from 'react';
import { Copy, Check, Globe } from 'lucide-react';

export const UrlEncoderTool: React.FC = () => {
  const sampleUrl = 'https://devhub.io/search?q=developer tools&category=formatters&sort=popular#top';
  const [input, setInput] = useState(sampleUrl);
  const [copied, setCopied] = useState(false);

  const encoded = encodeURIComponent(input);
  let decoded = input;
  try {
    decoded = decodeURIComponent(input);
  } catch (e) {
    decoded = 'Error decoding URI string';
  }

  // Parse query parameters
  let queryParams: [string, string][] = [];
  try {
    const urlObj = new URL(input);
    queryParams = Array.from(urlObj.searchParams.entries());
  } catch (e) {
    // If not full URL, try parsing as query string directly
    const params = new URLSearchParams(input.includes('?') ? input.split('?')[1] : input);
    queryParams = Array.from(params.entries());
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
          TARGET URL / QUERY STRING
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste URL or query string..."
          className="w-full h-24 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none break-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono">
              PERCENT ENCODED URL
            </label>
            <button
              onClick={() => {
                navigator.clipboard.writeText(encoded);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="text-xs font-mono text-blue-500 hover:underline flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy Encoded
            </button>
          </div>
          <textarea
            readOnly
            value={encoded}
            className="w-full h-40 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-cyan-400 font-mono text-xs resize-none break-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            PARSED QUERY PARAMETERS ({queryParams.length})
          </label>
          <div className="w-full h-40 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 font-mono text-xs overflow-y-auto space-y-1">
            {queryParams.length === 0 ? (
              <div className="text-slate-500 py-6 text-center">No query parameters detected.</div>
            ) : (
              queryParams.map(([k, v], i) => (
                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-900 px-2">
                  <span className="font-bold text-amber-400">{k}:</span>
                  <span className="text-slate-200 font-medium truncate max-w-[200px]">{v}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
