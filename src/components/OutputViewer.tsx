import React, { useState, useEffect } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  FileText, 
  Code, 
  LayoutTemplate, 
  Sparkles, 
  Clock, 
  Layers, 
  Edit3, 
  Search, 
  RotateCcw,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { OcrResult } from '../types';
import { copyToClipboard, downloadFile, formatExtractedTextToHtml } from '../utils/ocrService';

interface OutputViewerProps {
  result: OcrResult;
  onClear: () => void;
}

type TabType = 'plain' | 'formatted' | 'html';

export const OutputViewer: React.FC<OutputViewerProps> = ({ result, onClear }) => {
  const [activeTab, setActiveTab] = useState<TabType>('formatted');
  const [copiedType, setCopiedType] = useState<'plain' | 'formatted' | 'html' | null>(null);
  
  // Editable text state
  const [editableText, setEditableText] = useState(result.plainText);
  const [formattedHtml, setFormattedHtml] = useState(result.formattedHtml);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update when result prop updates
  useEffect(() => {
    setEditableText(result.plainText);
    setFormattedHtml(result.formattedHtml);
    setIsEditing(false);
  }, [result]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const updated = e.target.value;
    setEditableText(updated);
    setFormattedHtml(formatExtractedTextToHtml(updated));
  };

  const handleCopyPlain = async () => {
    const success = await copyToClipboard(editableText, false);
    if (success) {
      setCopiedType('plain');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyFormatted = async () => {
    // Copies as rich text HTML into clipboard
    const success = await copyToClipboard(formattedHtml, true);
    if (success) {
      setCopiedType('formatted');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyHtmlCode = async () => {
    const success = await copyToClipboard(formattedHtml, false);
    if (success) {
      setCopiedType('html');
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleDownloadTxt = () => {
    downloadFile(editableText, 'extracted-text.txt', 'text/plain;charset=utf-8');
  };

  const handleDownloadHtml = () => {
    const fullHtmlDoc = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Extracted Document</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; }
    h3 { margin-top: 1.5rem; color: #111827; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.25rem; }
    ul { padding-left: 1.5rem; }
    p { margin-bottom: 1rem; }
  </style>
</head>
<body>
${formattedHtml}
</body>
</html>`;
    downloadFile(fullHtmlDoc, 'extracted-document.html', 'text/html;charset=utf-8');
  };

  // Confidence color & badge
  const conf = result.stats.confidence;
  const isHighConf = conf >= 80;
  const isMediumConf = conf >= 55 && conf < 80;

  // Search highlighting for plain text display
  const renderHighlightedContent = (text: string) => {
    if (!searchQuery.trim()) return text;
    const parts = text.split(new RegExp(`(${escapeRegex(searchQuery)})`, 'gi'));
    return (
      <>
        {parts.map((part, index) => 
          part.toLowerCase() === searchQuery.toLowerCase() ? (
            <mark key={index} className="bg-amber-300 dark:bg-amber-500/50 text-neutral-950 dark:text-neutral-50 rounded-xs px-0.5">
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  function escapeRegex(string: string) {
    return string.replace(/[/\-\\^$*+?.()|[\]{}]/g, '\\$&');
  }

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      {/* Top Header & Tab navigation */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 p-4 sm:px-6 bg-neutral-50/70 dark:bg-neutral-900/50 flex flex-wrap items-center justify-between gap-3">
        {/* Left Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 dark:bg-neutral-800 rounded-xl">
          <button
            type="button"
            id="tab-btn-formatted"
            onClick={() => setActiveTab('formatted')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'formatted'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <LayoutTemplate className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Formatted Text</span>
          </button>

          <button
            type="button"
            id="tab-btn-plain"
            onClick={() => setActiveTab('plain')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'plain'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Plain Text</span>
          </button>

          <button
            type="button"
            id="tab-btn-html"
            onClick={() => setActiveTab('html')}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'html'
                ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            <Code className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>HTML Code</span>
          </button>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edit mode toggle */}
          <button
            type="button"
            id="btn-toggle-edit"
            onClick={() => setIsEditing(!isEditing)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isEditing
                ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700'
            }`}
            title="Edit text manually"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Editing Mode' : 'Edit Text'}</span>
          </button>

          {/* Copy Button corresponding to current view or plain/formatted */}
          {activeTab === 'formatted' ? (
            <button
              type="button"
              id="btn-copy-formatted"
              onClick={handleCopyFormatted}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-xs transition-colors cursor-pointer"
            >
              {copiedType === 'formatted' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Formatted!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Formatted Text</span>
                </>
              )}
            </button>
          ) : activeTab === 'plain' ? (
            <button
              type="button"
              id="btn-copy-plain"
              onClick={handleCopyPlain}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500 shadow-xs transition-colors cursor-pointer"
            >
              {copiedType === 'plain' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Plain Text!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Plain Text</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              id="btn-copy-html"
              onClick={handleCopyHtmlCode}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-xs transition-colors cursor-pointer"
            >
              {copiedType === 'html' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied HTML!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy HTML Code</span>
                </>
              )}
            </button>
          )}

          {/* Quick Download Dropdown / Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              id="btn-download-txt"
              onClick={handleDownloadTxt}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Download as .txt"
              aria-label="Download as text file"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              id="btn-download-html"
              onClick={handleDownloadHtml}
              className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              title="Download as .html"
              aria-label="Download as HTML file"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-4 sm:px-6 py-2.5 bg-neutral-100/60 dark:bg-neutral-800/40 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            {isHighConf ? (
              <span className="inline-flex items-center gap-1 font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {conf}% Accuracy
              </span>
            ) : isMediumConf ? (
              <span className="inline-flex items-center gap-1 font-medium text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {conf}% Accuracy
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {conf}% Low Confidence
              </span>
            )}
          </span>

          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span>{result.stats.wordCount} words</span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span>{result.stats.characterCount} characters</span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span>{result.stats.lineCount} lines</span>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-neutral-400" />
            {(result.stats.durationMs / 1000).toFixed(2)}s
          </span>
        </div>

        {/* In-text search box */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2 top-2 pointer-events-none" />
          <input
            type="text"
            id="ocr-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search text..."
            className="pl-7 pr-2.5 py-1 text-xs rounded-md bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-36 sm:w-48"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 min-h-[260px] max-h-[500px] overflow-y-auto">
        {isEditing ? (
          <div className="space-y-2">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
              You can correct any recognized text directly below. Formatting updates in real-time.
            </div>
            <textarea
              id="ocr-editable-textarea"
              value={editableText}
              onChange={handleTextChange}
              rows={12}
              className="w-full font-mono text-sm p-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ) : activeTab === 'formatted' ? (
          <div
            id="ocr-formatted-preview"
            className="prose prose-neutral dark:prose-invert max-w-none text-sm sm:text-base leading-relaxed"
            dangerouslySetInnerHTML={{ __html: formattedHtml }}
          />
        ) : activeTab === 'plain' ? (
          <pre
            id="ocr-plain-preview"
            className="font-mono text-sm leading-relaxed whitespace-pre-wrap break-words text-neutral-800 dark:text-neutral-200"
          >
            {renderHighlightedContent(editableText)}
          </pre>
        ) : (
          <pre
            id="ocr-html-code-preview"
            className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words p-4 rounded-xl bg-neutral-950 text-neutral-200 border border-neutral-800 overflow-x-auto"
          >
            <code>{formattedHtml}</code>
          </pre>
        )}
      </div>

      {/* Bottom Footer with copy action reminders */}
      <div className="border-t border-neutral-200 dark:border-neutral-800 px-4 sm:px-6 py-3 bg-neutral-50/50 dark:bg-neutral-900/30 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            id="btn-copy-plain-footer"
            onClick={handleCopyPlain}
            className="text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 underline decoration-neutral-300 dark:decoration-neutral-700 flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            Copy Plain Text
          </button>
          <span className="text-neutral-300 dark:text-neutral-700">•</span>
          <button
            type="button"
            id="btn-copy-formatted-footer"
            onClick={handleCopyFormatted}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-blue-200 dark:decoration-blue-800 flex items-center gap-1 font-medium"
          >
            <Copy className="w-3 h-3" />
            Copy Formatted (Rich Text)
          </button>
        </div>

        <button
          type="button"
          id="btn-reset-ocr"
          onClick={onClear}
          className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Extract Another Image</span>
        </button>
      </div>
    </div>
  );
};
