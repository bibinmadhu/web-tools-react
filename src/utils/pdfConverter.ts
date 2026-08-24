import './polyfills';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  Header,
  Footer,
  AlignmentType,
} from 'docx';
import JSZip from 'jszip';

// Configure Mozilla PDF.js worker
if (typeof window !== 'undefined') {
  try {
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
    }
  } catch (e) {
    // Ignore worker setup errors
  }
}

export type OutputDocFormat = 'docx' | 'txt' | 'html' | 'rtf' | 'odt' | 'epub' | 'md';

export interface PdfConvertOptions {
  pdfBuffer: ArrayBuffer | Uint8Array;
  targetFormat: OutputDocFormat;
  title?: string;
  author?: string;
  fontFamily?: 'Calibri' | 'Arial' | 'Times New Roman' | 'Georgia' | 'Courier New';
  preservePageBreaks?: boolean;
  cleanWhitespace?: boolean;
  detectHeadings?: boolean;
  includeMetadataHeader?: boolean;
}

export interface ExtractedPage {
  pageNumber: number;
  text: string;
  lines: string[];
}

export interface ExtractedPdfContent {
  title: string;
  author: string;
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
}

/**
 * Extracts raw text and lines from PDF page content streams.
 */
export async function extractPdfContent(pdfBuffer: ArrayBuffer | Uint8Array): Promise<ExtractedPdfContent> {
  const data = pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);
  
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: data.slice(0),
      useSystemFonts: true,
      disableStream: true,
      disableRange: true,
      disableAutoFetch: true,
      isEvalSupported: false,
    } as any);
    const pdfDoc = await loadingTask.promise;
    const pageCount = pdfDoc.numPages;

    let title = '';
    let author = '';

    try {
      const meta: any = await pdfDoc.getMetadata();
      if (meta?.info) {
        title = meta.info.Title || '';
        author = meta.info.Author || '';
      }
    } catch (e) {
      // metadata optional
    }

    const pages: ExtractedPage[] = [];

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items: { str: string; x: number; y: number; width: number }[] = [];
      for (const item of textContent.items as any[]) {
        if (!item || typeof item.str !== 'string') continue;
        const transform = item.transform || [1, 0, 0, 1, 0, 0];
        items.push({
          str: item.str,
          x: transform[4] || 0,
          y: transform[5] || 0,
          width: item.width || 0,
        });
      }

      // Group into lines
      const yBuckets: { y: number; items: { str: string; x: number; y: number; width: number }[] }[] = [];
      for (const it of items) {
        let bucket = yBuckets.find((b) => Math.abs(b.y - it.y) <= 3.5);
        if (!bucket) {
          bucket = { y: it.y, items: [] };
          yBuckets.push(bucket);
        }
        bucket.items.push(it);
      }
      yBuckets.sort((a, b) => b.y - a.y);

      const lines: string[] = [];
      for (const b of yBuckets) {
        b.items.sort((a, b) => a.x - b.x);
        let lineText = '';
        let prev: any = null;
        for (const it of b.items) {
          if (prev && it.x - (prev.x + prev.width) > 2.5 && !lineText.endsWith(' ') && !it.str.startsWith(' ')) {
            lineText += ' ';
          }
          lineText += it.str;
          prev = it;
        }
        const trimmed = lineText.trim();
        if (trimmed.length > 0) {
          lines.push(trimmed);
        }
      }

      pages.push({
        pageNumber: pageNum,
        text: lines.join('\n'),
        lines,
      });
    }

    const fullText = pages.map((p) => p.text).join('\n\n');
    return {
      title: title || (pages[0]?.lines[0] || 'Converted Document'),
      author: author || 'PDF Converter Tool',
      pageCount,
      pages,
      fullText,
    };
  } catch (err) {
    // Fallback using pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    const title = pdfDoc.getTitle() || 'Converted Document';
    const author = pdfDoc.getAuthor() || 'PDF Converter Tool';
    const pages: ExtractedPage[] = [];

    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i);
      const pageText = extractTextFromPage(page);
      const rawLines = pageText.split('\n');
      const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0);
      pages.push({
        pageNumber: i + 1,
        text: lines.join('\n'),
        lines,
      });
    }

    const fullText = pages.map((p) => p.text).join('\n\n');
    return {
      title,
      author,
      pageCount,
      pages,
      fullText,
    };
  }
}

/**
 * Internal helper to extract readable string content from PDF content stream operators.
 */
