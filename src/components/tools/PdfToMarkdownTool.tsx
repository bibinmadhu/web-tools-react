import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Upload,
  Download,
  Copy,
  Check,
  Sparkles,
  Settings,
  Eye,
  Code2,
  Columns,
  Search,
  BookOpen,
  Layers,
  FileDown,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Info,
  Hash,
  List,
  Table as TableIcon,
  Clock,
  Type,
  FileCode,
} from 'lucide-react';
import {
  convertPdfToMarkdown,
  createSampleMarkdownPdf,
  calculateMarkdownStats,
  renderMarkdownToHtml,
  PdfToMarkdownOptions,
  PdfExtractionResult,
} from '../../utils/pdfToMarkdown';

export const PdfToMarkdownTool: React.FC = () => {
  // File & State
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [fileName, setFileName] = useState<string>('sample-document.pdf');
  const [fileSizeStr, setFileSizeStr] = useState<string>('24.8 KB');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Conversion Options
  const [options, setOptions] = useState<PdfToMarkdownOptions>({
    includeFrontmatter: true,
    detectHeadings: true,
    detectLists: true,
    detectTables: true,
    detectCodeBlocks: true,
    detectBlockquotes: true,
    preservePageDividers: true,
    cleanHyphenation: true,
    cleanRunningHeadersFooters: true,
    bulletStyle: '-',
  });

  const [isOptionsOpen, setIsOptionsOpen] = useState<boolean>(false);

  // Extracted Data & Markdown
  const [extractionResult, setExtractionResult] = useState<PdfExtractionResult | null>(null);
  const [markdownContent, setMarkdownContent] = useState<string>('');

  // UI View States
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview' | 'pages'>('split');
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedHtml, setCopiedHtml] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sample on initial mount
  useEffect(() => {
    handleLoadSample();
  }, []);

  const handleLoadSample = async () => {
    setIsParsing(true);
    setErrorMessage(null);
    setStatusMessage('Generating & parsing sample technical specification PDF...');
    try {
      const sample = await createSampleMarkdownPdf();
      setPdfBytes(sample);
      setFileName('DevHub_Engineering_Guide.pdf');
      setFileSizeStr(`${(sample.byteLength / 1024).toFixed(1)} KB`);

      const res = await convertPdfToMarkdown(sample, options);
      setExtractionResult(res);
      setMarkdownContent(res.markdown);
      setStatusMessage(`Loaded sample PDF (${res.pageCount} pages, ${res.pages.reduce((acc, p) => acc + p.lines.length, 0)} lines).`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      setErrorMessage(`Failed to parse sample PDF: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const processPdfFile = async (file: File) => {
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setIsParsing(true);
    setErrorMessage(null);
    setStatusMessage(`Parsing "${file.name}"...`);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);
      setFileName(file.name);
      setFileSizeStr(`${(file.size / 1024).toFixed(1)} KB`);

      const res = await convertPdfToMarkdown(bytes, options);
      setExtractionResult(res);
      setMarkdownContent(res.markdown);
      setStatusMessage(`Successfully converted "${file.name}" to Markdown (${res.pageCount} pages)!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(`Error parsing PDF: ${err?.message || 'Invalid or corrupted PDF document'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processPdfFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processPdfFile(file);
    }
  };

  // Re-run conversion when options change and we have the pdf bytes
  const handleReConvert = async (customOpts?: PdfToMarkdownOptions) => {
    if (!pdfBytes) return;
    setIsParsing(true);
    setErrorMessage(null);
    try {
      const opts = customOpts || options;
      const res = await convertPdfToMarkdown(pdfBytes, opts);
      setExtractionResult(res);
      setMarkdownContent(res.markdown);
      setStatusMessage('Markdown regenerated with updated formatting options.');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      setErrorMessage(`Re-conversion failed: ${err?.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // Copy Markdown
  const handleCopyMarkdown = async () => {
    if (!markdownContent) return;
    try {
      await navigator.clipboard.writeText(markdownContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = markdownContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Download Markdown file (.md)
  const handleDownloadMarkdown = () => {
    if (!markdownContent) return;
    try {
      const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'converted_document';
      a.href = url;
      a.download = `${baseName}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(`Download failed: ${err?.message}`);
    }
  };

  // Download as HTML
  const handleDownloadHtml = () => {
    if (!markdownContent) return;
    try {
      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${extractionResult?.title || fileName}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 860px; margin: 40px auto; padding: 0 20px; color: #1e293b; }
    h1, h2, h3 { color: #0f172a; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
    pre { background: #0f172a; color: #38bdf8; padding: 16px; border-radius: 8px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; }
    th { background: #f8fafc; }
    blockquote { border-left: 4px solid #6366f1; margin: 16px 0; padding: 8px 16px; background: #eef2ff; }
  </style>
</head>
<body>
${renderMarkdownToHtml(markdownContent)}
</body>
</html>`;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = fileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '_') || 'converted_document';
      a.href = url;
      a.download = `${baseName}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(`Download failed: ${err?.message}`);
    }
  };

  // Calculate live statistics
  const stats = useMemo(() => calculateMarkdownStats(markdownContent), [markdownContent]);

  // Rendered HTML preview
  const renderedPreviewHtml = useMemo(() => {
    return renderMarkdownToHtml(markdownContent);
  }, [markdownContent]);

  return (
    <div className="space-y-4">
      {/* Top Banner & Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Left: Document Info & Upload */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={fileName}>
                {fileName}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400">
                {fileSizeStr}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
              <span>{extractionResult ? `${extractionResult.pageCount} Pages` : 'Ready to parse'}</span>
              <span>•</span>
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">GFM Markdown Converter</span>
            </p>
          </div>
        </div>

        {/* Right: Actions (Upload, Sample, Copy, Download) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,application/pdf"
            className="hidden"
          />

          {/* Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Upload any PDF from your computer"
          >
            <Upload className="w-3.5 h-3.5 text-indigo-500" />
            <span>Upload PDF</span>
          </button>

          {/* Load Sample Button */}
          <button
            type="button"
            onClick={handleLoadSample}
            disabled={isParsing}
            className="px-3 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            title="Load sample technical PDF"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Sample PDF</span>
          </button>

          {/* Options Dropdown Toggle */}
          <button
            type="button"
            onClick={() => setIsOptionsOpen(!isOptionsOpen)}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isOptionsOpen
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700 dark:bg-indigo-500/20 dark:border-indigo-500/40 dark:text-indigo-300'
                : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200'
            }`}
            title="Formatting & extraction options"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Options</span>
          </button>

          {/* COPY MARKDOWN (PROMINENT) */}
          <button
            type="button"
            onClick={handleCopyMarkdown}
            disabled={!markdownContent || isParsing}
            className="px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Copy Markdown output to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
          </button>

          {/* DOWNLOAD .MD (PROMINENT) */}
          <button
            type="button"
            onClick={handleDownloadMarkdown}
            disabled={!markdownContent || isParsing}
            className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Download result as .md file"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Download .md</span>
          </button>
        </div>
      </div>

      {/* Drag & Drop Overlay Zone when active */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`p-3 rounded-xl border-2 border-dashed transition-all text-center ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
            : 'border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30'
        }`}
      >
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
          <Upload className="w-3.5 h-3.5 text-indigo-500" />
          <span>Drag & drop any PDF document here to extract Markdown instantly</span>
        </p>
      </div>

      {/* Conversion Options Collapsible Drawer */}
      {isOptionsOpen && (
        <div className="p-4 rounded-xl bg-slate-100 dark:bg-[#131B2E] border border-slate-200 dark:border-slate-800 space-y-3.5 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-indigo-500" />
              <span>Markdown Conversion & Formatting Rules</span>
            </h4>
            <button
              type="button"
              onClick={() => handleReConvert()}
              disabled={isParsing}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isParsing ? 'animate-spin' : ''}`} />
              <span>Apply & Re-parse</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {/* Include Frontmatter */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.includeFrontmatter}
                onChange={(e) => {
                  const updated = { ...options, includeFrontmatter: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">YAML Frontmatter</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Include title, author, date & page stats
                </span>
              </div>
            </label>

            {/* Detect Headings */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.detectHeadings}
                onChange={(e) => {
                  const updated = { ...options, detectHeadings: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Smart Heading Hierarchy</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Classify H1 (#), H2 (##), H3 (###) by casing & numbers
                </span>
              </div>
            </label>

            {/* Detect Tables */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.detectTables}
                onChange={(e) => {
                  const updated = { ...options, detectTables: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">GFM Tables</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Transform tabular column data to Markdown tables
                </span>
              </div>
            </label>

            {/* Detect Lists */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.detectLists}
                onChange={(e) => {
                  const updated = { ...options, detectLists: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Lists & Bullets</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Convert bullets (•) and numbered items (1.)
                </span>
              </div>
            </label>

            {/* Code Blocks */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.detectCodeBlocks}
                onChange={(e) => {
                  const updated = { ...options, detectCodeBlocks: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Code Block Detection</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Wrap code statements in ``` code fences
                </span>
              </div>
            </label>

            {/* Blockquotes & Notes */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.detectBlockquotes}
                onChange={(e) => {
                  const updated = { ...options, detectBlockquotes: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Blockquotes & Notes</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Convert Note:, Warning:, & quotes to &gt; callouts
                </span>
              </div>
            </label>

            {/* Preserve Page Breaks */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.preservePageDividers}
                onChange={(e) => {
                  const updated = { ...options, preservePageDividers: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Page Dividers</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Insert --- &lt;!-- Page N --&gt; markers
                </span>
              </div>
            </label>

            {/* Strip Running Headers/Footers */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.cleanRunningHeadersFooters}
                onChange={(e) => {
                  const updated = { ...options, cleanRunningHeadersFooters: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Filter Page Numbers</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Strip repeating "Page X of Y" footers
                </span>
              </div>
            </label>

            {/* Clean Hyphenation */}
            <label className="flex items-start gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors">
              <input
                type="checkbox"
                checked={options.cleanHyphenation}
                onChange={(e) => {
                  const updated = { ...options, cleanHyphenation: e.target.checked };
                  setOptions(updated);
                  handleReConvert(updated);
                }}
                className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block">Repair Hyphenation</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Join words split across line breaks (e.g. tech- nical)
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Status or Error Notifications */}
      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{statusMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-rose-500" />
            <span>{errorMessage}</span>
          </span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[10px] font-bold text-rose-700 dark:text-rose-400 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Type className="w-4 h-4 text-indigo-500" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Words</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {stats.words.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Hash className="w-4 h-4 text-emerald-500" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Characters</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {stats.characters.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <FileCode className="w-4 h-4 text-amber-500" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Lines</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{stats.lines}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <List className="w-4 h-4 text-blue-500" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Headings</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">{stats.headings}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-violet-500" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Lists / Tables</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {stats.lists} / {stats.tables}
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-teal-500" />
          <div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-mono">Est. Read</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
              {stats.readingTimeMinutes} min
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher Tabs & Secondary Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-900 p-1 rounded-xl border border-slate-300/60 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('split')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span>Markdown Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('pages')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              viewMode === 'pages'
                ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Pages ({extractionResult?.pageCount || 0})</span>
          </button>
        </div>

        {/* Export Extras (HTML download) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
            title="Download rendered HTML document"
          >
            <Download className="w-3 h-3 text-indigo-400" />
            <span>HTML Export</span>
          </button>
        </div>
      </div>

      {/* MAIN CONTENT WORKSPACE */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[560px]">
          {/* Left Column: Editable Raw Markdown */}
          <div className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900 text-slate-100 shadow-xs">
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-950 border-b border-slate-800">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>MARKDOWN SOURCE (EDITABLE)</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                {stats.lines} lines • {stats.words} words
              </span>
            </div>
            <textarea
              value={markdownContent}
              onChange={(e) => setMarkdownContent(e.target.value)}
              placeholder="Extracted Markdown content will appear here..."
              className="flex-1 w-full p-4 font-mono text-xs text-emerald-300 bg-slate-900 resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500 overflow-y-auto leading-relaxed"
              spellCheck={false}
            />
          </div>

          {/* Right Column: Live Rendered Preview */}
          <div className="flex flex-col h-full rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 shadow-xs">
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>LIVE GFM RENDERED PREVIEW</span>
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                GitHub Flavored Markdown
              </span>
            </div>
            <div
              dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
              className="flex-1 p-5 overflow-y-auto leading-relaxed text-sm selection:bg-indigo-500 selection:text-white"
            />
          </div>
        </div>
      )}

      {viewMode === 'editor' && (
        <div className="flex flex-col h-[580px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-900 text-slate-100 shadow-xs">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Full-Width Markdown Editor</span>
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 font-mono">
                {stats.lines} lines • {stats.characters} chars
              </span>
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
          <textarea
            value={markdownContent}
            onChange={(e) => setMarkdownContent(e.target.value)}
            placeholder="Markdown content..."
            className="flex-1 w-full p-5 font-mono text-xs sm:text-sm text-emerald-300 bg-slate-900 resize-none focus:outline-hidden focus:ring-1 focus:ring-indigo-500 overflow-y-auto leading-relaxed"
            spellCheck={false}
          />
        </div>
      )}

      {viewMode === 'preview' && (
        <div className="flex flex-col h-[580px] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 shadow-xs">
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Publication-Ready Markdown Preview</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Download className="w-3 h-3" />
                <span>Save .md</span>
              </button>
            </div>
          </div>
          <div
            dangerouslySetInnerHTML={{ __html: renderedPreviewHtml }}
            className="flex-1 p-6 md:p-8 overflow-y-auto leading-relaxed text-sm max-w-4xl mx-auto w-full selection:bg-indigo-500 selection:text-white"
          />
        </div>
      )}

      {viewMode === 'pages' && (
        <div className="space-y-4 max-h-[580px] overflow-y-auto pr-1">
          {extractionResult && extractionResult.pages.length > 0 ? (
            extractionResult.pages.map((p) => (
              <div
                key={p.pageNumber}
                className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-2xs"
              >
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 font-mono text-xs font-bold">
                      Page {p.pageNumber}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                      {p.lines.length} extracted text lines
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950 font-mono text-xs text-slate-300 space-y-1 overflow-x-auto max-h-48 overflow-y-auto">
                  {p.lines.map((l, i) => (
                    <div key={i} className="flex gap-2">
                      <span className="text-slate-600 select-none w-6 shrink-0 text-right">{i + 1}</span>
                      <span className="text-slate-200">{l}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-slate-500">No page data extracted yet.</div>
          )}
        </div>
      )}
    </div>
  );
};
