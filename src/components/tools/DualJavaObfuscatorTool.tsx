import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
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
  FolderArchive,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Play,
  Share2,
  GitCompare,
  TestTube2,
  HelpCircle,
  Code2,
  WrapText,
  AlignLeft,
  Maximize2,
  Minimize2
} from 'lucide-react';
import JSZip from 'jszip';
import {
  obfuscateDualJavaFiles,
  deobfuscateDualJavaFiles,
  DualJavaFilesInput,
  DualJavaObfuscatorOptions,
  DEFAULT_DUAL_OBFUSCATOR_OPTIONS,
  DualJavaObfuscationResult
} from '../../utils/javaDualObfuscator';
import { JAVA_DUAL_PRESETS, JavaDualPreset } from '../../utils/javaDualPresets';
import { JavaObfuscationMapping, DEFAULT_EXCLUDED_PACKAGES } from '../../utils/javaObfuscator';
import { formatJavaCode } from '../../utils/javaFormatter';

export interface DualJavaObfuscatorToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DualJavaObfuscatorTool: React.FC<DualJavaObfuscatorToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const [activeTab, setActiveTab] = useState<'obfuscate' | 'deobfuscate' | 'mapping' | 'diff' | 'settings'>('obfuscate');
  const [selectedFileTab, setSelectedFileTab] = useState<'both' | 'main' | 'test'>('both');
  const [viewMode, setViewMode] = useState<'split' | 'code'>('split');
  const [wrapLines, setWrapLines] = useState<boolean>(false);

  // Input states
  const [selectedPresetId, setSelectedPresetId] = useState<string>(JAVA_DUAL_PRESETS[0].id);
  const [mainFileName, setMainFileName] = useState<string>(JAVA_DUAL_PRESETS[0].mainFile.fileName);
  const [mainCode, setMainCode] = useState<string>(JAVA_DUAL_PRESETS[0].mainFile.code);
  const [testFileName, setTestFileName] = useState<string>(JAVA_DUAL_PRESETS[0].testFile.fileName);
  const [testCode, setTestCode] = useState<string>(JAVA_DUAL_PRESETS[0].testFile.code);

  // Configuration options
  const [options, setOptions] = useState<DualJavaObfuscatorOptions>(DEFAULT_DUAL_OBFUSCATOR_OPTIONS);

  // Obfuscation result
  const [result, setResult] = useState<DualJavaObfuscationResult>(() => {
    return obfuscateDualJavaFiles(
      {
        mainClassFile: { fileName: JAVA_DUAL_PRESETS[0].mainFile.fileName, code: JAVA_DUAL_PRESETS[0].mainFile.code },
        testClassFile: { fileName: JAVA_DUAL_PRESETS[0].testFile.fileName, code: JAVA_DUAL_PRESETS[0].testFile.code },
      },
      DEFAULT_DUAL_OBFUSCATOR_OPTIONS
    );
  });

  // De-obfuscation states
  const [deobfMainCode, setDeobfMainCode] = useState<string>('');
  const [deobfTestCode, setDeobfTestCode] = useState<string>('');
  const [deobfMappingInput, setDeobfMappingInput] = useState<string>('');
  const [restoredMainCode, setRestoredMainCode] = useState<string>('');
  const [restoredTestCode, setRestoredTestCode] = useState<string>('');
  const [useActiveSessionMapping, setUseActiveSessionMapping] = useState<boolean>(true);

  // Mapping inspector states
  const [mappingSearch, setMappingSearch] = useState<string>('');
  const [mappingCategory, setMappingCategory] = useState<'all' | 'classes' | 'methods' | 'variables' | 'packages'>('all');

  // UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);
  const [newExclusionPkg, setNewExclusionPkg] = useState<string>('');
  const [newCustomExclusion, setNewCustomExclusion] = useState<string>('');

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

  // Code Formatting Helpers
  const handleFormatMainInput = () => {
    try {
      const formatted = formatJavaCode(mainCode, { indentSize: 4 });
      setMainCode(formatted);
      showStatus('Main class formatted with clean 4-space indentation!');
    } catch {
      showStatus('Could not auto-format main class code.');
    }
  };

  const handleFormatTestInput = () => {
    try {
      const formatted = formatJavaCode(testCode, { indentSize: 4 });
      setTestCode(formatted);
      showStatus('Test class formatted with clean 4-space indentation!');
    } catch {
      showStatus('Could not auto-format test class code.');
    }
  };

  const handleFormatBothInputs = () => {
    try {
      const formattedMain = formatJavaCode(mainCode, { indentSize: 4 });
      const formattedTest = formatJavaCode(testCode, { indentSize: 4 });
      setMainCode(formattedMain);
      setTestCode(formattedTest);
      showStatus('Both Java files formatted with clean 4-space indentation!');
    } catch {
      showStatus('Could not auto-format Java files.');
    }
  };

  const handleFormatObfuscatedMain = () => {
    try {
      const formatted = formatJavaCode(result.mainClassFile.obfuscatedCode, { indentSize: 4 });
      setResult((prev) => ({
        ...prev,
        mainClassFile: {
          ...prev.mainClassFile,
          obfuscatedCode: formatted,
        },
      }));
      showStatus('Obfuscated main class reformatted with clean indentation!');
    } catch {
      showStatus('Could not format obfuscated code.');
    }
  };

  const handleFormatObfuscatedTest = () => {
    try {
      const formatted = formatJavaCode(result.testClassFile.obfuscatedCode, { indentSize: 4 });
      setResult((prev) => ({
        ...prev,
        testClassFile: {
          ...prev.testClassFile,
          obfuscatedCode: formatted,
        },
      }));
      showStatus('Obfuscated test class reformatted with clean indentation!');
    } catch {
      showStatus('Could not format obfuscated code.');
    }
  };

  const handleFormatRestoredMain = () => {
    try {
      const formatted = formatJavaCode(restoredMainCode, { indentSize: 4 });
      setRestoredMainCode(formatted);
      showStatus('Restored main class reformatted with clean indentation!');
    } catch {
      showStatus('Could not format restored code.');
    }
  };

  const handleFormatRestoredTest = () => {
    try {
      const formatted = formatJavaCode(restoredTestCode, { indentSize: 4 });
      setRestoredTestCode(formatted);
      showStatus('Restored test class reformatted with clean indentation!');
    } catch {
      showStatus('Could not format restored code.');
    }
  };

  // Run Obfuscation
  const runObfuscation = () => {
    const res = obfuscateDualJavaFiles(
      {
        mainClassFile: { fileName: mainFileName, code: mainCode },
        testClassFile: { fileName: testFileName, code: testCode },
      },
      options
    );
    setResult(res);
  };

  useEffect(() => {
    runObfuscation();
  }, [mainCode, testCode, mainFileName, testFileName, options]);

  // Execute De-obfuscation
  const runDeobfuscation = () => {
    try {
      let mapToUse: JavaObfuscationMapping | Record<string, string> = result.mapping;
      if (!useActiveSessionMapping && deobfMappingInput.trim()) {
        try {
          mapToUse = JSON.parse(deobfMappingInput);
        } catch {
          showStatus('Invalid JSON mapping. Using active session mapping.');
        }
      }
      const restored = deobfuscateDualJavaFiles(deobfMainCode, deobfTestCode, mapToUse);
      setRestoredMainCode(restored.restoredMainCode);
      setRestoredTestCode(restored.restoredTestCode);
    } catch {
      setRestoredMainCode('// Error during de-obfuscation');
      setRestoredTestCode('// Error during de-obfuscation');
    }
  };

  useEffect(() => {
    if (activeTab === 'deobfuscate') {
      runDeobfuscation();
    }
  }, [deobfMainCode, deobfTestCode, deobfMappingInput, useActiveSessionMapping, activeTab, result.mapping]);

  // Handle Preset Selection
  const handleSelectPreset = (preset: JavaDualPreset) => {
    setSelectedPresetId(preset.id);
    setMainFileName(preset.mainFile.fileName);
    setMainCode(preset.mainFile.code);
    setTestFileName(preset.testFile.fileName);
    setTestCode(preset.testFile.code);
    showStatus(`Loaded preset: ${preset.name}`);
  };

  // Populate de-obfuscator from current obfuscated outputs
  const loadObfuscatedIntoDeobfuscator = () => {
    setDeobfMainCode(result.mainClassFile.obfuscatedCode);
    setDeobfTestCode(result.testClassFile.obfuscatedCode);
    setDeobfMappingInput(JSON.stringify(result.mapping, null, 2));
    setUseActiveSessionMapping(true);
    setActiveTab('deobfuscate');
    showStatus('Loaded obfuscated class & test into De-Obfuscator!');
  };

  // Load a modified test example into de-obfuscator to demonstrate user modification handling
  const loadModifiedTestExample = () => {
    // Take the current obfuscated code and inject a user modification
    const modMain = result.mainClassFile.obfuscatedCode + '\n// [User Added Production Method]\npublic void userAddedAuditLog() { System.out.println("Audited"); }';
    const modTest = result.testClassFile.obfuscatedCode + '\n    // [User Added Test Case]\n    @org.junit.jupiter.api.Test\n    void userCustomAdditionalTestCase() {\n        org.junit.jupiter.api.Assertions.assertTrue(true);\n    }';
    setDeobfMainCode(modMain);
    setDeobfTestCode(modTest);
    setDeobfMappingInput(JSON.stringify(result.mapping, null, 2));
    setUseActiveSessionMapping(true);
    setActiveTab('deobfuscate');
    showStatus('Loaded modified obfuscated code into De-Obfuscator!');
  };

  // Download Single File
  const downloadFile = (content: string, filename: string, mimeType: string = 'text/plain') => {
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

  // Download All as ZIP
  const handleDownloadAllZip = async () => {
    try {
      setIsExportingZip(true);
      const zip = new JSZip();

      // Main class file
      zip.file(result.mainClassFile.fileName, result.mainClassFile.obfuscatedCode);
      // Test class file
      zip.file(result.testClassFile.fileName, result.testClassFile.obfuscatedCode);
      // Mapping JSON
      zip.file('mapping.json', JSON.stringify(result.mapping, null, 2));

      // Readme info
      const readmeText = `Java Synchronized Dual-File Obfuscation Package
=================================================
Original Files:
  - Class: ${mainFileName} (Renamed to: ${result.mainClassFile.fileName})
  - Test:  ${testFileName} (Renamed to: ${result.testClassFile.fileName})

Shared Mapping Keys:
  - Classes renamed:   ${result.stats.totalClassesRenamed}
  - Methods renamed:   ${result.stats.totalMethodsRenamed}
  - Variables renamed: ${result.stats.totalVariablesRenamed}
  - Packages renamed:  ${result.stats.totalPackagesRenamed}
  - Shared Cross-File Tokens: ${result.stats.crossFileTokensCount}

How to De-obfuscate:
  Import mapping.json into the "Java Class & Test Obfuscator" tool under Security
  to reverse all obfuscated tokens back to their original Java identifiers.
`;
      zip.file('README.txt', readmeText);

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'java_class_and_test_obfuscated.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showStatus('Downloaded ZIP archive with both files and mapping!');
    } catch {
      showStatus('Failed to generate ZIP archive.');
    } finally {
      setIsExportingZip(false);
    }
  };

  // Mapping File Upload
  const handleMappingFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        setDeobfMappingInput(JSON.stringify(parsed, null, 2));
        setUseActiveSessionMapping(false);
        showStatus('Mapping JSON loaded successfully!');
      } catch {
        showStatus('Failed to parse mapping file. Must be valid JSON.');
      }
    };
    reader.readAsText(file);
  };

  // Filtered Mapping entries for the mapping inspector tab
  const filteredMappingItems = useMemo(() => {
    const items: Array<{ category: string; original: string; obfuscated: string }> = [];

    if (mappingCategory === 'all' || mappingCategory === 'classes') {
      Object.entries(result.mapping.classes).forEach(([orig, obf]) => {
        items.push({ category: 'Class', original: orig, obfuscated: String(obf) });
      });
    }
    if (mappingCategory === 'all' || mappingCategory === 'methods') {
      Object.entries(result.mapping.methods).forEach(([orig, obf]) => {
        items.push({ category: 'Method', original: orig, obfuscated: String(obf) });
      });
    }
    if (mappingCategory === 'all' || mappingCategory === 'variables') {
      Object.entries(result.mapping.variables).forEach(([orig, obf]) => {
        items.push({ category: 'Variable', original: orig, obfuscated: String(obf) });
      });
    }
    if (mappingCategory === 'all' || mappingCategory === 'packages') {
      Object.entries(result.mapping.packages).forEach(([orig, obf]) => {
        items.push({ category: 'Package', original: orig, obfuscated: String(obf) });
      });
    }

    if (!mappingSearch.trim()) return items;
    const q = mappingSearch.toLowerCase();
    return items.filter(
      (item) => item.original.toLowerCase().includes(q) || item.obfuscated.toLowerCase().includes(q)
    );
  }, [result.mapping, mappingCategory, mappingSearch]);

  return (
    <div id="dual-java-obfuscator-root" className="space-y-6">
      {/* Tool Header & Synchronized Mapping Banner */}
      <div id="dual-java-header" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
                <Shield className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Java Class & Test Obfuscator
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Synchronized Mapping
                </span>
              </h2>
            </div>
            <p className="text-sm text-slate-400">
              Obfuscate a Java production class and its companion unit/integration test with identical mapping keys across both files, and de-obfuscate modified code back anytime.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cross-File Synced:</span>
              <span className="font-bold text-indigo-300">{result.stats.crossFileTokensCount}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Classes:</span>
              <span className="font-bold text-emerald-300">{result.stats.totalClassesRenamed}</span>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Methods:</span>
              <span className="font-bold text-amber-300">{result.stats.totalMethodsRenamed}</span>
            </div>
            <button
              id="export-all-zip-btn"
              onClick={handleDownloadAllZip}
              disabled={isExportingZip}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>{isExportingZip ? 'Zipping...' : 'Export All (.ZIP)'}</span>
            </button>
          </div>
        </div>

        {/* Status Toast / Message */}
        {statusMessage && (
          <div className="mt-3 px-3 py-2 bg-indigo-950/60 border border-indigo-500/30 rounded-lg text-xs text-indigo-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Preset Selector Strip */}
      <div id="dual-presets-bar" className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
          <BookOpen className="w-4 h-4 text-slate-400" />
          <span>Presets:</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          {JAVA_DUAL_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleSelectPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-2 border ${
                selectedPresetId === preset.id
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700/60 hover:bg-slate-750 hover:text-white'
              }`}
            >
              <span>{preset.name}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 text-slate-200">
                {preset.badge}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={loadObfuscatedIntoDeobfuscator}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            title="Copy current obfuscated files into De-Obfuscate tab"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>Load in De-Obfuscator</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div id="dual-tabs-container" className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
          <button
            id="tab-obfuscate"
            onClick={() => setActiveTab('obfuscate')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'obfuscate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Obfuscate (Class + Test)</span>
          </button>
          <button
            id="tab-deobfuscate"
            onClick={() => {
              setActiveTab('deobfuscate');
              if (!deobfMainCode && !deobfTestCode) {
                setDeobfMainCode(result.mainClassFile.obfuscatedCode);
                setDeobfTestCode(result.testClassFile.obfuscatedCode);
                setDeobfMappingInput(JSON.stringify(result.mapping, null, 2));
              }
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'deobfuscate'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>De-Obfuscate Modified Code</span>
          </button>
          <button
            id="tab-mapping"
            onClick={() => setActiveTab('mapping')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'mapping'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            <span>Shared Mapping ({Object.keys(result.mapping.classes).length + Object.keys(result.mapping.methods).length})</span>
          </button>
          <button
            id="tab-diff"
            onClick={() => setActiveTab('diff')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'diff'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            <span>Diff & Sync Keys</span>
          </button>
          <button
            id="tab-settings"
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'settings'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Rules & Options</span>
          </button>
        </div>

        {/* View Layout Filter (Both files vs Main vs Test) + Format & Wrap Controls + Full Viewport */}
        <div className="flex items-center gap-2 flex-wrap">
          {(activeTab === 'obfuscate' || activeTab === 'deobfuscate') && (
            <>
              <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  onClick={() => setSelectedFileTab('both')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    selectedFileTab === 'both' ? 'bg-slate-800 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Side-by-Side (Both)
                </button>
                <button
                  onClick={() => setSelectedFileTab('main')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    selectedFileTab === 'main' ? 'bg-slate-800 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Class Only
                </button>
                <button
                  onClick={() => setSelectedFileTab('test')}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    selectedFileTab === 'test' ? 'bg-slate-800 text-indigo-300 font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Test Only
                </button>
              </div>

              <button
                onClick={() => setWrapLines(!wrapLines)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                  wrapLines
                    ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title={wrapLines ? 'Word wrap is ON. Click to disable wrapping and maintain exact horizontal indentation.' : 'Word wrap is OFF (Horizontal scroll enabled). Indentation and layout are exact.'}
              >
                <WrapText className="w-3.5 h-3.5" />
                <span>{wrapLines ? 'Wrap: On' : 'Wrap: Off (Exact Format)'}</span>
              </button>

              {activeTab === 'obfuscate' && (
                <button
                  onClick={handleFormatBothInputs}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-900/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5"
                  title="Format both source classes with standard 4-space Java indentation"
                >
                  <AlignLeft className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Format Both</span>
                </button>
              )}
            </>
          )}

          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border ${
                isFullScreen
                  ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40 hover:bg-indigo-600/40'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
              title={isFullScreen ? 'Exit full viewport mode (restore normal modal dialog)' : 'Expand to full viewport for maximum code view'}
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-indigo-400" /> : <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{isFullScreen ? 'Full Viewport: On' : 'Full Viewport'}</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: OBFUSCATE (CLASS + TEST) */}
      {activeTab === 'obfuscate' && (
        <div id="tab-content-obfuscate" className="space-y-6">
          {/* Synchronized Connection Visualizer */}
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-indigo-300">
              <Share2 className="w-4 h-4 text-indigo-400" />
              <span className="font-semibold">Synchronized Keys in Same Line:</span>
              <span className="text-slate-300">
                Any class or method declared in <strong className="text-white">{mainFileName}</strong> and referenced or invoked in <strong className="text-white">{testFileName}</strong> receives the identical obfuscated name.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Class mapping:</span>
              <code className="bg-slate-900 px-2 py-0.5 rounded border border-indigo-500/30 text-indigo-300 font-mono">
                {result.mainClassFile.originalName} → {result.mainClassFile.obfuscatedClassName}
              </code>
              <code className="bg-slate-900 px-2 py-0.5 rounded border border-purple-500/30 text-purple-300 font-mono">
                {result.testClassFile.originalName} → {result.testClassFile.obfuscatedClassName}
              </code>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* FILE 1: PRODUCTION / MAIN CLASS */}
            {(selectedFileTab === 'both' || selectedFileTab === 'main') && (
              <div id="file1-card" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                      <FileCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={mainFileName}
                          onChange={(e) => setMainFileName(e.target.value)}
                          className="bg-slate-900 text-xs font-bold text-slate-200 border border-slate-700/60 rounded px-2 py-0.5 w-44 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                          Production Class
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Renames to: <code className="text-indigo-300 font-mono">{result.mainClassFile.fileName}</code>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyToClipboard(result.mainClassFile.obfuscatedCode, 'main-obf')}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Obfuscated Code"
                    >
                      {copiedKey === 'main-obf' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => downloadFile(result.mainClassFile.obfuscatedCode, result.mainClassFile.fileName)}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Download Obfuscated Java File"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-4">
                  {/* Source Input */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>Source Code (Original):</span>
                      <div className="flex items-center gap-2">
                        <span>{mainCode.split('\n').length} lines • {mainCode.length} chars</span>
                        <button
                          onClick={() => copyToClipboard(mainCode, 'source-main')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Copy source Java class code"
                        >
                          {copiedKey === 'source-main' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedKey === 'source-main' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={handleFormatMainInput}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Format Java class code with clean 4-space indentation"
                        >
                          <AlignLeft className="w-3 h-3 text-blue-400" />
                          <span>Format</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={mainCode}
                      onChange={(e) => setMainCode(e.target.value)}
                      rows={isFullScreen ? 18 : 11}
                      wrap={wrapLines ? 'soft' : 'off'}
                      spellCheck={false}
                      className="w-full font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                      placeholder="Paste Java production class here..."
                    />
                  </div>

                  {/* Obfuscated Output */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="text-indigo-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Obfuscated Output:
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{result.mainClassFile.obfuscatedCode.split('\n').length} lines • {result.mainClassFile.obfuscatedCode.length} chars</span>
                        <button
                          onClick={() => copyToClipboard(result.mainClassFile.obfuscatedCode, 'main-obf-pane')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Copy obfuscated Java class code"
                        >
                          {copiedKey === 'main-obf-pane' || copiedKey === 'main-obf' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedKey === 'main-obf-pane' || copiedKey === 'main-obf' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={handleFormatObfuscatedMain}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Re-indent obfuscated output with clean Java indentation"
                        >
                          <AlignLeft className="w-3 h-3 text-emerald-400" />
                          <span>Re-Indent</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      value={result.mainClassFile.obfuscatedCode}
                      rows={isFullScreen ? 18 : 11}
                      wrap={wrapLines ? 'soft' : 'off'}
                      spellCheck={false}
                      className="w-full font-mono text-xs bg-slate-950 text-emerald-300/90 border border-slate-800 rounded-lg p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* FILE 2: UNIT / INTEGRATION TEST CLASS */}
            {(selectedFileTab === 'both' || selectedFileTab === 'test') && (
              <div id="file2-card" className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
                <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/10 rounded text-purple-400">
                      <TestTube2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={testFileName}
                          onChange={(e) => setTestFileName(e.target.value)}
                          className="bg-slate-900 text-xs font-bold text-slate-200 border border-slate-700/60 rounded px-2 py-0.5 w-44 focus:outline-none focus:border-indigo-500"
                        />
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                          Test Class
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Renames to: <code className="text-purple-300 font-mono">{result.testClassFile.fileName}</code>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => copyToClipboard(result.testClassFile.obfuscatedCode, 'test-obf')}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Copy Obfuscated Code"
                    >
                      {copiedKey === 'test-obf' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => downloadFile(result.testClassFile.obfuscatedCode, result.testClassFile.fileName)}
                      className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                      title="Download Obfuscated Test File"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col gap-4">
                  {/* Source Input */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span>Test Source Code (Original):</span>
                      <div className="flex items-center gap-2">
                        <span>{testCode.split('\n').length} lines • {testCode.length} chars</span>
                        <button
                          onClick={() => copyToClipboard(testCode, 'source-test')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Copy source Java test code"
                        >
                          {copiedKey === 'source-test' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedKey === 'source-test' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={handleFormatTestInput}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Format Java test code with clean 4-space indentation"
                        >
                          <AlignLeft className="w-3 h-3 text-purple-400" />
                          <span>Format</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value)}
                      rows={isFullScreen ? 18 : 11}
                      wrap={wrapLines ? 'soft' : 'off'}
                      spellCheck={false}
                      className="w-full font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                      placeholder="Paste Java companion test class here..."
                    />
                  </div>

                  {/* Obfuscated Output */}
                  <div>
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                      <span className="text-purple-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        Obfuscated Test Output:
                      </span>
                      <div className="flex items-center gap-2">
                        <span>{result.testClassFile.obfuscatedCode.split('\n').length} lines • {result.testClassFile.obfuscatedCode.length} chars</span>
                        <button
                          onClick={() => copyToClipboard(result.testClassFile.obfuscatedCode, 'test-obf-pane')}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Copy obfuscated Java test code"
                        >
                          {copiedKey === 'test-obf-pane' || copiedKey === 'test-obf' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedKey === 'test-obf-pane' || copiedKey === 'test-obf' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button
                          onClick={handleFormatObfuscatedTest}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                          title="Re-indent obfuscated test output with clean Java indentation"
                        >
                          <AlignLeft className="w-3 h-3 text-emerald-400" />
                          <span>Re-Indent</span>
                        </button>
                      </div>
                    </div>
                    <textarea
                      readOnly
                      value={result.testClassFile.obfuscatedCode}
                      rows={isFullScreen ? 18 : 11}
                      wrap={wrapLines ? 'soft' : 'off'}
                      spellCheck={false}
                      className="w-full font-mono text-xs bg-slate-950 text-emerald-300/90 border border-slate-800 rounded-lg p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DE-OBFUSCATE MODIFIED CODE */}
      {activeTab === 'deobfuscate' && (
        <div id="tab-content-deobfuscate" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                  Reverse De-Obfuscation for Modified Code
                </h3>
                <p className="text-xs text-slate-400">
                  Paste modified obfuscated code for the class and its test. Any bug fixes, added lines, assertions, or changes made while running or analyzing the obfuscated files will be converted back seamlessly to their original names.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={loadObfuscatedIntoDeobfuscator}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sync from Active Output</span>
                </button>
                <button
                  onClick={loadModifiedTestExample}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
                  title="Try an example where lines were added/modified in obfuscated files"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Try Modified Code Example</span>
                </button>
              </div>
            </div>

            {/* Mapping Selection Mode */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="mappingMode"
                    checked={useActiveSessionMapping}
                    onChange={() => setUseActiveSessionMapping(true)}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <span>Use Active Session Mapping ({Object.keys(result.mapping.classes).length} classes, {Object.keys(result.mapping.methods).length} methods)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="mappingMode"
                    checked={!useActiveSessionMapping}
                    onChange={() => setUseActiveSessionMapping(false)}
                    className="text-indigo-600 focus:ring-0"
                  />
                  <span>Custom JSON Mapping</span>
                </label>
              </div>

              {!useActiveSessionMapping && (
                <label className="px-2.5 py-1 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded cursor-pointer flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-slate-400" />
                  <span>Upload mapping.json</span>
                  <input type="file" accept=".json" onChange={handleMappingFileUpload} className="hidden" />
                </label>
              )}
            </div>

            {!useActiveSessionMapping && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
                  <span>Mapping JSON (Input):</span>
                  <div className="flex items-center gap-2">
                    <span>{deobfMappingInput.split('\n').length} lines • {deobfMappingInput.length} chars</span>
                    {deobfMappingInput.trim() && (
                      <button
                        onClick={() => copyToClipboard(deobfMappingInput, 'deobf-mapping')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Copy Mapping JSON input"
                      >
                        {copiedKey === 'deobf-mapping' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedKey === 'deobf-mapping' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>
                <textarea
                  value={deobfMappingInput}
                  onChange={(e) => setDeobfMappingInput(e.target.value)}
                  rows={3}
                  className="w-full font-mono text-xs bg-slate-950 text-slate-300 border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                  placeholder="Paste mapping JSON with classes, methods, variables, packages or reverseMapping..."
                />
              </div>
            )}
          </div>

          {/* Dual De-Obfuscate Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Class De-obfuscation Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-blue-400" />
                  Modified Obfuscated Class
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(restoredMainCode, 'restored-main')}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy Restored Code"
                  >
                    {copiedKey === 'restored-main' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => downloadFile(restoredMainCode, mainFileName)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Download Restored Java Class"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>Input (Obfuscated & Modified):</span>
                    <div className="flex items-center gap-2">
                      <span>{deobfMainCode.split('\n').length} lines • {deobfMainCode.length} chars</span>
                      <button
                        onClick={() => copyToClipboard(deobfMainCode, 'deobf-main-input')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Copy modified obfuscated class code"
                      >
                        {copiedKey === 'deobf-main-input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedKey === 'deobf-main-input' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={deobfMainCode}
                    onChange={(e) => setDeobfMainCode(e.target.value)}
                    rows={isFullScreen ? 16 : 10}
                    wrap={wrapLines ? 'soft' : 'off'}
                    spellCheck={false}
                    className="w-full font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                    placeholder="Paste obfuscated/modified Java class code here..."
                  />
                </div>

                <div>
                  <div className="text-xs text-emerald-400 font-semibold mb-1.5 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      De-Obfuscated Restored Output:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-normal">{restoredMainCode.split('\n').length} lines • {restoredMainCode.length} chars</span>
                      <button
                        onClick={() => copyToClipboard(restoredMainCode, 'restored-main-pane')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Copy restored class code"
                      >
                        {copiedKey === 'restored-main-pane' || copiedKey === 'restored-main' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedKey === 'restored-main-pane' || copiedKey === 'restored-main' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleFormatRestoredMain}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Re-indent restored class code with clean 4-space indentation"
                      >
                        <AlignLeft className="w-3 h-3 text-emerald-400" />
                        <span>Re-Indent</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={restoredMainCode}
                    rows={isFullScreen ? 16 : 10}
                    wrap={wrapLines ? 'soft' : 'off'}
                    spellCheck={false}
                    className="w-full font-mono text-xs bg-slate-950 text-emerald-300/90 border border-slate-800 rounded-lg p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Test De-obfuscation Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-sm">
              <div className="bg-slate-850 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <TestTube2 className="w-4 h-4 text-purple-400" />
                  Modified Obfuscated Test
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(restoredTestCode, 'restored-test')}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Copy Restored Code"
                  >
                    {copiedKey === 'restored-test' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => downloadFile(restoredTestCode, testFileName)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Download Restored Java Test"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col gap-4">
                <div>
                  <div className="text-xs text-slate-400 mb-1.5 flex justify-between items-center">
                    <span>Input (Obfuscated & Modified):</span>
                    <div className="flex items-center gap-2">
                      <span>{deobfTestCode.split('\n').length} lines • {deobfTestCode.length} chars</span>
                      <button
                        onClick={() => copyToClipboard(deobfTestCode, 'deobf-test-input')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Copy modified obfuscated test code"
                      >
                        {copiedKey === 'deobf-test-input' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedKey === 'deobf-test-input' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={deobfTestCode}
                    onChange={(e) => setDeobfTestCode(e.target.value)}
                    rows={isFullScreen ? 16 : 10}
                    wrap={wrapLines ? 'soft' : 'off'}
                    spellCheck={false}
                    className="w-full font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-indigo-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                    placeholder="Paste obfuscated/modified Java test code here..."
                  />
                </div>

                <div>
                  <div className="text-xs text-purple-400 font-semibold mb-1.5 flex justify-between items-center">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5" />
                      De-Obfuscated Restored Test Output:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 font-normal">{restoredTestCode.split('\n').length} lines • {restoredTestCode.length} chars</span>
                      <button
                        onClick={() => copyToClipboard(restoredTestCode, 'restored-test-pane')}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Copy restored test code"
                      >
                        {copiedKey === 'restored-test-pane' || copiedKey === 'restored-test' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        <span>{copiedKey === 'restored-test-pane' || copiedKey === 'restored-test' ? 'Copied' : 'Copy'}</span>
                      </button>
                      <button
                        onClick={handleFormatRestoredTest}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Re-indent restored test code with clean 4-space indentation"
                      >
                        <AlignLeft className="w-3 h-3 text-emerald-400" />
                        <span>Re-Indent</span>
                      </button>
                    </div>
                  </div>
                  <textarea
                    readOnly
                    value={restoredTestCode}
                    rows={isFullScreen ? 16 : 10}
                    wrap={wrapLines ? 'soft' : 'off'}
                    spellCheck={false}
                    className="w-full font-mono text-xs bg-slate-950 text-emerald-300/90 border border-slate-800 rounded-lg p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SHARED MAPPING INSPECTOR */}
      {activeTab === 'mapping' && (
        <div id="tab-content-mapping" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-indigo-400" />
                Shared Synchronized Mapping Table
              </h3>
              <p className="text-xs text-slate-400">
                Inspect how classes, methods, variables, and packages are mapped across both files with 100% collision-free synchronization.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => copyToClipboard(JSON.stringify(result.mapping, null, 2), 'mapping-json')}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                {copiedKey === 'mapping-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Mapping JSON</span>
              </button>
              <button
                onClick={() => downloadFile(JSON.stringify(result.mapping, null, 2), 'mapping.json', 'application/json')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download mapping.json</span>
              </button>
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={mappingSearch}
                onChange={(e) => setMappingSearch(e.target.value)}
                placeholder="Search original or obfuscated symbol..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'classes', 'methods', 'variables', 'packages'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setMappingCategory(cat)}
                  className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                    mappingCategory === cat
                      ? 'bg-indigo-600 text-white font-medium'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Mapping Grid Table */}
          <div className={`border border-slate-800 rounded-lg overflow-hidden ${isFullScreen ? 'max-h-[calc(100vh-320px)]' : 'max-h-96'} overflow-y-auto`}>
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-850 text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="px-4 py-2 font-semibold">Type</th>
                  <th className="px-4 py-2 font-semibold">Original Identifier</th>
                  <th className="px-4 py-2 font-semibold">Obfuscated Identifier</th>
                  <th className="px-4 py-2 font-semibold">Cross-File Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950">
                {filteredMappingItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-500 font-sans">
                      No matching mappings found.
                    </td>
                  </tr>
                ) : (
                  filteredMappingItems.map((item, idx) => {
                    const isCrossFile =
                      result.sharedIdentifiers.classes.includes(item.original) ||
                      result.sharedIdentifiers.methods.includes(item.original) ||
                      result.sharedIdentifiers.variables.includes(item.original) ||
                      result.sharedIdentifiers.packages.includes(item.original);

                    return (
                      <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                        <td className="px-4 py-2 font-sans">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              item.category === 'Class'
                                ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                : item.category === 'Method'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : item.category === 'Package'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-300 font-medium">{item.original}</td>
                        <td className="px-4 py-2 text-indigo-300 font-bold">{item.obfuscated}</td>
                        <td className="px-4 py-2 font-sans">
                          {isCrossFile ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold flex items-center gap-1 w-fit">
                              <Share2 className="w-2.5 h-2.5" />
                              Used in Class & Test
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Single-file scoped</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DIFF & CROSS-FILE KEY SYNC */}
      {activeTab === 'diff' && (
        <div id="tab-content-diff" className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-indigo-400" />
                Cross-File Synchronized Identifiers
              </h3>
              <p className="text-xs text-slate-400">
                These symbols appear in both <code className="text-indigo-300">{mainFileName}</code> and <code className="text-purple-300">{testFileName}</code>. Both files replace them with the exact same obfuscated token so that unit and integration tests compile and run seamlessly against the obfuscated class.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 font-medium block mb-1">Shared Classes</span>
                <span className="text-lg font-bold text-blue-400">{result.sharedIdentifiers.classes.length}</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.sharedIdentifiers.classes.map((c) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                      {c} → {result.mapping.classes[c]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 font-medium block mb-1">Shared Methods</span>
                <span className="text-lg font-bold text-amber-400">{result.sharedIdentifiers.methods.length}</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.sharedIdentifiers.methods.slice(0, 6).map((m) => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                      {m} → {result.mapping.methods[m]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 font-medium block mb-1">Shared Variables</span>
                <span className="text-lg font-bold text-emerald-400">{result.sharedIdentifiers.variables.length}</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.sharedIdentifiers.variables.slice(0, 6).map((v) => (
                    <span key={v} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-mono">
                      {v} → {result.mapping.variables[v]}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg">
                <span className="text-xs text-slate-400 font-medium block mb-1">Shared Packages</span>
                <span className="text-lg font-bold text-cyan-400">{result.sharedIdentifiers.packages.length}</span>
                <div className="mt-2 flex flex-wrap gap-1">
                  {result.sharedIdentifiers.packages.map((p) => (
                    <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-mono">
                      {p} → {result.mapping.packages[p]}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: RULES & OPTIONS */}
      {activeTab === 'settings' && (
        <div id="tab-content-settings" className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              Obfuscation Rules & Testing Configurations
            </h3>
            <p className="text-xs text-slate-400">
              Fine-tune naming conventions, preservation rules, and framework whitelists for both the production class and test suite.
            </p>
          </div>

          {/* Naming Style */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block">Identifier Naming Style</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {[
                { id: 'alphabetical', label: 'Alphabetical', sample: 'A, B, C / a, b, c / v_a, v_b' },
                { id: 'hexadecimal', label: 'Hexadecimal', sample: '_0xC1, _0xC2 / _0xm1 / _0xv1' },
                { id: 'numeric', label: 'Numeric Short', sample: 'C1, C2 / m1, m2 / v1, v2' },
                { id: 'customPrefix', label: 'Custom Prefixes', sample: `${options.customClassPrefix}_1, ${options.customMethodPrefix}_1` },
              ].map((style) => (
                <label
                  key={style.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    options.namingStyle === style.id
                      ? 'bg-indigo-950/40 border-indigo-500 text-indigo-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold text-slate-200 mb-1">
                    <input
                      type="radio"
                      name="namingStyle"
                      checked={options.namingStyle === style.id}
                      onChange={() => setOptions({ ...options, namingStyle: style.id as any })}
                      className="text-indigo-600 focus:ring-0"
                    />
                    <span>{style.label}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 block">{style.sample}</span>
                </label>
              ))}
            </div>

            {options.namingStyle === 'customPrefix' && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Class Prefix</span>
                  <input
                    type="text"
                    value={options.customClassPrefix}
                    onChange={(e) => setOptions({ ...options, customClassPrefix: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Method Prefix</span>
                  <input
                    type="text"
                    value={options.customMethodPrefix}
                    onChange={(e) => setOptions({ ...options, customMethodPrefix: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Variable Prefix</span>
                  <input
                    type="text"
                    value={options.customVarPrefix}
                    onChange={(e) => setOptions({ ...options, customVarPrefix: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Test & Framework Specific Toggles */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block">Testing & Framework Rules</span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveTestMethods}
                  onChange={(e) => setOptions({ ...options, preserveTestMethods: e.target.checked })}
                  className="rounded text-indigo-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Preserve @Test Method Names</span>
                  <span className="text-slate-400 text-[11px]">
                    Keeps test method names (e.g. <code>testProcessOrderSuccess()</code>) readable for JUnit/Maven test reports. If disabled, test methods are also obfuscated.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveAssertionCalls}
                  onChange={(e) => setOptions({ ...options, preserveAssertionCalls: e.target.checked })}
                  className="rounded text-indigo-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Preserve Testing & Mocking APIs</span>
                  <span className="text-slate-400 text-[11px]">
                    Preserves JUnit assertions (<code>assertEquals</code>, <code>assertThrows</code>), Mockito calls (<code>when</code>, <code>verify</code>), and AssertJ.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.syncClassFileNames}
                  onChange={(e) => setOptions({ ...options, syncClassFileNames: e.target.checked })}
                  className="rounded text-indigo-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Synchronize Output Filenames</span>
                  <span className="text-slate-400 text-[11px]">
                    Automatically renames files to match obfuscated primary class names (e.g. <code>A.java</code> and <code>B.java</code>).
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.preserveAnnotated}
                  onChange={(e) => setOptions({ ...options, preserveAnnotated: e.target.checked })}
                  className="rounded text-indigo-600 mt-0.5"
                />
                <div>
                  <span className="font-semibold text-slate-200 block">Preserve Annotated Declarations</span>
                  <span className="text-slate-400 text-[11px]">
                    Preserves methods annotated with <code>@Override</code>, <code>@GetMapping</code>, <code>@Autowired</code>, <code>@Mock</code>, etc.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Standard Java Obfuscator Rules */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block">Formatting & Obfuscation Rules</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              {[
                { key: 'preserveFormatting', label: 'Keep Formatting Intact', desc: 'Preserves original indentation, blank lines, braces, and file layout' },
                { key: 'autoFormatOutput', label: 'Auto-Format Output', desc: 'Run clean 4-space Java indentation beautifier on obfuscated code' },
                { key: 'obfuscateClasses', label: 'Obfuscate Classes & Types', desc: 'Rename custom class & type tokens' },
                { key: 'obfuscateMethods', label: 'Obfuscate Methods', desc: 'Rename non-excluded method signatures' },
                { key: 'obfuscateVariables', label: 'Obfuscate Variables', desc: 'Rename fields, locals, and parameters' },
                { key: 'obfuscatePackages', label: 'Obfuscate Packages', desc: 'Mangle custom package path segments' },
                { key: 'stripComments', label: 'Strip All Comments', desc: 'Remove JavaDoc & line comments (off preserves comments intact)' },
                { key: 'encryptStrings', label: 'Encrypt String Literals', desc: 'Base64 encode and wrap string constants' },
                { key: 'preserveMain', label: 'Preserve main() Entry', desc: 'Keep public static void main signatures' },
                { key: 'preserveGettersSetters', label: 'Preserve Getters & Setters', desc: 'Keep getX(), setX(), isX() methods' },
              ].map((item) => (
                <label key={item.key} className="flex items-start gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(options as any)[item.key]}
                    onChange={(e) => setOptions({ ...options, [item.key]: e.target.checked })}
                    className="rounded text-indigo-600 mt-0.5"
                  />
                  <div>
                    <span className="font-semibold text-slate-200 block text-xs">{item.label}</span>
                    <span className="text-slate-500 text-[10px]">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Exclusions List */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 block">Custom Exclusions Whitelist</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newCustomExclusion}
                onChange={(e) => setNewCustomExclusion(e.target.value)}
                placeholder="e.g. calculateTax, OrderDTO"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 w-64 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={() => {
                  if (newCustomExclusion.trim()) {
                    setOptions({
                      ...options,
                      customExclusions: [...options.customExclusions, newCustomExclusion.trim()],
                    });
                    setNewCustomExclusion('');
                  }
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-medium"
              >
                Add Exclusion
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {options.customExclusions.map((excl, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                  <span>{excl}</span>
                  <button
                    onClick={() => {
                      setOptions({
                        ...options,
                        customExclusions: options.customExclusions.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-slate-400 hover:text-rose-400"
                  >
                    ×
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
