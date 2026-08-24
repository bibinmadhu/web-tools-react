import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// Configure Mozilla PDF.js worker
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
  } catch (e) {
    console.warn('PDF.js worker fallback initializing:', e);
  }
}

export interface PdfToMarkdownOptions {
  includeFrontmatter?: boolean;
  detectHeadings?: boolean;
  detectLists?: boolean;
  detectTables?: boolean;
  detectCodeBlocks?: boolean;
  detectBlockquotes?: boolean;
  preservePageDividers?: boolean;
  cleanHyphenation?: boolean;
  cleanRunningHeadersFooters?: boolean;
  bulletStyle?: '-' | '*' | '+';
}

export interface ExtractedPageText {
  pageNumber: number;
  rawText: string;
  lines: string[];
}

export interface PdfExtractionResult {
  title: string;
  author: string;
  creationDate?: string;
  pageCount: number;
  pages: ExtractedPageText[];
  fullRawText: string;
  markdown: string;
}

export interface MarkdownStats {
  words: number;
  characters: number;
  lines: number;
  headings: number;
  lists: number;
  tables: number;
  readingTimeMinutes: number;
}

interface RawTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  hasEOL?: boolean;
}

interface StructuredLine {
  text: string;
  y: number;
  fontSize: number;
  isBold: boolean;
  isMonospace: boolean;
  columns: string[];
}

/**
 * Creates a sample PDF with structured sections, lists, tables, code blocks, and metadata
 * for testing and demonstration of the PDF-to-Markdown converter.
 */
