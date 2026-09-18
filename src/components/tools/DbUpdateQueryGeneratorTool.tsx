import React, { useState, useMemo } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
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
} from 'lucide-react';
import {
  ColumnType,
  ValueMode,
  QueryExecutionMode,
  UpdateStrategy,
  TransactionMode,
  MatchColumn,
  UpdateColumn,
  UpdateQueryOptions,
  generatePostgresUpdateQuery,
  parseDelimitedValues,
  inferColumnType,
  parseCsvOrTsv,
  DB_UPDATE_PRESETS,
} from '../../utils/dbUpdateQueryGenerator';

interface DbUpdateQueryGeneratorToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DbUpdateQueryGeneratorTool: React.FC<DbUpdateQueryGeneratorToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  // Preset selection
  const [selectedPresetId, setSelectedPresetId] = useState<string>('users-status-role');

  // Core Inputs
  const [tableName, setTableName] = useState<string>('users');
  const [matchColumns, setMatchColumns] = useState<MatchColumn[]>([
    {
      id: 'match-1',
      name: 'id',
      type: 'integer',
      valueMode: 'list',
      singleValue: '',
      values: ['101', '102', '103', '104', '105'],
    },
  ]);
  const [updateColumns, setUpdateColumns] = useState<UpdateColumn[]>([
    {
      id: 'upd-1',
      name: 'status',
      type: 'text',
      values: ['active', 'inactive', 'suspended', 'active', 'pending_verification'],
    },
    {
      id: 'upd-2',
      name: 'role',
      type: 'text',
      values: ['admin', 'editor', 'viewer', 'moderator', 'member'],
    },
    {
      id: 'upd-3',
      name: 'updated_at',
      type: 'timestamp',
      values: [
        '2026-09-18 10:00:00',
        '2026-09-18 10:00:00',
        '2026-09-18 10:00:00',
        '2026-09-18 10:00:00',
        '2026-09-18 10:00:00',
      ],
    },
  ]);

  // Query Execution & Format Mode ('batch' vs 'individual')
  const [executionMode, setExecutionMode] = useState<QueryExecutionMode>('batch');
  const [strategy, setStrategy] = useState<UpdateStrategy>('batch_values');
  const [includeRowComments, setIncludeRowComments] = useState<boolean>(true);
  const [transactionMode, setTransactionMode] = useState<TransactionMode>('commit');
  const [returningClause, setReturningClause] = useState<string>('id, status, role, updated_at');
  const [includeTypeCasts, setIncludeTypeCasts] = useState<boolean>(true);

  // UI state
  const [inputViewMode, setInputViewMode] = useState<'lists' | 'grid' | 'csv'>('lists');
  const [outputTab, setOutputTab] = useState<'sql' | 'python'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [csvRawInput, setCsvRawInput] = useState<string>('');
  const [csvLeadingMatchCount, setCsvLeadingMatchCount] = useState<number>(1);

  // Load preset handler
  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom-blank') {
      setTableName('my_table');
      setExecutionMode('batch');
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
      setUpdateColumns([
        {
          id: 'upd-' + Date.now(),
          name: 'status',
          type: 'text',
          values: ['active', 'inactive', 'active'],
        },
      ]);
      setReturningClause('*');
      return;
    }

    const preset = DB_UPDATE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      setTableName(preset.tableName);
      setExecutionMode(preset.executionMode || (preset.strategy === 'individual' ? 'individual' : 'batch'));
      setMatchColumns(JSON.parse(JSON.stringify(preset.matchColumns)));
      setUpdateColumns(JSON.parse(JSON.stringify(preset.updateColumns)));
      setStrategy(preset.strategy);
      setTransactionMode(preset.transactionMode);
      setReturningClause(preset.returningClause || '');
      if (preset.includeRowComments !== undefined) {
        setIncludeRowComments(preset.includeRowComments);
      }
    }
  };

  // Determine total row count
  const maxRowCount = useMemo(() => {
    let max = 0;
    matchColumns.forEach((c) => {
      if (c.valueMode !== 'single' && c.values.length > max) {
        max = c.values.length;
      }
    });
    updateColumns.forEach((c) => {
      if (c.values.length > max) max = c.values.length;
    });
    if (max === 0) {
      const hasSingle = matchColumns.some(
        (c) => c.valueMode === 'single' && (c.singleValue || (c.values && c.values[0]))
      );
      if (hasSingle) max = 1;
    }
    return max;
  }, [matchColumns, updateColumns]);

  // Generate Query Result
  const queryResult = useMemo(() => {
    const options: UpdateQueryOptions = {
      tableName,
      matchColumns,
      updateColumns,
      executionMode,
      strategy,
      transactionMode,
      returningClause,
      includeTypeCasts,
      includeRowComments,
    };
    return generatePostgresUpdateQuery(options);
  }, [
    tableName,
    matchColumns,
    updateColumns,
    executionMode,
    strategy,
    transactionMode,
    returningClause,
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
    link.download = `${tableName || 'query'}_${executionMode}_update_${Date.now()}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Add a new update column
  const handleAddUpdateColumn = () => {
    const newId = 'upd-' + Date.now();
    const newCol: UpdateColumn = {
      id: newId,
      name: `column_${updateColumns.length + 1}`,
      type: 'text',
      values: new Array(maxRowCount).fill(''),
    };
    setUpdateColumns([...updateColumns, newCol]);
  };

  // Remove an update column
  const handleRemoveUpdateColumn = (id: string) => {
    if (updateColumns.length <= 1) {
      alert('You must have at least one update column.');
      return;
    }
    setUpdateColumns(updateColumns.filter((col) => col.id !== id));
  };

  // Update a single update column definition
  const handleUpdateColField = (
    id: string,
    field: keyof UpdateColumn,
    value: any
  ) => {
    setUpdateColumns(
      updateColumns.map((col) => (col.id === id ? { ...col, [field]: value } : col))
    );
  };

  // Update raw values for an update column from textarea
  const handleUpdateColRawValues = (id: string, rawText: string) => {
    const parsed = parseDelimitedValues(rawText);
    setUpdateColumns(
      updateColumns.map((col) => {
        if (col.id === id) {
          return { ...col, values: parsed };
        }
        return col;
      })
    );
  };

  // Add a match column (defaults to list mode or single mode)
  const handleAddMatchColumn = (mode: ValueMode = 'list') => {
    const newId = 'match-' + Date.now();
    const newCol: MatchColumn = {
      id: newId,
      name: `key_${matchColumns.length + 1}`,
      type: 'text',
      valueMode: mode,
      singleValue: '',
      values: mode === 'list' ? new Array(maxRowCount).fill('') : [],
    };
    setMatchColumns([...matchColumns, newCol]);
  };

  // Remove a match column
  const handleRemoveMatchColumn = (id: string) => {
    if (matchColumns.length <= 1) {
      alert('At least one match column is required for the WHERE clause.');
      return;
    }
    setMatchColumns(matchColumns.filter((col) => col.id !== id));
  };

  // Toggle match column value mode (Single Value vs List of Values)
  const handleToggleMatchColMode = (id: string, mode: ValueMode) => {
    setMatchColumns(
      matchColumns.map((col) => {
        if (col.id === id) {
          if (mode === 'single') {
            const initialSingle = col.singleValue || (col.values && col.values[0]) || '';
            return {
              ...col,
              valueMode: 'single',
              singleValue: initialSingle,
            };
          } else {
            const initialList =
              col.values && col.values.length > 0
                ? col.values
                : col.singleValue
                ? [col.singleValue]
                : [];
            return {
              ...col,
              valueMode: 'list',
              values: initialList,
            };
          }
        }
        return col;
      })
    );
  };

  // Update single value for a match column
  const handleMatchColSingleValue = (id: string, singleValue: string) => {
    setMatchColumns(
      matchColumns.map((col) =>
        col.id === id
          ? {
              ...col,
              singleValue,
              values: [singleValue],
            }
          : col
      )
    );
  };

  // Update raw values for a match column from textarea
  const handleMatchColRawValues = (id: string, rawText: string) => {
    const parsed = parseDelimitedValues(rawText);
    setMatchColumns(
      matchColumns.map((col) => {
        if (col.id === id) {
          return { ...col, values: parsed };
        }
        return col;
      })
    );
  };

  // Grid editing: update a cell in match or update columns
  const handleGridCellChange = (
    isMatch: boolean,
    colId: string,
    rowIndex: number,
    newValue: string
  ) => {
    if (isMatch) {
      setMatchColumns((prev) =>
        prev.map((c) => {
          if (c.id === colId) {
            if (c.valueMode === 'single') {
              return { ...c, singleValue: newValue, values: [newValue] };
            }
            const nextVals = [...c.values];
            while (nextVals.length <= rowIndex) nextVals.push('');
            nextVals[rowIndex] = newValue;
            return { ...c, values: nextVals };
          }
          return c;
        })
      );
    } else {
      setUpdateColumns((prev) =>
        prev.map((c) => {
          if (c.id === colId) {
            const nextVals = [...c.values];
            while (nextVals.length <= rowIndex) nextVals.push('');
            nextVals[rowIndex] = newValue;
            return { ...c, values: nextVals };
          }
          return c;
        })
      );
    }
  };

  // Grid editing: Add a new row to list columns
  const handleAddGridRow = () => {
    setMatchColumns((prev) =>
      prev.map((c) => (c.valueMode !== 'single' ? { ...c, values: [...c.values, ''] } : c))
    );
    setUpdateColumns((prev) =>
      prev.map((c) => ({ ...c, values: [...c.values, ''] }))
    );
  };

  // Grid editing: Delete a specific row
  const handleDeleteGridRow = (rowIndex: number) => {
    setMatchColumns((prev) =>
      prev.map((c) =>
        c.valueMode !== 'single'
          ? { ...c, values: c.values.filter((_, idx) => idx !== rowIndex) }
          : c
      )
    );
    setUpdateColumns((prev) =>
      prev.map((c) => ({
        ...c,
        values: c.values.filter((_, idx) => idx !== rowIndex),
      }))
    );
  };

  // CSV/TSV Import Handler
  const handleImportCsv = () => {
    if (!csvRawInput.trim()) return;

    const { headers, rows } = parseCsvOrTsv(csvRawInput);
    if (headers.length === 0 || rows.length === 0) {
      alert('Could not parse any columns or rows from input.');
      return;
    }

    const matchCount = Math.min(Math.max(1, csvLeadingMatchCount), headers.length - 1 || 1);

    // Create match columns from leading columns
    const newMatchCols: MatchColumn[] = [];
    for (let c = 0; c < matchCount; c++) {
      const matchHeader = headers[c] || `key_${c + 1}`;
      const matchVals = rows.map((r) => r[c] || '');
      const matchType = inferColumnType(matchVals);
      newMatchCols.push({
        id: `match-${Date.now()}-${c}`,
        name: matchHeader,
        type: matchType,
        valueMode: 'list',
        values: matchVals,
      });
    }
    setMatchColumns(newMatchCols);

    // Remaining columns are update columns
    const newUpdCols: UpdateColumn[] = [];
    for (let c = matchCount; c < headers.length; c++) {
      const header = headers[c] || `col_${c}`;
      const vals = rows.map((r) => r[c] || '');
      const inferred = inferColumnType(vals);
      newUpdCols.push({
        id: `upd-${Date.now()}-${c}`,
        name: header,
        type: inferred,
        values: vals,
      });
    }

    if (newUpdCols.length > 0) {
      setUpdateColumns(newUpdCols);
    }

    setInputViewMode('lists');
  };

  const columnTypes: ColumnType[] = [
    'text',
    'integer',
    'numeric',
    'boolean',
    'timestamp',
    'date',
    'jsonb',
    'uuid',
    'raw',
  ];

  return (
    <div className={`flex flex-col ${isFullScreen ? 'h-screen p-4' : 'max-h-[85vh] p-3'} overflow-hidden bg-slate-950 text-slate-100 font-sans`}>
      {/* TOOLBAR HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 tracking-wide">
                Database Update Query Generator
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                PostgreSQL
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Multi-match columns (single or list values), batch query syntax (FROM VALUES, CTE, CASE-WHEN) & individual statements
            </p>
          </div>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-400 text-[11px]">Preset:</span>
            <select
              value={selectedPresetId}
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer max-w-[220px] truncate"
            >
              {DB_UPDATE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-slate-900 text-slate-200">
                  {preset.name}
                </option>
              ))}
              <option value="custom-blank" className="bg-slate-900 text-slate-200">
                Custom / Blank Template
              </option>
            </select>
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
        {/* LEFT COLUMN: CONFIG & COLUMN VALUES INPUTS (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-3 overflow-y-auto pr-1 min-h-0">
          {/* Top Row: Target Table & Input Mode Tabs */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[220px]">
              <label className="text-xs font-semibold text-slate-300 shrink-0">Target Table:</label>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. users, public.inventory, store_items"
                  className="w-full bg-slate-950 text-slate-100 font-mono text-xs border border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Input View Mode Tabs */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setInputViewMode('lists')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  inputViewMode === 'lists'
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Column Lists
              </button>
              <button
                onClick={() => setInputViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  inputViewMode === 'grid'
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Data Grid
              </button>
              <button
                onClick={() => setInputViewMode('csv')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-colors ${
                  inputViewMode === 'csv'
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                CSV/TSV Import
              </button>
            </div>
          </div>

          {/* PROMINENT CONFIGURATION: QUERY EXECUTION FORMAT (BATCH vs INDIVIDUAL) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-200">Query Mode:</span>
                <span className="text-[10px] text-slate-400">Choose single batch statement or discrete statements</span>
              </div>
            </div>

            {/* Toggle Buttons */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setExecutionMode('batch')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  executionMode === 'batch'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Generate a single atomic query using FROM (VALUES ...), CTE, or CASE-WHEN"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Batch Query (Single Atomic)
              </button>
              <button
                onClick={() => setExecutionMode('individual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all ${
                  executionMode === 'individual'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Generate discrete individual UPDATE ... WHERE ...; statements for every row"
              >
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Individual Queries (Per Row)
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: COLUMN LISTS (DEFAULT) */}
          {inputViewMode === 'lists' && (
            <div className="flex flex-col gap-3 flex-1">
              {/* SECTION A: MULTIPLE MATCH COLUMNS (WHERE CLAUSE) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Match Columns (WHERE Clause)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({matchColumns.length} key{matchColumns.length > 1 ? 's' : ''} configured)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAddMatchColumn('list')}
                      className="px-2 py-1 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Add another match column with a list of per-row values"
                    >
                      <Plus className="w-3 h-3" />
                      Add List Match Key
                    </button>
                    <button
                      onClick={() => handleAddMatchColumn('single')}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Add a constant single-value match filter (e.g. tenant_id, store_id)"
                    >
                      <Filter className="w-3 h-3 text-amber-400" />
                      Add Single Value Filter
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {matchColumns.map((col, idx) => {
                    const isSingle = col.valueMode === 'single';
                    return (
                      <div
                        key={col.id}
                        className="bg-slate-950/80 border border-slate-800 rounded-lg p-3 flex flex-col gap-2.5 shadow-sm"
                      >
                        {/* Header Row: Key index, Name, Type, Mode Toggle, Trash */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                            <span className="text-[11px] text-amber-400/90 font-mono font-bold bg-amber-950/40 border border-amber-900/50 px-1.5 py-0.5 rounded">
                              Match #{idx + 1}
                            </span>
                            <input
                              type="text"
                              value={col.name}
                              onChange={(e) => {
                                const updated = matchColumns.map((c) =>
                                  c.id === col.id ? { ...c, name: e.target.value } : c
                                );
                                setMatchColumns(updated);
                              }}
                              placeholder="e.g. tenant_id, sku, id"
                              className="bg-slate-900 text-slate-200 font-mono text-xs border border-slate-750 rounded px-2.5 py-1 w-36 focus:outline-none focus:border-amber-500 font-medium"
                            />
                            <select
                              value={col.type}
                              onChange={(e) => {
                                const updated = matchColumns.map((c) =>
                                  c.id === col.id
                                    ? { ...c, type: e.target.value as ColumnType }
                                    : c
                                );
                                setMatchColumns(updated);
                              }}
                              className="bg-slate-900 text-slate-300 font-mono text-xs border border-slate-750 rounded px-2 py-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                            >
                              {columnTypes.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>

                            {/* Mode Toggle: Single Value vs List of Values */}
                            <div className="flex items-center bg-slate-900 p-0.5 rounded border border-slate-750 text-[11px]">
                              <button
                                onClick={() => handleToggleMatchColMode(col.id, 'single')}
                                className={`px-2 py-0.5 rounded transition-colors ${
                                  isSingle
                                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="Single Value: Fixed constant applied across all updated rows (e.g. tenant_id = 'org_1')"
                              >
                                🎯 Single Value
                              </button>
                              <button
                                onClick={() => handleToggleMatchColMode(col.id, 'list')}
                                className={`px-2 py-0.5 rounded transition-colors ${
                                  !isSingle
                                    ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                                title="List of Values: Row-by-row match values mapped to each update row"
                              >
                                📋 List of Values
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono">
                              {isSingle ? 'Constant Filter' : `${col.values.length} row values`}
                            </span>
                            {matchColumns.length > 1 && (
                              <button
                                onClick={() => handleRemoveMatchColumn(col.id)}
                                className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                                title="Remove this match key"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Value Input Section depending on valueMode */}
                        {isSingle ? (
                          <div className="bg-slate-900/90 border border-amber-500/20 rounded-lg p-2.5 flex flex-col gap-1.5">
                            <div className="flex items-center gap-2">
                              <label className="text-[11px] font-semibold text-amber-300 shrink-0">
                                Single Match Value:
                              </label>
                              <input
                                type="text"
                                value={col.singleValue ?? col.values[0] ?? ''}
                                onChange={(e) => handleMatchColSingleValue(col.id, e.target.value)}
                                placeholder="e.g. tenant_us_east, STORE-882, 1001, ACTIVE"
                                className="flex-1 bg-slate-950 text-amber-200 font-mono text-xs border border-slate-700 rounded px-2.5 py-1 focus:outline-none focus:border-amber-500 font-medium"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Info className="w-3 h-3 text-amber-400 shrink-0" />
                              Constant WHERE filter: <code className="text-amber-300 font-mono">{col.name || 'key'} = {col.singleValue || col.values[0] || '...'}</code> is applied across all update records.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            <textarea
                              value={col.values.join('\n')}
                              onChange={(e) => handleMatchColRawValues(col.id, e.target.value)}
                              rows={isFullScreen ? 4 : 3}
                              placeholder="Paste list of match keys (one per line, comma-separated, or tab-separated)..."
                              className="w-full font-mono text-xs bg-slate-900 text-amber-200/90 border border-slate-800 rounded p-2 focus:outline-none focus:border-amber-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                            />
                            <span className="text-[10px] text-slate-400">
                              Row-specific keys joined per record (one value per updated entity)
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION B: UPDATE COLUMNS (SET CLAUSE) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 flex-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Columns to Update (SET Clause)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      ({updateColumns.length} columns defined)
                    </span>
                  </div>
                  <button
                    onClick={handleAddUpdateColumn}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Column
                  </button>
                </div>

                {/* List of Update Columns */}
                <div className="flex flex-col gap-2.5">
                  {updateColumns.map((col, idx) => (
                    <div key={col.id} className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                          <span className="text-[11px] text-slate-500 font-mono">Col #{idx + 1}</span>
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => handleUpdateColField(col.id, 'name', e.target.value)}
                            placeholder="Column name (e.g. status)"
                            className="bg-slate-900 text-slate-100 font-mono text-xs border border-slate-750 rounded px-2.5 py-1 w-40 focus:outline-none focus:border-indigo-500"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => handleUpdateColField(col.id, 'type', e.target.value as ColumnType)}
                            className="bg-slate-900 text-slate-300 font-mono text-xs border border-slate-750 rounded px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            {columnTypes.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => {
                              const inferred = inferColumnType(col.values);
                              handleUpdateColField(col.id, 'type', inferred);
                            }}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 transition-colors"
                            title="Auto-detect data type from values"
                          >
                            Auto-Type
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[11px] px-2 py-0.5 rounded font-mono ${
                              col.values.length !== maxRowCount
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {col.values.length} / {maxRowCount} values
                          </span>
                          <button
                            onClick={() => handleRemoveUpdateColumn(col.id)}
                            className="text-slate-500 hover:text-red-400 p-1 transition-colors"
                            title="Delete this update column"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Textarea for list of values */}
                      <textarea
                        value={col.values.join('\n')}
                        onChange={(e) => handleUpdateColRawValues(col.id, e.target.value)}
                        rows={isFullScreen ? 4 : 3}
                        placeholder={`Paste list of values for "${col.name}" (one per line, comma-separated, or tab-separated)...`}
                        className="w-full font-mono text-xs bg-slate-900 text-slate-200 border border-slate-800 rounded p-2 focus:outline-none focus:border-indigo-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: INTERACTIVE DATA GRID */}
          {inputViewMode === 'grid' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5 flex-1 min-h-[300px]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Table className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold text-slate-200">Interactive Spreadsheet Grid</span>
                  <span className="text-[11px] text-slate-400">({maxRowCount} rows)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddGridRow}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    Add Row
                  </button>
                  <button
                    onClick={() => handleAddMatchColumn('list')}
                    className="px-2.5 py-1 rounded bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Match Key
                  </button>
                  <button
                    onClick={handleAddUpdateColumn}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Update Col
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-[420px]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-850 text-slate-300 border-b border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="px-2.5 py-2 text-center text-slate-500 w-10">#</th>
                      {matchColumns.map((col) => (
                        <th key={col.id} className="px-3 py-2 border-r border-slate-800 bg-amber-950/30 text-amber-300">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1">
                              <span>🔑 {col.name}</span>
                              <span className="text-[10px] text-amber-400/70 font-sans">
                                ({col.valueMode === 'single' ? 'Single' : col.type})
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleMatchColMode(col.id, col.valueMode === 'single' ? 'list' : 'single')}
                              className="text-[9px] px-1 py-0.5 bg-slate-900 rounded border border-amber-500/30 hover:bg-amber-500 hover:text-slate-950"
                              title="Toggle Single vs List mode"
                            >
                              {col.valueMode === 'single' ? '🎯' : '📋'}
                            </button>
                          </div>
                        </th>
                      ))}
                      {updateColumns.map((col) => (
                        <th key={col.id} className="px-3 py-2 border-r border-slate-800">
                          <div className="flex items-center gap-1.5">
                            <span className="text-indigo-300">{col.name}</span>
                            <span className="text-[10px] text-slate-400 font-sans">({col.type})</span>
                          </div>
                        </th>
                      ))}
                      <th className="px-2 py-2 w-10 text-center text-slate-500">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 bg-slate-950">
                    {Array.from({ length: maxRowCount }).map((_, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/50">
                        <td className="px-2.5 py-1.5 text-center text-slate-500 text-[11px]">{rIdx + 1}</td>
                        {matchColumns.map((col) => {
                          const isSingle = col.valueMode === 'single';
                          const cellVal = isSingle
                            ? col.singleValue ?? col.values[0] ?? ''
                            : col.values[rIdx] || '';
                          return (
                            <td key={col.id} className="px-2 py-1 border-r border-slate-800/80 bg-amber-950/10">
                              <input
                                type="text"
                                value={cellVal}
                                onChange={(e) => handleGridCellChange(true, col.id, rIdx, e.target.value)}
                                placeholder={isSingle ? 'Constant...' : 'Key...'}
                                className={`w-full bg-transparent px-1 py-0.5 focus:outline-none focus:bg-slate-850 rounded ${
                                  isSingle ? 'text-amber-300 font-semibold' : 'text-amber-200'
                                }`}
                              />
                            </td>
                          );
                        })}
                        {updateColumns.map((col) => (
                          <td key={col.id} className="px-2 py-1 border-r border-slate-800/80">
                            <input
                              type="text"
                              value={col.values[rIdx] || ''}
                              onChange={(e) => handleGridCellChange(false, col.id, rIdx, e.target.value)}
                              className="w-full bg-transparent text-slate-200 px-1 py-0.5 focus:outline-none focus:bg-slate-850 rounded"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => handleDeleteGridRow(rIdx)}
                            className="text-slate-600 hover:text-red-400 p-1"
                            title="Delete row"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE 3: CSV/TSV IMPORT */}
          {inputViewMode === 'csv' && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Import CSV, TSV, or Spreadsheet Data</h3>
                  <p className="text-[11px] text-slate-400">
                    Paste raw tabular data copied directly from Google Sheets, Excel, or CSV files.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-300">Leading Match Columns:</label>
                  <select
                    value={csvLeadingMatchCount}
                    onChange={(e) => setCsvLeadingMatchCount(parseInt(e.target.value, 10))}
                    className="bg-slate-950 text-slate-200 font-mono text-xs border border-slate-700 rounded px-2 py-1"
                  >
                    <option value={1}>1 Column (First Column)</option>
                    <option value={2}>2 Columns (Composite Key)</option>
                    <option value={3}>3 Columns (Composite Key)</option>
                  </select>
                </div>
              </div>

              <textarea
                value={csvRawInput}
                onChange={(e) => setCsvRawInput(e.target.value)}
                rows={isFullScreen ? 10 : 8}
                placeholder={`tenant_id,store_id,sku,stock_quantity,reorder_threshold\ntenant_us_east,STORE-882,SKU-1001,120,25\ntenant_us_east,STORE-882,SKU-1002,45,10\ntenant_us_east,STORE-882,SKU-1003,0,15`}
                className="w-full font-mono text-xs bg-slate-950 text-slate-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-indigo-500 whitespace-pre overflow-x-auto leading-relaxed"
              />

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setCsvRawInput('')}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-medium"
                >
                  Clear
                </button>
                <button
                  onClick={handleImportCsv}
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Parse & Apply Columns
                </button>
              </div>
            </div>
          )}

          {/* SECTION C: QUERY OPTIONS BAR */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            {/* Strategy selector for Batch Mode */}
            {executionMode === 'batch' ? (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-400">Batch Strategy:</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value as UpdateStrategy)}
                  className="bg-slate-950 text-slate-200 font-mono text-xs border border-slate-750 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="batch_values">FROM (VALUES ...) (Fast Batch)</option>
                  <option value="case_when">Single UPDATE with CASE-WHEN</option>
                  <option value="cte">CTE (WITH updates AS ...)</option>
                </select>
              </div>
            ) : (
              <label className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-slate-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRowComments}
                  onChange={(e) => setIncludeRowComments(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600"
                />
                Include Row Comments (-- Row N: key=val)
              </label>
            )}

            {/* Transaction Mode */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">Transaction:</label>
              <select
                value={transactionMode}
                onChange={(e) => setTransactionMode(e.target.value as TransactionMode)}
                className="bg-slate-950 text-slate-200 font-mono text-xs border border-slate-750 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="none">None (Plain Query)</option>
                <option value="commit">BEGIN ... COMMIT (Safe)</option>
                <option value="rollback">BEGIN ... ROLLBACK (Dry Run)</option>
              </select>
            </div>

            {/* RETURNING Clause */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">RETURNING:</label>
              <input
                type="text"
                value={returningClause}
                onChange={(e) => setReturningClause(e.target.value)}
                placeholder="e.g. *, id, updated_at"
                className="bg-slate-950 text-slate-200 font-mono text-xs border border-slate-750 rounded-lg px-2 py-1 w-36 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Type Casts Toggle */}
            <label className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTypeCasts}
                onChange={(e) => setIncludeTypeCasts(e.target.checked)}
                className="rounded border-slate-700 bg-slate-800 text-indigo-600"
              />
              Include Type Casts (::type)
            </label>
          </div>
        </div>

        {/* RIGHT COLUMN: GENERATED QUERY & OUTPUT PANE (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0">
          {/* Output Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col flex-1 shadow-sm min-h-0">
            {/* Header & Tabs */}
            <div className="bg-slate-850 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setOutputTab('sql')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      outputTab === 'sql'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Code className="w-3.5 h-3.5" />
                    SQL Query
                  </button>
                  <button
                    onClick={() => setOutputTab('python')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                      outputTab === 'python'
                        ? 'bg-indigo-600 text-white font-medium shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    Python Test Script
                  </button>
                </div>

                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {queryResult.rowCount} rows • {queryResult.columnCount} cols
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => copyToClipboard(outputTab === 'sql' ? queryResult.sql : queryResult.pythonSnippet, 'output-copy')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Copy to Clipboard"
                >
                  {copiedKey === 'output-copy' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'output-copy' ? 'Copied!' : 'Copy'}</span>
                </button>
                <button
                  onClick={handleDownloadSql}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 transition-colors"
                  title="Download .sql file"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Warnings Bar if any */}
            {queryResult.warnings.length > 0 && (
              <div className="bg-amber-950/30 border-b border-amber-900/50 px-3 py-2 text-xs text-amber-300 flex items-start gap-2 shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1 space-y-0.5">
                  {queryResult.warnings.map((w, idx) => (
                    <div key={idx} className="text-[11px]">
                      {w}
                    </div>
                  ))}
                </div>
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
                      .map((m) => `${m.name} (${m.valueMode === 'single' ? 'single' : 'list'})`)
                      .join(', ')}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-semibold">
                  {executionMode === 'batch' ? '⚡ Batch Mode' : '📝 Individual Mode'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {executionMode === 'individual'
                    ? 'Individual Statements'
                    : strategy === 'batch_values'
                    ? 'PostgreSQL VALUES Batch'
                    : strategy === 'case_when'
                    ? 'CASE-WHEN'
                    : 'CTE Expression'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
