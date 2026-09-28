import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Shield,
  Code2,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  Settings,
  Search,
  BookOpen,
  ArrowRightLeft,
  FileJson,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  Database,
  ExternalLink,
  Split,
  Eye,
  RefreshCw,
  FolderOpen,
  Save,
  Tag
} from 'lucide-react';
import {
  obfuscateSqlQuery,
  deobfuscateSqlQuery,
  validateImportedMapping,
  QueryObfuscationOptions,
  QueryObfuscationMapping,
  DEFAULT_OBFUSCATION_OPTIONS,
  SQL_QUERY_PRESETS,
  QueryPreset,
  SqlDialect,
  ObfuscationNamingStyle,
} from '../../utils/sqlQueryObfuscator';

export interface QueryObfuscatorToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

const STORAGE_KEY_MAPPING = 'devhub_sql_obfuscator_mapping';
const STORAGE_KEY_OPTIONS = 'devhub_sql_obfuscator_options';
const STORAGE_KEY_SOURCE = 'devhub_sql_obfuscator_source';
const STORAGE_KEY_PROFILES = 'devhub_sql_obfuscator_profiles';

interface MappingProfile {
  id: string;
  name: string;
  savedAt: string;
  mapping: QueryObfuscationMapping;
}

export const QueryObfuscatorTool: React.FC<QueryObfuscatorToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const [activeTab, setActiveTab] = useState<'obfuscate' | 'deobfuscate' | 'mapping' | 'diff' | 'presets'>('obfuscate');

  // Configuration options
  const [options, setOptions] = useState<QueryObfuscationOptions>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPTIONS);
      if (saved) return { ...DEFAULT_OBFUSCATION_OPTIONS, ...JSON.parse(saved) };
    } catch (e) {
      // fallback
    }
    return DEFAULT_OBFUSCATION_OPTIONS;
  });

  // Query states
  const [sourceSql, setSourceSql] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SOURCE);
      if (saved) return saved;
    } catch (e) {
      // fallback
    }
    return SQL_QUERY_PRESETS[0].sql;
  });

  const [obfuscatedSql, setObfuscatedSql] = useState<string>('');
  const [deobfuscatedSql, setDeobfuscatedSql] = useState<string>('');
  const [deobInputSql, setDeobInputSql] = useState<string>('');

  // Active mapping dictionary
  const [mapping, setMapping] = useState<QueryObfuscationMapping | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAPPING);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return null;
  });

  // Saved profiles
  const [profiles, setProfiles] = useState<MappingProfile[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PROFILES);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [];
  });

  // Excluded identifier input
  const [newExcludedInput, setNewExcludedInput] = useState<string>('');

  // Mapping manager search & filter
  const [mappingSearch, setMappingSearch] = useState<string>('');
  const [mappingFilterType, setMappingFilterType] = useState<'all' | 'tables' | 'columns' | 'aliases'>('all');

  // Manual mapping entry inputs
  const [newOriginalName, setNewOriginalName] = useState<string>('');
  const [newObfuscatedName, setNewObfuscatedName] = useState<string>('');
  const [newMappingType, setNewMappingType] = useState<'tables' | 'columns'>('tables');

  // Import modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importJsonText, setImportJsonText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // File input ref for mapping upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save options and source to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(options));
    } catch (e) {
      // ignore
    }
  }, [options]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SOURCE, sourceSql);
    } catch (e) {
      // ignore
    }
  }, [sourceSql]);

  useEffect(() => {
    if (mapping) {
      try {
        localStorage.setItem(STORAGE_KEY_MAPPING, JSON.stringify(mapping));
      } catch (e) {
        // ignore
      }
    }
  }, [mapping]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      // ignore
    }
  }, [profiles]);

  // Execute obfuscation
  const handleObfuscate = (overrideSource?: string) => {
    const input = overrideSource !== undefined ? overrideSource : sourceSql;
    if (!input.trim()) {
      setObfuscatedSql('');
      return;
    }

    try {
      const result = obfuscateSqlQuery(input, options, mapping);
      setObfuscatedSql(result.obfuscatedSql);
      setMapping(result.mapping);
      setDeobInputSql(result.obfuscatedSql);
      showFlashMessage(`Obfuscated ${result.replacementsCount} tokens across ${result.detectedTables.length} tables & ${result.detectedColumns.length} columns!`, 'success');
    } catch (err: any) {
      showFlashMessage(`Obfuscation error: ${err.message}`, 'error');
    }
  };

  // Run initial obfuscation if output is empty
  useEffect(() => {
    if (sourceSql && !obfuscatedSql) {
      handleObfuscate(sourceSql);
    }
  }, []);

  // Execute de-obfuscation
  const handleDeobfuscate = () => {
    const input = deobInputSql.trim() ? deobInputSql : obfuscatedSql;
    if (!input.trim()) {
      showFlashMessage('Please enter an obfuscated query to de-obfuscate.', 'error');
      return;
    }

    if (!mapping) {
      showFlashMessage('No active mapping found! Please obfuscate a query first or import a mapping JSON.', 'error');
      return;
    }

    try {
      const result = deobfuscateSqlQuery(input, mapping);
      setDeobfuscatedSql(result.deobfuscatedSql);

      if (result.unrecognizedTokens.length > 0) {
        showFlashMessage(
          `De-obfuscated with ${result.restoredCount} restorations. Note: ${result.unrecognizedTokens.length} tokens were not found in mapping (${result.unrecognizedTokens.slice(0, 3).join(', ')}...).`,
          'info'
        );
      } else {
        showFlashMessage(`Successfully de-obfuscated! Restored ${result.restoredCount} identifiers to their original names.`, 'success');
      }
    } catch (err: any) {
      showFlashMessage(`De-obfuscation error: ${err.message}`, 'error');
    }
  };

  const showFlashMessage = (text: string, type: 'success' | 'info' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage((current) => (current?.text === text ? null : current));
    }, 4500);
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadSql = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Export mapping JSON
  const handleExportMapping = () => {
    if (!mapping) {
      showFlashMessage('No active mapping to export.', 'error');
      return;
    }

    const json = JSON.stringify(mapping, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sql-obfuscation-mapping-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showFlashMessage('Mapping exported successfully as JSON!', 'success');
  };

  // Import mapping JSON from file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const res = validateImportedMapping(content);
      if (res.success && res.mapping) {
        setMapping(res.mapping);
        showFlashMessage(`Imported mapping "${res.mapping.name}" with ${Object.keys(res.mapping.tables).length} tables & ${Object.keys(res.mapping.columns).length} columns!`, 'success');
      } else {
        showFlashMessage(`Import failed: ${res.error}`, 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Import mapping from text modal
  const handleImportJsonSubmit = () => {
    setImportError(null);
    const res = validateImportedMapping(importJsonText);
    if (res.success && res.mapping) {
      setMapping(res.mapping);
      setShowImportModal(false);
      setImportJsonText('');
      showFlashMessage(`Imported mapping "${res.mapping.name}" with ${Object.keys(res.mapping.tables).length} tables & ${Object.keys(res.mapping.columns).length} columns!`, 'success');
    } else {
      setImportError(res.error || 'Failed to parse mapping JSON');
    }
  };

  // Add custom manual mapping pair
  const handleAddManualMapping = () => {
    const orig = newOriginalName.trim();
    const obf = newObfuscatedName.trim();
    if (!orig || !obf) {
      showFlashMessage('Please enter both original identifier and obfuscated name.', 'error');
      return;
    }

    const current: QueryObfuscationMapping = mapping || {
      format: 'devhub-sql-obfuscator-mapping',
      version: '1.0',
      id: `mapping-${Date.now()}`,
      name: 'Custom SQL Obfuscation Mapping',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tables: {},
      columns: {},
      reverseMapping: {},
      stats: { tablesCount: 0, columnsCount: 0, literalsCount: 0, totalReplacements: 0 },
    };

    const updatedTables = { ...current.tables };
    const updatedColumns = { ...current.columns };
    const updatedReverse = { ...current.reverseMapping };

    if (newMappingType === 'tables') {
      updatedTables[orig] = obf;
    } else {
      updatedColumns[orig] = obf;
    }
    updatedReverse[obf] = orig;

    const newMapping: QueryObfuscationMapping = {
      ...current,
      tables: updatedTables,
      columns: updatedColumns,
      reverseMapping: updatedReverse,
      updatedAt: new Date().toISOString(),
      stats: {
        tablesCount: Object.keys(updatedTables).length,
        columnsCount: Object.keys(updatedColumns).length,
        literalsCount: Object.keys(current.literals || {}).length,
        totalReplacements: current.stats.totalReplacements + 1,
      },
    };

    setMapping(newMapping);
    setNewOriginalName('');
    setNewObfuscatedName('');
    showFlashMessage(`Added custom mapping: ${orig} → ${obf}`, 'success');
  };

  // Delete a mapping entry
  const handleDeleteMappingEntry = (type: 'tables' | 'columns' | 'aliases', origKey: string) => {
    if (!mapping) return;
    const obfVal = mapping[type]?.[origKey];
    const newTarget = { ...mapping[type] };
    delete newTarget[origKey];

    const newReverse = { ...mapping.reverseMapping };
    if (obfVal) delete newReverse[obfVal];

    setMapping({
      ...mapping,
      [type]: newTarget,
      reverseMapping: newReverse,
      stats: {
        ...mapping.stats,
        tablesCount: type === 'tables' ? Object.keys(newTarget).length : mapping.stats.tablesCount,
        columnsCount: type === 'columns' ? Object.keys(newTarget).length : mapping.stats.columnsCount,
      },
    });
  };

  // Save profile
  const handleSaveProfile = () => {
    if (!mapping) return;
    const name = prompt('Enter a name for this mapping profile:', mapping.name || 'Profile');
    if (!name) return;

    const newProfile: MappingProfile = {
      id: `profile-${Date.now()}`,
      name,
      savedAt: new Date().toLocaleDateString(),
      mapping: { ...mapping, name },
    };

    setProfiles((prev) => [newProfile, ...prev]);
    showFlashMessage(`Saved profile "${name}"!`, 'success');
  };

  // Load profile
  const handleLoadProfile = (prof: MappingProfile) => {
    setMapping(prof.mapping);
    showFlashMessage(`Loaded mapping profile "${prof.name}"!`, 'success');
  };

  // Clear mapping
  const handleClearMapping = () => {
    if (confirm('Clear current active mapping? You can export it as JSON first to keep a backup.')) {
      setMapping(null);
      localStorage.removeItem(STORAGE_KEY_MAPPING);
      showFlashMessage('Active mapping cleared.', 'info');
    }
  };

  // Excluded identifiers management
  const handleAddExcluded = () => {
    const clean = newExcludedInput.trim().toLowerCase();
    if (!clean) return;
    if (options.excludedIdentifiers.includes(clean)) {
      setNewExcludedInput('');
      return;
    }
    setOptions((prev) => ({
      ...prev,
      excludedIdentifiers: [...prev.excludedIdentifiers, clean],
    }));
    setNewExcludedInput('');
  };

  const handleRemoveExcluded = (item: string) => {
    setOptions((prev) => ({
      ...prev,
      excludedIdentifiers: prev.excludedIdentifiers.filter((x) => x !== item),
    }));
  };

  // Filtered mapping entries for the manager table
  const filteredMappingEntries = useMemo(() => {
    if (!mapping) return [];
    const entries: { type: 'table' | 'column' | 'alias'; original: string; obfuscated: string }[] = [];

    if (mappingFilterType === 'all' || mappingFilterType === 'tables') {
      for (const [orig, obf] of Object.entries(mapping.tables || {})) {
        entries.push({ type: 'table', original: orig, obfuscated: String(obf) });
      }
    }
    if (mappingFilterType === 'all' || mappingFilterType === 'columns') {
      for (const [orig, obf] of Object.entries(mapping.columns || {})) {
        entries.push({ type: 'column', original: orig, obfuscated: String(obf) });
      }
    }
    if (mappingFilterType === 'all' || mappingFilterType === 'aliases') {
      for (const [orig, obf] of Object.entries(mapping.aliases || {})) {
        entries.push({ type: 'alias', original: orig, obfuscated: String(obf) });
      }
    }

    if (!mappingSearch.trim()) return entries;
    const q = mappingSearch.toLowerCase();
    return entries.filter(
      (e) => e.original.toLowerCase().includes(q) || e.obfuscated.toLowerCase().includes(q)
    );
  }, [mapping, mappingSearch, mappingFilterType]);

  // Load a preset
  const handleSelectPreset = (p: QueryPreset) => {
    setSourceSql(p.sql);
    setOptions((prev) => ({ ...prev, dialect: p.dialect }));
    handleObfuscate(p.sql);
    setActiveTab('obfuscate');
    showFlashMessage(`Loaded preset: "${p.name}"`, 'info');
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Banner / Notification */}
      {statusMessage && (
        <div
          className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-xs font-medium transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
              : statusMessage.type === 'error'
              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              : 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />}
            {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />}
            {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 shrink-0 text-indigo-500" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Tab Navigation & Key Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
          <button
            onClick={() => setActiveTab('obfuscate')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'obfuscate'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Obfuscate Query</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('deobfuscate');
              if (!deobInputSql && obfuscatedSql) setDeobInputSql(obfuscatedSql);
            }}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'deobfuscate'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>De-obfuscate Query</span>
          </button>

          <button
            onClick={() => setActiveTab('mapping')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'mapping'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Mapping Manager</span>
            {mapping && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-mono bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                {Object.keys(mapping.tables).length + Object.keys(mapping.columns).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('diff')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'diff'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
            <span>Diff View</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'presets'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>SQL Presets</span>
          </button>
        </div>

        {/* Global Mapping Action Bar */}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,application/json"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Import Mapping JSON file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Import Mapping</span>
          </button>

          <button
            onClick={() => setShowImportModal(true)}
            title="Paste raw JSON mapping"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Paste JSON</span>
          </button>

          <button
            onClick={handleExportMapping}
            disabled={!mapping}
            title="Export Mapping Key as JSON file"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-500/10 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Mapping</span>
          </button>
        </div>
      </div>

      {/* TAB 1: OBFUSCATE QUERY */}
      {activeTab === 'obfuscate' && (
        <div className="flex flex-col space-y-4">
          {/* Options Bar */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                {/* Dialect */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Dialect:
                  </span>
                  <select
                    value={options.dialect}
                    onChange={(e) => setOptions({ ...options, dialect: e.target.value as SqlDialect })}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="generic">Generic ANSI SQL</option>
                    <option value="postgres">PostgreSQL ("")</option>
                    <option value="mysql">MySQL (``)</option>
                    <option value="sqlserver">SQL Server T-SQL ([])</option>
                    <option value="sqlite">SQLite</option>
                  </select>
                </div>

                {/* Naming Style */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Naming:
                  </span>
                  <select
                    value={options.namingStyle}
                    onChange={(e) => setOptions({ ...options, namingStyle: e.target.value as ObfuscationNamingStyle })}
                    className="text-xs font-medium px-2.5 py-1.5 rounded-md bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="prefixed">Prefixed (tbl_01, col_01)</option>
                    <option value="pseudonym">Realistic Pseudonyms (alpha_entity, metric_val)</option>
                    <option value="random_hex">Deterministic Hash Hex (tbl_8f3a, col_e12b)</option>
                    <option value="short">Shorthand (t_a, c_a)</option>
                  </select>
                </div>

                {/* Target Scope Checkboxes */}
                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.obfuscateTables}
                    onChange={(e) => setOptions({ ...options, obfuscateTables: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Tables</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.obfuscateColumns}
                    onChange={(e) => setOptions({ ...options, obfuscateColumns: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Columns</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.obfuscateAliases}
                    onChange={(e) => setOptions({ ...options, obfuscateAliases: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Aliases</span>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options.maskLiterals}
                    onChange={(e) => setOptions({ ...options, maskLiterals: e.target.checked })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Mask Strings ('...')</span>
                </label>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleObfuscate()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Obfuscate Now</span>
                </button>
              </div>
            </div>

            {/* Excluded Identifiers Bar */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-800">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Tag className="w-3 h-3" /> Exclude identifiers:
              </span>
              {options.excludedIdentifiers.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  {item}
                  <button
                    onClick={() => handleRemoveExcluded(item)}
                    className="hover:text-rose-500 text-slate-400"
                  >
                    ×
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  placeholder="add identifier..."
                  value={newExcludedInput}
                  onChange={(e) => setNewExcludedInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddExcluded()}
                  className="text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 w-28 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  onClick={handleAddExcluded}
                  className="p-1 rounded text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Editors Grid: Source SQL vs Obfuscated SQL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input SQL Panel */}
            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Original SQL Query
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setSourceSql('')}
                    title="Clear input"
                    className="p-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleCopy(sourceSql, 'source')}
                    className="p-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded"
                    title="Copy Original SQL"
                  >
                    {copiedKey === 'source' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <textarea
                value={sourceSql}
                onChange={(e) => setSourceSql(e.target.value)}
                placeholder="Paste or write your SQL query here (UPDATE, SELECT, INSERT, CREATE TABLE, JOIN)..."
                rows={14}
                className="w-full p-3 font-mono text-xs text-slate-800 dark:text-slate-100 bg-transparent resize-y focus:outline-none leading-relaxed border-0"
                spellCheck={false}
              />
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{sourceSql.length} characters</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">Ready to obfuscate</span>
              </div>
            </div>

            {/* Obfuscated SQL Output Panel */}
            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Obfuscated SQL Output
                  </span>
                  {mapping && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      {Object.keys(mapping.tables).length} tbls • {Object.keys(mapping.columns).length} cols
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(obfuscatedSql, 'obfuscated')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    {copiedKey === 'obfuscated' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadSql(obfuscatedSql, 'obfuscated-query.sql')}
                    disabled={!obfuscatedSql}
                    className="p-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded disabled:opacity-40"
                    title="Download as .sql file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={obfuscatedSql}
                readOnly
                placeholder="Obfuscated SQL will be generated here..."
                rows={14}
                className="w-full p-3 font-mono text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 resize-y focus:outline-none leading-relaxed border-0"
                spellCheck={false}
              />
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{obfuscatedSql.length} characters</span>
                <button
                  onClick={() => {
                    setDeobInputSql(obfuscatedSql);
                    setActiveTab('deobfuscate');
                  }}
                  className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  Send to De-obfuscator →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DE-OBFUSCATE QUERY */}
      {activeTab === 'deobfuscate' && (
        <div className="flex flex-col space-y-4">
          {/* Mapping Status Callout */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Database className="w-5 h-5 text-indigo-500" />
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Active Mapping: {mapping ? mapping.name : 'No Mapping Loaded'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {mapping
                    ? `Contains ${Object.keys(mapping.tables).length} table mappings and ${Object.keys(mapping.columns).length} column mappings.`
                    : 'Please import a mapping key JSON or obfuscate a query to generate mapping.'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('mapping')}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
              >
                Inspect Mapping Keys
              </button>
              <button
                onClick={handleDeobfuscate}
                disabled={!mapping}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors disabled:opacity-40"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>De-obfuscate Query</span>
              </button>
            </div>
          </div>

          {/* De-obfuscate Editors Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Obfuscated Query */}
            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Obfuscated SQL to Restore
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setDeobInputSql(obfuscatedSql)}
                    title="Paste latest obfuscated query"
                    className="px-2 py-1 text-[11px] font-medium rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700"
                  >
                    Paste Latest
                  </button>
                  <button
                    onClick={() => setDeobInputSql('')}
                    title="Clear input"
                    className="p-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={deobInputSql}
                onChange={(e) => setDeobInputSql(e.target.value)}
                placeholder="Paste the obfuscated SQL query with masked table/column names here..."
                rows={14}
                className="w-full p-3 font-mono text-xs text-slate-800 dark:text-slate-100 bg-transparent resize-y focus:outline-none leading-relaxed border-0"
                spellCheck={false}
              />
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{deobInputSql.length} characters</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">Ready to restore</span>
              </div>
            </div>

            {/* Restored Original SQL Output */}
            <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    Restored Original SQL
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleCopy(deobfuscatedSql, 'deob')}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
                  >
                    {copiedKey === 'deob' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleDownloadSql(deobfuscatedSql, 'restored-query.sql')}
                    disabled={!deobfuscatedSql}
                    className="p-1.5 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 rounded disabled:opacity-40"
                    title="Download as .sql file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <textarea
                value={deobfuscatedSql}
                readOnly
                placeholder="De-obfuscated original SQL will appear here once you click 'De-obfuscate Query'..."
                rows={14}
                className="w-full p-3 font-mono text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-500/5 resize-y focus:outline-none leading-relaxed border-0"
                spellCheck={false}
              />
              <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                <span>{deobfuscatedSql.length} characters</span>
                {deobfuscatedSql && sourceSql && (
                  <span className={`font-medium ${deobfuscatedSql.trim() === sourceSql.trim() ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-500'}`}>
                    {deobfuscatedSql.trim() === sourceSql.trim() ? '✓ 100% Exact Roundtrip Match' : 'Discrepancy with original source'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MAPPING KEY MANAGER */}
      {activeTab === 'mapping' && (
        <div className="flex flex-col space-y-4">
          {/* Header Controls */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Obfuscation Mapping Dictionary
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stored in browser storage. Every table and column is reversibly mapped to its obfuscated identifier.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSaveProfile}
                disabled={!mapping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <Save className="w-3.5 h-3.5 text-slate-500" />
                <span>Save Profile</span>
              </button>

              <button
                onClick={handleExportMapping}
                disabled={!mapping}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-40 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Mapping (.json)</span>
              </button>

              <button
                onClick={handleClearMapping}
                disabled={!mapping}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Saved Profiles Chips */}
          {profiles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs">
              <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5" /> Saved Profiles:
              </span>
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                >
                  <button
                    onClick={() => handleLoadProfile(p)}
                    className="font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400"
                  >
                    {p.name}
                  </button>
                  <span className="text-[10px] text-slate-400">({p.savedAt})</span>
                  <button
                    onClick={() => setProfiles((prev) => prev.filter((x) => x.id !== p.id))}
                    className="text-slate-400 hover:text-rose-500 ml-1"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add New Custom Mapping Pair Form */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2.5">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-indigo-500" /> Add Custom Mapping Entry
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <select
                value={newMappingType}
                onChange={(e) => setNewMappingType(e.target.value as 'tables' | 'columns')}
                className="text-xs px-2.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="tables">Table Name</option>
                <option value="columns">Column Name</option>
              </select>
              <input
                type="text"
                placeholder="Original Identifier (e.g. users, balance)"
                value={newOriginalName}
                onChange={(e) => setNewOriginalName(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <input
                type="text"
                placeholder="Obfuscated Name (e.g. tbl_sec_01, col_01)"
                value={newObfuscatedName}
                onChange={(e) => setNewObfuscatedName(e.target.value)}
                className="text-xs px-3 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <button
                onClick={handleAddManualMapping}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white transition-colors"
              >
                Add Mapping
              </button>
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search identifiers..."
                  value={mappingSearch}
                  onChange={(e) => setMappingSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 w-56 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
                {(['all', 'tables', 'columns', 'aliases'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMappingFilterType(t)}
                    className={`px-2.5 py-1 rounded capitalize text-[11px] font-medium transition-all ${
                      mappingFilterType === t
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <span className="text-xs text-slate-500">
              Showing {filteredMappingEntries.length} mapping entries
            </span>
          </div>

          {/* Mapping Entries Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
            <div className="overflow-x-auto max-h-[440px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase text-[10px] tracking-wider font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 w-24">Type</th>
                    <th className="px-4 py-2.5">Original SQL Identifier</th>
                    <th className="px-4 py-2.5">Obfuscated Token</th>
                    <th className="px-4 py-2.5 text-right w-24">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                  {filteredMappingEntries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs font-sans">
                        No mapping entries found. Obfuscate a query or import a mapping key.
                      </td>
                    </tr>
                  ) : (
                    filteredMappingEntries.map((row) => (
                      <tr key={`${row.type}-${row.original}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2 font-sans">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              row.type === 'table'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : row.type === 'column'
                                ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                                : 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-800 dark:text-slate-200 font-bold">
                          {row.original}
                        </td>
                        <td className="px-4 py-2 text-emerald-600 dark:text-emerald-400">
                          {row.obfuscated}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() =>
                              handleDeleteMappingEntry(
                                row.type === 'table' ? 'tables' : row.type === 'column' ? 'columns' : 'aliases',
                                row.original
                              )
                            }
                            className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Remove mapping"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* TAB 4: DIFF COMPARISON VIEW */}
      {activeTab === 'diff' && (
        <div className="flex flex-col space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Visual Comparison: Original vs Obfuscated Query
              </h4>
              <p className="text-[11px] text-slate-500">
                Verify that keywords, clauses, operators, and parameters remain strictly identical while identifiers are masked.
              </p>
            </div>
            <button
              onClick={() => handleObfuscate()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-run Diff</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                Original SQL (Plaintext Schema)
              </div>
              <pre className="p-3 text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[480px]">
                {sourceSql || '-- (Empty original query)'}
              </pre>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900">
              <div className="px-3.5 py-2 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Obfuscated SQL (Masked Identifiers)
              </div>
              <pre className="p-3 text-xs font-mono text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-[480px]">
                {obfuscatedSql || '-- (Empty obfuscated query)'}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: PRESETS & SAMPLES */}
      {activeTab === 'presets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SQL_QUERY_PRESETS.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between hover:border-indigo-400 dark:hover:border-indigo-600 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-bold text-slate-900 dark:text-white text-xs">{p.name}</h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20">
                    {p.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{p.description}</p>
                <pre className="mt-2.5 p-2 rounded bg-slate-50 dark:bg-slate-950 font-mono text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 overflow-hidden border border-slate-200/60 dark:border-slate-800">
                  {p.sql}
                </pre>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 capitalize">Dialect: {p.dialect}</span>
                <button
                  onClick={() => handleSelectPreset(p)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                >
                  Load & Obfuscate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Import Raw JSON Mapping */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Import Obfuscation Mapping JSON
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste a previously exported mapping JSON string or mapping key dictionary. Both full DevHub schema and standard {'{ tables, columns }'} dictionaries are supported.
            </p>

            <textarea
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder={`{\n  "tables": {\n    "business_entities": "tbl_01"\n  },\n  "columns": {\n    "current_category": "col_01",\n    "annual_turnover": "col_02"\n  }\n}`}
              rows={8}
              className="w-full p-3 font-mono text-xs rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            {importError && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs border border-rose-500/20">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportError(null);
                }}
                className="px-3.5 py-1.5 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJsonSubmit}
                disabled={!importJsonText.trim()}
                className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs disabled:opacity-40"
              >
                Validate & Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
