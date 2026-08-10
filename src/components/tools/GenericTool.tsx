import React, { useState } from 'react';
import { Copy, Check, Wrench } from 'lucide-react';
import { DevTool } from '../../types';

interface GenericToolProps {
  tool: DevTool;
}

export const GenericTool: React.FC<GenericToolProps> = ({ tool }) => {
  const [input, setInput] = useState('Sample input for ' + tool.name);
  const [copied, setCopied] = useState(false);

  const processInput = (text: string) => {
    return `[${tool.name} Processed Output]\n${text.split('').reverse().join('')}\nLength: ${text.length} chars`;
  };

  const output = processInput(input);

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
          <span>{copied ? 'Copied!' : 'Copy Result'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            INPUT DATA
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            PROCESSED OUTPUT
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
