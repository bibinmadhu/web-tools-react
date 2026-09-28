import React, { useState } from 'react';
import { Copy, Check, Code } from 'lucide-react';

export const CodeFormatterTool: React.FC = () => {
  const sample = `<div class="container"><header><h1>DevHub Utilities</h1></header><main><p>Format HTML, CSS, JS code instantly.</p></main></div>`;
  const [code, setCode] = useState(sample);
  const [copied, setCopied] = useState(false);

  // Simple clean tag indent formatter
  const formatHtml = (input: string) => {
    let formatted = '';
    let indent = '';
    const tab = '  ';
    input.split(/>\s*</).forEach((element) => {
      if (element.match(/^\/\w/)) {
        indent = indent.substring(tab.length);
      }
      formatted += indent + '<' + element + '>\n';
      if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith('input') && !element.startsWith('img')) {
        indent += tab;
      }
    });
    return formatted.substring(1, formatted.length - 2);
  };

  const output = formatHtml(code);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => {
            navigator.clipboard.writeText(output);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy Formatted'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            UNFORMATTED HTML / XML
          </label>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste code here..."
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            FORMATTED CODE
          </label>
          <textarea
            readOnly
            value={output}
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-blue-400 font-mono text-xs focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
