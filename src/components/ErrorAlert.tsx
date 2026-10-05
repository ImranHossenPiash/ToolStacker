import React from 'react';
import { AlertCircle, X, HelpCircle, RefreshCw } from 'lucide-react';

interface ErrorAlertProps {
  message: string;
  onDismiss: () => void;
  onRetry?: () => void;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({ message, onDismiss, onRetry }) => {
  return (
    <div className="w-full rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 p-4 sm:p-5 shadow-xs animate-in fade-in duration-150">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-1">
            OCR Extraction Error
          </h4>
          <p className="text-xs sm:text-sm text-red-700 dark:text-red-300 leading-relaxed">
            {message}
          </p>

          <div className="mt-3 pt-3 border-t border-red-200/60 dark:border-red-900/40 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Tips: Check image orientation, increase contrast, or verify file is not corrupted.</span>
            </div>

            <div className="flex items-center gap-2">
              {onRetry && (
                <button
                  type="button"
                  id="btn-retry-ocr"
                  onClick={onRetry}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-800 dark:text-red-200 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  Try Again
                </button>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          id="btn-dismiss-error"
          onClick={onDismiss}
          className="text-red-400 hover:text-red-700 dark:hover:text-red-200 p-1 rounded-lg"
          aria-label="Dismiss error"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