export async function createSampleMarkdownPdf(): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle('DevHub Architecture & Engineering Guide');
  pdfDoc.setAuthor('DevHub Systems Engineering');
  pdfDoc.setSubject('Technical System Specifications & Developer Guidelines');

  const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontBody = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // PAGE 1: Overview, Headings, Lists, Blockquote
  const page1 = pdfDoc.addPage([595.28, 841.89]); // A4
  let y = 790;

  // Header band
  page1.drawRectangle({
    x: 40,
    y: y - 5,
    width: 515,
    height: 38,
    color: rgb(0.12, 0.16, 0.28),
  });
  page1.drawText('TECHNICAL SPECIFICATION', {
    x: 55,
    y: y + 8,
    size: 14,
    font: fontTitle,
    color: rgb(1, 1, 1),
  });
  page1.drawText('DOCUMENT ID: DEV-2026-X9', {
    x: 390,
    y: y + 10,
    size: 9,
    font: fontMono,
    color: rgb(0.6, 0.7, 0.9),
  });

  y -= 45;
  page1.drawText('1. Executive Overview & Architecture', {
    x: 40,
    y,
    size: 16,
    font: fontTitle,
    color: rgb(0.1, 0.15, 0.25),
  });

  y -= 22;
  const p1 = [
    'The DevHub platform provides a unified suite of developer productivity tools executed 100% client-side.',
    'This architecture ensures zero latency, complete offline readiness, and unmatched data security by never',
    'transmitting developer credentials, source code, or private keys over external network boundaries.',
  ];
  for (const line of p1) {
    page1.drawText(line, { x: 40, y, size: 10, font: fontBody, color: rgb(0.2, 0.25, 0.35) });
    y -= 14;
  }

  y -= 12;
  page1.drawText('1.1 Core Engineering Principles', {
    x: 40,
    y,
    size: 13,
    font: fontTitle,
    color: rgb(0.15, 0.2, 0.35),
  });

  y -= 18;
  const bulletItems = [
    '• Deterministic Output: Every transformer produces identical results across runtimes.',
    '• Client-Side Sandboxing: High-performance Web Workers and WebAssembly bindings.',
    '• Zero Data Retention: Strict in-memory volatile state model with opt-in local persistence.',
    '• Multi-Format Interoperability: Seamless conversions between Markdown, JSON, YAML, and PDF.',
  ];
  for (const item of bulletItems) {
    page1.drawText(item, { x: 50, y, size: 9.5, font: fontBody, color: rgb(0.25, 0.3, 0.4) });
    y -= 15;
  }

  y -= 12;
  // Blockquote Box
  page1.drawRectangle({
    x: 40,
    y: y - 35,
    width: 515,
    height: 42,
    color: rgb(0.95, 0.96, 0.99),
    borderColor: rgb(0.25, 0.45, 0.85),
    borderWidth: 1.5,
  });
  page1.drawText('Note: Security Compliance Guidelines', {
    x: 55,
    y: y - 10,
    size: 9.5,
    font: fontTitle,
    color: rgb(0.15, 0.3, 0.65),
  });
  page1.drawText(
    'All conversions adhere to RFC-7763 specifications for Markdown interoperability and CommonMark compatibility.',
    { x: 55, y: y - 24, size: 8.5, font: fontItalic, color: rgb(0.3, 0.35, 0.45) }
  );

  y -= 65;
  page1.drawText('1.2 Supported Conversion Pipelines', {
    x: 40,
    y,
    size: 13,
    font: fontTitle,
    color: rgb(0.15, 0.2, 0.35),
  });

  y -= 18;
  const numberedItems = [
    '1. PDF Document Parsing: Layout analysis, font size classification, and stream decoding.',
    '2. Structural Tokenization: Grouping paragraphs, identifying tabular grids, and lists.',
    '3. GFM Markdown Serialization: Outputting clean GitHub Flavored Markdown with clean tables.',
    '4. Clipboard & File Export: Instant one-click copy and .md artifact downloads.',
  ];
  for (const item of numberedItems) {
    page1.drawText(item, { x: 50, y, size: 9.5, font: fontBody, color: rgb(0.25, 0.3, 0.4) });
    y -= 15;
  }

  // Footer page 1
  page1.drawText('Page 1 of 2 — DevHub Technical Documentation', {
    x: 40,
    y: 35,
    size: 8,
    font: fontMono,
    color: rgb(0.6, 0.65, 0.75),
  });

  // PAGE 2: Tables, Code Blocks, Metadata
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  y = 790;

  page2.drawText('2. Performance Benchmarks & Implementation', {
    x: 40,
    y,
    size: 16,
    font: fontTitle,
    color: rgb(0.1, 0.15, 0.25),
  });

  y -= 24;
  page2.drawText('2.1 Pipeline Execution Benchmarks', {
    x: 40,
    y,
    size: 13,
    font: fontTitle,
    color: rgb(0.15, 0.2, 0.35),
  });

  y -= 18;
  // Draw Table header
  page2.drawRectangle({
    x: 40,
    y: y - 5,
    width: 515,
    height: 22,
    color: rgb(0.9, 0.93, 0.98),
  });
  page2.drawText('Pipeline Component', { x: 50, y: y + 2, size: 9, font: fontTitle, color: rgb(0.1, 0.2, 0.35) });
  page2.drawText('Throughput (Docs/s)', { x: 220, y: y + 2, size: 9, font: fontTitle, color: rgb(0.1, 0.2, 0.35) });
  page2.drawText('Memory Footprint', { x: 360, y: y + 2, size: 9, font: fontTitle, color: rgb(0.1, 0.2, 0.35) });
  page2.drawText('Status', { x: 480, y: y + 2, size: 9, font: fontTitle, color: rgb(0.1, 0.2, 0.35) });

  const tableRows = [
    { name: 'PDF Text Stream Demuxer', rate: '2,450 pgs/s', mem: '14.2 MB', status: 'OPTIMAL' },
    { name: 'Structure Classification Engine', rate: '1,820 pgs/s', mem: '18.6 MB', status: 'OPTIMAL' },
    { name: 'GFM Table & List Formatter', rate: '3,100 pgs/s', mem: '9.4 MB', status: 'OPTIMAL' },
    { name: 'YAML Frontmatter Injector', rate: '9,800 pgs/s', mem: '3.1 MB', status: 'OPTIMAL' },
  ];

  y -= 22;
  for (let i = 0; i < tableRows.length; i++) {
    const row = tableRows[i];
    if (i % 2 === 1) {
      page2.drawRectangle({ x: 40, y: y - 3, width: 515, height: 18, color: rgb(0.97, 0.98, 1.0) });
    }
    page2.drawText(row.name, { x: 50, y: y + 2, size: 8.5, font: fontBody, color: rgb(0.2, 0.25, 0.35) });
    page2.drawText(row.rate, { x: 220, y: y + 2, size: 8.5, font: fontMono, color: rgb(0.15, 0.3, 0.6) });
    page2.drawText(row.mem, { x: 360, y: y + 2, size: 8.5, font: fontMono, color: rgb(0.3, 0.35, 0.45) });
    page2.drawText(row.status, { x: 480, y: y + 2, size: 8, font: fontTitle, color: rgb(0.1, 0.55, 0.3) });
    y -= 18;
  }

  y -= 15;
  page2.drawText('2.2 TypeScript API Integration', {
    x: 40,
    y,
    size: 13,
    font: fontTitle,
    color: rgb(0.15, 0.2, 0.35),
  });

  y -= 18;
  // Code block background
  page2.drawRectangle({
    x: 40,
    y: y - 85,
    width: 515,
    height: 95,
    color: rgb(0.08, 0.11, 0.18),
  });

  const codeLines = [
    'import { convertPdfToMarkdown } from "./pdfToMarkdown";',
    '',
    'const result = await convertPdfToMarkdown(pdfBytes, {',
    '  includeFrontmatter: true,',
    '  detectHeadings: true,',
    '  detectTables: true',
    '});',
    'console.log(result.markdown);',
  ];

  let codeY = y - 8;
  for (const line of codeLines) {
    page2.drawText(line, {
      x: 52,
      y: codeY,
      size: 8.5,
      font: fontMono,
      color: line.startsWith('import') ? rgb(0.4, 0.7, 1) : line.includes('true') ? rgb(0.5, 0.9, 0.6) : rgb(0.9, 0.93, 1),
    });
    codeY -= 11.5;
  }

  // Footer page 2
  page2.drawText('Page 2 of 2 — DevHub Technical Documentation', {
    x: 40,
    y: 35,
    size: 8,
    font: fontMono,
    color: rgb(0.6, 0.65, 0.75),
  });

  return await pdfDoc.save();
}