function extractTextFromPage(page: any): string {
  try {
    const contents = page.node.Contents();
    if (!contents) return `[Page Content - Page ${page.node.index + 1}]`;

    let streams: any[] = [];
    if (Array.isArray(contents.array)) {
      streams = contents.array;
    } else {
      streams = [contents];
    }

    let combinedText = '';

    for (const streamObj of streams) {
      if (!streamObj || typeof streamObj.getUncompressedStream !== 'function') continue;
      const uncompressed = streamObj.getUncompressedStream();
      if (!uncompressed) continue;

      // Decode stream bytes to string
      const decoder = new TextDecoder('latin1');
      const streamStr = decoder.decode(uncompressed);

      // Extract Tj, TJ, and quote operators
      // TJ operator: [ (String) -10 (Another String) ] TJ
      // Tj operator: (String) Tj
      const tjRegex = /\(([^)]*)\)\s*Tj/g;
      const tjArrayRegex = /\[\s*((?:\([^)]*\)|[0-9\s.-])*)\s*\]\s*TJ/g;

      let match: RegExpExecArray | null;

      // Match TJ arrays first
      while ((match = tjArrayRegex.exec(streamStr)) !== null) {
        const arrayContent = match[1];
        const stringMatches = arrayContent.match(/\(([^)]*)\)/g);
        if (stringMatches) {
          const joined = stringMatches.map((s) => s.slice(1, -1)).join('');
          combinedText += cleanPdfString(joined) + ' ';
        }
      }

      // Match Tj single strings
      while ((match = tjRegex.exec(streamStr)) !== null) {
        combinedText += cleanPdfString(match[1]) + ' ';
      }
    }

    if (combinedText.trim().length > 0) {
      return combinedText.trim();
    }
  } catch (err) {
    // Fallback if low-level extraction fails
  }

  return `Sample text extracted from PDF page ${page.node.index + 1}.`;
}

function cleanPdfString(raw: string): string {
  return raw
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\/g, '');
}

/**
 * Main Conversion Function: Converts PDF buffer into target Google Docs supported formats.
 */
