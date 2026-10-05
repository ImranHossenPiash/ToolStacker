import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle, FileText, Receipt, ShieldAlert } from 'lucide-react';
import { SampleImage } from '../types';
import { getSampleImages } from '../utils/sampleImages';

interface ImageUploaderProps {
  onSelectImage: (fileOrUrl: File | string, filename?: string) => void;
  onError: (errorMsg: string) => void;
  disabled?: boolean;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp', 'image/pjpeg'];
const MAX_FILE_SIZE_MB = 15;

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onSelectImage,
  onError,
  disabled = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sampleImages, setSampleImages] = useState<SampleImage[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize sample images
  useEffect(() => {
    try {
      setSampleImages(getSampleImages());
    } catch (e) {
      console.error('Failed to load sample images', e);
    }
  }, []);

  // Global paste handler to allow pasting screenshots directly
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.indexOf('image') !== -1) {
            const file = item.getAsFile();
            if (file) {
              validateAndProcessFile(file);
              return;
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [disabled]);

  const validateAndProcessFile = (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      onError(`Unsupported file type (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      onError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose an image under ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    // Verify it loads properly as an image
    const objectUrl = URL.createObjectURL(file);
    const testImg = new Image();
    testImg.onload = () => {
      URL.revokeObjectURL(objectUrl);
      onSelectImage(file, file.name);
    };
    testImg.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      onError('The selected file appears to be corrupted or cannot be decoded as an image.');
    };
    testImg.src = objectUrl;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndProcessFile(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
      // Reset input value to allow selecting the same file again
      e.target.value = '';
    }
  };

  const handleSampleClick = (sample: SampleImage) => {
    if (disabled) return;
    onSelectImage(sample.dataUrl, `${sample.title.toLowerCase().replace(/\s+/g, '-')}.png`);
  };

  return (
    <div className="w-full space-y-6">
      {/* Dropzone */}
      <div
        id="dropzone-container"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]'
            : 'border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900 shadow-xs'
        } ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="file-upload-input"
          accept="image/jpeg,image/png,image/webp,image/bmp"
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="max-w-md mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 ring-8 ring-blue-50/50 dark:ring-blue-950/20">
            <UploadCloud className="w-8 h-8" />
          </div>

          <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Drop your image here, or <span className="text-blue-600 dark:text-blue-400 underline decoration-blue-300 dark:decoration-blue-700 underline-offset-2">browse</span>
          </h3>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            Supports high-resolution JPG, PNG, and WebP up to {MAX_FILE_SIZE_MB}MB
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono text-[10px] shadow-2xs">Ctrl</kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 font-mono text-[10px] shadow-2xs">V</kbd>
            <span>Paste directly from clipboard</span>
          </div>
        </div>
      </div>

      {/* Preset Sample Images Shelf */}
      {sampleImages.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>No image right now? Try a sample document</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sampleImages.map((sample) => (
              <button
                key={sample.id}
                type="button"
                id={`btn-sample-${sample.id}`}
                onClick={() => handleSampleClick(sample)}
                disabled={disabled}
                className="group p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-sm text-left transition-all flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shrink-0 text-neutral-600 dark:text-neutral-300 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-400 transition-colors">
                  {sample.id === 'receipt' && <Receipt className="w-5 h-5" />}
                  {sample.id === 'article' && <FileText className="w-5 h-5" />}
                  {sample.id === 'notice' && <ShieldAlert className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                    {sample.title}
                  </div>
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {sample.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
