import React, { useState, useMemo } from 'react';
import {
  Database,
  Filter,
  ListPlus,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Settings,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  Sparkles,
  FileCode,
  Terminal,
  HelpCircle,
  Table,
  Layers,
  ArrowUpDown,
  Search,
  RefreshCw,
  FileText,
  AlertCircle,
  CheckCircle2,
  Info,
} from 'lucide-react';
import {
  QueryBuilderConfig,
  SingleCondition,
  ListCondition,
  SingleOperator,
  ListOperator,
  ColumnType,
  QueryType,
  DEFAULT_QUERY_BUILDER_CONFIG,
  generatePostgresQueries,
  parseExcelListInput,
  normalizePostgresDate,
  isLikelyDateOrTime,
} from '../../utils/dbQueryBuilder';
import { DbQueryBuilderConfigModal } from './DbQueryBuilderConfigModal';

interface DbQueryBuilderToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DbQueryBuilderTool: React.FC<DbQueryBuilderToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const [config, setConfig] = useState<QueryBuilderConfig>(DEFAULT_QUERY_BUILDER_CONFIG);
  const [activeInputTab, setActiveInputTab] = useState<'single' | 'list' | 'options'>('single');
  const [activeOutputTab, setActiveOutputTab] = useState<'sql' | 'cte' | 'python' | 'audit'>('sql');
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  // Generate queries
  const queryBundle = useMemo(() => {
    return generatePostgresQueries(config);
  }, [config]);

  // Copy helper
  const handleCopyText = (text: string, tabId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabId);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  // Download SQL
  const handleDownloadSql = () => {
    const filename = `${config.targetTable.tableName || 'query'}-${config.queryType.toLowerCase()}.sql`;
    const blob = new Blob([queryBundle.mainSql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Download Python
  const handleDownloadPython = () => {
    const filename = `query_${config.targetTable.tableName || 'runner'}.py`;
    const blob = new Blob([queryBundle.pythonScript], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Single Condition Handlers
  const handleAddSingleCondition = () => {
    const newCondition: SingleCondition = {
      id: `sc-${Date.now()}`,
      column: '',
      operator: '=',
      value: '',
      type: 'auto',
      enabled: true,
      logic: config.singleConditions.length > 0 ? 'AND' : 'AND',
    };
    setConfig((prev) => ({
      ...prev,
      singleConditions: [...prev.singleConditions, newCondition],
    }));
  };

  const handleUpdateSingleCondition = (id: string, updates: Partial<SingleCondition>) => {
    setConfig((prev) => ({
      ...prev,
      singleConditions: prev.singleConditions.map((sc) => (sc.id === id ? { ...sc, ...updates } : sc)),
    }));
  };

  const handleRemoveSingleCondition = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      singleConditions: prev.singleConditions.filter((sc) => sc.id !== id),
    }));
  };

  // List Condition Handlers
  const handleAddListCondition = () => {
    const newListCondition: ListCondition = {
      id: `lc-${Date.now()}`,
      column: '',
      operator: 'IN',
      rawInput: '',
      delimiter: 'auto',
      type: 'auto',
      deduplicate: true,
      trimQuotes: true,
      castTypeInSql: false,
      enabled: true,
      logic: 'AND',
    };
    setConfig((prev) => ({
      ...prev,
      listConditions: [...prev.listConditions, newListCondition],
    }));
  };

  const handleUpdateListCondition = (id: string, updates: Partial<ListCondition>) => {
    setConfig((prev) => ({
      ...prev,
      listConditions: prev.listConditions.map((lc) => (lc.id === id ? { ...lc, ...updates } : lc)),
    }));
  };

  const handleRemoveListCondition = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      listConditions: prev.listConditions.filter((lc) => lc.id !== id),
    }));
  };

  // Order By Handlers
  const handleAddOrderBy = () => {
    setConfig((prev) => ({
      ...prev,
      orderBy: [...prev.orderBy, { id: `ob-${Date.now()}`, column: '', direction: 'ASC' }],
    }));
  };

  const handleUpdateOrderBy = (
    id: string,
    updates: Partial<{ column: string; direction: 'ASC' | 'DESC'; nulls?: 'FIRST' | 'LAST' }>
  ) => {
    setConfig((prev) => ({
      ...prev,
      orderBy: prev.orderBy.map((ob) => (ob.id === id ? { ...ob, ...updates } : ob)),
    }));
  };

  const handleRemoveOrderBy = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      orderBy: prev.orderBy.filter((ob) => ob.id !== id),
    }));
  };

  // UPDATE Assignment Handlers
  const handleAddUpdateAssignment = () => {
    setConfig((prev) => ({
      ...prev,
      updateOptions: {
        ...prev.updateOptions,
        assignments: [
          ...prev.updateOptions.assignments,
          { id: `u-${Date.now()}`, column: '', value: '', type: 'text', mode: 'literal' },
        ],
      },
    }));
  };

  const handleUpdateAssignmentChange = (
    id: string,
    updates: Partial<{ column: string; value: string; type: ColumnType; mode: 'literal' | 'expression' }>
  ) => {
    setConfig((prev) => ({
      ...prev,
      updateOptions: {
        ...prev.updateOptions,
        assignments: prev.updateOptions.assignments.map((a) => (a.id === id ? { ...a, ...updates } : a)),
      },
    }));
  };

  const handleRemoveUpdateAssignment = (id: string) => {
    setConfig((prev) => ({
      ...prev,
      updateOptions: {
        ...prev.updateOptions,
        assignments: prev.updateOptions.assignments.filter((a) => a.id !== id),
      },
    }));
  };

  // Quick Date Preset Action
  const handleApplyDatePreset = (presetType: 'today' | 'last7days' | 'last30days' | 'thisMonth') => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const todayDmy = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;

    let newCond: SingleCondition;

    if (presetType === 'today') {
      newCond = {
        id: `sc-${Date.now()}`,
        column: 'created_at',
        operator: '>=',
        value: todayDmy,
        type: 'date',
        enabled: true,
        logic: 'AND',
      };
    } else if (presetType === 'last7days') {
      newCond = {
        id: `sc-${Date.now()}`,
        column: 'created_at',
        operator: '>=',
        value: "CURRENT_DATE - INTERVAL '7 days'",
        type: 'date',
        enabled: true,
        logic: 'AND',
      };
    } else if (presetType === 'last30days') {
      newCond = {
        id: `sc-${Date.now()}`,
        column: 'created_at',
        operator: '>=',
        value: "CURRENT_DATE - INTERVAL '30 days'",
        type: 'date',
        enabled: true,
        logic: 'AND',
      };
    } else {
      // This Month: 1st of current month
      const firstOfMonth = `01/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
      newCond = {
        id: `sc-${Date.now()}`,
        column: 'created_at',
        operator: '>=',
        value: firstOfMonth,
        type: 'date',
        enabled: true,
        logic: 'AND',
      };
    }

    setConfig((prev) => ({
      ...prev,
      singleConditions: [...prev.singleConditions, newCond],
    }));
  };

  return (
    <div
      id="db-query-builder-tool"
      className={`flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 ${
        isFullScreen ? 'h-screen w-screen fixed inset-0 z-50 overflow-hidden' : 'min-h-[700px] h-full'
      }`}
    >
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Database Query Builder
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Single & Bulk Excel List Conditions • Auto Date Normalization • CTE Bulk Joins
            </p>
          </div>
        </div>

        {/* Global Toolbar Controls */}
        <div className="flex items-center space-x-2">
          {/* Query Type Select */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
            <select
              id="query-type-selector"
              value={config.queryType}
              onChange={(e) => setConfig((prev) => ({ ...prev, queryType: e.target.value as QueryType }))}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="SELECT">SELECT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="COUNT">COUNT(*)</option>
              <option value="EXPLAIN">EXPLAIN (ANALYZE)</option>
            </select>
          </div>

          {/* Config Import/Export */}
          <button
            id="config-modal-button"
            onClick={() => setIsConfigModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 transition"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Config / Templates</span>
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullScreen && (
            <button
              id="fullscreen-toggle-button"
              onClick={onToggleFullScreen}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition"
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Target Table Header Bar */}
      <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-1.5">
            <Table className="w-4 h-4 text-indigo-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Target Table:</span>
            <input
              id="target-table-name-input"
              type="text"
              placeholder="e.g. customer_orders"
              value={config.targetTable.tableName}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  targetTable: { ...prev.targetTable, tableName: e.target.value },
                }))
              }
              className="px-2.5 py-1 font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 w-48"
            />
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-slate-500">Alias:</span>
            <input
              id="target-table-alias-input"
              type="text"
              placeholder="e.g. o"
              value={config.targetTable.tableAlias}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  targetTable: { ...prev.targetTable, tableAlias: e.target.value },
                }))
              }
              className="px-2 py-1 font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500 w-16"
            />
            <label className="flex items-center space-x-1 cursor-pointer text-slate-600 dark:text-slate-400 select-none">
              <input
                type="checkbox"
                checked={config.targetTable.useTableAlias}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    targetTable: { ...prev.targetTable, useTableAlias: e.target.checked },
                  }))
                }
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Use Alias in WHERE</span>
            </label>
          </div>
        </div>

        {/* Quick Summary Pill */}
        <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
          <span>Active Rules:</span>
          <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-mono font-medium">
            {queryBundle.activeConditionsCount}
          </span>
          {queryBundle.totalListItemsCount > 0 && (
            <>
              <span>• List Items:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono font-medium">
                {queryBundle.totalListItemsCount} items
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Content Area: Split 2 Columns on Desktop */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* LEFT COLUMN: Input Tabs & Condition Builders (Cols 7 on lg) */}
        <div className="lg:col-span-7 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full bg-white dark:bg-slate-900 overflow-hidden">
          {/* Subtabs for Conditions */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50 dark:bg-slate-900">
            <div className="flex space-x-1">
              <button
                id="tab-single-conditions"
                onClick={() => setActiveInputTab('single')}
                className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
                  activeInputTab === 'single'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Single Conditions</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {config.singleConditions.filter((s) => s.enabled).length}
                </span>
              </button>

              <button
                id="tab-list-conditions"
                onClick={() => setActiveInputTab('list')}
                className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
                  activeInputTab === 'list'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Excel & List Conditions</span>
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  {config.listConditions.filter((l) => l.enabled).length}
                </span>
              </button>

              <button
                id="tab-query-options"
                onClick={() => setActiveInputTab('options')}
                className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
                  activeInputTab === 'options'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Columns & Sorting</span>
              </button>
            </div>

            {/* Quick add actions */}
            <div className="flex items-center space-x-1.5">
              {activeInputTab === 'single' && (
                <button
                  id="add-single-condition-btn"
                  onClick={handleAddSingleCondition}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Condition</span>
                </button>
              )}
              {activeInputTab === 'list' && (
                <button
                  id="add-list-condition-btn"
                  onClick={handleAddListCondition}
                  className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Excel List</span>
                </button>
              )}
            </div>
          </div>

          {/* Condition Editor Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* TAB 1: SINGLE CONDITIONS */}
            {activeInputTab === 'single' && (
              <div className="space-y-3">
                {/* Date Quick Preset Bar */}
                <div className="p-2.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-1.5 text-indigo-700 dark:text-indigo-300 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Quick Date Filter Presets:</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleApplyDatePreset('today')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => handleApplyDatePreset('last7days')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300"
                    >
                      Past 7 Days
                    </button>
                    <button
                      onClick={() => handleApplyDatePreset('last30days')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300"
                    >
                      Past 30 Days
                    </button>
                    <button
                      onClick={() => handleApplyDatePreset('thisMonth')}
                      className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-[11px] hover:bg-indigo-50 text-indigo-700 dark:text-indigo-300"
                    >
                      This Month
                    </button>
                  </div>
                </div>

                {config.singleConditions.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <Filter className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      No single conditions added yet.
                    </p>
                    <p className="text-xs text-slate-400 mb-4">
                      Add column conditions such as status = 'ACTIVE' or date ranges.
                    </p>
                    <button
                      onClick={handleAddSingleCondition}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      + Add First Condition
                    </button>
                  </div>
                ) : (
                  config.singleConditions.map((cond, idx) => {
                    const isDateType = cond.type === 'date' || cond.type === 'timestamp' || isLikelyDateOrTime(cond.value);
                    const dateNorm = isDateType ? normalizePostgresDate(cond.value) : null;

                    return (
                      <div
                        key={cond.id}
                        className={`p-3.5 rounded-lg border transition ${
                          cond.enabled
                            ? 'bg-slate-50/70 dark:bg-slate-850 border-slate-200 dark:border-slate-750'
                            : 'bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          {/* AND / OR Logic connector */}
                          {idx > 0 && (
                            <select
                              value={cond.logic}
                              onChange={(e) =>
                                handleUpdateSingleCondition(cond.id, { logic: e.target.value as 'AND' | 'OR' })
                              }
                              className="font-bold text-[11px] px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-300 dark:border-slate-700"
                            >
                              <option value="AND">AND</option>
                              <option value="OR">OR</option>
                            </select>
                          )}

                          {/* Column Name */}
                          <div className="flex-1 min-w-[130px]">
                            <input
                              type="text"
                              placeholder="column_name"
                              value={cond.column}
                              onChange={(e) => handleUpdateSingleCondition(cond.id, { column: e.target.value })}
                              className="w-full px-2.5 py-1 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Operator */}
                          <select
                            value={cond.operator}
                            onChange={(e) =>
                              handleUpdateSingleCondition(cond.id, { operator: e.target.value as SingleOperator })
                            }
                            className="px-2 py-1 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                          >
                            <option value="=">= (equals)</option>
                            <option value="!=">&ne; (not equal)</option>
                            <option value=">">&gt; (greater than)</option>
                            <option value=">=">&ge; (greater or equal)</option>
                            <option value="<">&lt; (less than)</option>
                            <option value="<=">&le; (less or equal)</option>
                            <option value="ILIKE">ILIKE (case-insensitive)</option>
                            <option value="LIKE">LIKE (exact pattern)</option>
                            <option value="STARTS_WITH">starts with</option>
                            <option value="ENDS_WITH">ends with</option>
                            <option value="CONTAINS">contains</option>
                            <option value="BETWEEN">BETWEEN</option>
                            <option value="NOT BETWEEN">NOT BETWEEN</option>
                            <option value="IS NULL">IS NULL</option>
                            <option value="IS NOT NULL">IS NOT NULL</option>
                            <option value="IS TRUE">IS TRUE</option>
                            <option value="IS FALSE">IS FALSE</option>
                          </select>

                          {/* Data Type */}
                          <select
                            value={cond.type}
                            onChange={(e) =>
                              handleUpdateSingleCondition(cond.id, { type: e.target.value as ColumnType })
                            }
                            className="px-2 py-1 text-[11px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          >
                            <option value="auto">auto-detect</option>
                            <option value="text">text</option>
                            <option value="integer">integer</option>
                            <option value="numeric">numeric</option>
                            <option value="date">date</option>
                            <option value="timestamp">timestamp</option>
                            <option value="boolean">boolean</option>
                            <option value="uuid">uuid</option>
                          </select>

                          {/* Value Input (Hidden if NULL / TRUE check) */}
                          {!['IS NULL', 'IS NOT NULL', 'IS TRUE', 'IS FALSE'].includes(cond.operator) && (
                            <div className="flex-1 min-w-[140px] flex items-center space-x-1.5">
                              <input
                                type="text"
                                placeholder={
                                  cond.type === 'date'
                                    ? 'e.g. 24/10/2023 or YYYY-MM-DD'
                                    : cond.type === 'timestamp'
                                    ? 'e.g. 24/10/2023 15:30:00'
                                    : 'value...'
                                }
                                value={cond.value}
                                onChange={(e) => handleUpdateSingleCondition(cond.id, { value: e.target.value })}
                                className="w-full px-2.5 py-1 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                              />

                              {/* Secondary Value for BETWEEN */}
                              {(cond.operator === 'BETWEEN' || cond.operator === 'NOT BETWEEN') && (
                                <>
                                  <span className="text-slate-400 font-semibold text-[11px]">AND</span>
                                  <input
                                    type="text"
                                    placeholder="upper bound..."
                                    value={cond.secondaryValue || ''}
                                    onChange={(e) =>
                                      handleUpdateSingleCondition(cond.id, { secondaryValue: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1 font-mono rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-indigo-500"
                                  />
                                </>
                              )}
                            </div>
                          )}

                          {/* Actions: Enable Toggle & Remove */}
                          <div className="flex items-center space-x-1.5 ml-auto">
                            <label className="cursor-pointer text-[11px] text-slate-500 flex items-center space-x-1 select-none">
                              <input
                                type="checkbox"
                                checked={cond.enabled}
                                onChange={(e) => handleUpdateSingleCondition(cond.id, { enabled: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>Active</span>
                            </label>
                            <button
                              onClick={() => handleRemoveSingleCondition(cond.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                              title="Delete condition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Date Normalization Preview Helper */}
                        {isDateType && dateNorm && dateNorm.normalized && (
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3 h-3 text-indigo-500" />
                            <span>PostgreSQL Date Transform:</span>
                            <code className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-750 font-mono text-indigo-600 dark:text-indigo-400">
                              '{dateNorm.normalized}'::{dateNorm.isTimestamp ? 'timestamp' : 'date'}
                            </code>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 2: EXCEL & SPREADSHEET LIST CONDITIONS */}
            {activeInputTab === 'list' && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-800 dark:text-emerald-300 flex items-start space-x-2">
                  <Info className="w-4 h-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">Spreadsheet Copy-Paste Support:</span> You can select an entire column in Microsoft Excel or Google Sheets, copy it (`Ctrl+C`), and paste directly into the box below. Newlines, tabs, and quotes are automatically parsed, trimmed, and deduplicated.
                  </div>
                </div>

                {config.listConditions.length === 0 ? (
                  <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    <ListPlus className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      No list conditions added yet.
                    </p>
                    <p className="text-xs text-slate-400 mb-4">
                      Paste hundreds of customer IDs, transaction codes, or emails copied from your spreadsheet.
                    </p>
                    <button
                      onClick={handleAddListCondition}
                      className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      + Add Excel List Condition
                    </button>
                  </div>
                ) : (
                  config.listConditions.map((listCond, idx) => {
                    const parsedInfo = parseExcelListInput(listCond.rawInput, {
                      delimiter: listCond.delimiter,
                      deduplicate: listCond.deduplicate,
                      trimQuotes: listCond.trimQuotes,
                    });

                    return (
                      <div
                        key={listCond.id}
                        className={`p-4 rounded-xl border transition ${
                          listCond.enabled
                            ? 'bg-slate-50/80 dark:bg-slate-850 border-slate-200 dark:border-slate-750 shadow-sm'
                            : 'bg-slate-100/40 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800 opacity-60'
                        }`}
                      >
                        {/* List Header: Column & Operator Controls */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                            {idx > 0 && (
                              <select
                                value={listCond.logic}
                                onChange={(e) =>
                                  handleUpdateListCondition(listCond.id, { logic: e.target.value as 'AND' | 'OR' })
                                }
                                className="font-bold text-xs px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-slate-300 dark:border-slate-700"
                              >
                                <option value="AND">AND</option>
                                <option value="OR">OR</option>
                              </select>
                            )}

                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Column:</span>
                            <input
                              type="text"
                              placeholder="e.g. customer_id"
                              value={listCond.column}
                              onChange={(e) => handleUpdateListCondition(listCond.id, { column: e.target.value })}
                              className="px-2.5 py-1 font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-emerald-500 w-44"
                            />

                            <select
                              value={listCond.operator}
                              onChange={(e) =>
                                handleUpdateListCondition(listCond.id, { operator: e.target.value as ListOperator })
                              }
                              className="px-2.5 py-1 text-xs font-semibold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400"
                            >
                              <option value="IN">IN (...)</option>
                              <option value="NOT IN">NOT IN (...)</option>
                              <option value="= ANY">= ANY(ARRAY[...])</option>
                              <option value="!= ALL">!= ALL(ARRAY[...])</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <label className="cursor-pointer text-xs text-slate-500 flex items-center space-x-1 select-none">
                              <input
                                type="checkbox"
                                checked={listCond.enabled}
                                onChange={(e) =>
                                  handleUpdateListCondition(listCond.id, { enabled: e.target.checked })
                                }
                                className="rounded text-emerald-600 focus:ring-emerald-500"
                              />
                              <span>Active</span>
                            </label>
                            <button
                              onClick={() => handleRemoveListCondition(listCond.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-200 dark:hover:bg-slate-800 transition"
                              title="Delete list condition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* List Settings Bar: Delimiter, Deduplicate, Type */}
                        <div className="flex flex-wrap items-center gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs mb-2.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-500">Format:</span>
                            <select
                              value={listCond.delimiter}
                              onChange={(e) =>
                                handleUpdateListCondition(listCond.id, {
                                  delimiter: e.target.value as any,
                                })
                              }
                              className="text-xs p-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200"
                            >
                              <option value="auto">Auto Detect</option>
                              <option value="newline">Newline (Excel column)</option>
                              <option value="tab">Tab (Excel row)</option>
                              <option value="comma">Comma Separated</option>
                              <option value="whitespace">Whitespace</option>
                            </select>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <span className="text-slate-500">Data Type:</span>
                            <select
                              value={listCond.type}
                              onChange={(e) =>
                                handleUpdateListCondition(listCond.id, {
                                  type: e.target.value as ColumnType,
                                })
                              }
                              className="text-xs p-1 rounded border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-slate-200"
                            >
                              <option value="auto">Auto (Inferred: {parsedInfo.detectedType})</option>
                              <option value="integer">Integer</option>
                              <option value="numeric">Numeric / Decimal</option>
                              <option value="text">Text (Quoted '...')</option>
                              <option value="uuid">UUID</option>
                              <option value="date">Date</option>
                            </select>
                          </div>

                          <label className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={listCond.deduplicate}
                              onChange={(e) =>
                                handleUpdateListCondition(listCond.id, { deduplicate: e.target.checked })
                              }
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Deduplicate</span>
                          </label>

                          <label className="flex items-center space-x-1 text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={listCond.trimQuotes}
                              onChange={(e) =>
                                handleUpdateListCondition(listCond.id, { trimQuotes: e.target.checked })
                              }
                              className="rounded text-emerald-600 focus:ring-emerald-500"
                            />
                            <span>Strip "Quotes"</span>
                          </label>
                        </div>

                        {/* Paste Area */}
                        <div className="relative">
                          <textarea
                            value={listCond.rawInput}
                            onChange={(e) => handleUpdateListCondition(listCond.id, { rawInput: e.target.value })}
                            placeholder="Paste spreadsheet cells or comma/newline separated items here (e.g. 1001&#10;1002&#10;1003)..."
                            rows={5}
                            className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          />
                        </div>

                        {/* Live Parser Statistics Bar */}
                        <div className="flex flex-wrap items-center justify-between mt-2 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center space-x-3">
                            <span>
                              Items Parsed:{' '}
                              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                                {parsedInfo.count}
                              </strong>
                            </span>
                            {parsedInfo.duplicatesRemoved > 0 && (
                              <span>
                                Duplicates Filtered:{' '}
                                <strong className="text-amber-600 font-mono">
                                  {parsedInfo.duplicatesRemoved}
                                </strong>
                              </span>
                            )}
                            <span>
                              Detected Type:{' '}
                              <strong className="text-indigo-600 dark:text-indigo-400 font-mono">
                                {parsedInfo.detectedType}
                              </strong>
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() =>
                                handleUpdateListCondition(listCond.id, {
                                  rawInput: `1001\n1005\n1020\n1045\n1089\n1112\n1150\n1200`,
                                })
                              }
                              className="text-[11px] text-slate-500 hover:text-indigo-600 underline"
                            >
                              Sample IDs
                            </button>
                            <span>•</span>
                            <button
                              onClick={() => handleUpdateListCondition(listCond.id, { rawInput: '' })}
                              className="text-[11px] text-slate-500 hover:text-rose-600 underline"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* TAB 3: PROJECTION, UPDATE & SORT OPTIONS */}
            {activeInputTab === 'options' && (
              <div className="space-y-4">
                {/* SELECT Projection Options */}
                {config.queryType === 'SELECT' && (
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/70 dark:bg-slate-850 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      SELECT Columns Projection
                    </h4>
                    <div>
                      <label className="text-xs text-slate-500 block mb-1">
                        Columns (comma separated, e.g. <code className="text-indigo-500">id, name, created_at</code> or <code className="text-indigo-500">*</code>):
                      </label>
                      <input
                        type="text"
                        value={config.selectOptions.columns.join(', ')}
                        onChange={(e) => {
                          const cols = e.target.value
                            .split(',')
                            .map((c) => c.trim())
                            .filter((c) => c.length > 0);
                          setConfig((prev) => ({
                            ...prev,
                            selectOptions: { ...prev.selectOptions, columns: cols.length > 0 ? cols : ['*'] },
                          }));
                        }}
                        className="w-full font-mono text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <label className="flex items-center space-x-2 text-xs cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.selectOptions.distinct}
                        onChange={(e) =>
                          setConfig((prev) => ({
                            ...prev,
                            selectOptions: { ...prev.selectOptions, distinct: e.target.checked },
                          }))
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Include DISTINCT keyword (SELECT DISTINCT ...)
                      </span>
                    </label>
                  </div>
                )}

                {/* UPDATE SET Assignments */}
                {config.queryType === 'UPDATE' && (
                  <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                        UPDATE Column Assignments (SET clauses)
                      </h4>
                      <button
                        onClick={handleAddUpdateAssignment}
                        className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-amber-600 text-white hover:bg-amber-700 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Assignment</span>
                      </button>
                    </div>

                    {config.updateOptions.assignments.length === 0 ? (
                      <p className="text-xs text-amber-700/80 dark:text-amber-400">
                        No SET assignments configured. Defaulting to: <code className="font-mono">updated_at = CURRENT_TIMESTAMP</code>
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {config.updateOptions.assignments.map((assign) => (
                          <div key={assign.id} className="flex items-center space-x-2 text-xs">
                            <input
                              type="text"
                              placeholder="column_name"
                              value={assign.column}
                              onChange={(e) => handleUpdateAssignmentChange(assign.id, { column: e.target.value })}
                              className="font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 w-36"
                            />
                            <span className="font-bold text-slate-400">=</span>
                            <input
                              type="text"
                              placeholder="new_value"
                              value={assign.value}
                              onChange={(e) => handleUpdateAssignmentChange(assign.id, { value: e.target.value })}
                              className="font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex-1"
                            />
                            <select
                              value={assign.type}
                              onChange={(e) =>
                                handleUpdateAssignmentChange(assign.id, { type: e.target.value as ColumnType })
                              }
                              className="text-[11px] p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300"
                            >
                              <option value="text">text</option>
                              <option value="integer">integer</option>
                              <option value="numeric">numeric</option>
                              <option value="boolean">boolean</option>
                              <option value="date">date</option>
                              <option value="timestamp">timestamp</option>
                            </select>
                            <button
                              onClick={() => handleRemoveUpdateAssignment(assign.id)}
                              className="p-1 text-slate-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ORDER BY Clauses */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/70 dark:bg-slate-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                      <span>ORDER BY Clauses</span>
                    </h4>
                    <button
                      onClick={handleAddOrderBy}
                      className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Sort Column</span>
                    </button>
                  </div>

                  {config.orderBy.length === 0 ? (
                    <p className="text-xs text-slate-400">No ORDER BY specified.</p>
                  ) : (
                    <div className="space-y-2">
                      {config.orderBy.map((ob) => (
                        <div key={ob.id} className="flex items-center space-x-2 text-xs">
                          <input
                            type="text"
                            placeholder="column_name"
                            value={ob.column}
                            onChange={(e) => handleUpdateOrderBy(ob.id, { column: e.target.value })}
                            className="font-mono px-2 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex-1"
                          />
                          <select
                            value={ob.direction}
                            onChange={(e) =>
                              handleUpdateOrderBy(ob.id, { direction: e.target.value as 'ASC' | 'DESC' })
                            }
                            className="font-semibold text-xs p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400"
                          >
                            <option value="ASC">ASC</option>
                            <option value="DESC">DESC</option>
                          </select>
                          <select
                            value={ob.nulls || ''}
                            onChange={(e) =>
                              handleUpdateOrderBy(ob.id, { nulls: (e.target.value || undefined) as any })
                            }
                            className="text-xs p-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300"
                          >
                            <option value="">Default Nulls</option>
                            <option value="FIRST">NULLS FIRST</option>
                            <option value="LAST">NULLS LAST</option>
                          </select>
                          <button
                            onClick={() => handleRemoveOrderBy(ob.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* LIMIT & OFFSET */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/70 dark:bg-slate-850 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                      LIMIT (rows):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 100"
                      value={config.limit}
                      onChange={(e) => setConfig((prev) => ({ ...prev, limit: e.target.value }))}
                      className="w-full font-mono px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 font-semibold block mb-1">
                      OFFSET (skip rows):
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 0"
                      value={config.offset}
                      onChange={(e) => setConfig((prev) => ({ ...prev, offset: e.target.value }))}
                      className="w-full font-mono px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                </div>

                {/* Extra Options */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-850 bg-slate-50/70 dark:bg-slate-850 text-xs space-y-2">
                  <h4 className="font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Execution Wrapping Options
                  </h4>
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.formatOptions.wrapInTransaction}
                      onChange={(e) =>
                        setConfig((prev) => ({
                          ...prev,
                          formatOptions: { ...prev.formatOptions, wrapInTransaction: e.target.checked },
                        }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Wrap in Transaction block (BEGIN; ... COMMIT;)</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Generated Output & Query Viewer (Cols 5 on lg) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {/* Output Tab Switcher */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-4 bg-white dark:bg-slate-900">
            <div className="flex space-x-1">
              <button
                id="out-tab-sql"
                onClick={() => setActiveOutputTab('sql')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  activeOutputTab === 'sql'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-950'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>PostgreSQL SQL</span>
              </button>

              <button
                id="out-tab-cte"
                onClick={() => setActiveOutputTab('cte')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  activeOutputTab === 'cte'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-950'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Optimized for thousands of pasted rows"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>CTE Join Query</span>
              </button>

              <button
                id="out-tab-python"
                onClick={() => setActiveOutputTab('python')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  activeOutputTab === 'python'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-950'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>pg8000 Script</span>
              </button>

              <button
                id="out-tab-audit"
                onClick={() => setActiveOutputTab('audit')}
                className={`flex items-center space-x-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition ${
                  activeOutputTab === 'audit'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-slate-50 dark:bg-slate-950'
                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Audit & Dates</span>
              </button>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center space-x-1">
              {activeOutputTab === 'sql' && (
                <>
                  <button
                    onClick={() => handleCopyText(queryBundle.mainSql, 'sql')}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs flex items-center space-x-1"
                    title="Copy SQL"
                  >
                    {copiedTab === 'sql' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleDownloadSql}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs flex items-center space-x-1"
                    title="Download .sql file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {activeOutputTab === 'cte' && (
                <button
                  onClick={() => handleCopyText(queryBundle.cteJoinSql, 'cte')}
                  className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs flex items-center space-x-1"
                  title="Copy CTE Join Query"
                >
                  {copiedTab === 'cte' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              )}

              {activeOutputTab === 'python' && (
                <>
                  <button
                    onClick={() => handleCopyText(queryBundle.pythonScript, 'python')}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs flex items-center space-x-1"
                    title="Copy Python Script"
                  >
                    {copiedTab === 'python' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={handleDownloadPython}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 text-xs flex items-center space-x-1"
                    title="Download .py file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Code Viewer Body */}
          <div className="flex-1 p-4 overflow-y-auto font-mono text-xs">
            {activeOutputTab === 'sql' && (
              <div className="relative h-full flex flex-col">
                <div className="text-[11px] font-sans font-medium text-slate-500 mb-1 flex items-center justify-between">
                  <span>Target: {config.targetTable.tableName} ({config.queryType})</span>
                  <span>{queryBundle.mainSql.split('\n').length} lines</span>
                </div>
                <textarea
                  readOnly
                  value={queryBundle.mainSql}
                  className="w-full flex-1 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 select-all focus:outline-none resize-none leading-relaxed"
                />
              </div>
            )}

            {activeOutputTab === 'cte' && (
              <div className="relative h-full flex flex-col">
                <div className="p-2.5 mb-2 rounded bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-[11px] font-sans text-indigo-700 dark:text-indigo-300">
                  <span className="font-semibold">Performance Advantage:</span> When filtering on hundreds or thousands of spreadsheet rows, PostgreSQL parses a <code className="font-mono">WITH filter_values(filter_key) AS (VALUES ...) JOIN</code> significantly faster than a huge <code className="font-mono">IN (...)</code> list.
                </div>
                <textarea
                  readOnly
                  value={queryBundle.cteJoinSql}
                  className="w-full flex-1 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 select-all focus:outline-none resize-none leading-relaxed"
                />
              </div>
            )}

            {activeOutputTab === 'python' && (
              <div className="relative h-full flex flex-col">
                <div className="text-[11px] font-sans text-slate-500 mb-1 flex items-center justify-between">
                  <span>Driver: <code className="text-indigo-500">pg8000.native</code></span>
                  <span>CLI flags: --dry-run, --json</span>
                </div>
                <textarea
                  readOnly
                  value={queryBundle.pythonScript}
                  className="w-full flex-1 p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 select-all focus:outline-none resize-none leading-relaxed"
                />
              </div>
            )}

            {activeOutputTab === 'audit' && (
              <div className="space-y-4 font-sans text-xs">
                {/* Date Audit Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Date & Timestamp Support Audit</span>
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    Non-ISO European/Standard dates (e.g. <code className="text-indigo-500">24/10/2023</code>) are automatically parsed and translated to standard ISO PostgreSQL expressions (<code className="text-indigo-500">'2023-10-24'::date</code>) to prevent <code className="text-rose-500">ERROR: date/time field value out of range</code>.
                  </p>

                  <div className="border border-slate-200 dark:border-slate-800 rounded divide-y divide-slate-200 dark:divide-slate-800 text-[11px] font-mono">
                    <div className="p-2 flex justify-between bg-slate-50 dark:bg-slate-850 font-sans font-semibold text-slate-600 dark:text-slate-300">
                      <span>Condition Column</span>
                      <span>Input Format</span>
                      <span>PostgreSQL Literal Generated</span>
                    </div>
                    {config.singleConditions
                      .filter((c) => isLikelyDateOrTime(c.value))
                      .map((c) => {
                        const norm = normalizePostgresDate(c.value);
                        return (
                          <div key={c.id} className="p-2 flex justify-between items-center text-slate-700 dark:text-slate-300">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{c.column}</span>
                            <span className="text-slate-500">{c.value}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              '{norm.normalized}'::{norm.isTimestamp ? 'timestamp' : 'date'}
                            </span>
                          </div>
                        );
                      })}
                    {config.singleConditions.filter((c) => isLikelyDateOrTime(c.value)).length === 0 && (
                      <div className="p-2.5 text-center text-slate-400 font-sans">
                        No active date or time conditions detected. Add one under "Single Conditions".
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance & Indexing Card */}
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Recommended PostgreSQL Indexes</span>
                  </h4>
                  <p className="text-slate-500 text-[11px]">
                    To optimize execution speed for the generated conditions, consider creating these indexes:
                  </p>
                  <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300 space-y-1">
                    {config.singleConditions
                      .filter((c) => c.enabled && c.column.trim())
                      .map((c) => (
                        <div key={c.id}>
                          CREATE INDEX IF NOT EXISTS idx_{config.targetTable.tableName}_{c.column.trim()} ON {config.targetTable.tableName} ({c.column.trim()});
                        </div>
                      ))}
                    {config.listConditions
                      .filter((l) => l.enabled && l.column.trim())
                      .map((l) => (
                        <div key={l.id}>
                          CREATE INDEX IF NOT EXISTS idx_{config.targetTable.tableName}_{l.column.trim()} ON {config.targetTable.tableName} ({l.column.trim()});
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Configuration Import / Export Modal */}
      <DbQueryBuilderConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentConfig={config}
        onApplyConfig={(newConfig) => setConfig(newConfig)}
      />
    </div>
  );
};
