import React, { useState, useEffect } from 'react';
import {
  X,
  Upload,
  Download,
  Copy,
  Check,
  FileJson,
  AlertTriangle,
  FolderOpen,
  Bookmark,
  Trash2,
  Sparkles,
} from 'lucide-react';
import {
  QueryBuilderConfig,
  createDbQueryBuilderExport,
  validateAndParseDbQueryBuilderConfig,
  QUERY_BUILDER_PRESETS,
} from '../../utils/dbQueryBuilder';

interface DbQueryBuilderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: QueryBuilderConfig;
  onApplyConfig: (config: QueryBuilderConfig) => void;
}

const LOCAL_STORAGE_SAVED_TEMPLATES_KEY = 'devhub_query_builder_saved_templates';

interface SavedTemplate {
  id: string;
  name: string;
  savedAt: string;
  config: QueryBuilderConfig;
}

export const DbQueryBuilderConfigModal: React.FC<DbQueryBuilderConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onApplyConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'templates'>('export');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importPreview, setImportPreview] = useState<QueryBuilderConfig | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [templateNameInput, setTemplateNameInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Load saved templates from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_TEMPLATES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedTemplates(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const exportJsonString = createDbQueryBuilderExport(currentConfig);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportJsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `query-builder-${currentConfig.targetTable.tableName || 'config'}.json`;
    const blob = new Blob([exportJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleTextChange = (text: string) => {
    setImportText(text);
    if (!text.trim()) {
      setImportError(null);
      setImportPreview(null);
      return;
    }

    const res = validateAndParseDbQueryBuilderConfig(text);
    if (res.success && res.config) {
      setImportError(null);
      setImportPreview(res.config);
    } else {
      setImportError(res.error || 'Invalid configuration JSON format');
      setImportPreview(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleTextChange(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleApplyImport = () => {
    if (importPreview) {
      onApplyConfig(importPreview);
      onClose();
    }
  };

  const handleSaveToTemplates = () => {
    const name = templateNameInput.trim() || currentConfig.metadata.name || `${currentConfig.targetTable.tableName} Config`;
    const newTemplate: SavedTemplate = {
      id: `tmpl-${Date.now()}`,
      name,
      savedAt: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString(),
      config: JSON.parse(JSON.stringify(currentConfig)),
    };

    const updated = [newTemplate, ...savedTemplates];
    setSavedTemplates(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
    setTemplateNameInput('');
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleDeleteTemplate = (id: string) => {
    const updated = savedTemplates.filter((t) => t.id !== id);
    setSavedTemplates(updated);
    try {
      localStorage.setItem(LOCAL_STORAGE_SAVED_TEMPLATES_KEY, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center space-x-2">
            <FileJson className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Query Builder Configuration Manager
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-white dark:bg-slate-900">
          <button
            onClick={() => setActiveTab('export')}
            className={`py-3 px-4 font-medium text-sm flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Configuration</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-3 px-4 font-medium text-sm flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import Configuration</span>
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-3 px-4 font-medium text-sm flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'templates'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            <span>Presets & Templates</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Export Active Configuration
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Target Table: <code className="text-indigo-600 dark:text-indigo-400">{currentConfig.targetTable.tableName}</code> •{' '}
                    Single Conditions: {currentConfig.singleConditions.length} • List Conditions: {currentConfig.listConditions.length}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              {/* JSON Code Viewer */}
              <div className="relative">
                <textarea
                  readOnly
                  value={exportJsonString}
                  rows={14}
                  className="w-full font-mono text-xs p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-none select-all"
                />
              </div>

              {/* Save to Browser Templates */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex-1 mr-3">
                  <input
                    type="text"
                    placeholder="Custom template name (e.g. Orders High Value Audit)..."
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={handleSaveToTemplates}
                  className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 transition whitespace-nowrap"
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>Save to My Templates</span>
                </button>
              </div>
              {saveSuccessMsg && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ Template saved to your browser storage!
                </p>
              )}
            </div>
          )}

          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Import Configuration JSON
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Paste configuration JSON or upload a previously exported configuration file.
                  </p>
                </div>
                <label className="cursor-pointer flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition">
                  <Upload className="w-4 h-4" />
                  <span>Upload .json File</span>
                  <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Textarea */}
              <textarea
                value={importText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Paste your configuration JSON here..."
                rows={11}
                className="w-full font-mono text-xs p-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />

              {/* Feedback Alert */}
              {importError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 flex items-start space-x-2 text-rose-700 dark:text-rose-400 text-xs">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {importPreview && (
                <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="flex items-center font-semibold">
                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                    Valid Configuration Detected: {importPreview.metadata.name || 'Untitled'}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-slate-700 dark:text-slate-300">
                    <div>
                      <span className="text-slate-500">Target Table:</span>{' '}
                      <span className="font-mono font-medium">{importPreview.targetTable.tableName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Query Type:</span>{' '}
                      <span className="font-medium text-indigo-600 dark:text-indigo-400">{importPreview.queryType}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Single Rules:</span>{' '}
                      <span className="font-medium">{importPreview.singleConditions.length}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">List Rules:</span>{' '}
                      <span className="font-medium">{importPreview.listConditions.length}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  disabled={!importPreview}
                  onClick={handleApplyImport}
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply & Load Configuration</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-5">
              {/* Presets */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Built-in Industry Presets</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUERY_BUILDER_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:border-indigo-400 dark:hover:border-indigo-600 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {preset.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-medium">
                            {preset.badge}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{preset.description}</p>
                      </div>
                      <button
                        onClick={() => {
                          onApplyConfig(preset.config);
                          onClose();
                        }}
                        className="w-full text-xs font-medium py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-200 transition"
                      >
                        Load This Preset
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Saved User Templates */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center space-x-1.5">
                  <Bookmark className="w-3.5 h-3.5 text-indigo-500" />
                  <span>My Saved Browser Templates</span>
                </h4>
                {savedTemplates.length === 0 ? (
                  <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs text-slate-500">
                    No custom templates saved yet. You can save your current configuration from the "Export Configuration" tab.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedTemplates.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">{item.name}</div>
                          <div className="text-[11px] text-slate-400">
                            Table: <code className="text-indigo-500">{item.config.targetTable.tableName}</code> • Saved on {item.savedAt}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              onApplyConfig(item.config);
                              onClose();
                            }}
                            className="px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteTemplate(item.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
