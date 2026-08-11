import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Upload,
  PenTool,
  Type,
  Image as ImageIcon,
  Download,
  RotateCcw,
  Check,
  Move,
  Layers,
  Settings,
  Calendar,
  User,
  Sparkles,
  Eye,
  AlertCircle,
  FileCheck,
} from 'lucide-react';
import {
  createSamplePdf,
  getPdfMetadata,
  signPdfDocument,
  PdfSignOptions,
  PdfMetadata,
} from '../../utils/pdfSigner';

type SignatureMode = 'draw' | 'type' | 'upload';
type PositionPreset = 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'center' | 'custom';
type PageTarget = 'first' | 'last' | 'all' | 'custom';

export const PdfSignerTool: React.FC = () => {
  // --- PDF File State ---
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);

  // --- Signature Creator State ---
  const [sigMode, setSigMode] = useState<SignatureMode>('draw');
  
  // Drawing Canvas State
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0F172A'); // Dark Navy
  const [penWidth, setPenWidth] = useState(3);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Type Signature State
  const [typedName, setTypedName] = useState('Alex Morgan');
  const [fontFamily, setFontFamily] = useState<'cursive' | 'serif' | 'sans-serif' | 'monospace'>('cursive');
  const [typedColor, setTypedColor] = useState('#0F172A');

  // Uploaded Signature State
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null);

  // Active Signature Data URL
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  // --- Configurable Placement & Styling State ---
  const [pagesToSign, setPagesToSign] = useState<PageTarget>('first');
  const [customPageNum, setCustomPageNum] = useState<number>(1);
  const [position, setPosition] = useState<PositionPreset>('bottom-right');
  const [customXPercent, setCustomXPercent] = useState<number>(65);
  const [customYPercent, setCustomYPercent] = useState<number>(8);
  const [sigWidth, setSigWidth] = useState<number>(160);
  const [sigHeight, setSigHeight] = useState<number>(65);
  const [opacity, setOpacity] = useState<number>(1.0);

  // Annotation Options
  const [includePrintedName, setIncludePrintedName] = useState(true);
  const [printedNameText, setPrintedNameText] = useState('Alex Morgan');
  const [includeDate, setIncludeDate] = useState(true);
  const [dateText, setDateText] = useState(() => new Date().toISOString().split('T')[0]);
  const [includeReason, setIncludeReason] = useState(false);
  const [reasonText, setReasonText] = useState('Approved and Verified');
  const [showBorder, setShowBorder] = useState(true);
  const [borderColorHex, setBorderColorHex] = useState('#3B82F6');
  const [fontColorHex, setFontColorHex] = useState('#1E293B');

  // --- Output State ---
  const [signedPdfBytes, setSignedPdfBytes] = useState<Uint8Array | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'signature' | 'placement' | 'annotations'>('signature');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Preview container ref
  const previewRef = useRef<HTMLDivElement | null>(null);

  // Load sample PDF on initial render
  useEffect(() => {
    handleLoadSample();
  }, []);

  const handleLoadSample = async () => {
    setIsLoadingPdf(true);
    try {
      const sample = await createSamplePdf();
      setPdfBytes(sample);
      setPdfName('Sample_Agreement.pdf');
      const meta = await getPdfMetadata(sample);
      setMetadata(meta);
      setSelectedPageNum(1);
      setSignedPdfBytes(null);
      setStatusMessage('Loaded sample document.');
    } catch (err: any) {
      setStatusMessage('Error generating sample PDF.');
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Upload PDF Handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setStatusMessage('Please select a valid PDF file.');
      return;
    }

    setIsLoadingPdf(true);
    setStatusMessage(`Loading ${file.name}...`);
    try {
      const buffer = await file.arrayBuffer();
      const uintArray = new Uint8Array(buffer);
      setPdfBytes(uintArray);
      setPdfName(file.name);
      const meta = await getPdfMetadata(uintArray);
      setMetadata(meta);
      setSelectedPageNum(1);
      setSignedPdfBytes(null);
      setStatusMessage(`Successfully loaded ${file.name} (${meta.pageCount} pages).`);
    } catch (err: any) {
      setStatusMessage('Error parsing PDF file: ' + err.message);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // --- Signature Drawing Canvas Logic ---
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setHasDrawn(true);
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    generateSignatureFromCanvas();
  };

  const clearCanvas = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureDataUrl(null);
  };

  const generateSignatureFromCanvas = useCallback(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL('image/png');
    setSignatureDataUrl(dataUrl);
  }, [hasDrawn]);

  // --- Generate Typed Signature ---
  const generateTypedSignatureDataUrl = useCallback(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = typedColor;

    let fontStyleStr = '42px cursive, "Dancing Script", "Brush Script MT", cursive';
    if (fontFamily === 'serif') {
      fontStyleStr = 'italic 38px Georgia, serif';
    } else if (fontFamily === 'sans-serif') {
      fontStyleStr = 'bold 36px system-ui, sans-serif';
    } else if (fontFamily === 'monospace') {
      fontStyleStr = '34px monospace';
    }

    ctx.font = fontStyleStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Signature', canvas.width / 2, canvas.height / 2);

    // Decorative baseline line
    ctx.strokeStyle = typedColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(40, canvas.height / 2 + 30);
    ctx.lineTo(canvas.width - 40, canvas.height / 2 + 30);
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }, [typedName, fontFamily, typedColor]);

  // Update Signature Data URL when mode/type changes
  useEffect(() => {
    if (sigMode === 'draw') {
      if (hasDrawn && drawCanvasRef.current) {
        setSignatureDataUrl(drawCanvasRef.current.toDataURL('image/png'));
      }
    } else if (sigMode === 'type') {
      const url = generateTypedSignatureDataUrl();
      if (url) setSignatureDataUrl(url);
    } else if (sigMode === 'upload') {
      if (uploadedSigUrl) {
        setSignatureDataUrl(uploadedSigUrl);
      }
    }
  }, [sigMode, typedName, fontFamily, typedColor, uploadedSigUrl, hasDrawn, generateTypedSignatureDataUrl]);

  // Handle uploaded signature image
  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUploadedSigUrl(result);
      setSignatureDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  // Click on interactive preview to set position
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const xPercent = Math.round((clickX / rect.width) * 100);
    // Note: PDF y coordinate is bottom-up, so top click = higher Y %
    const yPercent = Math.round(((rect.height - clickY) / rect.height) * 100);

    setPosition('custom');
    setCustomXPercent(Math.max(0, Math.min(xPercent, 90)));
    setCustomYPercent(Math.max(0, Math.min(yPercent, 90)));
  };

  // --- Sign PDF Action ---
  const handleSignPdf = async () => {
    if (!pdfBytes) {
      setStatusMessage('Please upload or load a PDF document first.');
      return;
    }

    if (!signatureDataUrl) {
      setStatusMessage('Please draw, type, or upload a signature first.');
      return;
    }

    setIsProcessing(true);
    setStatusMessage('Applying digital signature and embedding metadata...');

    try {
      const signOpts: PdfSignOptions = {
        pdfBuffer: pdfBytes,
        signatureDataUrl: signatureDataUrl,
        pagesToSign: pagesToSign,
        customPageNum: customPageNum,
        position: position,
        customXPercent: customXPercent,
        customYPercent: customYPercent,
        sigWidth: sigWidth,
        sigHeight: sigHeight,
        printedName: includePrintedName ? printedNameText : '',
        signDate: includeDate ? dateText : '',
        signReason: includeReason ? reasonText : '',
        showBorder: showBorder,
        borderColorHex: borderColorHex,
        opacity: opacity,
        fontColorHex: fontColorHex,
      };

      const resultBytes = await signPdfDocument(signOpts);
      setSignedPdfBytes(resultBytes);
      setStatusMessage('Document signed successfully! Ready for download.');
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Failed to sign PDF: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Download Signed PDF ---
  const handleDownload = () => {
    if (!signedPdfBytes) return;
    const blob = new Blob([signedPdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const downloadName = pdfName
      ? pdfName.replace(/\.pdf$/i, '_signed.pdf')
      : 'document_signed.pdf';
    a.download = downloadName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">
                {pdfName || 'No Document Selected'}
              </h3>
              {metadata && (
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-slate-800 text-indigo-300 border border-slate-700">
                  {metadata.pageCount} {metadata.pageCount === 1 ? 'Page' : 'Pages'}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Client-side PDF signature tool with full customization & instant preview.
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
            disabled={isLoadingPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Sample PDF</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Configurator vs Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Configurator Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('signature')}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'signature'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <PenTool className="w-4 h-4" />
              <span>1. Create Signature</span>
            </button>

            <button
              onClick={() => setActiveTab('placement')}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'placement'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Move className="w-4 h-4" />
              <span>2. Placement & Scale</span>
            </button>

            <button
              onClick={() => setActiveTab('annotations')}
              className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-xs border-b-2 transition-colors ${
                activeTab === 'annotations'
                  ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>3. Stamp & Style</span>
            </button>
          </div>

          {/* TAB 1: SIGNATURE CREATOR */}
          {activeTab === 'signature' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              {/* Signature Mode Switcher */}
              <div className="flex p-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                <button
                  onClick={() => setSigMode('draw')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                    sigMode === 'draw'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Draw</span>
                </button>

                <button
                  onClick={() => setSigMode('type')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                    sigMode === 'type'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Type className="w-3.5 h-3.5" />
                  <span>Type</span>
                </button>

                <button
                  onClick={() => setSigMode('upload')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md font-semibold text-xs transition-colors ${
                    sigMode === 'upload'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
              </div>

              {/* MODE 1: DRAW CANVAS */}
              {sigMode === 'draw' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">Ink Color:</span>
                      <div className="flex items-center gap-1.5">
                        {['#0F172A', '#1E3A8A', '#991B1B', '#065F46'].map((color) => (
                          <button
                            key={color}
                            onClick={() => setPenColor(color)}
                            className={`w-5 h-5 rounded-full border border-white/20 transition-transform ${
                              penColor === color ? 'scale-125 ring-2 ring-indigo-400' : ''
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span>Thickness:</span>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          value={penWidth}
                          onChange={(e) => setPenWidth(Number(e.target.value))}
                          className="w-16 accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <button
                        onClick={clearCanvas}
                        className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 font-semibold px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>

                  <div className="relative border-2 border-dashed border-slate-700 rounded-xl bg-white p-2">
                    <canvas
                      ref={drawCanvasRef}
                      width={480}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      onTouchStart={startDrawing}
                      onTouchMove={draw}
                      onTouchEnd={stopDrawing}
                      className="w-full h-32 cursor-crosshair touch-none bg-transparent"
                    />
                    {!hasDrawn && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-mono">
                        ✍️ Sign with your mouse or touchscreen here
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MODE 2: TYPE SIGNATURE */}
              {sigMode === 'type' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Signature Name / Text
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => {
                        setTypedName(e.target.value);
                        setPrintedNameText(e.target.value);
                      }}
                      placeholder="e.g. John H. Doe"
                      className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-sm focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Font Style
                      </label>
                      <select
                        value={fontFamily}
                        onChange={(e: any) => setFontFamily(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:outline-hidden"
                      >
                        <option value="cursive">Cursive / Calligraphy</option>
                        <option value="serif">Classic Serif</option>
                        <option value="sans-serif">Clean Sans-Serif</option>
                        <option value="monospace">Monospace Code</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={typedColor}
                        onChange={(e) => setTypedColor(e.target.value)}
                        className="w-full h-9 p-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3: UPLOAD IMAGE */}
              {sigMode === 'upload' && (
                <div className="space-y-3">
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-700 rounded-xl bg-slate-800/40 hover:bg-slate-800/70 transition-colors cursor-pointer p-4 text-center">
                    <Upload className="w-8 h-8 text-indigo-400 mb-2" />
                    <span className="text-xs font-semibold text-slate-300">
                      Upload Signature Image (PNG / JPG)
                    </span>
                    <span className="text-[11px] text-slate-500 mt-1">
                      Transparent PNG signatures work best
                    </span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={handleSignatureImageUpload}
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PLACEMENT & SCALE */}
          {activeTab === 'placement' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              {/* Target Pages */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Target Pages to Sign
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'first', label: 'First Page' },
                    { id: 'last', label: 'Last Page' },
                    { id: 'all', label: 'All Pages' },
                    { id: 'custom', label: 'Custom Page' },
                  ].map((target) => (
                    <button
                      key={target.id}
                      onClick={() => setPagesToSign(target.id as PageTarget)}
                      className={`px-3 py-2 rounded-lg font-semibold text-xs border transition-colors ${
                        pagesToSign === target.id
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>

                {pagesToSign === 'custom' && metadata && (
                  <div className="mt-2.5 flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400">Page Number:</span>
                    <input
                      type="number"
                      min="1"
                      max={metadata.pageCount}
                      value={customPageNum}
                      onChange={(e) =>
                        setCustomPageNum(
                          Math.max(1, Math.min(Number(e.target.value), metadata.pageCount))
                        )
                      }
                      className="w-20 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs text-center"
                    />
                    <span className="text-xs text-slate-500 font-mono">/ {metadata.pageCount}</span>
                  </div>
                )}
              </div>

              {/* Placement Presets Grid */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Position Preset
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'top-left', label: 'Top Left' },
                    { id: 'center', label: 'Center' },
                    { id: 'top-right', label: 'Top Right' },
                    { id: 'bottom-left', label: 'Bottom Left' },
                    { id: 'bottom-center', label: 'Bottom Center' },
                    { id: 'bottom-right', label: 'Bottom Right' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPosition(p.id as PositionPreset)}
                      className={`px-3 py-2 rounded-lg font-semibold text-xs border transition-colors ${
                        position === p.id
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fine Sliders */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>X Position Offset</span>
                    <span className="font-mono text-indigo-400">{customXPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={customXPercent}
                    onChange={(e) => {
                      setPosition('custom');
                      setCustomXPercent(Number(e.target.value));
                    }}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Y Position Offset</span>
                    <span className="font-mono text-indigo-400">{customYPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={customYPercent}
                    onChange={(e) => {
                      setPosition('custom');
                      setCustomYPercent(Number(e.target.value));
                    }}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Signature Width</span>
                    <span className="font-mono text-indigo-400">{sigWidth}px</span>
                  </div>
                  <input
                    type="range"
                    min="80"
                    max="300"
                    value={sigWidth}
                    onChange={(e) => {
                      const w = Number(e.target.value);
                      setSigWidth(w);
                      setSigHeight(Math.round((w * 65) / 160));
                    }}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Opacity</span>
                    <span className="font-mono text-indigo-400">
                      {Math.round(opacity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="1.0"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STAMP & ANNOTATION STYLING */}
          {activeTab === 'annotations' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-4">
              {/* Printed Name Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Include Printed Name</span>
                    <p className="text-[10px] text-slate-400">Adds "Signed by: [Name]" tag</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includePrintedName}
                  onChange={(e) => setIncludePrintedName(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              {includePrintedName && (
                <input
                  type="text"
                  value={printedNameText}
                  onChange={(e) => setPrintedNameText(e.target.value)}
                  placeholder="Signer Full Name"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-hidden"
                />
              )}

              {/* Date Stamp Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Include Date Stamp</span>
                    <p className="text-[10px] text-slate-400">Embeds signing timestamp</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeDate}
                  onChange={(e) => setIncludeDate(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              {includeDate && (
                <input
                  type="date"
                  value={dateText}
                  onChange={(e) => setDateText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-hidden"
                />
              )}

              {/* Signing Reason Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <FileCheck className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Include Reason / Note</span>
                    <p className="text-[10px] text-slate-400">E.g. Approved, Verified, Consent</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeReason}
                  onChange={(e) => setIncludeReason(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              {includeReason && (
                <input
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Reason or consent note"
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white font-medium text-xs focus:outline-hidden"
                />
              )}

              {/* Bounding Box Border */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <div>
                    <span className="text-xs font-semibold text-slate-200">Signature Seal Frame Box</span>
                    <p className="text-[10px] text-slate-400">Draws a clean box with border around signature</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={showBorder}
                  onChange={(e) => setShowBorder(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
              </div>

              {showBorder && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Frame Border Color
                    </label>
                    <input
                      type="color"
                      value={borderColorHex}
                      onChange={(e) => setBorderColorHex(e.target.value)}
                      className="w-full h-8 p-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Text Font Color
                    </label>
                    <input
                      type="color"
                      value={fontColorHex}
                      onChange={(e) => setFontColorHex(e.target.value)}
                      className="w-full h-8 p-1 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Button: Sign Document */}
          <div className="pt-2">
            <button
              onClick={handleSignPdf}
              disabled={isProcessing || !pdfBytes || !signatureDataUrl}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <span>Embedding Signature & Metadata...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Generate Signed PDF Document</span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono text-slate-300">
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Right Side: Interactive Live Page Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs text-slate-200">Interactive Page Preview</span>
            </div>

            {metadata && metadata.pageCount > 1 && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Page:</span>
                <select
                  value={selectedPageNum}
                  onChange={(e) => setSelectedPageNum(Number(e.target.value))}
                  className="px-2 py-1 rounded-md bg-slate-800 border border-slate-700 text-white text-xs font-mono"
                >
                  {Array.from({ length: metadata.pageCount }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Page {i + 1}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Page Visual Canvas Container */}
          <div
            ref={previewRef}
            onClick={handlePreviewClick}
            className="relative w-full aspect-3/4 rounded-2xl bg-white border-2 border-slate-700 shadow-2xl p-6 overflow-hidden select-none cursor-crosshair group"
          >
            {/* Mock Page Content */}
            <div className="w-full h-full flex flex-col justify-between text-slate-800 font-sans pointer-events-none opacity-80">
              <div>
                <div className="border-b-2 border-indigo-600 pb-2 mb-4 flex justify-between items-center">
                  <span className="font-bold text-xs uppercase tracking-wider text-indigo-900">
                    Official Document Page {selectedPageNum}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500">{pdfName}</span>
                </div>

                <div className="space-y-2">
                  <div className="h-2.5 bg-slate-200 rounded-sm w-3/4" />
                  <div className="h-2 bg-slate-100 rounded-sm w-full" />
                  <div className="h-2 bg-slate-100 rounded-sm w-5/6" />
                  <div className="h-2 bg-slate-100 rounded-sm w-4/5" />
                  <div className="h-2 bg-slate-100 rounded-sm w-full" />
                </div>

                <div className="mt-6 space-y-2">
                  <div className="h-2 bg-slate-100 rounded-sm w-11/12" />
                  <div className="h-2 bg-slate-100 rounded-sm w-2/3" />
                  <div className="h-2 bg-slate-100 rounded-sm w-3/5" />
                </div>
              </div>

              {/* Watermark notice */}
              <div className="text-[10px] text-center text-slate-400 font-mono border-t border-slate-200 pt-2">
                Click anywhere on document to place signature
              </div>
            </div>

            {/* Live Interactive Overlay Box */}
            {signatureDataUrl && (
              <div
                className="absolute transition-all duration-150 pointer-events-none"
                style={{
                  left:
                    position === 'custom'
                      ? `${customXPercent}%`
                      : position.includes('left')
                      ? '8%'
                      : position.includes('right')
                      ? '52%'
                      : '30%',
                  top:
                    position === 'custom'
                      ? `${100 - customYPercent - 25}%`
                      : position.includes('top')
                      ? '8%'
                      : position.includes('bottom')
                      ? '68%'
                      : '40%',
                  opacity: opacity,
                }}
              >
                <div
                  className={`p-2 rounded-md ${
                    showBorder ? 'bg-indigo-50/90 border-2 shadow-sm' : ''
                  }`}
                  style={{
                    borderColor: showBorder ? borderColorHex : 'transparent',
                    width: `${Math.round(sigWidth * 0.9)}px`,
                  }}
                >
                  {showBorder && (
                    <div
                      className="text-[7px] font-bold px-1.5 py-0.5 rounded text-white mb-1 inline-block"
                      style={{ backgroundColor: borderColorHex }}
                    >
                      DIGITALLY SIGNED
                    </div>
                  )}

                  <img
                    src={signatureDataUrl}
                    alt="Signature"
                    className="w-full object-contain max-h-12"
                  />

                  {includePrintedName && (
                    <div
                      className="text-[9px] font-bold mt-1 line-clamp-1"
                      style={{ color: fontColorHex }}
                    >
                      Signed by: {printedNameText}
                    </div>
                  )}

                  {includeDate && (
                    <div
                      className="text-[8px] font-mono line-clamp-1 opacity-80"
                      style={{ color: fontColorHex }}
                    >
                      Date: {dateText}
                    </div>
                  )}

                  {includeReason && (
                    <div
                      className="text-[8px] font-mono line-clamp-1 opacity-80"
                      style={{ color: fontColorHex }}
                    >
                      Note: {reasonText}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Download Signed File Card */}
          {signedPdfBytes && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm text-white">Signed Document Ready</span>
              </div>
              <p className="text-xs text-slate-300">
                The digital signature has been embedded into the PDF bytes.
              </p>

              <button
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Signed PDF</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
