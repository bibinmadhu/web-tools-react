import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

export type PageTargetMode = 'all' | 'first' | 'last' | 'custom' | 'selected' | 'range';

export interface PdfSignOptions {
  pdfBuffer: ArrayBuffer | Uint8Array;
  signatureDataUrl: string; // PNG base64 data URL
  pagesToSign: PageTargetMode;
  customPageNum?: number; // 1-indexed for single page
  selectedPages?: number[]; // 1-indexed list of pages e.g. [1, 3, 5]
  pageRangeStr?: string; // e.g. "1, 3-5, 8"
  position: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'center' | 'custom';
  customXPercent?: number; // 0 - 100
  customYPercent?: number; // 0 - 100
  sigWidth?: number; // default 160
  sigHeight?: number; // default 65
  printedName?: string;
  signDate?: string;
  signReason?: string;
  showBorder?: boolean;
  borderColorHex?: string; // default '#3B82F6'
  opacity?: number; // 0.1 to 1.0
  fontColorHex?: string; // default '#1E293B'
}

export interface PdfMetadata {
  pageCount: number;
  pagesDimensions: Array<{ width: number; height: number }>;
}

export interface SignatureBoxMetrics {
  totalBoxWidth: number;
  totalBoxHeight: number;
  sigWidth: number;
  sigHeight: number;
  sigXOffset: number;
  sigYOffset: number;
  textBlockHeight: number;
  textLines: string[];
}

export interface BoxPositionResult {
  pdfX: number; // PDF coordinates (bottom-left)
  pdfY: number;
  uiLeftPercent: number; // 0..100 % from left of page container
  uiTopPercent: number; // 0..100 % from top of page container
  uiWidthPercent: number; // 0..100 % width of page container
  uiHeightPercent: number; // 0..100 % height of page container
}

// Convert hex color (#RRGGBB) to rgb object (0..1 scale)
function hexToRgbColor(hex: string) {
  const cleanHex = (hex || '#1E293B').replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2) || '00', 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4) || '00', 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6) || '00', 16) / 255;
  return rgb(
    isNaN(r) ? 0.1 : r,
    isNaN(g) ? 0.15 : g,
    isNaN(b) ? 0.25 : b
  );
}

/**
 * Parses user input like "1, 3-5, 8" into an array of 1-indexed unique sorted page numbers.
 */
export function parsePageRange(rangeStr: string, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) return [];
  const clean = rangeStr.trim().toLowerCase();
  if (clean === 'all') {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pagesSet = new Set<number>();
  const parts = clean.split(/[,;\s]+/);

  for (const part of parts) {
    if (!part) continue;
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let i = min; i <= max; i++) {
          pagesSet.add(i);
        }
      }
    } else {
      const page = parseInt(part, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pagesSet.add(page);
      }
    }
  }

  return Array.from(pagesSet).sort((a, b) => a - b);
}

/**
 * Resolves which 1-indexed page numbers should be signed based on options and total page count.
 */
export function resolveTargetPageNumbers(
  pagesToSign: PageTargetMode,
  totalPages: number,
  customPageNum?: number,
  selectedPages?: number[],
  pageRangeStr?: string
): number[] {
  if (totalPages <= 0) return [1];

  switch (pagesToSign) {
    case 'all':
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    case 'first':
      return [1];
    case 'last':
      return [totalPages];
    case 'custom': {
      const p = customPageNum ? Math.max(1, Math.min(customPageNum, totalPages)) : 1;
      return [p];
    }
    case 'selected': {
      if (selectedPages && selectedPages.length > 0) {
        const filtered = selectedPages.filter((p) => p >= 1 && p <= totalPages);
        return filtered.length > 0 ? Array.from(new Set(filtered)).sort((a, b) => a - b) : [1];
      }
      return [1];
    }
    case 'range': {
      const parsed = parsePageRange(pageRangeStr || '', totalPages);
      return parsed.length > 0 ? parsed : [1];
    }
    default:
      return [1];
  }
}

/**
 * Computes exact bounding box dimensions and sub-element offsets
 * for consistent rendering in both the visual canvas UI and the PDF document.
 */
