import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  Key,
  Eye,
  EyeOff,
  Check,
  Copy,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileCode,
  TestTube2,
  Share2,
  ExternalLink,
  Code2,
  GitCompare,
  ArrowRight,
  ShieldCheck,
  Search,
  Filter,
  CheckSquare,
  Square,
  RefreshCw,
  Sliders,
  ChevronDown,
  ChevronRight,
  Zap,
  Layers,
  Info,
} from 'lucide-react';
import { DualJavaObfuscationResult } from '../../../utils/javaDualObfuscator';
import {
  ParsedJavaMethod,
  extractJavaMethods,
  generateJavaTestsWithGemini,
  GeneratedTestsResult,
  createScopedObfuscatedJavaClasses,
  ScopedObfuscatedClasses,
} from '../../../utils/geminiJavaTestGenerator';
import { deobfuscateJavaCode } from '../../../utils/javaObfuscator';
import { formatJavaCode } from '../../../utils/javaFormatter';

export interface GeminiTestGeneratorPanelProps {
  mainFileName: string;
  mainCode: string;
  testFileName: string;
  testCode: string;
  result: DualJavaObfuscationResult;
  onApplyMergedTest: (mergedObfuscatedCode: string, deobfuscatedCode: string) => void;
  onNavigateToDeobfuscator: (deobfMain: string, deobfTest: string) => void;
  isFullScreen?: boolean;
}

