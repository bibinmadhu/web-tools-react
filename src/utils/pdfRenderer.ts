import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker with reliable ESM CDN fallback
if (typeof window !== 'undefined') {
  try {
    const version = pdfjsLib.version || '4.10.38';
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  } catch (e) {
    // Fallback if version unavailable
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://unpkg.com/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
  }
}

export interface RenderedPdfPage {
  pageNumber: number;
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Renders a specific page of a PDF document onto an HTML Canvas with high DPI support
 */
export async function renderPdfPageToCanvas(
  pdfBuffer: ArrayBuffer | Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth?: number
): Promise<{ originalWidth: number; originalHeight: number; renderedWidth: number; renderedHeight: number }> {
  // Ensure worker is configured
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }

  // Clone or copy buffer to avoid detached ArrayBuffer issues
  const copyBuffer = new Uint8Array(pdfBuffer).slice().buffer;
  const loadingTask = pdfjsLib.getDocument({ data: copyBuffer });
  const pdfDocument = await loadingTask.promise;

  const validPageNum = Math.max(1, Math.min(pageNumber, pdfDocument.numPages));
  const page = await pdfDocument.getPage(validPageNum);

  const initialViewport = page.getViewport({ scale: 1.0 });
  const originalWidth = initialViewport.width;
  const originalHeight = initialViewport.height;

  // Calculate scale based on target display width or default to 1.5 for sharpness
  const displayWidth = targetWidth || Math.min(originalWidth, 700);
  const scale = (displayWidth / originalWidth) * (window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale });

  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }

  // Clear canvas before render
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas,
  };

  await page.render(renderContext).promise;

  return {
    originalWidth,
    originalHeight,
    renderedWidth: canvas.width,
    renderedHeight: canvas.height,
  };
}
