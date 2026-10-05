import { ImageAdjustments, OcrResult, ProgressInfo } from '../types';

// Declare global Tesseract from CDN
declare global {
  interface Window {
    Tesseract?: any;
  }
}

/**
 * Ensures Tesseract.js is loaded from the CDN if not already on window
 */
export async function ensureTesseractLoaded(): Promise<any> {
  if (window.Tesseract) {
    return window.Tesseract;
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="tesseract.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Tesseract));
      existing.addEventListener('error', () => reject(new Error('Failed to load Tesseract.js from CDN.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.onload = () => {
      if (window.Tesseract) {
        resolve(window.Tesseract);
      } else {
        reject(new Error('Tesseract library loaded but object not found on window.'));
      }
    };
    script.onerror = () => reject(new Error('Could not connect to CDN to load Tesseract.js.'));
    document.head.appendChild(script);
  });
}

/**
 * Preprocess image with transformations on an HTML5 canvas before OCR
 */
export async function preprocessImage(
  imageSource: string | File | Blob,
  adjustments: ImageAdjustments
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      const rot = (adjustments.rotation % 360 + 360) % 360;
      const isSideways = rot === 90 || rot === 270;

      canvas.width = isSideways ? img.naturalHeight : img.naturalWidth;
      canvas.height = isSideways ? img.naturalWidth : img.naturalHeight;

      ctx.save();
      // Rotation
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rot * Math.PI) / 180);
      ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
      ctx.restore();

      // Pixel manipulations (Grayscale, High Contrast, Invert, Brightness)
      if (adjustments.grayscale || adjustments.highContrast || adjustments.invert || adjustments.brightness !== 0) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const bOffset = adjustments.brightness * 1.5;

        for (let i = 0; i < data.length; i += 4) {
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];

          // Apply brightness
          if (bOffset !== 0) {
            r = Math.min(255, Math.max(0, r + bOffset));
            g = Math.min(255, Math.max(0, g + bOffset));
            b = Math.min(255, Math.max(0, b + bOffset));
          }

          // Grayscale luminance
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          if (adjustments.highContrast) {
            // Adaptive threshold binarization for clean OCR
            const threshold = 140;
            const binary = gray > threshold ? 255 : 0;
            data[i] = binary;
            data[i + 1] = binary;
            data[i + 2] = binary;
          } else if (adjustments.grayscale) {
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }

          // Invert colors
          if (adjustments.invert) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }

      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for preprocessing.'));
    };

    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Generates semantic formatted HTML from raw text and OCR lines/paragraphs
 */
export function formatExtractedTextToHtml(rawText: string, tesseractData?: any): string {
  if (!rawText || !rawText.trim()) return '<p class="text-neutral-400 italic">No text recognized.</p>';

  // If tesseract paragraphs exist, we can inspect structure
  const lines = rawText.split(/\r?\n/);
  const htmlParts: string[] = [];
  let inList = false;
  let currentParagraphLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraphLines.length > 0) {
      const paragraphText = currentParagraphLines.join('<br />');
      htmlParts.push(`<p class="mb-4 leading-relaxed">${paragraphText}</p>`);
      currentParagraphLines = [];
    }
  };

  const flushList = () => {
    if (inList) {
      htmlParts.push('</ul>');
      inList = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    // Check if line looks like a major header (e.g. ALL CAPS with > 3 characters or starts with Chapter/Section)
    const isAllCapsHeader = trimmed.length >= 4 && trimmed.length <= 60 && trimmed === trimmed.toUpperCase() && !/[0-9$¥€%]/.test(trimmed[0]);
    const isNumberedOrBullet = /^([•\-*]|(\d+[\.\)]))\s+(.+)/.test(trimmed);

    if (isAllCapsHeader) {
      flushParagraph();
      flushList();
      htmlParts.push(`<h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-6 mb-3 uppercase tracking-wide border-b border-neutral-200 dark:border-neutral-800 pb-1">${escapeHtml(trimmed)}</h3>`);
      continue;
    }

    if (isNumberedOrBullet) {
      flushParagraph();
      if (!inList) {
        htmlParts.push('<ul class="list-disc list-inside mb-4 space-y-1 pl-2">');
        inList = true;
      }
      const match = trimmed.match(/^([•\-*]|(\d+[\.\)]))\s+(.+)/);
      const content = match ? match[3] : trimmed;
      htmlParts.push(`<li>${escapeHtml(content)}</li>`);
      continue;
    }

    flushList();

    // Check if line looks like bold emphasis or subheader
    if (trimmed.endsWith(':') && trimmed.length < 50) {
      flushParagraph();
      htmlParts.push(`<p class="font-semibold text-neutral-800 dark:text-neutral-200 mt-3 mb-1">${escapeHtml(trimmed)}</p>`);
      continue;
    }

    // Normal text line
    currentParagraphLines.push(escapeHtml(trimmed));
  }

  flushParagraph();
  flushList();

  return htmlParts.join('\n');
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Executes Client-Side OCR using Tesseract.js with real progress reporting
 */
