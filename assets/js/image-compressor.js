/**
 * ToolStacker - Image Compressor
 * 100% Client-Side • Lossy & Lossless • Responsive Widths • Before/After Preview • JSZip
 */

import JSZip from 'jszip';

// -------------------------------------------------------------
// Translation Dictionaries (English & Bengali)
// -------------------------------------------------------------
export const I18N = {
  en: {
    appTitle: "Image Compressor",
    appSubtitle: "Compress JPEG, PNG, WebP, AVIF images online without losing quality. 100% client-side, free, and unlimited.",
    dropzoneTitle: "Drag & drop images here, or browse files",
    dropzoneSubtitle: "Supports JPEG, PNG, WebP, AVIF • Batch upload 50+ files • Ctrl+V to paste from clipboard",
    dropzoneBrowseBtn: "Select Images",
    settingsTitle: "Compression Settings",
    modeLabel: "Compression Mode",
    modeLossy: "Lossy (Best Size)",
    modeLossless: "Lossless (Best Quality)",
    smartCompression: "Smart Compression",
    smartCompressionHelp: "Auto-balances quality and file size for optimal performance",
    qualityLabel: "Quality",
    formatLabel: "Output Format",
    formatOriginal: "Keep Original",
    formatWebp: "WebP (Recommended)",
    formatJpeg: "JPEG (.jpg)",
    formatPng: "PNG (.png)",
    formatAvif: "AVIF (.avif)",
    targetSizeToggle: "Set Target File Size (KB)",
    targetSizePlaceholder: "e.g. 200",
    targetSizeHelp: "Automatically optimizes quality to reach desired file size",
    resizeTitle: "Resize & Dimensions",
    presetLabel: "Preset Template",
    presetCustom: "Custom Dimensions",
    presetOriginal: "Original Size",
    presetIgPost: "Instagram Post (1080×1080)",
    presetIgStory: "Instagram Story (1080×1920)",
    presetFbOg: "Facebook OG Image (1200×630)",
    presetTwitterHeader: "Twitter Header (1500×500)",
    presetLinkedinCover: "LinkedIn Cover (1584×396)",
    presetFavicon: "Favicon (64×64)",
    presetFullHd: "Full HD (1920×1080)",
    maxWidthLabel: "Max Width (px)",
    maxHeightLabel: "Max Height (px)",
    scaleLabel: "Scale Percent",
    lockAspect: "Lock Aspect Ratio",
    cropOption: "Center Crop to Fit Dimensions",
    paddingOption: "Add Padding Color",
    paddingColor: "Padding Color",
    responsiveWidthsToggle: "Generate Responsive Width Variants",
    responsiveWidthsPlaceholder: "e.g. 320, 640, 1024",
    responsiveWidthsHelp: "Creates multiple scaled variants for modern srcset responsive images",
    resetSettingsBtn: "Reset Defaults",
    batchSummary: "Batch Summary",
    totalOriginal: "Original:",
    totalCompressed: "Compressed:",
    totalSavings: "Total Saved:",
    downloadAllZip: "Download All as ZIP",
    clearAllBtn: "Clear All",
    statusProcessing: "Compressing...",
    statusDone: "Completed",
    statusError: "Error",
    downloadBtn: "Download",
    zoomBtn: "Zoom & Compare",
    beforeLabel: "Original (Before)",
    afterLabel: "Compressed (After)",
    zoomModalTitle: "Quality Inspection & Compare",
    zoomCloseBtn: "Close",
    zoom100: "100%",
    zoom200: "200%",
    zoomFit: "Fit View",
    largeImageWarn: "Large image detected (over 15MB/4000px). Processing in browser may take a moment.",
    noImagesYet: "No images uploaded yet. Drop images or click above to begin.",
    unsupportedFormat: "Unsupported file format. Please upload JPEG, PNG, WebP, or AVIF.",
    copiedToast: "Image copied to clipboard!",
    savedSettingsToast: "Settings saved to browser.",
    zipSuccessToast: "ZIP archive created and download started!",
    settingsToggle: "Settings",
    toggleCollapse: "Collapse",
    toggleExpand: "Expand",
    uploadedToast: "image(s) added! Optimizing now..."
  },
  bn: {
    appTitle: "ইমেজ কম্প্রেসার",
    appSubtitle: "কোয়ালিটি না হারিয়ে অনলাইন JPEG, PNG, WebP, AVIF ইমেজ কম্প্রেস করুন। ১০০% ক্লায়েন্ট-সাইড, ফ্রি ও আনলিমিটেড।",
    dropzoneTitle: "এখানে ছবি টেনে এনে ছেড়ে দিন, অথবা ব্রাউজ করুন",
    dropzoneSubtitle: "JPEG, PNG, WebP, AVIF সাপোর্ট করে • একসাথে ৫০+ ছবি আপলোড করুন • ক্লিপবোর্ড থেকে পেস্ট করতে Ctrl+V চাপুন",
    dropzoneBrowseBtn: "ছবি নির্বাচন করুন",
    settingsTitle: "কম্প্রেশন সেটিংস",
    modeLabel: "কম্প্রেশন মোড",
    modeLossy: "লসি (সর্বোচ্চ সাইজ সাশ্রয়)",
    modeLossless: "লসলেস (সর্বোচ্চ কোয়ালিটি)",
    smartCompression: "স্মার্ট কম্প্রেশন",
    smartCompressionHelp: "স্বয়ংক্রিয়ভাবে কোয়ালিটি ও সাইজের সেরা ব্যালেন্স তৈরি করে",
    qualityLabel: "কোয়ালিটি",
    formatLabel: "আউটপুট ফরম্যাট",
    formatOriginal: "আগের ফরম্যাট রাখুন",
    formatWebp: "WebP (সুপারিশকৃত)",
    formatJpeg: "JPEG (.jpg)",
    formatPng: "PNG (.png)",
    formatAvif: "AVIF (.avif)",
    targetSizeToggle: "টার্গেট ফাইল সাইজ নির্ধারণ করুন (KB)",
    targetSizePlaceholder: "যেমন ২০০",
    targetSizeHelp: "কাঙ্ক্ষিত সাইজ পেতে স্বয়ংক্রিয়ভাবে কোয়ালিটি অপ্টিমাইজ করবে",
    resizeTitle: "রিসাইজ ও ডাইমেনশন",
    presetLabel: "প্রিসেট টেমপ্লেট",
    presetCustom: "কাস্টম ডাইমেনশন",
    presetOriginal: "আসল সাইজ",
    presetIgPost: "ইনস্টাগ্রাম পোস্ট (১০৮০×১০৮০)",
    presetIgStory: "ইনস্টাগ্রাম স্টোরি (১০৮০×১৯২০)",
    presetFbOg: "ফেসবুক ব্যানার (১২০০×৬৩০)",
    presetTwitterHeader: "টুইটার কভার (১৫০০×৫০০)",
    presetLinkedinCover: "লিঙ্কডইন কভার (১৫৮৪×৩৯৬)",
    presetFavicon: "ফেভিকন (৬৪×৬৪)",
    presetFullHd: "ফুল এইচডি (১৯২০×১০৮০)",
    maxWidthLabel: "সর্বোচ্চ প্রস্থ (px)",
    maxHeightLabel: "সর্বোচ্চ উচ্চতা (px)",
    scaleLabel: "স্কেল শতাংশ",
    lockAspect: "অনুপাত লক রাখুন",
    cropOption: "সেন্টার ক্রপ করে ফিট করুন",
    paddingOption: "প্যাডিং ব্যাকগ্রাউন্ড যোগ করুন",
    paddingColor: "প্যাডিং কালার",
    responsiveWidthsToggle: "রেসপনসিভ ভ্যারিয়েন্ট তৈরি করুন",
    responsiveWidthsPlaceholder: "যেমন ৩২০, ৬৪০, ১০২৪",
    responsiveWidthsHelp: "ওয়েবসাইটে রেসপনসিভ ইমেজের জন্য একসাথে একাধিক সাইজ তৈরি করে",
    resetSettingsBtn: "রিসেট করুন",
    batchSummary: "ব্যাচ সামারি",
    totalOriginal: "আসল সাইজ:",
    totalCompressed: "কম্প্রেসড সাইজ:",
    totalSavings: "মোট সাশ্রয়:",
    downloadAllZip: "সব ছবি জিপ (ZIP) আকারে ডাউনলোড",
    clearAllBtn: "সব মুছুন",
    statusProcessing: "কম্প্রেস হচ্ছে...",
    statusDone: "সম্পন্ন",
    statusError: "ব্যর্থ",
    downloadBtn: "ডাউনলোড",
    zoomBtn: "জুম ও তুলনা",
    beforeLabel: "পূর্বের আসল ছবি",
    afterLabel: "কম্প্রেসড ছবি",
    zoomModalTitle: "কোয়ালিটি তুলনা ও জুম ইনস্পেকশন",
    zoomCloseBtn: "বন্ধ করুন",
    zoom100: "১০০%",
    zoom200: "২০০%",
    zoomFit: "ফিট ভিউ",
    largeImageWarn: "বড় সাইজের ছবি সনাক্ত হয়েছে (১৫MB/৪০০০px এর বেশি)। ব্রাউজারে কম্প্রেস হতে কয়েক সেকেন্ড সময় লাগতে পারে।",
    noImagesYet: "এখনও কোনো ছবি আপলোড করা হয়নি। শুরু করতে উপরে ছবি ড্রপ করুন।",
    unsupportedFormat: "অসমর্থিত ফরম্যাট। দয়া করে JPEG, PNG, WebP বা AVIF আপলোড করুন।",
    copiedToast: "ছবি ক্লিপবোর্ডে কপি করা হয়েছে!",
    savedSettingsToast: "সেটিংস সংরক্ষিত হয়েছে।",
    zipSuccessToast: "ZIP ফাইল প্রস্তুত ও ডাউনলোড শুরু হয়েছে!",
    settingsToggle: "সেটিংস",
    toggleCollapse: "সংকুচিত",
    toggleExpand: "প্রসারিত",
    uploadedToast: "টি ছবি যোগ করা হয়েছে! কম্প্রেশন শুরু হয়েছে..."
  }
};

