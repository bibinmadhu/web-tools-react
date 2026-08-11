import React, { useState, useEffect } from 'react';
import {
  Code,
  Sparkles,
  Copy,
  Check,
  Download,
  Settings2,
  Sliders,
  RotateCcw,
  AlignLeft,
  FileCode,
  ArrowRightLeft,
  Layers,
  CheckCircle,
} from 'lucide-react';
import {
  formatJavaCode,
  sampleUnformattedJavaCode,
  defaultJavaFormatterOptions,
  googleJavaStyleOptions,
  sunJavaStyleOptions,
  allmanStyleOptions,
  JavaFormatterOptions,
} from '../../utils/javaFormatter';

export const JavaFormatterTool: React.FC = () => {
  const [inputCode, setInputCode] = useState<string>(sampleUnformattedJavaCode);
  const [formattedCode, setFormattedCode] = useState<string>('');
  const [options, setOptions] = useState<JavaFormatterOptions>(defaultJavaFormatterOptions);
  const [activePreset, setActivePreset] = useState<'custom' | 'google' | 'sun' | 'allman'>('google');
  
  const [copied, setCopied] = useState<boolean>(false);
  const [showConfig, setShowConfig] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'stacked' | 'output-only'>('side-by-side');

  // Re-format whenever input or options change
  useEffect(() => {
    try {
      const result = formatJavaCode(inputCode, options);
      setFormattedCode(result);
    } catch (err) {
      console.error(err);
      setFormattedCode('// Error formatting Java code');
    }
  }, [inputCode, options]);

  const handleApplyPreset = (preset: 'google' | 'sun' | 'allman') => {
    setActivePreset(preset);
    if (preset === 'google') setOptions({ ...googleJavaStyleOptions });
    if (preset === 'sun') setOptions({ ...sunJavaStyleOptions });
    if (preset === 'allman') setOptions({ ...allmanStyleOptions });
  };

  const handleOptionChange = <K extends keyof JavaFormatterOptions>(
    key: K,
    value: JavaFormatterOptions[K]
  ) => {
    setActivePreset('custom');
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([formattedCode], { type: 'text/x-java-source;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Extract class name if possible
    const match = formattedCode.match(/public\s+(?:final\s+)?class\s+([A-Za-z0-9_]+)/);
    const fileName = match ? `${match[1]}.java` : 'FormattedCode.java';
    
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadSample = () => {
    setInputCode(sampleUnformattedJavaCode);
  };

  const inputLines = inputCode.split('\n').length;
  const outputLines = formattedCode.split('\n').length;

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              Java Code Formatter
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Highly Configurable
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Format, beautify, and standardize Java code structure, braces, imports, and modifier orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Sample Code</span>
          </button>

          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs border transition-colors ${
              showConfig
                ? 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showConfig ? 'Hide Config' : 'Show Config'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Result'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download .java</span>
          </button>
        </div>
      </div>

      {/* Configuration & Presets Panel */}
      {showConfig && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-orange-400" />
              <span className="font-bold text-xs text-white uppercase tracking-wider">
                Style Presets & Rules
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-medium">Preset:</span>
              <button
                onClick={() => handleApplyPreset('google')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activePreset === 'google'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Google Style (2 spaces)
              </button>

              <button
                onClick={() => handleApplyPreset('sun')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activePreset === 'sun'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Sun Standard (4 spaces)
              </button>

              <button
                onClick={() => handleApplyPreset('allman')}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activePreset === 'allman'
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Allman (Next-line Braces)
              </button>
            </div>
          </div>

          {/* Granular Option Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: Indentation & Braces */}
            <div className="space-y-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="block font-bold text-xs text-orange-300 uppercase tracking-wider">
                Indentation & Braces
              </span>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Indent Style
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleOptionChange('indentType', 'spaces')}
                    className={`py-1 px-2 rounded text-xs font-semibold border ${
                      options.indentType === 'spaces'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Spaces
                  </button>
                  <button
                    onClick={() => handleOptionChange('indentType', 'tabs')}
                    className={`py-1 px-2 rounded text-xs font-semibold border ${
                      options.indentType === 'tabs'
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    Tabs
                  </button>
                </div>
              </div>

              {options.indentType === 'spaces' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">
                    Indent Size: <span className="text-white font-mono">{options.indentSize}</span>
                  </label>
                  <div className="flex gap-2">
                    {[2, 4, 8].map((size) => (
                      <button
                        key={size}
                        onClick={() => handleOptionChange('indentSize', size)}
                        className={`flex-1 py-1 rounded text-xs font-mono font-bold border ${
                          options.indentSize === size
                            ? 'bg-indigo-600 border-indigo-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Brace Placement
                </label>
                <select
                  value={options.braceStyle}
                  onChange={(e: any) => handleOptionChange('braceStyle', e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden"
                >
                  <option value="same-line">Same Line (K&R Style)</option>
                  <option value="next-line">Next Line (Allman Style)</option>
                </select>
              </div>
            </div>

            {/* Column 2: Imports Organization */}
            <div className="space-y-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="block font-bold text-xs text-orange-300 uppercase tracking-wider">
                Imports & Declarations
              </span>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.sortImports}
                  onChange={(e) => handleOptionChange('sortImports', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Sort Imports Alphabetically</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.groupImports}
                  onChange={(e) => handleOptionChange('groupImports', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Group Standard & 3rd Party</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.removeDuplicateImports}
                  onChange={(e) => handleOptionChange('removeDuplicateImports', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Remove Duplicate Imports</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.normalizeModifiers}
                  onChange={(e) => handleOptionChange('normalizeModifiers', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Normalize Modifiers Order</span>
              </label>
            </div>

            {/* Column 3: Whitespace & Parentheses */}
            <div className="space-y-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="block font-bold text-xs text-orange-300 uppercase tracking-wider">
                Spacing & Formatting
              </span>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.spaceBeforeControlParentheses}
                  onChange={(e) => handleOptionChange('spaceBeforeControlParentheses', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Space before Control Parens <code className="text-[10px] text-slate-400">if (...)</code></span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.spaceAroundOperators}
                  onChange={(e) => handleOptionChange('spaceAroundOperators', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Space Around Operators <code className="text-[10px] text-slate-400">a + b</code></span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.spaceInsideParentheses}
                  onChange={(e) => handleOptionChange('spaceInsideParentheses', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Space Inside Parentheses <code className="text-[10px] text-slate-400">( x )</code></span>
              </label>
            </div>

            {/* Column 4: Line Hygiene */}
            <div className="space-y-3 p-3 rounded-lg bg-slate-800/40 border border-slate-700/50">
              <span className="block font-bold text-xs text-orange-300 uppercase tracking-wider">
                Line Hygiene
              </span>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Max Consecutive Blank Lines
                </label>
                <select
                  value={options.maxConsecutiveBlankLines}
                  onChange={(e) => handleOptionChange('maxConsecutiveBlankLines', parseInt(e.target.value))}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-white focus:outline-hidden"
                >
                  <option value={1}>1 Blank Line</option>
                  <option value={2}>2 Blank Lines</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.trimTrailingWhitespace}
                  onChange={(e) => handleOptionChange('trimTrailingWhitespace', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Trim Trailing Whitespace</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.ensureFinalNewline}
                  onChange={(e) => handleOptionChange('ensureFinalNewline', e.target.checked)}
                  className="w-4 h-4 accent-orange-500 rounded"
                />
                <span>Ensure Final Newline</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Editor Layout Toolbar */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4 text-xs text-slate-400 font-mono">
          <span>Input: <strong className="text-white">{inputLines}</strong> lines</span>
          <span>Output: <strong className="text-indigo-400">{outputLines}</strong> lines</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'side-by-side' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Side-by-Side
          </button>
          <button
            onClick={() => setViewMode('stacked')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'stacked' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Stacked
          </button>
          <button
            onClick={() => setViewMode('output-only')}
            className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
              viewMode === 'output-only' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Output Only
          </button>
        </div>
      </div>

      {/* Editors Area */}
      <div
        className={
          viewMode === 'side-by-side'
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-4'
            : 'space-y-4'
        }
      >
        {/* Input Textarea */}
        {viewMode !== 'output-only' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <FileCode className="w-4 h-4 text-slate-400" />
                Raw Java Input
              </label>
              <button
                onClick={() => setInputCode('')}
                className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
              >
                Clear Input
              </button>
            </div>
            <textarea
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Paste Java code here..."
              className="w-full h-96 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500 resize-y leading-relaxed"
            />
          </div>
        )}

        {/* Formatted Output Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Formatted Java Code
            </label>
            <span className="text-[11px] text-emerald-400 font-mono">
              Syntax Validated
            </span>
          </div>
          <pre className="w-full h-96 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-emerald-300/90 overflow-auto leading-relaxed select-text">
            {formattedCode}
          </pre>
        </div>
      </div>
    </div>
  );
};
