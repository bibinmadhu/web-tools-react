import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  Copy,
  Check,
  FileJson,
  Database,
  AlertTriangle,
  CheckCircle2,
  Bookmark,
  Trash2,
  Sparkles,
  ArrowRight,
  FileText,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';
import {
  CategoryMatcherConfig,
  createMatcherConfigExport,
  validateAndParseMatcherConfig,
  CATEGORY_MATCHER_PRESETS,
} from '../../utils/dbCategoryMatcher';

export interface CategoryMatcherConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: CategoryMatcherConfig;
  onApplyConfig: (config: CategoryMatcherConfig) => void;
  initialTab?: 'import' | 'export' | 'saved';
}

const STORAGE_KEY_SAVED_CONFIGS = 'devhub_db_category_matcher_saved_configs';

export const CategoryMatcherConfigModal: React.FC<CategoryMatcherConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyConfig,
  initialTab = 'import',
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'saved'>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Export State
  const [exportName, setExportName] = useState<string>('');
  const [exportDescription, setExportDescription] = useState<string>('');
  const [copiedExport, setCopiedExport] = useState<boolean>(false);

  // Import State
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<{
    success: boolean;
    config?: CategoryMatcherConfig;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Saved Templates
  const [savedConfigs, setSavedConfigs] = useState<CategoryMatcherConfig[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_SAVED_CONFIGS);
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  });
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setExportName(currentConfig.metadata?.name || 'Category Matcher Config');
      setExportDescription(currentConfig.metadata?.description || '');
      setCopiedExport(false);
      setImportJsonText('');
      setImportFileName(null);
      setParseResult(null);
      setSaveSuccessMessage(null);
    }
  }, [isOpen, currentConfig]);

  // Handle Real-Time JSON Input Parsing
  useEffect(() => {
    if (!importJsonText.trim()) {
      setParseResult(null);
      return;
    }
    const result = validateAndParseMatcherConfig(importJsonText);
    setParseResult(result);
  }, [importJsonText]);

  if (!isOpen) return null;

  // Prepare Export JSON Payload
  const configToExport: CategoryMatcherConfig = {
    ...currentConfig,
    metadata: {
      ...currentConfig.metadata,
      name: exportName || currentConfig.metadata.name,
      description: exportDescription || currentConfig.metadata.description,
      updatedAt: new Date().toISOString(),
    },
  };
  const exportJsonString = createMatcherConfigExport(configToExport);

  const handleCopyExportJson = () => {
    navigator.clipboard.writeText(exportJsonString);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  const handleDownloadExportJson = () => {
    const blob = new Blob([exportJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = (exportName || 'category_matcher_config')
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportJsonText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (parseResult?.success && parseResult.config) {
      onApplyConfig(parseResult.config);
      onClose();
    }
  };

  const handleSaveCurrentAsTemplate = () => {
    const titleToSave = newTemplateName.trim() || exportName.trim() || currentConfig.metadata.name;
    const templateToSave: CategoryMatcherConfig = {
      ...currentConfig,
      metadata: {
        ...currentConfig.metadata,
        name: titleToSave,
        description: exportDescription || currentConfig.metadata.description,
        updatedAt: new Date().toISOString(),
      },
    };

    const updated = [templateToSave, ...savedConfigs.filter((c) => c.metadata.name !== titleToSave)];
    setSavedConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CONFIGS, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    setNewTemplateName('');
    setSaveSuccessMessage(`Saved "${titleToSave}" to local templates.`);
    setTimeout(() => setSaveSuccessMessage(null), 3000);
  };

  const handleDeleteSavedConfig = (nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedConfigs.filter((c) => c.metadata.name !== nameToDelete);
    setSavedConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CONFIGS, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  const handleApplySavedTemplate = (config: CategoryMatcherConfig) => {
    onApplyConfig(config);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Category Matcher Configuration
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Import, export, and manage reusable category validation rule configurations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/30 dark:bg-slate-900/30">
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            Import Configuration
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Export Configuration
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'saved'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            Saved Templates ({savedConfigs.length + CATEGORY_MATCHER_PRESETS.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: IMPORT */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-900 dark:text-indigo-200">
                <div className="flex items-center gap-2.5">
                  <FileJson className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    Upload a <code>.json</code> configuration file or paste exported JSON below.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shrink-0 transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Select File
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />
              </div>

              {importFileName && (
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-slate-700 dark:text-slate-300">
                  <span className="font-mono truncate">Loaded: {importFileName}</span>
                  <button
                    onClick={() => {
                      setImportFileName(null);
                      setImportJsonText('');
                    }}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    Clear
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Configuration JSON
                </label>
                <textarea
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder={`Paste configuration JSON here, e.g.:
{
  "targetTable": { "tableName": "business_entities" },
  "categories": [ ... ],
  "metricColumns": [ ... ]
}`}
                  rows={9}
                  className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Validation Result Box */}
              {parseResult && (
                <div
                  className={`p-4 rounded-xl border text-xs flex items-start gap-3 ${
                    parseResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  {parseResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    {parseResult.success && parseResult.config ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-sm">Valid Category Configuration Detected</div>
                        <div className="text-slate-600 dark:text-slate-300">
                          <strong>{parseResult.config.metadata.name}</strong> • Target Table:{' '}
                          <code className="bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.5 rounded">
                            {parseResult.config.targetTable.tableName}
                          </code>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40">
                            {parseResult.config.categories.length} Categories
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40">
                            {parseResult.config.metricColumns.length} Metric Columns
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40">
                            Rule Logic: {parseResult.config.ruleLogic.type}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-semibold">Invalid Configuration</div>
                        <div className="mt-0.5 text-rose-700 dark:text-rose-300 font-mono text-[11px]">
                          {parseResult.error}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Configuration Name
                  </label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="e.g. EU SME Business Classification 2026"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={exportDescription}
                    onChange={(e) => setExportDescription(e.target.value)}
                    placeholder="Brief description of category rules & thresholds"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Export JSON Preview
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyExportJson}
                      className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedExport ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600 font-medium">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleDownloadExportJson}
                      className="px-2.5 py-1 text-xs rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download File
                    </button>
                  </div>
                </div>
                <textarea
                  readOnly
                  value={exportJsonString}
                  rows={10}
                  className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden"
                />
              </div>

              {/* Quick Save to Local Templates */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Bookmark className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-slate-700 dark:text-slate-300">
                    Save this configuration into your browser's local templates for instant access
                  </span>
                </div>
                <button
                  onClick={handleSaveCurrentAsTemplate}
                  className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-medium transition-colors cursor-pointer shrink-0"
                >
                  Save to Local Templates
                </button>
              </div>

              {saveSuccessMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {saveSuccessMessage}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SAVED & PRESETS */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {/* Presets Section */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Built-in Industry Presets
                </h3>
                <div className="grid grid-cols-1 gap-2.5">
                  {CATEGORY_MATCHER_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleApplySavedTemplate(preset.config)}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-white dark:bg-slate-800/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {preset.name}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {preset.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] text-slate-400 font-mono">
                          {preset.config.categories.length} categories
                        </span>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* User Saved Section */}
              <div className="pt-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                  Your Saved Templates ({savedConfigs.length})
                </h3>

                {savedConfigs.length === 0 ? (
                  <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 text-xs">
                    No custom templates saved yet. Switch to the <strong>Export</strong> tab to save your current configuration.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedConfigs.map((cfg, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleApplySavedTemplate(cfg)}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 bg-white dark:bg-slate-800/60 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20 transition-all cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 pr-3">
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                            {cfg.metadata.name}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Table: <code>{cfg.targetTable.tableName}</code> • {cfg.categories.length} categories • {cfg.metricColumns.length} metrics
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => handleDeleteSavedConfig(cfg.metadata.name, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeTab === 'import' && parseResult?.success && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ✓ Ready to apply configuration
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {activeTab === 'import' && (
              <button
                disabled={!parseResult?.success}
                onClick={handleApplyImport}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Apply Configuration
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
