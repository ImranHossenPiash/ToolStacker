export interface ProgressInfo {
  status: string;
  progress: number; // 0 to 1
}

export type OcrStatus = 
  | 'idle'
  | 'loading-worker'
  | 'initializing'
  | 'recognizing'
  | 'completed'
  | 'error';

export interface ImageAdjustments {
  rotation: number; // 0, 90, 180, 270
  grayscale: boolean;
  highContrast: boolean;
  invert: boolean;
  brightness: number; // -50 to 50
}

export interface OcrStats {
  confidence: number;
  wordCount: number;
  characterCount: number;
  lineCount: number;
  paragraphCount: number;
  durationMs: number;
}

export interface OcrResult {
  plainText: string;
  formattedHtml: string;
  hocrText: string;
  stats: OcrStats;
}

export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
}

export interface SampleImage {
  id: string;
  title: string;
  description: string;
  category: string;
  dataUrl: string;
}
