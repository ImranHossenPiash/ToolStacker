/**
 * ToolStacker Image Format Converter
 * 100% Client-Side • Zero Server Uploads • Web Worker Accelerated
 * Supports JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, ICO, SVG
 */

// -------------------------------------------------------------
// Pure Client-Side Binary Encoders (BMP, ICO)
// -------------------------------------------------------------

/**
 * Encodes an ImageData or Canvas into a standard Windows BMP Blob
 */
function canvasToBmpBlob(canvas) {
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // BMP row must be multiple of 4 bytes
  const bytesPerPixel = 3; // 24-bit BGR
  const rowSize = Math.floor((bytesPerPixel * width + 3) / 4) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // BITMAPFILEHEADER (14 bytes)
  view.setUint16(0, 0x424D, false); // "BM"
  view.setUint32(2, fileSize, true);  // File size
  view.setUint16(6, 0, true);         // Reserved 1
  view.setUint16(8, 0, true);         // Reserved 2
  view.setUint32(10, 54, true);       // Offset to pixel data

  // BITMAPINFOHEADER (40 bytes)
  view.setUint32(14, 40, true);       // Header size
  view.setInt32(18, width, true);     // Image width
  view.setInt32(22, height, true);    // Image height (positive = bottom-to-top)
  view.setUint16(26, 1, true);        // Color planes
  view.setUint16(28, 24, true);       // Bits per pixel (24-bit)
  view.setUint32(30, 0, true);        // BI_RGB (uncompressed)
  view.setUint32(34, pixelArraySize, true); // Image data size
  view.setInt32(38, 2835, true);      // X pixels per meter (~72 DPI)
  view.setInt32(42, 2835, true);      // Y pixels per meter (~72 DPI)
  view.setUint32(46, 0, true);        // Total colors
  view.setUint32(50, 0, true);        // Important colors

  // Pixel data (Bottom-up, BGR)
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const px = rowOffset + x * 4;
      view.setUint8(offset++, data[px + 2]); // Blue
      view.setUint8(offset++, data[px + 1]); // Green
      view.setUint8(offset++, data[px]);     // Red
    }
    // Row padding
    for (let p = 0; p < rowSize - width * 3; p++) {
      view.setUint8(offset++, 0);
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Encodes a Canvas into a Windows .ico icon file Blob (with PNG payload)
 */
async function canvasToIcoBlob(canvas) {
  // Resize if larger than 256x256 for standard icon
  let targetCanvas = canvas;
  if (canvas.width > 256 || canvas.height > 256) {
    targetCanvas = document.createElement('canvas');
    const maxDim = Math.max(canvas.width, canvas.height);
    const scale = 256 / maxDim;
    targetCanvas.width = Math.round(canvas.width * scale);
    targetCanvas.height = Math.round(canvas.height * scale);
    const tCtx = targetCanvas.getContext('2d');
    tCtx.drawImage(canvas, 0, 0, targetCanvas.width, targetCanvas.height);
  }

  const pngBlob = await new Promise(resolve => targetCanvas.toBlob(resolve, 'image/png'));
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  const w = targetCanvas.width >= 256 ? 0 : targetCanvas.width;
  const h = targetCanvas.height >= 256 ? 0 : targetCanvas.height;

  const icoSize = 6 + 16 + pngBytes.length;
  const buffer = new ArrayBuffer(icoSize);
  const view = new DataView(buffer);

  // ICONDIR Header (6 bytes)
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // Resource Type (1 = Icon)
  view.setUint16(4, 1, true); // Image count (1)

  // ICONDIRENTRY (16 bytes)
  view.setUint8(6, w);                  // Width
  view.setUint8(7, h);                  // Height
  view.setUint8(8, 0);                  // Color palette count
  view.setUint8(9, 0);                  // Reserved
  view.setUint16(10, 1, true);          // Color planes
  view.setUint16(12, 32, true);         // Bits per pixel
  view.setUint32(14, pngBytes.length, true); // Size of image data
  view.setUint32(18, 22, true);         // Offset to image data (6 + 16 = 22)

  // Copy PNG bytes into buffer
  const outBytes = new Uint8Array(buffer, 22);
  outBytes.set(pngBytes);

  return new Blob([buffer], { type: 'image/x-icon' });
}

// -------------------------------------------------------------
// Format Detection & Support Testing
// -------------------------------------------------------------
const FORMAT_SPECS = {
  'image/jpeg': { ext: 'jpg', name: 'JPEG', lossy: true, mime: 'image/jpeg' },
  'image/png': { ext: 'png', name: 'PNG', lossy: false, mime: 'image/png' },
  'image/webp': { ext: 'webp', name: 'WebP', lossy: true, mime: 'image/webp' },
  'image/avif': { ext: 'avif', name: 'AVIF', lossy: true, mime: 'image/avif' },
  'image/bmp': { ext: 'bmp', name: 'BMP', lossy: false, mime: 'image/bmp' },
  'image/gif': { ext: 'gif', name: 'GIF', lossy: false, mime: 'image/gif' },
  'image/x-icon': { ext: 'ico', name: 'ICO', lossy: false, mime: 'image/x-icon' }
};

let _avifSupported = null;
async function checkAvifSupport() {
  if (_avifSupported !== null) return _avifSupported;
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    const blob = await new Promise(resolve => c.toBlob(resolve, 'image/avif'));
    _avifSupported = !!(blob && blob.type === 'image/avif');
  } catch (e) {
    _avifSupported = false;
  }
  return _avifSupported;
}

// -------------------------------------------------------------
// Lazy Loaded HEIC Support
// -------------------------------------------------------------
let _heicLoadingPromise = null;
function loadHeicLibrary() {
  if (window.heic2any) return Promise.resolve(window.heic2any);
  if (_heicLoadingPromise) return _heicLoadingPromise;

  _heicLoadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
    script.async = true;
    script.onload = () => {
      resolve(window.heic2any);
    };
    script.onerror = (err) => {
      _heicLoadingPromise = null;
      reject(new Error('Failed to load HEIC decoder from CDN. Please check your network connection.'));
    };
    document.head.appendChild(script);
  });
  return _heicLoadingPromise;
}

