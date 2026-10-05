import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ImagePreviewAdjuster } from './components/ImagePreviewAdjuster';
import { ProgressBar } from './components/ProgressBar';
import { OutputViewer } from './components/OutputViewer';
import { ErrorAlert } from './components/ErrorAlert';
import { OcrResult, OcrStatus, ProgressInfo } from './types';
import { performClientOcr } from './utils/ocrService';
import { FileScan, Cpu, Zap, Lock, FileCheck } from 'lucide-react';

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply dark mode class to HTML element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  // Image & OCR State
  const [imageSource, setImageSource] = useState<string | File | null>(null);
  const [filename, setFilename] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('eng');
  
  const [ocrStatus, setOcrStatus] = useState<OcrStatus>('idle');
  const [progressInfo, setProgressInfo] = useState<ProgressInfo>({ status: '', progress: 0 });
  const [result, setResult] = useState<OcrResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastProcessedUrl, setLastProcessedUrl] = useState<string | null>(null);

  // Handle image selection
  const handleSelectImage = (source: File | string, name?: string) => {
    setImageSource(source);
    setFilename(name || (typeof source === 'string' ? 'sample-image.png' : source.name));
    setResult(null);
    setErrorMessage(null);
    setOcrStatus('idle');
    setProgressInfo({ status: '', progress: 0 });
  };

  // Reset all
  const handleResetImage = () => {
    setImageSource(null);
    setFilename('');
    setResult(null);
    setErrorMessage(null);
    setOcrStatus('idle');
    setProgressInfo({ status: '', progress: 0 });
    setLastProcessedUrl(null);
  };

  // Run OCR
  const handleStartOcr = async (imageUrl: string) => {
    if (!imageUrl) return;

    setErrorMessage(null);
    setOcrStatus('loading-worker');
    setLastProcessedUrl(imageUrl);
    setProgressInfo({ status: 'Preparing Tesseract OCR...', progress: 0.05 });

    try {
      const ocrData = await performClientOcr(
        imageUrl,
        selectedLanguage,
        (progress) => {
          setProgressInfo(progress);
          if (progress.status.includes('Recognizing')) {
            setOcrStatus('recognizing');
          } else {
            setOcrStatus('initializing');
          }
        }
      );

      if (!ocrData.plainText || ocrData.plainText.trim().length === 0) {
        setErrorMessage('No readable text could be detected in this image. Try rotating the image, increasing contrast, or selecting a higher resolution image.');
        setOcrStatus('error');
      } else {
        setResult(ocrData);
        setOcrStatus('completed');
      }
    } catch (err: any) {
      console.error('OCR failure:', err);
      setErrorMessage(
        err?.message || 'An unexpected error occurred during OCR recognition. Please verify image orientation and try again.'
      );
      setOcrStatus('error');
    }
  };

  const handleRetry = () => {
    if (lastProcessedUrl) {
      handleStartOcr(lastProcessedUrl);
    } else if (imageSource) {
      handleStartOcr(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
    }
  };

  const isProcessing = ocrStatus === 'loading-worker' || ocrStatus === 'initializing' || ocrStatus === 'recognizing';

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100 transition-colors">
      {/* Top Navigation */}
      <Header isDarkMode={isDarkMode} onToggleTheme={toggleTheme} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Intro Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-2xs">
            <Cpu className="w-3.5 h-3.5" />
            <span>Tesseract.js WebAssembly Engine</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-display">
            Extract Text from Images Instantly
          </h2>
          <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            Fast, client-side Optical Character Recognition (OCR). Convert photos, scanned documents, receipts, and invoices into plain text or structured formatted HTML without cloud AI APIs.
          </p>
        </div>

        {/* Error Alert Display */}
        {errorMessage && (
          <div className="max-w-4xl mx-auto">
            <ErrorAlert
              message={errorMessage}
              onDismiss={() => setErrorMessage(null)}
              onRetry={handleRetry}
            />
          </div>
        )}

        {/* Step 1: Upload or Adjust Image */}
        <div className="max-w-4xl mx-auto space-y-6">
          {!imageSource ? (
            <ImageUploader
              onSelectImage={handleSelectImage}
              onError={(err) => setErrorMessage(err)}
              disabled={isProcessing}
            />
          ) : (
            <ImagePreviewAdjuster
              originalSource={imageSource}
              filename={filename}
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              onStartOcr={handleStartOcr}
              onResetImage={handleResetImage}
              isProcessing={isProcessing}
            />
          )}

          {/* Step 2: Processing Progress */}
          {isProcessing && (
            <ProgressBar
              progressInfo={progressInfo}
              onCancel={() => {
                setOcrStatus('idle');
                setErrorMessage('OCR process cancelled by user.');
              }}
            />
          )}

          {/* Step 3: OCR Results Output */}
          {result && !isProcessing && (
            <OutputViewer
              result={result}
              onClear={handleResetImage}
            />
          )}
        </div>

        {/* Feature Badges Footer */}
        <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6 text-neutral-600 dark:text-neutral-400">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200">
                100% Client-Side Privacy
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Images are analyzed directly inside your browser memory. No backend server or AI API touches your documents.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200">
                Plain & Formatted Output
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Get raw plain text or semantic HTML that preserves paragraphs, bold headings, and bulleted lists.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200">
                Image Enhancement
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                Built-in rotation, contrast enhancement, and binarization filters help decipher low-contrast scans and receipts.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Simple Clean Footer */}
      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-500 dark:text-neutral-500">
        <p>© 2026 ToolStacker • Client-Side OCR powered by Tesseract.js • 100% Private & In-Browser</p>
      </footer>
    </div>
  );
}
