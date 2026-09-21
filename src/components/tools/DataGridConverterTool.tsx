import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Table,
  Upload,
  Download,
  Copy,
  Check,
  RotateCcw,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Maximize2,
  Minimize2,
  FileText,
  Code2,
  Database,
  Braces,
  Hash,
  Info,
  Layers,
  FileSpreadsheet,
  Columns3,
} from 'lucide-react';
import {
  parseToDataGrid,
  exportDataGrid,
  extractColumnData,
  calculateColumnStats,
  transposeDataGrid,
  deduplicateGridRows,
  sortGridRows,
  filterGridRows,
  DelimiterType,
  DataGridParseOptions,
  DataGridModel,
  ExportFormat,
  ColumnCopyFormat,
  ColumnStats,
  DATA_GRID_PRESETS,
} from '../../utils/dataGridConverter';

interface DataGridConverterToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DataGridConverterTool: React.FC<DataGridConverterToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  // Parsing Options State
  const [rawInput, setRawInput] = useState<string>(DATA_GRID_PRESETS[0].data);
  const [delimiter, setDelimiter] = useState<DelimiterType>('auto');
  const [customDelimiter, setCustomDelimiter] = useState<string>('');
  const [hasHeader, setHasHeader] = useState<boolean>(true);
  const [trimCells, setTrimCells] = useState<boolean>(true);
  const [collapseSpaces, setCollapseSpaces] = useState<boolean>(true);
  const [skipEmptyLines, setSkipEmptyLines] = useState<boolean>(true);
  const [ignoreComments, setIgnoreComments] = useState<boolean>(true);

  // Active Output / View Mode
  const [activeTab, setActiveTab] = useState<ExportFormat>('grid');
  const [sqlTableName, setSqlTableName] = useState<string>('imported_records');

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Grid Sorting
  const [sortColumnIndex, setSortColumnIndex] = useState<number | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Interactive Grid Edits (Working Copy)
  const [editedGrid, setEditedGrid] = useState<DataGridModel | null>(null);

  // Column Actions UI State
  const [selectedColActionIndex, setSelectedColActionIndex] = useState<number | null>(null);
  const [selectedColStats, setSelectedColStats] = useState<ColumnStats | null>(null);
  const [editingHeaderIndex, setEditingHeaderIndex] = useState<number | null>(null);
  const [editingHeaderValue, setEditingHeaderValue] = useState<string>('');

  // Notification / Feedback State
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse raw text into model
  const parsedModel = useMemo(() => {
    const opts: DataGridParseOptions = {
      delimiter,
      customDelimiter,
      hasHeader,
      trimCells,
      collapseSpaces,
      skipEmptyLines,
      ignoreComments,
      commentPrefix: '#',
    };
    return parseToDataGrid(rawInput, opts);
  }, [rawInput, delimiter, customDelimiter, hasHeader, trimCells, collapseSpaces, skipEmptyLines, ignoreComments]);

  // Sync editedGrid when parsedModel changes
  useEffect(() => {
    setEditedGrid(parsedModel);
    setCurrentPage(1);
    setSortColumnIndex(null);
  }, [parsedModel]);

  // Current active grid (edited or parsed)
  const activeGrid = editedGrid || parsedModel;

  // Sorted and Filtered Rows
  const processedGrid = useMemo(() => {
    let result = activeGrid;

    // Filter
    if (searchQuery.trim()) {
      result = filterGridRows(result, searchQuery);
    }

    // Sort
    if (sortColumnIndex !== null && sortColumnIndex < result.headers.length) {
      result = sortGridRows(result, sortColumnIndex, sortDirection);
    }

    return result;
  }, [activeGrid, searchQuery, sortColumnIndex, sortDirection]);

  // Paginated Rows
  const totalPages = Math.max(1, Math.ceil(processedGrid.rows.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedRows = useMemo(() => {
    if (pageSize >= 1000) return processedGrid.rows;
    const start = (effectivePage - 1) * pageSize;
    return processedGrid.rows.slice(start, start + pageSize);
  }, [processedGrid.rows, effectivePage, pageSize]);

  // Generated Text for Export
  const exportText = useMemo(() => {
    if (activeTab === 'grid') return '';
    return exportDataGrid(processedGrid, activeTab, {
      tableName: sqlTableName,
      prettyJson: true,
    });
  }, [processedGrid, activeTab, sqlTableName]);

  // Show copied toast
  const triggerCopyFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 2500);
  };

  // Copy text to clipboard
  const handleCopyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      triggerCopyFeedback(`Copied ${label} to clipboard`);
    });
  };

  // Copy column data
  const handleCopyColumnData = (colIndex: number, format: ColumnCopyFormat, formatName: string) => {
    const colName = activeGrid.headers[colIndex] || `Column ${colIndex + 1}`;
    const formatted = extractColumnData(processedGrid, colIndex, format);
    handleCopyToClipboard(formatted, `Column "${colName}" (${formatName})`);
    setSelectedColActionIndex(null);
  };

  // File Upload / Drag & Drop
  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content !== undefined) {
        setRawInput(content);
        triggerCopyFeedback(`Imported "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Download File
  const handleDownloadFile = () => {
    if (!exportText) return;
    let ext = 'txt';
    let mime = 'text/plain';

    switch (activeTab) {
      case 'csv':
        ext = 'csv';
        mime = 'text/csv';
        break;
      case 'tsv':
        ext = 'tsv';
        mime = 'text/tab-separated-values';
        break;
      case 'json_objects':
      case 'json_arrays':
        ext = 'json';
        mime = 'application/json';
        break;
      case 'markdown':
        ext = 'md';
        mime = 'text/markdown';
        break;
      case 'sql_insert':
        ext = 'sql';
        mime = 'application/sql';
        break;
      case 'html':
        ext = 'html';
        mime = 'text/html';
        break;
      case 'latex':
        ext = 'tex';
        mime = 'text/x-tex';
        break;
      case 'yaml':
        ext = 'yaml';
        mime = 'text/yaml';
        break;
      case 'ascii':
        ext = 'txt';
        mime = 'text/plain';
        break;
    }

    const blob = new Blob([exportText], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `data-grid-export.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerCopyFeedback(`Downloaded data-grid-export.${ext}`);
  };

  // Sorting Handler
  const handleSortColumn = (colIdx: number) => {
    if (sortColumnIndex === colIdx) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortColumnIndex(null);
        setSortDirection('asc');
      }
    } else {
      setSortColumnIndex(colIdx);
      setSortDirection('asc');
    }
  };

  // Cell Editing
  const handleCellChange = (rowIndex: number, colIndex: number, newValue: string) => {
    if (!editedGrid) return;
    const newRows = [...editedGrid.rows];
    if (newRows[rowIndex]) {
      const newRow = [...newRows[rowIndex]];
      newRow[colIndex] = newValue;
      newRows[rowIndex] = newRow;
      setEditedGrid({ ...editedGrid, rows: newRows });
    }
  };

  // Header Renaming
  const handleStartRenameHeader = (idx: number) => {
    setEditingHeaderIndex(idx);
    setEditingHeaderValue(activeGrid.headers[idx] || '');
  };

  const handleSaveRenameHeader = () => {
    if (editingHeaderIndex === null || !editedGrid) return;
    const trimmed = editingHeaderValue.trim();
    if (trimmed) {
      const newHeaders = [...editedGrid.headers];
      newHeaders[editingHeaderIndex] = trimmed;
      setEditedGrid({ ...editedGrid, headers: newHeaders });
    }
    setEditingHeaderIndex(null);
  };

  // Grid Transformations
  const handleTranspose = () => {
    const flipped = transposeDataGrid(activeGrid);
    setEditedGrid(flipped);
    setCurrentPage(1);
    setSortColumnIndex(null);
    triggerCopyFeedback(`Transposed grid: ${flipped.totalRows} rows × ${flipped.totalCols} cols`);
  };

  const handleDeduplicate = () => {
    const { grid, removedCount } = deduplicateGridRows(activeGrid);
    setEditedGrid(grid);
    triggerCopyFeedback(
      removedCount > 0 ? `Removed ${removedCount} duplicate row(s)` : 'No duplicate rows found'
    );
  };

  const handleAddRow = () => {
    const emptyRow = activeGrid.headers.map(() => '');
    const newRows = [...activeGrid.rows, emptyRow];
    setEditedGrid({
      ...activeGrid,
      rows: newRows,
      totalRows: newRows.length,
    });
    triggerCopyFeedback('Added new row at the bottom');
  };

  const handleAddColumn = () => {
    const newColName = `Column_${activeGrid.headers.length + 1}`;
    const newHeaders = [...activeGrid.headers, newColName];
    const newRows = activeGrid.rows.map((r) => [...r, '']);
    setEditedGrid({
      ...activeGrid,
      headers: newHeaders,
      rows: newRows,
      totalCols: newHeaders.length,
    });
    triggerCopyFeedback(`Added new column "${newColName}"`);
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (activeGrid.headers.length <= 1) {
      triggerCopyFeedback('Cannot delete the only column in grid');
      return;
    }
    const newHeaders = activeGrid.headers.filter((_, i) => i !== colIdx);
    const newRows = activeGrid.rows.map((r) => r.filter((_, i) => i !== colIdx));
    setEditedGrid({
      ...activeGrid,
      headers: newHeaders,
      rows: newRows,
      totalCols: newHeaders.length,
    });
    setSelectedColActionIndex(null);
    triggerCopyFeedback('Deleted column');
  };

  const handleDeleteRow = (rowIdx: number) => {
    const newRows = activeGrid.rows.filter((_, i) => i !== rowIdx);
    setEditedGrid({
      ...activeGrid,
      rows: newRows,
      totalRows: newRows.length,
    });
    triggerCopyFeedback('Deleted row');
  };

  // Preset Selection
  const handleLoadPreset = (presetId: string) => {
    const p = DATA_GRID_PRESETS.find((item) => item.id === presetId);
    if (p) {
      setRawInput(p.data);
      setDelimiter(p.delimiter);
      setHasHeader(p.hasHeader);
      triggerCopyFeedback(`Loaded preset "${p.name}"`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 font-sans">
      {/* Toast Feedback */}
      {copyFeedback && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white shadow-xl shadow-indigo-600/30 text-xs font-semibold animate-in fade-in slide-in-from-top-3 duration-200">
          <Check className="w-4 h-4 text-emerald-300" />
          <span>{copyFeedback}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Data Grid Converter
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                CSV / TSV / Space / Delimited
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Convert raw tabular data into an interactive grid, copy any column, and export to CSV, JSON, Markdown, or SQL
            </p>
          </div>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex items-center gap-2">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 bg-slate-950/70 border border-slate-800 rounded-lg p-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 ml-1.5" />
            <select
              onChange={(e) => handleLoadPreset(e.target.value)}
              className="bg-transparent text-xs text-slate-200 focus:outline-hidden cursor-pointer pr-2 py-1 font-medium"
              defaultValue=""
            >
              <option value="" disabled className="bg-slate-900 text-slate-400">
                Load Sample Preset...
              </option>
              {DATA_GRID_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Fullscreen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              title={isFullScreen ? 'Exit Fullscreen' : 'Fullscreen Mode'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col xl:flex-row min-h-0 overflow-hidden">
        {/* Left Side: Input & Settings (Collapsible or 35% on desktop) */}
        <div className="w-full xl:w-[420px] 2xl:w-[460px] border-b xl:border-b-0 xl:border-r border-slate-800 bg-slate-950/60 flex flex-col shrink-0 overflow-y-auto">
          {/* Input Header & Drag-Drop */}
          <div className="p-4 border-b border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-indigo-400" />
                Raw Data Input
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  accept=".csv,.tsv,.txt,.tab,.log,.json"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-indigo-400" />
                  Import File
                </button>
                <button
                  onClick={() => setRawInput('')}
                  className="px-2.5 py-1 text-xs rounded-md bg-slate-800/60 hover:bg-rose-900/30 text-slate-400 hover:text-rose-300 border border-slate-700/60 transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Drag and drop paste area */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="relative group rounded-xl border border-dashed border-slate-700/80 hover:border-indigo-500/80 bg-slate-900/50 p-2.5 transition-all"
            >
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="Paste CSV, TSV (tab), space-separated CLI output (ps aux, logs), pipe or semicolon data here, or drag & drop a file..."
                rows={7}
                className="w-full bg-transparent text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-hidden resize-y leading-relaxed"
                spellCheck={false}
              />
              <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono">
                <span>
                  {rawInput.split(/\r?\n/).filter((l) => l.trim().length > 0).length} lines |{' '}
                  {(new Blob([rawInput]).size / 1024).toFixed(1)} KB
                </span>
                <span className="text-indigo-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Detected: {parsedModel.detectedDelimiter}
                </span>
              </div>
            </div>
          </div>

          {/* Delimiter & Parsing Settings */}
          <div className="p-4 border-b border-slate-800/80 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                Delimiter & Parsing
              </span>
              <span className="text-[10px] text-slate-500 font-mono">RFC 4180 Escaping</span>
            </div>

            {/* Delimiter Radio Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'auto', label: 'Auto Detect' },
                { id: 'comma', label: 'Comma (,)' },
                { id: 'tab', label: 'Tab (\\t)' },
                { id: 'space', label: 'Space (\\s+)' },
                { id: 'semicolon', label: 'Semicolon (;)' },
                { id: 'pipe', label: 'Pipe (|)' },
                { id: 'colon', label: 'Colon (:)' },
                { id: 'custom', label: 'Custom' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setDelimiter(item.id as DelimiterType)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                    delimiter === item.id
                      ? 'bg-indigo-600 border-indigo-500 text-white shadow-xs'
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Custom Delimiter Input */}
            {delimiter === 'custom' && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Custom Delimiter:</span>
                <input
                  type="text"
                  value={customDelimiter}
                  onChange={(e) => setCustomDelimiter(e.target.value)}
                  placeholder="e.g. ~ or :: or \t"
                  className="flex-1 bg-slate-950 text-xs font-mono text-indigo-300 border border-slate-700 rounded px-2 py-1 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            )}

            {/* Parsing Options Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hasHeader}
                  onChange={(e) => setHasHeader(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span>First row is Header</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={trimCells}
                  onChange={(e) => setTrimCells(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span>Trim cell spaces</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={skipEmptyLines}
                  onChange={(e) => setSkipEmptyLines(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span>Skip empty lines</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={ignoreComments}
                  onChange={(e) => setIgnoreComments(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-indigo-500 focus:ring-0"
                />
                <span>Ignore # comments</span>
              </label>
            </div>
          </div>

          {/* Quick Column Data Copy Drawer */}
          <div className="p-4 flex-1">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Columns3 className="w-3.5 h-3.5 text-indigo-400" />
                Copy Column Data
              </span>
              <span className="text-[11px] text-indigo-400 font-mono">{activeGrid.headers.length} columns</span>
            </div>

            <p className="text-xs text-slate-400 mb-3">
              Quickly copy all row values of any column into your clipboard in your preferred format:
            </p>

            <div className="space-y-2">
              {activeGrid.headers.map((colName, idx) => {
                const isSelected = selectedColActionIndex === idx;
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:border-slate-700 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-5 h-5 rounded-md bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-slate-200 truncate" title={colName}>
                          {colName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopyColumnData(idx, 'newline', 'List')}
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-medium transition-colors cursor-pointer"
                          title="Copy as Newline list"
                        >
                          List
                        </button>
                        <button
                          onClick={() => handleCopyColumnData(idx, 'single_quote_sql', "SQL 'IN'")}
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-medium transition-colors cursor-pointer"
                          title="Copy as SQL IN clause ('val1', 'val2')"
                        >
                          SQL 'IN'
                        </button>
                        <button
                          onClick={() => handleCopyColumnData(idx, 'json_array', 'JSON')}
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-300 font-medium transition-colors cursor-pointer"
                          title='Copy as JSON array ["val1", "val2"]'
                        >
                          JSON
                        </button>
                        <button
                          onClick={() => setSelectedColActionIndex(isSelected ? null : idx)}
                          className="p-1 rounded bg-slate-800/80 text-slate-400 hover:text-slate-200 text-xs"
                          title="More column formats & stats"
                        >
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Expanded Column Formats & Stats */}
                    {isSelected && (
                      <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={() => handleCopyColumnData(idx, 'comma_space', 'Comma separated')}
                            className="p-1.5 rounded bg-slate-950 hover:bg-indigo-900/40 text-left text-slate-300 hover:text-indigo-200 border border-slate-800"
                          >
                            Comma Separated (a, b)
                          </button>
                          <button
                            onClick={() => handleCopyColumnData(idx, 'double_quote', 'Double quotes')}
                            className="p-1.5 rounded bg-slate-950 hover:bg-indigo-900/40 text-left text-slate-300 hover:text-indigo-200 border border-slate-800"
                          >
                            Double Quoted ("a", "b")
                          </button>
                          <button
                            onClick={() => handleCopyColumnData(idx, 'unique_newline', 'Unique list')}
                            className="p-1.5 rounded bg-slate-950 hover:bg-indigo-900/40 text-left text-slate-300 hover:text-indigo-200 border border-slate-800"
                          >
                            Unique Distinct List
                          </button>
                          <button
                            onClick={() => {
                              const stats = calculateColumnStats(activeGrid, idx);
                              setSelectedColStats(stats);
                            }}
                            className="p-1.5 rounded bg-slate-950 hover:bg-indigo-900/40 text-left text-amber-300 hover:text-amber-200 border border-slate-800"
                          >
                            View Column Statistics
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Data Grid & Multi-Format Exporter */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-hidden">
          {/* View / Export Format Tabs */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-b border-slate-800 bg-slate-950/40 overflow-x-auto shrink-0">
            <div className="flex items-center gap-1.5">
              {[
                { id: 'grid', label: 'Data Grid', icon: Table },
                { id: 'csv', label: 'CSV', icon: FileSpreadsheet },
                { id: 'tsv', label: 'TSV', icon: FileText },
                { id: 'json_objects', label: 'JSON Objects', icon: Braces },
                { id: 'json_arrays', label: 'JSON 2D Array', icon: Braces },
                { id: 'markdown', label: 'Markdown', icon: FileText },
                { id: 'sql_insert', label: 'SQL INSERT', icon: Database },
                { id: 'html', label: 'HTML Table', icon: Code2 },
                { id: 'ascii', label: 'ASCII Box', icon: Layers },
                { id: 'yaml', label: 'YAML', icon: FileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as ExportFormat)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Export Controls */}
            {activeTab !== 'grid' && (
              <div className="flex items-center gap-2 ml-4">
                {activeTab === 'sql_insert' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-400">Table:</span>
                    <input
                      type="text"
                      value={sqlTableName}
                      onChange={(e) => setSqlTableName(e.target.value)}
                      className="w-28 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-indigo-300 font-mono focus:outline-hidden"
                    />
                  </div>
                )}

                <button
                  onClick={() => handleCopyToClipboard(exportText, activeTab.toUpperCase())}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy All</span>
                </button>

                <button
                  onClick={handleDownloadFile}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Download</span>
                </button>
              </div>
            )}
          </div>

          {/* Body: Grid View or Code Export */}
          {activeTab === 'grid' ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Grid Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 border-b border-slate-800 bg-slate-950/20 shrink-0">
                {/* Search Bar */}
                <div className="flex items-center gap-2 flex-1 max-w-md">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search across all rows & columns..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Grid Transformation Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTranspose}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Flip Rows and Columns (Transpose)"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Transpose</span>
                  </button>

                  <button
                    onClick={handleDeduplicate}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Remove identical duplicate rows"
                  >
                    <Filter className="w-3.5 h-3.5 text-amber-400" />
                    <span>Deduplicate</span>
                  </button>

                  <button
                    onClick={handleAddRow}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Add a new blank row"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Row</span>
                  </button>

                  <button
                    onClick={handleAddColumn}
                    className="px-2.5 py-1.5 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Add a new blank column"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Add Column</span>
                  </button>
                </div>
              </div>

              {/* Data Table */}
              <div className="flex-1 overflow-auto bg-slate-950/40">
                {activeGrid.headers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-500">
                    <Table className="w-12 h-12 stroke-1 mb-3 text-slate-600" />
                    <p className="text-sm font-semibold text-slate-400">No tabular data to display</p>
                    <p className="text-xs mt-1">Paste CSV or delimited data into the input panel on the left</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse text-xs">
                    {/* Table Header */}
                    <thead className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 shadow-xs">
                      <tr>
                        {/* Row # Col */}
                        <th className="w-12 px-3 py-2.5 font-mono text-[11px] font-bold text-slate-500 text-center border-r border-slate-800/80 bg-slate-900/90">
                          #
                        </th>

                        {/* Data Column Headers */}
                        {activeGrid.headers.map((colName, colIdx) => {
                          const isSorted = sortColumnIndex === colIdx;
                          const isEditing = editingHeaderIndex === colIdx;

                          return (
                            <th
                              key={colIdx}
                              className="px-3 py-2 font-semibold text-slate-200 border-r border-slate-800/80 min-w-[140px] max-w-[280px]"
                            >
                              <div className="flex items-center justify-between gap-1.5 group">
                                {isEditing ? (
                                  <div className="flex items-center gap-1 flex-1">
                                    <input
                                      type="text"
                                      value={editingHeaderValue}
                                      onChange={(e) => setEditingHeaderValue(e.target.value)}
                                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRenameHeader()}
                                      className="bg-slate-950 text-white border border-indigo-500 rounded px-1.5 py-0.5 text-xs w-full focus:outline-hidden"
                                      autoFocus
                                    />
                                    <button
                                      onClick={handleSaveRenameHeader}
                                      className="p-1 rounded bg-indigo-600 text-white"
                                    >
                                      <Check className="w-3 h-3" />
                                    </button>
                                  </div>
                                ) : (
                                  <span
                                    onDoubleClick={() => handleStartRenameHeader(colIdx)}
                                    className="truncate font-mono text-slate-200 hover:text-indigo-400 cursor-pointer"
                                    title="Double-click to rename header"
                                  >
                                    {colName}
                                  </span>
                                )}

                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 shrink-0">
                                  {/* Sort Button */}
                                  <button
                                    onClick={() => handleSortColumn(colIdx)}
                                    className={`p-1 rounded hover:bg-slate-800 text-slate-400 transition-colors ${
                                      isSorted ? 'text-indigo-400 bg-indigo-500/10' : ''
                                    }`}
                                    title={`Sort by ${colName}`}
                                  >
                                    {isSorted ? (
                                      sortDirection === 'asc' ? (
                                        <ArrowUp className="w-3.5 h-3.5" />
                                      ) : (
                                        <ArrowDown className="w-3.5 h-3.5" />
                                      )
                                    ) : (
                                      <ArrowUpDown className="w-3 h-3 text-slate-500" />
                                    )}
                                  </button>

                                  {/* Quick Column Copy Button */}
                                  <button
                                    onClick={() => handleCopyColumnData(colIdx, 'newline', 'List')}
                                    className="p-1 rounded hover:bg-indigo-600/30 hover:text-indigo-300 text-slate-400 transition-colors"
                                    title={`Copy all values of "${colName}"`}
                                  >
                                    <Copy className="w-3 h-3" />
                                  </button>

                                  {/* Delete Column Button */}
                                  <button
                                    onClick={() => handleDeleteColumn(colIdx)}
                                    className="p-1 rounded hover:bg-rose-900/40 hover:text-rose-300 text-slate-500 transition-colors"
                                    title={`Delete column "${colName}"`}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            </th>
                          );
                        })}

                        {/* Actions Col */}
                        <th className="w-10 px-2 py-2 text-center text-slate-500"></th>
                      </tr>
                    </thead>

                    {/* Table Rows */}
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {paginatedRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={activeGrid.headers.length + 2}
                            className="py-10 text-center text-slate-500 italic"
                          >
                            No matching rows found
                          </td>
                        </tr>
                      ) : (
                        paginatedRows.map((row, rowIdx) => {
                          const actualRowIndex = (effectivePage - 1) * pageSize + rowIdx;
                          return (
                            <tr
                              key={actualRowIndex}
                              className="hover:bg-slate-800/40 group transition-colors"
                            >
                              {/* Row Number */}
                              <td className="px-3 py-1.5 text-center text-slate-500 font-mono text-[11px] border-r border-slate-800/80 select-none bg-slate-950/30">
                                {actualRowIndex + 1}
                              </td>

                              {/* Editable Cells */}
                              {activeGrid.headers.map((_, colIdx) => {
                                const cellValue = row[colIdx] !== undefined ? row[colIdx] : '';
                                return (
                                  <td
                                    key={colIdx}
                                    className="p-0 border-r border-slate-800/60 focus-within:bg-indigo-950/30"
                                  >
                                    <input
                                      type="text"
                                      value={cellValue}
                                      onChange={(e) => handleCellChange(actualRowIndex, colIdx, e.target.value)}
                                      className="w-full bg-transparent px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:bg-slate-900 focus:ring-1 focus:ring-indigo-500 border-0"
                                    />
                                  </td>
                                );
                              })}

                              {/* Row Action (Delete) */}
                              <td className="px-2 py-1 text-center">
                                <button
                                  onClick={() => handleDeleteRow(actualRowIndex)}
                                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-rose-900/40 text-slate-500 hover:text-rose-300 transition-all"
                                  title="Delete Row"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Grid Footer with Stats and Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-t border-slate-800 bg-slate-950/60 shrink-0 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <span>
                    Total: <strong className="text-slate-200">{processedGrid.rows.length}</strong> rows ×{' '}
                    <strong className="text-slate-200">{activeGrid.headers.length}</strong> columns
                  </span>
                  {searchQuery && (
                    <span className="text-amber-400">
                      (Filtered from {activeGrid.rows.length} total rows)
                    </span>
                  )}
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <span>Rows per page:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200 focus:outline-hidden cursor-pointer"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={1000}>All</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={effectivePage <= 1}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                      title="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="px-2 font-mono">
                      Page {effectivePage} of {totalPages}
                    </span>

                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={effectivePage >= totalPages}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 transition-colors"
                      title="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Code / Formatted Export Output */
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950 p-4">
              <div className="flex-1 rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-900">
                  <span className="uppercase font-semibold text-indigo-400">
                    {activeTab.replace('_', ' ')} Output Preview
                  </span>
                  <span>
                    {exportText.split('\n').length} lines | {(new Blob([exportText]).size / 1024).toFixed(1)} KB
                  </span>
                </div>
                <textarea
                  readOnly
                  value={exportText}
                  className="flex-1 w-full p-4 bg-transparent font-mono text-xs text-slate-200 resize-none focus:outline-hidden leading-relaxed select-all"
                  spellCheck={false}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Column Statistics Modal */}
      {selectedColStats && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">
                  Column Statistics: <span className="text-indigo-300">"{selectedColStats.name}"</span>
                </h3>
              </div>
              <button
                onClick={() => setSelectedColStats(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Inferred Data Type:</span>
                <span className="font-mono font-semibold uppercase text-indigo-400">
                  {selectedColStats.type}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Total Count:</span>
                <span className="font-mono text-slate-200">{selectedColStats.totalCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Non-Empty Count:</span>
                <span className="font-mono text-slate-200">{selectedColStats.nonEmptyCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Empty / Null Count:</span>
                <span className="font-mono text-slate-200">{selectedColStats.emptyCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Unique / Distinct Values:</span>
                <span className="font-mono text-emerald-400">{selectedColStats.uniqueCount}</span>
              </div>

              {selectedColStats.numericStats && (
                <div className="pt-2 mt-2 border-t border-slate-800">
                  <span className="font-bold text-slate-300 block mb-1">Numeric Aggregate Summary:</span>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Min</span>
                      <span className="font-mono text-slate-200">{selectedColStats.numericStats.min}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Max</span>
                      <span className="font-mono text-slate-200">{selectedColStats.numericStats.max}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Sum</span>
                      <span className="font-mono text-slate-200">{selectedColStats.numericStats.sum}</span>
                    </div>
                    <div className="p-2 rounded bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-500 uppercase block">Average</span>
                      <span className="font-mono text-slate-200">{selectedColStats.numericStats.avg}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedColStats(null)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
