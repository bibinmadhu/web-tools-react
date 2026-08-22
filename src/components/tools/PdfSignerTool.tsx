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
  Clock,
  User,
  Sparkles,
  Eye,
  AlertCircle,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CheckSquare,
  Square,
  Plus,
  Minus,
  ListFilter,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import {
  createSamplePdf,
  getPdfMetadata,
  signPdfDocument,
  computeSignatureBoxMetrics,
  calculateBoxPosition,
  parsePageRange,
  resolveTargetPageNumbers,
  getDefaultSignatureDate,
  formatSignatureDate,
  SignatureDateFormat,
  PdfSignOptions,
  PdfMetadata,
  PageTargetMode,
} from '../../utils/pdfSigner';
import { renderPdfPageToCanvas } from '../../utils/pdfRenderer';

type SignatureMode = 'draw' | 'type' | 'upload';
type PositionPreset = 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'center' | 'custom';

export const PdfSignerTool: React.FC = () => {
  // --- PDF File State ---
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [pdfName, setPdfName] = useState<string>('');
  const [metadata, setMetadata] = useState<PdfMetadata | null>(null);
  const [selectedPageNum, setSelectedPageNum] = useState<number>(1);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(false);
  const [isRenderingPage, setIsRenderingPage] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // --- Signature Creator State ---
  const [sigMode, setSigMode] = useState<SignatureMode>('draw');

  // Drawing Canvas State
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0F172A');
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

  // --- Configurable Page Target State ---
  const [pagesToSign, setPagesToSign] = useState<PageTargetMode>('first');
  const [customPageNum, setCustomPageNum] = useState<number>(1);
  const [selectedPages, setSelectedPages] = useState<number[]>([1]);
  const [pageRangeStr, setPageRangeStr] = useState<string>('1');

  // --- Placement & Styling State ---
  const [position, setPosition] = useState<PositionPreset>('bottom-right');
  const [customXPercent, setCustomXPercent] = useState<number>(60);
  const [customYPercent, setCustomYPercent] = useState<number>(10);
  const [sigWidth, setSigWidth] = useState<number>(160);
  const [sigHeight, setSigHeight] = useState<number>(65);
  const [opacity, setOpacity] = useState<number>(1.0);

  // Annotation Options & Date of Signature
  const [includePrintedName, setIncludePrintedName] = useState(true);
  const [printedNameText, setPrintedNameText] = useState('Alex Morgan');
  const [includeDate, setIncludeDate] = useState(true);
  const [datePickerValue, setDatePickerValue] = useState<string>(() => getDefaultSignatureDate());
  const [dateText, setDateText] = useState<string>(() => getDefaultSignatureDate());
  const [dateFormat, setDateFormat] = useState<SignatureDateFormat>('iso');
  const [includeReason, setIncludeReason] = useState(false);
  const [reasonText, setReasonText] = useState('Approved and Verified');
  const [showBorder, setShowBorder] = useState(true);
  const [borderColorHex, setBorderColorHex] = useState('#3B82F6');
  const [fontColorHex, setFontColorHex] = useState('#1E293B');

  // Date of Signature Helper Handlers
  const handleDatePicked = (pickedVal: string) => {
    setDatePickerValue(pickedVal);
    if (!pickedVal) {
      setDateText('');
      return;
    }
    const formatted = formatSignatureDate(pickedVal, dateFormat);
    setDateText(formatted);
  };

  const handleSetTodayDate = () => {
    const todayIso = getDefaultSignatureDate();
    setDatePickerValue(todayIso);
    const formatted = formatSignatureDate(todayIso, dateFormat);
    setDateText(formatted);
  };

  const handleApplyDateFormat = (fmt: SignatureDateFormat) => {
    setDateFormat(fmt);
    const baseDate = datePickerValue || getDefaultSignatureDate();
    const formatted = formatSignatureDate(baseDate, fmt);
    setDateText(formatted);
  };

  const handleAppendCurrentTime = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
    if (dateText.includes(':')) {
      // Already has time, replace or update
      const base = dateText.split(' ')[0];
      setDateText(`${base} ${timeStr}`);
    } else {
      setDateText(`${dateText || getDefaultSignatureDate()} ${timeStr}`);
    }
  };

  // --- Output State & Preview Mode ---
  const [signedPdfBytes, setSignedPdfBytes] = useState<Uint8Array | null>(null);
  const [previewDocType, setPreviewDocType] = useState<'original' | 'signed'>('original');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'signature' | 'placement' | 'annotations'>('signature');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // PDF Page Canvas Ref & Container Ref
  const pageCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  // Dragging state for signature box
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initialXPercent: number; initialYPercent: number } | null>(null);

  // Load sample PDF on initial render
  useEffect(() => {
    handleLoadSample();
  }, []);

  const handleLoadSample = async () => {
    setIsLoadingPdf(true);
    setStatusMessage('Loading sample agreement document...');
    try {
      const sample = await createSamplePdf();
      setPdfBytes(sample);
      setPdfName('Sample_Agreement.pdf');
      const meta = await getPdfMetadata(sample);
      setMetadata(meta);
      setSelectedPageNum(1);
      setSelectedPages([1]);
      setSignedPdfBytes(null);
      setPreviewDocType('original');
      setStatusMessage(`Loaded sample document (${meta.pageCount} pages).`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error generating sample PDF: ' + err.message);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // Upload PDF Handler
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setStatusMessage('Please select a valid PDF file (.pdf).');
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
      setSelectedPages([1]);
      setCustomPageNum(1);
      setPageRangeStr(`1-${meta.pageCount}`);
      setSignedPdfBytes(null);
      setPreviewDocType('original');
      setStatusMessage(`Successfully loaded ${file.name} (${meta.pageCount} pages).`);
    } catch (err: any) {
      console.error(err);
      setStatusMessage('Error parsing PDF file: ' + err.message);
    } finally {
      setIsLoadingPdf(false);
    }
  };

  // --- Real PDF Page Rendering to Canvas ---
  const activePdfToRender = previewDocType === 'signed' && signedPdfBytes ? signedPdfBytes : pdfBytes;

  useEffect(() => {
    let isCancelled = false;

    const renderPage = async () => {
      if (!activePdfToRender || !pageCanvasRef.current) return;

      setIsRenderingPage(true);
      setRenderError(null);

      try {
        const containerWidth = previewContainerRef.current?.clientWidth || 550;
        await renderPdfPageToCanvas(
          activePdfToRender,
          selectedPageNum,
          pageCanvasRef.current,
          containerWidth
        );
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Error rendering PDF page:', err);
          setRenderError('Could not render page preview: ' + (err.message || 'Rendering failed'));
        }
      } finally {
        if (!isCancelled) {
          setIsRenderingPage(false);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [activePdfToRender, selectedPageNum]);

  // Window resize observer to re-render page at crisp resolution
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    let timeoutId: any = null;
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (activePdfToRender && pageCanvasRef.current) {
          renderPdfPageToCanvas(
            activePdfToRender,
            selectedPageNum,
            pageCanvasRef.current,
            container.clientWidth
          ).catch(() => {});
        }
      }, 150);
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [activePdfToRender, selectedPageNum]);

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

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.beginPath();
    ctx.moveTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
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

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    ctx.lineTo((clientX - rect.left) * scaleX, (clientY - rect.top) * scaleY);
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
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

    let fontStyleStr = '44px "Brush Script MT", "Caveat", "Dancing Script", cursive';
    if (fontFamily === 'serif') {
      fontStyleStr = 'italic bold 36px Georgia, serif';
    } else if (fontFamily === 'sans-serif') {
      fontStyleStr = 'bold 34px system-ui, -apple-system, sans-serif';
    } else if (fontFamily === 'monospace') {
      fontStyleStr = '30px monospace';
    }

    ctx.font = fontStyleStr;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName || 'Signature', canvas.width / 2, canvas.height / 2);

    // Decorative baseline flourish
    ctx.strokeStyle = typedColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(35, canvas.height / 2 + 32);
    ctx.lineTo(canvas.width - 35, canvas.height / 2 + 32);
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

  // Upload signature image handler
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

  // --- Dimension & Position Calculations ---
  const currentPageDimension =
    metadata && metadata.pagesDimensions && metadata.pagesDimensions[selectedPageNum - 1]
      ? metadata.pagesDimensions[selectedPageNum - 1]
      : { width: 600, height: 800 };

  const boxMetrics = computeSignatureBoxMetrics({
    sigWidth,
    sigHeight,
    printedName: includePrintedName ? printedNameText : '',
    signDate: includeDate ? dateText : '',
    signReason: includeReason ? reasonText : '',
    showBorder,
  });

  const positionResult = calculateBoxPosition(
    currentPageDimension.width,
    currentPageDimension.height,
    boxMetrics.totalBoxWidth,
    boxMetrics.totalBoxHeight,
    position,
    customXPercent,
    customYPercent,
    24
  );

  // Calculate the targeted pages array
  const totalPages = metadata?.pageCount || 1;
  const activeTargetPages = resolveTargetPageNumbers(
    pagesToSign,
    totalPages,
    customPageNum,
    selectedPages,
    pageRangeStr
  );

  // Check if the currently viewed page is targeted for signing
  const isCurrentPageSigned = activeTargetPages.includes(selectedPageNum);

  // Quick toggle function for signing the current page in the preview
  const handleToggleCurrentPageSigning = () => {
    if (pagesToSign === 'all') {
      // Switching from all to selected with current excluded
      const remaining = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
        (p) => p !== selectedPageNum
      );
      setPagesToSign('selected');
      setSelectedPages(remaining);
      return;
    }

    if (isCurrentPageSigned) {
      // Remove current page
      const next = activeTargetPages.filter((p) => p !== selectedPageNum);
      setPagesToSign('selected');
      setSelectedPages(next.length > 0 ? next : [selectedPageNum === 1 ? 2 : 1]);
    } else {
      // Add current page
      const next = [...activeTargetPages, selectedPageNum].sort((a, b) => a - b);
      setPagesToSign('selected');
      setSelectedPages(next);
    }
  };

  const handleTogglePageCheckbox = (pageNum: number) => {
    setPagesToSign('selected');
    if (selectedPages.includes(pageNum)) {
      const next = selectedPages.filter((p) => p !== pageNum);
      setSelectedPages(next.length > 0 ? next : [pageNum]);
    } else {
      setSelectedPages([...selectedPages, pageNum].sort((a, b) => a - b));
    }
  };

  const handleSelectAllPages = () => {
    setPagesToSign('all');
    setSelectedPages(Array.from({ length: totalPages }, (_, i) => i + 1));
  };

  const handleSelectOnlyCurrentPage = () => {
    setPagesToSign('custom');
    setCustomPageNum(selectedPageNum);
    setSelectedPages([selectedPageNum]);
  };

  // --- Interactive Drag & Click Handlers ---
  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const fracX = Math.max(0, Math.min(clickX / rect.width, 1));
    const fracY = Math.max(0, Math.min(clickY / rect.height, 1));

    // Target center point in PDF points
    const desiredCenterX = fracX * currentPageDimension.width;
    const desiredCenterY = (1 - fracY) * currentPageDimension.height;

    const desiredPdfX = desiredCenterX - boxMetrics.totalBoxWidth / 2;
    const desiredPdfY = desiredCenterY - boxMetrics.totalBoxHeight / 2;

    const maxX = Math.max(0, currentPageDimension.width - boxMetrics.totalBoxWidth);
    const maxY = Math.max(0, currentPageDimension.height - boxMetrics.totalBoxHeight);

    const clampedPdfX = Math.max(0, Math.min(desiredPdfX, maxX));
    const clampedPdfY = Math.max(0, Math.min(desiredPdfY, maxY));

    const newXPercent = maxX > 0 ? Math.round((clampedPdfX / maxX) * 100) : 0;
    const newYPercent = maxY > 0 ? Math.round((clampedPdfY / maxY) * 100) : 0;

    setPosition('custom');
    setCustomXPercent(newXPercent);
    setCustomYPercent(newYPercent);
  };

  const handleStartDrag = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setIsDragging(true);

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialXPercent: customXPercent,
      initialYPercent: customYPercent,
    };
    setPosition('custom');
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragStartRef.current || !previewContainerRef.current) return;

      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const rect = previewContainerRef.current.getBoundingClientRect();
      const deltaX = clientX - dragStartRef.current.startX;
      const deltaY = clientY - dragStartRef.current.startY;

      const maxX = Math.max(1, currentPageDimension.width - boxMetrics.totalBoxWidth);
      const maxY = Math.max(1, currentPageDimension.height - boxMetrics.totalBoxHeight);

      // Convert delta pixels to PDF point delta
      const deltaPdfX = (deltaX / rect.width) * currentPageDimension.width;
      // In PDF, Y goes UP, so moving mouse down (positive deltaY) decreases PDF Y
      const deltaPdfY = -(deltaY / rect.height) * currentPageDimension.height;

      const initialPdfX = (dragStartRef.current.initialXPercent / 100) * maxX;
      const initialPdfY = (dragStartRef.current.initialYPercent / 100) * maxY;

      const targetPdfX = Math.max(0, Math.min(initialPdfX + deltaPdfX, maxX));
      const targetPdfY = Math.max(0, Math.min(initialPdfY + deltaPdfY, maxY));

      setCustomXPercent(Math.round((targetPdfX / maxX) * 100));
      setCustomYPercent(Math.round((targetPdfY / maxY) * 100));
    };

    const handleEnd = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleMove);
      window.addEventListener('touchend', handleEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, currentPageDimension, boxMetrics]);

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
    setStatusMessage(`Applying digital signature to ${activeTargetPages.length} ${activeTargetPages.length === 1 ? 'page' : 'pages'}...`);

    try {
      const signOpts: PdfSignOptions = {
        pdfBuffer: pdfBytes,
        signatureDataUrl: signatureDataUrl,
        pagesToSign: pagesToSign,
        customPageNum: customPageNum,
        selectedPages: selectedPages,
        pageRangeStr: pageRangeStr,
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
      setPreviewDocType('signed');
      setStatusMessage(`Document successfully signed on ${activeTargetPages.length} ${activeTargetPages.length === 1 ? 'page' : 'pages'} (Pages: ${activeTargetPages.join(', ')}). Ready for download!`);
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

  // Page aspect ratio for container styling
  const aspectRatio =
    currentPageDimension.width && currentPageDimension.height
      ? `${currentPageDimension.width} / ${currentPageDimension.height}`
      : '3 / 4';

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
              Client-side PDF signature tool with full PDF visual rendering & multi-page placement support.
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
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700 disabled:opacity-50"
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
              <span>2. Pages & Placement</span>
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
                        {[
                          { name: 'Dark Navy', hex: '#0F172A' },
                          { name: 'Royal Blue', hex: '#1E3A8A' },
                          { name: 'Crimson', hex: '#991B1B' },
                          { name: 'Forest', hex: '#065F46' },
                        ].map((c) => (
                          <button
                            key={c.hex}
                            title={c.name}
                            onClick={() => setPenColor(c.hex)}
                            className={`w-5 h-5 rounded-full border border-white/20 transition-transform ${
                              penColor === c.hex ? 'scale-125 ring-2 ring-indigo-400' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
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
                      width={520}
                      height={150}
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
                      placeholder="e.g. Alex Morgan"
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
                        Ink Color
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

              {/* Signer Identity & Date of Signature Quick Bar */}
              <div className="p-3.5 rounded-xl bg-slate-800/70 border border-slate-700/70 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span className="text-xs font-bold text-slate-200">Signer Identity & Date</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Defaults to Today</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Signer Name
                    </label>
                    <input
                      type="text"
                      value={printedNameText}
                      onChange={(e) => {
                        setPrintedNameText(e.target.value);
                        if (sigMode === 'type') setTypedName(e.target.value);
                      }}
                      placeholder="e.g. Alex Morgan"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-medium text-xs focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-indigo-400" />
                        <span>Date of Signature</span>
                      </label>
                      <button
                        onClick={handleSetTodayDate}
                        type="button"
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-0.5 hover:underline cursor-pointer"
                        title="Reset date to today"
                      >
                        <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                        <span>Today</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={datePickerValue}
                        onChange={(e) => handleDatePicked(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PAGES & PLACEMENT */}
          {activeTab === 'placement' && (
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-5">
              {/* Target Pages Selector */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                    <span>Target Pages to Sign</span>
                  </label>
                  <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                    Signing: {activeTargetPages.length} of {totalPages} {totalPages === 1 ? 'page' : 'pages'}
                  </span>
                </div>

                {/* Primary Mode Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'all', label: 'All Pages', desc: `Every page (1-${totalPages})` },
                    { id: 'first', label: 'First Page', desc: 'Page 1 only' },
                    { id: 'last', label: 'Last Page', desc: `Page ${totalPages} only` },
                    { id: 'custom', label: 'Single Page', desc: 'Pick any one page' },
                    { id: 'selected', label: 'Select Specific', desc: 'Check individual pages' },
                    { id: 'range', label: 'Custom Range', desc: 'e.g. 1-3, 5' },
                  ].map((target) => (
                    <button
                      key={target.id}
                      onClick={() => {
                        const mode = target.id as PageTargetMode;
                        setPagesToSign(mode);
                        if (mode === 'first') setSelectedPageNum(1);
                        if (mode === 'last' && metadata) setSelectedPageNum(metadata.pageCount);
                        if (mode === 'custom') setCustomPageNum(selectedPageNum);
                        if (mode === 'selected' && selectedPages.length === 0) {
                          setSelectedPages([selectedPageNum]);
                        }
                      }}
                      className={`p-2.5 rounded-xl text-left border transition-all ${
                        pagesToSign === target.id
                          ? 'bg-indigo-600/90 text-white border-indigo-500 shadow-md ring-1 ring-indigo-400/50'
                          : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="font-bold text-xs">{target.label}</div>
                      <div className="text-[10px] opacity-80 truncate mt-0.5">{target.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Sub-controls based on selection mode */}
                {pagesToSign === 'custom' && (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-300">Target Page:</span>
                      <select
                        value={customPageNum}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setCustomPageNum(val);
                          setSelectedPageNum(val);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs font-semibold focus:outline-hidden"
                      >
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                          <option key={p} value={p}>
                            Page {p} of {totalPages}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setCustomPageNum(selectedPageNum);
                      }}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20"
                    >
                      Set to Currently Viewed Page ({selectedPageNum})
                    </button>
                  </div>
                )}

                {pagesToSign === 'selected' && (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">Select Individual Pages:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAllPages}
                          className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                        >
                          Select All
                        </button>
                        <span className="text-slate-600">|</span>
                        <button
                          onClick={() => setSelectedPages([1])}
                          className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold hover:underline"
                        >
                          Reset to Page 1
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 bg-slate-900/60 rounded-lg border border-slate-800">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                        const isChecked = selectedPages.includes(p);
                        return (
                          <button
                            key={p}
                            onClick={() => {
                              handleTogglePageCheckbox(p);
                              setSelectedPageNum(p);
                            }}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-mono font-medium border transition-colors ${
                              isChecked
                                ? 'bg-indigo-600 text-white border-indigo-500'
                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-slate-200'
                            }`}
                          >
                            {isChecked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3 opacity-40" />}
                            <span>Page {p}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {pagesToSign === 'range' && (
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2">
                    <label className="block text-xs font-semibold text-slate-300">
                      Enter Page Range Expression:
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={pageRangeStr}
                        onChange={(e) => setPageRangeStr(e.target.value)}
                        placeholder={`e.g. 1, 3-${Math.min(totalPages, 5)} or all`}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                      />
                      <span className="text-xs text-slate-400 font-mono">
                        ({activeTargetPages.length} pages: {activeTargetPages.join(', ') || 'none'})
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Placement Presets Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Position Preset on Target Pages
                  </label>
                  <span className="text-[11px] text-indigo-400 font-medium">
                    (or drag directly on document)
                  </span>
                </div>
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
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs'
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
                    max="100"
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
                    <span>Y Position Offset (from bottom)</span>
                    <span className="font-mono text-indigo-400">{customYPercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
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
                    <span className="font-mono text-indigo-400">{sigWidth} pt</span>
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

              {/* Date Stamp Toggle & Settings */}
              <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold text-slate-200">Date of Signature</span>
                      <p className="text-[10px] text-slate-400">Embeds date stamp (default: current date)</p>
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
                  <div className="space-y-2.5 pt-2 border-t border-slate-700/60">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Pick Date
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="date"
                            value={datePickerValue}
                            onChange={(e) => handleDatePicked(e.target.value)}
                            className="flex-1 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                          />
                          <button
                            onClick={handleSetTodayDate}
                            type="button"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-xs font-semibold cursor-pointer transition-colors"
                            title="Reset to current date"
                          >
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Today</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Signature Date Display Text
                        </label>
                        <input
                          type="text"
                          value={dateText}
                          onChange={(e) => setDateText(e.target.value)}
                          placeholder="e.g. 2026-08-22 or Aug 22, 2026"
                          className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    {/* Quick Format Presets */}
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                        Quick Format Presets:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApplyDateFormat('iso')}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                            dateFormat === 'iso'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          YYYY-MM-DD
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDateFormat('long')}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                            dateFormat === 'long'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          Month DD, YYYY
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDateFormat('short-us')}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                            dateFormat === 'short-us'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          MM/DD/YYYY
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyDateFormat('short-eu')}
                          className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                            dateFormat === 'short-eu'
                              ? 'bg-indigo-600 text-white border-indigo-500'
                              : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          DD/MM/YYYY
                        </button>
                        <button
                          type="button"
                          onClick={handleAppendCurrentTime}
                          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-mono border bg-slate-900 text-indigo-300 border-slate-700 hover:bg-slate-800 hover:text-indigo-200"
                          title="Append current time"
                        >
                          <Clock className="w-3 h-3" />
                          <span>+ Time</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

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
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isProcessing ? (
                <span>Embedding Signature Across {activeTargetPages.length} {activeTargetPages.length === 1 ? 'Page' : 'Pages'}...</span>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>
                    Generate Signed PDF ({activeTargetPages.length} {activeTargetPages.length === 1 ? 'Page' : 'Pages'})
                  </span>
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
          {/* Preview Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-400" />
              <span className="font-bold text-xs text-slate-200">Interactive PDF View</span>
            </div>

            {/* Document View Switcher (Original vs Signed) */}
            {signedPdfBytes && (
              <div className="flex items-center p-0.5 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                <button
                  onClick={() => setPreviewDocType('original')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    previewDocType === 'original'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Original + Overlay
                </button>
                <button
                  onClick={() => setPreviewDocType('signed')}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                    previewDocType === 'signed'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Signed PDF
                </button>
              </div>
            )}

            {/* Page Navigation */}
            {metadata && metadata.pageCount > 1 && (
              <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700 text-xs">
                <button
                  onClick={() => setSelectedPageNum((p) => Math.max(1, p - 1))}
                  disabled={selectedPageNum <= 1}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>

                <span className="font-mono text-slate-200 text-[11px] px-1 font-semibold">
                  Page {selectedPageNum} / {metadata.pageCount}
                </span>

                <button
                  onClick={() => setSelectedPageNum((p) => Math.min(metadata.pageCount, p + 1))}
                  disabled={selectedPageNum >= metadata.pageCount}
                  className="p-0.5 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-30"
                  title="Next Page"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Quick Page Signing Status & Toggle Bar */}
          {metadata && metadata.pageCount > 1 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isCurrentPageSigned ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-slate-600'
                  }`}
                />
                <span className="font-semibold text-slate-200">
                  {isCurrentPageSigned ? `Signing Page ${selectedPageNum}` : `Page ${selectedPageNum} not targeted`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleCurrentPageSigning}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    isCurrentPageSigned
                      ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20'
                      : 'bg-indigo-600 text-white hover:bg-indigo-500'
                  }`}
                >
                  {isCurrentPageSigned ? (
                    <>
                      <Minus className="w-3 h-3" />
                      <span>Remove this page</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Sign this page</span>
                    </>
                  )}
                </button>

                {pagesToSign !== 'all' && (
                  <button
                    onClick={handleSelectAllPages}
                    className="px-2 py-1 rounded-md text-[11px] font-semibold bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                  >
                    Sign All
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Page Visual Canvas Container */}
          <div
            ref={previewContainerRef}
            onClick={previewDocType === 'original' ? handlePreviewClick : undefined}
            style={{ aspectRatio }}
            className="relative w-full rounded-2xl bg-white border-2 border-slate-700 shadow-2xl overflow-hidden select-none cursor-crosshair group flex items-center justify-center"
          >
            {/* Loading Indicator */}
            {isRenderingPage && (
              <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xs flex flex-col items-center justify-center text-white gap-2">
                <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">Rendering PDF Page...</span>
              </div>
            )}

            {/* Error state */}
            {renderError && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4 text-center text-rose-500 bg-white">
                <AlertCircle className="w-8 h-8 mb-2" />
                <span className="text-xs font-semibold">{renderError}</span>
              </div>
            )}

            {/* Rendered PDF Page Canvas */}
            <canvas
              ref={pageCanvasRef}
              className="w-full h-full object-contain pointer-events-none block"
            />

            {/* Interactive Signature Overlay (Visible in Original mode) */}
            {previewDocType === 'original' && signatureDataUrl && (
              <>
                {isCurrentPageSigned ? (
                  <div
                    onMouseDown={handleStartDrag}
                    onTouchStart={handleStartDrag}
                    className={`absolute transition-shadow duration-75 cursor-grab active:cursor-grabbing group/sig ${
                      isDragging ? 'ring-2 ring-indigo-500 shadow-2xl scale-[1.02]' : 'hover:ring-1 hover:ring-indigo-400'
                    }`}
                    style={{
                      left: `${positionResult.uiLeftPercent}%`,
                      top: `${positionResult.uiTopPercent}%`,
                      width: `${positionResult.uiWidthPercent}%`,
                      height: `${positionResult.uiHeightPercent}%`,
                      opacity: opacity,
                    }}
                  >
                    <div
                      className={`w-full h-full flex flex-col justify-between p-1.5 rounded-md select-none overflow-hidden ${
                        showBorder
                          ? 'bg-indigo-50/95 border-2 shadow-md'
                          : 'bg-white/40 border border-dashed border-indigo-400'
                      }`}
                      style={{
                        borderColor: showBorder ? borderColorHex : 'rgba(99, 102, 241, 0.6)',
                      }}
                    >
                      {/* Top Header Badge */}
                      {showBorder && (
                        <div
                          className="text-[6.5px] font-bold px-1.5 py-0.5 rounded text-white self-start inline-block tracking-wider uppercase"
                          style={{ backgroundColor: borderColorHex }}
                        >
                          DIGITALLY SIGNED
                        </div>
                      )}

                      {/* Signature Image */}
                      <div className="flex-1 flex items-center justify-center overflow-hidden my-0.5 pointer-events-none">
                        <img
                          src={signatureDataUrl}
                          alt="Signature"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>

                      {/* Text Annotations */}
                      {boxMetrics.textLines.length > 0 && (
                        <div className="space-y-0.5 leading-none pt-0.5 border-t border-slate-200/60 pointer-events-none">
                          {includePrintedName && (
                            <div
                              className="text-[8px] font-bold truncate"
                              style={{ color: fontColorHex }}
                            >
                              Signed by: {printedNameText}
                            </div>
                          )}
                          {includeDate && (
                            <div
                              className="text-[7.5px] font-mono truncate opacity-90"
                              style={{ color: fontColorHex }}
                            >
                              Date: {dateText}
                            </div>
                          )}
                          {includeReason && (
                            <div
                              className="text-[7.5px] font-mono truncate opacity-90"
                              style={{ color: fontColorHex }}
                            >
                              Note: {reasonText}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Drag handle tooltip on hover */}
                      <div className="absolute top-1 right-1 opacity-0 group-hover/sig:opacity-100 transition-opacity bg-slate-900/80 text-white rounded p-0.5">
                        <Move className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center">
                    <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl text-slate-200 max-w-xs space-y-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto">
                        <FileCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-white">Signature Not on Page {selectedPageNum}</h4>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Signature is currently configured to stamp {activeTargetPages.length} {activeTargetPages.length === 1 ? 'page' : 'pages'} (Pages {activeTargetPages.join(', ')}).
                        </p>
                      </div>
                      <div className="flex items-center gap-2 justify-center pt-1">
                        <button
                          onClick={handleToggleCurrentPageSigning}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors"
                        >
                          + Sign Page {selectedPageNum}
                        </button>
                        <button
                          onClick={handleSelectAllPages}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
                        >
                          Sign All Pages
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Click-to-place helper banner */}
            {previewDocType === 'original' && isCurrentPageSigned && (
              <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-semibold bg-slate-900/80 text-slate-200 px-3 py-1 rounded-full backdrop-blur-xs border border-slate-700 shadow-md">
                  💡 Click or drag signature to reposition anywhere on the page
                </span>
              </div>
            )}
          </div>

          {/* Multi-page Thumbnail Pill Strip */}
          {metadata && metadata.pageCount > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-0.5">
              {Array.from({ length: metadata.pageCount }, (_, i) => i + 1).map((p) => {
                const isSelected = selectedPageNum === p;
                const isSigned = activeTargetPages.includes(p);
                return (
                  <button
                    key={p}
                    onClick={() => setSelectedPageNum(p)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 border transition-all ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-500/30'
                        : isSigned
                        ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-900 text-slate-500 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>Page {p}</span>
                    {isSigned && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Signed" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Download Signed File Card */}
          {signedPdfBytes && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-sm text-white">Signed PDF Ready</span>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  {Math.round(signedPdfBytes.length / 1024)} KB
                </span>
              </div>
              <p className="text-xs text-slate-300">
                The digital signature and metadata have been embedded across {activeTargetPages.length} {activeTargetPages.length === 1 ? 'page' : 'pages'} (Pages {activeTargetPages.join(', ')}).
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors shadow-sm cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Signed PDF</span>
                </button>

                <button
                  onClick={() => setPreviewDocType(previewDocType === 'signed' ? 'original' : 'signed')}
                  className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors border border-slate-700"
                >
                  {previewDocType === 'signed' ? 'Edit Placement' : 'View Signed'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
