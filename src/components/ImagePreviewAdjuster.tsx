import React, { useState, useEffect, useRef } from 'react';
import { RotateCw, SlidersHorizontal, Contrast, RefreshCw, Play, X, Eye, FileImage, Globe } from 'lucide-react';
import { ImageAdjustments } from '../types';
import { SUPPORTED_LANGUAGES } from '../utils/languages';
import { preprocessImage } from '../utils/ocrService';

interface ImagePreviewAdjusterProps {
  originalSource: string | File;
  filename: string;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  onStartOcr: (processedImageUrl: string) => void;
  onResetImage: () => void;
  isProcessing: boolean;
}

const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  rotation: 0,
  grayscale: false,
  highContrast: false,
  invert: false,
  brightness: 0
};

export const ImagePreviewAdjuster: React.FC<ImagePreviewAdjusterProps> = ({
  originalSource,
  filename,
  selectedLanguage,
  onLanguageChange,
  onStartOcr,
  onResetImage,
  isProcessing
}) => {
  const [adjustments, setAdjustments] = useState<ImageAdjustments>(DEFAULT_ADJUSTMENTS);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [imageMeta, setImageMeta] = useState<{ width: number; height: number; sizeStr: string } | null>(null);
  const [showTools, setShowTools] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Update preview when original source or adjustments change
  useEffect(() => {
    let active = true;

    const updatePreview = async () => {
      try {
        const processed = await preprocessImage(originalSource, adjustments);
        if (active) {
          setPreviewUrl(processed);
        }
      } catch (err) {
        console.error('Preprocessing error:', err);
      }
    };

    updatePreview();

    return () => {
      active = false;
    };
  }, [originalSource, adjustments]);

  // Load basic image metadata
  useEffect(() => {
    const img = new Image();
    const src = typeof originalSource === 'string' ? originalSource : URL.createObjectURL(originalSource);
    img.onload = () => {
      let sizeStr = '';
      if (originalSource instanceof File) {
        sizeStr = (originalSource.size / 1024).toFixed(1) + ' KB';
      }
      setImageMeta({
        width: img.naturalWidth,
        height: img.naturalHeight,
        sizeStr
      });
      if (originalSource instanceof File) {
        URL.revokeObjectURL(src);
      }
    };
    img.src = src;
  }, [originalSource]);

  const handleRotate = () => {
    setAdjustments(prev => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360
    }));
  };

  const handleToggleGrayscale = () => {
    setAdjustments(prev => ({
      ...prev,
      grayscale: !prev.grayscale,
      // high contrast requires grayscale
      highContrast: prev.grayscale ? false : prev.highContrast
    }));
  };

  const handleToggleHighContrast = () => {
    setAdjustments(prev => ({
      ...prev,
      highContrast: !prev.highContrast,
      grayscale: !prev.highContrast ? true : prev.grayscale
    }));
  };

  const handleToggleInvert = () => {
    setAdjustments(prev => ({
      ...prev,
      invert: !prev.invert
    }));
  };

  const handleResetAdjustments = () => {
    setAdjustments(DEFAULT_ADJUSTMENTS);
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-xs space-y-5">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileImage className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
              {filename || 'Uploaded Document'}
            </h4>
            {imageMeta && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {imageMeta.width} × {imageMeta.height} px
                {imageMeta.sizeStr ? ` • ${imageMeta.sizeStr}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-toggle-adjustments"
            onClick={() => setShowTools(!showTools)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              showTools || adjustments.rotation !== 0 || adjustments.grayscale || adjustments.highContrast || adjustments.invert
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                : 'bg-neutral-100 text-neutral-700 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Image Preprocessing</span>
          </button>

          <button
            type="button"
            id="btn-remove-image"
            onClick={onResetImage}
            disabled={isProcessing}
            className="p-1.5 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
            title="Remove image"
            aria-label="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Preprocessing Toolbar (Collapsible) */}
      {showTools && (
        <div className="p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Enhance for Better OCR Accuracy
            </span>
            {(adjustments.rotation !== 0 || adjustments.grayscale || adjustments.highContrast || adjustments.invert || adjustments.brightness !== 0) && (
              <button
                type="button"
                id="btn-reset-filters"
                onClick={handleResetAdjustments}
                className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              id="btn-rotate-90"
              onClick={handleRotate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate 90° ({adjustments.rotation}°)
            </button>

            <button
              type="button"
              id="btn-toggle-grayscale"
              onClick={handleToggleGrayscale}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                adjustments.grayscale
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Grayscale
            </button>

            <button
              type="button"
              id="btn-toggle-contrast"
              onClick={handleToggleHighContrast}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                adjustments.highContrast
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              <Contrast className="w-3.5 h-3.5" />
              High Contrast (Binarize)
            </button>

            <button
              type="button"
              id="btn-toggle-invert"
              onClick={handleToggleInvert}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                adjustments.invert
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700'
              }`}
            >
              Invert Colors
            </button>
          </div>
        </div>
      )}

      {/* Image Preview Canvas Display */}
      <div className="relative w-full max-h-[360px] sm:max-h-[420px] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center p-2 border border-neutral-200/80 dark:border-neutral-800">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview ready for OCR"
            className="max-h-[340px] sm:max-h-[400px] w-auto max-w-full object-contain rounded shadow-xs select-none"
          />
        ) : (
          <div className="py-16 text-neutral-400 text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            Loading preview...
          </div>
        )}
      </div>

      {/* Bottom Action Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-neutral-500 shrink-0" />
          <label htmlFor="ocr-lang-select" className="text-xs font-medium text-neutral-600 dark:text-neutral-400 whitespace-nowrap">
            OCR Language:
          </label>
          <select
            id="ocr-lang-select"
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isProcessing}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs font-medium text-neutral-800 dark:text-neutral-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name} ({lang.nativeName})
              </option>
            ))}
          </select>
        </div>

        {/* Start OCR button */}
        <button
          type="button"
          id="btn-extract-text"
          onClick={() => onStartOcr(previewUrl || (typeof originalSource === 'string' ? originalSource : ''))}
          disabled={isProcessing || !previewUrl}
          className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>Extract Text (OCR)</span>
        </button>
      </div>
    </div>
  );
};