export const GeminiTestGeneratorPanel: React.FC<GeminiTestGeneratorPanelProps> = ({
  mainFileName,
  mainCode,
  testFileName,
  testCode,
  result,
  onApplyMergedTest,
  onNavigateToDeobfuscator,
  isFullScreen = false,
}) => {
  // API Key management
  const apiKeyInputRef = useRef<HTMLInputElement>(null);
  const [apiKeyMissingWarning, setApiKeyMissingWarning] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>(() => {
    return (
      sessionStorage.getItem('devhub_gemini_api_key') ||
      (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY ||
      ''
    );
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [saveKeyToSession, setSaveKeyToSession] = useState<boolean>(true);

  // Model & Generation Options
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.8-flash');
  const [coverageGoal, setCoverageGoal] = useState<'all_lines_and_branches' | 'boundary_and_exceptions' | 'edge_cases'>('all_lines_and_branches');
  const [testFramework, setTestFramework] = useState<'junit5' | 'junit4' | 'testng'>('junit5');

  // Method Selection (Class Target Methods is the Primary option)
  const [sourceFilter, setSourceFilter] = useState<'main' | 'test' | 'all'>('main');
  const [methodSearch, setMethodSearch] = useState<string>('');
  const [selectedMethodIds, setSelectedMethodIds] = useState<Set<string>>(new Set());
  const [expandedMethodBodyId, setExpandedMethodBodyId] = useState<string | null>(null);

  // Scoped AI Context preview states (Collapsed by default)
  const [isScopedSectionExpanded, setIsScopedSectionExpanded] = useState<boolean>(false);
  const [scopedViewTab, setScopedViewTab] = useState<'main' | 'test' | 'side-by-side'>('main');

  // Generation status
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<GeneratedTestsResult | null>(null);

  // UI view state
  const [activeResultView, setActiveResultView] = useState<'split' | 'merged' | 'deobfuscated' | 'new-tests' | 'diff'>('split');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [hasDeobfuscatedUpdated, setHasDeobfuscatedUpdated] = useState<boolean>(false);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    showStatus('Copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showStatus(`Downloaded ${filename}!`);
  };

  // Save API key changes
  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    if (val.trim()) {
      setApiKeyMissingWarning(false);
      if (generationError?.includes('API key')) {
        setGenerationError(null);
      }
    }
    if (saveKeyToSession) {
      if (val.trim()) {
        sessionStorage.setItem('devhub_gemini_api_key', val.trim());
      } else {
        sessionStorage.removeItem('devhub_gemini_api_key');
      }
    }
  };

  const handleClearApiKey = () => {
    setApiKey('');
    sessionStorage.removeItem('devhub_gemini_api_key');
    showStatus('Gemini API key cleared from session.');
  };

  // Extract parsed methods from both obfuscated files
  const testMethods = useMemo(() => {
    return extractJavaMethods(result.testClassFile.obfuscatedCode, 'test', result.mapping);
  }, [result.testClassFile.obfuscatedCode, result.mapping]);

  const mainMethods = useMemo(() => {
    return extractJavaMethods(result.mainClassFile.obfuscatedCode, 'main', result.mapping);
  }, [result.mainClassFile.obfuscatedCode, result.mapping]);

  const allMethods = useMemo(() => {
    return [...testMethods, ...mainMethods];
  }, [testMethods, mainMethods]);

  // Pre-select the primary class target method on initial mount
  useEffect(() => {
    if (selectedMethodIds.size === 0) {
      if (mainMethods.length > 0) {
        setSelectedMethodIds(new Set([mainMethods[0].id]));
      } else if (testMethods.length > 0) {
        const candidates = testMethods.filter((m) => m.name !== 'setUp' && m.name !== 'tearDown');
        if (candidates.length > 0) {
          setSelectedMethodIds(new Set([candidates[0].id]));
        }
      }
    }
  }, [mainMethods, testMethods]);

  // Selected methods list
  const selectedMethodsList = useMemo(() => {
    return allMethods.filter((m) => selectedMethodIds.has(m.id));
  }, [allMethods, selectedMethodIds]);

  // Scoped obfuscated classes (only selected methods + dependent private methods + setup & related tests)
  const scopedContext = useMemo(() => {
    return createScopedObfuscatedJavaClasses(
      result.mainClassFile.obfuscatedCode,
      result.testClassFile.obfuscatedCode,
      selectedMethodsList,
      result.mapping
    );
  }, [result.mainClassFile.obfuscatedCode, result.testClassFile.obfuscatedCode, selectedMethodsList, result.mapping]);

  // Filtered methods display list
  const filteredMethods = useMemo(() => {
    let pool = allMethods;
    if (sourceFilter === 'test') pool = testMethods;
    else if (sourceFilter === 'main') pool = mainMethods;

    if (!methodSearch.trim()) return pool;
    const q = methodSearch.toLowerCase();
    return pool.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.originalName && m.originalName.toLowerCase().includes(q)) ||
        m.parameters.toLowerCase().includes(q) ||
        m.rawDeclaration.toLowerCase().includes(q)
    );
  }, [allMethods, testMethods, mainMethods, sourceFilter, methodSearch]);

  // Toggle selection
  const handleToggleMethod = (id: string) => {
    const next = new Set(selectedMethodIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedMethodIds(next);
  };

  const handleSelectAllFiltered = () => {
    const next = new Set(selectedMethodIds);
    filteredMethods.forEach((m) => next.add(m.id));
    setSelectedMethodIds(next);
  };

  const handleClearSelection = () => {
    setSelectedMethodIds(new Set());
  };

  // Execute Gemini test generation
  const handleGenerateTests = async () => {
    if (!apiKey.trim()) {
      setApiKeyMissingWarning(true);
      setGenerationError(
        'Google AI Studio / Gemini API key is missing. Please enter your API key in the field above to generate unit tests.'
      );
      showStatus('⚠️ API Key is missing. Please provide your Gemini API key.');
      apiKeyInputRef.current?.focus();
      return;
    }

    if (selectedMethodsList.length === 0) {
      setGenerationError('Please select at least one method to generate branch tests for.');
      showStatus('Please select at least one method.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStep('Analyzing obfuscated signatures & branch pathways...');

    try {
      setGenerationStep('Sending scoped obfuscated code context to Gemini API...');
      const genRes = await generateJavaTestsWithGemini({
        apiKey: apiKey.trim(),
        model: selectedModel,
        selectedMethods: selectedMethodsList,
        obfuscatedClassCode: scopedContext.scopedClassCode,
        obfuscatedTestCode: scopedContext.scopedTestCode,
        fullObfuscatedTestCode: result.testClassFile.obfuscatedCode,
        mainClassName: result.mainClassFile.fileName,
        testClassName: result.testClassFile.fileName,
        coverageGoal,
        testFramework,
        mapping: result.mapping,
      });

      if (!genRes.success) {
        setGenerationError(genRes.error || 'Failed to generate unit tests.');
        showStatus('Failed to generate tests. Check error message.');
      } else {
        setGeneratedResult(genRes);
        setHasDeobfuscatedUpdated(true);
        showStatus(
          `Successfully generated ${genRes.stats.methodsGenerated} test methods with full line & branch coverage!`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during generation.';
      setGenerationError(msg);
      showStatus('Generation failed.');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Re-run de-obfuscation manually on the updated obfuscated test code
  const handleManualDeobfuscate = () => {
    if (!generatedResult) return;
    try {
      const restored = deobfuscateJavaCode(generatedResult.mergedObfuscatedTestCode, result.mapping);
      const formatted = formatJavaCode(restored, { indentSize: 4 });
      setGeneratedResult((prev) =>
        prev
          ? {
              ...prev,
              deobfuscatedMergedTestCode: formatted,
            }
          : null
      );
    } catch {
      // keep existing restored test code
    }
    setHasDeobfuscatedUpdated(true);
    setActiveResultView('deobfuscated');
    showStatus('De-obfuscated updated test class using active session mapping!');
  };

  return (
    <div id="gemini-test-generator-container" className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 dark:bg-slate-900 border border-indigo-500/50 text-slate-100 text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Feature Header Banner */}
      <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-slate-50 dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-xl p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg text-white shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Gemini Unit Test Generator for Obfuscated Methods
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30">
                    Line & Branch Coverage
                  </span>
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Select obfuscated test or target methods. Gemini synthesizes rigorous unit tests targeting every execution branch and edge case, merges them with the obfuscated test class, and enables instant 1-click de-obfuscation back to clean human-readable code.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats or Status Pill */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
              <span>Target Class:</span>
              <code className="text-indigo-600 dark:text-indigo-300 font-mono font-bold">{result.testClassFile.fileName}</code>
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 shadow-xs flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Methods Available:</span>
              <span className="font-bold text-amber-600 dark:text-amber-300">{allMethods.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 1: GEMINI API KEY CONFIGURATION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 text-sm font-semibold">
            <Key className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Google AI Studio / Gemini API Key</span>
            {apiKey.trim() ? (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 font-medium flex items-center gap-1">
                <Check className="w-3 h-3" /> Key Configured
              </span>
            ) : (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Key Required
              </span>
            )}
          </div>

          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 flex items-center gap-1 transition-colors underline underline-offset-2"
          >
            <span>Get a free API key at Google AI Studio</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* API Key Missing Notice */}
        {!apiKey.trim() && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 rounded-lg p-3 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300/90">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-800 dark:text-amber-300">API Key is required for this operation:</span>
              <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                Please enter your Google AI Studio or Gemini API key below to enable automatic branch test generation. Your key remains strictly in your local browser session and is used solely for requesting unit tests from the Gemini API.
              </p>
            </div>
          </div>
        )}

        {/* Key Input Field */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={apiKeyInputRef}
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              placeholder="Enter your Gemini API key (e.g. AIzaSy...)"
              className={`w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs font-mono border rounded-lg pl-3 pr-10 py-2 focus:outline-none transition-all ${
                apiKeyMissingWarning || (!apiKey.trim() && generationError)
                  ? 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-50 dark:bg-amber-950/20'
                  : 'border-slate-300 dark:border-slate-700/80 focus:border-purple-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="gemini-3.8-flash">gemini-3.8-flash (Recommended)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview</option>
            </select>

            {apiKey.trim() && (
              <button
                onClick={handleClearApiKey}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400 border border-slate-200 dark:border-slate-700 rounded-lg text-xs transition-colors"
                title="Clear API key from session"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: METHOD SELECTION & COVERAGE GOALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Method Selector */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 flex flex-col shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                Select Obfuscated Methods for Test Generation
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choose one or multiple methods to synthesize thorough branch and line coverage test cases for.
              </p>
            </div>

            {/* Selection Counter */}
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20 font-medium">
                {selectedMethodsList.length} of {allMethods.length} selected
              </span>
            </div>
          </div>

          {/* Controls: Source filter tabs + Search bar + Quick Select */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setSourceFilter('main')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  sourceFilter === 'main'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Class Target Methods ({mainMethods.length})</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/30 text-indigo-200 font-bold border border-indigo-400/40">
                  Primary
                </span>
              </button>
              <button
                onClick={() => setSourceFilter('test')}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  sourceFilter === 'test'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <TestTube2 className="w-3.5 h-3.5" />
                <span>Test Methods ({testMethods.length})</span>
              </button>
              <button
                onClick={() => setSourceFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  sourceFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                All ({allMethods.length})
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 sm:flex-initial">
              <div className="relative flex-1 sm:w-48">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  value={methodSearch}
                  onChange={(e) => setMethodSearch(e.target.value)}
                  placeholder="Filter methods..."
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs pl-8 pr-2 py-1 rounded-lg border border-slate-300 dark:border-slate-800 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                onClick={handleSelectAllFiltered}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded text-xs transition-colors"
                title="Select all currently visible methods"
              >
                Select All
              </button>
              <button
                onClick={handleClearSelection}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 rounded text-xs transition-colors"
                title="Deselect all methods"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Methods List */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 flex-1">
            {filteredMethods.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
                No methods match the current search filter.
              </div>
            ) : (
              filteredMethods.map((method) => {
                const isSelected = selectedMethodIds.has(method.id);
                const isExpanded = expandedMethodBodyId === method.id;

                return (
                  <div
                    key={method.id}
                    className={`rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-purple-50/70 dark:bg-purple-950/20 border-purple-300 dark:border-purple-500/40 shadow-xs'
                        : 'bg-slate-50/60 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="p-3 flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleMethod(method.id)}
                        className="mt-0.5 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 dark:text-slate-600" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => handleToggleMethod(method.id)}>
                        <div className="flex flex-wrap items-center gap-2 cursor-pointer">
                          <code className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                            {method.name}()
                          </code>

                          {method.originalName && (
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                              orig: {method.originalName}
                            </span>
                          )}

                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-400 font-mono">
                            {method.returnType}
                          </span>

                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              method.sourceClassType === 'test'
                                ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20'
                                : 'bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                            }`}
                          >
                            {method.sourceClassType === 'test' ? 'Test Method' : 'Production Method'}
                          </span>

                          {method.annotations.map((ann, idx) => (
                            <span
                              key={idx}
                              className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-500/10 text-amber-800 dark:text-amber-300/90 border border-amber-200 dark:border-amber-500/20 truncate max-w-[200px]"
                            >
                              {ann}
                            </span>
                          ))}
                        </div>

                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-1 truncate">
                          {method.rawDeclaration}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMethodIds(new Set([method.id]));
                            showStatus(`Selected only ${method.name}()`);
                          }}
                          className="px-2 py-0.5 rounded bg-purple-100 hover:bg-purple-200 dark:bg-purple-500/10 dark:hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[10px] font-semibold border border-purple-200 dark:border-purple-500/20 transition-colors"
                          title="Select only this method for test generation"
                        >
                          Select Only
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedMethodBodyId(isExpanded ? null : method.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                          title={isExpanded ? 'Collapse method code' : 'Preview method body'}
                        >
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Method Body Preview */}
                    {isExpanded && (
                      <div className="px-3 pb-3 border-t border-slate-200 dark:border-slate-800/80 pt-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                          <span>Method Body ({method.endLine - method.startLine + 1} lines):</span>
                          <span>Lines {method.startLine} - {method.endLine}</span>
                        </div>
                        <pre className="text-[11px] font-mono bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-300 p-2.5 rounded border border-slate-200 dark:border-slate-800 overflow-x-auto leading-relaxed max-h-40 whitespace-pre">
                          {method.body}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Generation Configuration & Actions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Coverage & Synthesis Options
            </h4>

            {/* Coverage Goal */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Coverage Goal:</label>
              <div className="space-y-1.5 text-xs">
                <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                  <input
                    type="radio"
                    name="coverageGoal"
                    checked={coverageGoal === 'all_lines_and_branches'}
                    onChange={() => setCoverageGoal('all_lines_and_branches')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">100% Lines & Branches</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Positive execution, negative paths, boundary numbers, exceptions, and loops.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                  <input
                    type="radio"
                    name="coverageGoal"
                    checked={coverageGoal === 'boundary_and_exceptions'}
                    onChange={() => setCoverageGoal('boundary_and_exceptions')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Boundaries & Exception Branches</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      assertThrows, invalid inputs, 0, -1, MAX_VALUE, error codes.
                    </p>
                  </div>
                </label>

                <label className="flex items-start gap-2 p-2 rounded-lg bg-slate-50/80 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700">
                  <input
                    type="radio"
                    name="coverageGoal"
                    checked={coverageGoal === 'edge_cases'}
                    onChange={() => setCoverageGoal('edge_cases')}
                    className="mt-0.5 text-purple-600"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">Null & Edge Case Guards</span>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      NullPointer checks, empty collections, malformed arguments.
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Test Framework */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Test Framework:</label>
              <select
                value={testFramework}
                onChange={(e) => setTestFramework(e.target.value as 'junit5' | 'junit4' | 'testng')}
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs border border-slate-300 dark:border-slate-800 rounded-lg p-2 focus:outline-none focus:border-purple-500 cursor-pointer"
              >
                <option value="junit5">JUnit 5 (Jupiter) - @Test, assertThrows, @DisplayName</option>
                <option value="junit4">JUnit 4 - org.junit.Test, expected exception</option>
                <option value="testng">TestNG - org.testng.annotations.Test</option>
              </select>
            </div>

            {/* Selected Summary & Scoped AI Context Pill */}
            <div className="bg-slate-50 dark:bg-slate-950/80 rounded-lg p-3 border border-slate-200 dark:border-slate-800/80 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Selected Methods:</span>
                <span className="font-bold text-purple-600 dark:text-purple-300 font-mono">
                  {selectedMethodsList.length} of {allMethods.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Target Test File:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{result.testClassFile.fileName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>Model:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedModel}</span>
              </div>

              {/* Scoped Context Preview Status */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Scoped AI Context:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsScopedSectionExpanded(!isScopedSectionExpanded)}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 underline underline-offset-2 flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>{isScopedSectionExpanded ? 'Hide Scoped Code' : 'Inspect Scoped Code'}</span>
                    {isScopedSectionExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 font-mono">
                  <div className="flex items-center justify-between">
                    <span>Target Class:</span>
                    <span className="text-indigo-600 dark:text-indigo-300 font-semibold">
                      {scopedContext.retainedMainMethods.length} methods ({scopedContext.dependentPrivateMethods.length} private)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Test Class:</span>
                    <span className="text-purple-600 dark:text-purple-300 font-semibold">
                      {scopedContext.setupTestMethods.length} setup + {scopedContext.relatedTestMethods.length} tests
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {generationError && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 rounded-lg p-3 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
                <span>{generationError}</span>
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="pt-2">
            <button
              onClick={handleGenerateTests}
              disabled={isGenerating || selectedMethodsList.length === 0}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-purple-200" />
                  <span>{generationStep || 'Generating Tests with Gemini...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  <span>Generate Branch & Line Coverage Tests</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2.5: SCOPED OBFUSCATED CLASSES FOR AI CONTEXT (COLLAPSIBLE) */}
      <div id="scoped-classes-container" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all shadow-sm">
        {/* Collapsed / Expandable Header Bar */}
        <button
          type="button"
          onClick={() => setIsScopedSectionExpanded(!isScopedSectionExpanded)}
          className="w-full p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Scoped Obfuscated Classes for AI Context
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/30 font-semibold">
                  Selected Target Methods & Dependent Private Helpers
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Sends an updated copy of the class with only selected methods and dependent private methods, plus setup fixtures and related tests in the test class (all obfuscated).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                Class: {scopedContext.retainedMainMethods.length} methods ({scopedContext.dependentPrivateMethods.length} priv)
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                Test: {scopedContext.setupTestMethods.length} setup + {scopedContext.relatedTestMethods.length} tests
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-colors">
              <span>{isScopedSectionExpanded ? 'Collapse Scoped Classes' : 'Expand & Check Scoped Classes'}</span>
              {isScopedSectionExpanded ? (
                <ChevronDown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              )}
            </div>
          </div>
        </button>

        {/* Expanded Content Body */}
        {isScopedSectionExpanded && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 space-y-4 animate-in fade-in duration-200">
            {/* Context optimization notice */}
            <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 rounded-lg p-3 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                  Target-Focused AI Context Optimization:
                </span>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Only your selected target methods and their dependent private helper methods are preserved in the obfuscated production class. Unrelated production methods are omitted to eliminate model distractions. Similarly, the companion test class is pruned to retain only setup mocks (<code className="text-indigo-600 dark:text-indigo-300 font-mono">@BeforeEach</code>, mocks, fixtures) and related tests that reference the target methods.
                </p>
              </div>
            </div>

            {/* Methods Breakdown Badges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Production Class Methods Breakdown */}
              <div className="bg-white dark:bg-slate-900/80 rounded-lg p-3 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Code2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    Production Class ({result.mainClassFile.fileName})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {scopedContext.retainedMainMethods.length} included • {scopedContext.omittedMainMethods.length} omitted
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scopedContext.retainedMainMethods.map((m) => {
                    const isDependent = scopedContext.dependentPrivateMethods.some((d) => d.id === m.id);
                    return (
                      <span
                        key={m.id}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center gap-1 border ${
                          isDependent
                            ? 'bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/30'
                            : 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                        }`}
                      >
                        <span>{m.name}()</span>
                        <span className="text-[9px] px-1 rounded bg-slate-200/80 dark:bg-black/30 font-sans">
                          {isDependent ? 'private helper' : 'target'}
                        </span>
                      </span>
                    );
                  })}
                  {scopedContext.omittedMainMethods.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] font-mono border border-slate-200 dark:border-slate-700/60">
                      +{scopedContext.omittedMainMethods.length} omitted methods
                    </span>
                  )}
                </div>
              </div>

              {/* Test Class Methods Breakdown */}
              <div className="bg-white dark:bg-slate-900/80 rounded-lg p-3 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <TestTube2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    Companion Test Class ({result.testClassFile.fileName})
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {scopedContext.setupTestMethods.length + scopedContext.relatedTestMethods.length} included • {scopedContext.omittedTestMethods.length} omitted
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {scopedContext.setupTestMethods.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30 text-[11px] font-mono flex items-center gap-1"
                    >
                      <span>{m.name}()</span>
                      <span className="text-[9px] px-1 rounded bg-slate-200/80 dark:bg-black/30 font-sans">setup fixture</span>
                    </span>
                  ))}
                  {scopedContext.relatedTestMethods.map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 text-[11px] font-mono flex items-center gap-1"
                    >
                      <span>{m.name}()</span>
                      <span className="text-[9px] px-1 rounded bg-slate-200/80 dark:bg-black/30 font-sans">related test</span>
                    </span>
                  ))}
                  {scopedContext.omittedTestMethods.length > 0 && (
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 text-[11px] font-mono border border-slate-200 dark:border-slate-700/60">
                      +{scopedContext.omittedTestMethods.length} omitted tests
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* View Tab Selector + Copy Actions */}
            <div className="flex items-center justify-between gap-2 flex-wrap pt-2">
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setScopedViewTab('main')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    scopedViewTab === 'main'
                      ? 'bg-indigo-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Scoped Production Class ({scopedContext.retainedMainMethods.length} methods)
                </button>
                <button
                  type="button"
                  onClick={() => setScopedViewTab('test')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    scopedViewTab === 'test'
                      ? 'bg-purple-600 text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Scoped Test Class ({scopedContext.setupTestMethods.length + scopedContext.relatedTestMethods.length} methods)
                </button>
                <button
                  type="button"
                  onClick={() => setScopedViewTab('side-by-side')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    scopedViewTab === 'side-by-side'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Side-by-Side View
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    copyToClipboard(
                      scopedViewTab === 'test' ? scopedContext.scopedTestCode : scopedContext.scopedClassCode,
                      'scoped-code-copy'
                    )
                  }
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                >
                  {copiedKey === 'scoped-code-copy' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  <span>Copy Active Scoped Class</span>
                </button>
              </div>
            </div>

            {/* Code Display */}
            {scopedViewTab === 'side-by-side' ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                  <div className="bg-slate-100 dark:bg-slate-900 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                      Scoped {result.mainClassFile.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {scopedContext.scopedClassCode.split('\n').length} lines
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={scopedContext.scopedClassCode}
                    rows={12}
                    className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                  />
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                  <div className="bg-slate-100 dark:bg-slate-900 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                      Scoped {result.testClassFile.fileName}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {scopedContext.scopedTestCode.split('\n').length} lines
                    </span>
                  </div>
                  <textarea
                    readOnly
                    value={scopedContext.scopedTestCode}
                    rows={12}
                    className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-emerald-800 dark:text-emerald-300/90 p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                  />
                </div>
              </div>
            ) : scopedViewTab === 'main' ? (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-indigo-700 dark:text-indigo-300">
                    Scoped Obfuscated Production Class ({result.mainClassFile.fileName})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {scopedContext.scopedClassCode.split('\n').length} lines • {scopedContext.retainedMainMethods.length} methods
                  </span>
                </div>
                <textarea
                  readOnly
                  value={scopedContext.scopedClassCode}
                  rows={14}
                  className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-3.5 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                />
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="bg-slate-100 dark:bg-slate-900 px-4 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                    Scoped Obfuscated Test Class ({result.testClassFile.fileName})
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {scopedContext.scopedTestCode.split('\n').length} lines • {scopedContext.setupTestMethods.length + scopedContext.relatedTestMethods.length} methods
                  </span>
                </div>
                <textarea
                  readOnly
                  value={scopedContext.scopedTestCode}
                  rows={14}
                  className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-emerald-800 dark:text-emerald-300/90 p-3.5 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: GENERATED TEST OUTPUT & DE-OBFUSCATION PANEL */}
      {generatedResult && (
        <div id="gemini-results-section" className="bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-500/30 rounded-xl p-5 space-y-4 shadow-sm animate-in fade-in duration-300">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Tests Generated Successfully
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                    +{generatedResult.stats.methodsGenerated} test methods • +{generatedResult.stats.linesAdded} lines
                  </span>
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                The generated unit tests use the exact obfuscated names and are ready to be integrated into the obfuscated test suite or de-obfuscated back into clean code.
              </p>
            </div>

            {/* Crucial Action: Button to De-Obfuscate the Updated Obfuscated Test Class */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                id="deobfuscate-updated-test-btn"
                onClick={handleManualDeobfuscate}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                title="De-obfuscate the updated obfuscated test class back to original identifiers"
              >
                <RotateCcw className="w-4 h-4 text-emerald-200" />
                <span>De-Obfuscate Updated Test Class</span>
              </button>

              <button
                onClick={() =>
                  onApplyMergedTest(
                    generatedResult.mergedObfuscatedTestCode,
                    generatedResult.deobfuscatedMergedTestCode
                  )
                }
                className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                title="Apply merged test class to main workspace editor"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Apply to Main Workspace</span>
              </button>

              <button
                onClick={() =>
                  onNavigateToDeobfuscator(
                    result.mainClassFile.obfuscatedCode,
                    generatedResult.mergedObfuscatedTestCode
                  )
                }
                className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Open in dedicated De-Obfuscate tab"
              >
                <Share2 className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Open in De-Obfuscator Tab</span>
              </button>
            </div>
          </div>

          {/* View Mode Toggle: Split View, Merged Obfuscated, De-Obfuscated Restored, New Tests Only */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <button
                onClick={() => setActiveResultView('split')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeResultView === 'split'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Side-by-Side (Obfuscated vs Restored)
              </button>
              <button
                onClick={() => setActiveResultView('merged')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeResultView === 'merged'
                    ? 'bg-purple-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Updated Obfuscated Test Class
              </button>
              <button
                onClick={() => setActiveResultView('deobfuscated')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeResultView === 'deobfuscated'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Restored De-Obfuscated Test Class
              </button>
              <button
                onClick={() => setActiveResultView('new-tests')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeResultView === 'new-tests'
                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Generated Test Snippets ({generatedResult.individualMethods.length})
              </button>
              <button
                onClick={() => setActiveResultView('diff')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  activeResultView === 'diff'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1">
                  <GitCompare className="w-3 h-3" />
                  Diff vs Original
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  copyToClipboard(
                    activeResultView === 'deobfuscated'
                      ? generatedResult.deobfuscatedMergedTestCode
                      : generatedResult.mergedObfuscatedTestCode,
                    'active-view-copy'
                  )
                }
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
              >
                {copiedKey === 'active-view-copy' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span>Copy Current View</span>
              </button>

              <button
                onClick={() =>
                  downloadFile(
                    generatedResult.mergedObfuscatedTestCode,
                    result.testClassFile.fileName
                  )
                }
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                title="Download updated obfuscated test file"
              >
                <Download className="w-3.5 h-3.5 text-slate-400" />
                <span>Download Obfuscated</span>
              </button>
            </div>
          </div>

          {/* VIEW: SIDE-BY-SIDE (OBFUSCATED VS RESTORED DE-OBFUSCATED) */}
          {activeResultView === 'split' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column: Obfuscated Merged Test */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 dark:bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-purple-500 dark:bg-purple-400"></span>
                    <span className="font-bold text-purple-700 dark:text-purple-300">
                      Updated Obfuscated Test Class ({result.testClassFile.fileName})
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      copyToClipboard(generatedResult.mergedObfuscatedTestCode, 'split-obf-copy')
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    title="Copy obfuscated test code"
                  >
                    {copiedKey === 'split-obf-copy' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={generatedResult.mergedObfuscatedTestCode}
                  rows={isFullScreen ? 22 : 14}
                  className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-emerald-800 dark:text-emerald-300/90 p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                />
              </div>

              {/* Right Column: De-Obfuscated Restored Test */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                <div className="bg-slate-100/90 dark:bg-slate-900/90 px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400"></span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300">
                      De-Obfuscated Restored Test Class ({testFileName})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        copyToClipboard(
                          generatedResult.deobfuscatedMergedTestCode,
                          'split-deobf-copy'
                        )
                      }
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Copy de-obfuscated restored test code"
                    >
                      {copiedKey === 'split-deobf-copy' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() =>
                        downloadFile(generatedResult.deobfuscatedMergedTestCode, testFileName)
                      }
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Download de-obfuscated test file"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={generatedResult.deobfuscatedMergedTestCode}
                  rows={isFullScreen ? 22 : 14}
                  className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-3 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* VIEW: SINGLE UPDATED OBFUSCATED TEST CLASS */}
          {activeResultView === 'merged' && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="bg-slate-100/90 dark:bg-slate-900/90 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-purple-700 dark:text-purple-300 font-mono">
                  {result.testClassFile.fileName} (Updated with {generatedResult.stats.methodsGenerated} new branch tests)
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(generatedResult.mergedObfuscatedTestCode, 'merged-obf-view')
                  }
                  className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 shadow-xs"
                >
                  {copiedKey === 'merged-obf-view' ? (
                    <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                  <span>Copy Code</span>
                </button>
              </div>
              <textarea
                readOnly
                value={generatedResult.mergedObfuscatedTestCode}
                rows={isFullScreen ? 24 : 16}
                className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-emerald-800 dark:text-emerald-300/90 p-4 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
              />
            </div>
          )}

          {/* VIEW: RESTORED DE-OBFUSCATED TEST CLASS */}
          {activeResultView === 'deobfuscated' && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-emerald-300 dark:border-emerald-500/30 overflow-hidden">
              <div className="bg-slate-100/90 dark:bg-slate-900/90 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 font-mono">
                    {testFileName} (De-Obfuscated with AI Generated Branch Coverage Tests)
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                    Restored Human-Readable Identifiers
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(generatedResult.deobfuscatedMergedTestCode, 'deobf-view')
                    }
                    className="px-2 py-0.5 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 shadow-xs"
                  >
                    {copiedKey === 'deobf-view' ? (
                      <Check className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                    <span>Copy Restored Code</span>
                  </button>
                  <button
                    onClick={() =>
                      downloadFile(generatedResult.deobfuscatedMergedTestCode, testFileName)
                    }
                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1 shadow-xs"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={generatedResult.deobfuscatedMergedTestCode}
                rows={isFullScreen ? 24 : 16}
                className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 p-4 focus:outline-none resize-y whitespace-pre overflow-x-auto leading-relaxed"
              />
            </div>
          )}

          {/* VIEW: INDIVIDUAL GENERATED TEST SNIPPETS */}
          {activeResultView === 'new-tests' && (
            <div className="space-y-3">
              {generatedResult.individualMethods.map((m, idx) => (
                <div key={idx} className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <div className="bg-slate-100/90 dark:bg-slate-900/90 px-3.5 py-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-purple-700 dark:text-purple-300">{m.name}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-500/20">
                        {m.branchDescription}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(m.code, `snippet-${idx}`)}
                      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      title="Copy this test method"
                    >
                      {copiedKey === `snippet-${idx}` ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <pre className="text-xs font-mono p-3 bg-slate-50 dark:bg-slate-950 text-emerald-800 dark:text-emerald-300/90 overflow-x-auto whitespace-pre leading-relaxed">
                    {m.code}
                  </pre>
                </div>
              ))}
            </div>
          )}

          {/* VIEW: DIFF (ORIGINAL OBFUSCATED TEST VS UPDATED OBFUSCATED TEST) */}
          {activeResultView === 'diff' && (
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl border border-amber-300 dark:border-amber-500/30 overflow-hidden">
              <div className="bg-slate-100/90 dark:bg-slate-900/90 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <GitCompare className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Line Difference: Original Obfuscated vs Merged Obfuscated
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20">
                    +{generatedResult.stats.linesAdded} lines added
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(generatedResult.mergedObfuscatedTestCode, 'diff-copy')}
                  className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-xs font-medium flex items-center gap-1 shadow-xs"
                >
                  {copiedKey === 'diff-copy' ? <Check className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>Copy Updated Code</span>
                </button>
              </div>
              <div className="p-3 text-xs font-mono max-h-[500px] overflow-y-auto leading-relaxed divide-y divide-slate-200 dark:divide-slate-800/40 bg-slate-50 dark:bg-slate-950">
                {generatedResult.mergedObfuscatedTestCode.split('\n').map((line, idx) => {
                  const isGenerated =
                    line.includes('[AI GENERATED OBFUSCATED TESTS') ||
                    (line.trim().length > 0 && generatedResult.generatedTestsCode.includes(line.trim())) ||
                    generatedResult.newImports.some((imp) => imp.trim().length > 0 && line.includes(imp.trim()));

                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 px-2 py-0.5 ${
                        isGenerated
                          ? 'bg-emerald-100/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-l-2 border-emerald-500'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      <span className="w-8 shrink-0 text-right text-slate-400 dark:text-slate-600 select-none text-[11px]">
                        {idx + 1}
                      </span>
                      <span className="w-4 shrink-0 text-center select-none font-bold">
                        {isGenerated ? '+' : ' '}
                      </span>
                      <span className="whitespace-pre overflow-x-auto flex-1">{line || ' '}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
