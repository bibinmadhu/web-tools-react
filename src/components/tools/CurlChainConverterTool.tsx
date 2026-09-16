import React, { useState, useMemo } from 'react';
import {
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Terminal,
  Settings2,
  ChevronDown,
  ChevronUp,
  Layers,
  Key,
  Globe,
  Code2,
  FileCode,
  Shield,
  Zap,
  Sparkles,
  RefreshCw,
  Eye,
  Sliders,
  MoveUp,
  MoveDown,
  CopyPlus,
  Link,
  HelpCircle,
} from 'lucide-react';
import { parseCurlCommand, ParsedCurlRequest } from '../../utils/curlParser';
import {
  PythonClientLibrary,
  ScriptStructure,
  TokenExtractionConfig,
  TokenInjectionConfig,
  PythonChainGenOptions,
  SubsequentRequest,
  COMMON_RESPONSE_TOKENS,
  COMMON_TOKEN_HEADERS,
  DEFAULT_EXTRACTION_CONFIG,
  DEFAULT_INJECTION_CONFIG,
  DEFAULT_OPTIONS,
  generateChainedPythonScript,
} from '../../utils/curlChainConverter';
import { CURL_CHAIN_PRESETS, CurlChainPreset } from '../../utils/curlChainPresets';

export const CurlChainConverterTool: React.FC = () => {
  // Preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>(CURL_CHAIN_PRESETS[0].id);

  // Login cURL input
  const [loginCurl, setLoginCurl] = useState<string>(CURL_CHAIN_PRESETS[0].loginCurl);

  // Subsequent cURLs
  const [subsequentRequests, setSubsequentRequests] = useState<SubsequentRequest[]>(
    CURL_CHAIN_PRESETS[0].subsequentRequests
  );

  // Extraction & Injection configs
  const [extraction, setExtraction] = useState<TokenExtractionConfig>(CURL_CHAIN_PRESETS[0].extraction);
  const [injection, setInjection] = useState<TokenInjectionConfig>(CURL_CHAIN_PRESETS[0].injection);

  // Python Generator Options
  const [options, setOptions] = useState<PythonChainGenOptions>(DEFAULT_OPTIONS);

  // UI States
  const [activeTab, setActiveTab] = useState<'code' | 'flow' | 'guide'>('code');
  const [copied, setCopied] = useState<boolean>(false);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState<boolean>(false);
  const [isCustomResponseToken, setIsCustomResponseToken] = useState<boolean>(false);
  const [isCustomTokenHeader, setIsCustomTokenHeader] = useState<boolean>(false);

  // Parse login cURL live
  const parsedLogin: ParsedCurlRequest = useMemo(() => {
    return parseCurlCommand(loginCurl);
  }, [loginCurl]);

  // Generate Python Code
  const generatedPythonCode = useMemo(() => {
    try {
      return generateChainedPythonScript(loginCurl, subsequentRequests, extraction, injection, options);
    } catch (err: any) {
      return `# Error generating Python script: ${err.message || String(err)}`;
    }
  }, [loginCurl, subsequentRequests, extraction, injection, options]);

  // Handle Preset change
  const handleSelectPreset = (presetId: string) => {
    const preset = CURL_CHAIN_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setLoginCurl(preset.loginCurl);
    setSubsequentRequests(preset.subsequentRequests);
    setExtraction(preset.extraction);
    setInjection(preset.injection);

    // Check if preset token/header is custom
    const isStandardResp = COMMON_RESPONSE_TOKENS.some((t) => t.value === preset.extraction.keyPath);
    setIsCustomResponseToken(!isStandardResp);

    const isStandardHeader = COMMON_TOKEN_HEADERS.some((h) => h.header.toLowerCase() === preset.injection.headerName.toLowerCase());
    setIsCustomTokenHeader(!isStandardHeader);
  };

  // Add a new subsequent request
  const handleAddRequest = () => {
    const newId = `step-${Date.now()}`;
    const newReq: SubsequentRequest = {
      id: newId,
      name: `Step ${subsequentRequests.length + 2}: Custom Request`,
      curl: `curl -X GET https://api.example.com/v1/resource \\
  -H "Accept: application/json" \\
  -H "${injection.headerName}: <placeholder>"`,
      enabled: true,
    };
    setSubsequentRequests([...subsequentRequests, newReq]);
  };

  // Update a subsequent request
  const handleUpdateRequest = (id: string, updates: Partial<SubsequentRequest>) => {
    setSubsequentRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  // Delete a subsequent request
  const handleDeleteRequest = (id: string) => {
    setSubsequentRequests((prev) => prev.filter((item) => item.id !== id));
  };

  // Duplicate a request
  const handleDuplicateRequest = (index: number) => {
    const itemToClone = subsequentRequests[index];
    const cloned: SubsequentRequest = {
      ...itemToClone,
      id: `step-${Date.now()}`,
      name: `${itemToClone.name} (Copy)`,
    };
    const nextList = [...subsequentRequests];
    nextList.splice(index + 1, 0, cloned);
    setSubsequentRequests(nextList);
  };

  // Move request up/down
  const handleMoveRequest = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= subsequentRequests.length) return;
    const nextList = [...subsequentRequests];
    const [moved] = nextList.splice(index, 1);
    nextList.splice(targetIndex, 0, moved);
    setSubsequentRequests(nextList);
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedPythonCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Download Python file
  const handleDownload = () => {
    const blob = new Blob([generatedPythonCode], { type: 'text/x-python;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'api_auth_chain.py';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner & Control Bar */}
      <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Preset:
          </label>
          <select
            value={selectedPresetId}
            onChange={(e) => handleSelectPreset(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden shadow-2xs"
          >
            {CURL_CHAIN_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Library Picker */}
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Lib:</span>
            <select
              value={options.library}
              onChange={(e) => setOptions({ ...options, library: e.target.value as PythonClientLibrary })}
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="requests">requests (Standard)</option>
              <option value="httpx_sync">httpx (Sync Client)</option>
              <option value="httpx_async">httpx (Async / Await)</option>
              <option value="aiohttp">aiohttp (Async)</option>
            </select>
          </div>

          {/* Architecture Structure Picker */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Structure:</span>
            <select
              value={options.structure}
              onChange={(e) => setOptions({ ...options, structure: e.target.value as ScriptStructure })}
              className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden"
            >
              <option value="session">Session-Based (requests.Session)</option>
              <option value="functions">Modular Functions (login, step1, ...)</option>
              <option value="sequential">Sequential Linear Script</option>
              <option value="class_client">OOP Class (ApiClient)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
              showAdvancedOptions
                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Options</span>
          </button>

          <button
            onClick={handleCopyCode}
            className="px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Script'}</span>
          </button>

          <button
            onClick={handleDownload}
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
            title="Download .py script"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Advanced Options Bar (Collapsible) */}
      {showAdvancedOptions && (
        <div className="p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={options.includeErrorHandling}
              onChange={(e) => setOptions({ ...options, includeErrorHandling: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Raise on 4xx/5xx (raise_for_status)</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={options.printResponses}
              onChange={(e) => setOptions({ ...options, printResponses: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>Print formatted JSON responses</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={options.useTypeHints}
              onChange={(e) => setOptions({ ...options, useTypeHints: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <span>PEP 484 Type Hints (Python 3.9+)</span>
          </label>

          <div className="flex items-center gap-2">
            <span className="text-slate-600 dark:text-slate-400">Timeout:</span>
            <input
              type="number"
              min="0"
              max="120"
              value={options.timeoutSeconds}
              onChange={(e) => setOptions({ ...options, timeoutSeconds: Number(e.target.value) || 0 })}
              className="w-16 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
            />
            <span className="text-slate-500">sec</span>
          </div>
        </div>
      )}

      {/* Main Two-Pane Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-0">
        {/* Left Column: Inputs & Configurations (7 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col space-y-4 overflow-y-auto pr-1">
          {/* ========================================================================= */}
          {/* 1. Login cURL Card */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[11px] font-bold flex items-center justify-center">
                  1
                </span>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Login / Authentication cURL
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                  {parsedLogin.method}
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[140px] font-mono">
                  {parsedLogin.baseUrl.replace(/^https?:\/\//, '')}
                </span>
              </div>
            </div>

            <textarea
              value={loginCurl}
              onChange={(e) => setLoginCurl(e.target.value)}
              placeholder="Paste login curl command here..."
              rows={4}
              className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-hidden resize-y leading-relaxed"
            />

            {/* Token Extraction Config Box */}
            <div className="mt-3 p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Token in Login Response:
                </span>
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Source:</span>
                  <select
                    value={extraction.source}
                    onChange={(e) => setExtraction({ ...extraction, source: e.target.value as any })}
                    className="px-1.5 py-0.5 text-[11px] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300"
                  >
                    <option value="json_body">JSON Body</option>
                    <option value="response_header">Response Header</option>
                    <option value="cookie">Cookie</option>
                  </select>
                </div>
              </div>

              {/* Response Key Selector / Custom Input */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Response Token Key / Path:
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={isCustomResponseToken ? 'custom' : extraction.keyPath}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomResponseToken(true);
                        } else {
                          setIsCustomResponseToken(false);
                          setExtraction({ ...extraction, keyPath: e.target.value });
                        }
                      }}
                      className="w-1/2 px-2 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                    >
                      {COMMON_RESPONSE_TOKENS.map((tok) => (
                        <option key={tok.value} value={tok.value}>
                          {tok.label}
                        </option>
                      ))}
                      <option value="custom">✏️ Custom key / path...</option>
                    </select>

                    {/* Key-in field for overriding or custom names */}
                    <input
                      type="text"
                      value={extraction.keyPath}
                      onChange={(e) => {
                        setExtraction({ ...extraction, keyPath: e.target.value });
                        setIsCustomResponseToken(true);
                      }}
                      placeholder="e.g. token, access_token, data.token"
                      className="w-1/2 px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Python Variable Name:
                  </label>
                  <input
                    type="text"
                    value={extraction.variableName}
                    onChange={(e) => setExtraction({ ...extraction, variableName: e.target.value })}
                    placeholder="token"
                    className="w-full px-2.5 py-1.5 text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. Token Injection Configuration Card */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-[#1E293B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-indigo-500" />
                Token Injection for Subsequent Requests
              </span>
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-slate-500">Inject Into:</span>
                <select
                  value={injection.placement}
                  onChange={(e) => setInjection({ ...injection, placement: e.target.value as any })}
                  className="px-2 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 font-medium"
                >
                  <option value="header">HTTP Header (Standard)</option>
                  <option value="query">Query Parameter</option>
                  <option value="cookie">Cookie</option>
                </select>
              </div>
            </div>

            {injection.placement === 'header' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Commonly Used Header Dropdown with Override */}
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Token Header Preset / Override:
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={isCustomTokenHeader ? 'custom' : injection.headerName}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setIsCustomTokenHeader(true);
                        } else {
                          setIsCustomTokenHeader(false);
                          const found = COMMON_TOKEN_HEADERS.find((h) => h.header === val);
                          setInjection({
                            ...injection,
                            headerName: val,
                            headerFormat: found ? found.format : '{token}',
                          });
                        }
                      }}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                    >
                      {COMMON_TOKEN_HEADERS.map((h, i) => (
                        <option key={i} value={h.header}>
                          {h.label}
                        </option>
                      ))}
                      <option value="custom">✏️ Custom Header Name...</option>
                    </select>

                    {/* Override text field */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Header:</span>
                      <input
                        type="text"
                        value={injection.headerName}
                        onChange={(e) => {
                          setInjection({ ...injection, headerName: e.target.value });
                          setIsCustomTokenHeader(true);
                        }}
                        placeholder="e.g. Authorization or token"
                        className="flex-1 px-2 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  </div>
                </div>

                {/* Header Format / Prefix */}
                <div>
                  <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                    Header Value Format / Prefix:
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={injection.headerFormat}
                      onChange={(e) => setInjection({ ...injection, headerFormat: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                    >
                      <option value="Bearer {token}">Bearer &#123;token&#125; (Standard)</option>
                      <option value="{token}">&#123;token&#125; (Raw / No Prefix)</option>
                      <option value="Token {token}">Token &#123;token&#125; (Django REST)</option>
                      <option value="JWT {token}">JWT &#123;token&#125;</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400">Preview:</span>
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 truncate">
                        {injection.headerName}: {injection.headerFormat.replace('{token}', `<${extraction.variableName}>`)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs">
                <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">
                  Query Parameter Key Name:
                </label>
                <input
                  type="text"
                  value={injection.queryParamName}
                  onChange={(e) => setInjection({ ...injection, queryParamName: e.target.value })}
                  placeholder="token"
                  className="w-full sm:w-64 px-2.5 py-1.5 font-mono bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
                />
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. Subsequent cURL Requests List (Any number supported!) */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Subsequent Requests ({subsequentRequests.length})
                </h3>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  (Uses extracted {extraction.variableName})
                </span>
              </div>
              <button
                onClick={handleAddRequest}
                className="px-2.5 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Request</span>
              </button>
            </div>

            {subsequentRequests.map((req, index) => {
              const parsed = parseCurlCommand(req.curl);
              const stepNumber = index + 2;

              return (
                <div
                  key={req.id}
                  className={`bg-white dark:bg-[#1E293B] rounded-xl border transition-all p-3.5 shadow-xs ${
                    req.enabled
                      ? 'border-slate-200 dark:border-slate-800'
                      : 'border-dashed border-slate-300 dark:border-slate-700 opacity-60'
                  }`}
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold flex items-center justify-center shrink-0">
                        {stepNumber}
                      </span>
                      <input
                        type="text"
                        value={req.name}
                        onChange={(e) => handleUpdateRequest(req.id, { name: e.target.value })}
                        className="text-xs font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-hidden truncate max-w-[200px]"
                      />
                      <span className="px-1.5 py-0.5 rounded font-mono text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                        {parsed.method}
                      </span>
                    </div>

                    {/* Step Action Buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMoveRequest(index, 'up')}
                        disabled={index === 0}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveRequest(index, 'down')}
                        disabled={index === subsequentRequests.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Move Down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDuplicateRequest(index)}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Duplicate Request"
                      >
                        <CopyPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleUpdateRequest(req.id, { enabled: !req.enabled })}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          req.enabled
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}
                      >
                        {req.enabled ? 'Active' : 'Disabled'}
                      </button>
                      {subsequentRequests.length > 1 && (
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete Request"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* cURL textarea */}
                  <textarea
                    value={req.curl}
                    onChange={(e) => handleUpdateRequest(req.id, { curl: e.target.value })}
                    rows={3}
                    placeholder="curl -X GET https://api.example.com/data ..."
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700/80 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-hidden resize-y leading-relaxed"
                  />

                  {/* Smart detection badge */}
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3 h-3" />
                      Token injected as: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">{injection.headerName}</code>
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                      {parsed.baseUrl.replace(/^https?:\/\//, '')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Generated Python Script & Pipeline Flow (6 cols on lg) */}
        <div className="lg:col-span-6 flex flex-col bg-white dark:bg-[#1E293B] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
          {/* Header Tabs */}
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === 'code'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Python Script</span>
              </button>

              <button
                onClick={() => setActiveTab('flow')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === 'flow'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Token Flow Visualizer</span>
              </button>

              <button
                onClick={() => setActiveTab('guide')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors ${
                  activeTab === 'guide'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs border border-slate-200 dark:border-slate-700'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Run Guide</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors flex items-center gap-1"
                title="Copy code"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Code View */}
          {activeTab === 'code' && (
            <div className="relative flex-1 p-3 overflow-auto bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed select-all">
              <pre className="overflow-x-auto whitespace-pre">
                <code>{generatedPythonCode}</code>
              </pre>
            </div>
          )}

          {/* Tab 2: Flow Visualizer */}
          {activeTab === 'flow' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/40">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Authentication & Token Pipeline
              </h4>

              {/* Login Block */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-indigo-200 dark:border-indigo-800/80 shadow-xs relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    Step 1: Authenticate Login
                  </span>
                  <span className="font-mono text-[10px] px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded font-semibold">
                    {parsedLogin.method} {parsedLogin.baseUrl}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Sends credentials and receives authentication response.
                </p>

                {/* Token Extractor Badge */}
                <div className="mt-3 p-2.5 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-lg border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between text-xs">
                  <span className="font-medium text-indigo-900 dark:text-indigo-300">
                    Extracted Token ({extraction.source}):
                  </span>
                  <code className="font-mono px-2 py-0.5 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded font-bold">
                    response.{extraction.keyPath} → {extraction.variableName}
                  </code>
                </div>
              </div>

              {/* Arrow down */}
              <div className="flex justify-center text-indigo-500">
                <ArrowRight className="w-5 h-5 rotate-90" />
              </div>

              {/* Injected Header Card */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-medium">
                  <Key className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Dynamic Injected Credential:</span>
                </div>
                <code className="font-mono px-2 py-1 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 rounded font-bold border border-emerald-200 dark:border-emerald-800">
                  {injection.headerName}: {injection.headerFormat.replace('{token}', `<${extraction.variableName}>`)}
                </code>
              </div>

              {/* Arrow down */}
              <div className="flex justify-center text-indigo-500">
                <ArrowRight className="w-5 h-5 rotate-90" />
              </div>

              {/* Subsequent Requests in Flow */}
              <div className="space-y-2.5">
                {subsequentRequests
                  .filter((r) => r.enabled)
                  .map((req, idx) => {
                    const parsed = parseCurlCommand(req.curl);
                    return (
                      <div
                        key={req.id}
                        className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs shadow-2xs"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            Step {idx + 2}: {req.name}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded font-bold">
                            {parsed.method}
                          </span>
                        </div>
                        <div className="text-slate-500 font-mono text-[11px] truncate">
                          {parsed.baseUrl}
                        </div>
                        <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                          ✓ Header automatically carried: {injection.headerName}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Tab 3: Execution Guide */}
          {activeTab === 'guide' && (
            <div className="flex-1 p-5 overflow-y-auto space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                How to Run the Generated Python Script
              </h4>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  1. Install the selected HTTP client:
                </p>
                <div className="p-2 bg-slate-950 text-emerald-400 rounded-md font-mono text-[11px]">
                  {options.library === 'requests'
                    ? 'pip install requests'
                    : options.library.startsWith('httpx')
                    ? 'pip install httpx'
                    : 'pip install aiohttp'}
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  2. Save and execute the file:
                </p>
                <div className="p-2 bg-slate-950 text-emerald-400 rounded-md font-mono text-[11px]">
                  python api_auth_chain.py
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  3. Key Features configured in this script:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li>Automatic extraction from <code className="font-mono">{extraction.keyPath}</code> in response</li>
                  <li>Injected as <code className="font-mono">{injection.headerName}</code> with format <code className="font-mono">{injection.headerFormat}</code></li>
                  <li>Session connection reuse and cookie persistence</li>
                  <li>Exception handling with <code className="font-mono">raise_for_status()</code></li>
                  <li>Configurable for any custom token name, header, and arbitrary number of steps</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
