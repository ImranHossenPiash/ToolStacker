/**
 * ToolStacker Stamp PDF Tool
 * 100% Client-Side • Preset & Custom Digital Rubber Stamps • Real-Time Interactive Preview
 * Powered by pdf-lib and pdf.js
 */

// Initialize pdf.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFormattedTimestamp() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

function getTodayStampDate() {
  const d = new Date();
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

// Preset Stamp Definitions
const PRESET_STAMPS = {
  approved: {
    key: 'approved',
    title: 'APPROVED',
    subtitle: 'VERIFIED & VALID',
    color: '#059669', // Emerald
    borderColor: '#059669',
    borderStyle: 'double',
    rotation: -12,
  },
  draft: {
    key: 'draft',
    title: 'DRAFT',
    subtitle: 'DO NOT DISTRIBUTE',
    color: '#d97706', // Amber
    borderColor: '#d97706',
    borderStyle: 'dashed',
    rotation: -15,
  },
  confidential: {
    key: 'confidential',
    title: 'CONFIDENTIAL',
    subtitle: 'RESTRICTED ACCESS',
    color: '#dc2626', // Red
    borderColor: '#dc2626',
    borderStyle: 'solid',
    rotation: -10,
  },
  final: {
    key: 'final',
    title: 'FINAL',
    subtitle: 'OFFICIAL RELEASE',
    color: '#2563eb', // Blue
    borderColor: '#2563eb',
    borderStyle: 'double',
    rotation: 0,
  },
  rejected: {
    key: 'rejected',
    title: 'REJECTED',
    subtitle: 'DECLINED / RESUBMIT',
    color: '#b91c1c', // Crimson
    borderColor: '#b91c1c',
    borderStyle: 'solid',
    rotation: -15,
  },
  copy: {
    key: 'copy',
    title: 'COPY',
    subtitle: 'DUPLICATE RECORD',
    color: '#4b5563', // Slate
    borderColor: '#4b5563',
    borderStyle: 'solid',
    rotation: 0,
  },
  urgent: {
    key: 'urgent',
    title: 'URGENT',
    subtitle: 'PRIORITY ACTION REQUIRED',
    color: '#e11d48', // Rose
    borderColor: '#e11d48',
    borderStyle: 'solid',
    rotation: -10,
  },
  review: {
    key: 'review',
    title: 'FOR REVIEW',
    subtitle: 'COMMENTS REQUESTED',
    color: '#7c3aed', // Violet
    borderColor: '#7c3aed',
    borderStyle: 'double',
    rotation: -12,
  },
};

/**
 * Generate a rubber stamp PNG data URL using HTML5 Canvas
 */
function renderStampCanvas(options) {
  const canvas = document.createElement('canvas');
  const scale = 2; // Hi-DPI crisp rendering
  const width = 360 * scale;
  const height = 125 * scale;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.clearRect(0, 0, width, height);

  const title = (options.title || 'STAMP').toUpperCase();
  const subtitle = options.subtitle !== undefined ? options.subtitle : getTodayStampDate();
  const color = options.color || '#dc2626';
  const borderStyle = options.borderStyle || 'double';
  const fontFamily = options.fontFamily || '"Impact", "Arial Black", sans-serif';

  const padX = 14 * scale;
  const padY = 12 * scale;
  const rectW = width - padX * 2;
  const rectH = height - padY * 2;
  const radius = 10 * scale;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;

  // Draw outer rounded rectangle
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  if (borderStyle !== 'none') {
    if (borderStyle === 'double') {
      // Outer border
      ctx.lineWidth = 4.5 * scale;
      roundRect(padX, padY, rectW, rectH, radius);
      ctx.stroke();

      // Inner border
      ctx.lineWidth = 1.8 * scale;
      const innerGap = 5 * scale;
      roundRect(padX + innerGap, padY + innerGap, rectW - innerGap * 2, rectH - innerGap * 2, Math.max(2, radius - 3 * scale));
      ctx.stroke();
    } else if (borderStyle === 'dashed') {
      ctx.lineWidth = 4 * scale;
      ctx.setLineDash([8 * scale, 6 * scale]);
      roundRect(padX, padY, rectW, rectH, radius);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Solid
      ctx.lineWidth = 5 * scale;
      roundRect(padX, padY, rectW, rectH, radius);
      ctx.stroke();
    }
  }

  // Draw main title text
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Calculate dynamic font size based on text length
  let fontSize = 38 * scale;
  if (title.length > 12) fontSize = 28 * scale;
  if (title.length > 18) fontSize = 22 * scale;

  ctx.font = `900 ${fontSize}px ${fontFamily}`;

  // Center vertical placement depends on subtitle presence
  const centerY = subtitle ? padY + rectH * 0.42 : padY + rectH * 0.5;
  ctx.fillText(title, width / 2, centerY);

  // Draw subtitle / date line if present
  if (subtitle && subtitle.trim().length > 0) {
    const subY = padY + rectH * 0.78;
    const subFontSize = 13 * scale;
    ctx.font = `700 ${subFontSize}px "Courier New", Courier, monospace`;
    ctx.letterSpacing = '2px';
    ctx.fillText(subtitle.toUpperCase(), width / 2, subY);

    // Subtle divider line
    const divW = rectW * 0.7;
    const divY = padY + rectH * 0.64;
    ctx.beginPath();
    ctx.moveTo((width - divW) / 2, divY);
    ctx.lineTo((width + divW) / 2, divY);
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();
  }

  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Parse page range input string like "1, 3, 5-8" into 1-based page numbers
 */
function parsePageRange(str, totalPages) {
  if (!str || !str.trim()) {
    // Return all pages
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set();
  const parts = str.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = parseInt(startStr.trim(), 10);
      const end = parseInt(endStr.trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        const min = Math.max(1, Math.min(start, end));
        const max = Math.min(totalPages, Math.max(start, end));
        for (let p = min; p <= max; p++) {
          pages.add(p);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        pages.add(p);
      }
    }
  }

  const result = Array.from(pages).sort((a, b) => a - b);
  return result.length > 0 ? result : Array.from({ length: totalPages }, (_, i) => i + 1);
}

class StampPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.currentViewport = null;
    this.previewScale = 1.0;

    // Active Stamps List
    this.stamps = [
      this.createDefaultStamp('approved')
    ];
    this.activeStampIndex = 0;

    // Stamp Dragging state on live preview canvas
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;

    // Result PDF Blob
    this.stampedBlob = null;
    this.stampedUrl = null;

    this.cacheDom();
    this.bindEvents();
    this.renderPresetButtons();
    this.renderStampTabs();
    this.updateControlsFromActiveStamp();
  }

  createDefaultStamp(presetKey = 'approved') {
    const preset = PRESET_STAMPS[presetKey] || PRESET_STAMPS.approved;
    return {
      id: 'stamp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      type: 'preset', // 'preset' | 'text' | 'image'
      presetKey: preset.key,
      text: preset.title,
      subtitle: preset.subtitle,
      font: '"Impact", "Arial Black", sans-serif',
      color: preset.color,
      borderStyle: preset.borderStyle,
      sizePercent: 100, // 50 - 200
      opacityPercent: 85, // 30 - 100
      rotationDeg: preset.rotation, // 0 - 360 or negative
      position: 'top-right', // 3x3: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right, or 'custom'
      customXPercent: 75, // 0 - 100 (% of page width)
      customYPercent: 15, // 0 - 100 (% of page height from top)
      pageRangeMode: 'all', // 'all' | 'specific'
      specificPages: '',
      imageDataUrl: null,
      imageWidth: 0,
      imageHeight: 0,
      imageName: '',
    };
  }

  getActiveStamp() {
    if (!this.stamps[this.activeStampIndex]) {
      this.activeStampIndex = 0;
    }
    return this.stamps[this.activeStampIndex];
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Workspace & Header
    this.workspace = document.getElementById('workspace');
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.resetBtn = document.getElementById('reset-btn');

    // Multi-Stamp Tabs Bar
    this.stampChipsContainer = document.getElementById('stamp-chips-container');
    this.addStampChipBtn = document.getElementById('add-stamp-chip-btn');
    this.deleteCurrentStampBtn = document.getElementById('delete-current-stamp-btn');

    // Mode Selector (Preset, Custom Text, Upload Image)
    this.tabPreset = document.getElementById('tab-preset');
    this.tabText = document.getElementById('tab-text');
    this.tabImage = document.getElementById('tab-image');
    this.panelPreset = document.getElementById('panel-preset');
    this.panelText = document.getElementById('panel-text');
    this.panelImage = document.getElementById('panel-image');

    // Preset Grid Container
    this.presetGrid = document.getElementById('preset-grid');

    // Custom Text Controls
    this.customTextInput = document.getElementById('custom-text-input');
    this.customSubtextInput = document.getElementById('custom-subtext-input');
    this.fontSelect = document.getElementById('font-select');
    this.borderSelect = document.getElementById('border-select');
    this.textColorPicker = document.getElementById('text-color-picker');
    this.textColorHex = document.getElementById('text-color-hex');
    this.colorPresets = document.querySelectorAll('.color-preset-btn');

    // Upload Image Controls
    this.imageUploadInput = document.getElementById('image-upload-input');
    this.imageDropArea = document.getElementById('image-drop-area');
    this.imagePreviewArea = document.getElementById('image-preview-area');
    this.imagePreviewImg = document.getElementById('image-preview-img');
    this.imageFileName = document.getElementById('image-file-name');
    this.removeImageBtn = document.getElementById('remove-image-btn');

    // Shared Customization Sliders
    this.sizeSlider = document.getElementById('size-slider');
    this.sizeVal = document.getElementById('size-val');
    this.opacitySlider = document.getElementById('opacity-slider');
    this.opacityVal = document.getElementById('opacity-val');
    this.rotationSlider = document.getElementById('rotation-slider');
    this.rotationVal = document.getElementById('rotation-val');
    this.angleBtns = document.querySelectorAll('.angle-btn');

    // Position Grid & Custom Coordinates
    this.posGrid = document.getElementById('pos-grid');
    this.posButtons = document.querySelectorAll('.pos-btn');
    this.customCoordsContainer = document.getElementById('custom-coords-container');
    this.coordXInput = document.getElementById('coord-x-input');
    this.coordYInput = document.getElementById('coord-y-input');

    // Page Range Controls
    this.rangeAllRadio = document.getElementById('range-all');
    this.rangeSpecificRadio = document.getElementById('range-specific');
    this.specificPagesContainer = document.getElementById('specific-pages-container');
    this.specificPagesInput = document.getElementById('specific-pages-input');

    // Live Preview Elements
    this.previewContainer = document.getElementById('preview-container');
    this.pdfCanvas = document.getElementById('pdf-canvas');
    this.stampOverlay = document.getElementById('stamp-overlay');
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.jumpPageInput = document.getElementById('jump-page-input');
    this.previewLoading = document.getElementById('preview-loading');

    // Actions
    this.addStampBtn = document.getElementById('add-stamp-btn');
    this.addMoreStampsBtn = document.getElementById('add-more-stamps-btn');
    this.stickyAddStampBtn = document.getElementById('sticky-add-stamp-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download State
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultFileBadge = document.getElementById('result-file-badge');
    this.stampAnotherBtn = document.getElementById('stamp-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('stamp-progress-fill');
    this.progressPct = document.getElementById('stamp-progress-pct');
    this.progressText = document.getElementById('stamp-progress-text');
  }

  bindEvents() {
    // Dropzone Events
    if (this.dropzone && this.fileInput) {
      this.dropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#browse-btn')) {
          this.fileInput.click();
        }
      });

      this.dropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.fileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach((name) => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach((name) => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.dropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadPdfFile(e.dataTransfer.files[0]);
        }
      });
    }

    this.browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.loadPdfFile(e.target.files[0]);
        e.target.value = '';
      }
    });

    this.resetBtn?.addEventListener('click', () => this.resetAll());
    this.stampAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Multi-stamp add & delete
    this.addStampChipBtn?.addEventListener('click', () => this.addNewStamp());
    this.addMoreStampsBtn?.addEventListener('click', () => this.addNewStamp());
    this.deleteCurrentStampBtn?.addEventListener('click', () => this.deleteCurrentStamp());

    // Mode Tabs
    this.tabPreset?.addEventListener('click', () => this.setStampType('preset'));
    this.tabText?.addEventListener('click', () => this.setStampType('text'));
    this.tabImage?.addEventListener('click', () => this.setStampType('image'));

    // Custom Text Inputs
    this.customTextInput?.addEventListener('input', (e) => {
      const stamp = this.getActiveStamp();
      stamp.text = e.target.value;
      this.updateStampOverlay();
    });

    this.customSubtextInput?.addEventListener('input', (e) => {
      const stamp = this.getActiveStamp();
      stamp.subtitle = e.target.value;
      this.updateStampOverlay();
    });

    this.fontSelect?.addEventListener('change', (e) => {
      const stamp = this.getActiveStamp();
      stamp.font = e.target.value;
      this.updateStampOverlay();
    });

    this.borderSelect?.addEventListener('change', (e) => {
      const stamp = this.getActiveStamp();
      stamp.borderStyle = e.target.value;
      this.updateStampOverlay();
    });

    this.textColorPicker?.addEventListener('input', (e) => {
      const color = e.target.value;
      if (this.textColorHex) this.textColorHex.value = color.toUpperCase();
      const stamp = this.getActiveStamp();
      stamp.color = color;
      this.updateStampOverlay();
    });

    this.textColorHex?.addEventListener('input', (e) => {
      let color = e.target.value.trim();
      if (!color.startsWith('#')) color = '#' + color;
      if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
        if (this.textColorPicker) this.textColorPicker.value = color;
        const stamp = this.getActiveStamp();
        stamp.color = color;
        this.updateStampOverlay();
      }
    });

    this.colorPresets.forEach((btn) => {
      btn.addEventListener('click', () => {
        const color = btn.getAttribute('data-color');
        if (color) {
          if (this.textColorPicker) this.textColorPicker.value = color;
          if (this.textColorHex) this.textColorHex.value = color.toUpperCase();
          const stamp = this.getActiveStamp();
          stamp.color = color;
          this.updateStampOverlay();
        }
      });
    });

    // Image Upload Events
    this.imageDropArea?.addEventListener('click', () => this.imageUploadInput?.click());
    this.imageUploadInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleImageUpload(e.target.files[0]);
        e.target.value = '';
      }
    });

    this.removeImageBtn?.addEventListener('click', () => {
      const stamp = this.getActiveStamp();
      stamp.imageDataUrl = null;
      stamp.imageWidth = 0;
      stamp.imageHeight = 0;
      stamp.imageName = '';
      this.imagePreviewArea?.classList.add('hidden');
      this.imageDropArea?.classList.remove('hidden');
      this.updateStampOverlay();
      this.showToast('Uploaded image removed.', 'info');
    });

    // Sliders
    this.sizeSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (this.sizeVal) this.sizeVal.textContent = `${val}%`;
      const stamp = this.getActiveStamp();
      stamp.sizePercent = val;
      this.updateStampOverlay();
    });

    this.opacitySlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (this.opacityVal) this.opacityVal.textContent = `${val}%`;
      const stamp = this.getActiveStamp();
      stamp.opacityPercent = val;
      this.updateStampOverlay();
    });

    this.rotationSlider?.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (this.rotationVal) this.rotationVal.textContent = `${val}°`;
      const stamp = this.getActiveStamp();
      stamp.rotationDeg = val;
      this.updateStampOverlay();
    });

    this.angleBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const angle = parseInt(btn.getAttribute('data-angle'), 10);
        if (!isNaN(angle)) {
          if (this.rotationSlider) this.rotationSlider.value = angle;
          if (this.rotationVal) this.rotationVal.textContent = `${angle}°`;
          const stamp = this.getActiveStamp();
          stamp.rotationDeg = angle;
          this.updateStampOverlay();
        }
      });
    });

    // Position Buttons (3x3 Grid)
    this.posButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pos = btn.getAttribute('data-pos');
        if (pos) {
          this.setStampPosition(pos);
        }
      });
    });

    // Custom Coordinate Inputs
    this.coordXInput?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      const stamp = this.getActiveStamp();
      stamp.customXPercent = Math.max(0, Math.min(100, val));
      stamp.position = 'custom';
      this.highlightPositionButton('custom');
      this.updateStampOverlay();
    });

    this.coordYInput?.addEventListener('input', (e) => {
      const val = parseFloat(e.target.value) || 0;
      const stamp = this.getActiveStamp();
      stamp.customYPercent = Math.max(0, Math.min(100, val));
      stamp.position = 'custom';
      this.highlightPositionButton('custom');
      this.updateStampOverlay();
    });

    // Page Range Radios
    this.rangeAllRadio?.addEventListener('change', () => {
      const stamp = this.getActiveStamp();
      stamp.pageRangeMode = 'all';
      this.specificPagesContainer?.classList.add('hidden');
      this.updateStampOverlay();
    });

    this.rangeSpecificRadio?.addEventListener('change', () => {
      const stamp = this.getActiveStamp();
      stamp.pageRangeMode = 'specific';
      this.specificPagesContainer?.classList.remove('hidden');
      this.updateStampOverlay();
    });

    this.specificPagesInput?.addEventListener('input', (e) => {
      const stamp = this.getActiveStamp();
      stamp.specificPages = e.target.value;
      this.updateStampOverlay();
    });

    // Pagination
    this.prevPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.renderPreviewPage(this.currentPageNum - 1);
      }
    });

    this.nextPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum < this.totalPages) {
        this.renderPreviewPage(this.currentPageNum + 1);
      }
    });

    this.jumpPageInput?.addEventListener('change', (e) => {
      const p = parseInt(e.target.value, 10);
      if (!isNaN(p) && p >= 1 && p <= this.totalPages) {
        this.renderPreviewPage(p);
      } else {
        e.target.value = this.currentPageNum;
      }
    });

    // Action Execution
    this.addStampBtn?.addEventListener('click', () => this.executeAddStamp());
    this.stickyAddStampBtn?.addEventListener('click', () => this.executeAddStamp());
    this.downloadBtn?.addEventListener('click', () => this.downloadStampedPdf());

    // Interactive Dragging on Preview Canvas
    if (this.stampOverlay && this.previewContainer) {
      this.stampOverlay.addEventListener('mousedown', (e) => this.onDragStart(e));
      window.addEventListener('mousemove', (e) => this.onDragMove(e));
      window.addEventListener('mouseup', () => this.onDragEnd());

      // Touch events for mobile
      this.stampOverlay.addEventListener('touchstart', (e) => this.onDragStart(e.touches[0]), { passive: true });
      window.addEventListener('touchmove', (e) => this.onDragMove(e.touches[0]), { passive: true });
      window.addEventListener('touchend', () => this.onDragEnd());
    }
  }

  // -------------------------------------------------------------
  // Preset Grid Generation
  // -------------------------------------------------------------
  renderPresetButtons() {
    if (!this.presetGrid) return;
    this.presetGrid.innerHTML = '';

    Object.values(PRESET_STAMPS).forEach((preset) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `preset-card group relative p-3 rounded-2xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 ${
        this.getActiveStamp().presetKey === preset.key
          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900'
      }`;
      btn.setAttribute('data-preset', preset.key);

      // Mini stamp representation
      const stampMini = document.createElement('div');
      stampMini.className =
        'w-full py-2 px-2.5 rounded-lg border flex flex-col items-center justify-center transition-transform group-hover:scale-105';
      stampMini.style.borderColor = preset.color;
      stampMini.style.color = preset.color;
      stampMini.style.transform = `rotate(${preset.rotation * 0.5}deg)`;

      stampMini.innerHTML = `
        <span class="font-extrabold text-[12px] tracking-wider leading-none">${preset.title}</span>
        <span class="text-[8px] font-mono opacity-80 mt-0.5">${preset.subtitle}</span>
      `;

      btn.appendChild(stampMini);

      btn.addEventListener('click', () => {
        this.selectPreset(preset.key);
      });

      this.presetGrid.appendChild(btn);
    });
  }

  selectPreset(presetKey) {
    const preset = PRESET_STAMPS[presetKey];
    if (!preset) return;

    const stamp = this.getActiveStamp();
    stamp.type = 'preset';
    stamp.presetKey = preset.key;
    stamp.text = preset.title;
    stamp.subtitle = preset.subtitle;
    stamp.color = preset.color;
    stamp.borderStyle = preset.borderStyle;
    stamp.rotationDeg = preset.rotation;

    // Update active highlight on buttons
    const cards = this.presetGrid.querySelectorAll('.preset-card');
    cards.forEach((c) => {
      const isSelected = c.getAttribute('data-preset') === presetKey;
      c.className = `preset-card group relative p-3 rounded-2xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 ${
        isSelected
          ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900'
      }`;
    });

    if (this.rotationSlider) this.rotationSlider.value = preset.rotation;
    if (this.rotationVal) this.rotationVal.textContent = `${preset.rotation}°`;

    this.updateStampOverlay();
    this.showToast(`Selected stamp: "${preset.title}"`, 'info');
  }

  // -------------------------------------------------------------
  // Stamp Tabs Management (Multi-Stamp)
  // -------------------------------------------------------------
  renderStampTabs() {
    if (!this.stampChipsContainer) return;
    this.stampChipsContainer.innerHTML = '';

    this.stamps.forEach((stamp, index) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      const isActive = index === this.activeStampIndex;
      chip.className = `inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-600 text-white shadow-xs'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`;

      const iconName = stamp.type === 'image' ? 'image' : 'stamp';
      const label = stamp.type === 'preset' ? stamp.text : stamp.type === 'text' ? (stamp.text || 'Text Stamp') : (stamp.imageName || 'Image Stamp');

      chip.innerHTML = `
        <i data-lucide="${iconName}" class="w-3.5 h-3.5"></i>
        <span>Stamp ${index + 1}: ${label}</span>
      `;

      chip.addEventListener('click', () => {
        this.activeStampIndex = index;
        this.renderStampTabs();
        this.updateControlsFromActiveStamp();
        this.updateStampOverlay();
      });

      this.stampChipsContainer.appendChild(chip);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    if (this.deleteCurrentStampBtn) {
      this.deleteCurrentStampBtn.classList.toggle('hidden', this.stamps.length <= 1);
    }
  }

  addNewStamp() {
    if (this.stamps.length >= 8) {
      this.showToast('Maximum 8 stamps per document reached.', 'warning');
      return;
    }

    const newStamp = this.createDefaultStamp('confidential');
    newStamp.position = 'bottom-right';
    newStamp.customXPercent = 75;
    newStamp.customYPercent = 85;

    this.stamps.push(newStamp);
    this.activeStampIndex = this.stamps.length - 1;
    this.renderStampTabs();
    this.updateControlsFromActiveStamp();
    this.updateStampOverlay();
    this.showToast(`Added Stamp ${this.stamps.length}.`, 'success');
  }

  deleteCurrentStamp() {
    if (this.stamps.length <= 1) return;
    this.stamps.splice(this.activeStampIndex, 1);
    if (this.activeStampIndex >= this.stamps.length) {
      this.activeStampIndex = this.stamps.length - 1;
    }
    this.renderStampTabs();
    this.updateControlsFromActiveStamp();
    this.updateStampOverlay();
    this.showToast('Stamp removed.', 'info');
  }

  setStampType(type) {
    const stamp = this.getActiveStamp();
    stamp.type = type;

    // Tabs UI
    const tabs = [
      { id: 'tab-preset', el: this.tabPreset, panel: this.panelPreset, type: 'preset' },
      { id: 'tab-text', el: this.tabText, panel: this.panelText, type: 'text' },
      { id: 'tab-image', el: this.tabImage, panel: this.panelImage, type: 'image' },
    ];

    tabs.forEach((t) => {
      const active = t.type === type;
      if (t.el) {
        t.el.className = `flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
          active
            ? 'bg-white dark:bg-neutral-800 text-blue-600 dark:text-blue-400 shadow-xs'
            : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
        }`;
      }
      if (t.panel) {
        t.panel.classList.toggle('hidden', !active);
      }
    });

    this.renderStampTabs();
    this.updateStampOverlay();
  }

  updateControlsFromActiveStamp() {
    const stamp = this.getActiveStamp();
    this.setStampType(stamp.type);

    // Preset cards
    if (this.presetGrid) {
      const cards = this.presetGrid.querySelectorAll('.preset-card');
      cards.forEach((c) => {
        const isSelected = c.getAttribute('data-preset') === stamp.presetKey;
        c.className = `preset-card group relative p-3 rounded-2xl border-2 transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-1.5 ${
          isSelected
            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-white dark:bg-neutral-900'
        }`;
      });
    }

    // Custom Text
    if (this.customTextInput) this.customTextInput.value = stamp.text || '';
    if (this.customSubtextInput) this.customSubtextInput.value = stamp.subtitle || '';
    if (this.fontSelect) this.fontSelect.value = stamp.font || '"Impact", "Arial Black", sans-serif';
    if (this.borderSelect) this.borderSelect.value = stamp.borderStyle || 'double';
    if (this.textColorPicker) this.textColorPicker.value = stamp.color || '#dc2626';
    if (this.textColorHex) this.textColorHex.value = (stamp.color || '#dc2626').toUpperCase();

    // Image Upload
    if (stamp.imageDataUrl) {
      this.imageDropArea?.classList.add('hidden');
      this.imagePreviewArea?.classList.remove('hidden');
      if (this.imagePreviewImg) this.imagePreviewImg.src = stamp.imageDataUrl;
      if (this.imageFileName) this.imageFileName.textContent = stamp.imageName || 'Uploaded Image';
    } else {
      this.imageDropArea?.classList.remove('hidden');
      this.imagePreviewArea?.classList.add('hidden');
    }

    // Sliders
    if (this.sizeSlider) this.sizeSlider.value = stamp.sizePercent;
    if (this.sizeVal) this.sizeVal.textContent = `${stamp.sizePercent}%`;

    if (this.opacitySlider) this.opacitySlider.value = stamp.opacityPercent;
    if (this.opacityVal) this.opacityVal.textContent = `${stamp.opacityPercent}%`;

    if (this.rotationSlider) this.rotationSlider.value = stamp.rotationDeg;
    if (this.rotationVal) this.rotationVal.textContent = `${stamp.rotationDeg}°`;

    // Position
    this.highlightPositionButton(stamp.position);
    if (this.coordXInput) this.coordXInput.value = Math.round(stamp.customXPercent);
    if (this.coordYInput) this.coordYInput.value = Math.round(stamp.customYPercent);
    this.customCoordsContainer?.classList.toggle('hidden', stamp.position !== 'custom');

    // Page Range
    if (this.rangeAllRadio) this.rangeAllRadio.checked = stamp.pageRangeMode === 'all';
    if (this.rangeSpecificRadio) this.rangeSpecificRadio.checked = stamp.pageRangeMode === 'specific';
    this.specificPagesContainer?.classList.toggle('hidden', stamp.pageRangeMode !== 'specific');
    if (this.specificPagesInput) this.specificPagesInput.value = stamp.specificPages || '';
  }

  // -------------------------------------------------------------
  // Image Upload Handling
  // -------------------------------------------------------------
  handleImageUpload(file) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Please upload an image file (PNG, JPG, SVG, WebP).', 'error');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      this.showToast('Image is larger than 20MB. Please use a smaller logo.', 'warning');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        const stamp = this.getActiveStamp();
        stamp.type = 'image';
        stamp.imageDataUrl = dataUrl;
        stamp.imageWidth = img.naturalWidth || 300;
        stamp.imageHeight = img.naturalHeight || 150;
        stamp.imageName = file.name;

        this.setStampType('image');
        if (this.imagePreviewImg) this.imagePreviewImg.src = dataUrl;
        if (this.imageFileName) this.imageFileName.textContent = `${file.name} (${img.naturalWidth}×${img.naturalHeight}px)`;
        this.imageDropArea?.classList.add('hidden');
        this.imagePreviewArea?.classList.remove('hidden');

        this.updateStampOverlay();
        this.showToast(`Loaded image stamp: "${file.name}"`, 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // -------------------------------------------------------------
  // Position Handling
  // -------------------------------------------------------------
  setStampPosition(pos) {
    const stamp = this.getActiveStamp();
    stamp.position = pos;

    const coordsMap = {
      'top-left': { x: 18, y: 12 },
      'top-center': { x: 50, y: 12 },
      'top-right': { x: 82, y: 12 },
      'middle-left': { x: 18, y: 50 },
      'center': { x: 50, y: 50 },
      'middle-right': { x: 82, y: 50 },
      'bottom-left': { x: 18, y: 88 },
      'bottom-center': { x: 50, y: 88 },
      'bottom-right': { x: 82, y: 88 },
    };

    if (coordsMap[pos]) {
      stamp.customXPercent = coordsMap[pos].x;
      stamp.customYPercent = coordsMap[pos].y;
      if (this.coordXInput) this.coordXInput.value = Math.round(stamp.customXPercent);
      if (this.coordYInput) this.coordYInput.value = Math.round(stamp.customYPercent);
    }

    this.highlightPositionButton(pos);
    this.customCoordsContainer?.classList.toggle('hidden', pos !== 'custom');
    this.updateStampOverlay();
  }

  highlightPositionButton(pos) {
    this.posButtons.forEach((btn) => {
      const match = btn.getAttribute('data-pos') === pos;
      btn.className = `pos-btn p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
        match
          ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
          : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
      }`;
    });
  }

  // -------------------------------------------------------------
  // Load PDF & Render Preview
  // -------------------------------------------------------------
  async loadPdfFile(file) {
    if (!file) return;

    if (file.size === 0) {
      this.showToast('Selected file is empty (0 bytes).', 'error');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      this.showToast('File exceeds 200MB maximum size limit.', 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document.', 'error');
      return;
    }

    this.showProcessingModal(true, 'Reading PDF structure...');
    this.updateProgress(25, 'Loading PDF document into memory...');

    try {
      this.currentFile = file;
      this.pdfBytes = await file.arrayBuffer();

      if (!window.pdfjsLib) {
        throw new Error('PDF viewing engine is not loaded.');
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: this.pdfBytes });
      this.pdfDocProxy = await loadingTask.promise;
      this.totalPages = this.pdfDocProxy.numPages;
      this.currentPageNum = 1;

      this.updateProgress(75, 'Rendering page preview...');

      if (this.docName) this.docName.textContent = file.name;
      if (this.docDetails) {
        this.docDetails.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      await this.renderPreviewPage(1);

      this.showProcessingModal(false);
      this.showToast(`Loaded "${file.name}" with ${this.totalPages} pages.`, 'info');
    } catch (err) {
      console.error('PDF load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to load PDF: ${err.message}`, 'error');
    }
  }

  async renderPreviewPage(pageNum) {
    if (!this.pdfDocProxy) return;

    try {
      this.previewLoading?.classList.remove('hidden');
      this.currentPageNum = pageNum;

      if (this.pageIndicator) {
        this.pageIndicator.textContent = `Page ${pageNum} of ${this.totalPages}`;
      }
      if (this.jumpPageInput) {
        this.jumpPageInput.value = pageNum;
        this.jumpPageInput.max = this.totalPages;
      }
      if (this.prevPageBtn) this.prevPageBtn.disabled = pageNum <= 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = pageNum >= this.totalPages;

      const page = await this.pdfDocProxy.getPage(pageNum);
      
      // Determine appropriate scale to fit container width
      const containerWidth = this.previewContainer?.clientWidth || 550;
      const initialViewport = page.getViewport({ scale: 1.0 });
      const targetWidth = Math.min(containerWidth - 32, 600);
      const scale = targetWidth / initialViewport.width;
      this.previewScale = scale;

      const viewport = page.getViewport({ scale });
      this.currentViewport = viewport;

      if (this.pdfCanvas) {
        this.pdfCanvas.width = viewport.width;
        this.pdfCanvas.height = viewport.height;
        this.pdfCanvas.style.width = `${viewport.width}px`;
        this.pdfCanvas.style.height = `${viewport.height}px`;

        const ctx = this.pdfCanvas.getContext('2d');
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
        };
        await page.render(renderContext).promise;
      }

      this.previewLoading?.classList.add('hidden');
      this.updateStampOverlay();
    } catch (err) {
      console.error('Page render error:', err);
      this.previewLoading?.classList.add('hidden');
    }
  }

  // -------------------------------------------------------------
  // Live Stamp Overlay Update on Preview
  // -------------------------------------------------------------
  updateStampOverlay() {
    if (!this.stampOverlay || !this.pdfCanvas) return;

    const stamp = this.getActiveStamp();

    // Check if this stamp applies to the current page
    let appliesToThisPage = true;
    if (stamp.pageRangeMode === 'specific') {
      const allowedPages = parsePageRange(stamp.specificPages, this.totalPages);
      appliesToThisPage = allowedPages.includes(this.currentPageNum);
    }

    if (!appliesToThisPage) {
      this.stampOverlay.classList.add('hidden');
      return;
    }
    this.stampOverlay.classList.remove('hidden');

    let stampDataUrl = '';
    let aspect = 360 / 125;

    if (stamp.type === 'preset' || stamp.type === 'text') {
      stampDataUrl = renderStampCanvas({
        title: stamp.text || 'STAMP',
        subtitle: stamp.subtitle,
        color: stamp.color,
        borderStyle: stamp.borderStyle,
        fontFamily: stamp.font,
      });
      aspect = 360 / 125;
    } else if (stamp.type === 'image' && stamp.imageDataUrl) {
      stampDataUrl = stamp.imageDataUrl;
      aspect = (stamp.imageWidth && stamp.imageHeight) ? (stamp.imageWidth / stamp.imageHeight) : 2.0;
    } else {
      // Fallback placeholder
      stampDataUrl = renderStampCanvas({
        title: 'UPLOAD LOGO',
        subtitle: 'NO IMAGE SELECTED',
        color: '#9ca3af',
        borderStyle: 'dashed',
      });
      aspect = 360 / 125;
    }

    const canvasW = this.pdfCanvas.width;
    const canvasH = this.pdfCanvas.height;

    // Base dimensions on preview canvas
    const baseW = canvasW * 0.38;
    const currentW = baseW * (stamp.sizePercent / 100);
    const currentH = currentW / aspect;

    // Center coordinates
    const cx = (stamp.customXPercent / 100) * canvasW;
    const cy = (stamp.customYPercent / 100) * canvasH;

    const left = cx - currentW / 2;
    const top = cy - currentH / 2;

    this.stampOverlay.style.width = `${currentW}px`;
    this.stampOverlay.style.height = `${currentH}px`;
    this.stampOverlay.style.left = `${left}px`;
    this.stampOverlay.style.top = `${top}px`;
    this.stampOverlay.style.transform = `rotate(${stamp.rotationDeg}deg)`;
    this.stampOverlay.style.opacity = `${stamp.opacityPercent / 100}`;
    this.stampOverlay.style.backgroundImage = `url(${stampDataUrl})`;
    this.stampOverlay.style.backgroundSize = 'contain';
    this.stampOverlay.style.backgroundRepeat = 'no-repeat';
    this.stampOverlay.style.backgroundPosition = 'center';
  }

  // -------------------------------------------------------------
  // Interactive Drag on Preview
  // -------------------------------------------------------------
  onDragStart(e) {
    if (!this.pdfCanvas) return;
    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.stampOverlay?.classList.add('cursor-grabbing');
  }

  onDragMove(e) {
    if (!this.isDragging || !this.pdfCanvas) return;

    const dx = e.clientX - this.dragStartX;
    const dy = e.clientY - this.dragStartY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;

    const stamp = this.getActiveStamp();
    const canvasW = this.pdfCanvas.width;
    const canvasH = this.pdfCanvas.height;

    const deltaXPct = (dx / canvasW) * 100;
    const deltaYPct = (dy / canvasH) * 100;

    stamp.customXPercent = Math.max(5, Math.min(95, stamp.customXPercent + deltaXPct));
    stamp.customYPercent = Math.max(5, Math.min(95, stamp.customYPercent + deltaYPct));
    stamp.position = 'custom';

    this.highlightPositionButton('custom');
    if (this.coordXInput) this.coordXInput.value = Math.round(stamp.customXPercent);
    if (this.coordYInput) this.coordYInput.value = Math.round(stamp.customYPercent);
    this.customCoordsContainer?.classList.remove('hidden');

    this.updateStampOverlay();
  }

  onDragEnd() {
    if (this.isDragging) {
      this.isDragging = false;
      this.stampOverlay?.classList.remove('cursor-grabbing');
    }
  }

  // -------------------------------------------------------------
  // Execution: Embed Stamps using pdf-lib
  // -------------------------------------------------------------
  async executeAddStamp() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    // Validation
    for (let i = 0; i < this.stamps.length; i++) {
      const s = this.stamps[i];
      if (s.type === 'text' && (!s.text || !s.text.trim())) {
        this.showToast(`Stamp ${i + 1} has empty text. Please enter stamp text.`, 'error');
        this.activeStampIndex = i;
        this.renderStampTabs();
        this.updateControlsFromActiveStamp();
        return;
      }
      if (s.type === 'image' && !s.imageDataUrl) {
        this.showToast(`Stamp ${i + 1} has no uploaded image selected.`, 'error');
        this.activeStampIndex = i;
        this.renderStampTabs();
        this.updateControlsFromActiveStamp();
        return;
      }
    }

    this.showProcessingModal(true, 'Preparing digital stamps...');
    this.updateProgress(15, 'Rendering high-resolution stamp matrices...');

    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;

      this.updateProgress(35, 'Encoding vector stamp assets...');

      // Pre-render and embed images for all stamps
      const embeddedStamps = [];
      for (const stamp of this.stamps) {
        let pngDataUrl = '';
        let aspect = 360 / 125;

        if (stamp.type === 'preset' || stamp.type === 'text') {
          pngDataUrl = renderStampCanvas({
            title: stamp.text || 'STAMP',
            subtitle: stamp.subtitle,
            color: stamp.color,
            borderStyle: stamp.borderStyle,
            fontFamily: stamp.font,
          });
          aspect = 360 / 125;
        } else if (stamp.type === 'image' && stamp.imageDataUrl) {
          pngDataUrl = stamp.imageDataUrl;
          aspect = (stamp.imageWidth && stamp.imageHeight) ? (stamp.imageWidth / stamp.imageHeight) : 2.0;
        }

        // Convert dataUrl to bytes
        const base64Data = pngDataUrl.split(',')[1];
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let j = 0; j < binaryStr.length; j++) {
          bytes[j] = binaryStr.charCodeAt(j);
        }

        let embeddedImage;
        if (pngDataUrl.startsWith('data:image/jpeg') || pngDataUrl.startsWith('data:image/jpg')) {
          embeddedImage = await pdfDoc.embedJpg(bytes);
        } else {
          embeddedImage = await pdfDoc.embedPng(bytes);
        }

        embeddedStamps.push({
          stamp,
          embeddedImage,
          aspect,
        });
      }

      this.updateProgress(60, 'Stamping PDF pages...');

      // Iterate through pages and embed stamps
      for (let pIdx = 0; pIdx < totalPages; pIdx++) {
        const pageNum = pIdx + 1;
        const page = pages[pIdx];
        const { width: pWidth, height: pHeight } = page.getSize();

        for (const item of embeddedStamps) {
          const { stamp, embeddedImage, aspect } = item;

          // Check page eligibility
          let applies = true;
          if (stamp.pageRangeMode === 'specific') {
            const validPages = parsePageRange(stamp.specificPages, totalPages);
            applies = validPages.includes(pageNum);
          }
          if (!applies) continue;

          // Calculate dimensions relative to page
          const baseW = pWidth * 0.38;
          const stampW = baseW * (stamp.sizePercent / 100);
          const stampH = stampW / aspect;

          // Target center point in PDF coordinate space (where (0,0) is bottom-left)
          const cx = (stamp.customXPercent / 100) * pWidth;
          // In PDF, Y goes from bottom (0) to top (height)
          const cy = pHeight - ((stamp.customYPercent / 100) * pHeight);

          // Calculate rotation in radians (counter-clockwise in pdf-lib)
          // Since screen coordinates have Y going down and PDF has Y going up:
          // A clockwise screen rotation (+deg) translates to (-deg) in PDF
          const rotDeg = -stamp.rotationDeg;
          const theta = (rotDeg * Math.PI) / 180;

          // Bottom-left anchor formula for rotating around center (cx, cy):
          const drawX = cx - (stampW / 2) * Math.cos(theta) + (stampH / 2) * Math.sin(theta);
          const drawY = cy - (stampW / 2) * Math.sin(theta) - (stampH / 2) * Math.cos(theta);

          page.drawImage(embeddedImage, {
            x: drawX,
            y: drawY,
            width: stampW,
            height: stampH,
            rotate: degrees(rotDeg),
            opacity: stamp.opacityPercent / 100,
          });
        }

        const pct = 60 + Math.round(((pIdx + 1) / totalPages) * 30);
        this.updateProgress(pct, `Stamped page ${pIdx + 1} of ${totalPages}...`);
      }

      this.updateProgress(95, 'Finalizing PDF output...');
      const savedBytes = await pdfDoc.save();

      this.stampedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.stampedUrl) URL.revokeObjectURL(this.stampedUrl);
      this.stampedUrl = URL.createObjectURL(this.stampedBlob);

      this.updateProgress(100, 'Done!');

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection();
      }, 300);
    } catch (err) {
      console.error('Stamping error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to stamp PDF: ${err.message}`, 'error');
    }
  }

  showDownloadSection() {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSuccessMsg && this.currentFile) {
      this.resultSuccessMsg.textContent = `✅ Stamp added to "${this.currentFile.name}"!`;
    }

    if (this.resultFileBadge && this.stampedBlob) {
      const origSize = this.currentFile ? formatBytes(this.currentFile.size) : '0 B';
      const newSize = formatBytes(this.stampedBlob.size);
      this.resultFileBadge.textContent = `${origSize} → ${newSize} • ${this.totalPages} pages`;
    }

    this.showToast('✅ PDF stamped successfully!', 'success');
  }

  downloadStampedPdf() {
    if (!this.stampedBlob || !this.stampedUrl) return;

    const baseName = this.currentFile
      ? this.currentFile.name.replace(/\.[^/.]+$/, '')
      : 'document';
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_stamped_${timestamp}.pdf`;

    const a = document.createElement('a');
    a.href = this.stampedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetAll() {
    if (this.stampedUrl) URL.revokeObjectURL(this.stampedUrl);
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.stampedBlob = null;
    this.stampedUrl = null;

    this.stamps = [this.createDefaultStamp('approved')];
    this.activeStampIndex = 0;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    this.renderStampTabs();
    this.updateControlsFromActiveStamp();
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  showProcessingModal(show, text = 'Processing...') {
    if (!this.processingModal) return;
    this.processingModal.classList.toggle('hidden', !show);
    if (this.progressText && text) this.progressText.textContent = text;
    if (show) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }

  updateProgress(pct, text) {
    if (this.progressFill) this.progressFill.style.width = `${pct}%`;
    if (this.progressPct) this.progressPct.textContent = `${pct}%`;
    if (this.progressText && text) this.progressText.textContent = text;
  }

  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    let iconClass = 'text-blue-500';
    let iconName = 'info';
    if (type === 'success') {
      iconClass = 'text-emerald-500';
      iconName = 'check-circle';
    } else if (type === 'warning') {
      iconClass = 'text-amber-500';
      iconName = 'alert-triangle';
    } else if (type === 'error') {
      iconClass = 'text-rose-500';
      iconName = 'alert-circle';
    }

    toast.className =
      'pointer-events-auto px-4 py-3 rounded-2xl bg-neutral-900/95 dark:bg-white/95 text-white dark:text-neutral-900 text-xs font-semibold shadow-xl backdrop-blur-md flex items-center gap-2.5 transition-all transform duration-200 translate-y-4 opacity-0 border border-neutral-800 dark:border-neutral-200 max-w-sm';
    toast.innerHTML = `
      <i data-lucide="${iconName}" class="w-4 h-4 ${iconClass} shrink-0"></i>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

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
// Initialize App
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.stampPdfApp = new StampPdfApp();
});
