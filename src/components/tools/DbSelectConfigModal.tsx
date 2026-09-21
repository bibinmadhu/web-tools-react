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
  SelectColumn,
  QueryExecutionMode,
  SelectStrategy,
  DbSelectConfig,
  createDbSelectConfigExport,
  validateAndParseDbSelectConfig,
} from '../../utils/dbSelectQueryGenerator';

export interface DbSelectConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfigData: {
    tableName: string;
    useTableAlias?: boolean;
    tableAlias?: string;
    orderByMatchColumnId?: string;
    orderByMatchDirection?: 'ASC' | 'DESC';
    matchColumns: MatchColumn[];
    selectColumns: SelectColumn[];
    selectAllColumns?: boolean;
    customSelectClause?: string;
    executionMode: QueryExecutionMode;
    strategy: SelectStrategy;
    isDistinct?: boolean;
    orderBy?: string;
    limit?: number | string;
    offset?: number | string;
    includeTypeCasts: boolean;
    includeRowComments: boolean;
    showNullForMissing?: boolean;
  };
  onApplyConfig: (config: DbSelectConfig) => void;
  initialTab?: 'import' | 'export' | 'saved';
}

const STORAGE_KEY_SAVED_CONFIGS = 'devhub_db_select_saved_configs';

export const DbSelectConfigModal: React.FC<DbSelectConfigModalProps> = ({
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
    config?: DbSelectConfig;
    error?: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Saved Templates in Browser Storage
  const [savedConfigs, setSavedConfigs] = useState<DbSelectConfig[]>(() => {
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
      setExportName(`${currentConfigData.tableName || 'table'}_select_config`);
      setExportDescription(`Configuration for querying ${currentConfigData.tableName || 'table'} table`);
      setCopiedExport(false);
      setImportJsonText('');
      setImportFileName(null);
      setParseResult(null);
      setSaveSuccessMessage(null);
    }
  }, [isOpen, currentConfigData.tableName]);

  // Generate current export object
  const currentExportObject = React.useMemo(() => {
    return createDbSelectConfigExport({
      ...currentConfigData,
      name: exportName || `${currentConfigData.tableName || 'table'}_select_config`,
      description: exportDescription,
    });
  }, [currentConfigData, exportName, exportDescription]);

  const currentExportJsonString = React.useMemo(() => {
    return JSON.stringify(currentExportObject, null, 2);
  }, [currentExportObject]);

  // Handle Copy Export JSON
  const handleCopyExport = () => {
    navigator.clipboard.writeText(currentExportJsonString);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2200);
  };

  // Handle Download Export JSON File
  const handleDownloadExport = () => {
    const blob = new Blob([currentExportJsonString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${exportName || currentConfigData.tableName || 'db_select'}_config.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Handle Save Current Config to Browser Templates
  const handleSaveToTemplates = () => {
    const name = newTemplateName.trim() || exportName.trim() || `${currentConfigData.tableName || 'table'} Select Template`;
    const templateConfig: DbSelectConfig = {
      ...currentExportObject,
      name,
      exportedAt: new Date().toISOString(),
    };

    const updated = [templateConfig, ...savedConfigs.filter((c) => c.name !== name)];
    setSavedConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CONFIGS, JSON.stringify(updated));
      setSaveSuccessMessage(`Template "${name}" saved in browser storage!`);
      setNewTemplateName('');
      setTimeout(() => setSaveSuccessMessage(null), 3000);
    } catch (e) {
      console.error('Failed to save template to localStorage', e);
    }
  };

  // Handle Delete Template
  const handleDeleteTemplate = (indexToDelete: number) => {
    const updated = savedConfigs.filter((_, idx) => idx !== indexToDelete);
    setSavedConfigs(updated);
    try {
      localStorage.setItem(STORAGE_KEY_SAVED_CONFIGS, JSON.stringify(updated));
    } catch (e) {
      // ignore
    }
  };

  // Handle File Upload for Import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setImportJsonText(content);
      const validated = validateAndParseDbSelectConfig(content);
      setParseResult(validated);
    };
    reader.readAsText(file);
  };

  // Handle Manual Text Input for Import
  const handleTextChange = (text: string) => {
    setImportJsonText(text);
    if (!text.trim()) {
      setParseResult(null);
      return;
    }
    const validated = validateAndParseDbSelectConfig(text);
    setParseResult(validated);
  };

  // Apply Imported Configuration
  const handleApplyImported = (config: DbSelectConfig) => {
    onApplyConfig(config);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-200">
        {/* MODAL HEADER */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                Database Select Configuration Manager
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  v1.0
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Export, import, or save reusable configurations, filter keys, select clauses, and execution modes
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TAB NAVIGATION */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-1 bg-slate-900/50 shrink-0">
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'import'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Import Configuration
          </button>

          <button
            onClick={() => setActiveTab('export')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'export'
                ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Export Configuration
          </button>

          <button
            onClick={() => setActiveTab('saved')}
            className={`px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors border-b-2 flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'saved'
                ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            Saved Templates ({savedConfigs.length})
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 text-xs">
          {/* TAB 1: IMPORT CONFIGURATION */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="bg-slate-850/80 border border-slate-800 rounded-lg p-3.5">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  Load Configuration from File or Paste JSON
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Import a configuration file generated previously. All settings including target table, match keys (single vs list values), select columns/clauses, strategy, and execution options will be restored.
                </p>

                {/* Drag and Drop / File Input Box */}
                <div className="mt-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".json,application/json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 bg-slate-900/60 hover:bg-slate-850 rounded-lg p-4 text-center cursor-pointer transition-colors"
                  >
                    <FileJson className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-xs font-medium text-slate-200">
                      {importFileName ? `Selected: ${importFileName}` : 'Click to browse or drop a .json configuration file'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-0.5">Accepts valid JSON configuration exports</p>
                  </div>
                </div>
              </div>

              {/* Paste JSON Editor Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    Or Paste Configuration JSON Directly
                  </label>
                  {importJsonText && (
                    <button
                      onClick={() => handleTextChange('')}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={importJsonText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`{\n  "version": 1,\n  "app": "devhub-db-select-generator",\n  "tableName": "users",\n  "matchColumns": [...],\n  "selectColumns": [...]\n}`}
                  rows={7}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Validation Status Preview Box */}
              {parseResult && (
                <div
                  className={`p-3 rounded-lg border text-xs ${
                    parseResult.success
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  {parseResult.success && parseResult.config ? (
                    <div>
                      <div className="flex items-center gap-1.5 font-medium text-emerald-400 mb-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Valid Configuration Detected: &ldquo;{parseResult.config.name || parseResult.config.tableName}&rdquo;
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-300 bg-slate-900/60 p-2.5 rounded border border-emerald-500/20 mb-3">
                        <div>
                          <span className="text-slate-400 block">Target Table:</span>
                          <strong className="text-white">{parseResult.config.tableName}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Match Keys:</span>
                          <strong className="text-white">
                            {parseResult.config.matchColumns.length} (
                            {parseResult.config.matchColumns.filter((m) => m.valueMode === 'single').length} single,{' '}
                            {parseResult.config.matchColumns.filter((m) => m.valueMode !== 'single').length} list)
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Select Cols:</span>
                          <strong className="text-white">
                            {parseResult.config.selectAllColumns ? 'All (*)' : `${parseResult.config.selectColumns.length} columns`}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Strategy / Mode:</span>
                          <strong className="text-white capitalize">{parseResult.config.strategy.replace('_', ' ')}</strong>
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyImported(parseResult.config!)}
                        className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                        Apply This Configuration to Generator
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-rose-400">Configuration Error</div>
                        <div className="text-[11px] text-rose-300/90 mt-0.5">{parseResult.error}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT CONFIGURATION */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className="bg-slate-850/80 border border-slate-800 rounded-lg p-3.5">
                <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                  <Download className="w-4 h-4 text-emerald-400" />
                  Export & Share Current Query Configuration
                </h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Export the active state of your query generator. All table names, match criteria, custom expressions, order by clauses, and value payloads will be saved in a standard JSON format.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Configuration Name
                    </label>
                    <input
                      type="text"
                      value={exportName}
                      onChange={(e) => setExportName(e.target.value)}
                      placeholder="e.g. Users Lookup Template"
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-300 block mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      value={exportDescription}
                      onChange={(e) => setExportDescription(e.target.value)}
                      placeholder="e.g. Daily user lookup by tenant and ID"
                      className="w-full bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800">
                  <button
                    onClick={handleDownloadExport}
                    className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download JSON File
                  </button>

                  <button
                    onClick={handleCopyExport}
                    className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedExport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedExport ? 'Copied to Clipboard!' : 'Copy JSON'}
                  </button>

                  <button
                    onClick={handleSaveToTemplates}
                    className="py-1.5 px-3 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Save as Browser Template
                  </button>
                </div>

                {saveSuccessMessage && (
                  <div className="mt-2 text-[11px] text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {saveSuccessMessage}
                  </div>
                )}
              </div>

              {/* JSON Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-400">
                    Configuration Preview (JSON)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {currentExportJsonString.length} bytes
                  </span>
                </div>
                <pre className="w-full max-h-56 bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[11px] text-emerald-300/80 overflow-y-auto whitespace-pre-wrap select-all">
                  {currentExportJsonString}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: SAVED BROWSER TEMPLATES */}
          {activeTab === 'saved' && (
            <div className="space-y-4">
              <div className="bg-slate-850/80 border border-slate-800 rounded-lg p-3.5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Bookmark className="w-4 h-4 text-amber-400" />
                    Saved Browser Templates
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Configurations stored in your local browser storage for quick reuse.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="New template name..."
                    value={newTemplateName}
                    onChange={(e) => setNewTemplateName(e.target.value)}
                    className="bg-slate-900 border border-slate-700 rounded-md px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-44"
                  />
                  <button
                    onClick={handleSaveToTemplates}
                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    Save Current
                  </button>
                </div>
              </div>

              {saveSuccessMessage && (
                <div className="text-[11px] text-emerald-400 flex items-center gap-1 bg-emerald-950/30 border border-emerald-500/20 px-3 py-2 rounded">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {saveSuccessMessage}
                </div>
              )}

              {/* List of saved templates */}
              {savedConfigs.length === 0 ? (
                <div className="border border-slate-800 rounded-lg p-8 text-center bg-slate-900/40">
                  <Bookmark className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-300">No saved templates in your browser yet</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Save your current configuration using the button above to quickly reload it at any time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {savedConfigs.map((cfg, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-850/60 border border-slate-800 hover:border-slate-700 rounded-lg p-3 flex items-center justify-between transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-200 text-xs truncate">
                            {cfg.name || `${cfg.tableName} Template`}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                            Table: {cfg.tableName}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/40 shrink-0">
                            {cfg.strategy}
                          </span>
                        </div>
                        {cfg.description && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">{cfg.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1">
                          <span>Match Keys: {cfg.matchColumns?.length || 0}</span>
                          <span>Select Cols: {cfg.selectAllColumns ? 'All (*)' : (cfg.selectColumns?.length || 0)}</span>
                          {cfg.exportedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(cfg.exportedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleApplyImported(cfg)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Apply this template to generator"
                        >
                          <Check className="w-3 h-3" />
                          Apply
                        </button>
                        <button
                          onClick={() => {
                            const blob = new Blob([JSON.stringify(cfg, null, 2)], {
                              type: 'application/json',
                            });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `${cfg.name || 'template'}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Download as JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(idx)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
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
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span>Format complies with DevHub Database Query Configuration standard v1</span>
          </div>

          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