export function computeSignatureBoxMetrics(options: {
  sigWidth?: number;
  sigHeight?: number;
  printedName?: string;
  signDate?: string;
  signReason?: string;
  showBorder?: boolean;
}): SignatureBoxMetrics {
  const sigWidth = options.sigWidth || 160;
  const sigHeight = options.sigHeight || 65;
  const showBorder = options.showBorder ?? true;

  const textLines: string[] = [];
  if (options.printedName?.trim()) textLines.push(`Signed by: ${options.printedName.trim()}`);
  if (options.signDate?.trim()) textLines.push(`Date: ${options.signDate.trim()}`);
  if (options.signReason?.trim()) textLines.push(`Note: ${options.signReason.trim()}`);

  const textLineHeight = 11;
  const textBlockHeight = textLines.length > 0 ? textLines.length * textLineHeight + 4 : 0;

  const minWidth = textLines.length > 0 ? 170 : 110;
  const totalBoxWidth = Math.max(sigWidth + (showBorder ? 20 : 8), minWidth);
  const badgeHeight = showBorder ? 14 : 0;
  const totalBoxHeight = sigHeight + textBlockHeight + badgeHeight + (showBorder ? 12 : 4);

  const sigXOffset = (totalBoxWidth - sigWidth) / 2;
  const sigYOffset = textBlockHeight + (showBorder ? 6 : 2);

  return {
    totalBoxWidth,
    totalBoxHeight,
    sigWidth,
    sigHeight,
    sigXOffset,
    sigYOffset,
    textBlockHeight,
    textLines,
  };
}

/**
 * Calculates exact PDF point coordinates and UI percentage coordinates
 * to guarantee 1:1 mathematical alignment between preview and generated PDF.
 */
export function calculateBoxPosition(
  pageWidth: number,
  pageHeight: number,
  boxWidth: number,
  boxHeight: number,
  position: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'center' | 'custom',
  customXPercent: number = 60,
  customYPercent: number = 10,
  margin: number = 24
): BoxPositionResult {
  const safePageWidth = Math.max(100, pageWidth || 600);
  const safePageHeight = Math.max(100, pageHeight || 800);

  const maxX = Math.max(0, safePageWidth - boxWidth);
  const maxY = Math.max(0, safePageHeight - boxHeight);

  let pdfX = 0;
  let pdfY = 0;

  switch (position) {
    case 'bottom-right':
      pdfX = safePageWidth - boxWidth - margin;
      pdfY = margin;
      break;
    case 'bottom-left':
      pdfX = margin;
      pdfY = margin;
      break;
    case 'bottom-center':
      pdfX = (safePageWidth - boxWidth) / 2;
      pdfY = margin;
      break;
    case 'top-right':
      pdfX = safePageWidth - boxWidth - margin;
      pdfY = safePageHeight - boxHeight - margin;
      break;
    case 'top-left':
      pdfX = margin;
      pdfY = safePageHeight - boxHeight - margin;
      break;
    case 'center':
      pdfX = (safePageWidth - boxWidth) / 2;
      pdfY = (safePageHeight - boxHeight) / 2;
      break;
    case 'custom':
      pdfX = (customXPercent / 100) * maxX;
      pdfY = (customYPercent / 100) * maxY;
      break;
  }

  // Clamp within bounds
  pdfX = Math.max(0, Math.min(pdfX, maxX));
  pdfY = Math.max(0, Math.min(pdfY, maxY));

  // Convert to UI percentages (0..100% from top-left)
  const uiLeftPercent = (pdfX / safePageWidth) * 100;
  const uiTopPercent = ((safePageHeight - (pdfY + boxHeight)) / safePageHeight) * 100;
  const uiWidthPercent = (boxWidth / safePageWidth) * 100;
  const uiHeightPercent = (boxHeight / safePageHeight) * 100;

  return {
    pdfX,
    pdfY,
    uiLeftPercent,
    uiTopPercent,
    uiWidthPercent,
    uiHeightPercent,
  };
}

/**
 * Creates a clean sample multi-page PDF document for instant user testing.
 */