// -------------------------------------------------------------
// Internationalization (i18n)
// -------------------------------------------------------------
const I18N = {
  en: {
    appTitle: "Image Format Converter",
    appSubtitle: "Convert JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, ICO and SVG in your browser. 100% client-side, free, and completely private.",
    dropzoneTitle: "Drag & drop images here, or browse files",
    dropzoneSubtitle: "Supports JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, TIFF, ICO, SVG • Batch convert 50+ files • Ctrl+V to paste",
    dropzoneBrowseBtn: "Select Images",
    settingsTitle: "Conversion Settings",
    resizeTitle: "Naming & Export Preferences",
    defaultFormatLabel: "Default Target Format",
    defaultQualityLabel: "Default Quality",
    bgColorLabel: "Background Color (For JPG/BMP)",
    bgColorHelp: "Fills transparent areas when converting transparent PNG/WebP to non-transparent formats",
    stripExifLabel: "Strip Metadata (EXIF/GPS)",
    stripExifHelp: "Protects your privacy by removing location and camera metadata",
    namingPatternLabel: "File Naming Pattern",
    namingOriginal: "original_converted.ext",
    namingFormat: "original_format.ext",
    namingKeep: "original.ext",
    resetSettingsBtn: "Reset Defaults",
    toggleCollapse: "Collapse All",
    toggleExpand: "Expand All",
    batchSummary: "Batch Summary",
    totalImages: "Images:",
    totalInputSize: "Input Size:",
    totalOutputSize: "Converted Size:",
    downloadAllZip: "Download All as ZIP",
    clearAllBtn: "Clear All",
    convertAllBtn: "Convert All",
    statusProcessing: "Converting...",
    statusDone: "Converted",
    statusError: "Failed",
    downloadBtn: "Download",
    zoomBtn: "Compare & Zoom",
    zoomModalTitle: "Format Comparison & Zoom Inspection",
    zoomCloseBtn: "Close",
    zoomFit: "Fit View",
    zoom100: "100%",
    zoom200: "200%",
    noImagesYet: "No images added yet. Drop images or click above to begin converting.",
    unsupportedFormat: "Unsupported file format. Please upload JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, TIFF, ICO, or SVG.",
    copiedToast: "Image copied from clipboard!",
    savedSettingsToast: "Settings saved to browser.",
    zipSuccessToast: "ZIP archive created and download started!",
    uploadedToast: "image(s) added! Converting now...",
    avifNotice: "AVIF output is not natively supported by this browser. Automatically converted to WebP.",
    heicDecoding: "Decoding HEIC image...",
    convertError: "Conversion error. Please check file format."
  },
  bn: {
    appTitle: "ইমেজ ফরম্যাট কনভার্টার",
    appSubtitle: "কোয়ালিটি না হারিয়ে JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, ICO ও SVG রূপান্তর করুন। ১০০% ক্লায়েন্ট-সাইড, ফ্রি ও সম্পূর্ণ নিরাপদ।",
    dropzoneTitle: "এখানে ছবি টেনে এনে ছেড়ে দিন, অথবা ব্রাউজ করুন",
    dropzoneSubtitle: "JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, TIFF, ICO, SVG সাপোর্ট করে • একসাথে ৫০+ ছবি রূপান্তর করুন • পেস্ট করতে Ctrl+V চাপুন",
    dropzoneBrowseBtn: "ছবি নির্বাচন করুন",
    settingsTitle: "কনভার্সন সেটিংস",
    resizeTitle: "নেমিং ও এক্সপোর্ট প্রেফারেন্স",
    defaultFormatLabel: "ডিফল্ট টার্গেট ফরম্যাট",
    defaultQualityLabel: "ডিফল্ট কোয়ালিটি",
    bgColorLabel: "ব্যাকগ্রাউন্ড কালার (JPG/BMP এর জন্য)",
    bgColorHelp: "স্বচ্ছ PNG/WebP ছবিতে স্বচ্ছ অংশ ভরাট করতে ব্যাকগ্রাউন্ড কালার ব্যবহার করা হয়",
    stripExifLabel: "মেটাডাটা মুছে ফেলুন (EXIF/GPS)",
    stripExifHelp: "লোকেশন ও ক্যামেরা তথ্য মুছে আপনার গোপনীয়তা নিশ্চিত করে",
    namingPatternLabel: "ফাইল নেমিং প্যাটার্ন",
    namingOriginal: "original_converted.ext",
    namingFormat: "original_format.ext",
    namingKeep: "original.ext",
    resetSettingsBtn: "রিসেট করুন",
    toggleCollapse: "সব সংকুচিত করুন",
    toggleExpand: "সব প্রসারিত করুন",
    batchSummary: "ব্যাচ সামারি",
    totalImages: "মোট ছবি:",
    totalInputSize: "ইনপুট সাইজ:",
    totalOutputSize: "কনভার্টেড সাইজ:",
    downloadAllZip: "সব ছবি জিপ (ZIP) আকারে ডাউনলোড",
    clearAllBtn: "সব মুছুন",
    convertAllBtn: "সব রূপান্তর করুন",
    statusProcessing: "রূপান্তর হচ্ছে...",
    statusDone: "সম্পন্ন",
    statusError: "ব্যর্থ",
    downloadBtn: "ডাউনলোড",
    zoomBtn: "তুলনা ও জুম",
    zoomModalTitle: "ফরম্যাট তুলনা ও জুম ইনস্পেকশন",
    zoomCloseBtn: "বন্ধ করুন",
    zoomFit: "ফিট ভিউ",
    zoom100: "১০০%",
    zoom200: "২০০%",
    noImagesYet: "এখনও কোনো ছবি আপলোড করা হয়নি। রূপান্তর শুরু করতে উপরে ছবি ড্রপ করুন।",
    unsupportedFormat: "অসমর্থিত ফরম্যাট। দয়া করে JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, TIFF, ICO বা SVG আপলোড করুন।",
    copiedToast: "ক্লিপবোর্ড থেকে ছবি যোগ করা হয়েছে!",
    savedSettingsToast: "সেটিংস সংরক্ষিত হয়েছে।",
    zipSuccessToast: "ZIP ফাইল প্রস্তুত ও ডাউনলোড শুরু হয়েছে!",
    uploadedToast: "টি ছবি যোগ করা হয়েছে! রূপান্তর শুরু হয়েছে...",
    avifNotice: "এই ব্রাউজারে AVIF এনকোডিং সমর্থিত নয়। স্বয়ংক্রিয়ভাবে WebP তে রূপান্তর করা হয়েছে।",
    heicDecoding: "HEIC ইমেজ ডিকোড করা হচ্ছে...",
    convertError: "রূপান্তর ব্যর্থ হয়েছে। ফাইলটি আবার চেষ্টা করুন।"
  }
};

