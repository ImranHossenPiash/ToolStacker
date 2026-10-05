import React, { useState } from 'react';
import { ScanText, Sun, Moon, ShieldCheck, Info, X } from 'lucide-react';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isDarkMode, onToggleTheme }) => {
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shadow-sm">
            <ScanText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50 font-display">
                Tool<span className="text-blue-600 dark:text-blue-400">Stacker</span> <span className="font-normal text-neutral-500 text-sm">OCR</span>
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <ShieldCheck className="w-3 h-3" />
                100% Client-Side OCR
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
              Browser-powered text extraction with Tesseract.js • Zero server uploads
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="btn-privacy-info"
            onClick={() => setShowPrivacyInfo(true)}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Privacy & Security Details"
            aria-label="Privacy Information"
          >
            <Info className="w-5 h-5" />
          </button>

          <button
            type="button"
            id="btn-theme-toggle"
            onClick={onToggleTheme}
            className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-neutral-700" />}
          </button>
        </div>
      </div>

      {/* Privacy modal dialog */}
      {showPrivacyInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              id="btn-close-privacy-modal"
              onClick={() => setShowPrivacyInfo(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-lg"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                Private & Secure OCR
              </h2>
            </div>
            <div className="space-y-3 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              <p>
                This tool runs <strong className="text-neutral-900 dark:text-white">purely on your device</strong> using WebAssembly via Tesseract.js.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <li>No images or documents are ever uploaded to any server.</li>
                <li>No external AI APIs or cloud services are queried.</li>
                <li>Your files, confidential receipts, and personal data remain completely private on your computer.</li>
                <li>Extraction works directly through your browser's memory.</li>
              </ul>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                id="btn-privacy-confirm"
                onClick={() => setShowPrivacyInfo(false)}
                className="px-4 py-2 text-sm font-medium bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 rounded-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