export async function createSamplePdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const page1 = pdfDoc.addPage([600, 800]);
  page1.drawText('NON-DISCLOSURE & SERVICE AGREEMENT', {
    x: 50,
    y: 730,
    size: 20,
    font,
    color: rgb(0.06, 0.09, 0.16),
  });

  page1.drawText('Document ID: DOC-2026-8849A  |  Date: August 2026', {
    x: 50,
    y: 705,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.45, 0.55),
  });

  // Decorative header bar
  page1.drawRectangle({
    x: 50,
    y: 690,
    width: 500,
    height: 2,
    color: rgb(0.38, 0.4, 0.94),
  });

  const bodyParagraphs = [
    '1. PARTIES & PURPOSE: This Non-Disclosure & Service Agreement ("Agreement") is entered into',
    '   by and between the Disclosing Party and the Receiving Party for evaluating business synergies.',
    '',
    '2. CONFIDENTIAL INFORMATION: Confidential Information shall include all technical data, specifications,',
    '   trade secrets, software code, financial projections, and proprietary tools disclosed.',
    '',
    '3. OBLIGATIONS: The Receiving Party agrees to hold all Confidential Information in strict confidence',
    '   and shall not disclose, copy, or distribute it without explicit prior written consent.',
    '',
    '4. TERM & TERMINATION: This Agreement remains binding for a period of three (3) years from the date',
    '   of execution. Either party may terminate this agreement upon 30 days written notice.',
    '',
    '5. ACKNOWLEDGMENT & SIGNATURES: By affixing a digital signature below, the authorized signatories',
    '   confirm full comprehension and acceptance of all terms contained herein.',
  ];

  let currentY = 650;
  for (const line of bodyParagraphs) {
    if (line.trim()) {
      page1.drawText(line, {
        x: 50,
        y: currentY,
        size: 10.5,
        font: regularFont,
        color: rgb(0.2, 0.25, 0.35),
      });
    }
    currentY -= 20;
  }

  // Placeholder signature box guideline on Page 1
  page1.drawRectangle({
    x: 340,
    y: 70,
    width: 210,
    height: 90,
    borderColor: rgb(0.75, 0.8, 0.9),
    borderWidth: 1,
  });

  page1.drawText('AUTHORIZED SIGNATURE LOCATION', {
    x: 355,
    y: 145,
    size: 7.5,
    font,
    color: rgb(0.55, 0.6, 0.7),
  });

  // Page 2 - Appendix
  const page2 = pdfDoc.addPage([600, 800]);
  page2.drawText('APPENDIX A: TECHNICAL SPECIFICATIONS', {
    x: 50,
    y: 730,
    size: 18,
    font,
    color: rgb(0.06, 0.09, 0.16),
  });

  page2.drawText('System Requirements & Security Protocols', {
    x: 50,
    y: 705,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.45, 0.55),
  });

  page2.drawRectangle({
    x: 50,
    y: 690,
    width: 500,
    height: 2,
    color: rgb(0.38, 0.4, 0.94),
  });

  const page2Lines = [
    'Section A.1: Digital Signature Integrity',
    'All electronic signatures, timestamps, and metadata tags are embedded directly into the',
    'document structure according to standard PDF 1.7 specifications.',
    '',
    'Section A.2: Client-Side Security Assurance',
    'Document manipulation and rendering is performed entirely within the client runtime sandbox.',
    'No sensitive document data or cryptographic tokens are ever transmitted to external endpoints.',
    '',
    'Section A.3: Multi-Page Endorsement & Notarization',
    'Signatures may be affixed across all pages or designated individual pages per compliance standards.',
  ];

  let currentY2 = 640;
  for (const line of page2Lines) {
    if (line.trim()) {
      page2.drawText(line, {
        x: 50,
        y: currentY2,
        size: 10.5,
        font: line.startsWith('Section') ? font : regularFont,
        color: line.startsWith('Section') ? rgb(0.1, 0.15, 0.25) : rgb(0.3, 0.35, 0.45),
      });
    }
    currentY2 -= 22;
  }

  // Page 3 - Sign-off Confirmation
  const page3 = pdfDoc.addPage([600, 800]);
  page3.drawText('FINAL SIGN-OFF & ATTESTATION', {
    x: 50,
    y: 730,
    size: 18,
    font,
    color: rgb(0.06, 0.09, 0.16),
  });

  page3.drawText('Page 3 of 3 - Execution Copy', {
    x: 50,
    y: 705,
    size: 10,
    font: regularFont,
    color: rgb(0.4, 0.45, 0.55),
  });

  page3.drawRectangle({
    x: 50,
    y: 690,
    width: 500,
    height: 2,
    color: rgb(0.38, 0.4, 0.94),
  });

  const page3Lines = [
    'Attestation Statement:',
    'The signatories hereby confirm that they possess the necessary legal authority to execute',
    'this document and bind their respective organizations to its obligations.',
    '',
    'Verification hash and digital integrity checksum will be generated at the time of export.',
  ];

  let currentY3 = 640;
  for (const line of page3Lines) {
    if (line.trim()) {
      page3.drawText(line, {
        x: 50,
        y: currentY3,
        size: 10.5,
        font: line.startsWith('Attestation') ? font : regularFont,
        color: line.startsWith('Attestation') ? rgb(0.1, 0.15, 0.25) : rgb(0.3, 0.35, 0.45),
      });
    }
    currentY3 -= 22;
  }

  return await pdfDoc.save();
}

