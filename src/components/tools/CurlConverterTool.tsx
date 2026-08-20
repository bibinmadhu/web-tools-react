import React, { useState, useMemo } from 'react';
import {
  Code2,
  Copy,
  Check,
  Download,
  Terminal,
  Settings2,
  ListFilter,
  Layers,
  Sparkles,
  Trash2,
  ArrowRight,
  Shield,
  Key,
  Globe,
  Database,
  FileCode,
} from 'lucide-react';
import { parseCurlCommand, ParsedCurlRequest } from '../../utils/curlParser';
import {
  generatePythonCode,
  generateTypeScriptCode,
  PythonLibrary,
  TypeScriptLibrary,
  CodeGenOptions,
} from '../../utils/curlToCode';
import { CURL_PRESETS, CurlPreset } from '../../utils/curlPresets';

type TargetLanguage = 'python' | 'typescript';

export const CurlConverterTool: React.FC = () => {
  const [curlInput, setCurlInput] = useState<string>(CURL_PRESETS[0].curl);
  const [language, setLanguage] = useState<TargetLanguage>('python');
  const [pythonLib, setPythonLib] = useState<PythonLibrary>('requests');
  const [tsLib, setTsLib] = useState<TypeScriptLibrary>('fetch');
  const [activeTab, setActiveTab] = useState<'code' | 'inspector'>('code');
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(CURL_PRESETS[0].id);

  // Generation options
  const [wrapInFunction, setWrapInFunction] = useState<boolean>(true);
  const [includeErrorHandling, setIncludeErrorHandling] = useState<boolean>(true);
  const [extractEnv, setExtractEnv] = useState<boolean>(false);
  const [includeTypes, setIncludeTypes] = useState<boolean>(true);
  const [indentSize, setIndentSize] = useState<2 | 4>(language === 'python' ? 4 : 2);
  const [showOptions, setShowOptions] = useState<boolean>(false);

  // Parse cURL
  const parsedRequest: ParsedCurlRequest = useMemo(() => {
    return parseCurlCommand(curlInput);
  }, [curlInput]);

  // Generate Code
  const generatedCode = useMemo(() => {
    const options: CodeGenOptions = {
      wrapInFunction,
      includeErrorHandling,
      extractEnv,
      includeTypes,
      indentSize,
    };

    if (language === 'python') {
      return generatePythonCode(parsedRequest, pythonLib, options);
    } else {
      return generateTypeScriptCode(parsedRequest, tsLib, options);
    }
  }, [parsedRequest, language, pythonLib, tsLib, wrapInFunction, includeErrorHandling, extractEnv, includeTypes, indentSize]);

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Download script file
  const handleDownload = () => {
    const filename = language === 'python' ? `api_request_${pythonLib}.py` : `apiRequest_${tsLib}.ts`;
    const mimeType = language === 'python' ? 'text/x-python' : 'text/typescript';
    const blob = new Blob([generatedCode], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Load Preset
  const handleSelectPreset = (preset: CurlPreset) => {
    setSelectedPresetId(preset.id);
    setCurlInput(preset.curl);
  };

  // Method Badge Color styling
  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'POST':
        return 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20';
      case 'PUT':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'PATCH':
        return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      case 'DELETE':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20';
      case 'HEAD':
        return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20';
      case 'OPTIONS':
        return 'bg-cyan-50 text-cyan-700 border-cyan-300 dark:bg-cyan-500/10 dark:text-cyan-400 dark:border-cyan-500/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Presets Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 font-mono">
              Quick REST Presets
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
              Preset:
            </span>
            <select
              value={selectedPresetId}
              onChange={(e) => {
                const found = CURL_PRESETS.find((p) => p.id === e.target.value);
                if (found) handleSelectPreset(found);
              }}
              className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            >
              {CURL_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.method}] {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {CURL_PRESETS.slice(0, 7).map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p)}
              className={`text-xs px-2.5 py-1 rounded-lg border font-mono shrink-0 transition-all ${
                selectedPresetId === p.id
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-400 dark:hover:border-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span className="font-bold mr-1 opacity-90">{p.method}</span>
              <span className="font-sans text-[11px]">{p.name.split('-')[1]?.trim() || p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Dual-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: cURL Command Input & Detection */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
              <label htmlFor="curl-input" className="text-sm font-bold text-slate-800 dark:text-slate-200">
                cURL Command
              </label>
              <span
                className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getMethodBadgeClass(
                  parsedRequest.method
                )}`}
              >
                {parsedRequest.method}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurlInput('')}
                className="text-xs text-slate-500 hover:text-rose-500 dark:text-slate-400 dark:hover:text-rose-400 flex items-center gap-1 transition-colors"
                title="Clear input"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          <div className="relative flex-1 flex flex-col min-h-[300px] lg:min-h-[440px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 overflow-hidden shadow-inner focus-within:ring-1 focus-within:ring-indigo-500">
            <textarea
              id="curl-input"
              value={curlInput}
              onChange={(e) => {
                setCurlInput(e.target.value);
                setSelectedPresetId('');
              }}
              placeholder={`curl -X POST "https://api.example.com/v1/resource" \\\n  -H "Authorization: Bearer token" \\\n  -d '{"key": "value"}'`}
              className="w-full h-full p-3.5 bg-transparent text-slate-900 dark:text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-none"
              spellCheck={false}
            />

            {/* Bottom mini overview of parsed call */}
            <div className="px-3 py-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/80 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <div className="truncate max-w-[280px]" title={parsedRequest.url || 'No URL detected'}>
                <span className="text-slate-400 dark:text-slate-500 mr-1.5">URL:</span>
                <span className="text-slate-800 dark:text-slate-200">{parsedRequest.baseUrl || parsedRequest.url || 'None'}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {Object.keys(parsedRequest.headers).length > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300">
                    {Object.keys(parsedRequest.headers).length} Hdr
                  </span>
                )}
                {parsedRequest.body?.type && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold">
                    {parsedRequest.body.type}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Generator Output & Inspector */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Language & Library Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Language Switch */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => {
                    setLanguage('python');
                    setIndentSize(4);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    language === 'python'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Python</span>
                </button>
                <button
                  onClick={() => {
                    setLanguage('typescript');
                    setIndentSize(2);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    language === 'typescript'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>TypeScript</span>
                </button>
              </div>

              {/* Client Library Dropdown */}
              {language === 'python' ? (
                <select
                  value={pythonLib}
                  onChange={(e) => setPythonLib(e.target.value as PythonLibrary)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="requests">requests (Standard Sync)</option>
                  <option value="httpx_async">httpx (Async Client)</option>
                  <option value="httpx_sync">httpx (Sync Client)</option>
                  <option value="aiohttp">aiohttp (AsyncIO)</option>
                  <option value="urllib">urllib (Built-in Standard Lib)</option>
                </select>
              ) : (
                <select
                  value={tsLib}
                  onChange={(e) => setTsLib(e.target.value as TypeScriptLibrary)}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                >
                  <option value="fetch">fetch (Native Web / Node 18+)</option>
                  <option value="axios">axios (Isomorphic)</option>
                  <option value="ky">ky (Modern Fetch Client)</option>
                </select>
              )}
            </div>

            {/* Right Action buttons */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowOptions(!showOptions)}
                className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  showOptions
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Configure script options"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">Options</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
                title="Copy code to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-colors"
                title="Download script"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Options Drawer */}
          {showOptions && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={wrapInFunction}
                  onChange={(e) => setWrapInFunction(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Async Wrapper</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeErrorHandling}
                  onChange={(e) => setIncludeErrorHandling(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Error Handling</span>
              </label>

              <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={extractEnv}
                  onChange={(e) => setExtractEnv(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Env Variables</span>
              </label>

              {language === 'typescript' && (
                <label className="flex items-center gap-2 text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTypes}
                    onChange={(e) => setIncludeTypes(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Type Interfaces</span>
                </label>
              )}
            </div>
          )}

          {/* View Mode Tabs (Code vs Inspector) */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('code')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'code'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Generated Script</span>
            </button>
            <button
              onClick={() => setActiveTab('inspector')}
              className={`flex items-center gap-2 px-4 py-2 border-b-2 text-xs font-bold transition-all ${
                activeTab === 'inspector'
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>REST Call Inspector</span>
              {Object.keys(parsedRequest.headers).length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                  {Object.keys(parsedRequest.headers).length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Content 1: Generated Code View */}
          {activeTab === 'code' && (
            <div className="relative flex-1 min-h-[300px] lg:min-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-[#0B0F1A] text-slate-200 overflow-hidden shadow-inner flex flex-col font-mono text-xs">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-950/60 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                  <span>{language === 'python' ? `Python (${pythonLib})` : `TypeScript (${tsLib})`}</span>
                </div>
                <span>{generatedCode.split('\n').length} lines</span>
              </div>

              <div className="p-4 overflow-y-auto max-h-[460px] leading-relaxed select-text">
                <pre className="text-slate-200 font-mono whitespace-pre-wrap break-all">
                  {generatedCode}
                </pre>
              </div>
            </div>
          )}

          {/* Tab Content 2: REST Call Inspector */}
          {activeTab === 'inspector' && (
            <div className="flex-1 min-h-[300px] lg:min-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4 space-y-4 overflow-y-auto max-h-[460px] text-xs">
              {/* Endpoint card */}
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Target Endpoint</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2.5 py-1 rounded-md font-bold font-mono text-xs border ${getMethodBadgeClass(parsedRequest.method)}`}>
                    {parsedRequest.method}
                  </span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 text-xs break-all">
                    {parsedRequest.url || 'No URL parsed'}
                  </span>
                </div>
              </div>

              {/* Authentication */}
              {parsedRequest.auth && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-500" />
                    <span>Authentication</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 font-mono font-semibold uppercase text-[10px] border border-amber-200 dark:border-amber-500/20">
                      {parsedRequest.auth.type}
                    </span>
                    {parsedRequest.auth.type === 'basic' && (
                      <span className="font-mono text-slate-600 dark:text-slate-300">
                        user: <span className="font-bold text-slate-900 dark:text-white">{parsedRequest.auth.username || '(empty)'}</span>
                      </span>
                    )}
                    {parsedRequest.auth.type === 'bearer' && (
                      <span className="font-mono text-slate-600 dark:text-slate-400 truncate max-w-xs">
                        Token: {parsedRequest.auth.token ? `${parsedRequest.auth.token.slice(0, 10)}...` : '(empty)'}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Query Parameters Table */}
              {Object.keys(parsedRequest.queryParams).length > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <ListFilter className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Query Parameters ({Object.keys(parsedRequest.queryParams).length})</span>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden font-mono">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
                        <tr>
                          <th className="p-2 font-semibold">Key</th>
                          <th className="p-2 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {Object.entries(parsedRequest.queryParams).map(([k, v]) => (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 font-semibold text-indigo-600 dark:text-indigo-400">{k}</td>
                            <td className="p-2 text-slate-700 dark:text-slate-300 break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Headers Table */}
              {Object.keys(parsedRequest.headers).length > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Headers ({Object.keys(parsedRequest.headers).length})</span>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden font-mono">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400">
                        <tr>
                          <th className="p-2 font-semibold">Header</th>
                          <th className="p-2 font-semibold">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                        {Object.entries(parsedRequest.headers).map(([k, v]) => (
                          <tr key={k} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 font-semibold text-slate-900 dark:text-slate-200">{k}</td>
                            <td className="p-2 text-slate-600 dark:text-slate-400 break-all">{v}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Body Data */}
              {parsedRequest.body && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Request Body ({parsedRequest.body.type})</span>
                    </div>
                  </div>
                  <pre className="p-3 rounded-lg bg-slate-900 text-slate-200 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                    {parsedRequest.body.type === 'json' && parsedRequest.body.jsonData
                      ? JSON.stringify(parsedRequest.body.jsonData, null, 2)
                      : parsedRequest.body.rawText || JSON.stringify(parsedRequest.body.formData, null, 2)}
                  </pre>
                </div>
              )}

              {/* Network Options */}
              {Object.keys(parsedRequest.options).length > 0 && (
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Network & SSL Options</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {parsedRequest.options.insecure && (
                      <span className="px-2 py-1 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-mono text-[11px]">
                        Insecure SSL (-k)
                      </span>
                    )}
                    {parsedRequest.options.followRedirects && (
                      <span className="px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-mono text-[11px]">
                        Follow Redirects (-L)
                      </span>
                    )}
                    {parsedRequest.options.timeoutSeconds && (
                      <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        Timeout: {parsedRequest.options.timeoutSeconds}s
                      </span>
                    )}
                    {parsedRequest.options.proxy && (
                      <span className="px-2 py-1 rounded bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20 font-mono text-[11px]">
                        Proxy: {parsedRequest.options.proxy}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
