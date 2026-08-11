import React, { useState, useEffect } from 'react';
import {
  FileText,
  Upload,
  Download,
  FileType,
  Settings,
  Sparkles,
  CheckCircle,
  FileCheck,
  Copy,
  Check,
  Eye,
  Layers,
  Search,
  BookOpen,
  Globe,
  FileCode,
} from 'lucide-react';
import { createSamplePdf } from '../../utils/pdfSigner';
import {
  convertPdfDocument,
  extractPdfContent,
  OutputDocFormat,
  ExtractedPdfContent,
} from '../../utils/pdfConverter';

export const PdfConverterTool: React.FC = () => {
  // File & Content State
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [extractedContent, setExtractedContent] = useState<ExtractedPdfContent | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Conversion Options
  const [targetFormat, setTargetFormat] = useState<OutputDocFormat>('docx');
  const [docTitle, setDocTitle] = useState<string>('Converted Document');
  const [authorName, setAuthorName] = useState<string>('Google Studio User');
  const [fontFamily, setFontFamily] = useState<'Calibri' | 'Arial' | 'Times New Roman' | 'Georgia' | 'Courier New'>('Calibri');
  const [preservePageBreaks, setPreservePageBreaks] = useState<boolean>(true);
  const [detectHeadings, setDetectHeadings] = useState<boolean>(true);
  const [cleanWhitespace, setCleanWhitespace] = useState<boolean>(true);
  const [includeMetadataHeader, setIncludeMetadataHeader] = useState<boolean>(true);

  // Status & UI State
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'settings' | 'extracted' | 'pages'>('settings');
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [convertedResult, setConvertedResult] = useState<{
    blob: Blob;
    filename: string;
    mimeType: string;
  } | null>(null);

  // Load sample on mount
  useEffect(() => {
    handleLoadSample();
  }, []);

  const handleLoadSample = async () => {
    setIsLoading(true);
    setStatusMessage('Loading sample PDF document...');
    try {
      const sample = await createSamplePdf();
      setPdfBytes(sample);
      setPdfName('Sample_Agreement.pdf');
      const content = await extractPdfContent(sample);
      setExtractedContent(content);
      setDocTitle(content.title || 'Sample Agreement');
      setConvertedResult(null);
      setStatusMessage('Loaded sample PDF.');
    } catch (err: any) {
      setStatusMessage('Error loading sample PDF: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatusMessage('Please upload a valid PDF document.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Parsing ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);
      setPdfName(file.name);
      const content = await extractPdfContent(bytes);
      setExtractedContent(content);
      setDocTitle(file.name.replace(/\.pdf$/i, ''));
      setConvertedResult(null);
      setStatusMessage(`Parsed ${file.name} (${content.pageCount} pages).`);
    } catch (err: any) {
      setStatusMessage('Error reading PDF file: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!pdfBytes) {
      setStatusMessage('Please select or upload a PDF first.');
      return;
    }

    setIsConverting(true);
    setStatusMessage(`Converting PDF to ${targetFormat.toUpperCase()} format...`);

    try {
      const result = await convertPdfDocument({
        pdfBuffer: pdfBytes,
        targetFormat,
        title: docTitle,
        author: authorName,
        fontFamily,
        preservePageBreaks,
        detectHeadings,
        cleanWhitespace,
        includeMetadataHeader,
      });

      setConvertedResult({
        blob: result.blob,
        filename: result.filename,
        mimeType: result.mimeType,
      });

      setStatusMessage(`Successfully converted to ${result.filename}!`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Conversion failed: ${err.message}`);
    } finally {
      setIsConverting(false);
    }
  };

  const handleDownload = () => {
    if (!convertedResult) return;
    const url = URL.createObjectURL(convertedResult.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = convertedResult.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    if (!extractedContent) return;
    navigator.clipboard.writeText(extractedContent.fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Supported Google Docs formats mapping
  const formatList: Array<{
    id: OutputDocFormat;
    label: string;
    ext: string;
    desc: string;
    badge: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'docx',
      label: 'Microsoft Word',
      ext: '.docx',
      desc: 'Native Google Docs & Word document with formatting, headings & headers',
      badge: 'Popular',
      icon: <FileType className="w-5 h-5 text-blue-400" />,
    },
    {
      id: 'txt',
      label: 'Plain Text',
      ext: '.txt',
      desc: 'Clean extracted text content without visual tags',
      badge: 'Fast',
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'html',
      label: 'HTML Document',
      ext: '.html',
      desc: 'Web page with styled CSS typography and heading structure',
      badge: 'Web',
      icon: <Globe className="w-5 h-5 text-indigo-400" />,
    },
    {
      id: 'rtf',
      label: 'Rich Text Format',
      ext: '.rtf',
      desc: 'Universal styled document format for text editors',
      badge: 'Universal',
      icon: <FileCheck className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'odt',
      label: 'OpenDocument Text',
      ext: '.odt',
      desc: 'LibreOffice / OpenOffice native format supported by Google Docs',
      badge: 'Open Standard',
      icon: <BookOpen className="w-5 h-5 text-teal-400" />,
    },
    {
      id: 'epub',
      label: 'EPUB E-Book',
      ext: '.epub',
      desc: 'Digital book publication format with chapter structure',
      badge: 'E-Book',
      icon: <Layers className="w-5 h-5 text-purple-400" />,
    },
    {
      id: 'md',
      label: 'Markdown',
      ext: '.md',
      desc: 'Structured markdown document for developers & note apps',
      badge: 'Developer',
      icon: <FileCode className="w-5 h-5 text-cyan-400" />,
    },
  ];

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileType className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                {pdfName || 'No Document Selected'}
              </h3>
              {extractedContent && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                  {extractedContent.pageCount} Pages
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Convert PDF files into Microsoft Word (.docx), ODT, HTML, RTF, EPUB, and TXT for Google Docs import.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm">
            <Upload className="w-4 h-4" />
            <span>Upload PDF</span>
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handlePdfUpload}
            />
          </label>

          <button
            onClick={handleLoadSample}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Sample PDF</span>
          </button>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Target Format & Configurator (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Format Selector Grid */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-2 uppercase tracking-wider">
              Select Output Format (Google Docs Supported)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {formatList.map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => {
                    setTargetFormat(fmt.id);
                    setConvertedResult(null);
                  }}
                  className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    targetFormat === fmt.id
                      ? 'bg-indigo-600/15 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 shrink-0 mt-0.5">
                    {fmt.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-white">
                        {fmt.label} <span className="text-indigo-400 font-mono">({fmt.ext})</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                        {fmt.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                      {fmt.desc}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configurable Parameters */}
          <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs text-white">Formatting & Layout Options</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="e.g. Agreement_Final"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Author Metadata
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Default Font Family
                </label>
                <select
                  value={fontFamily}
                  onChange={(e: any) => setFontFamily(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                >
                  <option value="Calibri">Calibri (Google Docs Default)</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Courier New">Courier New</option>
                </select>
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={preservePageBreaks}
                    onChange={(e) => setPreservePageBreaks(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                  <span>Preserve Original Page Breaks</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={detectHeadings}
                    onChange={(e) => setDetectHeadings(e.target.checked)}
                    className="w-4 h-4 accent-indigo-500 rounded"
                  />
                  <span>Auto-Detect Headings & Sections</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cleanWhitespace}
                  onChange={(e) => setCleanWhitespace(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
                <span>Clean Whitespace & Hyphenation</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeMetadataHeader}
                  onChange={(e) => setIncludeMetadataHeader(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
                <span>Include Document Header Info</span>
              </label>
            </div>
          </div>

          {/* Action Button: Convert PDF */}
          <div className="space-y-3">
            <button
              onClick={handleConvert}
              disabled={isConverting || !pdfBytes}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? (
                <span>Converting Document Stream...</span>
              ) : (
                <>
                  <FileType className="w-5 h-5" />
                  <span>Convert PDF to {targetFormat.toUpperCase()} Format</span>
                </>
              )}
            </button>

            {/* Download Button if converted */}
            {convertedResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">
                      Ready: {convertedResult.filename}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    {targetFormat.toUpperCase()}
                  </span>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Converted File ({convertedResult.filename})</span>
                </button>
              </div>
            )}
          </div>

          {/* Status Bar */}
          {statusMessage && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
              <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Right Column: Extracted Content & Page Inspector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-3 py-2 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'settings'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Summary</span>
            </button>

            <button
              onClick={() => setActiveTab('extracted')}
              className={`flex items-center gap-2 px-3 py-2 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'extracted'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Extracted Text</span>
            </button>

            <button
              onClick={() => setActiveTab('pages')}
              className={`flex items-center gap-2 px-3 py-2 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'pages'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Page Inspector</span>
            </button>
          </div>

          {/* TAB 1: SUMMARY */}
          {activeTab === 'settings' && extractedContent && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-3">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                Extracted Document Stats
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-mono">Total Pages</span>
                  <p className="text-xl font-bold text-white font-mono mt-0.5">
                    {extractedContent.pageCount}
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                  <span className="text-[10px] text-slate-400 font-mono">Total Character Count</span>
                  <p className="text-xl font-bold text-indigo-400 font-mono mt-0.5">
                    {extractedContent.fullText.length.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-800/40 border border-slate-700/40 space-y-1">
                <span className="text-[10px] text-slate-400 font-mono">Detected Document Title</span>
                <p className="text-xs font-semibold text-white truncate">
                  {extractedContent.title}
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleCopyText}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Text Copied!' : 'Copy Extracted Text to Clipboard'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EXTRACTED TEXT */}
          {activeTab === 'extracted' && extractedContent && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter extracted text..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 max-h-80 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {searchQuery
                  ? extractedContent.fullText
                      .split('\n')
                      .filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
                      .join('\n') || 'No matching lines found.'
                  : extractedContent.fullText}
              </div>
            </div>
          )}

          {/* TAB 3: PAGE INSPECTOR */}
          {activeTab === 'pages' && extractedContent && (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {extractedContent.pages.map((p) => (
                <div
                  key={p.pageNumber}
                  className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                    <span className="font-bold text-xs text-indigo-400 font-mono">
                      Page {p.pageNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {p.lines.length} lines
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 line-clamp-4">
                    {p.text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
