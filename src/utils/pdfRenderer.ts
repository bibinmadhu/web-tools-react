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

// WeakMap or property to track active render sequence per canvas
const canvasRenderSeqMap = new WeakMap<HTMLCanvasElement, number>();

/**
 * Renders a specific page of a PDF document onto an HTML Canvas with high DPI support.
 * Uses an isolated buffer canvas to guarantee no "Cannot use the same canvas during multiple render() operations"
 * errors from pdfjs when renders are queued or triggered rapidly during resize/page changes.
 */
export async function renderPdfPageToCanvas(
  pdfBuffer: ArrayBuffer | Uint8Array,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  targetWidth?: number
): Promise<{ originalWidth: number; originalHeight: number; renderedWidth: number; renderedHeight: number }> {
  // Increment render sequence ID for this canvas
  const currentSeq = (canvasRenderSeqMap.get(canvas) || 0) + 1;
  canvasRenderSeqMap.set(canvas, currentSeq);

  // Ensure worker is configured
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '4.10.38'}/pdf.worker.min.mjs`;
  }

  // Clone or copy buffer to avoid detached ArrayBuffer issues
  const copyBuffer = new Uint8Array(pdfBuffer).slice().buffer;
  const loadingTask = pdfjsLib.getDocument({ data: copyBuffer });
  const pdfDocument = await loadingTask.promise;

  // Check if superseded
  if (canvasRenderSeqMap.get(canvas) !== currentSeq) {
    return { originalWidth: 0, originalHeight: 0, renderedWidth: 0, renderedHeight: 0 };
  }

  const validPageNum = Math.max(1, Math.min(pageNumber, pdfDocument.numPages));
  const page = await pdfDocument.getPage(validPageNum);

  const initialViewport = page.getViewport({ scale: 1.0 });
  const originalWidth = initialViewport.width;
  const originalHeight = initialViewport.height;

  // Calculate scale based on target display width or default to 1.5 for sharpness
  const displayWidth = targetWidth || Math.min(originalWidth, 700);
  const scale = (displayWidth / originalWidth) * (window.devicePixelRatio || 1);
  const viewport = page.getViewport({ scale });

  // Use a dedicated offscreen canvas for pdfjs page.render() to prevent canvas collisions
  const offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = Math.round(viewport.width);
  offscreenCanvas.height = Math.round(viewport.height);

  const offscreenCtx = offscreenCanvas.getContext('2d', { alpha: false });
  if (!offscreenCtx) {
    throw new Error('Could not get 2D context from offscreen canvas');
  }

  // Render to offscreen canvas
  const renderContext = {
    canvasContext: offscreenCtx,
    viewport: viewport,
    canvas: offscreenCanvas,
  };

  const renderTask = page.render(renderContext);
  await renderTask.promise;

  // Check if this render was superseded while rendering
  if (canvasRenderSeqMap.get(canvas) !== currentSeq) {
    return { originalWidth, originalHeight, renderedWidth: canvas.width, renderedHeight: canvas.height };
  }

  // Safely copy offscreen canvas to target canvas
  canvas.width = offscreenCanvas.width;
  canvas.height = offscreenCanvas.height;

  const targetCtx = canvas.getContext('2d');
  if (targetCtx) {
    targetCtx.clearRect(0, 0, canvas.width, canvas.height);
    targetCtx.drawImage(offscreenCanvas, 0, 0);
  }

  return {
    originalWidth,
    originalHeight,
    renderedWidth: canvas.width,
    renderedHeight: canvas.height,
  };
}
