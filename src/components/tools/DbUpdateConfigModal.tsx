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
  MatchColumn,
  UpdateColumn,
  QueryExecutionMode,
  UpdateStrategy,
  TransactionMode,
  DbUpdateConfig,
  createDbUpdateConfigExport,
  validateAndParseDbUpdateConfig,
} from '../../utils/dbUpdateQueryGenerator';

export interface DbUpdateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfigData: {
    tableName: string;
    matchColumns: MatchColumn[];
    updateColumns: UpdateColumn[];
    executionMode: QueryExecutionMode;
    strategy: UpdateStrategy;
    transactionMode: TransactionMode;
    returningClause: string;
    includeTypeCasts: boolean;
    includeRowComments: boolean;
  };
  onApplyConfig: (config: DbUpdateConfig) => void;
  initialTab?: 'import' | 'export' | 'saved';
}

const STORAGE_KEY_SAVED_CONFIGS = 'devhub_db_update_saved_configs';

export const DbUpdateConfigModal: React.FC<DbUpdateConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfigData,
  onApplyConfig,
  initialTab = 'import',
}) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'saved'>(initialTab);

  // Sync initialTab when modal opens
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
    config?: DbUpdateConfig;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Saved Templates in Browser Storage
  const [savedConfigs, setSavedConfigs] = useState<DbUpdateConfig[]>(() => {
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

  // Reset export name on open
  useEffect(() => {
    if (isOpen) {
      setExportName(`${currentConfigData.tableName || 'table'}_update_config`);
      setExportDescription(`Configuration for updating ${currentConfigData.tableName || 'table'} table`);
      setCopiedExport(false);
      setImportJsonText('');
      setImportFileName(null);
      setParseResult(null);
      setSaveSuccessMessage(null);
    }
  }, [isOpen, currentConfigData.tableName]);

  // Generate current export object
  const currentExportObject = React.useMemo(() => {
    return createDbUpdateConfigExport({
      ...currentConfigData,
      name: exportName || `${currentConfigData.tableName || 'table'}_update_config`,
      description: exportDescription,
    });
  }, [currentConfigData, exportName, exportDescription]);

  const currentExportJsonString = React.useMemo(() => {
    return JSON.stringify(currentExportObject, null, 2);
  }, [currentExportObject]);

  // Validate pasted text
  const handleImportTextChange = (text: string) => {
    setImportJsonText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const res = validateAndParseDbUpdateConfig(text);
    setParseResult(res);
  };

  // File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      const res = validateAndParseDbUpdateConfig(content);
      setParseResult(res);
    };
    reader.onerror = () => {
      setParseResult({
        success: false,
        error: `Could not read file "${file.name}".`,
      });
    };
    reader.readAsText(file);
    // Reset file input value
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Download exported JSON
  const handleDownloadExport = () => {
    const blob = new Blob([currentExportJsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanName = (exportName || currentConfigData.tableName || 'db_update').toLowerCase().replace(/[^a-z0-9_-]/gi, '_');
    link.download = `${cleanName}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy exported JSON
  const handleCopyExport = () => {
    navigator.clipboard.writeText(currentExportJsonString);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2200);
  };

  // Save current config to localStorage
  const handleSaveToBrowserTemplates = () => {
    const nameToUse = newTemplateName.trim() || exportName.trim() || `${currentConfigData.tableName} Template`;
    const newConfigToSave = createDbUpdateConfigExport({
      ...currentConfigData,
      name: nameToUse,
      description: exportDescription,
    });

    const updated = [newConfigToSave, ...savedConfigs.filter((c) => c.name !== nameToUse)];
    setSavedConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CONFIGS, JSON.stringify(updated));
      setSaveSuccessMessage(`Saved template "${nameToUse}" to browser memory.`);
      setNewTemplateName('');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (e) {
      setSaveSuccessMessage('Error saving to browser storage.');
    }
  };

  // Delete a saved template
  const handleDeleteSavedTemplate = (index: number) => {
    const updated = savedConfigs.filter((_, idx) => idx !== index);
    setSavedConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CONFIGS, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Apply parsed config
  const handleApplyConfig = (config: DbUpdateConfig) => {
    onApplyConfig(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      id="db-config-modal-backdrop"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="db-config-modal-dialog"
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <FileJson className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                Configuration Manager
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-normal border border-slate-700">
                  JSON Reusable
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Export and import table structures, matching rules, column types, and execution options
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('import')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'import'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import Config</span>
            </button>

            <button
              onClick={() => setActiveTab('export')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'export'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Config</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'saved'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Saved Templates ({savedConfigs.length})</span>
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Table: <span className="text-slate-200 font-semibold">{currentConfigData.tableName || 'my_table'}</span>
          </div>
        </div>

        {/* Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: IMPORT CONFIG */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* File Upload Dropzone */}
              <div className="border-2 border-dashed border-slate-750 hover:border-indigo-500/70 rounded-xl p-5 text-center bg-slate-950/50 transition-all">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="config-file-picker-input"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer"
                    >
                      Choose a JSON configuration file
                    </button>
                    <span className="text-slate-400 text-sm"> or drag & drop here</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Supports JSON files exported from this tool or valid configurations with table and columns
                  </p>
                  {importFileName && (
                    <div className="mt-1 px-3 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-slate-200 flex items-center gap-2">
                      <FileJson className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-mono">{importFileName}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Paste JSON Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    Or Paste Configuration JSON:
                  </label>
                  {importJsonText && (
                    <button
                      onClick={() => handleImportTextChange('')}
                      className="text-[11px] text-slate-400 hover:text-slate-200"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={importJsonText}
                  onChange={(e) => handleImportTextChange(e.target.value)}
                  placeholder={`{\n  "tableName": "users",\n  "matchColumns": [...],\n  "updateColumns": [...],\n  "executionMode": "batch"\n}`}
                  rows={6}
                  spellCheck={false}
                  className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
                />
              </div>

              {/* Parse & Validation Feedback Card */}
              {parseResult && (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    parseResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {parseResult.success ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="flex-1 space-y-2 text-xs">
                      {parseResult.success && parseResult.config ? (
                        <>
                          <div className="font-semibold text-emerald-200 text-sm flex items-center justify-between">
                            <span>Valid Configuration Detected</span>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 font-mono">
                              Ready to Apply
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300 pt-1">
                            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[10px] uppercase font-mono">Target Table</span>
                              <strong className="text-indigo-300 font-mono text-sm">
                                {parseResult.config.tableName}
                              </strong>
                            </div>

                            <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800">
                              <span className="text-slate-400 block text-[10px] uppercase font-mono">Execution & Strategy</span>
                              <span className="font-semibold text-slate-200">
                                {parseResult.config.executionMode.toUpperCase()} ({parseResult.config.strategy})
                              </span>
                            </div>
                          </div>

                          {/* Match Columns preview */}
                          <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">
                              Match Columns ({parseResult.config.matchColumns.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {parseResult.config.matchColumns.map((mc, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/60 text-amber-300 font-mono text-[11px]"
                                >
                                  {mc.name} ({mc.type} • {mc.valueMode === 'single' ? 'single value' : `${mc.values.length} values`})
                                </span>
                              ))}
                            </div>
                          </div>

                          {/* Update Columns preview */}
                          <div className="bg-slate-900/70 p-2 rounded-lg border border-slate-800 space-y-1">
                            <span className="text-slate-400 block text-[10px] uppercase font-mono">
                              Update Columns ({parseResult.config.updateColumns.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {parseResult.config.updateColumns.map((uc, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300 font-mono text-[11px]"
                                >
                                  {uc.name} ({uc.type} • {uc.values.length} values)
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2">
                            <button
                              onClick={() => parseResult.config && handleApplyConfig(parseResult.config)}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors cursor-pointer"
                            >
                              <Check className="w-4 h-4" />
                              <span>Apply Configuration to Generator</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="font-semibold text-rose-200 text-sm">Failed to Parse Configuration</div>
                          <p className="text-slate-300 mt-1">{parseResult.error}</p>
                          <p className="text-slate-400 text-[11px] mt-2">
                            Make sure the JSON is well-formed and contains table information such as "tableName", "matchColumns", and "updateColumns".
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT CONFIG */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Configuration Name:</label>
                  <input
                    type="text"
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    placeholder="e.g. Users Status Sync Q3"
                    className="w-full bg-slate-950 text-slate-100 text-xs font-mono border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">Description (Optional):</label>
                  <input
                    type="text"
                    value={exportDescription}
                    onChange={(e) => setExportDescription(e.target.value)}
                    placeholder="e.g. Batch migration for tenant roles"
                    className="w-full bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={handleDownloadExport}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 transition-colors shadow-md cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .json File</span>
                </button>

                <button
                  onClick={handleCopyExport}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  {copiedExport ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedExport ? 'Copied to Clipboard!' : 'Copy JSON'}</span>
                </button>

                <button
                  onClick={handleSaveToBrowserTemplates}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-indigo-400" />
                  <span>Save to Browser Templates</span>
                </button>
              </div>

              {saveSuccessMessage && (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{saveSuccessMessage}</span>
                </div>
              )}

              {/* Formatted JSON Preview Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">JSON Configuration Preview:</span>
                  <span>
                    {currentExportJsonString.split('\n').length} lines • {currentExportJsonString.length} bytes
                  </span>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-60 overflow-y-auto font-mono text-[11px] text-slate-300 leading-relaxed">
                  <pre className="whitespace-pre-wrap">{currentExportJsonString}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SAVED TEMPLATES IN BROWSER */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              {/* Quick Save Current Bar */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Save Current Configuration to Browser Storage:</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    placeholder={`e.g. ${currentConfigData.tableName} Sync Profile`}
                    className="flex-1 bg-slate-900 border border-slate-750 text-slate-100 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                  <button
                    onClick={handleSaveToBrowserTemplates}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save Template</span>
                  </button>
                </div>
                {saveSuccessMessage && (
                  <div className="text-emerald-400 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{saveSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* List of Saved Templates */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Your Saved Templates ({savedConfigs.length})
                </h4>

                {savedConfigs.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs space-y-2">
                    <Bookmark className="w-6 h-6 mx-auto text-slate-600" />
                    <p>No templates saved in browser storage yet.</p>
                    <p className="text-[11px] text-slate-600">
                      You can save your current table and column setup above or import a .json configuration file.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {savedConfigs.map((tpl, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-950/70 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <strong className="text-xs font-bold text-slate-200 truncate">
                              {tpl.name || 'Unnamed Template'}
                            </strong>
                            <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-mono border border-indigo-800/60 shrink-0">
                              table: {tpl.tableName}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] shrink-0 font-mono">
                              {tpl.executionMode}
                            </span>
                          </div>

                          <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                            <span>
                              Match Keys:{' '}
                              <strong className="text-amber-300">
                                {tpl.matchColumns.map((m) => m.name).join(', ')}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Update Cols:{' '}
                              <strong className="text-emerald-300">
                                {tpl.updateColumns.map((u) => u.name).join(', ')}
                              </strong>
                            </span>
                            {tpl.exportedAt && (
                              <>
                                <span>•</span>
                                <span className="text-slate-500 text-[10px] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {new Date(tpl.exportedAt).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleApplyConfig(tpl)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Load this template into the generator"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Load</span>
                          </button>

                          <button
                            onClick={() => {
                              const blob = new Blob([JSON.stringify(tpl, null, 2)], {
                                type: 'application/json;charset=utf-8',
                              });
                              const url = URL.createObjectURL(blob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${(tpl.name || tpl.tableName || 'config').toLowerCase().replace(/[^a-z0-9_-]/gi, '_')}.json`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              URL.revokeObjectURL(url);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                            title="Export as JSON file"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteSavedTemplate(idx)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
                            title="Delete template"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            Configurations can be transferred across browser sessions, machines, or shared with teammates.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