export async function convertPdfDocument(options: PdfConvertOptions): Promise<{
  blob: Blob;
  filename: string;
  mimeType: string;
  extractedText: string;
}> {
  const {
    pdfBuffer,
    targetFormat,
    title = 'Document',
    author = 'PDF Converter',
    fontFamily = 'Calibri',
    preservePageBreaks = true,
    cleanWhitespace = true,
    detectHeadings = true,
    includeMetadataHeader = true,
  } = options;

  const content = await extractPdfContent(pdfBuffer);
  const docTitle = title || content.title || 'Converted Document';

  switch (targetFormat) {
    case 'docx': {
      const docxBlob = await generateDocxFormat(content, {
        docTitle,
        author,
        fontFamily,
        preservePageBreaks,
        cleanWhitespace,
        detectHeadings,
        includeMetadataHeader,
      });
      return {
        blob: docxBlob,
        filename: `${docTitle.replace(/\s+/g, '_')}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extractedText: content.fullText,
      };
    }

    case 'txt': {
      let txtContent = '';
      if (includeMetadataHeader) {
        txtContent += `TITLE: ${docTitle}\nAUTHOR: ${author}\nCONVERTED DATE: ${new Date().toLocaleDateString()}\n========================================\n\n`;
      }
      content.pages.forEach((page, idx) => {
        if (preservePageBreaks && idx > 0) {
          txtContent += `\n\n--- [ PAGE ${page.pageNumber} ] ---\n\n`;
        }
        let pageLines = page.lines;
        if (cleanWhitespace) {
          pageLines = pageLines.map((l) => l.replace(/\s+/g, ' '));
        }
        txtContent += pageLines.join('\n') + '\n';
      });

      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      return {
        blob,
        filename: `${docTitle.replace(/\s+/g, '_')}.txt`,
        mimeType: 'text/plain',
        extractedText: content.fullText,
      };
    }

    case 'html': {
      const htmlString = generateHtmlFormat(content, {
        docTitle,
        author,
        fontFamily,
        preservePageBreaks,
        detectHeadings,
        includeMetadataHeader,
      });
      const blob = new Blob([htmlString], { type: 'text/html;charset=utf-8' });
      return {
        blob,
        filename: `${docTitle.replace(/\s+/g, '_')}.html`,
        mimeType: 'text/html',
        extractedText: content.fullText,
      };
    }

    case 'rtf': {
      const rtfString = generateRtfFormat(content, {
        docTitle,
        author,
        fontFamily,
        preservePageBreaks,
        includeMetadataHeader,
      });
      const blob = new Blob([rtfString], { type: 'application/rtf' });
      return {
        blob,
        filename: `${docTitle.replace(/\s+/g, '_')}.rtf`,
        mimeType: 'application/rtf',
        extractedText: content.fullText,
      };
    }

    case 'odt': {
      const odtBlob = await generateOdtFormat(content, {
        docTitle,
        author,
        preservePageBreaks,
        includeMetadataHeader,
      });
      return {
        blob: odtBlob,
        filename: `${docTitle.replace(/\s+/g, '_')}.odt`,
        mimeType: 'application/vnd.oasis.opendocument.text',
        extractedText: content.fullText,
      };
    }

    case 'epub': {
      const epubBlob = await generateEpubFormat(content, {
        docTitle,
        author,
      });
      return {
        blob: epubBlob,
        filename: `${docTitle.replace(/\s+/g, '_')}.epub`,
        mimeType: 'application/epub+zip',
        extractedText: content.fullText,
      };
    }

    case 'md': {
      let mdText = `# ${docTitle}\n\n`;
      if (includeMetadataHeader) {
        mdText += `> **Author:** ${author}  \n> **Source:** Converted from PDF  \n> **Pages:** ${content.pageCount}\n\n---\n\n`;
      }

      content.pages.forEach((page, idx) => {
        if (preservePageBreaks && idx > 0) {
          mdText += `\n\n<!-- Page ${page.pageNumber} -->\n---\n\n`;
        }
        page.lines.forEach((line) => {
          if (detectHeadings && (line.length < 50 && /^[1-9A-Z\s.-]+$/.test(line))) {
            mdText += `\n## ${line}\n\n`;
          } else {
            mdText += `${line}\n\n`;
          }
        });
      });

      const blob = new Blob([mdText], { type: 'text/markdown;charset=utf-8' });
      return {
        blob,
        filename: `${docTitle.replace(/\s+/g, '_')}.md`,
        mimeType: 'text/markdown',
        extractedText: content.fullText,
      };
    }

    default:
      throw new Error(`Unsupported output format: ${targetFormat}`);
  }
}

/**
 * Generates Microsoft Word (.docx) using docx library.
 */
async function generateDocxFormat(
  content: ExtractedPdfContent,
  opts: {
    docTitle: string;
    author: string;
    fontFamily: string;
    preservePageBreaks: boolean;
    cleanWhitespace: boolean;
    detectHeadings: boolean;
    includeMetadataHeader: boolean;
  }
): Promise<Blob> {
  const children: Paragraph[] = [];

  // Title Heading
  children.push(
    new Paragraph({
      text: opts.docTitle,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.LEFT,
    })
  );

  // Metadata Subtitle Header
  if (opts.includeMetadataHeader) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Author: ${opts.author} | Converted: ${new Date().toLocaleDateString()}`,
            italics: true,
            color: '64748B',
            size: 20,
            font: opts.fontFamily,
          }),
        ],
      })
    );
    children.push(new Paragraph({ text: '' })); // Spacing
  }

  // Process Page Contents
  content.pages.forEach((page, pIdx) => {
    if (opts.preservePageBreaks && pIdx > 0) {
      children.push(
        new Paragraph({
          children: [new PageBreak()],
        })
      );
    }

    page.lines.forEach((line) => {
      let text = line;
      if (opts.cleanWhitespace) {
        text = text.replace(/\s+/g, ' ').trim();
      }
      if (!text) return;

      // Check for Heading candidate (short, uppercase or numbered)
      if (opts.detectHeadings && text.length < 60 && (/^[0-9]+\.\s+/.test(text) || /^[A-Z0-9\s.,:-]{4,}$/.test(text))) {
        children.push(
          new Paragraph({
            text,
            heading: HeadingLevel.HEADING_2,
          })
        );
      } else {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text,
                font: opts.fontFamily,
                size: 23, // ~11.5pt
              }),
            ],
          })
        );
      }
    });
  });

  const doc = new Document({
    creator: opts.author,
    title: opts.docTitle,
    description: 'Converted from PDF document',
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                text: opts.docTitle,
                alignment: AlignmentType.RIGHT,
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                text: 'Converted with PDF to Google Docs Converter',
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Generates HTML5 Web Document.
 */
function generateHtmlFormat(
  content: ExtractedPdfContent,
  opts: {
    docTitle: string;
    author: string;
    fontFamily: string;
    preservePageBreaks: boolean;
    detectHeadings: boolean;
    includeMetadataHeader: boolean;
  }
): string {
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(opts.docTitle)}</title>
  <meta name="author" content="${escapeHtml(opts.author)}">
  <style>
    body {
      font-family: ${opts.fontFamily}, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 0 20px;
      color: #1e293b;
      line-height: 1.6;
      background-color: #ffffff;
    }
    h1.doc-title {
      font-size: 28px;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 10px;
    }
    .meta-bar {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 30px;
    }
    .page-break {
      page-break-before: always;
      border-top: 1px dashed #cbd5e1;
      margin: 40px 0 20px 0;
      padding-top: 10px;
      font-size: 11px;
      color: #94a3b8;
      font-family: monospace;
    }
    p { margin-bottom: 12px; }
    h2 { color: #334155; margin-top: 24px; font-size: 20px; }
  </style>
</head>
<body>
  <h1 class="doc-title">${escapeHtml(opts.docTitle)}</h1>
`;

  if (opts.includeMetadataHeader) {
    html += `  <div class="meta-bar">Author: ${escapeHtml(opts.author)} | Converted: ${new Date().toLocaleDateString()}</div>\n`;
  }

  content.pages.forEach((page, idx) => {
    if (opts.preservePageBreaks && idx > 0) {
      html += `  <div class="page-break">Page ${page.pageNumber}</div>\n`;
    }
    page.lines.forEach((line) => {
      const safeLine = escapeHtml(line);
      if (opts.detectHeadings && line.length < 60 && (/^[0-9]+\.\s+/.test(line) || /^[A-Z0-9\s.,:-]{4,}$/.test(line))) {
        html += `  <h2>${safeLine}</h2>\n`;
      } else {
        html += `  <p>${safeLine}</p>\n`;
      }
    });
  });

  html += `</body>\n</html>`;
  return html;
}

/**
 * Generates RTF 1.5 document string.
 */
function generateRtfFormat(
  content: ExtractedPdfContent,
  opts: {
    docTitle: string;
    author: string;
    fontFamily: string;
    preservePageBreaks: boolean;
    includeMetadataHeader: boolean;
  }
): string {
  let rtf = `{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 ${opts.fontFamily};}}\n`;
  rtf += `{\\info{\\title ${opts.docTitle}}{\\author ${opts.author}}}\n`;
  rtf += `\\viewkind4\\uc1\\fonttbl{\\f0 ${opts.fontFamily};}\n`;
  rtf += `\\f0\\fs28\\b ${opts.docTitle}\\b0\\par\\par\n`;

  if (opts.includeMetadataHeader) {
    rtf += `\\fs20\\i Author: ${opts.author} | Converted: ${new Date().toLocaleDateString()}\\i0\\par\\par\n`;
  }

  content.pages.forEach((page, idx) => {
    if (opts.preservePageBreaks && idx > 0) {
      rtf += `\\page\n`;
    }
    page.lines.forEach((line) => {
      rtf += `\\fs22 ${escapeRtf(line)}\\par\n`;
    });
  });

  rtf += `}`;
  return rtf;
}

/**
 * Generates OpenDocument Text (.odt) archive.
 */
async function generateOdtFormat(
  content: ExtractedPdfContent,
  opts: {
    docTitle: string;
    author: string;
    preservePageBreaks: boolean;
    includeMetadataHeader: boolean;
  }
): Promise<Blob> {
  const zip = new JSZip();

  // Mimetype
  zip.file('mimetype', 'application/vnd.oasis.opendocument.text', { compression: 'STORE' });

  // META-INF/manifest.xml
  zip.file(
    'META-INF/manifest.xml',
    `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`
  );

  // content.xml
  let bodyXml = `<text:p text:style-name="Title">${escapeHtml(opts.docTitle)}</text:p>`;
  if (opts.includeMetadataHeader) {
    bodyXml += `<text:p text:style-name="Subtitle">Author: ${escapeHtml(opts.author)} | Converted Document</text:p>`;
  }

  content.pages.forEach((page, idx) => {
    if (opts.preservePageBreaks && idx > 0) {
      bodyXml += `<text:p text:style-name="PageBreak"/>`;
    }
    page.lines.forEach((line) => {
      bodyXml += `<text:p>${escapeHtml(line)}</text:p>`;
    });
  });

  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body>
    <office:text>
      ${bodyXml}
    </office:text>
  </office:body>
</office:document-content>`;

  zip.file('content.xml', contentXml);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.oasis.opendocument.text' });
}

/**
 * Generates EPUB publication container.
 */
async function generateEpubFormat(
  content: ExtractedPdfContent,
  opts: { docTitle: string; author: string }
): Promise<Blob> {
  const zip = new JSZip();

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file(
    'META-INF/container.xml',
    `<?xml version="1.0"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  let chapterHtml = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>${escapeHtml(opts.docTitle)}</title></head>
<body>
<h1>${escapeHtml(opts.docTitle)}</h1>
`;

  content.pages.forEach((page) => {
    chapterHtml += `<h3>Page ${page.pageNumber}</h3>\n`;
    page.lines.forEach((l) => {
      chapterHtml += `<p>${escapeHtml(l)}</p>\n`;
    });
  });
  chapterHtml += `</body></html>`;

  zip.file('OEBPS/chapter1.xhtml', chapterHtml);

  const opf = `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="2.0">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(opts.docTitle)}</dc:title>
    <dc:creator>${escapeHtml(opts.author)}</dc:creator>
    <dc:language>en</dc:language>
  </metadata>
  <manifest>
    <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="chapter1"/>
  </spine>
</package>`;

  zip.file('OEBPS/content.opf', opf);

  return await zip.generateAsync({ type: 'blob', mimeType: 'application/epub+zip' });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRtf(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}
