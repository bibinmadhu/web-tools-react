import React, { useState, useEffect } from 'react';
import { Copy, Check, Hash } from 'lucide-react';
import { generateHash } from '../../utils/toolFunctions';

export const HashGeneratorTool: React.FC = () => {
  const [input, setInput] = useState('DevHub Cryptographic Engine 2026');
  const [sha256, setSha256] = useState('');
  const [sha512, setSha512] = useState('');
  const [sha1, setSha1] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const runHashes = async () => {
      const h256 = await generateHash(input, 'SHA-256');
      const h512 = await generateHash(input, 'SHA-512');
      const h1 = await generateHash(input, 'SHA-1');
      if (active) {
        setSha256(h256);
        setSha512(h512);
        setSha1(h1);
      }
    };
    runHashes();
    return () => {
      active = false;
    };
  }, [input]);

  const copyToClipboard = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
          INPUT STRING / DATA PAYLOAD
        </label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste text to generate cryptographic hashes..."
          className="w-full h-24 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div className="space-y-3">
        {[
          { label: 'SHA-256', key: 'sha256', val: sha256 },
          { label: 'SHA-512', key: 'sha512', val: sha512 },
          { label: 'SHA-1', key: 'sha1', val: sha1 },
        ].map((item) => (
          <div key={item.key} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-blue-400 font-mono">{item.label}</span>
              <button
                onClick={() => copyToClipboard(item.key, item.val)}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition-colors"
              >
                {copiedKey === item.key ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === item.key ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-slate-200 break-all select-all">
              {item.val || '...'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
