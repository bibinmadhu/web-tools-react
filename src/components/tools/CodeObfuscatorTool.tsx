import React, { useState } from 'react';
import { Copy, Check, ShieldCheck, Sparkles } from 'lucide-react';
import { obfuscateCode } from '../../utils/toolFunctions';

export const CodeObfuscatorTool: React.FC = () => {
  const sampleCode = `// Confidential Client Script\nfunction verifySecretToken(user, token) {\n  const secretKey = "DEV_HUB_SECRET_KEY_2026";\n  if (token === secretKey) {\n    console.log("Access Granted to: " + user);\n    return true;\n  }\n  return false;\n}`;

  const [input, setInput] = useState(sampleCode);
  const [mangleVars, setMangleVars] = useState(true);
  const [hexEncodeStrings, setHexEncodeStrings] = useState(true);
  const [compact, setCompact] = useState(true);
  const [copied, setCopied] = useState(false);

  const { obfuscated, originalSize, obfuscatedSize } = obfuscateCode(input, {
    mangleVars,
    hexEncodeStrings,
    compact,
  });

  const handleCopy = () => {
    if (obfuscated) {
      navigator.clipboard.writeText(obfuscated);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const diffBytes = originalSize - obfuscatedSize;
  const percentage = originalSize > 0 ? Math.round((diffBytes / originalSize) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Configuration bar */}
      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={mangleVars}
              onChange={(e) => setMangleVars(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Mangle Identifiers</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={hexEncodeStrings}
              onChange={(e) => setHexEncodeStrings(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Hex-Encode Strings</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={compact}
              onChange={(e) => setCompact(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span>Compact & Strip Comments</span>
          </label>
        </div>

        <div className="flex items-center gap-3">
          {originalSize > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs font-bold font-mono">
              {originalSize}B → {obfuscatedSize}B ({percentage >= 0 ? `-${percentage}%` : `+${Math.abs(percentage)}%`})
            </span>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Obfuscated'}</span>
          </button>
        </div>
      </div>

      {/* Editor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            ORIGINAL JS/TS CODE
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste JavaScript / TypeScript code here..."
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-900 text-slate-100 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase font-mono mb-1.5">
            OBFUSCATED OUTPUT
          </label>
          <textarea
            readOnly
            value={obfuscated}
            placeholder="Obfuscated code will be generated here..."
            className="w-full h-80 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none resize-none"
          />
        </div>
      </div>
    </div>
  );
};