// -------------------------------------------------------------
// ImageConverterApp Class
// -------------------------------------------------------------
class ImageConverterApp {
  constructor() {
    this.currentLang = localStorage.getItem('toolstacker_lang') || 'en';
    this.items = [];
    this.isProcessingQueue = false;
    this.settings = this.loadSettings();

    this.cacheDom();
    this.bindEvents();
    this.syncSettingsToUI();
    this.applyLanguage(this.currentLang);
    checkAvifSupport();
  }

  loadSettings() {
    const defaultSettings = {
      defaultFormat: 'image/webp',
      defaultQuality: 85,
      bgColor: '#ffffff',
      stripExif: true,
      namingPattern: 'converted' // 'converted', 'format', 'original'
    };

    try {
      const saved = localStorage.getItem('toolstacker_converter_settings');
      if (saved) return Object.assign(defaultSettings, JSON.parse(saved));
    } catch (e) {
      // Fallback
    }
    return defaultSettings;
  }

  saveSettings() {
    try {
      localStorage.setItem('toolstacker_converter_settings', JSON.stringify(this.settings));
      this.showToast(I18N[this.currentLang]?.savedSettingsToast || 'Settings saved.');
    } catch (e) {}
  }

  cacheDom() {
    // Dropzone & Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Batch Summary Bar
    this.batchSummaryBar = document.getElementById('batch-summary-bar');
    this.totalImagesEl = document.getElementById('total-images');
    this.totalInputSizeEl = document.getElementById('total-input-size');
    this.totalOutputSizeEl = document.getElementById('total-output-size');
    this.globalFormatSelect = document.getElementById('global-format-select');
    this.convertAllBtn = document.getElementById('convert-all-btn');
    this.downloadAllBtn = document.getElementById('download-all-btn');
    this.clearAllBtn = document.getElementById('clear-all-btn');
    this.batchProgressBar = document.getElementById('batch-progress-bar');
    this.batchProgressFill = document.getElementById('batch-progress-fill');

    // Cards Container & Empty State
    this.cardsContainer = document.getElementById('cards-container');
    this.emptyState = document.getElementById('empty-state');

    // Settings Controls
    this.settingDefaultFormat = document.getElementById('setting-default-format');
    this.settingDefaultQuality = document.getElementById('setting-default-quality');
    this.settingDefaultQualityVal = document.getElementById('setting-default-quality-val');
    this.settingBgColor = document.getElementById('setting-bg-color');
    this.settingBgColorText = document.getElementById('setting-bg-color-text');
    this.settingStripExif = document.getElementById('setting-strip-exif');
    this.settingNamingPattern = document.getElementById('setting-naming-pattern');
    this.resetSettingsBtn = document.getElementById('reset-settings-btn');
    this.toggleAllSettingsBtn = document.getElementById('toggle-all-settings-btn');
    this.toggleAllSettingsText = document.getElementById('toggle-all-settings-text');

    // Accordions
    this.accordionBtnConversion = document.getElementById('accordion-btn-conversion');
    this.accordionBodyConversion = document.getElementById('accordion-body-conversion');
    this.accordionIconConversion = document.getElementById('accordion-icon-conversion');

    this.accordionBtnNaming = document.getElementById('accordion-btn-naming');
    this.accordionBodyNaming = document.getElementById('accordion-body-naming');
    this.accordionIconNaming = document.getElementById('accordion-icon-naming');

    // Language Toggle
    this.langToggleBtn = document.getElementById('lang-toggle-btn');

    // Zoom Inspection Modal
    this.zoomModal = document.getElementById('zoom-modal');
    this.zoomCloseBtn = document.getElementById('zoom-close-btn');
    this.zoomBeforeImg = document.getElementById('zoom-before-img');
    this.zoomAfterImg = document.getElementById('zoom-after-img');
    this.zoomCompareOverlay = document.getElementById('zoom-compare-overlay');
    this.zoomSlider = document.getElementById('zoom-slider');
    this.zoomLevelSelect = document.getElementById('zoom-level-select');
    this.zoomViewport = document.getElementById('zoom-viewport');
    this.zoomModalTitle = document.getElementById('zoom-modal-title');
    this.zoomStatsBadge = document.getElementById('zoom-stats-badge');
  }

