import React, { useState, useMemo } from 'react';
import {
  Columns2,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  PlusCircle,
  Search,
  Filter,
  Copy,
  Check,
  Download,
  Maximize2,
  Minimize2,
  Sparkles,
  Database,
  FileSpreadsheet,
  Settings,
  RefreshCw,
  Code2,
  FileText,
  Info,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Table,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import {
  DataSetMatcherConfig,
  DEFAULT_MATCHER_CONFIG,
  matchDataSets,
  generateReconciliationSql,
  exportDiffToCsv,
  exportDiffToMarkdown,
  SAMPLE_DATASETS,
  RowMatchStatus,
  MatchedRow,
  DelimiterChoice,
  CellDiff,
  sortMatchedRows,
  MatchedRowSortField,
  SortDirection,
} from '../../utils/dataSetMatcher';

interface DataSetMatcherToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DataSetMatcherTool: React.FC<DataSetMatcherToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  // Input Data States
  const [dataA, setDataA] = useState<string>(SAMPLE_DATASETS.ecommerce.dataA);
  const [dataB, setDataB] = useState<string>(SAMPLE_DATASETS.ecommerce.dataB);
  const [labelA, setLabelA] = useState<string>('Dataset A (Base / Expected)');
  const [labelB, setLabelB] = useState<string>('Dataset B (Compared / Actual)');

  // Config State
  const [config, setConfig] = useState<DataSetMatcherConfig>(DEFAULT_MATCHER_CONFIG);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<'comparison' | 'inputs' | 'columns' | 'sql' | 'export'>('comparison');

  // Table Filters & Search
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'MISMATCH' | 'ONLY_A' | 'ONLY_B' | 'EXACT'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

  // SQL options
  const [sqlSyncDirection, setSqlSyncDirection] = useState<'update_b_to_match_a' | 'update_a_to_match_b'>('update_b_to_match_a');

  // Copy Feedback State
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Run matching engine
  const matchResult = useMemo(() => {
    return matchDataSets(dataA, dataB, config);
  }, [dataA, dataB, config]);

  // Active primary key columns
  const effectiveKeyColumns = useMemo(() => {
    const fromConfig = config.keyColumns;
    if (fromConfig.length > 0) return fromConfig;
    return matchResult.columnMappings.filter((m) => m.isKey).map((m) => m.key);
  }, [config.keyColumns, matchResult.columnMappings]);

  // Filtered rows for the comparison table
  const filteredRows = useMemo(() => {
    return matchResult.rows.filter((row) => {
      // Status filter
      if (statusFilter === 'MISMATCH' && row.status !== 'VALUE_MISMATCH') return false;
      if (statusFilter === 'ONLY_A' && row.status !== 'ONLY_IN_A') return false;
      if (statusFilter === 'ONLY_B' && row.status !== 'ONLY_IN_B') return false;
      if (statusFilter === 'EXACT' && row.status !== 'EXACT_MATCH') return false;

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (row.keyValue.toLowerCase().includes(q)) return true;
        // Search in cell diffs
        for (const diff of Object.values(row.cellDiffs) as CellDiff[]) {
          if (
            (diff.valueA && diff.valueA.toLowerCase().includes(q)) ||
            (diff.valueB && diff.valueB.toLowerCase().includes(q)) ||
            diff.headerName.toLowerCase().includes(q)
          ) {
            return true;
          }
        }
        return false;
      }
      return true;
    });
  }, [matchResult.rows, statusFilter, searchQuery]);

  // Column Sorting State (Comparison Grid)
  const [sortColumn, setSortColumn] = useState<MatchedRowSortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (columnKey: MatchedRowSortField) => {
    if (sortColumn === columnKey) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        // Third click clears sort back to default
        setSortColumn(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Sorted rows for the comparison grid
  const sortedRows = useMemo(() => {
    return sortMatchedRows(filteredRows, sortColumn, sortDirection, matchResult.rows);
  }, [filteredRows, sortColumn, sortDirection, matchResult.rows]);

  // Friendly name for active sort column
  const activeSortLabel = useMemo(() => {
    if (!sortColumn) return null;
    if (sortColumn === 'index') return 'Row Position (#)';
    if (sortColumn === 'status') return 'Match Status';
    if (sortColumn === 'key') return `Key (${effectiveKeyColumns.join(' + ') || 'PK'})`;
    if (sortColumn === 'rowA') return 'Row # in Dataset A';
    if (sortColumn === 'rowB') return 'Row # in Dataset B';
    const col = matchResult.columnMappings.find((m) => m.key === sortColumn);
    return col ? (col.headerA || col.headerB || col.key) : sortColumn;
  }, [sortColumn, effectiveKeyColumns, matchResult.columnMappings]);

  // Reconciliation SQL
  const reconciliationSql = useMemo(() => {
    return generateReconciliationSql(matchResult, config.tableNameForSql, sqlSyncDirection);
  }, [matchResult, config.tableNameForSql, sqlSyncDirection]);

  // Swap datasets A and B
  const handleSwapDatasets = () => {
    const tempA = dataA;
    const tempB = dataB;
    const tempDelimA = config.delimiterA;
    const tempDelimB = config.delimiterB;

    setDataA(tempB);
    setDataB(tempA);
    setConfig((prev) => ({
      ...prev,
      delimiterA: tempDelimB,
      delimiterB: tempDelimA,
    }));
  };

  // Toggle Key Column
  const handleToggleKeyColumn = (colKey: string) => {
    setConfig((prev) => {
      const currentKeys = prev.keyColumns.length > 0 ? prev.keyColumns : effectiveKeyColumns;
      const isAlreadyKey = currentKeys.includes(colKey);
      let newKeys: string[];
      if (isAlreadyKey) {
        newKeys = currentKeys.filter((k) => k !== colKey);
      } else {
        newKeys = [...currentKeys, colKey];
      }
      return { ...prev, keyColumns: newKeys };
    });
  };

  // Toggle Ignored Column
  const handleToggleIgnoredColumn = (colKey: string) => {
    setConfig((prev) => {
      const isIgnored = prev.ignoredColumns.includes(colKey);
      return {
        ...prev,
        ignoredColumns: isIgnored
          ? prev.ignoredColumns.filter((c) => c !== colKey)
          : [...prev.ignoredColumns, colKey],
      };
    });
  };

  // Load Preset
  const handleLoadPreset = (presetKey: keyof typeof SAMPLE_DATASETS) => {
    const preset = SAMPLE_DATASETS[presetKey];
    setDataA(preset.dataA);
    setDataB(preset.dataB);
    setConfig((prev) => ({
      ...prev,
      keyColumns: [],
      ignoredColumns: [],
    }));
  };

  // Downloads
  const handleDownloadCsvDiff = () => {
    const csvContent = exportDiffToCsv(matchResult);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-comparison-diff-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadMarkdown = () => {
    const mdContent = exportDiffToMarkdown(matchResult);
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dataset-comparison-report-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadSql = () => {
    const blob = new Blob([reconciliationSql], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reconciliation-${config.tableNameForSql}.sql`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="dataset-matcher-tool"
      className={`flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 ${
        isFullScreen ? 'h-screen w-screen fixed inset-0 z-50 overflow-hidden' : 'min-h-[720px] h-full'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-5 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-900 text-teal-600 dark:text-teal-400">
            <Columns2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Data Set Matcher & Comparator
              </h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                Tabular Diff Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compare CSV, TSV & space-separated sets with scrambled headers, missing columns & cell-level discrepancy detection
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {/* Quick Preset Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-600 dark:text-slate-400">Demo:</span>
            <select
              onChange={(e) => handleLoadPreset(e.target.value as any)}
              className="text-xs font-medium text-teal-700 dark:text-teal-400 bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="ecommerce">E-Commerce Orders (Diff)</option>
              <option value="userAccounts">User DB vs Auth Extract</option>
            </select>
          </div>

          {/* Fullscreen Button */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-300 transition"
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats & Summary Bar */}
      <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Verdict Badge */}
          <div
            className={`px-3 py-1 rounded-lg font-bold flex items-center space-x-1.5 border ${
              matchResult.summary.exactMatches === matchResult.summary.totalRecordsEvaluated &&
              matchResult.summary.totalRecordsEvaluated > 0
                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
          >
            {matchResult.summary.exactMatches === matchResult.summary.totalRecordsEvaluated &&
            matchResult.summary.totalRecordsEvaluated > 0 ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>100% IDENTICAL MATCH</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  {matchResult.summary.matchPercentage}% MATCH ({matchResult.summary.valueMismatches} Discrepancies)
                </span>
              </>
            )}
          </div>

          {/* Quick Metrics */}
          <span className="text-slate-400">|</span>
          <span className="text-slate-600 dark:text-slate-400">
            Total Unique Keys:{' '}
            <strong className="text-slate-900 dark:text-slate-100">{matchResult.summary.totalRecordsEvaluated}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-emerald-700 dark:text-emerald-400">
            Exact Matches: <strong>{matchResult.summary.exactMatches}</strong>
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-amber-600 dark:text-amber-400">
            Value Mismatches: <strong>{matchResult.summary.valueMismatches}</strong>
          </span>
          {matchResult.summary.onlyInA > 0 && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-rose-600 dark:text-rose-400">
                Only in A: <strong>{matchResult.summary.onlyInA}</strong>
              </span>
            </>
          )}
          {matchResult.summary.onlyInB > 0 && (
            <>
              <span className="text-slate-400">•</span>
              <span className="text-indigo-600 dark:text-indigo-400">
                Only in B: <strong>{matchResult.summary.onlyInB}</strong>
              </span>
            </>
          )}
        </div>

        {/* Key indicator */}
        <div className="flex items-center space-x-1 text-slate-500">
          <span>Matching Key:</span>
          <span className="px-2 py-0.5 rounded font-mono font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-teal-700 dark:text-teal-400">
            {effectiveKeyColumns.join(' + ') || 'None Selected'}
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-5 bg-white dark:bg-slate-900">
        <div className="flex space-x-2">
          <button
            id="tab-btn-comparison"
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'comparison'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>Comparison Grid</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
              {matchResult.rows.length}
            </span>
          </button>

          <button
            id="tab-btn-inputs"
            onClick={() => setActiveTab('inputs')}
            className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'inputs'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Input Datasets</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              A & B
            </span>
          </button>

          <button
            id="tab-btn-columns"
            onClick={() => setActiveTab('columns')}
            className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'columns'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Headers & Rules</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {matchResult.columnMappings.length} cols
            </span>
          </button>

          <button
            id="tab-btn-sql"
            onClick={() => setActiveTab('sql')}
            className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'sql'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Reconciliation SQL</span>
          </button>

          <button
            id="tab-btn-export"
            onClick={() => setActiveTab('export')}
            className={`flex items-center space-x-1.5 py-3 px-3.5 text-xs font-semibold border-b-2 transition ${
              activeTab === 'export'
                ? 'border-teal-600 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export & Diff Reports</span>
          </button>
        </div>

        {/* Swap button */}
        <button
          onClick={handleSwapDatasets}
          className="flex items-center space-x-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition"
          title="Swap Dataset A and Dataset B"
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-teal-600" />
          <span>Swap A & B</span>
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Warnings Banner */}
        {matchResult.warnings.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-300 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-600 flex-shrink-0" />
            <div className="space-y-1">
              {matchResult.warnings.map((w, idx) => (
                <div key={idx}>{w}</div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: COMPARISON GRID & CELL-LEVEL DIFF TABLE */}
        {/* ========================================================================= */}
        {activeTab === 'comparison' && (
          <div className="space-y-3">
            {/* Filter, Search & Sort Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
              {/* Status Filter Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setStatusFilter('ALL')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                    statusFilter === 'ALL'
                      ? 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  All Records ({matchResult.rows.length})
                </button>

                <button
                  onClick={() => setStatusFilter('MISMATCH')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    statusFilter === 'MISMATCH'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60 hover:bg-amber-100'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mismatches ({matchResult.summary.valueMismatches})</span>
                </button>

                <button
                  onClick={() => setStatusFilter('ONLY_A')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    statusFilter === 'ONLY_A'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-100'
                  }`}
                >
                  <MinusCircle className="w-3.5 h-3.5" />
                  <span>Only in A ({matchResult.summary.onlyInA})</span>
                </button>

                <button
                  onClick={() => setStatusFilter('ONLY_B')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    statusFilter === 'ONLY_B'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-100'
                  }`}
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Only in B ({matchResult.summary.onlyInB})</span>
                </button>

                <button
                  onClick={() => setStatusFilter('EXACT')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center space-x-1.5 transition ${
                    statusFilter === 'EXACT'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60 hover:bg-emerald-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Identical ({matchResult.summary.exactMatches})</span>
                </button>
              </div>

              {/* Search & Sort Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search Box */}
                <div className="relative min-w-[200px]">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search key or cell value..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Sort Selector Dropdown */}
                <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                  <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">Sort:</span>
                  <select
                    id="dataset-matcher-sort-select"
                    value={sortColumn || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setSortColumn(val as MatchedRowSortField);
                      } else {
                        setSortColumn(null);
                        setSortDirection('asc');
                      }
                    }}
                    className="text-xs py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                  >
                    <option value="">Default (Order in Dataset)</option>
                    <option value="status">Status (Discrepancies First)</option>
                    <option value="key">Key ({effectiveKeyColumns.join(' + ')})</option>
                    <option value="rowA">Row # in Dataset A</option>
                    <option value="rowB">Row # in Dataset B</option>
                    <optgroup label="Compared Columns">
                      {matchResult.columnMappings
                        .filter((m) => !m.isKey)
                        .map((col) => (
                          <option key={col.key} value={col.key}>
                            {col.headerA || col.headerB}
                          </option>
                        ))}
                    </optgroup>
                  </select>

                  {sortColumn && (
                    <>
                      <button
                        id="dataset-matcher-sort-dir-btn"
                        onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                        className="px-2 py-1 rounded bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900 text-[11px] font-mono font-bold flex items-center space-x-1 border border-teal-200 dark:border-teal-800 transition"
                        title={`Current sort direction: ${sortDirection.toUpperCase()} (Click to toggle)`}
                      >
                        {sortDirection === 'asc' ? (
                          <>
                            <ArrowUp className="w-3 h-3" />
                            <span>ASC</span>
                          </>
                        ) : (
                          <>
                            <ArrowDown className="w-3 h-3" />
                            <span>DESC</span>
                          </>
                        )}
                      </button>

                      <button
                        id="dataset-matcher-reset-sort-btn"
                        onClick={() => {
                          setSortColumn(null);
                          setSortDirection('asc');
                        }}
                        className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                        title="Reset to default order"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Column Discrepancy Breakdown Pill Strip with Quick Sort on Click */}
            <div className="flex flex-wrap items-center gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              <span className="font-semibold text-slate-500 mr-1">Column Breakdown (Click to sort):</span>
              {matchResult.columnStats.map((col) => {
                const isKey = effectiveKeyColumns.includes(col.columnKey);
                const hasMismatch = col.mismatchCount > 0;
                const isCurrentSort = sortColumn === col.columnKey;

                return (
                  <button
                    type="button"
                    key={col.columnKey}
                    onClick={() => handleSort(col.columnKey)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono flex items-center space-x-1 border transition cursor-pointer hover:opacity-85 ${
                      isCurrentSort
                        ? 'ring-2 ring-teal-500 shadow-xs'
                        : ''
                    } ${
                      isKey
                        ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-bold'
                        : hasMismatch
                        ? 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                    title={`Click to sort comparison table by ${col.headerName}`}
                  >
                    <span>{col.headerName}</span>
                    {isKey ? (
                      <span className="text-[10px] px-1 rounded bg-teal-200 dark:bg-teal-800 text-teal-900 dark:text-teal-100">
                        KEY
                      </span>
                    ) : (
                      <span className={hasMismatch ? 'font-bold text-amber-600' : 'text-slate-400'}>
                        ({col.mismatchCount} diffs)
                      </span>
                    )}
                    {isCurrentSort && (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                      ) : (
                        <ArrowDown className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Sort & Record Count Bar */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-500 dark:text-slate-400">
              <div className="flex items-center space-x-2">
                <span>
                  Showing <strong>{sortedRows.length}</strong> of <strong>{matchResult.rows.length}</strong> records
                </span>
                {sortColumn && (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 font-medium text-[11px]">
                    <span>Sorted by: <strong>{activeSortLabel}</strong> ({sortDirection.toUpperCase()})</span>
                    <button
                      onClick={() => {
                        setSortColumn(null);
                        setSortDirection('asc');
                      }}
                      className="hover:text-teal-900 dark:hover:text-white ml-0.5 transition"
                      title="Clear sort and restore default order"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
              {sortColumn && (
                <button
                  onClick={() => {
                    setSortColumn(null);
                    setSortDirection('asc');
                  }}
                  className="text-teal-600 hover:text-teal-700 dark:text-teal-400 text-[11px] underline cursor-pointer"
                >
                  Reset sort
                </button>
              )}
            </div>

            {/* Main Interactive Table */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 font-semibold sticky top-0 z-10">
                    <tr>
                      {/* # Index Column Header */}
                      <th
                        onClick={() => handleSort('index')}
                        className={`py-2.5 px-3 w-12 text-center cursor-pointer select-none transition group ${
                          sortColumn === 'index'
                            ? 'bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-b-2 border-teal-500'
                            : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                        }`}
                        title="Click to sort by original row position"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>#</span>
                          {sortColumn === 'index' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Status Column Header */}
                      <th
                        onClick={() => handleSort('status')}
                        className={`py-2.5 px-3 w-36 cursor-pointer select-none transition group ${
                          sortColumn === 'status'
                            ? 'bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-b-2 border-teal-500'
                            : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                        }`}
                        title="Click to sort by match status (mismatches first)"
                      >
                        <div className="flex items-center justify-between space-x-1">
                          <span>Status</span>
                          {sortColumn === 'status' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Primary Key Column Header */}
                      <th
                        onClick={() => handleSort('key')}
                        className={`py-2.5 px-3 font-mono cursor-pointer select-none transition group ${
                          sortColumn === 'key'
                            ? 'bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-b-2 border-teal-500'
                            : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                        }`}
                        title="Click to sort by Primary Key value"
                      >
                        <div className="flex items-center justify-between space-x-1">
                          <span>Key ({effectiveKeyColumns.join(' + ')})</span>
                          {sortColumn === 'key' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Row A Column Header */}
                      <th
                        onClick={() => handleSort('rowA')}
                        className={`py-2.5 px-2 text-center w-20 cursor-pointer select-none transition group ${
                          sortColumn === 'rowA'
                            ? 'bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-b-2 border-teal-500'
                            : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400'
                        }`}
                        title="Click to sort by Row Number in Dataset A"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Row A</span>
                          {sortColumn === 'rowA' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Row B Column Header */}
                      <th
                        onClick={() => handleSort('rowB')}
                        className={`py-2.5 px-2 text-center w-20 cursor-pointer select-none transition group ${
                          sortColumn === 'rowB'
                            ? 'bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-b-2 border-teal-500'
                            : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-500 dark:text-slate-400'
                        }`}
                        title="Click to sort by Row Number in Dataset B"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>Row B</span>
                          {sortColumn === 'rowB' ? (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            ) : (
                              <ArrowDown className="w-3 h-3 text-teal-600 dark:text-teal-400 shrink-0" />
                            )
                          ) : (
                            <ArrowUpDown className="w-2.5 h-2.5 text-slate-400 opacity-20 group-hover:opacity-100 transition-opacity shrink-0" />
                          )}
                        </div>
                      </th>

                      {/* Common & Compared Columns Headers */}
                      {matchResult.columnMappings
                        .filter((m) => !m.isKey)
                        .map((col) => {
                          const isOnlyA = !col.headerB;
                          const isOnlyB = !col.headerA;
                          const isSorted = sortColumn === col.key;
                          const colStat = matchResult.columnStats.find((s) => s.columnKey === col.key);
                          const hasDiffs = (colStat?.mismatchCount ?? 0) > 0;

                          return (
                            <th
                              key={col.key}
                              onClick={() => handleSort(col.key)}
                              className={`py-2.5 px-3 min-w-[160px] cursor-pointer select-none transition group ${
                                isSorted
                                  ? 'bg-teal-100/70 dark:bg-teal-950/70 text-teal-900 dark:text-teal-200 font-bold border-b-2 border-teal-500'
                                  : 'hover:bg-slate-200/80 dark:hover:bg-slate-700/80'
                              }`}
                              title={`Click to sort by ${col.headerA || col.headerB} (${
                                isSorted
                                  ? sortDirection === 'asc'
                                    ? 'Ascending: click for Descending'
                                    : 'Descending: click to reset sort'
                                  : 'Click for Ascending sort'
                              })`}
                            >
                              <div className="flex items-center justify-between space-x-1.5">
                                <div className="flex items-center space-x-1 truncate">
                                  <span className="font-mono truncate">{col.headerA || col.headerB}</span>
                                  {isOnlyA && (
                                    <span className="text-[9px] px-1 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-normal">
                                      Only A
                                    </span>
                                  )}
                                  {isOnlyB && (
                                    <span className="text-[9px] px-1 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-normal">
                                      Only B
                                    </span>
                                  )}
                                  {hasDiffs && (
                                    <span
                                      className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-normal"
                                      title={`${colStat?.mismatchCount} value mismatches in this column`}
                                    >
                                      {colStat?.mismatchCount}Δ
                                    </span>
                                  )}
                                </div>
                                <div className="flex-shrink-0">
                                  {isSorted ? (
                                    sortDirection === 'asc' ? (
                                      <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                    ) : (
                                      <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                                    )
                                  ) : (
                                    <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-20 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                              </div>
                            </th>
                          );
                        })}
                      <th className="py-2.5 px-3 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {sortedRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={matchResult.columnMappings.length + 5}
                          className="py-12 text-center text-slate-400"
                        >
                          No records matching the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      sortedRows.map((row, idx) => {
                        const isExpanded = expandedRowId === row.rowId;
                        const isMismatch = row.status === 'VALUE_MISMATCH';
                        const isOnlyA = row.status === 'ONLY_IN_A';
                        const isOnlyB = row.status === 'ONLY_IN_B';
                        const isExact = row.status === 'EXACT_MATCH';

                        return (
                          <React.Fragment key={row.rowId}>
                            <tr
                              className={`transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 ${
                                isMismatch
                                  ? 'bg-amber-50/40 dark:bg-amber-950/20'
                                  : isOnlyA
                                  ? 'bg-rose-50/30 dark:bg-rose-950/20'
                                  : isOnlyB
                                  ? 'bg-indigo-50/30 dark:bg-indigo-950/20'
                                  : ''
                              }`}
                            >
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>

                              {/* Status Badge */}
                              <td className="py-2 px-3">
                                {isExact && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>MATCH</span>
                                  </span>
                                )}
                                {isMismatch && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                                    <span>DIFF ({row.mismatchCount})</span>
                                  </span>
                                )}
                                {isOnlyA && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    <MinusCircle className="w-3 h-3 text-rose-600" />
                                    <span>ONLY IN A</span>
                                  </span>
                                )}
                                {isOnlyB && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    <PlusCircle className="w-3 h-3 text-indigo-600" />
                                    <span>ONLY IN B</span>
                                  </span>
                                )}
                              </td>

                              {/* Primary Key Value */}
                              <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                                {row.keyValue}
                              </td>

                              {/* Row Numbers in original files */}
                              <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                                {row.rowNumberA ?? '-'}
                              </td>
                              <td className="py-2 px-2 text-center text-slate-500 font-mono text-[11px]">
                                {row.rowNumberB ?? '-'}
                              </td>

                              {/* Compared Column Cells */}
                              {matchResult.columnMappings
                                .filter((m) => !m.isKey)
                                .map((col) => {
                                  const diff = row.cellDiffs[col.key];
                                  if (!diff) {
                                    return <td key={col.key} className="py-2 px-3 text-slate-400">-</td>;
                                  }

                                  const cellMismatch = !diff.isEqual;

                                  // Only in A row
                                  if (isOnlyA) {
                                    return (
                                      <td key={col.key} className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                                        {diff.valueA || <span className="text-slate-400 italic">empty</span>}
                                      </td>
                                    );
                                  }

                                  // Only in B row
                                  if (isOnlyB) {
                                    return (
                                      <td key={col.key} className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                                        {diff.valueB || <span className="text-slate-400 italic">empty</span>}
                                      </td>
                                    );
                                  }

                                  // Matching cell
                                  if (!cellMismatch) {
                                    return (
                                      <td key={col.key} className="py-2 px-3 font-mono text-slate-700 dark:text-slate-300">
                                        <div className="flex items-center space-x-1">
                                          <span>{diff.valueA || diff.valueB || <span className="text-slate-400 italic">empty</span>}</span>
                                          {diff.reason && (
                                            <span
                                              className="text-[9px] px-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                              title={diff.reason}
                                            >
                                              ~
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    );
                                  }

                                  // MISMATCH CELL -> Show side-by-side or stacked diff!
                                  return (
                                    <td
                                      key={col.key}
                                      className="py-1.5 px-3 bg-amber-100/60 dark:bg-amber-950/40 border-l border-r border-amber-200 dark:border-amber-900/60"
                                    >
                                      <div className="space-y-1 font-mono text-[11px]">
                                        <div className="flex items-center space-x-1">
                                          <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">A:</span>
                                          <span className="px-1 rounded bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 line-through">
                                            {diff.valueA !== null && diff.valueA !== '' ? diff.valueA : 'NULL'}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">B:</span>
                                          <span className="px-1 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-semibold">
                                            {diff.valueB !== null && diff.valueB !== '' ? diff.valueB : 'NULL'}
                                          </span>
                                        </div>
                                      </div>
                                    </td>
                                  );
                                })}

                              {/* Expand Action Button */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  onClick={() => setExpandedRowId(isExpanded ? null : row.rowId)}
                                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                                  title={isExpanded ? 'Collapse Details' : 'Expand Details'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </td>
                            </tr>

                            {/* Granular Detail Drawer for this row */}
                            {isExpanded && (
                              <tr className="bg-slate-100/80 dark:bg-slate-850">
                                <td colSpan={matchResult.columnMappings.length + 5} className="p-4">
                                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-300 dark:border-slate-700 space-y-3">
                                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-xs">
                                          Record Details: Key <code className="text-teal-600 dark:text-teal-400">{row.keyValue}</code>
                                        </span>
                                        <span className="text-[11px] text-slate-500">
                                          (Source Row {row.rowNumberA ?? 'N/A'} vs Target Row {row.rowNumberB ?? 'N/A'})
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => {
                                          const text = JSON.stringify(row, null, 2);
                                          handleCopyText(text, `row-${row.rowId}`);
                                        }}
                                        className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-teal-600"
                                      >
                                        {copiedId === `row-${row.rowId}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                        <span>Copy JSON</span>
                                      </button>
                                    </div>

                                    {/* Detailed Column Comparison Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs">
                                      {(Object.entries(row.cellDiffs) as [string, CellDiff][]).map(([colKey, diff]) => {
                                        const isMatch = diff.isEqual;
                                        return (
                                          <div
                                            key={colKey}
                                            className={`p-2.5 rounded-lg border ${
                                              isMatch
                                                ? 'bg-slate-50 dark:bg-slate-850 border-slate-200 dark:border-slate-800'
                                                : 'bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                                            }`}
                                          >
                                            <div className="flex items-center justify-between font-medium text-slate-700 dark:text-slate-300 mb-1">
                                              <span className="font-mono">{diff.headerName}</span>
                                              {isMatch ? (
                                                <span className="text-[10px] text-emerald-600 flex items-center space-x-0.5">
                                                  <Check className="w-3 h-3" />
                                                  <span>Match</span>
                                                </span>
                                              ) : (
                                                <span className="text-[10px] text-amber-700 font-bold">
                                                  DIFF
                                                </span>
                                              )}
                                            </div>

                                            <div className="space-y-1 font-mono text-[11px]">
                                              <div className="flex items-baseline space-x-2">
                                                <span className="text-slate-400 w-8">Set A:</span>
                                                <span className={!isMatch ? 'text-rose-600 font-semibold' : 'text-slate-800 dark:text-slate-200'}>
                                                  {diff.valueA !== null ? diff.valueA : '<Missing>'}
                                                </span>
                                              </div>
                                              <div className="flex items-baseline space-x-2">
                                                <span className="text-slate-400 w-8">Set B:</span>
                                                <span className={!isMatch ? 'text-emerald-600 font-semibold' : 'text-slate-800 dark:text-slate-200'}>
                                                  {diff.valueB !== null ? diff.valueB : '<Missing>'}
                                                </span>
                                              </div>
                                              {diff.reason && (
                                                <div className="text-[10px] text-slate-500 italic pt-1">
                                                  Note: {diff.reason}
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INPUT DATASETS */}
        {/* ========================================================================= */}
        {activeTab === 'inputs' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* DATASET A */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500"></span>
                  <input
                    type="text"
                    value={labelA}
                    onChange={(e) => setLabelA(e.target.value)}
                    className="font-bold text-xs text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Delimiter:</span>
                  <select
                    value={config.delimiterA}
                    onChange={(e) => setConfig((prev) => ({ ...prev, delimiterA: e.target.value as DelimiterChoice }))}
                    className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                  >
                    <option value="auto">Auto Detect ({matchResult.summary.detectedDelimiterA})</option>
                    <option value="comma">Comma (,)</option>
                    <option value="tab">Tab (\t / Excel)</option>
                    <option value="space">Space / Whitespace</option>
                    <option value="semicolon">Semicolon (;)</option>
                    <option value="pipe">Pipe (|)</option>
                  </select>
                </div>
              </div>

              <textarea
                value={dataA}
                onChange={(e) => setDataA(e.target.value)}
                placeholder="Paste CSV, TSV, or space-separated data for Dataset A..."
                rows={16}
                className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Rows: <strong>{matchResult.summary.totalRowsA}</strong> • Delimiter:{' '}
                  <code className="text-teal-600">{matchResult.summary.detectedDelimiterA}</code>
                </span>
                <button
                  onClick={() => setDataA('')}
                  className="text-slate-400 hover:text-rose-600 text-[11px]"
                >
                  Clear Dataset A
                </button>
              </div>
            </div>

            {/* DATASET B */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                  <input
                    type="text"
                    value={labelB}
                    onChange={(e) => setLabelB(e.target.value)}
                    className="font-bold text-xs text-slate-900 dark:text-slate-100 bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:outline-none"
                  />
                </div>

                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500">Delimiter:</span>
                  <select
                    value={config.delimiterB}
                    onChange={(e) => setConfig((prev) => ({ ...prev, delimiterB: e.target.value as DelimiterChoice }))}
                    className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs"
                  >
                    <option value="auto">Auto Detect ({matchResult.summary.detectedDelimiterB})</option>
                    <option value="comma">Comma (,)</option>
                    <option value="tab">Tab (\t / Excel)</option>
                    <option value="space">Space / Whitespace</option>
                    <option value="semicolon">Semicolon (;)</option>
                    <option value="pipe">Pipe (|)</option>
                  </select>
                </div>
              </div>

              <textarea
                value={dataB}
                onChange={(e) => setDataB(e.target.value)}
                placeholder="Paste CSV, TSV, or space-separated data for Dataset B..."
                rows={16}
                className="w-full font-mono text-xs p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-teal-500 focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Rows: <strong>{matchResult.summary.totalRowsB}</strong> • Delimiter:{' '}
                  <code className="text-teal-600">{matchResult.summary.detectedDelimiterB}</code>
                </span>
                <button
                  onClick={() => setDataB('')}
                  className="text-slate-400 hover:text-rose-600 text-[11px]"
                >
                  Clear Dataset B
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: HEADERS, KEYS & COMPARISON RULES */}
        {/* ========================================================================= */}
        {activeTab === 'columns' && (
          <div className="space-y-4">
            {/* Header Alignment Overview */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Header Alignment & Primary Key Selection
                  </h3>
                  <p className="text-xs text-slate-500">
                    Headers are mapped automatically regardless of order. Select one or more columns to act as the unique primary key.
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  {matchResult.commonColumns.length} Common • {matchResult.onlyInAColumns.length} Only in A • {matchResult.onlyInBColumns.length} Only in B
                </span>
              </div>

              {/* Column Mapping Table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-3">Column Name in A</th>
                      <th className="py-2.5 px-3">Column Name in B</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-center">Primary Key</th>
                      <th className="py-2.5 px-3 text-center">Compare Values</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {matchResult.columnMappings.map((col) => {
                      const isCommon = Boolean(col.headerA && col.headerB);
                      const isKey = effectiveKeyColumns.includes(col.key);
                      const isIgnored = config.ignoredColumns.includes(col.key);

                      return (
                        <tr
                          key={col.key}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-850 ${
                            isKey ? 'bg-teal-50/50 dark:bg-teal-950/20' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {col.headerA || <span className="text-rose-500 font-normal italic">Not present in A</span>}
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                            {col.headerB || <span className="text-indigo-500 font-normal italic">Not present in B</span>}
                          </td>

                          {/* Alignment Badge */}
                          <td className="py-2 px-3 text-center">
                            {isCommon ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                Mapped
                              </span>
                            ) : col.headerA ? (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                                Only in A
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                Only in B
                              </span>
                            )}
                          </td>

                          {/* Primary Key Checkbox */}
                          <td className="py-2 px-3 text-center">
                            {isCommon ? (
                              <label className="cursor-pointer inline-flex items-center space-x-1 select-none">
                                <input
                                  type="checkbox"
                                  checked={isKey}
                                  onChange={() => handleToggleKeyColumn(col.key)}
                                  className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span className={isKey ? 'font-bold text-teal-700 dark:text-teal-400 text-xs' : 'text-slate-400 text-xs'}>
                                  {isKey ? 'KEY' : 'Select'}
                                </span>
                              </label>
                            ) : (
                              <span className="text-slate-400 text-[11px]">N/A</span>
                            )}
                          </td>

                          {/* Compare Checkbox */}
                          <td className="py-2 px-3 text-center">
                            {isCommon && !isKey ? (
                              <label className="cursor-pointer inline-flex items-center space-x-1 select-none">
                                <input
                                  type="checkbox"
                                  checked={!isIgnored}
                                  onChange={() => handleToggleIgnoredColumn(col.key)}
                                  className="rounded text-teal-600 focus:ring-teal-500"
                                />
                                <span className={!isIgnored ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 line-through'}>
                                  {!isIgnored ? 'Active' : 'Ignored'}
                                </span>
                              </label>
                            ) : isKey ? (
                              <span className="text-teal-600 font-semibold text-[11px]">Key Column</span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Skipped</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Comparison Tolerance & Value Normalization Settings */}
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                Value Normalization & Tolerance Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {/* Trim Whitespace */}
                <label className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.trimValues}
                    onChange={(e) => setConfig((prev) => ({ ...prev, trimValues: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Trim Whitespace</span>
                    <span className="text-[11px] text-slate-500">
                      Ignore leading and trailing spaces (e.g. <code className="text-teal-600">" Alice "</code> == <code className="text-teal-600">"Alice"</code>).
                    </span>
                  </div>
                </label>

                {/* Case Insensitive Values */}
                <label className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.ignoreValueCase}
                    onChange={(e) => setConfig((prev) => ({ ...prev, ignoreValueCase: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Case-Insensitive Values</span>
                    <span className="text-[11px] text-slate-500">
                      Treat <code className="text-teal-600">"DELIVERED"</code> and <code className="text-teal-600">"delivered"</code> as identical.
                    </span>
                  </div>
                </label>

                {/* Date Normalization */}
                <label className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.normalizeDates}
                    onChange={(e) => setConfig((prev) => ({ ...prev, normalizeDates: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Date Format Equivalence</span>
                    <span className="text-[11px] text-slate-500">
                      Automatically matches <code className="text-teal-600">24/10/2023</code> with <code className="text-teal-600">2023-10-24</code>.
                    </span>
                  </div>
                </label>

                {/* Numeric Tolerance */}
                <label className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.numericTolerance}
                    onChange={(e) => setConfig((prev) => ({ ...prev, numericTolerance: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Numeric Tolerance</span>
                    <span className="text-[11px] text-slate-500">
                      Treat <code className="text-teal-600">150.00</code> and <code className="text-teal-600">150.0</code> as equal numbers.
                    </span>
                  </div>
                </label>

                {/* Null & Empty Equivalence */}
                <label className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.treatNullAndEmptyAsEqual}
                    onChange={(e) => setConfig((prev) => ({ ...prev, treatNullAndEmptyAsEqual: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Null & Empty Equivalence</span>
                    <span className="text-[11px] text-slate-500">
                      Treat <code className="text-teal-600">""</code>, <code className="text-teal-600">NULL</code>, and <code className="text-teal-600">N/A</code> as equal.
                    </span>
                  </div>
                </label>

                {/* Fuzzy Header Matching */}
                <label className="flex items-start space-x-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.normalizeHeaderNames}
                    onChange={(e) => setConfig((prev) => ({ ...prev, normalizeHeaderNames: e.target.checked }))}
                    className="mt-0.5 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">Normalize Header Names</span>
                    <span className="text-[11px] text-slate-500">
                      Match <code className="text-teal-600">customer_name</code> with <code className="text-teal-600">Customer Name</code>.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: RECONCILIATION SQL GENERATOR */}
        {/* ========================================================================= */}
        {activeTab === 'sql' && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Automated Database Reconciliation Script
                  </h3>
                  <p className="text-xs text-slate-500">
                    Generates transactional SQL UPDATE statements for discrepant cells and INSERT statements for missing rows.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1.5 text-xs">
                    <span className="text-slate-500">Table:</span>
                    <input
                      type="text"
                      value={config.tableNameForSql}
                      onChange={(e) => setConfig((prev) => ({ ...prev, tableNameForSql: e.target.value }))}
                      className="px-2 py-1 font-mono text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 w-36"
                    />
                  </div>

                  <select
                    value={sqlSyncDirection}
                    onChange={(e) => setSqlSyncDirection(e.target.value as any)}
                    className="text-xs font-semibold px-2.5 py-1 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400"
                  >
                    <option value="update_b_to_match_a">Make Target (B) Match Source (A)</option>
                    <option value="update_a_to_match_b">Make Source (A) Match Target (B)</option>
                  </select>

                  <button
                    onClick={() => handleCopyText(reconciliationSql, 'sql-copy')}
                    className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition"
                  >
                    {copiedId === 'sql-copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy SQL</span>
                  </button>

                  <button
                    onClick={handleDownloadSql}
                    className="flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              {/* Code display */}
              <div className="relative">
                <pre className="p-4 rounded-xl font-mono text-xs bg-slate-900 text-emerald-400 dark:bg-black dark:text-emerald-400 overflow-x-auto max-h-[500px]">
                  {reconciliationSql}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: EXPORTS & REPORTS */}
        {/* ========================================================================= */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Export Comparison Results & Discrepancy Reports
                </h3>
                <p className="text-xs text-slate-500">
                  Download structured diffs for QA bug tickets, client reports, or downstream verification tools.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* CSV Export Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3">
                  <div className="flex items-center space-x-2 text-teal-600 dark:text-teal-400 font-bold text-xs">
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>CSV Discrepancy Log</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Includes Status, Key, Row A, Row B, and semicolon-delimited lists of mismatched cells.
                  </p>
                  <button
                    onClick={handleDownloadCsvDiff}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Diff</span>
                  </button>
                </div>

                {/* Markdown Report Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3">
                  <div className="flex items-center space-x-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                    <FileText className="w-4 h-4" />
                    <span>Markdown Audit Report</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Formatted Markdown table ready to paste into GitHub PRs, Jira tickets, or Confluence documentation.
                  </p>
                  <button
                    onClick={handleDownloadMarkdown}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Markdown Report</span>
                  </button>
                </div>

                {/* Quick Copy Keys Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 space-y-3">
                  <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-xs">
                    <Copy className="w-4 h-4" />
                    <span>Mismatched Keys List</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Copy all unique keys that had discrepancies for pasting into database IN queries or logs.
                  </p>
                  <button
                    onClick={() => {
                      const keys = matchResult.rows
                        .filter((r) => r.status === 'VALUE_MISMATCH')
                        .map((r) => r.keyValue)
                        .join('\n');
                      handleCopyText(keys, 'mismatched-keys');
                    }}
                    className="w-full py-2 px-3 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition flex items-center justify-center space-x-1.5"
                  >
                    {copiedId === 'mismatched-keys' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>Copy Mismatched Keys</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
