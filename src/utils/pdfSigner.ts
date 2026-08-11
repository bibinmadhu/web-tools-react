import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';

export interface PdfSignOptions {
  pdfBuffer: ArrayBuffer | Uint8Array;
  signatureDataUrl: string; // PNG base64 data URL
  pagesToSign: 'first' | 'last' | 'all' | 'custom';
  customPageNum?: number; // 1-indexed
  position: 'bottom-right' | 'bottom-left' | 'bottom-center' | 'top-right' | 'top-left' | 'center' | 'custom';
  customXPercent?: number; // 0 - 100
  customYPercent?: number; // 0 - 100
  sigWidth?: number; // default 160
  sigHeight?: number; // default 60
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

// Convert hex color (#RRGGBB) to rgb object (0..1 scale)
function hexToRgbColor(hex: string) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2) || '00', 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4) || '00', 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6) || '00', 16) / 255;
  return rgb(r, g, b);
}

/**
 * Creates a simple sample multi-page PDF document for instant user testing.
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

  page1.drawText('Document ID: DOC-2026-8849A  |  Date: August 11, 2026', {
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
    page1.drawText(line, {
      x: 50,
      y: currentY,
      size: 11,
      font: regularFont,
      color: rgb(0.2, 0.25, 0.35),
    });
    currentY -= 22;
  }

  // Placeholder signature box guideline on Page 1
  page1.drawRectangle({
    x: 330,
    y: 80,
    width: 220,
    height: 90,
    borderColor: rgb(0.8, 0.85, 0.9),
    borderWidth: 1,
  });

  page1.drawText('AUTHORIZED SIGNATURE LOCATION', {
    x: 350,
    y: 155,
    size: 8,
    font,
    color: rgb(0.6, 0.65, 0.75),
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

  page2.drawText('All communications, signatures, and document checksums are verified client-side.', {
    x: 50,
    y: 650,
    size: 11,
    font: regularFont,
    color: rgb(0.2, 0.25, 0.35),
  });

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
 * Embeds signature, printed name, date, and bounding box onto the PDF document.
 */
export async function signPdfDocument(options: PdfSignOptions): Promise<Uint8Array> {
  const {
    pdfBuffer,
    signatureDataUrl,
    pagesToSign,
    customPageNum = 1,
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

  // Identify target page indices (0-indexed)
  let targetIndices: number[] = [];
  if (pagesToSign === 'first') {
    targetIndices = [0];
  } else if (pagesToSign === 'last') {
    targetIndices = [totalPages - 1];
  } else if (pagesToSign === 'all') {
    targetIndices = Array.from({ length: totalPages }, (_, i) => i);
  } else if (pagesToSign === 'custom') {
    const validPage = Math.max(1, Math.min(customPageNum, totalPages));
    targetIndices = [validPage - 1];
  }

  const textColor = hexToRgbColor(fontColorHex);
  const borderColor = hexToRgbColor(borderColorHex);

  for (const pageIdx of targetIndices) {
    const page = pdfDoc.getPage(pageIdx);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    // Determine extra text lines
    const textLines: string[] = [];
    if (printedName.trim()) textLines.push(`Signed by: ${printedName.trim()}`);
    if (signDate.trim()) textLines.push(`Date: ${signDate.trim()}`);
    if (signReason.trim()) textLines.push(`Note: ${signReason.trim()}`);

    const textFontSize = 8;
    const textLineHeight = 11;
    const textBlockHeight = textLines.length > 0 ? textLines.length * textLineHeight + 6 : 0;

    const totalBoxWidth = Math.max(sigWidth + 20, 180);
    const totalBoxHeight = sigHeight + textBlockHeight + 16;

    // Calculate position X & Y (pdf-lib coordinates start at Bottom-Left (0,0))
    let x = 0;
    let y = 0;

    const margin = 30;

    switch (position) {
      case 'bottom-right':
        x = pageWidth - totalBoxWidth - margin;
        y = margin;
        break;
      case 'bottom-left':
        x = margin;
        y = margin;
        break;
      case 'bottom-center':
        x = (pageWidth - totalBoxWidth) / 2;
        y = margin;
        break;
      case 'top-right':
        x = pageWidth - totalBoxWidth - margin;
        y = pageHeight - totalBoxHeight - margin;
        break;
      case 'top-left':
        x = margin;
        y = pageHeight - totalBoxHeight - margin;
        break;
      case 'center':
        x = (pageWidth - totalBoxWidth) / 2;
        y = (pageHeight - totalBoxHeight) / 2;
        break;
      case 'custom':
        x = (customXPercent / 100) * (pageWidth - totalBoxWidth);
        y = (customYPercent / 100) * (pageHeight - totalBoxHeight);
        break;
    }

    // Ensure bounds are non-negative
    x = Math.max(10, Math.min(x, pageWidth - totalBoxWidth - 10));
    y = Math.max(10, Math.min(y, pageHeight - totalBoxHeight - 10));

    // Optional Bounding Box & Background
    if (showBorder) {
      // Light background fill
      page.drawRectangle({
        x: x,
        y: y,
        width: totalBoxWidth,
        height: totalBoxHeight,
        color: rgb(0.97, 0.98, 1.0),
        borderColor: borderColor,
        borderWidth: 1.5,
        opacity: Math.min(opacity, 0.95),
      });

      // Top title bar tag inside the box
      page.drawRectangle({
        x: x + 8,
        y: y + totalBoxHeight - 14,
        width: 85,
        height: 10,
        color: borderColor,
        opacity: 0.85,
      });

      page.drawText('DIGITALLY SIGNED', {
        x: x + 12,
        y: y + totalBoxHeight - 11,
        size: 6,
        font: fontBold,
        color: rgb(1, 1, 1),
      });
    }

    // Draw Signature Image
    const sigX = x + (totalBoxWidth - sigWidth) / 2;
    const sigY = y + textBlockHeight + (showBorder ? 8 : 4);

    page.drawImage(pngImage, {
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
      opacity: opacity,
    });

    // Draw Text Metadata Below Signature
    if (textLines.length > 0) {
      let currentTextY = y + textBlockHeight - 2;
      for (const line of textLines) {
        page.drawText(line, {
          x: x + 10,
          y: currentTextY,
          size: textFontSize,
          font: line.startsWith('Signed by:') ? fontBold : fontRegular,
          color: textColor,
          opacity: opacity,
        });
        currentTextY -= textLineHeight;
      }
    }
  }

  return await pdfDoc.save();
}
