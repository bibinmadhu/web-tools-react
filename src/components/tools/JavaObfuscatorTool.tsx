import React, { useState, useEffect } from 'react';
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
  HelpCircle,
  Sparkles,
  Trash2,
  Plus
} from 'lucide-react';
import {
  obfuscateJavaCode,
  deobfuscateJavaCode,
  JavaObfuscationMapping,
  ObfuscatorOptions,
  DEFAULT_EXCLUDED_PACKAGES
} from '../../utils/javaObfuscator';
import { JAVA_PRESETS, JavaPreset } from '../../utils/javaPresets';

export const JavaObfuscatorTool: React.FC = () => {
  const [mode, setMode] = useState<'obfuscate' | 'deobfuscate' | 'mapping' | 'settings'>('obfuscate');

  // Code states
  const [sourceCode, setSourceCode] = useState<string>(JAVA_PRESETS[0].code);
  const [obfuscatedCode, setObfuscatedCode] = useState<string>('');
  const [deobfuscatedCode, setDeobfuscatedCode] = useState<string>('');

  // Mapping state
  const [mapping, setMapping] = useState<JavaObfuscationMapping>({
    classes: {},
    variables: {},
    methods: {},
    packages: {},
    reverseMapping: {},
  });

  const [mappingJsonInput, setMappingJsonInput] = useState<string>('');
  const [mappingSearchQuery, setMappingSearchQuery] = useState<string>('');

  // Configuration options
  const [options, setOptions] = useState<ObfuscatorOptions>({
    namingStyle: 'alphabetical',
    customClassPrefix: 'Cls',
    customVarPrefix: 'v',
    customMethodPrefix: 'mth',
    obfuscateClasses: true,
    obfuscateVariables: true,
    obfuscateMethods: true,
    obfuscatePackages: true,
    encryptStrings: false,
    stripComments: true,
    preserveMain: true,
    preserveGettersSetters: true,
    preserveAnnotated: true,
    excludedPackages: [...DEFAULT_EXCLUDED_PACKAGES],
    customExclusions: ['toString', 'equals', 'hashCode'],
  });

  // UI feedback states
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedMapping, setCopiedMapping] = useState(false);
  const [copiedDeobfuscated, setCopiedDeobfuscated] = useState(false);
  const [stats, setStats] = useState({
    originalSize: 0,
    obfuscatedSize: 0,
    classesRenamed: 0,
    variablesRenamed: 0,
    methodsRenamed: 0,
    packagesRenamed: 0,
  });

  // Package exclusion input
  const [newPkgInput, setNewPkgInput] = useState('');
  const [newExclusionInput, setNewExclusionInput] = useState('');

  // Execute Obfuscation whenever sourceCode or options change
  const handleRunObfuscation = () => {
    const res = obfuscateJavaCode(sourceCode, options);
    setObfuscatedCode(res.obfuscatedCode);
    setMapping(res.mapping);
    setStats(res.stats);
    setMappingJsonInput(JSON.stringify(res.mapping, null, 2));
  };

  useEffect(() => {
    if (mode === 'obfuscate') {
      handleRunObfuscation();
    }
  }, [sourceCode, options, mode]);

  // Execute De-obfuscation
  const handleRunDeobfuscation = () => {
    try {
      let mapToUse = mapping;
      if (mappingJsonInput.trim()) {
        try {
          mapToUse = JSON.parse(mappingJsonInput);
        } catch (e) {
          // fallback to current mapping state
        }
      }
      const restored = deobfuscateJavaCode(sourceCode, mapToUse);
      setDeobfuscatedCode(restored);
    } catch (err) {
      setDeobfuscatedCode('// Error during de-obfuscation: Check mapping JSON format');
    }
  };

  useEffect(() => {
    if (mode === 'deobfuscate') {
      handleRunDeobfuscation();
    }
  }, [sourceCode, mappingJsonInput, mode]);

  // Preset Selection
  const handleSelectPreset = (preset: JavaPreset) => {
    setSourceCode(preset.code);
    if (preset.sampleMapping) {
      setMappingJsonInput(JSON.stringify(preset.sampleMapping, null, 2));
    }
    if (preset.category === 'stacktrace') {
      setMode('deobfuscate');
    } else {
      setMode('obfuscate');
    }
  };

  // Clipboard copies
  const copyToClipboard = (text: string, setCopiedFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopiedFn(true);
    setTimeout(() => setCopiedFn(false), 2000);
  };

  // File download
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle Mapping File Upload
  const handleMappingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setMapping(parsed);
        setMappingJsonInput(JSON.stringify(parsed, null, 2));
      } catch (err) {
        alert('Invalid mapping JSON file');
      }
    };
    reader.readAsText(file);
  };

  // Add Excluded Package
  const handleAddPkg = () => {
    if (!newPkgInput.trim()) return;
    const formatted = newPkgInput.trim().endsWith('.') ? newPkgInput.trim() : newPkgInput.trim() + '.';
    if (!options.excludedPackages.includes(formatted)) {
      setOptions({
        ...options,
        excludedPackages: [...options.excludedPackages, formatted],
      });
    }
    setNewPkgInput('');
  };

  // Remove Excluded Package
  const handleRemovePkg = (pkg: string) => {
    setOptions({
      ...options,
      excludedPackages: options.excludedPackages.filter((p) => p !== pkg),
    });
  };

  // Add Custom Exclusion Word
  const handleAddCustomExclusion = () => {
    if (!newExclusionInput.trim()) return;
    const word = newExclusionInput.trim();
    if (!options.customExclusions.includes(word)) {
      setOptions({
        ...options,
        customExclusions: [...options.customExclusions, word],
      });
    }
    setNewExclusionInput('');
  };

  // Remove Custom Exclusion Word
  const handleRemoveCustomExclusion = (word: string) => {
    setOptions({
      ...options,
      customExclusions: options.customExclusions.filter((w) => w !== word),
    });
  };

  // Filter Mapping Entries for Table View
  const getFilteredMappingEntries = () => {
    const all: { category: string; original: string; obfuscated: string }[] = [];
    Object.entries(mapping.classes || {}).forEach(([orig, obf]) => all.push({ category: 'Class', original: orig, obfuscated: String(obf) }));
    Object.entries(mapping.methods || {}).forEach(([orig, obf]) => all.push({ category: 'Method', original: orig, obfuscated: String(obf) }));
    Object.entries(mapping.variables || {}).forEach(([orig, obf]) => all.push({ category: 'Variable', original: orig, obfuscated: String(obf) }));
    Object.entries(mapping.packages || {}).forEach(([orig, obf]) => all.push({ category: 'Package', original: orig, obfuscated: String(obf) }));

    if (!mappingSearchQuery.trim()) return all;
    const q = mappingSearchQuery.toLowerCase();
    return all.filter(
      (item) =>
        item.original.toLowerCase().includes(q) ||
        item.obfuscated.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  };

  const filteredMappings = getFilteredMappingEntries();

  return (
    <div className="space-y-6">
      {/* Top Banner / Preset Bar */}
      <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Java Code Obfuscator & De-Obfuscator
              <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-mono px-2 py-0.5 rounded border border-indigo-500/30">
                Security Suite
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Rename Java classes, methods, fields, and packages while preserving framework rules and keeping detailed mapping.
            </p>
          </div>
        </div>

        {/* Preset Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400 hidden sm:inline">Presets:</span>
          <div className="flex flex-wrap gap-1.5">
            {JAVA_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
                title={preset.description}
              >
                {preset.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-2">
        <div className="flex items-center gap-2 bg-[#0F172A] p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode('obfuscate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'obfuscate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Obfuscate Code</span>
          </button>

          <button
            onClick={() => {
              setMode('deobfuscate');
              handleRunDeobfuscation();
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'deobfuscate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>De-obfuscate</span>
          </button>

          <button
            onClick={() => setMode('mapping')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'mapping'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mapping Table ({filteredMappings.length})</span>
          </button>

          <button
            onClick={() => setMode('settings')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Configurations</span>
          </button>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2">
          {mode === 'obfuscate' && (
            <>
              <button
                onClick={() => copyToClipboard(obfuscatedCode, setCopiedCode)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Obfuscated'}</span>
              </button>

              <button
                onClick={() => downloadFile(obfuscatedCode, 'ObfuscatedCode.java', 'text/x-java-source')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>Export Java</span>
              </button>

              <button
                onClick={() => copyToClipboard(JSON.stringify(mapping, null, 2), setCopiedMapping)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition-colors"
              >
                {copiedMapping ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileJson className="w-3.5 h-3.5 text-indigo-400" />}
                <span>{copiedMapping ? 'Copied Mapping!' : 'Copy Mapping JSON'}</span>
              </button>
            </>
          )}

          {mode === 'deobfuscate' && (
            <button
              onClick={() => copyToClipboard(deobfuscatedCode, setCopiedDeobfuscated)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-medium border border-emerald-500/30 transition-colors"
            >
              {copiedDeobfuscated ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{copiedDeobfuscated ? 'Copied!' : 'Copy De-obfuscated'}</span>
            </button>
          )}
        </div>
      </div>

      {/* MODE 1: OBFUSCATE CODE VIEW */}
      {mode === 'obfuscate' && (
        <div className="space-y-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="bg-[#0F172A] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">CLASSES RENAMED</span>
              <span className="font-bold text-indigo-400">{stats.classesRenamed}</span>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">METHODS RENAMED</span>
              <span className="font-bold text-indigo-400">{stats.methodsRenamed}</span>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">VARIABLES RENAMED</span>
              <span className="font-bold text-indigo-400">{stats.variablesRenamed}</span>
            </div>
            <div className="bg-[#0F172A] border border-slate-800 p-3 rounded-xl flex items-center justify-between">
              <span className="text-slate-400">PACKAGES RENAMED</span>
              <span className="font-bold text-indigo-400">{stats.packagesRenamed}</span>
            </div>
          </div>

          {/* Editors Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Original Input */}
            <div className="flex flex-col bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-400" /> Original Java Code
                </span>
                <span className="text-slate-500">{stats.originalSize} Bytes</span>
              </div>
              <textarea
                value={sourceCode}
                onChange={(e) => setSourceCode(e.target.value)}
                placeholder="Paste original Java code here..."
                rows={18}
                className="w-full bg-[#0B0F1A] p-4 text-slate-200 font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>

            {/* Obfuscated Output */}
            <div className="flex flex-col bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
                <span className="text-indigo-400 font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-400" /> Obfuscated Java Code
                </span>
                <span className="text-emerald-400">{stats.obfuscatedSize} Bytes</span>
              </div>
              <textarea
                value={obfuscatedCode}
                readOnly
                placeholder="Obfuscated output will appear here..."
                rows={18}
                className="w-full bg-[#0B0F1A] p-4 text-emerald-300 font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: DE-OBFUSCATE CODE VIEW */}
      {mode === 'deobfuscate' && (
        <div className="space-y-4">
          <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 text-xs text-indigo-200 flex items-start gap-3">
            <Zap className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-sm text-indigo-300 mb-1">De-Obfuscation Engine</span>
              Paste obfuscated Java code, stack traces, or test outputs below. Provide the mapping JSON (or use the current active session mapping) to restore original class, method, variable, and package names.
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Obfuscated Code & Mapping JSON */}
            <div className="space-y-4">
              <div className="flex flex-col bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
                  <span className="text-slate-300 font-semibold flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" /> Obfuscated Code / Stack Trace
                  </span>
                </div>
                <textarea
                  value={sourceCode}
                  onChange={(e) => {
                    setSourceCode(e.target.value);
                  }}
                  placeholder="Paste obfuscated Java code or stack trace here..."
                  rows={10}
                  className="w-full bg-[#0B0F1A] p-4 text-slate-200 font-mono text-xs focus:outline-none resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <div className="flex flex-col bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
                  <span className="text-indigo-300 font-semibold flex items-center gap-2">
                    <FileJson className="w-4 h-4 text-indigo-400" /> Mapping Dictionary JSON
                  </span>
                  <label className="cursor-pointer text-indigo-400 hover:text-indigo-300 flex items-center gap-1 text-[11px]">
                    <Upload className="w-3.5 h-3.5" /> Import JSON
                    <input type="file" accept=".json" onChange={handleMappingFileUpload} className="hidden" />
                  </label>
                </div>
                <textarea
                  value={mappingJsonInput}
                  onChange={(e) => setMappingJsonInput(e.target.value)}
                  placeholder="Paste mapping JSON object here..."
                  rows={7}
                  className="w-full bg-[#0B0F1A] p-4 text-indigo-200 font-mono text-xs focus:outline-none resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              <button
                onClick={handleRunDeobfuscation}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <RotateCcw className="w-4 h-4" /> Run De-obfuscation
              </button>
            </div>

            {/* Restored Output */}
            <div className="flex flex-col bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/80 border-b border-slate-800 text-xs font-mono">
                <span className="text-emerald-400 font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" /> Restored Source Code
                </span>
              </div>
              <textarea
                value={deobfuscatedCode}
                readOnly
                placeholder="De-obfuscated code will appear here..."
                rows={21}
                className="w-full bg-[#0B0F1A] p-4 text-slate-100 font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: MAPPING TABLE VIEW */}
      {mode === 'mapping' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0F172A] p-4 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mappingSearchQuery}
                onChange={(e) => setMappingSearchQuery(e.target.value)}
                placeholder="Search mapping by original or obfuscated identifier..."
                className="w-full bg-[#0B0F1A] border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(JSON.stringify(mapping, null, 2), 'obfuscation-mapping.json', 'application/json')}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download Mapping JSON
              </button>

              <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer border border-slate-700">
                <Upload className="w-3.5 h-3.5 text-indigo-400" /> Upload Mapping
                <input type="file" accept=".json" onChange={handleMappingFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Mapping Data Table */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="max-h-[500px] overflow-y-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 sticky top-0 uppercase text-[10px]">
                  <tr>
                    <th className="p-3">Category</th>
                    <th className="p-3">Original Identifier</th>
                    <th className="p-3">Obfuscated Identifier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-slate-500 font-sans">
                        No mapping entries found. Run obfuscation or import a mapping JSON file.
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              item.category === 'Class'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : item.category === 'Method'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : item.category === 'Variable'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-slate-200 font-semibold">{item.original}</td>
                        <td className="p-3 text-indigo-400 font-bold">{item.obfuscated}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODE 4: CONFIGURATION SETTINGS VIEW */}
      {mode === 'settings' && (
        <div className="space-y-6">
          {/* Naming Style & Scope Panel */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Obfuscation Naming Strategy & Scopes
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              {/* Naming Style Dropdown */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">Naming Convention Style</label>
                <select
                  value={options.namingStyle}
                  onChange={(e) => setOptions({ ...options, namingStyle: e.target.value as any })}
                  className="w-full bg-[#0B0F1A] border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                >
                  <option value="alphabetical">Alphabetical Sequence (A, B, C... / a, b, c...)</option>
                  <option value="hexadecimal">Hexadecimal Encoded (_0x1, _0x2, _0x3...)</option>
                  <option value="customPrefix">Custom Prefix (Cls_1, var_1, mth_1...)</option>
                  <option value="numeric">Short Numeric (v1, v2, v3...)</option>
                </select>

                {options.namingStyle === 'customPrefix' && (
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Class Prefix</span>
                      <input
                        type="text"
                        value={options.customClassPrefix}
                        onChange={(e) => setOptions({ ...options, customClassPrefix: e.target.value })}
                        className="w-full bg-[#0B0F1A] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Method Prefix</span>
                      <input
                        type="text"
                        value={options.customMethodPrefix}
                        onChange={(e) => setOptions({ ...options, customMethodPrefix: e.target.value })}
                        className="w-full bg-[#0B0F1A] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Var Prefix</span>
                      <input
                        type="text"
                        value={options.customVarPrefix}
                        onChange={(e) => setOptions({ ...options, customVarPrefix: e.target.value })}
                        className="w-full bg-[#0B0F1A] border border-slate-800 rounded p-1.5 text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Target Scopes Toggles */}
              <div className="space-y-3">
                <label className="block text-slate-300 font-semibold">Active Obfuscation Targets</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={options.obfuscateClasses}
                      onChange={(e) => setOptions({ ...options, obfuscateClasses: e.target.checked })}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="text-slate-200 font-medium">Class Names</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={options.obfuscateMethods}
                      onChange={(e) => setOptions({ ...options, obfuscateMethods: e.target.checked })}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="text-slate-200 font-medium">Method Names</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={options.obfuscateVariables}
                      onChange={(e) => setOptions({ ...options, obfuscateVariables: e.target.checked })}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="text-slate-200 font-medium">Variables & Fields</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                    <input
                      type="checkbox"
                      checked={options.obfuscatePackages}
                      onChange={(e) => setOptions({ ...options, obfuscatePackages: e.target.checked })}
                      className="accent-indigo-500 rounded"
                    />
                    <span className="text-slate-200 font-medium">Package Names</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Preservation & Code Transformation Rules */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2 border-b border-slate-800 pb-2">
              <Shield className="w-4 h-4 text-emerald-400" /> Preservation & Safety Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveMain}
                  onChange={(e) => setOptions({ ...options, preserveMain: e.target.checked })}
                  className="accent-indigo-500 rounded"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Preserve main() Entry Point</span>
                  <span className="text-[11px] text-slate-400">Keeps public static void main intact</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveGettersSetters}
                  onChange={(e) => setOptions({ ...options, preserveGettersSetters: e.target.checked })}
                  className="accent-indigo-500 rounded"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Preserve Getters & Setters</span>
                  <span className="text-[11px] text-slate-400">Protects get*, set*, is* methods</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveAnnotated}
                  onChange={(e) => setOptions({ ...options, preserveAnnotated: e.target.checked })}
                  className="accent-indigo-500 rounded"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Preserve Annotated Members</span>
                  <span className="text-[11px] text-slate-400">Protects @Override, @Test, @PostMapping</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.stripComments}
                  onChange={(e) => setOptions({ ...options, stripComments: e.target.checked })}
                  className="accent-indigo-500 rounded"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Strip Comments</span>
                  <span className="text-[11px] text-slate-400">Removes single & multi-line comments</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-900/60 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.encryptStrings}
                  onChange={(e) => setOptions({ ...options, encryptStrings: e.target.checked })}
                  className="accent-indigo-500 rounded"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">String Literal Base64 Encrypt</span>
                  <span className="text-[11px] text-slate-400">Encodes raw string literals dynamically</span>
                </div>
              </label>
            </div>
          </div>

          {/* Package Exclusions Manager */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Framework Package Exclusion Rules</span>
              <span className="text-xs text-slate-400 font-mono font-normal">
                {options.excludedPackages.length} Protected Packages
              </span>
            </h4>

            <div className="flex gap-2">
              <input
                type="text"
                value={newPkgInput}
                onChange={(e) => setNewPkgInput(e.target.value)}
                placeholder="Add package prefix to exclude (e.g. org.hibernate.)"
                className="flex-1 bg-[#0B0F1A] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleAddPkg}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {options.excludedPackages.map((pkg) => (
                <span
                  key={pkg}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-2"
                >
                  {pkg}
                  <button
                    onClick={() => handleRemovePkg(pkg)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Custom Identifier Exclusions Manager */}
          <div className="bg-[#0F172A] border border-slate-800 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center justify-between border-b border-slate-800 pb-2">
              <span>Custom Excluded Identifier Names</span>
              <span className="text-xs text-slate-400 font-mono font-normal">
                {options.customExclusions.length} Custom Words
              </span>
            </h4>

            <div className="flex gap-2">
              <input
                type="text"
                value={newExclusionInput}
                onChange={(e) => setNewExclusionInput(e.target.value)}
                placeholder="Add custom method or variable name to skip (e.g. getId)"
                className="flex-1 bg-[#0B0F1A] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button
                onClick={handleAddCustomExclusion}
                className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {options.customExclusions.map((word) => (
                <span
                  key={word}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono flex items-center gap-2"
                >
                  {word}
                  <button
                    onClick={() => handleRemoveCustomExclusion(word)}
                    className="text-slate-500 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
