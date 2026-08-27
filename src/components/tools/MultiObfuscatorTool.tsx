import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  Code2,
  FileCode,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  Settings,
  Search,
  BookOpen,
  Zap,
  ArrowRightLeft,
  FileJson,
  Layers,
  Sparkles,
  Trash2,
  Play,
  CheckCircle2,
  AlertTriangle,
  FolderArchive,
  Eye,
  Minimize2,
  Sliders,
  ExternalLink
} from 'lucide-react';
import JSZip from 'jszip';
import {
  obfuscateMultipleSets,
  deobfuscateMultipleSets,
  deobfuscateCode,
  CodeSetInput,
  MultiObfuscatorOptions,
  MultiObfuscationMapping,
  DEFAULT_MULTI_OBFUSCATOR_OPTIONS,
  NamingStyle
} from '../../utils/multiObfuscator';
import { MULTI_OBFUSCATOR_PRESETS } from '../../utils/multiObfuscatorPresets';

export const MultiObfuscatorTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'obfuscate' | 'deobfuscate' | 'mapping' | 'preview' | 'settings'>('obfuscate');
  const [activeSetIndex, setActiveSetIndex] = useState<number>(0); // 0 = Set 1, 1 = Set 2
  const [viewLayout, setViewLayout] = useState<'split' | 'source' | 'obfuscated'>('split');

  // Multi-set inputs (guaranteed 2 sets)
  const [sets, setSets] = useState<CodeSetInput[]>(() => {
    return MULTI_OBFUSCATOR_PRESETS[0].sets;
  });

  // Obfuscation configuration options
  const [options, setOptions] = useState<MultiObfuscatorOptions>(DEFAULT_MULTI_OBFUSCATOR_OPTIONS);

  // Results state
  const [obfuscationResult, setObfuscationResult] = useState(() => {
    return obfuscateMultipleSets(MULTI_OBFUSCATOR_PRESETS[0].sets, DEFAULT_MULTI_OBFUSCATOR_OPTIONS);
  });

  // De-obfuscation states
  const [deobfSetIndex, setDeobfSetIndex] = useState<number>(0);
  const [deobfScriptInput, setDeobfScriptInput] = useState<string>('');
  const [deobfHtmlInput, setDeobfHtmlInput] = useState<string>('');
  const [deobfMappingInput, setDeobfMappingInput] = useState<string>('');
  const [restoredScript, setRestoredScript] = useState<string>('');
  const [restoredHtml, setRestoredHtml] = useState<string>('');

  // Mapping search / filter state
  const [mappingCategory, setMappingCategory] = useState<'all' | 'identifiers' | 'htmlIds' | 'htmlClasses' | 'strings' | 'htmlText'>('all');
  const [mappingSearch, setMappingSearch] = useState<string>('');

  // UI notifications & feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [newExclusionTag, setNewExclusionTag] = useState<string>('');

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showStatus('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Run Obfuscation
  const handleRunObfuscation = () => {
    const result = obfuscateMultipleSets(sets, options);
    setObfuscationResult(result);
  };

  // Trigger re-obfuscation on sets or options update
  useEffect(() => {
    handleRunObfuscation();
  }, [sets, options]);

  // Synchronize active set inputs into de-obfuscation tab for easy testing
  const populateDeobfuscationFromCurrent = () => {
    const currentSet = obfuscationResult.sets[activeSetIndex] || obfuscationResult.sets[0];
    setDeobfScriptInput(currentSet.obfuscatedScript);
    setDeobfHtmlInput(currentSet.obfuscatedHtml);
    setDeobfMappingInput(JSON.stringify(obfuscationResult.mapping, null, 2));
    showStatus(`Loaded Set ${activeSetIndex + 1} obfuscated code & mapping into De-Obfuscator!`);
  };

  // Execute De-Obfuscation
  const handleExecuteDeobfuscation = () => {
    try {
      let mappingToUse: MultiObfuscationMapping = obfuscationResult.mapping;
      if (deobfMappingInput.trim()) {
        try {
          mappingToUse = JSON.parse(deobfMappingInput);
        } catch (e) {
          showStatus('Invalid JSON in mapping input. Using active session mapping.');
        }
      }

      const scriptRestored = deobfuscateCode(deobfScriptInput, mappingToUse);
      const htmlRestored = deobfuscateCode(deobfHtmlInput, mappingToUse);

      setRestoredScript(scriptRestored);
      setRestoredHtml(htmlRestored);
      showStatus('De-obfuscation completed successfully!');
    } catch (err: any) {
      showStatus(`De-obfuscation error: ${err?.message || 'Check mapping structure'}`);
    }
  };

  // Update specific set input
  const updateCurrentSet = (field: 'scriptCode' | 'htmlCode' | 'scriptLanguage' | 'name', value: string) => {
    setSets((prev) => {
      const next = [...prev];
      next[activeSetIndex] = {
        ...next[activeSetIndex],
        [field]: value,
      };
      return next;
    });
  };

  // Load a preset
  const handleLoadPreset = (presetId: string) => {
    const preset = MULTI_OBFUSCATOR_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setSets(preset.sets);
      setActiveSetIndex(0);
      showStatus(`Loaded preset: "${preset.name}"`);
    }
  };

  // Export ZIP containing both sets + mapping JSON
  const handleExportZip = async () => {
    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      // Add Set 1
      const set1 = obfuscationResult.sets[0];
      const ext1 = sets[0].scriptLanguage === 'typescript' ? 'ts' : 'js';
      zip.file(`set1_catalog_script.${ext1}`, set1.obfuscatedScript);
      zip.file('set1_catalog_markup.html', set1.obfuscatedHtml);

      // Add Set 2
      const set2 = obfuscationResult.sets[1];
      const ext2 = sets[1].scriptLanguage === 'typescript' ? 'ts' : 'js';
      zip.file(`set2_checkout_script.${ext2}`, set2.obfuscatedScript);
      zip.file('set2_checkout_markup.html', set2.obfuscatedHtml);

      // Add mapping JSON
      zip.file('obfuscation_mapping.json', JSON.stringify(obfuscationResult.mapping, null, 2));

      // Add README
      zip.file(
        'README.txt',
        `Multiple JS/TS & HTML Obfuscator Export\n` +
          `Generated: ${new Date().toISOString()}\n` +
          `Sets: 2 (JS/TS + HTML)\n` +
          `Total Identifiers Mangled: ${obfuscationResult.stats.totalIdentifiersMangled}\n` +
          `Total HTML IDs Mangled: ${obfuscationResult.stats.totalIdsMangled}\n` +
          `Total CSS Classes Mangled: ${obfuscationResult.stats.totalClassesMangled}\n` +
          `Total Strings Obfuscated: ${obfuscationResult.stats.totalStringsObfuscated}\n` +
          `To restore original code, use the included obfuscation_mapping.json in DevHub De-Obfuscator.\n`
      );

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `obfuscated_sets_${Date.now()}.zip`;
      link.click();
      URL.revokeObjectURL(url);
      showStatus('Downloaded 2-Set Obfuscated Bundle (ZIP)!');
    } catch (err: any) {
      showStatus(`Export failed: ${err.message}`);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Download Single File
  const handleDownloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Add Custom Exclusion
  const handleAddExclusion = (e: React.FormEvent) => {
    e.preventDefault();
    const tag = newExclusionTag.trim();
    if (tag && !options.customExclusions.includes(tag)) {
      setOptions({
        ...options,
        customExclusions: [...options.customExclusions, tag],
      });
      setNewExclusionTag('');
      showStatus(`Added exclusion: ${tag}`);
    }
  };

  // Remove Custom Exclusion
  const handleRemoveExclusion = (tag: string) => {
    setOptions({
      ...options,
      customExclusions: options.customExclusions.filter((t) => t !== tag),
    });
  };

  const currentSetInput = sets[activeSetIndex] || sets[0];
  const currentSetOutput = obfuscationResult.sets[activeSetIndex] || obfuscationResult.sets[0];

  // Filtered mapping items for Mapping Table
  const filteredMappingItems = useMemo(() => {
    const mapping = obfuscationResult.mapping;
    const query = mappingSearch.toLowerCase().trim();
    const rows: { category: string; original: string; obfuscated: string }[] = [];

    if (mappingCategory === 'all' || mappingCategory === 'identifiers') {
      Object.entries(mapping.identifiers).forEach(([orig, obf]) => {
        const obfStr = String(obf);
        if (!query || orig.toLowerCase().includes(query) || obfStr.toLowerCase().includes(query)) {
          rows.push({ category: 'Identifier / Function', original: orig, obfuscated: obfStr });
        }
      });
    }

    if (mappingCategory === 'all' || mappingCategory === 'htmlIds') {
      Object.entries(mapping.htmlIds).forEach(([orig, obf]) => {
        const obfStr = String(obf);
        if (!query || orig.toLowerCase().includes(query) || obfStr.toLowerCase().includes(query)) {
          rows.push({ category: 'HTML ID', original: `#${orig}`, obfuscated: `#${obfStr}` });
        }
      });
    }

    if (mappingCategory === 'all' || mappingCategory === 'htmlClasses') {
      Object.entries(mapping.htmlClasses).forEach(([orig, obf]) => {
        const obfStr = String(obf);
        if (!query || orig.toLowerCase().includes(query) || obfStr.toLowerCase().includes(query)) {
          rows.push({ category: 'CSS Class', original: `.${orig}`, obfuscated: `.${obfStr}` });
        }
      });
    }

    if (mappingCategory === 'all' || mappingCategory === 'strings') {
      Object.entries(mapping.strings).forEach(([orig, obf]) => {
        const obfStr = String(obf);
        if (!query || orig.toLowerCase().includes(query) || obfStr.toLowerCase().includes(query)) {
          rows.push({ category: 'String Literal', original: `"${orig}"`, obfuscated: `"${obfStr}"` });
        }
      });
    }

    if (mappingCategory === 'all' || mappingCategory === 'htmlText') {
      Object.entries(mapping.htmlText).forEach(([orig, obf]) => {
        const obfStr = String(obf);
        if (!query || orig.toLowerCase().includes(query) || obfStr.toLowerCase().includes(query)) {
          rows.push({ category: 'HTML Text Content', original: orig, obfuscated: obfStr });
        }
      });
    }

    return rows;
  }, [obfuscationResult.mapping, mappingCategory, mappingSearch]);

  // Combined HTML + JS preview payload
  const combinedLivePreview = useMemo(() => {
    const set1 = obfuscationResult.sets[0];
    const set2 = obfuscationResult.sets[1];
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; background: #0f172a; color: #f8fafc; margin: 0; }
    .catalog-container, .store-wrapper, .dashboard-wrapper, .kanban-wrapper { background: #1e293b; padding: 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid #334155; }
    .product-card, .kpi-card, .task-card, .toast-alert-card { background: #0f172a; padding: 14px; border-radius: 8px; margin: 10px 0; border: 1px solid #334155; }
    .btn-primary, .action-primary, .checkout-action-btn { background: #4f46e5; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .btn-primary:hover { background: #4338ca; }
    .summary-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dashed #334155; }
    .total-highlight { font-weight: bold; font-size: 1.1em; color: #818cf8; border-top: 1px solid #4f46e5; margin-top: 6px; }
    .status-banner { padding: 10px; border-radius: 6px; background: #1e1b4b; color: #a5b4fc; margin-bottom: 12px; }
    select, input { background: #0f172a; border: 1px solid #475569; color: white; padding: 8px; border-radius: 6px; }
  </style>
</head>
<body>
  <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; font-weight: bold;">[Live Sandboxed Preview of Combined Obfuscated Code Sets]</div>
  ${set1?.obfuscatedHtml || ''}
  ${set2?.obfuscatedHtml || ''}

  <script>
    try {
      ${set1?.obfuscatedScript || ''}
      ${set2?.obfuscatedScript || ''}
    } catch(err) {
      console.error('Sandboxed preview script error:', err);
    }
  </script>
</body>
</html>`;
  }, [obfuscationResult]);

  return (
    <div className="space-y-5">
      {/* Toast Banner */}
      {statusMessage && (
        <div className="bg-indigo-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-indigo-200 hover:text-white font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Main Tab Bar & Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('obfuscate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'obfuscate'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Obfuscate (2 Sets)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('deobfuscate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'deobfuscate'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>De-Obfuscate</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mapping')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'mapping'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Mapping Table</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'preview'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Live Sandbox</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Rules & Styles</span>
          </button>
        </div>

        {/* Global Export & Presets Action Bar */}
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">Preset:</span>
            <select
              onChange={(e) => handleLoadPreset(e.target.value)}
              defaultValue={MULTI_OBFUSCATOR_PRESETS[0].id}
              className="bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold px-2 py-0.5 rounded-lg border border-slate-300 dark:border-slate-600 focus:ring-1 focus:ring-indigo-500"
            >
              {MULTI_OBFUSCATOR_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Export ZIP Bundle */}
          <button
            type="button"
            onClick={handleExportZip}
            disabled={isExportingZip}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            title="Download complete ZIP containing both sets of obfuscated JS/TS, HTML, and JSON mapping"
          >
            <FolderArchive className="w-3.5 h-3.5" />
            <span>{isExportingZip ? 'Packaging...' : 'Export ZIP (2 Sets + Map)'}</span>
          </button>
        </div>
      </div>

      {/* Stats KPI Overview Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Identifiers Mangled</span>
          <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">
            {obfuscationResult.stats.totalIdentifiersMangled}
          </span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">HTML IDs & Classes</span>
          <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {obfuscationResult.stats.totalIdsMangled + obfuscationResult.stats.totalClassesMangled}
          </span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Strings & Text Nodes</span>
          <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">
            {obfuscationResult.stats.totalStringsObfuscated + obfuscationResult.stats.totalHtmlTextNodesObfuscated}
          </span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Naming Style</span>
          <span className="text-xs font-bold uppercase font-mono text-purple-600 dark:text-purple-400 mt-1 block">
            {options.namingStyle}
          </span>
        </div>
        <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">Size Comparison</span>
          <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 mt-1 block">
            {Math.round(obfuscationResult.stats.totalOriginalSize / 1024 * 10) / 10}KB &rarr;{' '}
            {Math.round(obfuscationResult.stats.totalObfuscatedSize / 1024 * 10) / 10}KB
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OBFUSCATION VIEW (2 SETS) */}
      {/* ========================================================================= */}
      {activeTab === 'obfuscate' && (
        <div className="space-y-4">
          {/* Set Switcher & Layout Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl p-3">
            {/* 2 Sets Switcher Tabs */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveSetIndex(0)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  activeSetIndex === 0
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Set 1: {sets[0].name.split(':')[1] || 'Product Catalog'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/20 font-mono uppercase">
                  {sets[0].scriptLanguage} + HTML
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveSetIndex(1)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                  activeSetIndex === 1
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>Set 2: {sets[1].name.split(':')[1] || 'Cart & Checkout'}</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-black/20 font-mono uppercase">
                  {sets[1].scriptLanguage} + HTML
                </span>
              </button>
            </div>

            {/* View Layout Controls & Action Buttons */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setViewLayout('split')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    viewLayout === 'split' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  Split View
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('source')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    viewLayout === 'source' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  Original Only
                </button>
                <button
                  type="button"
                  onClick={() => setViewLayout('obfuscated')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    viewLayout === 'obfuscated' ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold' : 'text-slate-500'
                  }`}
                >
                  Obfuscated Only
                </button>
              </div>

              <button
                type="button"
                onClick={populateDeobfuscationFromCurrent}
                className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-indigo-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                title="Send current obfuscated output into the De-Obfuscator tab"
              >
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-500" />
                <span>Test De-Obfuscate</span>
              </button>
            </div>
          </div>

          {/* Editors Grid for Active Set */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT / TOP: SCRIPT (TS/JS) SECTION */}
            <div className="space-y-4">
              {/* Original JS/TS */}
              {(viewLayout === 'split' || viewLayout === 'source') && (
                <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Code2 className="w-4 h-4 text-indigo-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Original Script ({currentSetInput.scriptLanguage.toUpperCase()})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={currentSetInput.scriptLanguage}
                        onChange={(e) => updateCurrentSet('scriptLanguage', e.target.value as any)}
                        className="bg-white dark:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700"
                      >
                        <option value="typescript">TypeScript</option>
                        <option value="javascript">JavaScript</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentSetInput.scriptCode, `orig-script-${activeSetIndex}`)}
                        className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                        title="Copy original script"
                      >
                        {copiedKey === `orig-script-${activeSetIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={currentSetInput.scriptCode}
                    onChange={(e) => updateCurrentSet('scriptCode', e.target.value)}
                    rows={12}
                    className="w-full p-3.5 text-xs font-mono bg-slate-900 text-slate-100 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter JavaScript / TypeScript source code here..."
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Obfuscated JS/TS Output */}
              {(viewLayout === 'split' || viewLayout === 'obfuscated') && (
                <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50/70 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900/50">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                        Obfuscated Script ({currentSetOutput.obfuscatedScriptSize} chars)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadFile(
                            currentSetOutput.obfuscatedScript,
                            `set${activeSetIndex + 1}_obfuscated.${currentSetInput.scriptLanguage === 'typescript' ? 'ts' : 'js'}`
                          )
                        }
                        className="px-2 py-0.5 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentSetOutput.obfuscatedScript, `obf-script-${activeSetIndex}`)}
                        className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded"
                        title="Copy obfuscated script"
                      >
                        {copiedKey === `obf-script-${activeSetIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={currentSetOutput.obfuscatedScript}
                    rows={12}
                    className="w-full p-3.5 text-xs font-mono bg-[#0B1120] text-emerald-300 resize-y focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>

            {/* RIGHT / BOTTOM: HTML MARKUP SECTION */}
            <div className="space-y-4">
              {/* Original HTML */}
              {(viewLayout === 'split' || viewLayout === 'source') && (
                <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        Original HTML Markup ({currentSetInput.htmlCode.length} chars)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(currentSetInput.htmlCode, `orig-html-${activeSetIndex}`)}
                      className="p-1 text-slate-500 hover:text-indigo-600 rounded"
                      title="Copy original HTML"
                    >
                      {copiedKey === `orig-html-${activeSetIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <textarea
                    value={currentSetInput.htmlCode}
                    onChange={(e) => updateCurrentSet('htmlCode', e.target.value)}
                    rows={12}
                    className="w-full p-3.5 text-xs font-mono bg-slate-900 text-slate-100 resize-y focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter HTML markup here..."
                    spellCheck={false}
                  />
                </div>
              )}

              {/* Obfuscated HTML Output */}
              {(viewLayout === 'split' || viewLayout === 'obfuscated') && (
                <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50/70 dark:bg-emerald-950/40 border-b border-emerald-100 dark:border-emerald-900/50">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Obfuscated HTML ({currentSetOutput.obfuscatedHtmlSize} chars)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadFile(currentSetOutput.obfuscatedHtml, `set${activeSetIndex + 1}_obfuscated.html`, 'text/html')
                        }
                        className="px-2 py-0.5 text-[11px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(currentSetOutput.obfuscatedHtml, `obf-html-${activeSetIndex}`)}
                        className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded"
                        title="Copy obfuscated HTML"
                      >
                        {copiedKey === `obf-html-${activeSetIndex}` ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={currentSetOutput.obfuscatedHtml}
                    rows={12}
                    className="w-full p-3.5 text-xs font-mono bg-[#0B1120] text-cyan-300 resize-y focus:outline-none"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DE-OBFUSCATION PANEL */}
      {/* ========================================================================= */}
      {activeTab === 'deobfuscate' && (
        <div className="space-y-4">
          <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 rounded-2xl p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-indigo-950 dark:text-indigo-100">
                    Lossless De-Obfuscator Engine
                  </h3>
                  <p className="text-xs text-indigo-800/80 dark:text-indigo-300/80 mt-0.5">
                    Paste obfuscated JS/TS or HTML along with your exported obfuscation mapping JSON to restore 100% of the original variable names, classes, IDs, and text strings.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={populateDeobfuscationFromCurrent}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Load Active Session Data</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Input 1: Obfuscated Script */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">1. Obfuscated Script</span>
                <span className="text-[10px] text-slate-500 font-mono">JS/TS</span>
              </div>
              <textarea
                value={deobfScriptInput}
                onChange={(e) => setDeobfScriptInput(e.target.value)}
                rows={10}
                placeholder="Paste obfuscated JS/TS here..."
                className="w-full p-3 text-xs font-mono bg-slate-900 text-emerald-300 resize-y flex-1 focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* Input 2: Obfuscated HTML */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">2. Obfuscated HTML</span>
                <span className="text-[10px] text-slate-500 font-mono">HTML</span>
              </div>
              <textarea
                value={deobfHtmlInput}
                onChange={(e) => setDeobfHtmlInput(e.target.value)}
                rows={10}
                placeholder="Paste obfuscated HTML here..."
                className="w-full p-3 text-xs font-mono bg-slate-900 text-cyan-300 resize-y flex-1 focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* Input 3: Mapping JSON */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col">
              <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">3. Mapping JSON</span>
                <span className="text-[10px] text-indigo-500 font-mono font-bold">REQUIRED</span>
              </div>
              <textarea
                value={deobfMappingInput}
                onChange={(e) => setDeobfMappingInput(e.target.value)}
                rows={10}
                placeholder='Paste {"identifiers": {...}, "reverseMapping": {...}} or leave blank to use active session mapping...'
                className="w-full p-3 text-xs font-mono bg-slate-900 text-amber-200 resize-y flex-1 focus:outline-none"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={handleExecuteDeobfuscation}
              className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>De-Obfuscate & Restore Original Code</span>
            </button>
          </div>

          {/* Restored Outputs */}
          {(restoredScript || restoredHtml) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Restored Script</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(restoredScript, 'restored-script')}
                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded"
                    title="Copy restored script"
                  >
                    {copiedKey === 'restored-script' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={restoredScript}
                  rows={12}
                  className="w-full p-3.5 text-xs font-mono bg-slate-900 text-slate-100 resize-y focus:outline-none"
                  spellCheck={false}
                />
              </div>

              <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/50">
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Restored HTML</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(restoredHtml, 'restored-html')}
                    className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded"
                    title="Copy restored HTML"
                  >
                    {copiedKey === 'restored-html' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={restoredHtml}
                  rows={12}
                  className="w-full p-3.5 text-xs font-mono bg-slate-900 text-slate-100 resize-y focus:outline-none"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MAPPING TABLE EXPLORER */}
      {/* ========================================================================= */}
      {activeTab === 'mapping' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-xs">
            {/* Category Filter */}
            <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              {(['all', 'identifiers', 'htmlIds', 'htmlClasses', 'strings', 'htmlText'] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setMappingCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize ${
                    mappingCategory === cat
                      ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  {cat === 'all'
                    ? 'All Tokens'
                    : cat === 'htmlIds'
                    ? 'HTML IDs'
                    : cat === 'htmlClasses'
                    ? 'CSS Classes'
                    : cat === 'htmlText'
                    ? 'HTML Text'
                    : cat}
                </button>
              ))}
            </div>

            {/* Search Input & JSON Export */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={mappingSearch}
                  onChange={(e) => setMappingSearch(e.target.value)}
                  placeholder="Search token mapping..."
                  className="pl-8 pr-3 py-1 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-indigo-500 w-44 sm:w-60"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  handleDownloadFile(
                    JSON.stringify(obfuscationResult.mapping, null, 2),
                    'obfuscation_mapping.json',
                    'application/json'
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-200 dark:border-slate-700"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export JSON</span>
              </button>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(obfuscationResult.mapping, null, 2), 'full-mapping-json')}
                className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-indigo-600 rounded-lg"
                title="Copy mapping JSON"
              >
                {copiedKey === 'full-mapping-json' ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mapping Table */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <tr>
                    <th className="p-3 w-40">Category</th>
                    <th className="p-3">Original Symbol / Text</th>
                    <th className="p-3 w-8 text-center">&rarr;</th>
                    <th className="p-3 font-mono">Obfuscated Token</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                  {filteredMappingItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500 font-sans">
                        No mapping symbols found matching filter.
                      </td>
                    </tr>
                  ) : (
                    filteredMappingItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="p-3 font-sans text-slate-500 dark:text-slate-400 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-800 dark:text-slate-200 font-semibold max-w-md truncate">
                          {item.original}
                        </td>
                        <td className="p-3 text-center text-slate-400">&rarr;</td>
                        <td className="p-3 text-indigo-600 dark:text-indigo-400 font-bold">
                          {item.obfuscated}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LIVE SANDBOX PREVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-500" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Sandboxed Browser Execution (Combined Obfuscated Set 1 + Set 2)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Isolated sandbox iframe
              </span>
            </div>
            <div className="p-4 bg-slate-950">
              <iframe
                title="Sandboxed Obfuscated Output"
                srcDoc={combinedLivePreview}
                className="w-full h-96 border border-slate-800 rounded-xl bg-slate-900 shadow-inner"
                sandbox="allow-scripts"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: RULES, NAMING STYLES & EXCLUSIONS */}
      {/* ========================================================================= */}
      {activeTab === 'settings' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Naming Style Selection */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-500" />
                <span>Token Naming Style</span>
              </h3>

              <div className="space-y-2">
                {[
                  { id: 'hex', label: 'Hexadecimal (_0x4a1f)', desc: 'Standard production JS obfuscation style' },
                  { id: 'alphabetical', label: 'Minimal Alphabetical (v_a, fn_b)', desc: 'Compact shortest identifier format' },
                  { id: 'mangled_latin', label: 'Confusing Latin (_0xI1l, _0xOo0)', desc: 'Maximally confusing visual homoglyphs' },
                  { id: 'base58', label: 'Base58 Alphanumeric (_v9Kz2)', desc: 'High-entropy compact hash identifiers' },
                  { id: 'prefixed', label: 'Structured Prefix (_v_1, _fn_1)', desc: 'Clean debuggable obfuscation structure' },
                ].map((style) => (
                  <label
                    key={style.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      options.namingStyle === style.id
                        ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="namingStyle"
                      value={style.id}
                      checked={options.namingStyle === style.id}
                      onChange={(e) => setOptions({ ...options, namingStyle: e.target.value as NamingStyle })}
                      className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">{style.label}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{style.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Toggle Options */}
            <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>Obfuscation Target Elements</span>
              </h3>

              <div className="space-y-2.5">
                {[
                  { key: 'obfuscateVariables', label: 'Obfuscate Variables & Parameters' },
                  { key: 'obfuscateFunctions', label: 'Obfuscate Functions & Event Handlers' },
                  { key: 'obfuscateClassesAndInterfaces', label: 'Obfuscate Classes, Interfaces & Types' },
                  { key: 'obfuscateHtmlIds', label: 'Obfuscate HTML IDs (synchronized with JS/TS)' },
                  { key: 'obfuscateHtmlClasses', label: 'Obfuscate CSS Classes (synchronized with JS/TS)' },
                  { key: 'obfuscateStrings', label: 'Obfuscate String Literals' },
                  { key: 'obfuscateHtmlText', label: 'Obfuscate HTML Text Content' },
                  { key: 'stripComments', label: 'Strip All Code Comments' },
                  { key: 'compactWhitespace', label: 'Minify / Compact Whitespace' },
                  { key: 'injectDeadCode', label: 'Inject Anti-Tamper & Dead Code Checkers' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={(options as any)[key]}
                      onChange={(e) => setOptions({ ...options, [key]: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Exclusions / Whitelist Manager */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Preserved Globals & Custom Exclusions Whitelist
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Identifiers, IDs, or classes listed here will never be mangled to preserve third-party framework interop.
                </p>
              </div>
            </div>

            {/* Add Exclusion Form */}
            <form onSubmit={handleAddExclusion} className="flex items-center gap-2">
              <input
                type="text"
                value={newExclusionTag}
                onChange={(e) => setNewExclusionTag(e.target.value)}
                placeholder="e.g. myGlobalApiKey, customElementId..."
                className="px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-indigo-500 flex-1"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                Add Exclusion
              </button>
            </form>

            {/* Exclusions Pill List */}
            <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800">
              {options.customExclusions.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-[11px] font-mono font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExclusion(tag)}
                    className="text-slate-400 hover:text-rose-500 font-bold"
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
