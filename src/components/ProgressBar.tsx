import React from 'react';
import { Loader2, XCircle } from 'lucide-react';
import { ProgressInfo } from '../types';

interface ProgressBarProps {
  progressInfo: ProgressInfo;
  onCancel?: () => void;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ progressInfo, onCancel }) => {
  const percentage = Math.min(100, Math.max(0, Math.round(progressInfo.progress * 100)));

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
          <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {progressInfo.status || 'Extracting text...'}
          </span>
        </div>
        <span className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
          {percentage}%
        </span>
      </div>

      {/* Progress track */}
      <div className="w-full h-3 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden p-0.5 border border-neutral-200 dark:border-neutral-700">
        <div
          id="ocr-progress-bar-fill"
          className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.max(5, percentage)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
        <span>Running WebAssembly Tesseract OCR engine in browser memory</span>
        {onCancel && (
          <button
            type="button"
            id="btn-cancel-ocr"
            onClick={onCancel}
            className="text-xs text-neutral-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