/**
 * Parses PDF bytes and extracts page count & dimensions.
 */
export async function getPdfMetadata(pdfBuffer: ArrayBuffer | Uint8Array): Promise<PdfMetadata> {
  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  const pagesDimensions = pdfDoc.getPages().map((page) => ({
    width: page.getWidth(),
    height: page.getHeight(),
  }));
  return { pageCount, pagesDimensions };
}

/**
 * Embeds signature, printed name, date, and bounding box onto the PDF document across all targeted pages.
 */
export async function signPdfDocument(options: PdfSignOptions): Promise<Uint8Array> {
  const {
    pdfBuffer,
    signatureDataUrl,
    pagesToSign,
    customPageNum = 1,
    selectedPages = [1],
    pageRangeStr = '',
    position,
    customXPercent = 60,
    customYPercent = 10,
    sigWidth = 160,
    sigHeight = 65,
    printedName = '',
    signDate = '',
    signReason = '',
    showBorder = true,
    borderColorHex = '#3B82F6',
    opacity = 1.0,
    fontColorHex = '#1E293B',
  } = options;

  const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
  const totalPages = pdfDoc.getPageCount();

  // Embed PNG signature image
  const pngImage = await pdfDoc.embedPng(signatureDataUrl);

  // Embed fonts for additional annotations
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Identify target page numbers (1-indexed)
  const targetPageNumbers = resolveTargetPageNumbers(
    pagesToSign,
    totalPages,
    customPageNum,
    selectedPages,
    pageRangeStr
  );

  // Convert 1-indexed to 0-indexed indices
  const targetIndices = targetPageNumbers
    .map((p) => p - 1)
    .filter((idx) => idx >= 0 && idx < totalPages);

  const textColor = hexToRgbColor(fontColorHex);
  const borderColor = hexToRgbColor(borderColorHex);

  const metrics = computeSignatureBoxMetrics({
    sigWidth,
    sigHeight,
    printedName,
    signDate,
    signReason,
    showBorder,
  });

  for (const pageIdx of targetIndices) {
    const page = pdfDoc.getPage(pageIdx);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    const { pdfX, pdfY } = calculateBoxPosition(
      pageWidth,
      pageHeight,
      metrics.totalBoxWidth,
      metrics.totalBoxHeight,
      position,
      customXPercent,
      customYPercent,
      24
    );

    // Bounding Box & Background Frame
    if (showBorder) {
      // Light background fill
      page.drawRectangle({
        x: pdfX,
        y: pdfY,
        width: metrics.totalBoxWidth,
        height: metrics.totalBoxHeight,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: borderColor,
        borderWidth: 1.5,
        opacity: Math.min(opacity, 0.95),
      });

      // Top title bar tag inside the box
      page.drawRectangle({
        x: pdfX + 8,
        y: pdfY + metrics.totalBoxHeight - 14,
        width: 85,
        height: 10,
        color: borderColor,
        opacity: 0.85,
      });

      page.drawText('DIGITALLY SIGNED', {
        x: pdfX + 12,
        y: pdfY + metrics.totalBoxHeight - 11,
        size: 6,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    // Draw Signature Image
    const sigX = pdfX + metrics.sigXOffset;
    const sigY = pdfY + metrics.sigYOffset;

    page.drawImage(pngImage, {
      x: sigX,
      y: sigY,
      width: metrics.sigWidth,
      height: metrics.sigHeight,
      opacity: opacity,
    });

    // Draw Text Metadata Below Signature
    if (metrics.textLines.length > 0) {
      let currentTextY = pdfY + metrics.textBlockHeight - 1;
      for (const line of metrics.textLines) {
        page.drawText(line, {
          x: pdfX + (showBorder ? 8 : 4),
          y: currentTextY,
          size: 8,
          font: line.startsWith('Signed by:') ? fontBold : fontRegular,
          color: textColor,
          opacity: opacity,
        });
        currentTextY -= 11;
      }
    }
  }

  return await pdfDoc.save();
}