/**
 * Extracts raw textual lines and metadata from a PDF buffer using Mozilla PDF.js.
 * This handles all PDF versions, FlateDecode compression, ToUnicode font maps,
 * embedded TrueType/Type1 fonts, and spatial text coordinate positioning.
 */
export async function extractPdfTextAndMetadata(pdfBuffer: ArrayBuffer | Uint8Array): Promise<{
  title: string;
  author: string;
  creationDate?: string;
  pageCount: number;
  pages: ExtractedPageText[];
  structuredPages: StructuredLine[][];
  bodyFontSize: number;
  fullRawText: string;
}> {
  // Ensure we have a clean Uint8Array copy
  const data = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  const loadingTask = pdfjsLib.getDocument({
    data,
    useSystemFonts: true,
  } as any);

  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  // Extract document metadata
  let title = '';
  let author = '';
  let creationDate: string | undefined = undefined;

  try {
    const meta: any = await pdfDoc.getMetadata();
    if (meta?.info) {
      title = meta.info.Title || '';
      author = meta.info.Author || '';
      if (meta.info.CreationDate) {
        creationDate = formatPdfDate(meta.info.CreationDate);
      }
    }
  } catch (e) {
    // metadata is optional
  }

  const pages: ExtractedPageText[] = [];
  const structuredPages: StructuredLine[][] = [];
  const fontSizesCollected: number[] = [];

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const rawItems: RawTextItem[] = [];

    for (const item of textContent.items as any[]) {
      if (!item || typeof item.str !== 'string') continue;
      const str = item.str;
      if (!str && !item.hasEOL) continue;

      const transform = item.transform || [1, 0, 0, 1, 0, 0];
      const x = transform[4] || 0;
      const y = transform[5] || 0;
      const height = item.height || Math.abs(transform[0]) || Math.abs(transform[3]) || 10;
      const width = item.width || 0;
      const fontName = (item.fontName || '').toLowerCase();

      rawItems.push({
        str,
        x,
        y,
        width,
        height,
        fontName,
        hasEOL: item.hasEOL,
      });

      if (str.trim().length > 0 && height > 4) {
        fontSizesCollected.push(Math.round(height * 2) / 2);
      }
    }

    // Cluster items into lines based on Y coordinate
    const structuredLines = clusterItemsIntoLines(rawItems);
    structuredPages.push(structuredLines);

    const lineTexts = structuredLines.map((l) => l.text).filter((t) => t.trim().length > 0);
    const rawPageText = lineTexts.join('\n');

    pages.push({
      pageNumber: pageNum,
      rawText: rawPageText,
      lines: lineTexts,
    });
  }

  // Calculate dominant body font size
  const bodyFontSize = calculateDominantFontSize(fontSizesCollected);

  // If title was not in metadata, take the first prominent heading
  if (!title && pages[0]?.lines[0]) {
    title = pages[0].lines[0].replace(/^[#\s*_-]+/, '').trim();
  }

  const fullRawText = pages.map((p) => p.rawText).join('\n\n');

  return {
    title: title || 'PDF Document',
    author: author || '',
    creationDate,
    pageCount,
    pages,
    structuredPages,
    bodyFontSize,
    fullRawText,
  };
}

/**
 * Clusters unordered PDF text fragments into spatially ordered lines and table columns.
 */
function clusterItemsIntoLines(items: RawTextItem[]): StructuredLine[] {
  if (items.length === 0) return [];

  // Group items by Y coordinate with a tolerance of 3.5 points
  const yBuckets: { y: number; items: RawTextItem[] }[] = [];

  for (const item of items) {
    if (!item.str && !item.hasEOL) continue;

    let matchedBucket = yBuckets.find((b) => Math.abs(b.y - item.y) <= 3.5);
    if (!matchedBucket) {
      matchedBucket = { y: item.y, items: [] };
      yBuckets.push(matchedBucket);
    }
    matchedBucket.items.push(item);
  }

  // Sort line buckets from TOP of page to BOTTOM of page (descending Y in PDF coordinates)
  yBuckets.sort((a, b) => b.y - a.y);

  const structuredLines: StructuredLine[] = [];

  for (const bucket of yBuckets) {
    // Sort items left to right
    bucket.items.sort((a, b) => a.x - b.x);

    let lineText = '';
    const columns: string[] = [];
    let currentColumn = '';
    let maxFontSize = 10;
    let isBold = false;
    let isMonospace = false;

    let prevItem: RawTextItem | null = null;

    for (let i = 0; i < bucket.items.length; i++) {
      const cur = bucket.items[i];
      const str = cur.str;

      if (cur.height > maxFontSize) {
        maxFontSize = cur.height;
      }
      if (cur.fontName.includes('bold') || cur.fontName.includes('black') || cur.fontName.includes('heavy') || cur.fontName.includes('b')) {
        isBold = true;
      }
      if (cur.fontName.includes('courier') || cur.fontName.includes('mono') || cur.fontName.includes('code') || cur.fontName.includes('consolas')) {
        isMonospace = true;
      }

      if (prevItem) {
        const gap = cur.x - (prevItem.x + prevItem.width);

        // Wide spatial gap indicates a column or tab boundary (> 22pt)
        if (gap >= 22) {
          if (currentColumn.trim()) {
            columns.push(currentColumn.trim());
            currentColumn = '';
          }
          if (!lineText.endsWith('  ')) {
            lineText += '    '; // Add 4 spaces for tabular alignment
          }
        } else if (gap > 2 && !lineText.endsWith(' ') && !str.startsWith(' ')) {
          lineText += ' ';
          currentColumn += ' ';
        }
      }

      lineText += str;
      currentColumn += str;
      prevItem = cur;
    }

    if (currentColumn.trim()) {
      columns.push(currentColumn.trim());
    }

    const trimmed = lineText.trim();
    if (trimmed.length > 0) {
      structuredLines.push({
        text: trimmed,
        y: bucket.y,
        fontSize: maxFontSize,
        isBold,
        isMonospace,
        columns: columns.length > 1 ? columns : [trimmed],
      });
    }
  }

  return structuredLines;
}

/**
 * Main PDF to Markdown Converter Engine.
 * Parses raw text, spatial coordinates, headings, tables, lists, code blocks, and metadata,
 * producing high quality, standardized CommonMark & GitHub Flavored Markdown.
 */
export async function convertPdfToMarkdown(
  pdfBuffer: ArrayBuffer | Uint8Array,
  options: PdfToMarkdownOptions = {}
): Promise<PdfExtractionResult> {
  const {
    includeFrontmatter = true,
    detectHeadings = true,
    detectLists = true,
    detectTables = true,
    detectCodeBlocks = true,
    detectBlockquotes = true,
    preservePageDividers = true,
    cleanHyphenation = true,
    cleanRunningHeadersFooters = true,
    bulletStyle = '-',
  } = options;

  const rawExtraction = await extractPdfTextAndMetadata(pdfBuffer);
  const { title, author, creationDate, pageCount, pages, structuredPages, bodyFontSize } = rawExtraction;

  const outputMarkdownSections: string[] = [];

  // 1. YAML Frontmatter
  if (includeFrontmatter) {
    const docTitle = title || sanitizeFrontmatter(pages[0]?.lines[0] || 'PDF Document');
    const docAuthor = author || 'PDF Extractor';
    const dateStr = creationDate || new Date().toISOString().split('T')[0];

    outputMarkdownSections.push(
      `---\ntitle: "${docTitle}"\nauthor: "${docAuthor}"\npages: ${pageCount}\nconverted_at: "${dateStr}"\n---\n`
    );
  }

  // 2. Process Each Page
  for (let pIdx = 0; pIdx < structuredPages.length; pIdx++) {
    const pageNum = pIdx + 1;
    let sLines = [...structuredPages[pIdx]];

    // Page Divider
    if (preservePageDividers && pIdx > 0) {
      outputMarkdownSections.push(`\n---\n<!-- Page ${pageNum} -->\n`);
    } else if (preservePageDividers && pIdx === 0 && !includeFrontmatter) {
      outputMarkdownSections.push(`<!-- Page 1 -->\n`);
    }

    // Filter Running Headers and Footers
    if (cleanRunningHeadersFooters) {
      sLines = sLines.filter((l) => {
        const lower = l.text.toLowerCase().trim();
        // Page X of Y or Page X
        if (/^page\s+\d+(\s+of\s+\d+)?/i.test(lower)) return false;
        if (/^\d+\s*\/\s*\d+$/.test(lower)) return false;
        if (/^page\s+\d+$/i.test(lower)) return false;
        if (/^-\s*\d+\s*-$/.test(lower)) return false;
        return true;
      });
    }

    // Parse Page Structure into Markdown Blocks
    const parsedPageMarkdown = formatStructuredLinesToMarkdown(sLines, {
      detectHeadings,
      detectLists,
      detectTables,
      detectCodeBlocks,
      detectBlockquotes,
      cleanHyphenation,
      bulletStyle,
      bodyFontSize,
    });

    if (parsedPageMarkdown.trim().length > 0) {
      outputMarkdownSections.push(parsedPageMarkdown);
    }
  }

  const finalMarkdown = outputMarkdownSections.join('\n\n').trim() + '\n';

  return {
    title: title || (pages[0]?.lines[0] || 'Converted Document'),
    author: author || 'PDF Extractor',
    creationDate,
    pageCount,
    pages,
    fullRawText: rawExtraction.fullRawText,
    markdown: finalMarkdown,
  };
}

interface FormatContext {
  detectHeadings: boolean;
  detectLists: boolean;
  detectTables: boolean;
  detectCodeBlocks: boolean;
  detectBlockquotes: boolean;
  cleanHyphenation: boolean;
  bulletStyle: '-' | '*' | '+';
  bodyFontSize: number;
}

/**
 * Transforms spatially structured lines into GitHub Flavored Markdown
 */
function formatStructuredLinesToMarkdown(lines: StructuredLine[], ctx: FormatContext): string {
  const result: string[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let tableBuffer: StructuredLine[] = [];

  const flushTableBuffer = () => {
    if (tableBuffer.length > 0) {
      const gfmTable = convertStructuredLinesToGfmTable(tableBuffer);
      result.push(gfmTable);
      tableBuffer = [];
    }
  };

  const flushCodeBlock = () => {
    if (inCodeBlock && codeBlockLines.length > 0) {
      result.push('```ts\n' + codeBlockLines.join('\n') + '\n```');
      inCodeBlock = false;
      codeBlockLines = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const lineObj = lines[i];
    let trimmed = lineObj.text.trim();

    if (!trimmed) {
      flushTableBuffer();
      flushCodeBlock();
      continue;
    }

    // Repair Hyphenation
    if (ctx.cleanHyphenation && trimmed.endsWith('-') && i + 1 < lines.length) {
      const nextText = lines[i + 1].text.trim();
      if (/^[a-z]/.test(nextText)) {
        const nextWords = nextText.split(/\s+/);
        const mergedWord = trimmed.slice(0, -1) + nextWords[0];
        trimmed = mergedWord;
        if (nextWords.length > 1) {
          lines[i + 1].text = nextWords.slice(1).join(' ');
        } else {
          i++; // consumed next line entirely
        }
      }
    }

    // 1. Code Block Detection (via Monospace font or programming keywords)
    if (ctx.detectCodeBlocks) {
      const isCodeLike =
        lineObj.isMonospace ||
        /^(import|export|const|let|var|function|class|interface|type|return|if|for|while|console\.)\b/.test(trimmed) ||
        trimmed.startsWith('```') ||
        (trimmed.includes('{') && trimmed.includes('}')) ||
        (trimmed.includes('(') && trimmed.includes(');'));

      if (isCodeLike) {
        flushTableBuffer();
        inCodeBlock = true;
        codeBlockLines.push(trimmed.replace(/^```[a-z]*/i, ''));
        continue;
      } else if (inCodeBlock) {
        flushCodeBlock();
      }
    }

    // 2. Table Row Detection (multi-column structure)
    if (ctx.detectTables) {
      const hasMultipleCols = lineObj.columns.length >= 2;
      const isPipeDelimited = trimmed.includes('|') && trimmed.split('|').length >= 3;
      const hasLargeSpacing = /\b[A-Za-z0-9_.-]+\s{3,}[A-Za-z0-9_.-]+/.test(trimmed);

      if (hasMultipleCols || isPipeDelimited || hasLargeSpacing) {
        tableBuffer.push(lineObj);
        continue;
      } else {
        flushTableBuffer();
      }
    }

    // 3. Heading Detection (Font size comparison + numbered patterns)
    if (ctx.detectHeadings) {
      const isLargeHeading = lineObj.fontSize >= ctx.bodyFontSize * 1.35 || lineObj.fontSize >= 15;
      const isMediumHeading = (lineObj.fontSize >= ctx.bodyFontSize * 1.15 || lineObj.fontSize >= 13) && lineObj.isBold;

      // Level 1: "1. Heading", "Chapter 1", or prominent large title
      if (/^(\d+\.0?\s+[A-Z][\w\s&,-]+|CHAPTER\s+\d+|SECTION\s+\d+)/i.test(trimmed) || isLargeHeading) {
        const cleanTitle = trimmed.replace(/^#+\s*/, '');
        result.push(`\n## ${cleanTitle}`);
        continue;
      }
      // Level 2: "1.1 Heading", "A. Heading"
      if (/^(\d+\.\d+\s+[A-Z][\w\s&,-]+|[A-Z]\.\s+[A-Z][\w\s&,-]+)/i.test(trimmed) || isMediumHeading) {
        const cleanTitle = trimmed.replace(/^#+\s*/, '');
        result.push(`\n### ${cleanTitle}`);
        continue;
      }
      // Level 3: "1.1.1 Heading"
      if (/^\d+\.\d+\.\d+\s+[A-Z][\w\s&,-]+/i.test(trimmed)) {
        const cleanTitle = trimmed.replace(/^#+\s*/, '');
        result.push(`\n#### ${cleanTitle}`);
        continue;
      }
      // Pure uppercase short title line (under 60 chars)
      if (
        trimmed.length > 3 &&
        trimmed.length < 60 &&
        trimmed === trimmed.toUpperCase() &&
        /^[A-Z0-9\s:_-]+$/.test(trimmed) &&
        !trimmed.startsWith('PAGE') &&
        !trimmed.startsWith('DOCUMENT ID')
      ) {
        result.push(`\n# ${capitalizeHeading(trimmed)}`);
        continue;
      }
    }

    // 4. Blockquote / Note Detection
    if (ctx.detectBlockquotes) {
      if (/^(Note:|Important:|Warning:|Caution:|Tip:|Info:)/i.test(trimmed)) {
        const cleanNote = trimmed.replace(/^(Note|Important|Warning|Caution|Tip|Info):\s*/i, (m) => `**${m.trim()}** `);
        result.push(`> ${cleanNote}`);
        continue;
      }
      if (trimmed.startsWith('>')) {
        result.push(trimmed);
        continue;
      }
    }

    // 5. Bullet & Numbered List Detection
    if (ctx.detectLists) {
      // Unordered bullets: •, ◦, ▪, -, *, etc.
      if (/^[•◦▪*-]\s+/.test(trimmed)) {
        const content = trimmed.replace(/^[•◦▪*-]\s+/, '');
        result.push(`${ctx.bulletStyle} ${content}`);
        continue;
      }
      // Ordered lists: 1., 2), (a), etc.
      if (/^(\d+[\.)]|\([a-z0-9]\))\s+/i.test(trimmed)) {
        const matched = trimmed.match(/^(\d+[\.)]|\([a-z0-9]\))\s+(.*)$/i);
        if (matched) {
          result.push(`1. ${matched[2]}`);
          continue;
        }
      }
    }

    // 6. Key-Value Label pairs
    if (/^[A-Z][\w\s]{1,25}:\s+[\w\s.,/#-]+$/.test(trimmed) && !trimmed.startsWith('http')) {
      const parts = trimmed.split(/:\s+(.+)/);
      if (parts.length >= 2) {
        result.push(`**${parts[0]}:** ${parts[1]}`);
        continue;
      }
    }

    // Default Paragraph
    result.push(trimmed);
  }

  flushTableBuffer();
  flushCodeBlock();

  return result.join('\n\n');
}

/**
 * Converts collected table line candidates into a clean GitHub Flavored Markdown table.
 */
function convertStructuredLinesToGfmTable(lines: StructuredLine[]): string {
  if (lines.length === 0) return '';

  const parsedRows: string[][] = lines.map((l) => {
    if (l.columns && l.columns.length > 1) {
      return l.columns;
    }
    const raw = l.text;
    if (raw.includes('|')) {
      return raw
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell, idx, arr) => (idx > 0 && idx < arr.length - 1) || cell.length > 0);
    }
    // Split by 3 or more spaces
    return raw.split(/\s{3,}/).map((c) => c.trim()).filter((c) => c.length > 0);
  });

  const maxCols = Math.max(...parsedRows.map((r) => r.length), 1);
  if (maxCols <= 1) {
    return lines.map((l) => l.text).join('\n');
  }

  // Normalize row length
  const normalizedRows = parsedRows.map((row) => {
    const full = [...row];
    while (full.length < maxCols) {
      full.push('-');
    }
    return full;
  });

  const headerRow = normalizedRows[0];
  const separatorRow = new Array(maxCols).fill('---');
  const dataRows = normalizedRows.slice(1);

  const tableLines = [
    `| ${headerRow.join(' | ')} |`,
    `| ${separatorRow.join(' | ')} |`,
    ...dataRows.map((row) => `| ${row.join(' | ')} |`),
  ];

  return tableLines.join('\n');
}

function calculateDominantFontSize(sizes: number[]): number {
  if (sizes.length === 0) return 10;
  const counts: Record<number, number> = {};
  let maxCount = 0;
  let dominant = 10;

  for (const s of sizes) {
    counts[s] = (counts[s] || 0) + 1;
    if (counts[s] > maxCount) {
      maxCount = counts[s];
      dominant = s;
    }
  }

  return dominant;
}

function sanitizeFrontmatter(str: string): string {
  return (str || '').replace(/["\n\r\\]/g, ' ').trim();
}

function capitalizeHeading(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatPdfDate(pdfDate: string): string {
  try {
    // PDF dates are in format D:YYYYMMDDHHmmSS...
    if (pdfDate.startsWith('D:')) {
      const yr = pdfDate.substring(2, 6);
      const mo = pdfDate.substring(6, 8);
      const dy = pdfDate.substring(8, 10);
      if (yr && mo && dy) {
        return `${yr}-${mo}-${dy}`;
      }
    }
    const d = new Date(pdfDate);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch (e) {
    // fallback
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Computes live statistics for generated Markdown text.
 */
export function calculateMarkdownStats(markdown: string): MarkdownStats {
  if (!markdown || markdown.trim().length === 0) {
    return {
      words: 0,
      characters: 0,
      lines: 0,
      headings: 0,
      lists: 0,
      tables: 0,
      readingTimeMinutes: 0,
    };
  }

  const lines = markdown.split('\n');
  const nonFrontmatter = markdown.replace(/^---[\s\S]*?---\n*/, '');
  const words = nonFrontmatter.trim().split(/\s+/).filter(Boolean).length;
  const characters = markdown.length;

  let headings = 0;
  let lists = 0;
  let tables = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,6}\s+/.test(trimmed)) headings++;
    if (/^([*+-]|\d+\.)\s+/.test(trimmed)) lists++;
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) tables++;
  }

  const readingTimeMinutes = Math.max(1, Math.ceil(words / 200));

  return {
    words,
    characters,
    lines: lines.length,
    headings,
    lists,
    tables: Math.max(0, Math.floor(tables / 3)), // approximate table count
    readingTimeMinutes,
  };
}

/**
 * Client-side HTML renderer for Markdown with styled code blocks, tables, badges & typography.
 */
export function renderMarkdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown
    // Escape HTML tags to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Render YAML Frontmatter as a stylized metadata banner
  html = html.replace(
    /^---\n([\s\S]*?)\n---/m,
    (_match, content) => `
      <div class="mb-5 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 font-mono text-xs text-slate-700 dark:text-indigo-200 space-y-1">
        <div class="text-[10px] uppercase tracking-wider font-bold text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-indigo-500"></span>
          <span>DOCUMENT METADATA (YAML FRONTMATTER)</span>
        </div>
        ${content
          .split('\n')
          .filter(Boolean)
          .map((line: string) => {
            const [k, ...v] = line.split(':');
            return `<div class="flex"><span class="text-slate-500 dark:text-slate-400 w-28 shrink-0">${k}:</span> <span class="font-semibold text-slate-900 dark:text-slate-200">${v.join(':').trim()}</span></div>`;
          })
          .join('')}
      </div>
    `
  );

  // Render Page Comments
  html = html.replace(
    /&lt;!-- Page (\d+) --&gt;/g,
    '<div class="my-4 text-center"><span class="px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">📄 PAGE $1 BREAK</span></div>'
  );

  // Render Horizontal Rules
  html = html.replace(/^---$/gm, '<hr class="my-6 border-t border-slate-200 dark:border-slate-800" />');

  // Render Code Blocks
  html = html.replace(
    /```([a-z]*)\n([\s\S]*?)```/gim,
    '<pre class="my-3 p-3.5 rounded-xl bg-slate-900 text-emerald-300 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed"><code class="language-$1">$2</code></pre>'
  );

  // Render Inline Code
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 font-mono text-xs">$1</code>'
  );

  // Render Headings
  html = html
    .replace(/^#### (.*$)/gim, '<h4 class="text-sm font-bold text-slate-800 dark:text-slate-200 mt-4 mb-1.5 flex items-center gap-1.5">$1</h4>')
    .replace(/^### (.*$)/gim, '<h3 class="text-base font-bold text-slate-900 dark:text-white mt-5 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-lg font-extrabold text-slate-900 dark:text-white mt-6 mb-2.5 pb-1 border-b border-slate-200 dark:border-slate-800">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-4 mb-3 text-indigo-600 dark:text-indigo-400">$1</h1>');

  // Render Blockquotes
  html = html.replace(
    /^&gt; (.*$)/gim,
    '<blockquote class="my-3 pl-3.5 py-1.5 border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs text-slate-700 dark:text-slate-300 rounded-r-lg">$1</blockquote>'
  );

  // Render Bold & Italic
  html = html
    .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-bold text-slate-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em class="italic">$1</em>');

  // Render Tables
  html = html.replace(/((\|.*\|\n)+)/g, (tableMatch) => {
    const rows = tableMatch.trim().split('\n');
    if (rows.length < 2) return tableMatch;

    const headerCols = rows[0]
      .split('|')
      .map((c) => c.trim())
      .filter((_c, idx, arr) => idx > 0 && idx < arr.length - 1);

    const bodyRows = rows.slice(2); // skip separator row

    return `
      <div class="my-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <table class="w-full text-left text-xs border-collapse font-sans">
          <thead class="bg-slate-100 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
            <tr>
              ${headerCols.map((c) => `<th class="py-2.5 px-3 border-b border-slate-200 dark:border-slate-800">${c}</th>`).join('')}
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 font-mono">
            ${bodyRows
              .map((row) => {
                const cols = row
                  .split('|')
                  .map((c) => c.trim())
                  .filter((_c, idx, arr) => idx > 0 && idx < arr.length - 1);
                return `<tr class="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">${cols
                  .map((col) => `<td class="py-2 px-3">${col}</td>`)
                  .join('')}</tr>`;
              })
              .join('')}
          </tbody>
        </table>
      </div>
    `;
  });

  // Render Bullet lists
  html = html.replace(
    /^[-*+]\s+(.*$)/gim,
    '<li class="ml-4 list-disc text-xs text-slate-700 dark:text-slate-300 my-0.5">$1</li>'
  );

  // Render Numbered lists
  html = html.replace(
    /^\d+\.\s+(.*$)/gim,
    '<li class="ml-4 list-decimal text-xs text-slate-700 dark:text-slate-300 my-0.5 font-mono">$1</li>'
  );

  // Paragraph spacing
  html = html.replace(/\n\n+/g, '<br/><br/>');

  return html;
}
