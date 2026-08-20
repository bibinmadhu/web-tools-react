import React, { useState, useMemo } from 'react';
import {
  Terminal,
  Copy,
  Check,
  Download,
  Settings2,
  Sparkles,
  Trash2,
  ArrowRightLeft,
  Sliders,
  RotateCcw,
  CheckCircle2,
  FileCode,
  Shield,
  Layers,
  Zap,
  AlignLeft,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  flattenCurlCommand,
  beautifyCurlCommand,
  defaultFlattenerOptions,
  defaultBeautifyOptions,
  CurlFlattenerOptions,
  CurlBeautifyOptions,
  TargetShell,
  PayloadNewlineMode,
} from '../../utils/curlFlattener';
import { FLATTENER_PRESETS, FlattenerPreset } from '../../utils/curlFlattenerPresets';

export const CurlFlattenerTool: React.FC = () => {
  const [inputCurl, setInputCurl] = useState<string>(FLATTENER_PRESETS[0].curl);
  const [mode, setMode] = useState<'flatten' | 'beautify'>('flatten');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(FLATTENER_PRESETS[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  // Flattener Options
  const [options, setOptions] = useState<CurlFlattenerOptions>(defaultFlattenerOptions);

  // Beautify Options
  const [beautifyOpts, setBeautifyOpts] = useState<CurlBeautifyOptions>(defaultBeautifyOptions);

  // Output generation
  const { outputText, stats } = useMemo(() => {
    if (mode === 'flatten') {
      const res = flattenCurlCommand(inputCurl, options);
      return { outputText: res.singleLine, stats: res.stats };
    } else {
      const formatted = beautifyCurlCommand(inputCurl, beautifyOpts);
      const res = flattenCurlCommand(inputCurl, options);
      return { outputText: formatted, stats: res.stats };
    }
  }, [inputCurl, mode, options, beautifyOpts]);

  // Handle Preset Select
  const handleSelectPreset = (preset: FlattenerPreset) => {
    setSelectedPresetId(preset.id);
    setInputCurl(preset.curl);
  };

  // Copy to Clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download File
  const handleDownload = () => {
    const ext = options.targetShell === 'cmd' ? 'bat' : options.targetShell === 'powershell' ? 'ps1' : 'sh';
    const filename = mode === 'flatten' ? `curl_single_line.${ext}` : `curl_formatted.${ext}`;
    const blob = new Blob([outputText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Swap output back to input
  const handleSwap = () => {
    if (outputText) {
      setInputCurl(outputText);
      setSelectedPresetId('');
    }
  };

  // Reset to default options
  const handleResetOptions = () => {
    setOptions(defaultFlattenerOptions);
    setBeautifyOpts(defaultBeautifyOptions);
  };

  return (
    <div className="space-y-6">
      {/* Top Presets Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              cURL Presets & Test Cases
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              Preset:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const found = FLATTENER_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              {FLATTENER_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {FLATTENER_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono shrink-0 transition-all ${
                selectedPresetId === p.id
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="font-sans text-[11px]">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Mode Switcher & Stats Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        {/* Mode Buttons */}
        <div className="flex items-center p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
          <button
            onClick={() => setMode('flatten')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'flatten'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span>Flatten to Single Line</span>
          </button>
          <button
            onClick={() => setMode('beautify')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'beautify'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Beautify Multi-Line</span>
          </button>
        </div>

        {/* Live Metrics / Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20 font-semibold">
            Dialect: {stats.detectedDialect}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {stats.originalLines} lines → {stats.flattenedLines} line{stats.flattenedLines > 1 ? 's' : ''}
          </span>
          {stats.backslashesRemoved > 0 && (
            <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
              {stats.backslashesRemoved} \ removed
            </span>
          )}
          {stats.caretsRemoved > 0 && (
            <span className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
              {stats.caretsRemoved} ^ removed
            </span>
          )}
          {stats.backticksRemoved > 0 && (
            <span className="px-2 py-1 rounded-lg bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
              {stats.backticksRemoved} ` removed
            </span>
          )}
          {stats.percentReduction > 0 && (
            <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
              -{stats.percentReduction}% size
            </span>
          )}
        </div>

        {/* Options toggle */}
        <button
          onClick={() => setShowOptions(!showOptions)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            showOptions
              ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Configure Rules ({Object.values(options).filter(Boolean).length})</span>
        </button>
      </div>

      {/* Config Drawer */}
      {showOptions && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4 text-xs">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-500" />
              <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                Single-Line & Cleanup Rules
              </span>
            </div>
            <button
              onClick={handleResetOptions}
              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 font-mono"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Group 1: Line Continuations */}
            <div className="space-y-2.5 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 font-mono">
                Line Continuations
              </span>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeTrailingBackslashes}
                  onChange={(e) => setOptions({ ...options, removeTrailingBackslashes: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remove Trailing Backslashes (<code className="text-indigo-500 font-mono font-bold">\</code>)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeCmdCarets}
                  onChange={(e) => setOptions({ ...options, removeCmdCarets: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remove Windows Carets (<code className="text-amber-500 font-mono font-bold">^</code>)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removePowershellBackticks}
                  onChange={(e) => setOptions({ ...options, removePowershellBackticks: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Remove PS Backticks (<code className="text-purple-500 font-mono font-bold">`</code>)</span>
              </label>
            </div>

            {/* Group 2: Whitespace & Comments */}
            <div className="space-y-2.5 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 font-mono">
                Whitespace & Comments
              </span>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.collapseMultipleSpaces}
                  onChange={(e) => setOptions({ ...options, collapseMultipleSpaces: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Collapse Multiple Spaces</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.stripComments}
                  onChange={(e) => setOptions({ ...options, stripComments: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Strip Shell Comments (<code className="text-slate-500 font-mono"># ...</code>)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeCarriageReturns}
                  onChange={(e) => setOptions({ ...options, removeCarriageReturns: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Strip Windows <code className="text-slate-500 font-mono">\r</code> Carriage Returns</span>
              </label>
            </div>

            {/* Group 3: Payloads & Target Format */}
            <div className="space-y-2.5 p-3 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-500 font-mono">
                Payloads & Smart Quotes
              </span>
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.minifyJsonPayloads}
                  onChange={(e) => setOptions({ ...options, minifyJsonPayloads: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Minify & Compact JSON Payloads</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.normalizeSmartQuotes}
                  onChange={(e) => setOptions({ ...options, normalizeSmartQuotes: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Fix Smart Quotes (<code className="text-slate-500 font-mono">“ ” ‘ ’</code>)</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.normalizeSmartDashes}
                  onChange={(e) => setOptions({ ...options, normalizeSmartDashes: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Fix Smart Dashes (<code className="text-slate-500 font-mono">— –</code> to <code className="text-slate-500 font-mono">--</code>)</span>
              </label>
            </div>
          </div>

          {/* Target Shell & Payload Mode Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Target Shell Format:</span>
              <select
                value={options.targetShell}
                onChange={(e) => setOptions({ ...options, targetShell: e.target.value as TargetShell })}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="bash">Bash / Zsh / Linux / macOS</option>
                <option value="cmd">Windows CMD (Escaped quotes)</option>
                <option value="powershell">Windows PowerShell</option>
                <option value="preserve">Preserve Input Dialect</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Payload Newline Mode:</span>
              <select
                value={options.payloadNewlineMode}
                onChange={(e) => setOptions({ ...options, payloadNewlineMode: e.target.value as PayloadNewlineMode })}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-slate-900 dark:text-slate-100 font-medium"
              >
                <option value="compact_json">Compact JSON & Flatten</option>
                <option value="escape_literal">Escape as \n Literal</option>
                <option value="space">Replace with Space</option>
                <option value="preserve">Preserve Quoted Strings</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Multiline Input */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <label htmlFor="curl-raw-input" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Multiline cURL Command
              </label>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {inputCurl.split('\n').length} lines
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setInputCurl('')}
                className="text-xs text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex flex-col min-h-[320px] lg:min-h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-inner focus-within:ring-1 focus-within:ring-indigo-500">
            <textarea
              id="curl-raw-input"
              value={inputCurl}
              onChange={(e) => {
                setInputCurl(e.target.value);
                setSelectedPresetId('');
              }}
              placeholder={`curl -X POST "https://api.example.com/v1/users" \\\n  -H "Authorization: Bearer token" \\\n  -d '{"key": "value"}'`}
              className="w-full h-full p-4 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none"
              spellCheck={false}
            />

            <div className="px-3.5 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>{inputCurl.length} characters</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">Input Buffer</span>
            </div>
          </div>
        </div>

        {/* Right Column: Converted Single-Line Output */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {mode === 'flatten' ? 'Single-Line cURL Output' : 'Beautified cURL Output'}
              </span>
              <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                {mode === 'flatten' ? '1 Line' : `${outputText.split('\n').length} Lines`}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleSwap}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors"
                title="Swap output to input"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                title="Copy converted command"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors"
                title="Download command"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex flex-col min-h-[320px] lg:min-h-[420px] rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0B0F1A] text-slate-100 overflow-hidden shadow-inner font-mono text-xs">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                <span>{options.targetShell === 'cmd' ? 'Windows CMD' : options.targetShell === 'powershell' ? 'PowerShell' : 'Bash / POSIX Single Line'}</span>
              </div>
              <span>{outputText.length} chars</span>
            </div>

            <div className="p-4 overflow-y-auto max-h-[400px] leading-relaxed select-text flex-1">
              <pre className="text-emerald-400 dark:text-emerald-300 font-mono whitespace-pre-wrap break-all">
                {outputText || '// Converted single-line cURL will appear here'}
              </pre>
            </div>

            <div className="px-3.5 py-2 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="truncate max-w-[280px]">
                {stats.backslashesRemoved > 0 ? `Removed ${stats.backslashesRemoved} trailing \\ continuations` : 'Ready to paste in terminal'}
              </span>
              <span className="text-emerald-400 font-medium shrink-0">Single-Line Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