  bindEvents() {
    // Language Toggle
    if (this.langToggleBtn) {
      this.langToggleBtn.addEventListener('click', () => {
        this.currentLang = this.currentLang === 'en' ? 'bn' : 'en';
        localStorage.setItem('toolstacker_lang', this.currentLang);
        this.applyLanguage(this.currentLang);
      });
    }

    // Browse Button & File Input
    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.handleFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      });
    }

    if (this.browseBtn && this.fileInput) {
      this.browseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.fileInput.click();
      });
    }

    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', (e) => {
        if (e.target !== this.fileInput && !e.target.closest('#browse-btn')) {
          this.fileInput.click();
        }
      });

      this.dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.fileInput.click();
        }
      });

      // Drag and Drop
      ['dragenter', 'dragover'].forEach(name => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.handleFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    // Global Paste (Ctrl+V) anywhere on page
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        this.handleFiles(files);
        this.showToast(I18N[this.currentLang]?.copiedToast || 'Pasted from clipboard!');
      }
    });

    // Global Settings Changes
    if (this.settingDefaultFormat) {
      this.settingDefaultFormat.addEventListener('change', (e) => {
        this.settings.defaultFormat = e.target.value;
        this.saveSettings();
      });
    }

    if (this.settingDefaultQuality) {
      this.settingDefaultQuality.addEventListener('input', (e) => {
        this.settings.defaultQuality = parseInt(e.target.value, 10);
        if (this.settingDefaultQualityVal) {
          this.settingDefaultQualityVal.textContent = `${this.settings.defaultQuality}%`;
        }
      });
      this.settingDefaultQuality.addEventListener('change', () => this.saveSettings());
    }

    if (this.settingBgColor) {
      this.settingBgColor.addEventListener('input', (e) => {
        this.settings.bgColor = e.target.value;
        if (this.settingBgColorText) this.settingBgColorText.value = e.target.value;
      });
      this.settingBgColor.addEventListener('change', () => this.saveSettings());
    }

    if (this.settingBgColorText) {
      this.settingBgColorText.addEventListener('input', (e) => {
        const val = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
          this.settings.bgColor = val;
          if (this.settingBgColor) this.settingBgColor.value = val;
          this.saveSettings();
        }
      });
    }

    if (this.settingStripExif) {
      this.settingStripExif.addEventListener('change', (e) => {
        this.settings.stripExif = e.target.checked;
        this.saveSettings();
      });
    }

    if (this.settingNamingPattern) {
      this.settingNamingPattern.addEventListener('change', (e) => {
        this.settings.namingPattern = e.target.value;
        this.saveSettings();
      });
    }

    // Reset Defaults Button
    if (this.resetSettingsBtn) {
      this.resetSettingsBtn.addEventListener('click', () => {
        localStorage.removeItem('toolstacker_converter_settings');
        this.settings = this.loadSettings();
        this.syncSettingsToUI();
        this.showToast(I18N[this.currentLang]?.savedSettingsToast || 'Settings reset to default.');
      });
    }

    // Global Target Format Selector ("Convert all to:")
    if (this.globalFormatSelect) {
      this.globalFormatSelect.addEventListener('change', (e) => {
        const newFormat = e.target.value;
        if (!newFormat) return;
        this.items.forEach(item => {
          item.targetFormat = newFormat;
          item.status = 'queued';
          const cardSelect = document.getElementById(`format-select-${item.id}`);
          if (cardSelect) cardSelect.value = newFormat;
          this.updateCardQualityVisibility(item);
        });
        this.processQueue();
      });
    }

    // Convert All Button
    if (this.convertAllBtn) {
      this.convertAllBtn.addEventListener('click', () => {
        this.items.forEach(item => { item.status = 'queued'; });
        this.processQueue();
      });
    }

    // Download All as ZIP
    if (this.downloadAllBtn) {
      this.downloadAllBtn.addEventListener('click', () => this.downloadAllAsZip());
    }

    // Clear All
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // Accordions
    if (this.accordionBtnConversion && this.accordionBodyConversion) {
      this.accordionBtnConversion.addEventListener('click', () => {
        const isHidden = this.accordionBodyConversion.classList.toggle('hidden');
        if (this.accordionIconConversion) {
          this.accordionIconConversion.classList.toggle('rotate-180', !isHidden);
        }
      });
    }

    if (this.accordionBtnNaming && this.accordionBodyNaming) {
      this.accordionBtnNaming.addEventListener('click', () => {
        const isHidden = this.accordionBodyNaming.classList.toggle('hidden');
        if (this.accordionIconNaming) {
          this.accordionIconNaming.classList.toggle('rotate-180', !isHidden);
        }
      });
    }

    if (this.toggleAllSettingsBtn) {
      this.toggleAllSettingsBtn.addEventListener('click', () => {
        const c1Hidden = this.accordionBodyConversion?.classList.contains('hidden');
        const c2Hidden = this.accordionBodyNaming?.classList.contains('hidden');
        const shouldExpand = c1Hidden || c2Hidden;

        if (this.accordionBodyConversion) {
          this.accordionBodyConversion.classList.toggle('hidden', !shouldExpand);
          if (this.accordionIconConversion) {
            this.accordionIconConversion.classList.toggle('rotate-180', shouldExpand);
          }
        }
        if (this.accordionBodyNaming) {
          this.accordionBodyNaming.classList.toggle('hidden', !shouldExpand);
          if (this.accordionIconNaming) {
            this.accordionIconNaming.classList.toggle('rotate-180', shouldExpand);
          }
        }
        if (this.toggleAllSettingsText) {
          const t = I18N[this.currentLang] || I18N.en;
          this.toggleAllSettingsText.textContent = shouldExpand ? (t.toggleCollapse || 'Collapse All') : (t.toggleExpand || 'Expand All');
        }
      });
    }

    // Zoom Modal Close & Keyboard Esc
    if (this.zoomCloseBtn && this.zoomModal) {
      this.zoomCloseBtn.addEventListener('click', () => this.closeZoomModal());
      this.zoomModal.addEventListener('click', (e) => {
        if (e.target === this.zoomModal) this.closeZoomModal();
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !this.zoomModal.classList.contains('hidden')) {
          this.closeZoomModal();
        }
      });
    }

    // Zoom Level Controls
    if (this.zoomLevelSelect) {
      this.zoomLevelSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === 'fit') {
          this.zoomBeforeImg.style.transform = 'scale(1)';
          this.zoomAfterImg.style.transform = 'scale(1)';
        } else {
          const factor = parseFloat(val);
          this.zoomBeforeImg.style.transform = `scale(${factor})`;
          this.zoomAfterImg.style.transform = `scale(${factor})`;
        }
      });
    }

    // Zoom Split Slider
    if (this.zoomSlider && this.zoomCompareOverlay) {
      this.zoomSlider.addEventListener('input', (e) => {
        this.zoomCompareOverlay.style.width = `${e.target.value}%`;
      });
    }
  }

  syncSettingsToUI() {
    if (this.settingDefaultFormat) this.settingDefaultFormat.value = this.settings.defaultFormat;
    if (this.settingDefaultQuality) this.settingDefaultQuality.value = this.settings.defaultQuality;
    if (this.settingDefaultQualityVal) this.settingDefaultQualityVal.textContent = `${this.settings.defaultQuality}%`;
    if (this.settingBgColor) this.settingBgColor.value = this.settings.bgColor;
    if (this.settingBgColorText) this.settingBgColorText.value = this.settings.bgColor;
    if (this.settingStripExif) this.settingStripExif.checked = this.settings.stripExif;
    if (this.settingNamingPattern) this.settingNamingPattern.value = this.settings.namingPattern;
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    const t = I18N[lang] || I18N.en;

    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) el.textContent = t[key];
    });

    if (this.langToggleBtn) {
      this.langToggleBtn.innerHTML = `
        <i data-lucide="languages" class="w-4 h-4 text-blue-600"></i>
        <span>${lang === 'en' ? 'বাংলা' : 'English'}</span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // -------------------------------------------------------------
  // File Upload & Intake Pipeline
  // -------------------------------------------------------------
  async handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const newItems = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isImage = (file.type && file.type.startsWith('image/')) ||
                      ['jpg', 'jpeg', 'png', 'webp', 'avif', 'heic', 'heif', 'gif', 'bmp', 'tiff', 'ico', 'svg'].includes(ext);

      if (!isImage) {
        this.showToast(I18N[this.currentLang]?.unsupportedFormat || 'Unsupported format');
        continue;
      }

      const id = 'conv_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now() + '_' + i;
      let originalUrl = '';
      try {
        originalUrl = URL.createObjectURL(file);
      } catch (e) {}

      // Smart default target format
      let targetFormat = this.settings.defaultFormat;
      if (ext === 'png') targetFormat = 'image/webp';
      else if (ext === 'webp') targetFormat = 'image/png';
      else if (ext === 'jpg' || ext === 'jpeg') targetFormat = 'image/webp';
      else if (ext === 'heic' || ext === 'heif') targetFormat = 'image/jpeg';
      else if (ext === 'svg') targetFormat = 'image/png';

      const item = {
        id,
        file,
        name: file.name || 'image',
        ext: ext || 'png',
        type: file.type || `image/${ext}`,
        originalSize: file.size,
        originalUrl,
        originalWidth: 0,
        originalHeight: 0,
        targetFormat,
        quality: this.settings.defaultQuality,
        convertedBlob: null,
        convertedUrl: null,
        convertedSize: 0,
        convertedWidth: 0,
        convertedHeight: 0,
        status: 'queued', // 'queued', 'processing', 'done', 'error'
        errorMessage: ''
      };

      newItems.push(item);
      this.items.push(item);
    }

    if (newItems.length > 0) {
      this.updateUI();
      // Scroll into view so user immediately sees their cards appear directly below dropzone
      const summaryBar = document.getElementById('batch-summary-bar');
      if (summaryBar) {
        summaryBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const t = I18N[this.currentLang] || I18N.en;
      this.showToast(`${newItems.length} ${t.uploadedToast || 'image(s) added! Converting now...'}`);
      this.processQueue();
    }
  }

  // -------------------------------------------------------------
  // Queue Processing
  // -------------------------------------------------------------
  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    if (this.batchProgressBar) this.batchProgressBar.classList.remove('hidden');

    const queuedItems = this.items.filter(item => item.status === 'queued' || item.status === 'processing');
    const totalToProcess = queuedItems.length;
    let completedCount = 0;

    // Process in batches of 2 concurrency for optimal performance and memory
    const batchSize = 2;
    for (let i = 0; i < queuedItems.length; i += batchSize) {
      const batch = queuedItems.slice(i, i + batchSize);
      await Promise.all(batch.map(async (item) => {
        item.status = 'processing';
        this.updateCardStatus(item);

        try {
          await this.convertImageItem(item);
          item.status = 'done';
        } catch (err) {
          item.status = 'error';
          item.errorMessage = err.message || (I18N[this.currentLang]?.convertError || 'Conversion failed');
        }
        completedCount++;
        const pct = Math.round((completedCount / totalToProcess) * 100);
        if (this.batchProgressFill) this.batchProgressFill.style.width = `${pct}%`;
        this.updateCardStatus(item);
      }));
    }

    setTimeout(() => {
      if (this.batchProgressBar) this.batchProgressBar.classList.add('hidden');
      if (this.batchProgressFill) this.batchProgressFill.style.width = '0%';
    }, 500);

    this.isProcessingQueue = false;
    this.updateSummary();
  }

  // -------------------------------------------------------------
  // Core Image Conversion Engine
  // -------------------------------------------------------------
  async convertImageItem(item) {
    let sourceBlob = item.file;

    // 1. Handle HEIC / HEIF
    if (item.ext === 'heic' || item.ext === 'heif' || item.type === 'image/heic' || item.type === 'image/heif') {
      try {
        const heic2any = await loadHeicLibrary();
        const decodedBlob = await heic2any({
          blob: item.file,
          toType: 'image/jpeg',
          quality: 0.95
        });
        sourceBlob = Array.isArray(decodedBlob) ? decodedBlob[0] : decodedBlob;
      } catch (err) {
        throw new Error('HEIC decoding failed. Please ensure file is a valid HEIC photo.');
      }
    }

    // 2. Load into Image element
    const sourceUrl = URL.createObjectURL(sourceBlob);
    let img;
    try {
      img = await this.loadImage(sourceUrl);
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }

    item.originalWidth = img.naturalWidth || img.width;
    item.originalHeight = img.naturalHeight || img.height;
    item.convertedWidth = item.originalWidth;
    item.convertedHeight = item.originalHeight;

    // 3. Render onto Canvas with Transparency Handling
    const canvas = document.createElement('canvas');
    canvas.width = item.originalWidth;
    canvas.height = item.originalHeight;
    const ctx = canvas.getContext('2d');

    // Fill background color if target format does not support transparency (e.g. JPG, BMP)
    const targetMime = item.targetFormat;
    const isTargetLossyOrNonAlpha = (targetMime === 'image/jpeg' || targetMime === 'image/bmp');
    if (isTargetLossyOrNonAlpha) {
      ctx.fillStyle = this.settings.bgColor || '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // 4. Export to requested format Blob
    const quality = (item.quality || this.settings.defaultQuality) / 100;
    let outBlob = null;

    if (targetMime === 'image/bmp') {
      outBlob = canvasToBmpBlob(canvas);
    } else if (targetMime === 'image/x-icon') {
      outBlob = await canvasToIcoBlob(canvas);
    } else if (targetMime === 'image/avif') {
      const isAvif = await checkAvifSupport();
      if (isAvif) {
        outBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/avif', quality));
      }
      if (!outBlob || outBlob.size === 0) {
        // Fallback to WebP if browser cannot encode AVIF
        outBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
        item.targetFormat = 'image/webp';
        this.showToast(I18N[this.currentLang]?.avifNotice || 'AVIF encoding not supported in this browser. Converted to WebP.');
      }
    } else {
      // Standard JPG, PNG, WebP, GIF
      outBlob = await new Promise((resolve) => {
        canvas.toBlob((blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            // Fallback to PNG
            canvas.toBlob(resolve, 'image/png');
          }
        }, targetMime, quality);
      });
    }

    if (!outBlob || outBlob.size === 0) {
      throw new Error('Canvas conversion produced an empty blob.');
    }

    item.convertedBlob = outBlob;
    if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    item.convertedUrl = URL.createObjectURL(outBlob);
    item.convertedSize = outBlob.size;
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image for conversion.'));
      img.src = src;
      if (img.complete && img.naturalWidth) resolve(img);
    });
  }

  // -------------------------------------------------------------
  // Card UI & Comparison Slider Rendering
  // -------------------------------------------------------------
  updateUI() {
    const hasItems = this.items.length > 0;
    if (this.emptyState) this.emptyState.classList.toggle('hidden', hasItems);
    if (this.batchSummaryBar) this.batchSummaryBar.classList.toggle('hidden', !hasItems);

    if (!hasItems) {
      if (this.cardsContainer) this.cardsContainer.innerHTML = '';
      return;
    }

    this.items.forEach((item) => {
      let card = document.getElementById(`card-${item.id}`);
      if (!card) {
        card = this.createCardElement(item);
        this.cardsContainer.appendChild(card);
      }
    });

    this.updateSummary();
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  createCardElement(item) {
    const card = document.createElement('div');
    card.id = `card-${item.id}`;
    card.className = 'group relative flex flex-col md:flex-row items-stretch gap-4 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all';

    const t = I18N[this.currentLang] || I18N.en;
    const formatSpec = FORMAT_SPECS[item.targetFormat] || FORMAT_SPECS['image/webp'];

    card.innerHTML = `
      <!-- Thumbnail with Live Comparison Slider -->
      <div class="relative w-full md:w-56 h-48 md:h-44 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 transparency-grid select-none">
        
        <!-- After (Converted) Image -->
        <img id="img-after-${item.id}" src="${item.originalUrl}" alt="Converted Preview" class="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        
        <!-- Before (Original) Overlay -->
        <div id="overlay-${item.id}" class="absolute inset-0 overflow-hidden pointer-events-none" style="clip-path: inset(0 50% 0 0);">
          <img id="img-before-${item.id}" src="${item.originalUrl}" alt="Original Preview" class="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        </div>

        <!-- Slider Line & Handle -->
        <div id="handle-line-${item.id}" class="absolute top-0 bottom-0 pointer-events-none border-r-2 border-white shadow-md z-10" style="left: 50%;"></div>
        <div id="handle-${item.id}" class="compare-handle pointer-events-none z-20" style="left: 50%;">
          <i data-lucide="chevrons-left-right" class="w-3.5 h-3.5 text-white"></i>
        </div>

        <!-- Range Input for Slider -->
        <input type="range" min="0" max="100" value="50" class="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" aria-label="Compare Before and After" />

        <!-- Labels -->
        <span class="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs pointer-events-none">
          Original
        </span>
        <span class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600/80 text-white backdrop-blur-xs pointer-events-none">
          Converted
        </span>

        <!-- Zoom Inspection Trigger -->
        <button type="button" class="zoom-trigger-btn absolute bottom-2 right-2 z-30 p-1.5 rounded-lg bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 hover:text-blue-600 shadow-xs backdrop-blur-xs transition-colors cursor-pointer" title="${t.zoomBtn}">
          <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      <!-- Info & Conversion Controls -->
      <div class="flex-1 flex flex-col justify-between min-w-0 space-y-3">
        <div>
          <div class="flex items-start justify-between gap-2">
            <h4 class="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate" title="${item.name}">
              ${item.name}
            </h4>
            <button type="button" class="delete-item-btn p-1.5 text-neutral-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>

          <!-- Format & Dimension Badges -->
          <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-500">
            <span id="badge-dims-${item.id}" class="font-mono text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Measuring...
            </span>
            <span class="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 font-semibold uppercase">
              ${item.ext.toUpperCase()}
            </span>
            <span id="status-pill-${item.id}" class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>
              <span>${t.statusProcessing}</span>
            </span>
          </div>
        </div>

        <!-- Controls: Output Format Selector & Quality Slider -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
          
          <!-- Format Selector -->
          <div class="space-y-1">
            <label class="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
              Output Format
            </label>
            <select id="format-select-${item.id}" class="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-xs font-semibold cursor-pointer">
              <option value="image/jpeg" ${item.targetFormat === 'image/jpeg' ? 'selected' : ''}>JPG / JPEG</option>
              <option value="image/png" ${item.targetFormat === 'image/png' ? 'selected' : ''}>PNG</option>
              <option value="image/webp" ${item.targetFormat === 'image/webp' ? 'selected' : ''}>WebP</option>
              <option value="image/avif" ${item.targetFormat === 'image/avif' ? 'selected' : ''}>AVIF</option>
              <option value="image/bmp" ${item.targetFormat === 'image/bmp' ? 'selected' : ''}>BMP</option>
              <option value="image/gif" ${item.targetFormat === 'image/gif' ? 'selected' : ''}>GIF</option>
              <option value="image/x-icon" ${item.targetFormat === 'image/x-icon' ? 'selected' : ''}>ICO (Icon)</option>
            </select>
          </div>

          <!-- Quality Slider (shown for JPG, WebP, AVIF) -->
          <div id="quality-ctrl-${item.id}" class="space-y-1 ${formatSpec.lossy ? '' : 'opacity-40 pointer-events-none'}">
            <div class="flex items-center justify-between text-[11px] font-semibold">
              <span class="text-neutral-500">Quality</span>
              <span id="quality-val-${item.id}" class="font-mono text-blue-600 font-bold">${item.quality}%</span>
            </div>
            <input type="range" id="quality-slider-${item.id}" min="1" max="100" value="${item.quality}" class="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg cursor-pointer" />
          </div>

        </div>

        <!-- Metrics & Download Row -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          
          <div class="flex items-center gap-3 text-xs">
            <div>
              <span class="text-neutral-400 text-[11px]">Original:</span>
              <span class="font-semibold text-neutral-700 dark:text-neutral-300 ml-1">${this.formatBytes(item.originalSize)}</span>
            </div>
            <div>
              <span class="text-neutral-400 text-[11px]">Output:</span>
              <span id="output-size-${item.id}" class="font-bold text-blue-600 dark:text-blue-400 ml-1">...</span>
            </div>
            <span id="delta-pill-${item.id}" class="hidden text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              -0%
            </span>
          </div>

          <div class="flex items-center gap-2 self-end sm:self-auto">
            <button type="button" class="reconvert-item-btn p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-400 text-neutral-600 dark:text-neutral-300 hover:text-blue-600 text-xs font-bold transition-colors cursor-pointer" title="Reconvert">
              <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            </button>
            <button type="button" class="download-item-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>${t.downloadBtn}</span>
            </button>
          </div>

        </div>
      </div>
    `;

    // Bind slider dragging on thumbnail
    const rangeInput = card.querySelector('input[type="range"]');
    const overlay = card.querySelector(`#overlay-${item.id}`);
    const handleLine = card.querySelector(`#handle-line-${item.id}`);
    const handle = card.querySelector(`#handle-${item.id}`);

    if (rangeInput && overlay && handleLine && handle) {
      rangeInput.addEventListener('input', (e) => {
        const val = e.target.value;
        overlay.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
        handleLine.style.left = `${val}%`;
        handle.style.left = `${val}%`;
      });
    }

    // Format dropdown change
    const formatSelect = card.querySelector(`#format-select-${item.id}`);
    if (formatSelect) {
      formatSelect.addEventListener('change', (e) => {
        item.targetFormat = e.target.value;
        this.updateCardQualityVisibility(item);
        item.status = 'queued';
        this.processQueue();
      });
    }

    // Quality slider change
    const qualitySlider = card.querySelector(`#quality-slider-${item.id}`);
    const qualityVal = card.querySelector(`#quality-val-${item.id}`);
    if (qualitySlider) {
      qualitySlider.addEventListener('input', (e) => {
        item.quality = parseInt(e.target.value, 10);
        if (qualityVal) qualityVal.textContent = `${item.quality}%`;
      });
      qualitySlider.addEventListener('change', () => {
        item.status = 'queued';
        this.processQueue();
      });
    }

    // Reconvert button
    const reconvertBtn = card.querySelector('.reconvert-item-btn');
    if (reconvertBtn) {
      reconvertBtn.addEventListener('click', () => {
        item.status = 'queued';
        this.processQueue();
      });
    }

    // Delete item button
    const deleteBtn = card.querySelector('.delete-item-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => this.deleteItem(item.id));
    }

    // Download item button
    const downloadBtn = card.querySelector('.download-item-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadItem(item));
    }

    // Zoom inspection modal trigger
    const zoomBtn = card.querySelector('.zoom-trigger-btn');
    if (zoomBtn) {
      zoomBtn.addEventListener('click', () => this.openZoomModal(item));
    }

    return card;
  }

  updateCardQualityVisibility(item) {
    const qualityCtrl = document.getElementById(`quality-ctrl-${item.id}`);
    const spec = FORMAT_SPECS[item.targetFormat] || FORMAT_SPECS['image/webp'];
    if (qualityCtrl) {
      qualityCtrl.classList.toggle('opacity-40', !spec.lossy);
      qualityCtrl.classList.toggle('pointer-events-none', !spec.lossy);
    }
  }

  updateCardStatus(item) {
    const card = document.getElementById(`card-${item.id}`);
    if (!card) return;

    const t = I18N[this.currentLang] || I18N.en;
    const statusPill = document.getElementById(`status-pill-${item.id}`);
    const badgeDims = document.getElementById(`badge-dims-${item.id}`);
    const outputSize = document.getElementById(`output-size-${item.id}`);
    const deltaPill = document.getElementById(`delta-pill-${item.id}`);
    const imgAfter = document.getElementById(`img-after-${item.id}`);

    if (badgeDims && item.originalWidth > 0) {
      badgeDims.textContent = `${item.originalWidth} × ${item.originalHeight} px`;
    }

    if (item.status === 'processing') {
      if (statusPill) {
        statusPill.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600';
        statusPill.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i><span>${t.statusProcessing}</span>`;
      }
    } else if (item.status === 'done') {
      if (statusPill) {
        statusPill.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600';
        statusPill.innerHTML = `<i data-lucide="check-circle" class="w-3 h-3"></i><span>${t.statusDone}</span>`;
      }
      if (outputSize) {
        outputSize.textContent = this.formatBytes(item.convertedSize);
      }
      if (imgAfter && item.convertedUrl) {
        imgAfter.src = item.convertedUrl;
      }

      // Delta pill
      if (deltaPill && item.originalSize > 0 && item.convertedSize > 0) {
        deltaPill.classList.remove('hidden');
        const diff = item.originalSize - item.convertedSize;
        const pct = Math.round((diff / item.originalSize) * 100);
        if (pct >= 0) {
          deltaPill.textContent = `-${pct}%`;
          deltaPill.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
        } else {
          deltaPill.textContent = `+${Math.abs(pct)}%`;
          deltaPill.className = 'text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
        }
      }
    } else if (item.status === 'error') {
      if (statusPill) {
        statusPill.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-red-600';
        statusPill.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3"></i><span>${item.errorMessage || t.statusError}</span>`;
      }
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  updateSummary() {
    if (this.totalImagesEl) this.totalImagesEl.textContent = this.items.length;
    
    let totalIn = 0;
    let totalOut = 0;
    this.items.forEach(it => {
      totalIn += it.originalSize || 0;
      totalOut += it.convertedSize || 0;
    });

    if (this.totalInputSizeEl) this.totalInputSizeEl.textContent = this.formatBytes(totalIn);
    if (this.totalOutputSizeEl) this.totalOutputSizeEl.textContent = totalOut > 0 ? this.formatBytes(totalOut) : '--';
  }

  deleteItem(id) {
    const idx = this.items.findIndex(it => it.id === id);
    if (idx !== -1) {
      const item = this.items[idx];
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
      this.items.splice(idx, 1);
    }
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();
    this.updateUI();
  }

  clearAll() {
    this.items.forEach(item => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    });
    this.items = [];
    if (this.cardsContainer) this.cardsContainer.innerHTML = '';
    this.updateUI();
  }

  // -------------------------------------------------------------
  // Download Operations
  // -------------------------------------------------------------
  downloadItem(item) {
    if (!item.convertedBlob && !item.convertedUrl) {
      this.showToast(I18N[this.currentLang]?.statusProcessing || 'Converting image...');
      return;
    }
    const filename = this.generateOutputFilename(item);
    const link = document.createElement('a');
    link.href = item.convertedUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async downloadAllAsZip() {
    const completedItems = this.items.filter(item => item.convertedBlob);
    if (completedItems.length === 0) {
      this.showToast(I18N[this.currentLang]?.noImagesYet || 'No converted images ready for download.');
      return;
    }

    if (typeof JSZip === 'undefined') {
      this.showToast('Loading ZIP compressor...');
      return;
    }

    const zip = new JSZip();
    const usedNames = new Set();

    completedItems.forEach(item => {
      let filename = this.generateOutputFilename(item);
      if (usedNames.has(filename)) {
        const dotIdx = filename.lastIndexOf('.');
        const base = dotIdx !== -1 ? filename.substring(0, dotIdx) : filename;
        const ext = dotIdx !== -1 ? filename.substring(dotIdx) : '';
        filename = `${base}_${Math.random().toString(36).substring(2, 6)}${ext}`;
      }
      usedNames.add(filename);
      zip.file(filename, item.convertedBlob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(zipBlob);
    link.download = `toolstacker_converted_${Date.now()}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast(I18N[this.currentLang]?.zipSuccessToast || 'ZIP archive created and download started!');
  }

  generateOutputFilename(item) {
    const spec = FORMAT_SPECS[item.targetFormat] || FORMAT_SPECS['image/webp'];
    const ext = spec.ext;

    const baseName = item.name.substring(0, item.name.lastIndexOf('.')) || item.name;
    const pattern = this.settings.namingPattern;

    if (pattern === 'format') {
      return `${baseName}_${ext}.${ext}`;
    } else if (pattern === 'original') {
      return `${baseName}.${ext}`;
    }
    // Default 'converted'
    return `${baseName}_converted.${ext}`;
  }

  // -------------------------------------------------------------
  // Zoom Inspection Modal
  // -------------------------------------------------------------
  openZoomModal(item) {
    if (!this.zoomModal) return;

    if (this.zoomModalTitle) this.zoomModalTitle.textContent = item.name;
    const spec = FORMAT_SPECS[item.targetFormat] || FORMAT_SPECS['image/webp'];
    if (this.zoomStatsBadge) {
      this.zoomStatsBadge.textContent = `${item.ext.toUpperCase()} → ${spec.name.toUpperCase()} (${this.formatBytes(item.convertedSize || item.originalSize)})`;
    }

    if (this.zoomBeforeImg) this.zoomBeforeImg.src = item.originalUrl;
    if (this.zoomAfterImg) this.zoomAfterImg.src = item.convertedUrl || item.originalUrl;

    if (this.zoomSlider) this.zoomSlider.value = 50;
    if (this.zoomCompareOverlay) this.zoomCompareOverlay.style.width = '50%';
    if (this.zoomLevelSelect) this.zoomLevelSelect.value = 'fit';

    if (this.zoomBeforeImg) this.zoomBeforeImg.style.transform = 'scale(1)';
    if (this.zoomAfterImg) this.zoomAfterImg.style.transform = 'scale(1)';

    this.zoomModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  closeZoomModal() {
    if (!this.zoomModal) return;
    this.zoomModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  // -------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------
  formatBytes(bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  showToast(message) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'pointer-events-auto px-4 py-3 rounded-2xl bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2.5 transition-all transform duration-200 translate-y-4 opacity-0 border border-neutral-800 dark:border-neutral-200';
    toast.innerHTML = `
      <i data-lucide="info" class="w-4 h-4 text-blue-400 shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-4', 'opacity-0');
      toast.classList.add('translate-y-0', 'opacity-100');
    });

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-y-2');
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }
}

// -------------------------------------------------------------
// Initialization
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.app = new ImageConverterApp();
});
