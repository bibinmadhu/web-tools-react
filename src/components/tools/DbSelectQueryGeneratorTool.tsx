import React, { useState, useMemo } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  Table,
  Layers,
  Code,
  Sparkles,
  Maximize2,
  Minimize2,
  Sliders,
  Play,
  Zap,
  FileText,
  Info,
  Filter,
  FileJson,
  Bookmark,
  CheckCircle2,
  ListFilter,
  Columns,
  Search,
} from 'lucide-react';
import {
  ColumnType,
  ValueMode,
  QueryExecutionMode,
  SelectStrategy,
  MatchColumn,
  SelectColumn,
  SelectQueryOptions,
  DbSelectConfig,
  generatePostgresSelectQuery,
  parseDelimitedValues,
  inferColumnType,
  parseCsvOrTsv,
  DB_SELECT_PRESETS,
} from '../../utils/dbSelectQueryGenerator';
import { DbSelectConfigModal } from './DbSelectConfigModal';

interface DbSelectQueryGeneratorToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DbSelectQueryGeneratorTool: React.FC<DbSelectQueryGeneratorToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  // Target Table & Identity
  const [tableName, setTableName] = useState<string>('users');
  const [tableAlias, setTableAlias] = useState<string>('t');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('users-multi-match');

  // Match / Filter Columns
  const [matchColumns, setMatchColumns] = useState<MatchColumn[]>([
    {
      id: 'm-tenant',
      name: 'tenant_id',
      type: 'text',
      valueMode: 'single',
      singleValue: 'org-acme-corp',
      values: ['org-acme-corp'],
    },
    {
      id: 'm-user',
      name: 'id',
      type: 'integer',
      valueMode: 'list',
      singleValue: '',
      values: ['101', '102', '103', '104', '105'],
    },
  ]);

  // Select / Projection Columns
  const [selectAllColumns, setSelectAllColumns] = useState<boolean>(false);
  const [customSelectClause, setCustomSelectClause] = useState<string>(
    't.id, t.username, t.email, t.role, t.status, t.created_at'
  );
  const [selectColumns, setSelectColumns] = useState<SelectColumn[]>([
    { id: 's-1', name: 'id' },
    { id: 's-2', name: 'username' },
    { id: 's-3', name: 'email' },
    { id: 's-4', name: 'role' },
    { id: 's-5', name: 'status' },
    { id: 's-6', name: 'created_at' },
  ]);

  // Strategy & Execution Options
  const [executionMode, setExecutionMode] = useState<QueryExecutionMode>('batch');
  const [strategy, setStrategy] = useState<SelectStrategy>('batch_values');
  const [isDistinct, setIsDistinct] = useState<boolean>(false);
  const [orderBy, setOrderBy] = useState<string>('t.id ASC');
  const [limit, setLimit] = useState<string>('');
  const [offset, setOffset] = useState<string>('');
  const [includeTypeCasts, setIncludeTypeCasts] = useState<boolean>(true);
  const [includeRowComments, setIncludeRowComments] = useState<boolean>(true);

  // UI State
  const [inputViewMode, setInputViewMode] = useState<'lists' | 'grid' | 'csv'>('lists');
  const [outputTab, setOutputTab] = useState<'sql' | 'python'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [csvRawInput, setCsvRawInput] = useState<string>('');
  const [csvLeadingMatchCount, setCsvLeadingMatchCount] = useState<number>(1);

  // Export / Import Modal State
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configModalTab, setConfigModalTab] = useState<'import' | 'export' | 'saved'>('import');

  const handleOpenConfigModal = (tab: 'import' | 'export' | 'saved') => {
    setConfigModalTab(tab);
    setIsConfigModalOpen(true);
  };

  const handleApplyConfig = (config: DbSelectConfig) => {
    setTableName(config.tableName);
    setMatchColumns(JSON.parse(JSON.stringify(config.matchColumns)));
    setSelectColumns(JSON.parse(JSON.stringify(config.selectColumns)));
    setSelectAllColumns(!!config.selectAllColumns);
    setCustomSelectClause(config.customSelectClause || '');
    setExecutionMode(config.executionMode);
    setStrategy(config.strategy);
    setIsDistinct(!!config.isDistinct);
    setOrderBy(config.orderBy || '');
    setLimit(config.limit !== undefined ? String(config.limit) : '');
    setOffset(config.offset !== undefined ? String(config.offset) : '');
    setIncludeTypeCasts(config.includeTypeCasts);
    setIncludeRowComments(config.includeRowComments);
    setSelectedPresetId('custom-imported');
  };

  // Load preset handler
  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom-blank') {
      setTableName('my_table');
      setTableAlias('t');
      setExecutionMode('batch');
      setStrategy('batch_values');
      setSelectAllColumns(true);
      setCustomSelectClause('');
      setOrderBy('');
      setLimit('');
      setOffset('');
      setMatchColumns([
        {
          id: 'match-' + Date.now(),
          name: 'id',
          type: 'integer',
          valueMode: 'list',
          singleValue: '',
          values: ['1', '2', '3'],
        },
      ]);
      setSelectColumns([
        { id: 'sel-' + Date.now(), name: '*' },
      ]);
      return;
    }

    const preset = DB_SELECT_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setTableName(preset.tableName);
      setExecutionMode(preset.executionMode || (preset.strategy === 'individual' ? 'individual' : 'batch'));
      setStrategy(preset.strategy);
      setMatchColumns(JSON.parse(JSON.stringify(preset.matchColumns)));
      setSelectColumns(JSON.parse(JSON.stringify(preset.selectColumns)));
      setSelectAllColumns(!!preset.selectAllColumns);
      setCustomSelectClause(preset.customSelectClause || '');
      setIsDistinct(!!preset.isDistinct);
      setOrderBy(preset.orderBy || '');
      setLimit(preset.limit !== undefined ? String(preset.limit) : '');
      setOffset(preset.offset !== undefined ? String(preset.offset) : '');
      if (preset.includeRowComments !== undefined) {
        setIncludeRowComments(preset.includeRowComments);
      }
    }
  };

  // Calculate maximum list rows
  const maxRowCount = useMemo(() => {
    let max = 0;
    matchColumns.forEach((c) => {
      if (c.valueMode !== 'single' && c.values.length > max) {
        max = c.values.length;
      }
    });
    if (max === 0) {
      const hasSingle = matchColumns.some(
        (c) => c.valueMode === 'single' && (c.singleValue || (c.values && c.values[0]))
      );
      if (hasSingle) max = 1;
    }
    return max;
  }, [matchColumns]);

  // Generate Query Result
  const queryResult = useMemo(() => {
    const options: SelectQueryOptions = {
      tableName,
      tableAlias,
      matchColumns,
      selectColumns,
      selectAllColumns,
      customSelectClause,
      executionMode,
      strategy,
      isDistinct,
      orderBy,
      limit,
      offset,
      includeTypeCasts,
      includeRowComments,
    };
    return generatePostgresSelectQuery(options);
  }, [
    tableName,
    tableAlias,
    matchColumns,
    selectColumns,
    selectAllColumns,
    customSelectClause,
    executionMode,
    strategy,
    isDistinct,
    orderBy,
    limit,
    offset,
    includeTypeCasts,
    includeRowComments,
  ]);

  // Copy to clipboard helper
  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  // Download SQL file
  const handleDownloadSql = () => {
    const blob = new Blob([queryResult.sql], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tableName || 'query'}_${executionMode}_select_${Date.now()}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // MATCH COLUMN MANAGEMENT
  const handleAddMatchColumn = () => {
    const newCol: MatchColumn = {
      id: 'match-' + Date.now(),
      name: `filter_${matchColumns.length + 1}`,
      type: 'text',
      valueMode: 'list',
      singleValue: '',
      values: Array.from({ length: Math.max(1, maxRowCount) }).map(() => ''),
    };
    setMatchColumns([...matchColumns, newCol]);
  };

  const handleUpdateMatchColumn = (id: string, updates: Partial<MatchColumn>) => {
    setMatchColumns(
      matchColumns.map((c) => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      })
    );
  };

  const handleDeleteMatchColumn = (id: string) => {
    if (matchColumns.length <= 1) return;
    setMatchColumns(matchColumns.filter((c) => c.id !== id));
  };

  const handleMatchRawValuesChange = (id: string, rawText: string) => {
    const vals = parseDelimitedValues(rawText);
    setMatchColumns(
      matchColumns.map((c) => {
        if (c.id === id) {
          return { ...c, values: vals };
        }
        return c;
      })
    );
  };

  // SELECT COLUMN MANAGEMENT
  const handleAddSelectColumn = (name = `col_${selectColumns.length + 1}`) => {
    const newCol: SelectColumn = {
      id: 'sel-' + Date.now(),
      name,
    };
    setSelectColumns([...selectColumns, newCol]);
  };

  const handleUpdateSelectColumn = (id: string, updates: Partial<SelectColumn>) => {
    setSelectColumns(
      selectColumns.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );
  };

  const handleDeleteSelectColumn = (id: string) => {
    setSelectColumns(selectColumns.filter((c) => c.id !== id));
  };

  // CSV Import handler
  const handleApplyCsv = () => {
    if (!csvRawInput.trim()) return;
    const parsed = parseCsvOrTsv(csvRawInput, csvLeadingMatchCount);
    setMatchColumns(parsed.matchColumns);
    if (parsed.selectColumns.length > 0) {
      setSelectColumns(parsed.selectColumns);
    }
    setInputViewMode('lists');
  };

  // Grid Cell Change Handler
  const handleGridCellChange = (
    type: 'match',
    colId: string,
    rowIndex: number,
    value: string
  ) => {
    setMatchColumns((prev) =>
      prev.map((col) => {
        if (col.id !== colId) return col;
        const newVals = [...col.values];
        while (newVals.length <= rowIndex) {
          newVals.push('');
        }
        newVals[rowIndex] = value;
        return { ...col, values: newVals };
      })
    );
  };

  const handleAddGridRow = () => {
    const targetIdx = maxRowCount;
    setMatchColumns((prev) =>
      prev.map((col) => {
        if (col.valueMode === 'single') return col;
        const newVals = [...col.values];
        while (newVals.length < targetIdx) newVals.push('');
        newVals.push('');
        return { ...col, values: newVals };
      })
    );
  };

  const handleDeleteGridRow = (rowIndex: number) => {
    if (maxRowCount <= 1) return;
    setMatchColumns((prev) =>
      prev.map((col) => {
        if (col.valueMode === 'single') return col;
        const newVals = col.values.filter((_, idx) => idx !== rowIndex);
        return { ...col, values: newVals };
      })
    );
  };

  return (
    <div
      className={`flex flex-col bg-slate-950 text-slate-100 ${
        isFullScreen ? 'h-screen p-4' : 'h-[82vh] max-h-[820px] p-2 sm:p-3'
      } overflow-hidden`}
    >
      {/* TOP BAR: TOOL HEADER, PRESETS & CONTROLS */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-800 shrink-0">
        {/* Title and Icon */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Search className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white tracking-wide">
                Database Select Query Generator
              </h2>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PostgreSQL
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Multi-match filter criteria (single & list values), column projections, batch VALUES joins, IN/tuple-IN, CTE & individual queries
            </p>
          </div>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 text-[11px] hidden sm:inline">Preset:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer max-w-[180px] sm:max-w-[220px] truncate"
            >
              {DB_SELECT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-slate-900 text-slate-200">
                  {preset.name}
                </option>
              ))}
              <option value="custom-blank" className="bg-slate-900 text-slate-200">
                Custom / Blank Template
              </option>
              {selectedPresetId === 'custom-imported' && (
                <option value="custom-imported" className="bg-slate-900 text-slate-200">
                  Imported Configuration
                </option>
              )}
            </select>
          </div>

          {/* Import / Export / Saved Configuration Buttons */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => handleOpenConfigModal('import')}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Import configuration from JSON file or text"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Import</span>
            </button>

            <button
              onClick={() => handleOpenConfigModal('export')}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Export configuration as JSON file or copy to clipboard"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>

            <button
              onClick={() => handleOpenConfigModal('saved')}
              className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="View and load saved templates in browser storage"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Saved</span>
            </button>
          </div>

          {/* Full Viewport Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className={`p-1.5 rounded-lg border transition-colors ${
                isFullScreen
                  ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 hover:bg-indigo-600/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-850'
              }`}
              title={isFullScreen ? 'Exit Full Viewport' : 'Expand to Full Viewport'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 mt-3 overflow-hidden min-h-0">
        {/* LEFT COLUMN: CONFIG & COLUMN INPUTS (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto pr-1 min-h-0">
          {/* Top Row: Target Table & Input Mode Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-1 min-w-[220px]">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-semibold shrink-0">
                  <Database className="w-3.5 h-3.5 text-indigo-400" />
                  Table:
                </div>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. users, order_items"
                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white font-mono flex-1 focus:outline-none focus:border-indigo-500"
                />
                <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                  <span>Alias:</span>
                  <input
                    type="text"
                    value={tableAlias}
                    onChange={(e) => setTableAlias(e.target.value)}
                    className="w-10 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-xs text-center font-mono text-slate-200"
                  />
                </div>
              </div>

              {/* Input Mode Selector */}
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5 text-xs">
                <button
                  onClick={() => setInputViewMode('lists')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    inputViewMode === 'lists'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListFilter className="w-3 h-3" />
                  Columns
                </button>
                <button
                  onClick={() => setInputViewMode('grid')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    inputViewMode === 'grid'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Table className="w-3 h-3" />
                  Grid ({maxRowCount})
                </button>
                <button
                  onClick={() => setInputViewMode('csv')}
                  className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                    inputViewMode === 'csv'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  CSV / TSV
                </button>
              </div>
            </div>
          </div>

          {/* VIEW MODE: CSV / TSV IMPORT */}
          {inputViewMode === 'csv' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Paste CSV or TSV Lookup Data
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Leading match key columns:</span>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={csvLeadingMatchCount}
                    onChange={(e) => setCsvLeadingMatchCount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-12 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-center text-slate-200 text-xs"
                  />
                </div>
              </div>

              <textarea
                value={csvRawInput}
                onChange={(e) => setCsvRawInput(e.target.value)}
                placeholder="tenant_id,id,status&#10;org-acme,101,active&#10;org-acme,102,pending&#10;org-acme,103,active"
                rows={6}
                className="w-full bg-slate-950 border border-slate-700 rounded-md p-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-slate-400">
                  Headers are auto-detected. Leading columns will be assigned as match filters, remaining as selected projection.
                </span>
                <button
                  onClick={handleApplyCsv}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  Parse &amp; Populate
                </button>
              </div>
            </div>
          )}

          {/* VIEW MODE: INTERACTIVE GRID */}
          {inputViewMode === 'grid' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    Row-by-Row Lookup Grid
                  </span>
                  <span className="text-[11px] text-slate-400">
                    ({maxRowCount} row{maxRowCount === 1 ? '' : 's'})
                  </span>
                </div>
                <button
                  onClick={handleAddGridRow}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-indigo-400" />
                  Add Row
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-md max-h-72">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="bg-slate-850 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 w-8 text-center">#</th>
                      {matchColumns.map((col) => (
                        <th key={col.id} className="px-2 py-1.5 font-mono text-amber-300">
                          {col.name}{' '}
                          <span className="text-[9px] text-slate-400 font-sans">
                            ({col.valueMode === 'single' ? 'const' : col.type})
                          </span>
                        </th>
                      ))}
                      <th className="px-2 py-1.5 w-10 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                    {Array.from({ length: Math.max(1, maxRowCount) }).map((_, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-850/40">
                        <td className="px-2 py-1 text-center text-slate-500 font-sans text-[11px]">
                          {rIdx + 1}
                        </td>
                        {matchColumns.map((col) => {
                          const isSingle = col.valueMode === 'single';
                          const val = isSingle
                            ? (col.singleValue !== undefined ? col.singleValue : col.values[0] || '')
                            : (col.values[rIdx] || '');
                          return (
                            <td key={col.id} className="px-2 py-1">
                              <input
                                type="text"
                                value={val}
                                disabled={isSingle && rIdx > 0}
                                onChange={(e) => {
                                  if (isSingle) {
                                    handleUpdateMatchColumn(col.id, {
                                      singleValue: e.target.value,
                                      values: [e.target.value],
                                    });
                                  } else {
                                    handleGridCellChange('match', col.id, rIdx, e.target.value);
                                  }
                                }}
                                className={`w-full bg-slate-950 border border-slate-750 rounded px-1.5 py-0.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 ${
                                  isSingle && rIdx > 0 ? 'opacity-40 bg-slate-900 cursor-not-allowed' : ''
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => handleDeleteGridRow(rIdx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE: COLUMN LISTS */}
          {inputViewMode === 'lists' && (
            <div className="space-y-3">
              {/* CARD 1: MATCH / FILTER COLUMNS */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Match &amp; Filter Criteria
                    </span>
                    <span className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                      {matchColumns.length} Column{matchColumns.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <button
                    onClick={handleAddMatchColumn}
                    className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Filter Key
                  </button>
                </div>

                <p className="text-[11px] text-slate-400">
                  Configure filters to match. Use <strong>Single Value</strong> for constant filters (e.g. tenant_id) or <strong>Value List</strong> for multiple lookup values.
                </p>

                {/* Match Columns List */}
                <div className="space-y-2.5">
                  {matchColumns.map((col, idx) => {
                    const isSingle = col.valueMode === 'single';
                    const listCount = col.values.length;
                    return (
                      <div
                        key={col.id}
                        className="bg-slate-950/70 border border-slate-800 hover:border-slate-700/80 rounded-md p-2.5 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                            <span className="text-[11px] font-mono text-slate-500 w-4 text-center">
                              #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={col.name}
                              onChange={(e) => handleUpdateMatchColumn(col.id, { name: e.target.value })}
                              placeholder="column_name"
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono flex-1 focus:outline-none focus:border-amber-500"
                            />
                            <select
                              value={col.type}
                              onChange={(e) =>
                                handleUpdateMatchColumn(col.id, { type: e.target.value as ColumnType })
                              }
                              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
                            >
                              <option value="text">text</option>
                              <option value="integer">integer</option>
                              <option value="numeric">numeric</option>
                              <option value="boolean">boolean</option>
                              <option value="timestamp">timestamp</option>
                              <option value="date">date</option>
                              <option value="uuid">uuid</option>
                              <option value="jsonb">jsonb</option>
                              <option value="raw">raw SQL</option>
                            </select>
                          </div>

                          {/* Mode Toggle: Single vs List */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center bg-slate-900 border border-slate-750 rounded p-0.5 text-[11px]">
                              <button
                                onClick={() => handleUpdateMatchColumn(col.id, { valueMode: 'single' })}
                                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                  isSingle
                                    ? 'bg-amber-500/20 text-amber-300 font-semibold'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Use a single constant value for all lookups"
                              >
                                Constant
                              </button>
                              <button
                                onClick={() => handleUpdateMatchColumn(col.id, { valueMode: 'list' })}
                                className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                                  !isSingle
                                    ? 'bg-indigo-600 text-white font-semibold'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Provide a distinct value per lookup row"
                              >
                                List ({listCount})
                              </button>
                            </div>

                            {matchColumns.length > 1 && (
                              <button
                                onClick={() => handleDeleteMatchColumn(col.id)}
                                className="text-slate-500 hover:text-rose-400 p-1"
                                title="Remove column"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Input Value: Single or List */}
                        {isSingle ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={col.singleValue !== undefined ? col.singleValue : col.values[0] || ''}
                              onChange={(e) =>
                                handleUpdateMatchColumn(col.id, {
                                  singleValue: e.target.value,
                                  values: [e.target.value],
                                })
                              }
                              placeholder="Constant filter value (e.g. org-123)"
                              className="w-full bg-slate-900 border border-slate-750 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <textarea
                              value={col.values.join('\n')}
                              onChange={(e) => handleMatchRawValuesChange(col.id, e.target.value)}
                              placeholder="Paste values separated by newlines, commas, or tabs..."
                              rows={3}
                              className="w-full bg-slate-900 border border-slate-750 rounded p-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                            />
                            <div className="flex items-center justify-between text-[10px] text-slate-500">
                              <span>{col.values.length} value(s) provided</span>
                              <button
                                onClick={() => {
                                  const inferred = inferColumnType(col.values);
                                  handleUpdateMatchColumn(col.id, { type: inferred });
                                }}
                                className="text-indigo-400 hover:underline flex items-center gap-1"
                              >
                                <Sparkles className="w-3 h-3" />
                                Auto-detect Type
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CARD 2: SELECT PROJECTION / COLUMNS TO RETRIEVE */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Columns className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Columns to Select (Projection)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle SELECT * */}
                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectAllColumns}
                        onChange={(e) => setSelectAllColumns(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-emerald-500 focus:ring-0"
                      />
                      <span>SELECT * (All Columns)</span>
                    </label>
                  </div>
                </div>

                {!selectAllColumns && (
                  <div className="space-y-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-slate-400">
                          Custom SELECT expression or comma-separated columns:
                        </label>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setCustomSelectClause('t.id, t.username, t.email, t.status')}
                            className="text-[10px] text-slate-400 hover:text-emerald-400 px-1.5 py-0.5 rounded bg-slate-800"
                          >
                            User profile
                          </button>
                          <button
                            onClick={() => setCustomSelectClause('id, order_id, sku, quantity, unit_price')}
                            className="text-[10px] text-slate-400 hover:text-emerald-400 px-1.5 py-0.5 rounded bg-slate-800"
                          >
                            Line items
                          </button>
                          <button
                            onClick={() => setCustomSelectClause('COUNT(*) AS total_count')}
                            className="text-[10px] text-slate-400 hover:text-emerald-400 px-1.5 py-0.5 rounded bg-slate-800"
                          >
                            Count aggregation
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={customSelectClause}
                        onChange={(e) => setCustomSelectClause(e.target.value)}
                        placeholder="e.g. t.id, t.name, t.email, COALESCE(t.status, 'active') AS status"
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-750 rounded p-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* CARD 3: QUERY STRATEGY & MODIFIERS */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-semibold text-slate-200">
                      Query Strategy &amp; Execution Options
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Strategy Selector */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Query Strategy
                    </label>
                    <select
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value as SelectStrategy)}
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="batch_values">⚡ JOIN (VALUES (...)) Batch</option>
                      <option value="in_clause">🔍 IN / Tuple-IN Clause</option>
                      <option value="cte">📋 Common Table Expression (CTE)</option>
                      <option value="individual">📝 Individual SELECT Statements</option>
                      <option value="union_all">🔗 UNION ALL with Query Index</option>
                    </select>
                  </div>

                  {/* Execution Mode */}
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Execution Mode
                    </label>
                    <select
                      value={executionMode}
                      onChange={(e) => setExecutionMode(e.target.value as QueryExecutionMode)}
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="batch">Single Batch Query</option>
                      <option value="individual">Separate Individual Statements</option>
                    </select>
                  </div>
                </div>

                {/* Modifiers: ORDER BY, LIMIT, OFFSET */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      ORDER BY
                    </label>
                    <input
                      type="text"
                      value={orderBy}
                      onChange={(e) => setOrderBy(e.target.value)}
                      placeholder="e.g. t.id ASC, created_at DESC"
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      LIMIT (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={limit}
                      onChange={(e) => setLimit(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      OFFSET (Optional)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={offset}
                      onChange={(e) => setOffset(e.target.value)}
                      placeholder="e.g. 0"
                      className="w-full bg-slate-950 border border-slate-750 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Boolean Switches */}
                <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-slate-800 text-xs">
                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isDistinct}
                      onChange={(e) => setIsDistinct(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>DISTINCT Rows</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeTypeCasts}
                      onChange={(e) => setIncludeTypeCasts(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>PostgreSQL Type Casts (::text, ::int)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeRowComments}
                      onChange={(e) => setIncludeRowComments(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0"
                    />
                    <span>Row Comment Annotations</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: CODE VIEWER & OUTPUT (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col h-full overflow-hidden bg-slate-900/90 border border-slate-800 rounded-lg min-h-0">
          {/* Header Tabs & Actions */}
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between bg-slate-850 shrink-0">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setOutputTab('sql')}
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  outputTab === 'sql'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code className="w-3.5 h-3.5" />
                PostgreSQL Query
              </button>
              <button
                onClick={() => setOutputTab('python')}
                className={`px-3 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                  outputTab === 'python'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play className="w-3.5 h-3.5" />
                Python Script
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() =>
                  copyToClipboard(
                    outputTab === 'sql' ? queryResult.sql : queryResult.pythonSnippet,
                    'output'
                  )
                }
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded flex items-center gap-1 transition-colors cursor-pointer"
                title="Copy to clipboard"
              >
                {copiedKey === 'output' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedKey === 'output' ? 'Copied' : 'Copy'}</span>
              </button>

              {outputTab === 'sql' && (
                <button
                  onClick={handleDownloadSql}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded flex items-center gap-1 transition-colors cursor-pointer"
                  title="Download as .sql file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Warnings Banner */}
          {queryResult.warnings.length > 0 && (
            <div className="bg-amber-950/40 border-b border-amber-800/50 px-3 py-1.5 text-[11px] text-amber-300 flex items-center gap-1.5 shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">{queryResult.warnings[0]}</span>
            </div>
          )}

          {/* Code Output Viewer */}
          <div className="flex-1 p-3 overflow-y-auto bg-slate-950/80 font-mono text-xs leading-relaxed min-h-0">
            {outputTab === 'sql' ? (
              <pre className="text-emerald-300/90 whitespace-pre-wrap select-all font-mono">
                {queryResult.sql}
              </pre>
            ) : (
              <pre className="text-cyan-300/90 whitespace-pre-wrap select-all font-mono">
                {queryResult.pythonSnippet}
              </pre>
            )}
          </div>

          {/* Footer Summary / Quick Stats */}
          <div className="bg-slate-850 px-3 py-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-3">
              <span>
                Table: <strong className="text-slate-200">{tableName || 'None'}</strong>
              </span>
              <span>
                Match Keys:{' '}
                <strong className="text-amber-400">
                  {matchColumns
                    .map((m) => `${m.name} (${m.valueMode === 'single' ? 'const' : 'list'})`)
                    .join(', ')}
                </strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                {strategy === 'batch_values'
                  ? '⚡ VALUES Batch'
                  : strategy === 'in_clause'
                  ? '🔍 IN / Tuple-IN'
                  : strategy === 'cte'
                  ? '📋 CTE Join'
                  : strategy === 'individual'
                  ? '📝 Individual'
                  : '🔗 UNION ALL'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {queryResult.rowCount} row(s)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Export / Import / Templates Modal */}
      <DbSelectConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        initialTab={configModalTab}
        currentConfigData={{
          tableName,
          matchColumns,
          selectColumns,
          selectAllColumns,
          customSelectClause,
          executionMode,
          strategy,
          isDistinct,
          orderBy,
          limit,
          offset,
          includeTypeCasts,
          includeRowComments,
        }}
        onApplyConfig={handleApplyConfig}
      />
    </div>
  );
};