// -------------------------------------------------------------
// State Management
// -------------------------------------------------------------
class ImageCompressorApp {
  constructor() {
    this.currentLang = localStorage.getItem('toolstacker_lang') || 'en';
    this.items = []; // array of image item records
    this.isProcessingQueue = false;
    this.settings = this.loadSettings();

    // DOM Elements Cache
    this.cacheDom();

    // Setup Event Listeners
    this.bindEvents();

    // Initial language setup & UI state sync
    this.applyLanguage(this.currentLang);
    this.syncSettingsToUI();
  }

  getDefaultSettings() {
    return {
      mode: 'lossy', // 'lossy' or 'lossless'
      smart: true,
      quality: 80,
      outputFormat: 'original', // 'original', 'image/webp', 'image/jpeg', 'image/png', 'image/avif'
      targetSizeEnabled: false,
      targetSizeKB: 200,
      preset: 'original',
      maxWidth: '',
      maxHeight: '',
      scale: 100,
      lockAspect: true,
      crop: false,
      padding: false,
      paddingColor: '#ffffff',
      responsiveEnabled: false,
      responsiveWidths: '320, 640, 1024'
    };
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('toolstacker_compressor_settings');
      if (saved) {
        return { ...this.getDefaultSettings(), ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
    return this.getDefaultSettings();
  }

  saveSettings() {
    try {
      localStorage.setItem('toolstacker_compressor_settings', JSON.stringify(this.settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }

  cacheDom() {
    // Dropzone
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Settings Controls
    this.modeLossyRadio = document.getElementById('mode-lossy');
    this.modeLosslessRadio = document.getElementById('mode-lossless');
    this.smartCheckbox = document.getElementById('smart-checkbox');
    this.qualitySlider = document.getElementById('quality-slider');
    this.qualityValue = document.getElementById('quality-value');
    this.qualityContainer = document.getElementById('quality-container');
    this.formatSelect = document.getElementById('format-select');

    // Target size
    this.targetSizeCheckbox = document.getElementById('target-size-checkbox');
    this.targetSizeInput = document.getElementById('target-size-input');
    this.targetSizeContainer = document.getElementById('target-size-container');

    // Resize controls
    this.presetSelect = document.getElementById('preset-select');
    this.maxWidthInput = document.getElementById('max-width-input');
    this.maxHeightInput = document.getElementById('max-height-input');
    this.scaleSlider = document.getElementById('scale-slider');
    this.scaleValue = document.getElementById('scale-value');
    this.lockAspectCheckbox = document.getElementById('lock-aspect-checkbox');
    this.cropCheckbox = document.getElementById('crop-checkbox');
    this.paddingCheckbox = document.getElementById('padding-checkbox');
    this.paddingColorInput = document.getElementById('padding-color-input');
    this.paddingContainer = document.getElementById('padding-container');

    // Responsive widths
    this.responsiveCheckbox = document.getElementById('responsive-checkbox');
    this.responsiveWidthsInput = document.getElementById('responsive-widths-input');
    this.responsiveContainer = document.getElementById('responsive-container');

    // Buttons & Summary
    this.resetSettingsBtn = document.getElementById('reset-settings-btn');
    this.batchSummaryBar = document.getElementById('batch-summary-bar');
    this.totalOriginalEl = document.getElementById('total-original');
    this.totalCompressedEl = document.getElementById('total-compressed');
    this.totalSavingsEl = document.getElementById('total-savings');
    this.downloadAllBtn = document.getElementById('download-all-btn');
    this.clearAllBtn = document.getElementById('clear-all-btn');
    this.cardsContainer = document.getElementById('cards-container');
    this.emptyState = document.getElementById('empty-state');
    this.batchProgressBar = document.getElementById('batch-progress-bar');
    this.batchProgressFill = document.getElementById('batch-progress-fill');

    // Accordion Controls & Badges
    this.accordionBtnCompression = document.getElementById('accordion-btn-compression');
    this.accordionBodyCompression = document.getElementById('accordion-body-compression');
    this.accordionIconCompression = document.getElementById('accordion-icon-compression');
    this.summaryBadgeCompression = document.getElementById('summary-badge-compression');

    this.accordionBtnResize = document.getElementById('accordion-btn-resize');
    this.accordionBodyResize = document.getElementById('accordion-body-resize');
    this.accordionIconResize = document.getElementById('accordion-icon-resize');
    this.summaryBadgeResize = document.getElementById('summary-badge-resize');

    this.toggleAllSettingsBtn = document.getElementById('toggle-all-settings-btn');
    this.toggleAllSettingsText = document.getElementById('toggle-all-settings-text');
    this.settingsPanelGrid = document.getElementById('settings-panel-grid');

    // Language Toggle
    this.langToggleBtn = document.getElementById('lang-toggle-btn');

    // Zoom Modal
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
    // Language Switcher
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
        // If clicked on dropzone background
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
    }

    // Drag and Drop
    if (this.dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        this.dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
          this.handleFiles(Array.from(dt.files));
        }
      });
    }

    // Global Clipboard Paste (Ctrl+V / Cmd+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        this.handleFiles(files);
      }
    });

    // Compression Mode
    const updateMode = () => {
      this.settings.mode = this.modeLosslessRadio.checked ? 'lossless' : 'lossy';
      this.qualitySlider.disabled = this.settings.mode === 'lossless';
      this.qualityContainer.classList.toggle('opacity-50', this.settings.mode === 'lossless');
      this.saveSettings();
      this.reprocessAllDebounced();
    };
    if (this.modeLossyRadio) this.modeLossyRadio.addEventListener('change', updateMode);
    if (this.modeLosslessRadio) this.modeLosslessRadio.addEventListener('change', updateMode);

    // Smart Compression Checkbox
    if (this.smartCheckbox) {
      this.smartCheckbox.addEventListener('change', (e) => {
        this.settings.smart = e.target.checked;
        if (this.settings.smart) {
          this.settings.quality = 80;
          this.qualitySlider.value = 80;
          this.qualityValue.textContent = '80%';
        }
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }

    // Quality Slider
    if (this.qualitySlider) {
      this.qualitySlider.addEventListener('input', (e) => {
        this.settings.quality = parseInt(e.target.value, 10);
        this.qualityValue.textContent = `${this.settings.quality}%`;
        if (this.smartCheckbox && this.smartCheckbox.checked) {
          this.smartCheckbox.checked = false;
          this.settings.smart = false;
        }
        this.saveSettings();
      });
      this.qualitySlider.addEventListener('change', () => {
        this.reprocessAllDebounced();
      });
    }

    // Output Format
    if (this.formatSelect) {
      this.formatSelect.addEventListener('change', (e) => {
        this.settings.outputFormat = e.target.value;
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }

    // Target File Size
    if (this.targetSizeCheckbox) {
      this.targetSizeCheckbox.addEventListener('change', (e) => {
        this.settings.targetSizeEnabled = e.target.checked;
        this.targetSizeContainer.classList.toggle('hidden', !this.settings.targetSizeEnabled);
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }
    if (this.targetSizeInput) {
      this.targetSizeInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val > 0) {
          this.settings.targetSizeKB = val;
          this.saveSettings();
          this.reprocessAllDebounced();
        }
      });
    }

    // Social Media Presets
    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', (e) => {
        this.applyPreset(e.target.value);
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }

    // Dimension Inputs
    if (this.maxWidthInput) {
      this.maxWidthInput.addEventListener('change', (e) => {
        this.settings.maxWidth = e.target.value ? parseInt(e.target.value, 10) : '';
        this.settings.preset = 'custom';
        if (this.presetSelect) this.presetSelect.value = 'custom';
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }
    if (this.maxHeightInput) {
      this.maxHeightInput.addEventListener('change', (e) => {
        this.settings.maxHeight = e.target.value ? parseInt(e.target.value, 10) : '';
        this.settings.preset = 'custom';
        if (this.presetSelect) this.presetSelect.value = 'custom';
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }

    // Scale Slider
    if (this.scaleSlider) {
      this.scaleSlider.addEventListener('input', (e) => {
        this.settings.scale = parseInt(e.target.value, 10);
        this.scaleValue.textContent = `${this.settings.scale}%`;
        this.saveSettings();
      });
      this.scaleSlider.addEventListener('change', () => {
        this.reprocessAllDebounced();
      });
    }

    // Aspect, Crop, Padding
    if (this.lockAspectCheckbox) {
      this.lockAspectCheckbox.addEventListener('change', (e) => {
        this.settings.lockAspect = e.target.checked;
        this.saveSettings();
      });
    }
    if (this.cropCheckbox) {
      this.cropCheckbox.addEventListener('change', (e) => {
        this.settings.crop = e.target.checked;
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }
    if (this.paddingCheckbox) {
      this.paddingCheckbox.addEventListener('change', (e) => {
        this.settings.padding = e.target.checked;
        this.paddingContainer.classList.toggle('hidden', !this.settings.padding);
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }
    if (this.paddingColorInput) {
      this.paddingColorInput.addEventListener('input', (e) => {
        this.settings.paddingColor = e.target.value;
        this.saveSettings();
      });
      this.paddingColorInput.addEventListener('change', () => {
        this.reprocessAllDebounced();
      });
    }

    // Responsive Width Variants
    if (this.responsiveCheckbox) {
      this.responsiveCheckbox.addEventListener('change', (e) => {
        this.settings.responsiveEnabled = e.target.checked;
        this.responsiveContainer.classList.toggle('hidden', !this.settings.responsiveEnabled);
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }
    if (this.responsiveWidthsInput) {
      this.responsiveWidthsInput.addEventListener('change', (e) => {
        this.settings.responsiveWidths = e.target.value;
        this.saveSettings();
        this.reprocessAllDebounced();
      });
    }

    // Reset Defaults
    if (this.resetSettingsBtn) {
      this.resetSettingsBtn.addEventListener('click', () => {
        this.settings = this.getDefaultSettings();
        this.saveSettings();
        this.syncSettingsToUI();
        this.reprocessAllDebounced();
      });
    }

    // Download All as ZIP
    if (this.downloadAllBtn) {
      this.downloadAllBtn.addEventListener('click', () => this.downloadAllAsZip());
    }

    // Clear All Images
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // Zoom Modal Close
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

    // Accordion 1: Compression Settings Toggle
    if (this.accordionBtnCompression && this.accordionBodyCompression) {
      this.accordionBtnCompression.addEventListener('click', () => {
        const isHidden = this.accordionBodyCompression.classList.toggle('hidden');
        if (this.accordionIconCompression) {
          this.accordionIconCompression.classList.toggle('rotate-180', !isHidden);
        }
      });
    }

    // Accordion 2: Resize & Dimensions Toggle
    if (this.accordionBtnResize && this.accordionBodyResize) {
      this.accordionBtnResize.addEventListener('click', () => {
        const isHidden = this.accordionBodyResize.classList.toggle('hidden');
        if (this.accordionIconResize) {
          this.accordionIconResize.classList.toggle('rotate-180', !isHidden);
        }
      });
    }

    // Toggle All Settings (Collapse All / Expand All)
    if (this.toggleAllSettingsBtn) {
      this.toggleAllSettingsBtn.addEventListener('click', () => {
        const compHidden = this.accordionBodyCompression?.classList.contains('hidden');
        const resizeHidden = this.accordionBodyResize?.classList.contains('hidden');
        const shouldExpand = compHidden || resizeHidden;

        if (this.accordionBodyCompression) {
          this.accordionBodyCompression.classList.toggle('hidden', !shouldExpand);
          if (this.accordionIconCompression) {
            this.accordionIconCompression.classList.toggle('rotate-180', shouldExpand);
          }
        }
        if (this.accordionBodyResize) {
          this.accordionBodyResize.classList.toggle('hidden', !shouldExpand);
          if (this.accordionIconResize) {
            this.accordionIconResize.classList.toggle('rotate-180', shouldExpand);
          }
        }
        if (this.toggleAllSettingsText) {
          const t = I18N[this.currentLang] || I18N.en;
          this.toggleAllSettingsText.textContent = shouldExpand ? (t.toggleCollapse || 'Collapse All') : (t.toggleExpand || 'Expand All');
        }
      });
    }

    // Jump to settings button in batch summary bar
    const jumpBtn = document.getElementById('jump-to-settings-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => {
        if (this.accordionBodyCompression?.classList.contains('hidden')) {
          this.accordionBodyCompression.classList.remove('hidden');
          if (this.accordionIconCompression) this.accordionIconCompression.classList.add('rotate-180');
        }
        const settingsSec = document.getElementById('settings-section');
        if (settingsSec) {
          settingsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  }

  applyPreset(presetKey) {
    this.settings.preset = presetKey;
    switch (presetKey) {
      case 'original':
        this.settings.maxWidth = '';
        this.settings.maxHeight = '';
        this.settings.crop = false;
        break;
      case 'ig-post':
        this.settings.maxWidth = 1080;
        this.settings.maxHeight = 1080;
        this.settings.crop = true;
        break;
      case 'ig-story':
        this.settings.maxWidth = 1080;
        this.settings.maxHeight = 1920;
        this.settings.crop = true;
        break;
      case 'fb-og':
        this.settings.maxWidth = 1200;
        this.settings.maxHeight = 630;
        this.settings.crop = true;
        break;
      case 'twitter-header':
        this.settings.maxWidth = 1500;
        this.settings.maxHeight = 500;
        this.settings.crop = true;
        break;
      case 'linkedin-cover':
        this.settings.maxWidth = 1584;
        this.settings.maxHeight = 396;
        this.settings.crop = true;
        break;
      case 'favicon':
        this.settings.maxWidth = 64;
        this.settings.maxHeight = 64;
        this.settings.crop = true;
        break;
      case 'full-hd':
        this.settings.maxWidth = 1920;
        this.settings.maxHeight = 1080;
        this.settings.crop = false;
        break;
    }
    this.syncSettingsToUI();
  }

  syncSettingsToUI() {
    if (this.modeLossyRadio) this.modeLossyRadio.checked = this.settings.mode === 'lossy';
    if (this.modeLosslessRadio) this.modeLosslessRadio.checked = this.settings.mode === 'lossless';
    if (this.smartCheckbox) this.smartCheckbox.checked = this.settings.smart;
    if (this.qualitySlider) {
      this.qualitySlider.value = this.settings.quality;
      this.qualitySlider.disabled = this.settings.mode === 'lossless';
    }
    if (this.qualityValue) this.qualityValue.textContent = `${this.settings.quality}%`;
    if (this.qualityContainer) this.qualityContainer.classList.toggle('opacity-50', this.settings.mode === 'lossless');
    if (this.formatSelect) this.formatSelect.value = this.settings.outputFormat;

    if (this.targetSizeCheckbox) this.targetSizeCheckbox.checked = this.settings.targetSizeEnabled;
    if (this.targetSizeInput) this.targetSizeInput.value = this.settings.targetSizeKB;
    if (this.targetSizeContainer) this.targetSizeContainer.classList.toggle('hidden', !this.settings.targetSizeEnabled);

    if (this.presetSelect) this.presetSelect.value = this.settings.preset;
    if (this.maxWidthInput) this.maxWidthInput.value = this.settings.maxWidth || '';
    if (this.maxHeightInput) this.maxHeightInput.value = this.settings.maxHeight || '';
    if (this.scaleSlider) this.scaleSlider.value = this.settings.scale;
    if (this.scaleValue) this.scaleValue.textContent = `${this.settings.scale}%`;
    if (this.lockAspectCheckbox) this.lockAspectCheckbox.checked = this.settings.lockAspect;
    if (this.cropCheckbox) this.cropCheckbox.checked = this.settings.crop;
    if (this.paddingCheckbox) this.paddingCheckbox.checked = this.settings.padding;
    if (this.paddingColorInput) this.paddingColorInput.value = this.settings.paddingColor;
    if (this.paddingContainer) this.paddingContainer.classList.toggle('hidden', !this.settings.padding);

    if (this.responsiveCheckbox) this.responsiveCheckbox.checked = this.settings.responsiveEnabled;
    if (this.responsiveWidthsInput) this.responsiveWidthsInput.value = this.settings.responsiveWidths;
    if (this.responsiveContainer) this.responsiveContainer.classList.toggle('hidden', !this.settings.responsiveEnabled);

    // Update Live Settings Summary Badge
    if (this.settingsSummaryBadge) {
      const modeStr = this.settings.mode === 'lossless' ? 'Lossless' : 'Lossy';
      const formatStr = this.settings.outputFormat === 'original' 
        ? (this.currentLang === 'bn' ? 'আসল ফরম্যাট' : 'Original Format') 
        : (this.settings.outputFormat.replace('image/', '')).toUpperCase();
      const qualStr = this.settings.mode === 'lossless' ? 'Max Quality' : `${this.settings.quality}% Quality`;
      this.settingsSummaryBadge.textContent = `${modeStr} • ${formatStr} • ${qualStr}`;
    }
  }

  applyLanguage(lang) {
    this.currentLang = lang;
    const t = I18N[lang] || I18N.en;

    // Update text content of data-i18n attributes
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (t[key]) {
        el.textContent = t[key];
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (t[key]) {
        el.setAttribute('placeholder', t[key]);
      }
    });

    // Update language toggle button text
    if (this.langToggleBtn) {
      this.langToggleBtn.innerHTML = `
        <i data-lucide="languages" class="w-4 h-4 text-blue-600"></i>
        <span>${lang === 'en' ? 'বাংলা' : 'English'}</span>
      `;
      if (window.lucide) window.lucide.createIcons();
    }

    // Update toggle settings button text
    if (this.toggleSettingsText) {
      const isHidden = this.settingsPanelGrid && this.settingsPanelGrid.classList.contains('hidden');
      this.toggleSettingsText.textContent = isHidden ? (t.toggleExpand || 'Expand') : (t.toggleCollapse || 'Collapse');
    }
  }

  // -----------------------------------------------------------
  // File Handling & Processing Pipeline
  // -----------------------------------------------------------
  async handleFiles(fileList) {
    if (!fileList || fileList.length === 0) return;
    const newItems = [];
    let hasLargeImage = false;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const isImage = (file.type && file.type.startsWith('image/')) ||
                      /\.(jpe?g|png|webp|avif|bmp|gif|tiff|svg|ico|jfif|heic)$/i.test(file.name);

      if (!isImage) {
        this.showToast(I18N[this.currentLang]?.unsupportedFormat || 'Unsupported format');
        continue;
      }

      if (file.size > 15 * 1024 * 1024) {
        hasLargeImage = true;
      }

      const id = 'img_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now() + '_' + i;
      let originalUrl;
      try {
        originalUrl = URL.createObjectURL(file);
      } catch (e) {
        originalUrl = '';
      }

      const item = {
        id,
        file,
        name: file.name || 'image',
        type: file.type || 'image/jpeg',
        originalSize: file.size,
        originalUrl,
        originalWidth: 0,
        originalHeight: 0,
        compressedBlob: null,
        compressedUrl: null,
        compressedSize: 0,
        compressedWidth: 0,
        compressedHeight: 0,
        responsiveVariants: [], // array of { width, blob, url }
        status: 'queued', // 'queued', 'processing', 'done', 'error'
        errorMessage: ''
      };

      newItems.push(item);
      this.items.push(item);
    }

    if (hasLargeImage) {
      this.showToast(I18N[this.currentLang].largeImageWarn);
    }

    if (newItems.length > 0) {
      this.updateUI();
      // Scroll into view so user immediately sees their cards appear directly below dropzone
      const summaryBar = document.getElementById('batch-summary-bar');
      if (summaryBar) {
        summaryBar.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      const t = I18N[this.currentLang] || I18N.en;
      this.showToast(`${newItems.length} ${t.uploadedToast || 'image(s) added! Optimizing now...'}`);
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    if (this.batchProgressBar) {
      this.batchProgressBar.classList.remove('hidden');
    }

    const queuedItems = this.items.filter(item => item.status === 'queued' || item.status === 'processing');
    const totalToProcess = queuedItems.length;
    let completedCount = 0;

    // Process in chunks of 3 concurrent images to balance performance & CPU
    const chunkSize = 3;
    for (let i = 0; i < queuedItems.length; i += chunkSize) {
      const chunk = queuedItems.slice(i, i + chunkSize);
      await Promise.all(chunk.map(async (item) => {
        item.status = 'processing';
        this.updateCardStatus(item);
        try {
          await this.compressImageItem(item);
          item.status = 'done';
        } catch (err) {
          console.error('Compression error for', item.name, err);
          item.status = 'error';
          item.errorMessage = err.message || 'Compression failed';
        }
        completedCount++;
        const pct = Math.round((completedCount / totalToProcess) * 100);
        if (this.batchProgressFill) {
          this.batchProgressFill.style.width = `${pct}%`;
        }
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

  reprocessAllDebounced() {
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this.items.forEach(item => {
        item.status = 'queued';
      });
      this.processQueue();
    }, 250);
  }

  // -----------------------------------------------------------
  // Core Image Compression Engine (HTML5 Canvas + OffscreenCanvas)
  // -----------------------------------------------------------
  async compressImageItem(item) {
    // 1. Load image onto an HTMLImageElement
    const img = await this.loadImage(item.originalUrl);
    item.originalWidth = img.naturalWidth || img.width;
    item.originalHeight = img.naturalHeight || img.height;

    // 2. Compute target dimensions
    const dims = this.calculateDimensions(item.originalWidth, item.originalHeight);
    item.compressedWidth = dims.drawWidth;
    item.compressedHeight = dims.drawHeight;

    // 3. Determine output format
    let targetMime = item.type;
    if (this.settings.outputFormat !== 'original') {
      targetMime = this.settings.outputFormat;
    }

    // 4. Determine quality factor (0.01 to 1.0)
    let quality = this.settings.mode === 'lossless' ? 1.0 : (this.settings.quality / 100);

    // 5. Binary search if target file size is enabled
    if (this.settings.targetSizeEnabled && this.settings.targetSizeKB > 0 && this.settings.mode !== 'lossless') {
      const targetBytes = this.settings.targetSizeKB * 1024;
      quality = await this.binarySearchQualityForSize(img, dims, targetMime, targetBytes);
    }

    // 6. Draw to Canvas and Export Main Blob
    const mainBlob = await this.renderToBlob(img, dims, targetMime, quality);
    item.compressedBlob = mainBlob;
    if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
    item.compressedUrl = URL.createObjectURL(mainBlob);
    item.compressedSize = mainBlob.size;

    // 7. Responsive Width Variants Generation (if enabled)
    if (this.settings.responsiveEnabled && this.settings.responsiveWidths) {
      item.responsiveVariants = [];
      const widths = this.settings.responsiveWidths
        .split(',')
        .map(w => parseInt(w.trim(), 10))
        .filter(w => !isNaN(w) && w > 0);

      for (const rw of widths) {
        if (rw < item.originalWidth) {
          const rDims = this.calculateDimensions(item.originalWidth, item.originalHeight, rw);
          const rBlob = await this.renderToBlob(img, rDims, targetMime, quality);
          item.responsiveVariants.push({
            width: rw,
            height: rDims.targetHeight,
            blob: rBlob,
            url: URL.createObjectURL(rBlob),
            size: rBlob.size
          });
        }
      }
    }
  }

  calculateDimensions(origW, origH, overrideMaxWidth = null) {
    let targetW = origW;
    let targetH = origH;

    const maxW = overrideMaxWidth !== null ? overrideMaxWidth : (this.settings.maxWidth || null);
    const maxH = this.settings.maxHeight || null;
    const scale = (this.settings.scale || 100) / 100;

    // Apply scale percentage first
    if (scale !== 1.0) {
      targetW = Math.max(1, Math.round(targetW * scale));
      targetH = Math.max(1, Math.round(targetH * scale));
    }

    // Center crop mode (exact dimensions specified)
    if (this.settings.crop && maxW && maxH) {
      return {
        canvasWidth: maxW,
        canvasHeight: maxH,
        drawWidth: maxW,
        drawHeight: maxH,
        isCrop: true,
        sourceWidth: origW,
        sourceHeight: origH,
        maxW,
        maxH
      };
    }

    // Fit with aspect ratio preserved
    if (this.settings.lockAspect) {
      if (maxW && targetW > maxW) {
        targetH = Math.round(targetH * (maxW / targetW));
        targetW = maxW;
      }
      if (maxH && targetH > maxH) {
        targetW = Math.round(targetW * (maxH / targetH));
        targetH = maxH;
      }
    } else {
      if (maxW) targetW = maxW;
      if (maxH) targetH = maxH;
    }

    // Padding mode (canvas is maxW x maxH, image centered inside)
    if (this.settings.padding && maxW && maxH) {
      return {
        canvasWidth: maxW,
        canvasHeight: maxH,
        drawWidth: targetW,
        drawHeight: targetH,
        isPadding: true,
        paddingColor: this.settings.paddingColor || '#ffffff'
      };
    }

    return {
      canvasWidth: targetW,
      canvasHeight: targetH,
      drawWidth: targetW,
      drawHeight: targetH,
      isCrop: false,
      isPadding: false
    };
  }

  renderToBlob(img, dims, mimeType, quality) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, dims.canvasWidth || 1);
      canvas.height = Math.max(1, dims.canvasHeight || 1);
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        resolve(new Blob([], { type: mimeType }));
        return;
      }

      // Smooth interpolation
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Fill background for padding or JPEG non-alpha
      if (dims.isPadding) {
        ctx.fillStyle = dims.paddingColor || '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (dims.isCrop) {
        // Calculate center crop source rect
        const sourceRatio = img.naturalWidth / img.naturalHeight;
        const targetRatio = canvas.width / canvas.height;
        let sWidth = img.naturalWidth;
        let sHeight = img.naturalHeight;
        let sX = 0;
        let sY = 0;

        if (sourceRatio > targetRatio) {
          // Source is wider than target
          sWidth = img.naturalHeight * targetRatio;
          sX = (img.naturalWidth - sWidth) / 2;
        } else {
          // Source is taller than target
          sHeight = img.naturalWidth / targetRatio;
          sY = (img.naturalHeight - sHeight) / 2;
        }

        ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
      } else if (dims.isPadding) {
        // Center image on padded canvas
        const posX = Math.round((canvas.width - dims.drawWidth) / 2);
        const posY = Math.round((canvas.height - dims.drawHeight) / 2);
        ctx.drawImage(img, posX, posY, dims.drawWidth, dims.drawHeight);
      } else {
        ctx.drawImage(img, 0, 0, dims.drawWidth, dims.drawHeight);
      }

      const safeMime = (mimeType === 'image/jpg') ? 'image/jpeg' : mimeType;

      // Cascading export with fallbacks: safeMime -> WebP -> JPEG -> PNG
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          canvas.toBlob((webpBlob) => {
            if (webpBlob && webpBlob.size > 0) {
              resolve(webpBlob);
            } else {
              canvas.toBlob((jpegBlob) => {
                if (jpegBlob && jpegBlob.size > 0) {
                  resolve(jpegBlob);
                } else {
                  canvas.toBlob((pngBlob) => {
                    resolve(pngBlob || new Blob([], { type: 'image/png' }));
                  }, 'image/png');
                }
              }, 'image/jpeg', quality);
            }
          }, 'image/webp', quality);
        }
      }, safeMime, quality);
    });
  }

  async binarySearchQualityForSize(img, dims, mimeType, targetBytes) {
    let low = 0.05;
    let high = 0.98;
    let bestQuality = 0.8;
    let iterations = 0;

    while (low <= high && iterations < 6) {
      iterations++;
      const mid = (low + high) / 2;
      const testBlob = await this.renderToBlob(img, dims, mimeType, mid);

      if (testBlob.size <= targetBytes) {
        bestQuality = mid;
        low = mid + 0.08; // try slightly higher quality
      } else {
        high = mid - 0.08; // too large, lower quality
      }
    }
    return Math.max(0.05, Math.min(0.98, bestQuality));
  }

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => {
        console.error('Failed to load image from', src, e);
        reject(new Error('Failed to load image element'));
      };
      img.src = src;
      if (img.complete && img.naturalWidth) {
        resolve(img);
      }
    });
  }

  // -----------------------------------------------------------
  // Card UI & Before/After Slider Rendering
  // -----------------------------------------------------------
  updateUI() {
    const hasItems = this.items.length > 0;
    if (this.emptyState) this.emptyState.classList.toggle('hidden', hasItems);
    if (this.batchSummaryBar) this.batchSummaryBar.classList.toggle('hidden', !hasItems);

    if (!hasItems) {
      if (this.cardsContainer) this.cardsContainer.innerHTML = '';
      return;
    }

    // Add cards for newly added items
    this.items.forEach((item, index) => {
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

    card.innerHTML = `
      <!-- Before / After Thumbnail with Live Comparison Slider -->
      <div class="relative w-full md:w-56 h-48 md:h-44 rounded-xl overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-800 bg-neutral-100 dark:bg-neutral-950 transparency-grid select-none">
        
        <!-- After (Compressed) Background Image -->
        <img id="img-after-${item.id}" src="${item.originalUrl}" alt="Compressed Preview" class="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        
        <!-- Before (Original) Overlay with interactive clip-path -->
        <div id="overlay-${item.id}" class="absolute inset-0 overflow-hidden pointer-events-none" style="clip-path: inset(0 50% 0 0);">
          <img id="img-before-${item.id}" src="${item.originalUrl}" alt="Original Preview" class="absolute inset-0 w-full h-full object-contain pointer-events-none" />
        </div>

        <!-- Slider Line & Handle -->
        <div id="handle-line-${item.id}" class="absolute top-0 bottom-0 pointer-events-none border-r-2 border-white shadow-md z-10" style="left: 50%;"></div>
        <div id="handle-${item.id}" class="compare-handle pointer-events-none z-20" style="left: 50%;">
          <i data-lucide="chevrons-left-right" class="w-3.5 h-3.5 text-white"></i>
        </div>

        <!-- Invisible Range Input for Smooth Dragging -->
        <input type="range" min="0" max="100" value="50" class="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30" aria-label="Compare Before and After" />

        <!-- Labels -->
        <span class="absolute top-2 left-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/60 text-white backdrop-blur-xs pointer-events-none">
          Before
        </span>
        <span class="absolute top-2 right-2 z-10 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-600/80 text-white backdrop-blur-xs pointer-events-none">
          After
        </span>

        <!-- Zoom Inspection Trigger -->
        <button type="button" class="zoom-trigger-btn absolute bottom-2 right-2 z-30 p-1.5 rounded-lg bg-white/90 dark:bg-neutral-900/90 text-neutral-700 dark:text-neutral-200 hover:text-blue-600 shadow-xs backdrop-blur-xs transition-colors cursor-pointer" title="${t.zoomBtn}">
          <i data-lucide="maximize-2" class="w-3.5 h-3.5"></i>
        </button>
      </div>

      <!-- Info & Compression Metrics -->
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

          <!-- Format and Dimension Badges -->
          <div class="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-neutral-500">
            <span id="badge-dims-${item.id}" class="font-mono text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              Measuring...
            </span>
            <span id="badge-format-${item.id}" class="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold uppercase">
              ${item.type.replace('image/', '')}
            </span>
            <span id="status-pill-${item.id}" class="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600">
              <i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i>
              <span>${t.statusProcessing}</span>
            </span>
          </div>
        </div>

        <!-- Progress / Stats Ribbon -->
        <div class="space-y-1.5 bg-neutral-50 dark:bg-neutral-950/60 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800/80">
          <div class="flex items-center justify-between text-xs">
            <span class="text-neutral-500">
              ${t.totalOriginal} <strong class="text-neutral-700 dark:text-neutral-200">${this.formatBytes(item.originalSize)}</strong>
            </span>
            <span id="stat-compressed-${item.id}" class="font-bold text-neutral-900 dark:text-neutral-100">
              Calculating...
            </span>
          </div>

          <div class="flex items-center justify-between text-xs">
            <span class="text-neutral-500">Savings:</span>
            <span id="stat-savings-${item.id}" class="font-bold text-emerald-600 dark:text-emerald-400">
              --
            </span>
          </div>

          <!-- Per-item progress bar -->
          <div id="item-progress-${item.id}" class="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-1 overflow-hidden">
            <div class="bg-blue-600 h-1 rounded-full animate-pulse w-full"></div>
          </div>
        </div>

        <!-- Action Row -->
        <div class="flex items-center justify-between gap-3 pt-1">
          <div class="text-[11px] text-neutral-500 truncate" id="responsive-info-${item.id}">
            <!-- Responsive variants note -->
          </div>
          <button
            type="button"
            id="download-btn-${item.id}"
            disabled
            class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs transition-all cursor-pointer shrink-0"
          >
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>${t.downloadBtn}</span>
          </button>
        </div>
      </div>
    `;

    // Bind slider comparison input
    const sliderInput = card.querySelector('input[type="range"]');
    const overlay = card.querySelector(`#overlay-${item.id}`);
    const handleLine = card.querySelector(`#handle-line-${item.id}`);
    const handle = card.querySelector(`#handle-${item.id}`);

    sliderInput.addEventListener('input', (e) => {
      const val = e.target.value;
      overlay.style.clipPath = `inset(0 ${100 - val}% 0 0)`;
      handleLine.style.left = `${val}%`;
      handle.style.left = `${val}%`;
    });

    // Zoom trigger
    card.querySelector('.zoom-trigger-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.openZoomModal(item);
    });

    // Delete item
    card.querySelector('.delete-item-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.removeItem(item.id);
    });

    // Download item
    card.querySelector(`#download-btn-${item.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      this.downloadSingleItem(item);
    });

    return card;
  }

  updateCardStatus(item) {
    const card = document.getElementById(`card-${item.id}`);
    if (!card) return;

    const t = I18N[this.currentLang] || I18N.en;
    const statusPill = card.querySelector(`#status-pill-${item.id}`);
    const progressEl = card.querySelector(`#item-progress-${item.id}`);
    const badgeDims = card.querySelector(`#badge-dims-${item.id}`);
    const badgeFormat = card.querySelector(`#badge-format-${item.id}`);
    const statCompressed = card.querySelector(`#stat-compressed-${item.id}`);
    const statSavings = card.querySelector(`#stat-savings-${item.id}`);
    const downloadBtn = card.querySelector(`#download-btn-${item.id}`);
    const imgAfter = card.querySelector(`#img-after-${item.id}`);
    const responsiveInfo = card.querySelector(`#responsive-info-${item.id}`);

    if (item.status === 'processing') {
      statusPill.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600';
      statusPill.innerHTML = `<i data-lucide="loader-2" class="w-3 h-3 animate-spin"></i><span>${t.statusProcessing}</span>`;
      progressEl.classList.remove('hidden');
      downloadBtn.disabled = true;
    } else if (item.status === 'done') {
      statusPill.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600';
      statusPill.innerHTML = `<i data-lucide="check" class="w-3 h-3"></i><span>${t.statusDone}</span>`;
      progressEl.classList.add('hidden');
      downloadBtn.disabled = false;

      // Update compressed image preview
      if (item.compressedUrl) {
        imgAfter.src = item.compressedUrl;
      }

      // Update stats
      badgeDims.textContent = `${item.compressedWidth}×${item.compressedHeight}px`;
      const outExt = this.getExtensionForMime(item.compressedBlob?.type || item.type);
      badgeFormat.textContent = outExt.toUpperCase();

      statCompressed.textContent = this.formatBytes(item.compressedSize);

      const savedBytes = item.originalSize - item.compressedSize;
      const pct = Math.round((savedBytes / item.originalSize) * 100);

      if (pct > 0) {
        statSavings.innerHTML = `<span class="text-emerald-600 font-bold">-${pct}%</span> (${this.formatBytes(savedBytes)} saved)`;
      } else {
        statSavings.innerHTML = `<span class="text-neutral-500">Optimized (+${Math.abs(pct)}%)</span>`;
      }

      // Responsive info
      if (item.responsiveVariants && item.responsiveVariants.length > 0) {
        responsiveInfo.textContent = `+ ${item.responsiveVariants.length} responsive size variants included in ZIP`;
      } else {
        responsiveInfo.textContent = '';
      }
    } else if (item.status === 'error') {
      statusPill.className = 'inline-flex items-center gap-1 text-[11px] font-semibold text-red-600';
      statusPill.innerHTML = `<i data-lucide="alert-circle" class="w-3 h-3"></i><span>${t.statusError}</span>`;
      progressEl.classList.add('hidden');
      downloadBtn.disabled = true;
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  updateSummary() {
    let totalOrig = 0;
    let totalComp = 0;
    let doneCount = 0;

    this.items.forEach(item => {
      totalOrig += item.originalSize;
      if (item.status === 'done' && item.compressedSize > 0) {
        totalComp += item.compressedSize;
        doneCount++;
      } else {
        totalComp += item.originalSize;
      }
    });

    if (this.totalOriginalEl) this.totalOriginalEl.textContent = this.formatBytes(totalOrig);
    if (this.totalCompressedEl) this.totalCompressedEl.textContent = this.formatBytes(totalComp);

    const saved = totalOrig - totalComp;
    const pct = totalOrig > 0 ? Math.round((saved / totalOrig) * 100) : 0;

    if (this.totalSavingsEl) {
      if (pct > 0) {
        this.totalSavingsEl.textContent = `-${pct}% (${this.formatBytes(saved)})`;
        this.totalSavingsEl.className = 'font-bold text-emerald-600 dark:text-emerald-400';
      } else {
        this.totalSavingsEl.textContent = '0%';
        this.totalSavingsEl.className = 'font-bold text-neutral-500';
      }
    }

    if (this.downloadAllBtn) {
      this.downloadAllBtn.disabled = doneCount === 0;
    }
  }

  removeItem(id) {
    const idx = this.items.findIndex(item => item.id === id);
    if (idx !== -1) {
      const item = this.items[idx];
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      item.responsiveVariants.forEach(v => {
        if (v.url) URL.revokeObjectURL(v.url);
      });
      this.items.splice(idx, 1);
    }
    const card = document.getElementById(`card-${id}`);
    if (card) card.remove();
    this.updateUI();
  }

  clearAll() {
    this.items.forEach(item => {
      if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
      if (item.compressedUrl) URL.revokeObjectURL(item.compressedUrl);
      item.responsiveVariants.forEach(v => {
        if (v.url) URL.revokeObjectURL(v.url);
      });
    });
    this.items = [];
    if (this.cardsContainer) this.cardsContainer.innerHTML = '';
    this.updateUI();
  }

  // -----------------------------------------------------------
  // Download Handlers (Single & JSZip Batch)
  // -----------------------------------------------------------
  downloadSingleItem(item) {
    if (!item.compressedBlob) return;
    const ext = this.getExtensionForMime(item.compressedBlob.type);
    const baseName = item.name.replace(/\.[^/.]+$/, "");
    const fileName = `${baseName}-optimized.${ext}`;

    const link = document.createElement('a');
    link.href = item.compressedUrl;
    link.download = fileName;
    link.click();
  }

  async downloadAllAsZip() {
    const completedItems = this.items.filter(item => item.status === 'done' && item.compressedBlob);
    if (completedItems.length === 0) return;

    const originalBtnHtml = this.downloadAllBtn.innerHTML;
    this.downloadAllBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Zipping...</span>`;
    this.downloadAllBtn.disabled = true;
    if (window.lucide) window.lucide.createIcons();

    try {
      const ZipClass = window.JSZip || JSZip;
      const zip = new ZipClass();
      const folder = zip.folder("toolstacker-compressed");

      for (const item of completedItems) {
        const ext = this.getExtensionForMime(item.compressedBlob.type);
        const baseName = item.name.replace(/\.[^/.]+$/, "");
        const fileName = `${baseName}.${ext}`;
        folder.file(fileName, item.compressedBlob);

        // Include responsive variants if generated
        if (item.responsiveVariants && item.responsiveVariants.length > 0) {
          const respFolder = folder.folder(`${baseName}-responsive`);
          for (const variant of item.responsiveVariants) {
            const vName = `${baseName}-${variant.width}w.${ext}`;
            respFolder.file(vName, variant.blob);
          }
        }
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `toolstacker-images-${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      this.showToast(I18N[this.currentLang].zipSuccessToast);
    } catch (err) {
      console.error('Failed to create zip archive:', err);
      this.showToast('Failed to generate ZIP: ' + (err.message || 'Error'));
    } finally {
      this.downloadAllBtn.innerHTML = originalBtnHtml;
      this.downloadAllBtn.disabled = false;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  // -----------------------------------------------------------
  // Zoom Inspection Modal Handlers
  // -----------------------------------------------------------
  openZoomModal(item) {
    if (!this.zoomModal) return;
    this.zoomModalTitle.textContent = `${item.name} (${item.compressedWidth}×${item.compressedHeight}px)`;

    const savedPct = Math.round(((item.originalSize - item.compressedSize) / item.originalSize) * 100);
    this.zoomStatsBadge.textContent = `${this.formatBytes(item.originalSize)} → ${this.formatBytes(item.compressedSize)} (-${savedPct}%)`;

    this.zoomBeforeImg.src = item.originalUrl;
    this.zoomAfterImg.src = item.compressedUrl || item.originalUrl;

    if (this.zoomSlider) this.zoomSlider.value = 50;
    if (this.zoomCompareOverlay) this.zoomCompareOverlay.style.width = '50%';
    if (this.zoomLevelSelect) this.zoomLevelSelect.value = 'fit';

    this.zoomBeforeImg.style.transform = 'scale(1)';
    this.zoomAfterImg.style.transform = 'scale(1)';

    this.zoomModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }

  closeZoomModal() {
    if (!this.zoomModal) return;
    this.zoomModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  // -----------------------------------------------------------
  // Utility Helpers
  // -----------------------------------------------------------
  formatBytes(bytes, decimals = 1) {
    if (!bytes || bytes === 0) return '0 KB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  getExtensionForMime(mime) {
    switch (mime) {
      case 'image/webp': return 'webp';
      case 'image/jpeg': return 'jpg';
      case 'image/png': return 'png';
      case 'image/avif': return 'avif';
      default: return 'jpg';
    }
  }

  showToast(message) {
    const existing = document.getElementById('ts-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'ts-toast';
    toast.className = 'fixed bottom-5 right-5 z-50 px-4 py-2.5 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-semibold shadow-xl border border-neutral-700 dark:border-neutral-200 transition-all duration-300 transform translate-y-2 opacity-0 flex items-center gap-2';
    toast.innerHTML = `<i data-lucide="info" class="w-4 h-4 text-blue-400"></i><span>${message}</span>`;
    document.body.appendChild(toast);

    if (window.lucide) window.lucide.createIcons();

    requestAnimationFrame(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    });

    setTimeout(() => {
      toast.classList.add('translate-y-2', 'opacity-0');
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
}

// Auto instantiate on DOM Ready or immediately if DOM is already ready
export function initImageCompressor() {
  if (!window.imageCompressorApp) {
    window.imageCompressorApp = new ImageCompressorApp();
  }
  return window.imageCompressorApp;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initImageCompressor);
} else {
  initImageCompressor();
}
