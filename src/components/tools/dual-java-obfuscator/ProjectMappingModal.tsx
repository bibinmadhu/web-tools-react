import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Download,
  Copy,
  Check,
  FileJson,
  FolderArchive,
  Layers,
  Sparkles,
  AlertTriangle,
  FileText,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  Database,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react';
import { JavaObfuscationMapping } from '../../../utils/javaObfuscator';
import {
  ProjectMappingProfile,
  MappingParseResult,
  MergeResult,
  parseAndNormalizeMapping,
  mergeProjectMappings,
  exportMappingContent,
  computeMappingStats,
  createEmptyMapping,
  rebuildReverseMapping,
} from '../../../utils/projectMappingManager';

interface ProjectMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject: ProjectMappingProfile;
  allProjects: ProjectMappingProfile[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (newName: string) => void;
  onUpdateProjectMapping: (mapping: JavaObfuscationMapping, description?: string) => void;
  onResetProjectMapping: () => void;
  currentSessionMapping: JavaObfuscationMapping;
  onShowStatus: (message: string) => void;
  initialMode?: 'import' | 'export' | 'manage';
}

export const ProjectMappingModal: React.FC<ProjectMappingModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  allProjects,
  onSelectProject,
  onCreateProject,
  onRenameProject,
  onUpdateProjectMapping,
  onResetProjectMapping,
  currentSessionMapping,
  onShowStatus,
  initialMode = 'import',
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'import' | 'export' | 'manage'>(initialMode);

  // Import State
  const [rawImportText, setRawImportText] = useState<string>('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [parsedImport, setParsedImport] = useState<MappingParseResult | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'preserve' | 'overwrite'>('preserve');
  const [importTargetMode, setImportTargetMode] = useState<'merge' | 'replace'>('merge');
  const [showConflictsList, setShowConflictsList] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export State
  const [exportFormat, setExportFormat] = useState<'project-bundle' | 'standard-json' | 'flat-json' | 'proguard'>('project-bundle');
  const [exportScope, setExportScope] = useState<'project' | 'session'>('project');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Manage State
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [createProjectName, setCreateProjectName] = useState<string>('');

  // Add Custom Symbol Form
  const [isAddingSymbol, setIsAddingSymbol] = useState<boolean>(false);
  const [customCategory, setCustomCategory] = useState<'classes' | 'methods' | 'variables' | 'packages'>('classes');
  const [customOriginal, setCustomOriginal] = useState<string>('');
  const [customObfuscated, setCustomObfuscated] = useState<string>('');

  if (!isOpen) return null;

  // Active mapping being inspected/exported
  const effectiveMapping = exportScope === 'project' ? activeProject.mapping : currentSessionMapping;
  const effectiveStats = computeMappingStats(effectiveMapping);
  const projectStats = computeMappingStats(activeProject.mapping);

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setRawImportText(text);
      const res = parseAndNormalizeMapping(text);
      setParsedImport(res);
    };
    reader.readAsText(file);
  };

  const handleTextChange = (text: string) => {
    setRawImportText(text);
    if (!text.trim()) {
      setParsedImport(null);
      return;
    }
    const res = parseAndNormalizeMapping(text);
    setParsedImport(res);
  };

  // Execute Import
  const handleExecuteImport = () => {
    if (!parsedImport || !parsedImport.success) return;

    if (importTargetMode === 'replace') {
      onUpdateProjectMapping(
        parsedImport.mapping,
        `Replaced with imported mapping from ${importFileName || 'pasted input'}`
      );
      onShowStatus(
        `Loaded ${parsedImport.stats.totalCount} symbols into project "${activeProject.name}"!`
      );
    } else {
      // Merge
      const mergeRes: MergeResult = mergeProjectMappings(
        activeProject.mapping,
        parsedImport.mapping,
        mergeStrategy
      );
      onUpdateProjectMapping(
        mergeRes.merged,
        `Merged ${mergeRes.addedCount} new symbols from ${importFileName || 'imported file'}`
      );
      onShowStatus(
        `Merged ${mergeRes.addedCount} new symbols into "${activeProject.name}" (${mergeRes.conflicts.length} overlaps resolved)`
      );
    }

    // Reset import view
    setRawImportText('');
    setParsedImport(null);
    setImportFileName(null);
    onClose();
  };

  // Export content generator
  const generatedExportContent = exportMappingContent(effectiveMapping, exportFormat, {
    projectName: activeProject.name,
    description: `Synchronized Java obfuscator mapping for ${activeProject.name}`,
  });

  const handleDownloadExport = () => {
    let filename = `${activeProject.name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_mapping`;
    if (exportScope === 'session') {
      filename += '_current_session';
    }
    let ext = 'json';
    let mime = 'application/json';

    if (exportFormat === 'proguard') {
      ext = 'txt';
      mime = 'text/plain';
    }

    const blob = new Blob([generatedExportContent], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onShowStatus(`Downloaded ${filename}.${ext}`);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(generatedExportContent);
    setCopiedKey('export-content');
    onShowStatus('Mapping copied to clipboard!');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Add Custom Symbol
  const handleAddCustomSymbol = () => {
    if (!customOriginal.trim() || !customObfuscated.trim()) return;
    const updated = { ...activeProject.mapping };
    updated[customCategory] = {
      ...updated[customCategory],
      [customOriginal.trim()]: customObfuscated.trim(),
    };
    rebuildReverseMapping(updated);
    onUpdateProjectMapping(updated, `Manually added ${customCategory} symbol ${customOriginal}`);
    setCustomOriginal('');
    setCustomObfuscated('');
    setIsAddingSymbol(false);
    onShowStatus(`Added symbol ${customOriginal} → ${customObfuscated}`);
  };

  // Computed conflict preview if merging
  const previewConflicts = parsedImport?.success
    ? mergeProjectMappings(activeProject.mapping, parsedImport.mapping, mergeStrategy)
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Project Mapping Manager
                </h3>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                  {projectStats.totalCount} symbols active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Reuse mapping data from past runs, import mappings, and build a project-wide obfuscation dictionary over time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={() => setActiveModalTab('import')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeModalTab === 'import'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Import & Accumulate</span>
          </button>
          <button
            onClick={() => setActiveModalTab('export')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeModalTab === 'export'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Export Formats</span>
          </button>
          <button
            onClick={() => setActiveModalTab('manage')}
            className={`pb-3 px-1 border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeModalTab === 'manage'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Projects & Profiles</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 dark:text-slate-200">
          {/* TAB 1: IMPORT & ACCUMULATE */}
          {activeModalTab === 'import' && (
            <div className="space-y-5">
              {/* Target Project Selector Header */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Active Project Target:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{activeProject.name}</span>
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                      ({projectStats.classesCount} classes, {projectStats.methodsCount} methods, {projectStats.variablesCount} vars)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={activeProject.id}
                    onChange={(e) => onSelectProject(e.target.value)}
                    className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {allProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({computeMappingStats(p.mapping).totalCount} symbols)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Upload Dropzone & Text Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Provide Mapping Data (.json, .map, ProGuard text, or paste):
                  </span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 rounded bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Mapping File</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.txt,.map"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <textarea
                  value={rawImportText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={`Paste mapping JSON or ProGuard file content here...
Examples:
- Standard mapping.json: { "classes": { "UserService": "Cls_1" }, "methods": { "login": "mth_1" } }
- Flat dictionary: { "OrderService": "Cls_2", "checkout": "mth_2" }
- ProGuard map: com.acme.Service -> com.acme.Cls_1:`}
                  rows={6}
                  className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Parsed Inspection Preview */}
              {parsedImport && (
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    parsedImport.success
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  {parsedImport.success ? (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                              Valid Mapping Detected ({parsedImport.format})
                            </span>
                            {parsedImport.projectName && (
                              <span className="text-xs text-slate-600 dark:text-slate-400 block">
                                Project Source: {parsedImport.projectName}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono">
                          <span className="px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300">
                            {parsedImport.stats.classesCount} Classes
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                            {parsedImport.stats.methodsCount} Methods
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300">
                            {parsedImport.stats.variablesCount} Vars
                          </span>
                          <span className="px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/40 text-cyan-800 dark:text-cyan-300">
                            {parsedImport.stats.packagesCount} Pkgs
                          </span>
                        </div>
                      </div>

                      {/* Merge Mode & Overlap Options */}
                      <div className="pt-3 border-t border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                              <input
                                type="radio"
                                name="importTargetMode"
                                checked={importTargetMode === 'merge'}
                                onChange={() => setImportTargetMode('merge')}
                                className="text-indigo-600 focus:ring-0"
                              />
                              <span>Merge & Accumulate (Incremental)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-800 dark:text-slate-200">
                              <input
                                type="radio"
                                name="importTargetMode"
                                checked={importTargetMode === 'replace'}
                                onChange={() => setImportTargetMode('replace')}
                                className="text-indigo-600 focus:ring-0"
                              />
                              <span>Replace Project Mapping</span>
                            </label>
                          </div>

                          {importTargetMode === 'merge' && previewConflicts && (
                            <div className="flex items-center gap-2">
                              <span className="text-slate-600 dark:text-slate-400">If symbol already exists:</span>
                              <select
                                value={mergeStrategy}
                                onChange={(e) => setMergeStrategy(e.target.value as any)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-slate-800 dark:text-slate-200 focus:outline-none"
                              >
                                <option value="preserve">Keep Project Version (Recommended)</option>
                                <option value="overwrite">Overwrite with Imported</option>
                              </select>
                            </div>
                          )}
                        </div>

                        {importTargetMode === 'merge' && previewConflicts && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                            <div>
                              <span>
                                Merge result preview: <strong>+{previewConflicts.addedCount} new symbols</strong> will be added to project.{' '}
                                {previewConflicts.conflicts.length > 0 && (
                                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                                    ({previewConflicts.conflicts.length} overlapping identifiers detected)
                                  </span>
                                )}
                              </span>
                            </div>
                            {previewConflicts.conflicts.length > 0 && (
                              <button
                                onClick={() => setShowConflictsList(!showConflictsList)}
                                className="text-indigo-600 dark:text-indigo-400 underline cursor-pointer"
                              >
                                {showConflictsList ? 'Hide details' : 'View overlaps'}
                              </button>
                            )}
                          </div>
                        )}

                        {showConflictsList && previewConflicts && previewConflicts.conflicts.length > 0 && (
                          <div className="max-h-36 overflow-y-auto border border-amber-200 dark:border-amber-800/60 rounded-lg p-2 bg-amber-50/50 dark:bg-amber-950/20 text-[11px] font-mono space-y-1">
                            {previewConflicts.conflicts.map((c, idx) => (
                              <div key={idx} className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800 dark:text-slate-200">{c.identifier}</span>
                                <span className="text-slate-500">
                                  Current: <code className="text-indigo-600 dark:text-indigo-400">{c.currentObfuscated}</code> | Imported: <code className="text-emerald-600 dark:text-emerald-400">{c.importedObfuscated}</code>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Confirm Button */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          onClick={() => {
                            setRawImportText('');
                            setParsedImport(null);
                          }}
                          className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleExecuteImport}
                          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>
                            {importTargetMode === 'merge' ? 'Merge into Active Project' : 'Replace Active Project Mapping'}
                          </span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-400">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{parsedImport.error}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXPORT FORMATS */}
          {activeModalTab === 'export' && (
            <div className="space-y-5">
              {/* Export Scope & Format Selectors */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Export Scope:</span>
                    <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => setExportScope('project')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          exportScope === 'project'
                            ? 'bg-indigo-600 text-white font-medium shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Cumulative Project ({projectStats.totalCount} symbols)
                      </button>
                      <button
                        onClick={() => setExportScope('session')}
                        className={`px-3 py-1 rounded-md transition-colors ${
                          exportScope === 'session'
                            ? 'bg-indigo-600 text-white font-medium shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                        }`}
                      >
                        Current Session Only ({computeMappingStats(currentSessionMapping).totalCount} symbols)
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyExport}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'export-content' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                      <span>{copiedKey === 'export-content' ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={handleDownloadExport}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download File</span>
                    </button>
                  </div>
                </div>

                {/* Format Radio Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2">
                  {[
                    {
                      id: 'project-bundle',
                      title: 'Project Bundle (JSON)',
                      desc: 'Full project metadata, timestamps, stats & mappings',
                      badge: 'Recommended',
                    },
                    {
                      id: 'standard-json',
                      title: 'Standard mapping.json',
                      desc: 'Clean dictionary with classes, methods, vars & packages',
                      badge: 'Standard',
                    },
                    {
                      id: 'proguard',
                      title: 'ProGuard Format (.txt)',
                      desc: 'Class & member mappings compatible with ProGuard/R8',
                      badge: 'Text / Map',
                    },
                    {
                      id: 'flat-json',
                      title: 'Flat Key-Value JSON',
                      desc: 'Simple "Original": "Obfuscated" dictionary',
                      badge: 'Compact',
                    },
                  ].map((fmt) => (
                    <div
                      key={fmt.id}
                      onClick={() => setExportFormat(fmt.id as any)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        exportFormat === fmt.id
                          ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400 dark:ring-indigo-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{fmt.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          {fmt.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{fmt.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Code Preview Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Export Preview:</span>
                  <span>{generatedExportContent.split('\n').length} lines • {generatedExportContent.length} chars</span>
                </div>
                <textarea
                  readOnly
                  value={generatedExportContent}
                  rows={10}
                  className="w-full font-mono text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl p-3 focus:outline-none resize-y leading-relaxed"
                />
              </div>
            </div>
          )}

          {/* TAB 3: MANAGE PROJECTS & PROFILES */}
          {activeModalTab === 'manage' && (
            <div className="space-y-5">
              {/* Active Project Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Active Profile:</span>
                    {isEditingName ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="text"
                          value={newProjectName}
                          onChange={(e) => setNewProjectName(e.target.value)}
                          className="px-2.5 py-1 text-sm bg-white dark:bg-slate-900 border border-indigo-400 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            if (newProjectName.trim()) {
                              onRenameProject(newProjectName.trim());
                            }
                            setIsEditingName(false);
                          }}
                          className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setIsEditingName(false)}
                          className="px-2.5 py-1 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-0.5">
                        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{activeProject.name}</h4>
                        <button
                          onClick={() => {
                            setNewProjectName(activeProject.name);
                            setIsEditingName(true);
                          }}
                          className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                          title="Rename Project"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Created: {new Date(activeProject.createdAt).toLocaleDateString()} • Last Updated: {new Date(activeProject.updatedAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddingSymbol(!isAddingSymbol)}
                      className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Add Custom Symbol</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Are you sure you want to reset all mappings for "${activeProject.name}"?`)) {
                          onResetProjectMapping();
                        }
                      }}
                      className="px-3 py-1.5 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Reset Project</span>
                    </button>
                  </div>
                </div>

                {/* Symbol Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Classes Renamed</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{projectStats.classesCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Methods Renamed</span>
                    <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{projectStats.methodsCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Variables Renamed</span>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{projectStats.variablesCount}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Packages Renamed</span>
                    <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">{projectStats.packagesCount}</span>
                  </div>
                </div>
              </div>

              {/* Add Custom Symbol Collapsible Form */}
              {isAddingSymbol && (
                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800/60 rounded-xl space-y-3 animate-in fade-in">
                  <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 block">
                    Add Explicit Symbol Mapping:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Category:</label>
                      <select
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value as any)}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                      >
                        <option value="classes">Class / Interface</option>
                        <option value="methods">Method</option>
                        <option value="variables">Variable / Field</option>
                        <option value="packages">Package</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Original Identifier:</label>
                      <input
                        type="text"
                        value={customOriginal}
                        onChange={(e) => setCustomOriginal(e.target.value)}
                        placeholder="e.g. UserService"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                      >
                      </input>
                    </div>
                    <div>
                      <label className="block text-slate-600 dark:text-slate-400 mb-1">Obfuscated Token:</label>
                      <input
                        type="text"
                        value={customObfuscated}
                        onChange={(e) => setCustomObfuscated(e.target.value)}
                        placeholder="e.g. Cls_1"
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-800 dark:text-slate-200"
                      >
                      </input>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => setIsAddingSymbol(false)}
                      className="px-2.5 py-1 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddCustomSymbol}
                      disabled={!customOriginal.trim() || !customObfuscated.trim()}
                      className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium cursor-pointer"
                    >
                      Save Symbol
                    </button>
                  </div>
                </div>
              )}

              {/* Saved Project Profiles List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">All Saved Projects:</span>
                  <button
                    onClick={() => setIsCreatingNew(!isCreatingNew)}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create New Project</span>
                  </button>
                </div>

                {isCreatingNew && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-2">
                    <input
                      type="text"
                      value={createProjectName}
                      onChange={(e) => setCreateProjectName(e.target.value)}
                      placeholder="Project name (e.g. Payment Gateway)"
                      className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                    />
                    <button
                      onClick={() => {
                        if (createProjectName.trim()) {
                          onCreateProject(createProjectName.trim());
                          setCreateProjectName('');
                          setIsCreatingNew(false);
                        }
                      }}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg cursor-pointer"
                    >
                      Create
                    </button>
                    <button
                      onClick={() => setIsCreatingNew(false)}
                      className="px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800 rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {allProjects.map((p) => {
                    const stats = computeMappingStats(p.mapping);
                    const isActive = p.id === activeProject.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => onSelectProject(p.id)}
                        className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isActive
                            ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-400 dark:border-indigo-600 ring-1 ring-indigo-400'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-900 dark:text-slate-100">{p.name}</span>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-600 text-white font-semibold">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {stats.totalCount} symbols mapped ({stats.classesCount} cls, {stats.methodsCount} mth, {stats.variablesCount} var)
                        </div>
                        <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Updated: {new Date(p.updatedAt).toLocaleDateString()}</span>
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {isActive ? 'Current selection' : 'Switch to this project →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>Cumulative mappings are auto-saved in your browser for this project.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
