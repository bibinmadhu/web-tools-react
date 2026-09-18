import React, { useState, useMemo, useEffect } from 'react';
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
  CheckCircle2,
  Maximize2,
  Minimize2,
  Sliders,
  Play,
  RotateCcw,
  FileCode,
  HelpCircle,
} from 'lucide-react';
import {
  ColumnType,
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

  // Query Options
  const [strategy, setStrategy] = useState<UpdateStrategy>('batch_values');
  const [transactionMode, setTransactionMode] = useState<TransactionMode>('commit');
  const [returningClause, setReturningClause] = useState<string>('id, status, role, updated_at');
  const [includeTypeCasts, setIncludeTypeCasts] = useState<boolean>(true);

  // UI state
  const [inputViewMode, setInputViewMode] = useState<'lists' | 'grid' | 'csv'>('lists');
  const [outputTab, setOutputTab] = useState<'sql' | 'python' | 'summary'>('sql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [csvRawInput, setCsvRawInput] = useState<string>('');
  const [csvFirstColIsMatch, setCsvFirstColIsMatch] = useState<boolean>(true);

  // Load preset handler
  const handleLoadPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom-blank') {
      setTableName('my_table');
      setMatchColumns([
        {
          id: 'match-' + Date.now(),
          name: 'id',
          type: 'integer',
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
      setMatchColumns(JSON.parse(JSON.stringify(preset.matchColumns)));
      setUpdateColumns(JSON.parse(JSON.stringify(preset.updateColumns)));
      setStrategy(preset.strategy);
      setTransactionMode(preset.transactionMode);
      setReturningClause(preset.returningClause || '');
    }
  };

  // Determine total row count
  const maxRowCount = useMemo(() => {
    let max = 0;
    matchColumns.forEach((c) => {
      if (c.values.length > max) max = c.values.length;
    });
    updateColumns.forEach((c) => {
      if (c.values.length > max) max = c.values.length;
    });
    return max;
  }, [matchColumns, updateColumns]);

  // Generate Query Result
  const queryResult = useMemo(() => {
    const options: UpdateQueryOptions = {
      tableName,
      matchColumns,
      updateColumns,
      strategy,
      transactionMode,
      returningClause,
      includeTypeCasts,
    };
    return generatePostgresUpdateQuery(options);
  }, [tableName, matchColumns, updateColumns, strategy, transactionMode, returningClause, includeTypeCasts]);

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
    link.download = `${tableName || 'query'}_update_${Date.now()}.sql`;
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

  // Add a composite match column
  const handleAddMatchColumn = () => {
    const newId = 'match-' + Date.now();
    const newCol: MatchColumn = {
      id: newId,
      name: `key_${matchColumns.length + 1}`,
      type: 'integer',
      values: new Array(maxRowCount).fill(''),
    };
    setMatchColumns([...matchColumns, newCol]);
  };

  // Remove a composite match column
  const handleRemoveMatchColumn = (id: string) => {
    if (matchColumns.length <= 1) {
      alert('At least one match column is required for the WHERE clause.');
      return;
    }
    setMatchColumns(matchColumns.filter((col) => col.id !== id));
  };

  // Grid editing: update a specific cell in match or update columns
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

  // Grid editing: Add a new row to all columns
  const handleAddGridRow = () => {
    setMatchColumns((prev) =>
      prev.map((c) => ({ ...c, values: [...c.values, ''] }))
    );
    setUpdateColumns((prev) =>
      prev.map((c) => ({ ...c, values: [...c.values, ''] }))
    );
  };

  // Grid editing: Delete a specific row from all columns
  const handleDeleteGridRow = (rowIndex: number) => {
    setMatchColumns((prev) =>
      prev.map((c) => ({
        ...c,
        values: c.values.filter((_, idx) => idx !== rowIndex),
      }))
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

    if (csvFirstColIsMatch) {
      // First column is match column
      const matchHeader = headers[0] || 'id';
      const matchVals = rows.map((r) => r[0] || '');
      const matchType = inferColumnType(matchVals);

      setMatchColumns([
        {
          id: 'match-' + Date.now(),
          name: matchHeader,
          type: matchType,
          values: matchVals,
        },
      ]);

      // Remaining columns are update columns
      const newUpdCols: UpdateColumn[] = [];
      for (let c = 1; c < headers.length; c++) {
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
    } else {
      // All columns are update columns, keep current match column
      const newUpdCols: UpdateColumn[] = headers.map((header, c) => {
        const vals = rows.map((r) => r[c] || '');
        return {
          id: `upd-${Date.now()}-${c}`,
          name: header || `col_${c}`,
          type: inferColumnType(vals),
          values: vals,
        };
      });
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
              Bulk update generator with match keys, multi-column value lists, batch VALUES syntax & transactions
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
              className="bg-transparent text-slate-200 text-xs font-medium focus:outline-none cursor-pointer"
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
          {/* Top Config Row: Table Name & Input Mode Switcher */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <label className="text-xs font-semibold text-slate-300 shrink-0">Target Table:</label>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="e.g. users, public.orders, inventory"
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

          {/* VIEW MODE 1: COLUMN LISTS (DEFAULT) */}
          {inputViewMode === 'lists' && (
            <div className="flex flex-col gap-3 flex-1">
              {/* SECTION A: MATCH COLUMN(S) (WHERE CLAUSE) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                      Match Column (WHERE Clause)
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Row identifier key to match the correct record
                    </span>
                  </div>
                  <button
                    onClick={handleAddMatchColumn}
                    className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                    title="Add composite match column (e.g. tenant_id + id)"
                  >
                    <Plus className="w-3 h-3" />
                    Add Composite Key
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {matchColumns.map((col, idx) => (
                    <div key={col.id} className="bg-slate-950/70 border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] text-slate-500 font-mono">Key #{idx + 1}</span>
                          <input
                            type="text"
                            value={col.name}
                            onChange={(e) => {
                              const updated = matchColumns.map((c) =>
                                c.id === col.id ? { ...c, name: e.target.value } : c
                              );
                              setMatchColumns(updated);
                            }}
                            placeholder="e.g. id, sku, uuid"
                            className="bg-slate-900 text-slate-200 font-mono text-xs border border-slate-750 rounded px-2 py-1 w-36 focus:outline-none focus:border-amber-500"
                          />
                          <select
                            value={col.type}
                            onChange={(e) => {
                              const updated = matchColumns.map((c) =>
                                c.id === col.id ? { ...c, type: e.target.value as ColumnType } : c
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
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {col.values.length} values
                          </span>
                          {matchColumns.length > 1 && (
                            <button
                              onClick={() => handleRemoveMatchColumn(col.id)}
                              className="text-slate-500 hover:text-red-400 p-1"
                              title="Remove match key"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Values textarea */}
                      <textarea
                        value={col.values.join('\n')}
                        onChange={(e) => handleMatchColRawValues(col.id, e.target.value)}
                        rows={isFullScreen ? 4 : 3}
                        placeholder="Paste list of match keys (one per line, comma-separated, or tab-separated)..."
                        className="w-full font-mono text-xs bg-slate-900 text-amber-200/90 border border-slate-800 rounded p-2 focus:outline-none focus:border-amber-500 resize-y whitespace-pre overflow-x-auto leading-relaxed"
                      />
                    </div>
                  ))}
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
                    onClick={handleAddUpdateColumn}
                    className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Column
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
                        <th key={col.id} className="px-3 py-2 border-r border-slate-800 bg-amber-950/20 text-amber-300">
                          <div className="flex items-center gap-1.5">
                            <span>🔑 {col.name}</span>
                            <span className="text-[10px] text-amber-400/70 font-sans">({col.type})</span>
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
                        {matchColumns.map((col) => (
                          <td key={col.id} className="px-2 py-1 border-r border-slate-800/80 bg-amber-950/5">
                            <input
                              type="text"
                              value={col.values[rIdx] || ''}
                              onChange={(e) => handleGridCellChange(true, col.id, rIdx, e.target.value)}
                              className="w-full bg-transparent text-amber-200 px-1 py-0.5 focus:outline-none focus:bg-slate-850 rounded"
                            />
                          </td>
                        ))}
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-200">Import CSV, TSV, or Spreadsheet Data</h3>
                  <p className="text-[11px] text-slate-400">
                    Paste raw tabular data copied directly from Google Sheets, Excel, or CSV files.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={csvFirstColIsMatch}
                      onChange={(e) => setCsvFirstColIsMatch(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800 text-indigo-600"
                    />
                    First column is Match Key (WHERE)
                  </label>
                </div>
              </div>

              <textarea
                value={csvRawInput}
                onChange={(e) => setCsvRawInput(e.target.value)}
                rows={isFullScreen ? 10 : 8}
                placeholder={`id,status,role,updated_at\n101,active,admin,2026-09-18 10:00:00\n102,inactive,editor,2026-09-18 10:00:00\n103,suspended,viewer,2026-09-18 10:00:00`}
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
            {/* Strategy selector */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400">SQL Strategy:</label>
              <select
                value={strategy}
                onChange={(e) => setStrategy(e.target.value as UpdateStrategy)}
                className="bg-slate-950 text-slate-200 font-mono text-xs border border-slate-750 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="batch_values">FROM (VALUES ...) (Fast Batch)</option>
                <option value="individual">Multiple Individual UPDATEs</option>
                <option value="case_when">Single UPDATE with CASE-WHEN</option>
                <option value="cte">CTE (WITH updates AS ...)</option>
              </select>
            </div>

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
                  {maxRowCount} rows • {updateColumns.length} cols
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
                  Match Key:{' '}
                  <strong className="text-amber-400">
                    {matchColumns.map((m) => m.name).join(', ')}
                  </strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {strategy === 'batch_values'
                    ? 'PostgreSQL VALUES Batch'
                    : strategy === 'individual'
                    ? 'Individual Statements'
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