export async function performClientOcr(
  imageSource: string | File,
  language = 'eng',
  onProgress: (info: ProgressInfo) => void
): Promise<OcrResult> {
  const startTime = performance.now();
  const Tesseract = await ensureTesseractLoaded();

  onProgress({ status: 'Initializing Tesseract OCR engine...', progress: 0.1 });

  // Use Tesseract.recognize with worker logger
  const result = await Tesseract.recognize(imageSource, language, {
    logger: (m: any) => {
      let friendlyStatus = 'Processing image...';
      let progressVal = typeof m.progress === 'number' ? m.progress : 0;

      if (m.status === 'loading tesseract core') {
        friendlyStatus = 'Loading OCR WebAssembly core...';
      } else if (m.status === 'initializing tesseract') {
        friendlyStatus = 'Initializing OCR language models...';
      } else if (m.status === 'initialized tesseract') {
        friendlyStatus = 'Language dictionary ready...';
      } else if (m.status === 'loading language traineddata') {
        friendlyStatus = `Downloading language data (${language})...`;
      } else if (m.status === 'loaded language traineddata') {
        friendlyStatus = 'Language data loaded.';
      } else if (m.status === 'initializing api') {
        friendlyStatus = 'Configuring recognition pipeline...';
      } else if (m.status === 'recognizing text') {
        const pct = Math.round(progressVal * 100);
        friendlyStatus = `Recognizing text... ${pct}%`;
      }

      onProgress({
        status: friendlyStatus,
        progress: progressVal
      });
    }
  });

  const durationMs = Math.round(performance.now() - startTime);
  const data = result.data;
  const rawText = data.text ? data.text.trim() : '';

  // Calculate statistics
  const words = rawText ? rawText.split(/\s+/).filter(Boolean) : [];
  const lines = rawText ? rawText.split(/\r?\n/).filter(l => l.trim().length > 0) : [];
  const paragraphs = rawText ? rawText.split(/\n\s*\n/).filter(p => p.trim().length > 0) : [];
  const confidence = typeof data.confidence === 'number' ? Math.round(data.confidence) : 90;

  const formattedHtml = formatExtractedTextToHtml(rawText, data);

  return {
    plainText: rawText,
    formattedHtml,
    hocrText: data.hocr || '',
    stats: {
      confidence,
      wordCount: words.length,
      characterCount: rawText.length,
      lineCount: lines.length,
      paragraphCount: paragraphs.length,
      durationMs
    }
  };
}

/**
 * Copy text or rich HTML to clipboard
 */
export async function copyToClipboard(text: string, asHtml = false): Promise<boolean> {
  try {
    if (asHtml && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const htmlBlob = new Blob([text], { type: 'text/html' });
      // Strip tags for fallback plain representation
      const tempEl = document.createElement('div');
      tempEl.innerHTML = text;
      const plainBlob = new Blob([tempEl.innerText || tempEl.textContent || text], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': plainBlob
      });
      await navigator.clipboard.write([item]);
      return true;
    }

    // Plain text copy
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older frames
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Clipboard copy failed:', err);
    return false;
  }
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
