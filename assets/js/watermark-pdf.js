/**
 * ToolStacker Watermark PDF Tool
 * 100% Client-Side • Text & Image Watermarks • Dual Mode • Real-Time Preview
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

function hexToRgb(hex) {
  let c = hex.replace(/^#/, '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}

class WatermarkPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.currentViewport = null;
    this.previewScale = 1.0;

    // Active Watermark State
    this.mode = 'text'; // 'text' | 'image'
    
    // Text watermark settings
    this.textSettings = {
      text: 'CONFIDENTIAL',
      font: 'Helvetica-Bold', // 'Helvetica', 'Helvetica-Bold', 'Times-Roman', 'Courier', 'Courier-Bold'
      size: 48,
      color: '#dc2626',
      opacity: 0.35,
      rotation: 45,
      position: 'center', // 3x3: top-left, top-center, top-right, middle-left, center, middle-right, bottom-left, bottom-center, bottom-right
      layer: 'above' // 'above' | 'below'
    };

    // Image watermark settings
    this.imageSettings = {
      file: null,
      dataUrl: null,
      width: 0,
      height: 0,
      scale: 1.0, // 0.2 to 2.0
      opacity: 0.40,
      rotation: 0,
      position: 'center',
      layer: 'above'
    };

    // Page range settings
    this.pageRangeMode = 'all'; // 'all' | 'specific'
    this.specificPagesInput = '';

    // Multiple watermarks list
    this.watermarks = [
      {
        id: 'wm_' + Date.now(),
        type: 'text',
        name: 'Watermark 1',
        ...JSON.parse(JSON.stringify(this.textSettings))
      }
    ];
    this.activeWatermarkIndex = 0;

    // Result PDF Blob
    this.watermarkedBlob = null;
    this.watermarkedUrl = null;

    this.cacheDom();
    this.bindEvents();
    this.updateControlsFromState();
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Workspace & Overview
    this.workspace = document.getElementById('workspace');
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.resetBtn = document.getElementById('reset-btn');

    // Mode Tabs
    this.tabText = document.getElementById('tab-text');
    this.tabImage = document.getElementById('tab-image');
    this.panelText = document.getElementById('panel-text');
    this.panelImage = document.getElementById('panel-image');

    // Text Mode Controls
    this.textInput = document.getElementById('text-input');
    this.fontSelect = document.getElementById('font-select');
    this.textSizeSlider = document.getElementById('text-size-slider');
    this.textSizeVal = document.getElementById('text-size-val');
    this.textColorPicker = document.getElementById('text-color-picker');
    this.textColorHex = document.getElementById('text-color-hex');
    this.textOpacitySlider = document.getElementById('text-opacity-slider');
    this.textOpacityVal = document.getElementById('text-opacity-val');
    this.textAngleSlider = document.getElementById('text-angle-slider');
    this.textAngleVal = document.getElementById('text-angle-val');
    this.textAnglePresets = document.querySelectorAll('[data-angle-preset]');
    this.textPresetPills = document.querySelectorAll('[data-text-preset]');

    // Image Mode Controls
    this.imageDropzone = document.getElementById('image-dropzone');
    this.imageFileInput = document.getElementById('image-file-input');
    this.imagePreviewThumb = document.getElementById('image-preview-thumb');
    this.imagePlaceholder = document.getElementById('image-placeholder');
    this.imageSizeSlider = document.getElementById('image-size-slider');
    this.imageSizeVal = document.getElementById('image-size-val');
    this.imageOpacitySlider = document.getElementById('image-opacity-slider');
    this.imageOpacityVal = document.getElementById('image-opacity-val');
    this.imageAngleSlider = document.getElementById('image-angle-slider');
    this.imageAngleVal = document.getElementById('image-angle-val');

    // 3x3 Position Grid buttons
    this.positionButtons = document.querySelectorAll('[data-pos]');

    // Page Range Controls
    this.rangeAllRadio = document.getElementById('range-all');
    this.rangeSpecificRadio = document.getElementById('range-specific');
    this.specificPagesContainer = document.getElementById('specific-pages-container');
    this.specificPagesInputEl = document.getElementById('specific-pages-input');
    this.rangeHint = document.getElementById('range-hint');

    // Preview Canvas & Watermark Overlay
    this.previewContainer = document.getElementById('preview-container');
    this.pdfCanvas = document.getElementById('pdf-canvas');
    this.watermarkOverlay = document.getElementById('watermark-overlay');
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.boundsWarning = document.getElementById('bounds-warning');

    // Watermark List Management
    this.watermarksListContainer = document.getElementById('watermarks-list');
    this.addWatermarkBtn = document.getElementById('add-watermark-btn');

    // Action Buttons
    this.applyWatermarkBtn = document.getElementById('apply-watermark-btn');
    this.stickyApplyBtn = document.getElementById('sticky-apply-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download / Result Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSizeBadge = document.getElementById('result-size-badge');
    this.watermarkAnotherBtn = document.getElementById('watermark-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('wm-progress-fill');
    this.progressPct = document.getElementById('wm-progress-pct');
    this.progressText = document.getElementById('wm-progress-text');
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

      ['dragenter', 'dragover'].forEach(name => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
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
    this.watermarkAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Mode Switch Tabs
    this.tabText?.addEventListener('click', () => this.switchMode('text'));
    this.tabImage?.addEventListener('click', () => this.switchMode('image'));

    // Text Mode Inputs
    this.textInput?.addEventListener('input', () => {
      this.getActiveWatermark().text = this.textInput.value;
      this.renderLiveWatermarkPreview();
    });

    this.fontSelect?.addEventListener('change', () => {
      this.getActiveWatermark().font = this.fontSelect.value;
      this.renderLiveWatermarkPreview();
    });

    this.textSizeSlider?.addEventListener('input', () => {
      const val = parseInt(this.textSizeSlider.value, 10);
      this.getActiveWatermark().size = val;
      if (this.textSizeVal) this.textSizeVal.textContent = `${val} pt`;
      this.renderLiveWatermarkPreview();
    });

    this.textColorPicker?.addEventListener('input', () => {
      const val = this.textColorPicker.value;
      this.getActiveWatermark().color = val;
      if (this.textColorHex) this.textColorHex.value = val;
      this.renderLiveWatermarkPreview();
    });

    this.textColorHex?.addEventListener('change', () => {
      let val = this.textColorHex.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        this.getActiveWatermark().color = val;
        if (this.textColorPicker) this.textColorPicker.value = val;
        this.renderLiveWatermarkPreview();
      }
    });

    this.textOpacitySlider?.addEventListener('input', () => {
      const val = parseInt(this.textOpacitySlider.value, 10);
      this.getActiveWatermark().opacity = val / 100;
      if (this.textOpacityVal) this.textOpacityVal.textContent = `${val}%`;
      this.renderLiveWatermarkPreview();
    });

    this.textAngleSlider?.addEventListener('input', () => {
      const val = parseInt(this.textAngleSlider.value, 10);
      this.getActiveWatermark().rotation = val;
      if (this.textAngleVal) this.textAngleVal.textContent = `${val}°`;
      this.renderLiveWatermarkPreview();
    });

    this.textAnglePresets?.forEach(btn => {
      btn.addEventListener('click', () => {
        const angle = parseInt(btn.dataset.anglePreset, 10);
        this.getActiveWatermark().rotation = angle;
        if (this.textAngleSlider) this.textAngleSlider.value = angle;
        if (this.textAngleVal) this.textAngleVal.textContent = `${angle}°`;
        this.renderLiveWatermarkPreview();
      });
    });

    this.textPresetPills?.forEach(pill => {
      pill.addEventListener('click', () => {
        const text = pill.dataset.textPreset;
        this.getActiveWatermark().text = text;
        if (this.textInput) this.textInput.value = text;
        this.renderLiveWatermarkPreview();
      });
    });

    // Image Mode Inputs
    if (this.imageDropzone && this.imageFileInput) {
      this.imageDropzone.addEventListener('click', () => this.imageFileInput.click());
      this.imageFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleImageUpload(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    this.imageSizeSlider?.addEventListener('input', () => {
      const val = parseInt(this.imageSizeSlider.value, 10);
      this.getActiveWatermark().scale = val / 100;
      if (this.imageSizeVal) this.imageSizeVal.textContent = `${val}%`;
      this.renderLiveWatermarkPreview();
    });

    this.imageOpacitySlider?.addEventListener('input', () => {
      const val = parseInt(this.imageOpacitySlider.value, 10);
      this.getActiveWatermark().opacity = val / 100;
      if (this.imageOpacityVal) this.imageOpacityVal.textContent = `${val}%`;
      this.renderLiveWatermarkPreview();
    });

    this.imageAngleSlider?.addEventListener('input', () => {
      const val = parseInt(this.imageAngleSlider.value, 10);
      this.getActiveWatermark().rotation = val;
      if (this.imageAngleVal) this.imageAngleVal.textContent = `${val}°`;
      this.renderLiveWatermarkPreview();
    });

    // 3x3 Position Buttons
    this.positionButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const pos = btn.dataset.pos;
        this.getActiveWatermark().position = pos;
        this.updatePositionButtons();
        this.renderLiveWatermarkPreview();
      });
    });

    // Page Range Radios & Input
    this.rangeAllRadio?.addEventListener('change', () => {
      this.pageRangeMode = 'all';
      if (this.specificPagesContainer) this.specificPagesContainer.classList.add('hidden');
      this.updateRangeFeedback();
    });

    this.rangeSpecificRadio?.addEventListener('change', () => {
      this.pageRangeMode = 'specific';
      if (this.specificPagesContainer) this.specificPagesContainer.classList.remove('hidden');
      this.updateRangeFeedback();
    });

    this.specificPagesInputEl?.addEventListener('input', () => {
      this.specificPagesInput = this.specificPagesInputEl.value;
      this.updateRangeFeedback();
    });

    // Page Navigation in Preview
    this.prevPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.currentPageNum--;
        this.renderPdfPagePreview();
      }
    });

    this.nextPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum < this.totalPages) {
        this.currentPageNum++;
        this.renderPdfPagePreview();
      }
    });

    // Multiple Watermark Actions
    this.addWatermarkBtn?.addEventListener('click', () => this.addNewWatermark());

    // Submit / Apply Watermark
    this.applyWatermarkBtn?.addEventListener('click', () => this.executeWatermarkPdf());
    this.stickyApplyBtn?.addEventListener('click', () => this.executeWatermarkPdf());
    this.downloadBtn?.addEventListener('click', () => this.downloadResultPdf());
  }

  getActiveWatermark() {
    if (!this.watermarks[this.activeWatermarkIndex]) {
      this.activeWatermarkIndex = 0;
    }
    return this.watermarks[this.activeWatermarkIndex];
  }

  switchMode(mode) {
    this.mode = mode;
    const isText = mode === 'text';

    const wm = this.getActiveWatermark();
    wm.type = mode;

    this.tabText?.classList.toggle('bg-blue-600', isText);
    this.tabText?.classList.toggle('text-white', isText);
    this.tabText?.classList.toggle('text-neutral-600', !isText);
    this.tabText?.classList.toggle('dark:text-neutral-300', !isText);

    this.tabImage?.classList.toggle('bg-blue-600', !isText);
    this.tabImage?.classList.toggle('text-white', !isText);
    this.tabImage?.classList.toggle('text-neutral-600', isText);
    this.tabImage?.classList.toggle('dark:text-neutral-300', isText);

    this.panelText?.classList.toggle('hidden', !isText);
    this.panelImage?.classList.toggle('hidden', isText);

    this.updateControlsFromState();
    this.renderLiveWatermarkPreview();
    this.renderWatermarksList();
  }

  updateControlsFromState() {
    const wm = this.getActiveWatermark();
    if (!wm) return;

    if (wm.type === 'text') {
      if (this.textInput) this.textInput.value = wm.text || '';
      if (this.fontSelect) this.fontSelect.value = wm.font || 'Helvetica-Bold';
      if (this.textSizeSlider) this.textSizeSlider.value = wm.size || 48;
      if (this.textSizeVal) this.textSizeVal.textContent = `${wm.size || 48} pt`;
      if (this.textColorPicker) this.textColorPicker.value = wm.color || '#dc2626';
      if (this.textColorHex) this.textColorHex.value = wm.color || '#dc2626';
      if (this.textOpacitySlider) this.textOpacitySlider.value = Math.round((wm.opacity ?? 0.35) * 100);
      if (this.textOpacityVal) this.textOpacityVal.textContent = `${Math.round((wm.opacity ?? 0.35) * 100)}%`;
      if (this.textAngleSlider) this.textAngleSlider.value = wm.rotation ?? 45;
      if (this.textAngleVal) this.textAngleVal.textContent = `${wm.rotation ?? 45}°`;
    } else {
      if (this.imageSizeSlider) this.imageSizeSlider.value = Math.round((wm.scale ?? 1.0) * 100);
      if (this.imageSizeVal) this.imageSizeVal.textContent = `${Math.round((wm.scale ?? 1.0) * 100)}%`;
      if (this.imageOpacitySlider) this.imageOpacitySlider.value = Math.round((wm.opacity ?? 0.40) * 100);
      if (this.imageOpacityVal) this.imageOpacityVal.textContent = `${Math.round((wm.opacity ?? 0.40) * 100)}%`;
      if (this.imageAngleSlider) this.imageAngleSlider.value = wm.rotation ?? 0;
      if (this.imageAngleVal) this.imageAngleVal.textContent = `${wm.rotation ?? 0}°`;
      
      if (wm.dataUrl && this.imagePreviewThumb) {
        this.imagePreviewThumb.src = wm.dataUrl;
        this.imagePreviewThumb.classList.remove('hidden');
        this.imagePlaceholder?.classList.add('hidden');
      } else {
        this.imagePreviewThumb?.classList.add('hidden');
        this.imagePlaceholder?.classList.remove('hidden');
      }
    }

    this.updatePositionButtons();
  }

  updatePositionButtons() {
    const wm = this.getActiveWatermark();
    const currentPos = wm ? wm.position : 'center';

    this.positionButtons?.forEach(btn => {
      const match = btn.dataset.pos === currentPos;
      btn.classList.toggle('bg-blue-600', match);
      btn.classList.toggle('text-white', match);
      btn.classList.toggle('border-blue-600', match);
      btn.classList.toggle('bg-white', !match);
      btn.classList.toggle('dark:bg-neutral-800', !match);
      btn.classList.toggle('border-neutral-200', !match);
      btn.classList.toggle('dark:border-neutral-700', !match);
      btn.classList.toggle('text-neutral-700', !match);
      btn.classList.toggle('dark:text-neutral-300', !match);
    });
  }

  // -------------------------------------------------------------
  // File Loading & PDF.js Rendering
  // -------------------------------------------------------------
  async loadPdfFile(file) {
    if (!file) return;

    if (file.size === 0) {
      this.showToast('Selected file is empty (0 bytes).', 'error');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      this.showToast('File exceeds maximum size limit of 200MB.', 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document.', 'error');
      return;
    }

    this.showProcessingModal(true, 'Reading PDF structure...');

    try {
      this.currentFile = file;
      this.pdfBytes = await file.arrayBuffer();

      const loadingTask = window.pdfjsLib.getDocument({ data: this.pdfBytes.slice(0) });
      this.pdfDocProxy = await loadingTask.promise;
      this.totalPages = this.pdfDocProxy.numPages;
      this.currentPageNum = 1;

      if (this.docName) this.docName.textContent = file.name;
      if (this.docDetails) {
        this.docDetails.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      this.updateRangeFeedback();
      this.renderWatermarksList();
      await this.renderPdfPagePreview();

      this.showToast(`Loaded "${file.name}" with ${this.totalPages} pages.`, 'info');
    } catch (err) {
      console.error('PDF load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to open PDF: ${err.message}`, 'error');
    }
  }

  async renderPdfPagePreview() {
    if (!this.pdfDocProxy || !this.pdfCanvas) return;

    try {
      const page = await this.pdfDocProxy.getPage(this.currentPageNum);
      
      // Determine viewport scale to fit preview container comfortably (max width ~560px)
      const containerWidth = this.previewContainer?.clientWidth || 500;
      const unscaledVp = page.getViewport({ scale: 1.0 });
      const targetScale = Math.min(1.5, Math.max(0.6, (containerWidth - 32) / unscaledVp.width));
      this.previewScale = targetScale;

      const viewport = page.getViewport({ scale: targetScale });
      this.currentViewport = viewport;

      this.pdfCanvas.width = Math.round(viewport.width);
      this.pdfCanvas.height = Math.round(viewport.height);

      const ctx = this.pdfCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Update page indicator & button states
      if (this.pageIndicator) {
        this.pageIndicator.textContent = `Page ${this.currentPageNum} of ${this.totalPages}`;
      }
      if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPageNum <= 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPageNum >= this.totalPages;

      // Render live watermark overlay on top
      this.renderLiveWatermarkPreview();
    } catch (err) {
      console.error('Page render error:', err);
    }
  }

  renderLiveWatermarkPreview() {
    if (!this.watermarkOverlay || !this.currentViewport) return;

    const overlay = this.watermarkOverlay;
    overlay.innerHTML = '';
    overlay.style.width = `${Math.round(this.currentViewport.width)}px`;
    overlay.style.height = `${Math.round(this.currentViewport.height)}px`;

    const W = this.currentViewport.width;
    const H = this.currentViewport.height;

    let isOutOfBounds = false;

    this.watermarks.forEach((wm) => {
      const itemEl = document.createElement('div');
      itemEl.className = 'absolute pointer-events-none select-none transition-all duration-75';

      // 3x3 Position coordinates in preview
      const margin = 28;
      let targetX = W / 2;
      let targetY = H / 2;

      switch (wm.position) {
        case 'top-left':
          targetX = margin;
          targetY = margin;
          break;
        case 'top-center':
          targetX = W / 2;
          targetY = margin;
          break;
        case 'top-right':
          targetX = W - margin;
          targetY = margin;
          break;
        case 'middle-left':
          targetX = margin;
          targetY = H / 2;
          break;
        case 'center':
          targetX = W / 2;
          targetY = H / 2;
          break;
        case 'middle-right':
          targetX = W - margin;
          targetY = H / 2;
          break;
        case 'bottom-left':
          targetX = margin;
          targetY = H - margin;
          break;
        case 'bottom-center':
          targetX = W / 2;
          targetY = H - margin;
          break;
        case 'bottom-right':
          targetX = W - margin;
          targetY = H - margin;
          break;
      }

      let transformOrigin = 'center center';
      let translate = 'translate(-50%, -50%)';

      if (wm.position.includes('left')) {
        translate = wm.position.includes('top') ? 'translate(0, 0)' : wm.position.includes('bottom') ? 'translate(0, -100%)' : 'translate(0, -50%)';
      } else if (wm.position.includes('right')) {
        translate = wm.position.includes('top') ? 'translate(-100%, 0)' : wm.position.includes('bottom') ? 'translate(-100%, -100%)' : 'translate(-100%, -50%)';
      } else {
        translate = wm.position.includes('top') ? 'translate(-50%, 0)' : wm.position.includes('bottom') ? 'translate(-50%, -100%)' : 'translate(-50%, -50%)';
      }

      itemEl.style.left = `${targetX}px`;
      itemEl.style.top = `${targetY}px`;
      itemEl.style.transform = `${translate} rotate(${wm.rotation || 0}deg)`;
      itemEl.style.transformOrigin = transformOrigin;
      itemEl.style.opacity = `${wm.opacity ?? 0.35}`;

      if (wm.type === 'text') {
        const text = wm.text || '';
        if (!text) return;

        const scaledSize = Math.max(10, Math.round((wm.size || 48) * this.previewScale));
        itemEl.style.fontSize = `${scaledSize}px`;
        itemEl.style.color = wm.color || '#dc2626';
        itemEl.style.fontWeight = wm.font && wm.font.includes('Bold') ? 'bold' : 'normal';
        itemEl.style.fontFamily = wm.font && wm.font.includes('Times') ? 'serif' : wm.font && wm.font.includes('Courier') ? 'monospace' : 'sans-serif';
        itemEl.style.whiteSpace = 'nowrap';
        itemEl.textContent = text;

        // Check if text exceeds bounds
        const approxWidth = text.length * scaledSize * 0.6;
        if (approxWidth > W * 0.95 && wm.position === 'center') {
          isOutOfBounds = true;
        }
      } else if (wm.type === 'image') {
        if (!wm.dataUrl) return;

        const img = document.createElement('img');
        img.src = wm.dataUrl;
        img.alt = 'Watermark';
        const baseW = wm.width || 120;
        const scale = (wm.scale ?? 1.0) * this.previewScale;
        img.style.width = `${Math.round(baseW * scale)}px`;
        img.style.height = 'auto';
        img.style.maxWidth = 'none';
        itemEl.appendChild(img);

        if (baseW * scale > W * 0.95) {
          isOutOfBounds = true;
        }
      }

      overlay.appendChild(itemEl);
    });

    if (this.boundsWarning) {
      this.boundsWarning.classList.toggle('hidden', !isOutOfBounds);
    }
  }

  // -------------------------------------------------------------
  // Image Upload Handling
  // -------------------------------------------------------------
  handleImageUpload(file) {
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      this.showToast('Large images may slow down processing.', 'warning');
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        const wm = this.getActiveWatermark();
        wm.type = 'image';
        wm.dataUrl = dataUrl;
        wm.width = img.naturalWidth || 200;
        wm.height = img.naturalHeight || 200;
        wm.file = file;

        if (this.imagePreviewThumb) {
          this.imagePreviewThumb.src = dataUrl;
          this.imagePreviewThumb.classList.remove('hidden');
          this.imagePlaceholder?.classList.add('hidden');
        }

        this.renderLiveWatermarkPreview();
        this.renderWatermarksList();
        this.showToast('Watermark image loaded!', 'success');
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  // -------------------------------------------------------------
  // Watermarks List Management
  // -------------------------------------------------------------
  addNewWatermark() {
    const newId = 'wm_' + Date.now();
    const newWm = {
      id: newId,
      type: this.mode,
      name: `Watermark ${this.watermarks.length + 1}`,
      ...(this.mode === 'text' ? JSON.parse(JSON.stringify(this.textSettings)) : JSON.parse(JSON.stringify(this.imageSettings)))
    };
    this.watermarks.push(newWm);
    this.activeWatermarkIndex = this.watermarks.length - 1;
    this.renderWatermarksList();
    this.updateControlsFromState();
    this.renderLiveWatermarkPreview();
    this.showToast('New watermark layer added!', 'info');
  }

  renderWatermarksList() {
    if (!this.watermarksListContainer) return;
    this.watermarksListContainer.innerHTML = '';

    this.watermarks.forEach((wm, idx) => {
      const isActive = idx === this.activeWatermarkIndex;
      const card = document.createElement('div');
      card.className = `flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
        isActive
          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500 shadow-xs'
          : 'bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
      }`;

      card.addEventListener('click', () => {
        this.activeWatermarkIndex = idx;
        this.switchMode(wm.type);
      });

      const iconName = wm.type === 'text' ? 'type' : 'image';
      const label = wm.type === 'text' ? (wm.text || 'Text Watermark') : 'Image Watermark';

      card.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
          <div class="w-8 h-8 rounded-xl ${
            isActive ? 'bg-blue-600 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          } flex items-center justify-center shrink-0">
            <i data-lucide="${iconName}" class="w-4 h-4"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">${wm.name || `Layer ${idx + 1}`}</p>
            <p class="text-[10px] text-neutral-500 truncate">${label} • ${wm.position}</p>
          </div>
        </div>

        <div class="flex items-center gap-1">
          ${
            this.watermarks.length > 1
              ? `
            <button type="button" class="remove-wm-btn p-1.5 text-neutral-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors" title="Delete watermark layer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          `
              : ''
          }
        </div>
      `;

      const removeBtn = card.querySelector('.remove-wm-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.removeWatermark(idx);
        });
      }

      this.watermarksListContainer.appendChild(card);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  removeWatermark(index) {
    if (this.watermarks.length <= 1) return;
    this.watermarks.splice(index, 1);
    if (this.activeWatermarkIndex >= this.watermarks.length) {
      this.activeWatermarkIndex = this.watermarks.length - 1;
    }
    this.renderWatermarksList();
    this.updateControlsFromState();
    this.renderLiveWatermarkPreview();
    this.showToast('Watermark layer removed.', 'info');
  }

  // -------------------------------------------------------------
  // Page Range Evaluation
  // -------------------------------------------------------------
  parseTargetPageNumbers() {
    if (!this.totalPages) return [];
    if (this.pageRangeMode === 'all') {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }

    const input = (this.specificPagesInput || '').trim();
    if (!input) return [];

    const pages = new Set();
    const parts = input.split(/[,;\s]+/);

    parts.forEach(part => {
      part = part.trim().toLowerCase();
      if (!part) return;

      if (part === 'even') {
        for (let i = 2; i <= this.totalPages; i += 2) pages.add(i);
      } else if (part === 'odd') {
        for (let i = 1; i <= this.totalPages; i += 2) pages.add(i);
      } else if (part.includes('-')) {
        const [startStr, endStr] = part.split('-');
        const s = parseInt(startStr, 10);
        const e = parseInt(endStr, 10);
        if (!isNaN(s) && !isNaN(e)) {
          const from = Math.max(1, Math.min(s, e));
          const to = Math.min(this.totalPages, Math.max(s, e));
          for (let i = from; i <= to; i++) pages.add(i);
        }
      } else {
        const p = parseInt(part, 10);
        if (!isNaN(p) && p >= 1 && p <= this.totalPages) {
          pages.add(p);
        }
      }
    });

    return Array.from(pages).sort((a, b) => a - b);
  }

  updateRangeFeedback() {
    if (!this.rangeHint || !this.totalPages) return;
    if (this.pageRangeMode === 'all') {
      this.rangeHint.textContent = `Watermark will be added to all ${this.totalPages} pages.`;
      this.rangeHint.className = 'text-[11px] text-neutral-500';
    } else {
      const targeted = this.parseTargetPageNumbers();
      if (targeted.length === 0) {
        this.rangeHint.textContent = 'No pages selected. e.g. "1, 3, 5-7"';
        this.rangeHint.className = 'text-[11px] text-amber-500 font-semibold';
      } else {
        this.rangeHint.textContent = `Targeting ${targeted.length} of ${this.totalPages} pages (${targeted.join(', ')}).`;
        this.rangeHint.className = 'text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold';
      }
    }
  }

  // -------------------------------------------------------------
  // Execution: Embed Watermark with pdf-lib
  // -------------------------------------------------------------
  async executeWatermarkPdf() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    // Validation checks
    for (const wm of this.watermarks) {
      if (wm.type === 'text' && (!wm.text || !wm.text.trim())) {
        this.showToast('Please enter watermark text.', 'warning');
        return;
      }
      if (wm.type === 'image' && !wm.dataUrl) {
        this.showToast('Please upload an image for the image watermark.', 'warning');
        return;
      }
    }

    const targetedPages = this.parseTargetPageNumbers();
    if (targetedPages.length === 0) {
      this.showToast('Please specify valid page numbers to watermark.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Loading PDF for watermarking...');

    try {
      const { PDFDocument, rgb, degrees, StandardFonts } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this.pdfBytes);

      // Cache embedded fonts and images
      const fontCache = {};
      const imageCache = {};

      // Embed fonts
      for (const wm of this.watermarks) {
        if (wm.type === 'text') {
          let standardFontKey = StandardFonts.HelveticaBold;
          if (wm.font === 'Helvetica') standardFontKey = StandardFonts.Helvetica;
          if (wm.font === 'Times-Roman') standardFontKey = StandardFonts.TimesRoman;
          if (wm.font === 'Courier') standardFontKey = StandardFonts.Courier;
          if (wm.font === 'Courier-Bold') standardFontKey = StandardFonts.CourierBold;

          if (!fontCache[standardFontKey]) {
            fontCache[standardFontKey] = await pdfDoc.embedFont(standardFontKey);
          }
        } else if (wm.type === 'image' && wm.dataUrl) {
          if (!imageCache[wm.id]) {
            let imgBytes = await fetch(wm.dataUrl).then(r => r.arrayBuffer());
            if (wm.dataUrl.startsWith('data:image/jpeg') || wm.dataUrl.startsWith('data:image/jpg')) {
              imageCache[wm.id] = await pdfDoc.embedJpg(imgBytes);
            } else {
              // Convert non-PNG or SVG data to PNG via canvas if necessary
              if (!wm.dataUrl.startsWith('data:image/png')) {
                const canvas = document.createElement('canvas');
                const img = new Image();
                await new Promise((res) => {
                  img.onload = res;
                  img.src = wm.dataUrl;
                });
                canvas.width = img.width || 200;
                canvas.height = img.height || 200;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                const pngDataUrl = canvas.toDataURL('image/png');
                imgBytes = await fetch(pngDataUrl).then(r => r.arrayBuffer());
              }
              imageCache[wm.id] = await pdfDoc.embedPng(imgBytes);
            }
          }
        }
      }

      const pages = pdfDoc.getPages();
      const totalToProcess = targetedPages.length;

      for (let i = 0; i < totalToProcess; i++) {
        const pageIdx = targetedPages[i] - 1;
        const page = pages[pageIdx];
        if (!page) continue;

        const pct = Math.round(((i + 1) / totalToProcess) * 100);
        this.updateProgress(pct, `Applying watermark to page ${targetedPages[i]} of ${this.totalPages}...`);

        const { width: pageW, height: pageH } = page.getSize();

        // Process all watermark layers
        for (const wm of this.watermarks) {
          const rotationAngle = wm.rotation || 0;
          const opacity = wm.opacity ?? 0.35;

          if (wm.type === 'text') {
            let standardFontKey = StandardFonts.HelveticaBold;
            if (wm.font === 'Helvetica') standardFontKey = StandardFonts.Helvetica;
            if (wm.font === 'Times-Roman') standardFontKey = StandardFonts.TimesRoman;
            if (wm.font === 'Courier') standardFontKey = StandardFonts.Courier;
            if (wm.font === 'Courier-Bold') standardFontKey = StandardFonts.CourierBold;

            const font = fontCache[standardFontKey];
            const size = wm.size || 48;
            const text = wm.text || '';
            const colorRgb = hexToRgb(wm.color || '#dc2626');

            const textWidth = font.widthOfTextAtSize(text, size);
            const textHeight = font.heightAtSize(size);

            // Calculate x, y in PDF coordinates (origin at bottom-left)
            const margin = 40;
            let centerX = pageW / 2;
            let centerY = pageH / 2;

            switch (wm.position) {
              case 'top-left':
                centerX = margin + textWidth / 2;
                centerY = pageH - margin - textHeight / 2;
                break;
              case 'top-center':
                centerX = pageW / 2;
                centerY = pageH - margin - textHeight / 2;
                break;
              case 'top-right':
                centerX = pageW - margin - textWidth / 2;
                centerY = pageH - margin - textHeight / 2;
                break;
              case 'middle-left':
                centerX = margin + textWidth / 2;
                centerY = pageH / 2;
                break;
              case 'center':
                centerX = pageW / 2;
                centerY = pageH / 2;
                break;
              case 'middle-right':
                centerX = pageW - margin - textWidth / 2;
                centerY = pageH / 2;
                break;
              case 'bottom-left':
                centerX = margin + textWidth / 2;
                centerY = margin + textHeight / 2;
                break;
              case 'bottom-center':
                centerX = pageW / 2;
                centerY = margin + textHeight / 2;
                break;
              case 'bottom-right':
                centerX = pageW - margin - textWidth / 2;
                centerY = margin + textHeight / 2;
                break;
            }

            // Adjust for rotation around text center
            const rad = (rotationAngle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            // Center of text box before rotation is at (w/2, h/2)
            const halfW = textWidth / 2;
            const halfH = textHeight / 2;
            const drawX = centerX - (halfW * cos - halfH * sin);
            const drawY = centerY - (halfW * sin + halfH * cos);

            page.drawText(text, {
              x: drawX,
              y: drawY,
              size,
              font,
              color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
              opacity,
              rotate: degrees(rotationAngle)
            });
          } else if (wm.type === 'image') {
            const embeddedImg = imageCache[wm.id];
            if (!embeddedImg) continue;

            const scale = (wm.scale ?? 1.0) * 0.5; // standard scaling factor
            const imgW = embeddedImg.width * scale;
            const imgH = embeddedImg.height * scale;

            const margin = 40;
            let centerX = pageW / 2;
            let centerY = pageH / 2;

            switch (wm.position) {
              case 'top-left':
                centerX = margin + imgW / 2;
                centerY = pageH - margin - imgH / 2;
                break;
              case 'top-center':
                centerX = pageW / 2;
                centerY = pageH - margin - imgH / 2;
                break;
              case 'top-right':
                centerX = pageW - margin - imgW / 2;
                centerY = pageH - margin - imgH / 2;
                break;
              case 'middle-left':
                centerX = margin + imgW / 2;
                centerY = pageH / 2;
                break;
              case 'center':
                centerX = pageW / 2;
                centerY = pageH / 2;
                break;
              case 'middle-right':
                centerX = pageW - margin - imgW / 2;
                centerY = pageH / 2;
                break;
              case 'bottom-left':
                centerX = margin + imgW / 2;
                centerY = margin + imgH / 2;
                break;
              case 'bottom-center':
                centerX = pageW / 2;
                centerY = margin + imgH / 2;
                break;
              case 'bottom-right':
                centerX = pageW - margin - imgW / 2;
                centerY = margin + imgH / 2;
                break;
            }

            const rad = (rotationAngle * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            const halfW = imgW / 2;
            const halfH = imgH / 2;
            const drawX = centerX - (halfW * cos - halfH * sin);
            const drawY = centerY - (halfW * sin + halfH * cos);

            page.drawImage(embeddedImg, {
              x: drawX,
              y: drawY,
              width: imgW,
              height: imgH,
              opacity,
              rotate: degrees(rotationAngle)
            });
          }
        }
      }

      this.updateProgress(100, 'Finalizing watermarked PDF...');
      const savedBytes = await pdfDoc.save();

      this.watermarkedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.watermarkedUrl) URL.revokeObjectURL(this.watermarkedUrl);
      this.watermarkedUrl = URL.createObjectURL(this.watermarkedBlob);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection();
      }, 350);
    } catch (err) {
      console.error('Watermark generation error:', err);
      this.showProcessingModal(false);
      this.showToast(`Watermarking failed: ${err.message}`, 'error');
    }
  }

  showDownloadSection() {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSizeBadge && this.watermarkedBlob) {
      this.resultSizeBadge.textContent = formatBytes(this.watermarkedBlob.size);
    }

    this.showToast('✅ PDF successfully watermarked!', 'success');
  }

  downloadResultPdf() {
    if (!this.watermarkedBlob || !this.watermarkedUrl) return;

    const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const filename = `${baseName}_watermarked.pdf`;

    const a = document.createElement('a');
    a.href = this.watermarkedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetAll() {
    if (this.watermarkedUrl) URL.revokeObjectURL(this.watermarkedUrl);
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.watermarkedBlob = null;
    this.watermarkedUrl = null;
    this.totalPages = 0;
    this.currentPageNum = 1;

    this.watermarks = [
      {
        id: 'wm_' + Date.now(),
        type: 'text',
        name: 'Watermark 1',
        ...JSON.parse(JSON.stringify(this.textSettings))
      }
    ];
    this.activeWatermarkIndex = 0;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    this.updateControlsFromState();
  }

  // -------------------------------------------------------------
  // UI Helpers (Modal, Toast, Progress)
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
  window.watermarkPdfApp = new WatermarkPdfApp();
});
