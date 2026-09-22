import React, { useState, useMemo, useRef } from 'react';
import {
  Database,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  Upload,
  Settings2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  Sliders,
  Layers,
  Code2,
  Terminal,
  FileCode,
  FileText,
  FileJson,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Play,
  Filter,
  Eye,
  Bookmark,
  Share2,
  Search,
  ExternalLink,
  X,
} from 'lucide-react';
import {
  CategoryRule,
  MetricColumnConfig,
  TargetTableConfig,
  RuleLogicConfig,
  CategoryMatcherConfig,
  Pg8000ConnectionConfig,
  TestSampleRow,
  RowValidationResult,
  DEFAULT_MATCHER_CONFIG,
  DEFAULT_SAMPLE_ROWS,
  CATEGORY_MATCHER_PRESETS,
  CategoryMatcherPreset,
  parseCategoryMetadataInput,
  generatePostgresCategoryQueries,
  generatePg8000PythonScript,
  evaluateLocalRow,
  validateAndParseMatcherConfig,
  createMatcherConfigExport,
  RuleOperator,
  MetricType,
} from '../../utils/dbCategoryMatcher';
import { CategoryMatcherConfigModal } from './CategoryMatcherConfigModal';

interface DbCategoryMatcherToolProps {
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

export const DbCategoryMatcherTool: React.FC<DbCategoryMatcherToolProps> = ({
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  // Main Config State
  const [targetTable, setTargetTable] = useState<TargetTableConfig>(DEFAULT_MATCHER_CONFIG.targetTable);
  const [metricColumns, setMetricColumns] = useState<MetricColumnConfig[]>(DEFAULT_MATCHER_CONFIG.metricColumns);
  const [categories, setCategories] = useState<CategoryRule[]>(DEFAULT_MATCHER_CONFIG.categories);
  const [ruleLogic, setRuleLogic] = useState<RuleLogicConfig>(DEFAULT_MATCHER_CONFIG.ruleLogic);
  const [pgConnection, setPgConnection] = useState<Pg8000ConnectionConfig>(DEFAULT_MATCHER_CONFIG.pgConnection);

  // Active Preset ID
  const [activePresetId, setActivePresetId] = useState<string>('eu-uk-sme');

  // Sample Rows for Live Simulation
  const [sampleRows, setSampleRows] = useState<TestSampleRow[]>(DEFAULT_SAMPLE_ROWS);

  // UI Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<'rules' | 'queries' | 'python' | 'simulator'>('rules');
  const [activeQuerySubTab, setActiveQuerySubTab] = useState<'discrepancy' | 'classification' | 'update' | 'view' | 'distribution' | 'cte'>('discrepancy');

  // Metadata Paste Modal State
  const [isPasteModalOpen, setIsPasteModalOpen] = useState<boolean>(false);
  const [rawPastedText, setRawPastedText] = useState<string>(
`1\t"Micro SME"\t9\t2000000\t2000000
2\t"SME"\t249\t50000000\t43000000
3\t"Small Midcap"\t499`
  );
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Import Sample Data Modal State
  const [isSampleImportOpen, setIsSampleImportOpen] = useState<boolean>(false);
  const [sampleImportText, setSampleImportText] = useState<string>('');
  const [sampleImportError, setSampleImportError] = useState<string | null>(null);

  // Config Modal State (Import/Export/Saved)
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);
  const [configModalTab, setConfigModalTab] = useState<'import' | 'export' | 'saved'>('import');

  // Copied indicator
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Search filter for Live Simulator
  const [simulatorSearch, setSimulatorSearch] = useState<string>('');
  const [simulatorStatusFilter, setSimulatorStatusFilter] = useState<'ALL' | 'MISMATCH' | 'MATCH' | 'UNCLASSIFIED'>('ALL');

  // Assemble full configuration object
  const currentFullConfig: CategoryMatcherConfig = useMemo(() => {
    return {
      version: '1.0.0',
      metadata: {
        name: `${targetTable.tableName} Category Matcher`,
        description: `Automated category matching for table ${targetTable.tableName} with ${categories.length} rules`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      targetTable,
      metricColumns,
      categories,
      ruleLogic,
      pgConnection,
    };
  }, [targetTable, metricColumns, categories, ruleLogic, pgConnection]);

  // Generate Queries
  const generatedQueries = useMemo(() => {
    return generatePostgresCategoryQueries(currentFullConfig);
  }, [currentFullConfig]);

  // Generate Python Script
  const generatedPythonScript = useMemo(() => {
    return generatePg8000PythonScript(currentFullConfig);
  }, [currentFullConfig]);

  // Evaluate Simulation Rows in real-time
  const simulationResults: RowValidationResult[] = useMemo(() => {
    return sampleRows.map((row) => evaluateLocalRow(row, metricColumns, categories, ruleLogic));
  }, [sampleRows, metricColumns, categories, ruleLogic]);

  // Summary counts for simulation
  const simulationStats = useMemo(() => {
    const total = simulationResults.length;
    const matches = simulationResults.filter((r) => r.status === 'MATCH').length;
    const mismatches = simulationResults.filter((r) => r.status === 'MISMATCH').length;
    const unclassified = simulationResults.filter((r) => r.status === 'UNCLASSIFIED').length;
    return { total, matches, mismatches, unclassified };
  }, [simulationResults]);

  // Filtered simulation rows
  const filteredSimulationResults = useMemo(() => {
    return simulationResults.filter((r) => {
      if (simulatorStatusFilter !== 'ALL' && r.status !== simulatorStatusFilter) {
        return false;
      }
      if (simulatorSearch.trim()) {
        const query = simulatorSearch.toLowerCase();
        const idMatch = r.id.toLowerCase().includes(query);
        const nameMatch = r.name?.toLowerCase().includes(query);
        const catMatch = r.expectedCategory.toLowerCase().includes(query) || (r.recordedCategory || '').toLowerCase().includes(query);
        return idMatch || nameMatch || catMatch;
      }
      return true;
    });
  }, [simulationResults, simulatorStatusFilter, simulatorSearch]);

  const handleCopyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Preset Selection Handler
  const handleSelectPreset = (presetId: string) => {
    const preset = CATEGORY_MATCHER_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setTargetTable(preset.config.targetTable);
    setMetricColumns(preset.config.metricColumns);
    setCategories(preset.config.categories);
    setRuleLogic(preset.config.ruleLogic);
    setPgConnection(preset.config.pgConnection);
    setSampleRows(preset.sampleRows);
  };

  // Apply Imported Config
  const handleApplyImportedConfig = (config: CategoryMatcherConfig) => {
    setTargetTable(config.targetTable);
    setMetricColumns(config.metricColumns);
    setCategories(config.categories);
    setRuleLogic(config.ruleLogic);
    if (config.pgConnection) setPgConnection(config.pgConnection);
    setActivePresetId('custom');
  };

  // Category Manipulation
  const handleAddCategory = () => {
    const nextPriority = categories.length + 1;
    const newRule: CategoryRule = {
      id: nextPriority,
      categoryName: `Category ${nextPriority}`,
      priority: nextPriority,
      description: `Rule for Category ${nextPriority}`,
      criteria: metricColumns.reduce((acc, col) => {
        acc[col.key] = {
          columnKey: col.key,
          operator: '<=',
          value: '',
          enabled: true,
        };
        return acc;
      }, {} as Record<string, any>),
    };
    setCategories([...categories, newRule]);
  };

  const handleDeleteCategory = (ruleId: string | number) => {
    const updated = categories.filter((c) => c.id !== ruleId);
    // Re-index priority
    const reindexed = updated.map((c, idx) => ({ ...c, priority: idx + 1 }));
    setCategories(reindexed);
  };

  const handleMoveCategoryPriority = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const cloned = [...categories];
    const temp = cloned[index];
    cloned[index] = cloned[targetIndex];
    cloned[targetIndex] = temp;

    const reindexed = cloned.map((c, idx) => ({ ...c, priority: idx + 1 }));
    setCategories(reindexed);
  };

  const handleUpdateCriterion = (
    ruleId: string | number,
    columnKey: string,
    field: 'value' | 'operator' | 'enabled',
    val: any
  ) => {
    setCategories((prev) =>
      prev.map((rule) => {
        if (rule.id !== ruleId) return rule;
        const currentCrit = rule.criteria[columnKey] || {
          columnKey,
          operator: '<=',
          value: '',
          enabled: true,
        };
        return {
          ...rule,
          criteria: {
            ...rule.criteria,
            [columnKey]: {
              ...currentCrit,
              [field]: val,
            },
          },
        };
      })
    );
  };

  // Parse Pasted Category Metadata
  const handleParsePastedMetadata = () => {
    try {
      setPasteError(null);
      const res = parseCategoryMetadataInput(rawPastedText, metricColumns);
      if (res.categories.length > 0) {
        setCategories(res.categories);
        setIsPasteModalOpen(false);
      }
    } catch (e: any) {
      setPasteError(e.message || 'Failed to parse category data');
    }
  };

  // Add / Edit Metric Column
  const handleAddMetricColumn = () => {
    const nextIdx = metricColumns.length + 1;
    const newKey = `metric_${nextIdx}`;
    const newCol: MetricColumnConfig = {
      id: `col-${newKey}`,
      key: newKey,
      name: newKey,
      label: `Metric ${nextIdx}`,
      type: 'numeric',
      group: 'secondary',
    };
    setMetricColumns([...metricColumns, newCol]);

    // Update categories with default criterion for new column
    setCategories((prev) =>
      prev.map((rule) => ({
        ...rule,
        criteria: {
          ...rule.criteria,
          [newKey]: {
            columnKey: newKey,
            operator: '<=',
            value: '',
            enabled: false,
          },
        },
      }))
    );
  };

  const handleDeleteMetricColumn = (keyToDelete: string) => {
    if (metricColumns.length <= 1) return;
    setMetricColumns(metricColumns.filter((c) => c.key !== keyToDelete));
    setCategories((prev) =>
      prev.map((rule) => {
        const cloned = { ...rule.criteria };
        delete cloned[keyToDelete];
        return { ...rule, criteria: cloned };
      })
    );
  };

  // Sample Data Import / Export
  const handleImportSampleData = () => {
    try {
      setSampleImportError(null);
      const text = sampleImportText.trim();
      if (!text) {
        setSampleImportError('Input is empty.');
        return;
      }

      // Check if JSON
      if (text.startsWith('[') || text.startsWith('{')) {
        const parsed = JSON.parse(text);
        const rowsArray = Array.isArray(parsed) ? parsed : parsed.records || parsed.rows || [parsed];
        const newRows: TestSampleRow[] = rowsArray.map((r: any, idx: number) => ({
          id: String(r.id || r.entity_id || idx + 101),
          name: r.name || r.business_name || r.company_name || `Entity ${idx + 1}`,
          recordedCategory: r.recordedCategory || r.category || r.current_category || '',
          metrics: r.metrics || {
            no_of_employees: r.no_of_employees ?? r.employees ?? '',
            annual_turnover: r.annual_turnover ?? r.turnover ?? '',
            balance_sheet: r.balance_sheet ?? r.balance ?? '',
          },
        }));
        setSampleRows(newRows);
        setIsSampleImportOpen(false);
        return;
      }

      // Tab or Comma separated
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const delimiter = lines[0].includes('\t') ? '\t' : ',';
      const parsedLines = lines.map((l) => l.split(delimiter).map((tok) => tok.replace(/^["']|["']$/g, '').trim()));

      let dataLines = parsedLines;
      // If header
      if (isNaN(Number(parsedLines[0][0])) && isNaN(Number(parsedLines[0][2] || ''))) {
        dataLines = parsedLines.slice(1);
      }

      const imported: TestSampleRow[] = dataLines.map((toks, idx) => {
        const id = toks[0] || String(idx + 101);
        const nameOrCat = toks[1] || `Sample Entity ${idx + 1}`;
        const hasRecCat = toks.length >= metricColumns.length + 3;
        const recCat = hasRecCat ? toks[2] : '';
        const metricTokens = hasRecCat ? toks.slice(3) : toks.slice(2);

        const metricsObj: Record<string, any> = {};
        metricColumns.forEach((col, cIdx) => {
          metricsObj[col.key] = metricTokens[cIdx] !== undefined ? metricTokens[cIdx] : '';
        });

        return {
          id,
          name: nameOrCat,
          recordedCategory: recCat,
          metrics: metricsObj,
        };
      });

      setSampleRows(imported);
      setIsSampleImportOpen(false);
    } catch (e: any) {
      setSampleImportError(e.message || 'Failed to parse test sample data');
    }
  };

  const handleExportSampleResults = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const jsonStr = JSON.stringify(simulationResults, null, 2);
      handleDownloadFile(jsonStr, 'category_validation_results.json', 'application/json');
    } else {
      // CSV
      const headers = ['id', 'name', 'recorded_category', 'expected_category', 'validation_status', 'reason'];
      metricColumns.forEach((c) => headers.push(c.name));
      const csvRows = [headers.join(',')];

      simulationResults.forEach((r) => {
        const rowVals = [
          `"${r.id}"`,
          `"${(r.name || '').replace(/"/g, '""')}"`,
          `"${(r.recordedCategory || '').replace(/"/g, '""')}"`,
          `"${r.expectedCategory.replace(/"/g, '""')}"`,
          `"${r.status}"`,
          `"${r.reason.replace(/"/g, '""')}"`,
        ];
        metricColumns.forEach((c) => {
          rowVals.push(`"${r.metrics[c.key] ?? ''}"`);
        });
        csvRows.push(rowVals.join(','));
      });
      handleDownloadFile(csvRows.join('\n'), 'category_validation_results.csv', 'text/csv');
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-[#0B1120] text-slate-800 dark:text-slate-200">
      {/* Top Action Bar */}
      <div className="px-4 py-3 sm:px-6 sm:py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-2xs shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-mono font-bold text-sm text-indigo-600 dark:text-indigo-400">
            CAT
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Database Category Matcher
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                PostgreSQL & pg8000
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
              Multi-rule compound matching (AND/OR), discrepancy auditing, SQL queries, and Python testing
            </p>
          </div>
        </div>

        {/* Preset Selector & Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Preset Selector */}
          <div className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-800/90 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="font-medium text-slate-600 dark:text-slate-300 hidden md:inline">Preset:</span>
            <select
              value={activePresetId}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden cursor-pointer"
            >
              {CATEGORY_MATCHER_PRESETS.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900">
                  {p.name}
                </option>
              ))}
              <option value="custom" className="bg-white dark:bg-slate-900">
                Custom Configuration
              </option>
            </select>
          </div>

          {/* Config Import / Export Button */}
          <button
            onClick={() => {
              setConfigModalTab('import');
              setIsConfigModalOpen(true);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Import or Export configurations"
          >
            <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Config / Templates</span>
          </button>

          {/* Full Screen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 overflow-x-auto">
        <div className="flex space-x-1 sm:space-x-2">
          <button
            onClick={() => setActiveMainTab('rules')}
            className={`py-3 px-3 sm:px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeMainTab === 'rules'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Category Rules & Schema ({categories.length})
          </button>
          <button
            onClick={() => setActiveMainTab('queries')}
            className={`py-3 px-3 sm:px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeMainTab === 'queries'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Code2 className="w-4 h-4" />
            PostgreSQL Queries
          </button>
          <button
            onClick={() => setActiveMainTab('python')}
            className={`py-3 px-3 sm:px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeMainTab === 'python'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            Python pg8000 Script
          </button>
          <button
            onClick={() => setActiveMainTab('simulator')}
            className={`py-3 px-3 sm:px-4 text-xs font-semibold border-b-2 flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeMainTab === 'simulator'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Play className="w-4 h-4" />
            Live Simulator & Testing ({sampleRows.length})
          </button>
        </div>

        {/* Quick Discrepancy Badge */}
        {simulationStats.mismatches > 0 && (
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40 text-[11px] font-semibold animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>{simulationStats.mismatches} Category Mismatches Detected in Sample Data</span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* ========================================================================= */}
        {/* TAB 1: CATEGORY RULES & SCHEMA BUILDER */}
        {/* ========================================================================= */}
        {activeMainTab === 'rules' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Target Table & Column Mapping Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Target Database Table & Columns
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Specify the PostgreSQL table and columns to validate or classify
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Table Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetTable.tableName}
                    onChange={(e) => setTargetTable({ ...targetTable, tableName: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    placeholder="business_entities"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Primary Key (ID) Column <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={targetTable.idColumn}
                    onChange={(e) => setTargetTable({ ...targetTable, idColumn: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    placeholder="id"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Recorded Category Column (Validation)
                  </label>
                  <input
                    type="text"
                    value={targetTable.categoryColumn || ''}
                    onChange={(e) => setTargetTable({ ...targetTable, categoryColumn: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    placeholder="current_category"
                  />
                  <span className="text-[10px] text-slate-400">Used for discrepancy checking</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Entity / Business Name Column (Optional)
                  </label>
                  <input
                    type="text"
                    value={targetTable.nameColumn || ''}
                    onChange={(e) => setTargetTable({ ...targetTable, nameColumn: e.target.value })}
                    className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                    placeholder="business_name"
                  />
                </div>
              </div>
            </div>

            {/* Rule Logic Grouping & Evaluation Settings */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-indigo-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Rule Combination Logic & Fallback
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Logic Structure
                  </label>
                  <select
                    value={ruleLogic.type}
                    onChange={(e) => setRuleLogic({ ...ruleLogic, type: e.target.value as any })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  >
                    <option value="sme_compound">
                      SME Compound: Primary AND (Secondary OR Secondary)
                    </option>
                    <option value="all_and">All Conditions Must Match (AND across all)</option>
                    <option value="any_or">Any Condition Can Match (OR across all)</option>
                  </select>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {ruleLogic.type === 'sme_compound'
                      ? 'Example: Employees <= 9 AND (Turnover <= 2M OR Balance <= 2M)'
                      : 'Standard evaluation structure'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Fallback Category (Unmatched)
                  </label>
                  <input
                    type="text"
                    value={ruleLogic.fallbackCategory}
                    onChange={(e) => setRuleLogic({ ...ruleLogic, fallbackCategory: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                    placeholder="Large Enterprise"
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Assigned when rows exceed all category thresholds
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Blank Threshold Behavior
                  </label>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
                    <strong>Unbounded / Ignored</strong> (like in Small Midcap with no turnover limit)
                  </div>
                </div>
              </div>
            </div>

            {/* Metric Columns Configuration */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Configured Metric Columns ({metricColumns.length})
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Map rule criteria to target database columns and define their logic grouping
                  </p>
                </div>
                <button
                  onClick={handleAddMetricColumn}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Metric Column
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {metricColumns.map((col, idx) => (
                  <div
                    key={col.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                        Metric #{idx + 1}: {col.label}
                      </span>
                      {metricColumns.length > 1 && (
                        <button
                          onClick={() => handleDeleteMetricColumn(col.key)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Remove column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Column Name</label>
                        <input
                          type="text"
                          value={col.name}
                          onChange={(e) => {
                            const updated = metricColumns.map((c) =>
                              c.id === col.id ? { ...c, name: e.target.value } : c
                            );
                            setMetricColumns(updated);
                          }}
                          className="w-full font-mono text-[11px] p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 mb-0.5">Data Type</label>
                        <select
                          value={col.type}
                          onChange={(e) => {
                            const updated = metricColumns.map((c) =>
                              c.id === col.id ? { ...c, type: e.target.value as MetricType } : c
                            );
                            setMetricColumns(updated);
                          }}
                          className="w-full text-[11px] p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        >
                          <option value="integer">integer</option>
                          <option value="numeric">numeric / decimal</option>
                          <option value="bigint">bigint</option>
                          <option value="text">text</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500 mb-0.5">SME Compound Group</label>
                      <select
                        value={col.group}
                        onChange={(e) => {
                          const updated = metricColumns.map((c) =>
                            c.id === col.id ? { ...c, group: e.target.value as 'primary' | 'secondary' } : c
                          );
                          setMetricColumns(updated);
                        }}
                        className="w-full text-[11px] p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      >
                        <option value="primary">Primary Group (Joined via AND)</option>
                        <option value="secondary">Secondary Group (Joined via OR)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Interactive Category Rules Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-800/30">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    Category Matching Rules
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                      Evaluated Top-to-Bottom
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Edit thresholds, operators, and priority order. Unchecked or blank thresholds are treated as unbounded.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPasteModalOpen(true)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Paste Metadata (TSV / CSV)
                  </button>
                  <button
                    onClick={handleAddCategory}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Add Category
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-16 text-center">Priority</th>
                      <th className="py-3 px-3 w-44">Category Name</th>
                      {metricColumns.map((col) => (
                        <th key={col.id} className="py-3 px-3 min-w-[200px]">
                          <div className="flex items-center gap-1.5">
                            <span>{col.label}</span>
                            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                              {col.group === 'primary' ? 'AND' : 'OR'}
                            </span>
                          </div>
                        </th>
                      ))}
                      <th className="py-3 px-3 w-28 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {categories.map((rule, rIdx) => (
                      <tr key={rule.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        {/* Priority / Order */}
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 font-mono font-bold text-xs flex items-center justify-center text-slate-700 dark:text-slate-300">
                              {rule.priority}
                            </span>
                            <div className="flex flex-col">
                              <button
                                disabled={rIdx === 0}
                                onClick={() => handleMoveCategoryPriority(rIdx, 'up')}
                                className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                disabled={rIdx === categories.length - 1}
                                onClick={() => handleMoveCategoryPriority(rIdx, 'down')}
                                className="text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                              >
                                <ChevronDown className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Category Name */}
                        <td className="py-3 px-3">
                          <input
                            type="text"
                            value={rule.categoryName}
                            onChange={(e) => {
                              const updated = categories.map((c) =>
                                c.id === rule.id ? { ...c, categoryName: e.target.value } : c
                              );
                              setCategories(updated);
                            }}
                            className="w-full font-bold text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Micro SME"
                          />
                        </td>

                        {/* Metric Columns Thresholds */}
                        {metricColumns.map((col) => {
                          const crit = rule.criteria[col.key] || {
                            columnKey: col.key,
                            operator: '<=',
                            value: '',
                            enabled: true,
                          };

                          return (
                            <td key={col.id} className="py-3 px-3">
                              <div className="flex items-center gap-1.5">
                                <select
                                  value={crit.operator}
                                  onChange={(e) =>
                                    handleUpdateCriterion(rule.id, col.key, 'operator', e.target.value as RuleOperator)
                                  }
                                  className="text-[11px] font-mono p-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                                >
                                  <option value="<=">&le; (&lt;=)</option>
                                  <option value="<">&lt; (&lt;)</option>
                                  <option value=">=">&ge; (&gt;=)</option>
                                  <option value=">">&gt; (&gt;)</option>
                                  <option value="=">= (==)</option>
                                  <option value="!=">&ne; (!=)</option>
                                </select>
                                <input
                                  type="text"
                                  value={crit.value}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    handleUpdateCriterion(rule.id, col.key, 'value', val);
                                    handleUpdateCriterion(rule.id, col.key, 'enabled', val.trim() !== '');
                                  }}
                                  placeholder="unconstrained"
                                  className={`w-full text-xs font-mono p-1.5 rounded border ${
                                    crit.value.trim() !== ''
                                      ? 'border-indigo-300 dark:border-indigo-700 bg-indigo-50/20 dark:bg-indigo-950/20 text-slate-900 dark:text-slate-100 font-semibold'
                                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-slate-400'
                                  }`}
                                />
                              </div>
                            </td>
                          );
                        })}

                        {/* Delete Action */}
                        <td className="py-3 px-3 text-right">
                          <button
                            disabled={categories.length <= 1}
                            onClick={() => handleDeleteCategory(rule.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Delete Category"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Table Footer info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                <span>
                  Unmatched records will default to:{' '}
                  <strong className="text-slate-700 dark:text-slate-300">{ruleLogic.fallbackCategory}</strong>
                </span>
                <span className="font-mono">{categories.length} priority tiers configured</span>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: POSTGRESQL QUERIES */}
        {/* ========================================================================= */}
        {activeMainTab === 'queries' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Sub-tab selection */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setActiveQuerySubTab('discrepancy')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeQuerySubTab === 'discrepancy'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  1. Discrepancy & Validation SELECT
                </button>
                <button
                  onClick={() => setActiveQuerySubTab('classification')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeQuerySubTab === 'classification'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  2. Classification SELECT
                </button>
                <button
                  onClick={() => setActiveQuerySubTab('update')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeQuerySubTab === 'update'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  3. Synchronize UPDATE
                </button>
                <button
                  onClick={() => setActiveQuerySubTab('distribution')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeQuerySubTab === 'distribution'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  4. Distribution Breakdown
                </button>
                <button
                  onClick={() => setActiveQuerySubTab('view')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeQuerySubTab === 'view'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  5. PostgreSQL VIEW
                </button>
                <button
                  onClick={() => setActiveQuerySubTab('cte')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    activeQuerySubTab === 'cte'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  6. CTE Rules Join
                </button>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const query =
                      activeQuerySubTab === 'discrepancy'
                        ? generatedQueries.discrepancySelectQuery
                        : activeQuerySubTab === 'classification'
                        ? generatedQueries.classificationSelectQuery
                        : activeQuerySubTab === 'update'
                        ? generatedQueries.updateTargetTableQuery
                        : activeQuerySubTab === 'distribution'
                        ? generatedQueries.categoryDistributionQuery
                        : activeQuerySubTab === 'view'
                        ? generatedQueries.createPostgresViewQuery
                        : generatedQueries.cteRulesJoinQuery;
                    handleCopyText(query, activeQuerySubTab);
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedKey === activeQuerySubTab ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Query</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    const query =
                      activeQuerySubTab === 'discrepancy'
                        ? generatedQueries.discrepancySelectQuery
                        : activeQuerySubTab === 'classification'
                        ? generatedQueries.classificationSelectQuery
                        : activeQuerySubTab === 'update'
                        ? generatedQueries.updateTargetTableQuery
                        : activeQuerySubTab === 'distribution'
                        ? generatedQueries.categoryDistributionQuery
                        : activeQuerySubTab === 'view'
                        ? generatedQueries.createPostgresViewQuery
                        : generatedQueries.cteRulesJoinQuery;
                    handleDownloadFile(query, `${activeQuerySubTab}_category_query.sql`, 'application/sql');
                  }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .sql</span>
                </button>
              </div>
            </div>

            {/* SQL Code View */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs">
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>PostgreSQL 12+ Dialect • Target: "{targetTable.tableName}"</span>
                <span>UTF-8</span>
              </div>
              <pre className="p-4 sm:p-6 overflow-x-auto font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre">
                {activeQuerySubTab === 'discrepancy' && generatedQueries.discrepancySelectQuery}
                {activeQuerySubTab === 'classification' && generatedQueries.classificationSelectQuery}
                {activeQuerySubTab === 'update' && generatedQueries.updateTargetTableQuery}
                {activeQuerySubTab === 'distribution' && generatedQueries.categoryDistributionQuery}
                {activeQuerySubTab === 'view' && generatedQueries.createPostgresViewQuery}
                {activeQuerySubTab === 'cte' && generatedQueries.cteRulesJoinQuery}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: PYTHON PG8000 SCRIPT */}
        {/* ========================================================================= */}
        {activeMainTab === 'python' && (
          <div className="space-y-4 max-w-7xl mx-auto">
            {/* Script Header & Controls */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Terminal className="w-5 h-5 text-indigo-500" />
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      PostgreSQL Category Matcher via pg8000
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                      Python 3.8+ & pg8000
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Production-ready Python test script connecting to PostgreSQL via <code>pg8000.native</code>.
                    Audits discrepancies, outputs colorful validation summaries, exports reports, and offers <code>--fix</code> support.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyText(generatedPythonScript, 'python-script')}
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'python-script' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span className="text-emerald-600 font-medium">Copied Script!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Script</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() =>
                      handleDownloadFile(generatedPythonScript, 'validate_categories_pg8000.py', 'text/x-python')
                    }
                    className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download .py</span>
                  </button>
                </div>
              </div>

              {/* Quick Config Inputs for Connection */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">PG Host</label>
                  <input
                    type="text"
                    value={pgConnection.host}
                    onChange={(e) => setPgConnection({ ...pgConnection, host: e.target.value })}
                    className="w-full font-mono text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">PG Port</label>
                  <input
                    type="number"
                    value={pgConnection.port}
                    onChange={(e) => setPgConnection({ ...pgConnection, port: parseInt(e.target.value, 10) || 5432 })}
                    className="w-full font-mono text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    placeholder="5432"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">Database</label>
                  <input
                    type="text"
                    value={pgConnection.database}
                    onChange={(e) => setPgConnection({ ...pgConnection, database: e.target.value })}
                    className="w-full font-mono text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    placeholder="production_db"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 font-semibold mb-1">Database User</label>
                  <input
                    type="text"
                    value={pgConnection.user}
                    onChange={(e) => setPgConnection({ ...pgConnection, user: e.target.value })}
                    className="w-full font-mono text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800"
                    placeholder="postgres"
                  />
                </div>
              </div>
            </div>

            {/* Python Script Code Viewer */}
            <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-xs">
              <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
                <span>validate_categories_pg8000.py • Python 3</span>
                <span>pip install pg8000</span>
              </div>
              <pre className="p-4 sm:p-6 overflow-x-auto font-mono text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre">
                {generatedPythonScript}
              </pre>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: LIVE SIMULATOR & TESTING */}
        {/* ========================================================================= */}
        {activeMainTab === 'simulator' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Total Entities Tested</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {simulationStats.total}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs">
                <div className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Validated Matches
                </div>
                <div className="text-2xl font-bold text-emerald-800 dark:text-emerald-200 mt-1">
                  {simulationStats.matches}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-950/20 shadow-xs">
                <div className="text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                  Category Mismatches
                </div>
                <div className="text-2xl font-bold text-rose-800 dark:text-rose-200 mt-1">
                  {simulationStats.mismatches}
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
                <div className="text-xs text-amber-700 dark:text-amber-300 font-medium">Unclassified / Blank</div>
                <div className="text-2xl font-bold text-amber-800 dark:text-amber-200 mt-1">
                  {simulationStats.unclassified}
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
                {/* Search */}
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={simulatorSearch}
                    onChange={(e) => setSimulatorSearch(e.target.value)}
                    placeholder="Search by ID, name, or category..."
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                  />
                </div>

                {/* Filter Status */}
                <select
                  value={simulatorStatusFilter}
                  onChange={(e) => setSimulatorStatusFilter(e.target.value as any)}
                  className="text-xs p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <option value="ALL">All Statuses ({simulationResults.length})</option>
                  <option value="MISMATCH">Mismatches Only ({simulationStats.mismatches})</option>
                  <option value="MATCH">Matches Only ({simulationStats.matches})</option>
                  <option value="UNCLASSIFIED">Unclassified ({simulationStats.unclassified})</option>
                </select>
              </div>

              {/* Data Import / Export Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSampleImportOpen(true)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Test Data
                </button>
                <button
                  onClick={() => handleExportSampleResults('csv')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export Results (CSV)
                </button>
                <button
                  onClick={() => handleExportSampleResults('json')}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileJson className="w-3.5 h-3.5" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Results Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3 w-20">ID</th>
                      <th className="py-3 px-3 w-48">Entity Name</th>
                      {metricColumns.map((col) => (
                        <th key={col.id} className="py-3 px-3">
                          {col.label}
                        </th>
                      ))}
                      <th className="py-3 px-3 w-32">Recorded Category</th>
                      <th className="py-3 px-3 w-32">Expected Category</th>
                      <th className="py-3 px-3 w-28 text-center">Status</th>
                      <th className="py-3 px-3 min-w-[200px]">Validation Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {filteredSimulationResults.length === 0 ? (
                      <tr>
                        <td colSpan={6 + metricColumns.length} className="text-center py-8 text-slate-400">
                          No matching records found.
                        </td>
                      </tr>
                    ) : (
                      filteredSimulationResults.map((r) => (
                        <tr
                          key={r.id}
                          className={`hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors ${
                            r.status === 'MISMATCH' ? 'bg-rose-50/20 dark:bg-rose-950/10' : ''
                          }`}
                        >
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {r.id}
                          </td>
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-slate-100">
                            {r.name || '—'}
                          </td>
                          {metricColumns.map((col) => {
                            const val = r.metrics[col.key];
                            const formatted =
                              typeof val === 'number'
                                ? val.toLocaleString()
                                : val !== undefined && val !== null
                                ? String(val)
                                : '—';
                            return (
                              <td key={col.id} className="py-3 px-3 font-mono text-slate-700 dark:text-slate-300">
                                {formatted}
                              </td>
                            );
                          })}
                          <td className="py-3 px-3">
                            <span className="font-mono text-slate-600 dark:text-slate-400">
                              {r.recordedCategory || <em className="text-amber-500">&lt;Unassigned&gt;</em>}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {r.expectedCategory}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {r.status === 'MATCH' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                                MATCH
                              </span>
                            )}
                            {r.status === 'MISMATCH' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                                MISMATCH
                              </span>
                            )}
                            {r.status === 'UNCLASSIFIED' && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                                UNCLASSIFIED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
                            {r.reason}
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL: PASTE RAW CATEGORY METADATA */}
      {/* ========================================================================= */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Paste Category Metadata
                </h3>
                <p className="text-xs text-slate-500">
                  Paste rows with ID, Category Name, and metric threshold values (Tab, CSV, or space-separated)
                </p>
              </div>
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Category Rules Text
              </label>
              <textarea
                value={rawPastedText}
                onChange={(e) => setRawPastedText(e.target.value)}
                rows={7}
                placeholder={`1\t"Micro SME"\t9\t2000000\t2000000\n2\t"SME"\t249\t50000000\t43000000\n3\t"Small Midcap"\t499`}
                className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Column order matches your metric columns: ID, Category, {metricColumns.map((c) => c.label).join(', ')}.
              </p>
            </div>

            {pasteError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs">
                {pasteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleParsePastedMetadata}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Apply Metadata Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMPORT TEST SAMPLE DATA */}
      {/* ========================================================================= */}
      {isSampleImportOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Import Test Sample Data
                </h3>
                <p className="text-xs text-slate-500">
                  Paste records to test validation against the configured rules (JSON array or CSV/TSV)
                </p>
              </div>
              <button
                onClick={() => setIsSampleImportOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Records (JSON or CSV)
              </label>
              <textarea
                value={sampleImportText}
                onChange={(e) => setSampleImportText(e.target.value)}
                rows={8}
                placeholder={`id,name,current_category,no_of_employees,annual_turnover,balance_sheet
101,"Artisan Bakery","Micro SME",6,1200000,950000
102,"Cloud Solutions","SME",8,1800000,1600000`}
                className="w-full font-mono text-xs p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {sampleImportError && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-200 text-xs">
                {sampleImportError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsSampleImportOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportSampleData}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Load Test Records
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIGURATION IMPORT / EXPORT / SAVED */}
      {/* ========================================================================= */}
      <CategoryMatcherConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        currentConfig={currentFullConfig}
        onApplyConfig={handleApplyImportedConfig}
        initialTab={configModalTab}
      />
    </div>
  );
};
