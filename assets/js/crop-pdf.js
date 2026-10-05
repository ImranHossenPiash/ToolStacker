/**
 * ToolStacker Crop PDF Tool
 * 100% Client-Side • Visual Interactive Crop Box • Touch & Mouse Handles • Undo/Redo
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

class CropPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;

    // Canvas & Viewport
    this.pageViewport = null;
    this.canvasWidth = 0;
    this.canvasHeight = 0;

    // Crop box coordinates relative to canvas (top-left origin)
    // x, y, width, height (in pixels on the preview canvas)
    this.cropBox = { x: 0, y: 0, width: 0, height: 0 };

    // Active dragging interaction state
    this.isDragging = false;
    this.dragAction = null; // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
    this.dragStartX = 0;
    this.dragStartY = 0;
    this.initialCropBox = null;

    // Undo / Redo history stacks
    this.history = [];
    this.historyIndex = -1;

    // Page range setting: 'all' | 'specific'
    this.pageRangeMode = 'all';
    this.specificPagesInput = '';

    // Active aspect ratio preset: 'free' | 'a4' | 'letter' | 'square' | '16-9'
    this.activePreset = 'free';

    // Result PDF
    this.croppedBlob = null;
    this.croppedUrl = null;

    this.cacheDom();
    this.bindEvents();
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

    // Page Navigator
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');

    // Preview Elements
    this.previewWrapper = document.getElementById('preview-wrapper');
    this.pdfCanvas = document.getElementById('pdf-canvas');
    this.cropOverlay = document.getElementById('crop-overlay');
    this.cropBoxEl = document.getElementById('crop-box');

    // Dimensions Indicators & Inputs
    this.cropDimText = document.getElementById('crop-dim-text');
    this.inputCropWidth = document.getElementById('input-crop-width');
    this.inputCropHeight = document.getElementById('input-crop-height');

    // Preset Ratio Buttons
    this.presetButtons = document.querySelectorAll('[data-preset]');

    // Margin Removal Preset Buttons
    this.marginButtons = document.querySelectorAll('[data-margin]');

    // Undo / Redo / Reset Crop
    this.undoBtn = document.getElementById('undo-btn');
    this.redoBtn = document.getElementById('redo-btn');
    this.resetCropBtn = document.getElementById('reset-crop-btn');

    // Page Range Controls
    this.rangeAllRadio = document.getElementById('range-all');
    this.rangeSpecificRadio = document.getElementById('range-specific');
    this.specificPagesContainer = document.getElementById('specific-pages-container');
    this.specificPagesInputEl = document.getElementById('specific-pages-input');
    this.rangeHint = document.getElementById('range-hint');

    // Action Buttons
    this.applyCropBtn = document.getElementById('apply-crop-btn');
    this.stickyApplyBtn = document.getElementById('sticky-apply-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSizeBadge = document.getElementById('result-size-badge');
    this.cropAnotherBtn = document.getElementById('crop-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('crop-progress-fill');
    this.progressPct = document.getElementById('crop-progress-pct');
    this.progressText = document.getElementById('crop-progress-text');
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
    this.cropAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Page navigation
    this.prevPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.currentPageNum--;
        this.renderCurrentPage();
      }
    });

    this.nextPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum < this.totalPages) {
        this.currentPageNum++;
        this.renderCurrentPage();
      }
    });

    // Preset Ratio Buttons
    this.presetButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        this.applyRatioPreset(preset);
      });
    });

    // Margin Removal Buttons (10mm, 20mm, 30mm)
    this.marginButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        const mm = parseInt(btn.dataset.margin, 10);
        this.applyMarginRemoval(mm);
      });
    });

    // Manual Dimensions Input
    this.inputCropWidth?.addEventListener('change', () => {
      const val = parseInt(this.inputCropWidth.value, 10);
      if (!isNaN(val) && val >= 50 && val <= this.canvasWidth - this.cropBox.x) {
        this.cropBox.width = val;
        this.pushHistory();
        this.updateCropBoxDOM();
      }
    });

    this.inputCropHeight?.addEventListener('change', () => {
      const val = parseInt(this.inputCropHeight.value, 10);
      if (!isNaN(val) && val >= 50 && val <= this.canvasHeight - this.cropBox.y) {
        this.cropBox.height = val;
        this.pushHistory();
        this.updateCropBoxDOM();
      }
    });

    // Undo / Redo / Reset
    this.undoBtn?.addEventListener('click', () => this.undo());
    this.redoBtn?.addEventListener('click', () => this.redo());
    this.resetCropBtn?.addEventListener('click', () => this.resetCropToFull());

    // Page Range Radios
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

    // Actions
    this.applyCropBtn?.addEventListener('click', () => this.executeCropPdf());
    this.stickyApplyBtn?.addEventListener('click', () => this.executeCropPdf());
    this.downloadBtn?.addEventListener('click', () => this.downloadCroppedPdf());

    // Interactive Dragging on Crop Box & Handles
    this.initCropInteractions();
  }

  // -------------------------------------------------------------
  // PDF Loading & Rendering
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

    this.showProcessingModal(true, 'Reading PDF document...');

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
      await this.renderCurrentPage(true);

      this.showToast(`Loaded "${file.name}". Drag the handles to set your crop area.`, 'info');
    } catch (err) {
      console.error('PDF load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to open PDF: ${err.message}`, 'error');
    }
  }

  async renderCurrentPage(isInitial = false) {
    if (!this.pdfDocProxy || !this.pdfCanvas) return;

    try {
      const page = await this.pdfDocProxy.getPage(this.currentPageNum);
      const containerWidth = this.previewWrapper?.clientWidth || 550;
      const unscaledVp = page.getViewport({ scale: 1.0 });

      // Determine scale to fit container comfortably (max width ~560px)
      const scale = Math.min(1.4, Math.max(0.5, (containerWidth - 32) / unscaledVp.width));
      const viewport = page.getViewport({ scale });
      this.pageViewport = viewport;

      this.canvasWidth = Math.round(viewport.width);
      this.canvasHeight = Math.round(viewport.height);

      this.pdfCanvas.width = this.canvasWidth;
      this.pdfCanvas.height = this.canvasHeight;

      const ctx = this.pdfCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      // Update Page Navigation DOM
      if (this.pageIndicator) {
        this.pageIndicator.textContent = `Page ${this.currentPageNum} of ${this.totalPages}`;
      }
      if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPageNum <= 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPageNum >= this.totalPages;

      // Sync overlay dimensions with canvas
      if (this.cropOverlay) {
        this.cropOverlay.style.width = `${this.canvasWidth}px`;
        this.cropOverlay.style.height = `${this.canvasHeight}px`;
      }

      if (isInitial || this.cropBox.width === 0) {
        // Default crop box: inset 20px on all sides
        const inset = Math.round(Math.min(this.canvasWidth, this.canvasHeight) * 0.08);
        this.cropBox = {
          x: inset,
          y: inset,
          width: this.canvasWidth - inset * 2,
          height: this.canvasHeight - inset * 2
        };
        this.history = [];
        this.historyIndex = -1;
        this.pushHistory();
      }

      this.updateCropBoxDOM();
    } catch (err) {
      console.error('Page render error:', err);
    }
  }

  // -------------------------------------------------------------
  // Crop Box Dragging & Resizing Interactions
  // -------------------------------------------------------------
  initCropInteractions() {
    if (!this.cropBoxEl) return;

    const onPointerDown = (e) => {
      // Support mouse or touch event
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const target = e.target;
      const handle = target.dataset.handle;

      if (handle) {
        this.dragAction = handle;
      } else if (target === this.cropBoxEl || this.cropBoxEl.contains(target)) {
        this.dragAction = 'move';
      } else {
        return;
      }

      e.preventDefault();
      this.isDragging = true;
      this.dragStartX = clientX;
      this.dragStartY = clientY;
      this.initialCropBox = { ...this.cropBox };

      document.addEventListener('mousemove', onPointerMove);
      document.addEventListener('mouseup', onPointerUp);
      document.addEventListener('touchmove', onPointerMove, { passive: false });
      document.addEventListener('touchend', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      e.preventDefault();

      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const dx = clientX - this.dragStartX;
      const dy = clientY - this.dragStartY;

      const minSize = 50;
      const maxW = this.canvasWidth;
      const maxH = this.canvasHeight;
      const init = this.initialCropBox;

      let newX = init.x;
      let newY = init.y;
      let newW = init.width;
      let newH = init.height;

      switch (this.dragAction) {
        case 'move': {
          newX = Math.max(0, Math.min(maxW - init.width, init.x + dx));
          newY = Math.max(0, Math.min(maxH - init.height, init.y + dy));
          break;
        }
        case 'nw': {
          newX = Math.max(0, Math.min(init.x + init.width - minSize, init.x + dx));
          newY = Math.max(0, Math.min(init.y + init.height - minSize, init.y + dy));
          newW = init.width - (newX - init.x);
          newH = init.height - (newY - init.y);
          break;
        }
        case 'ne': {
          newY = Math.max(0, Math.min(init.y + init.height - minSize, init.y + dy));
          newW = Math.max(minSize, Math.min(maxW - init.x, init.width + dx));
          newH = init.height - (newY - init.y);
          break;
        }
        case 'se': {
          newW = Math.max(minSize, Math.min(maxW - init.x, init.width + dx));
          newH = Math.max(minSize, Math.min(maxH - init.y, init.height + dy));
          break;
        }
        case 'sw': {
          newX = Math.max(0, Math.min(init.x + init.width - minSize, init.x + dx));
          newW = init.width - (newX - init.x);
          newH = Math.max(minSize, Math.min(maxH - init.y, init.height + dy));
          break;
        }
        case 'n': {
          newY = Math.max(0, Math.min(init.y + init.height - minSize, init.y + dy));
          newH = init.height - (newY - init.y);
          break;
        }
        case 's': {
          newH = Math.max(minSize, Math.min(maxH - init.y, init.height + dy));
          break;
        }
        case 'w': {
          newX = Math.max(0, Math.min(init.x + init.width - minSize, init.x + dx));
          newW = init.width - (newX - init.x);
          break;
        }
        case 'e': {
          newW = Math.max(minSize, Math.min(maxW - init.x, init.width + dx));
          break;
        }
      }

      this.cropBox = {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH)
      };

      this.updateCropBoxDOM();
    };

    const onPointerUp = () => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.dragAction = null;

      document.removeEventListener('mousemove', onPointerMove);
      document.removeEventListener('mouseup', onPointerUp);
      document.removeEventListener('touchmove', onPointerMove);
      document.removeEventListener('touchend', onPointerUp);

      this.pushHistory();
    };

    this.cropOverlay?.addEventListener('mousedown', onPointerDown);
    this.cropOverlay?.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  updateCropBoxDOM() {
    if (!this.cropBoxEl || !this.cropOverlay) return;

    const { x, y, width, height } = this.cropBox;

    this.cropBoxEl.style.left = `${x}px`;
    this.cropBoxEl.style.top = `${y}px`;
    this.cropBoxEl.style.width = `${width}px`;
    this.cropBoxEl.style.height = `${height}px`;

    // Update Dimensions text and inputs
    if (this.cropDimText) {
      this.cropDimText.textContent = `${width} × ${height} px`;
    }
    if (this.inputCropWidth) this.inputCropWidth.value = width;
    if (this.inputCropHeight) this.inputCropHeight.value = height;

    this.updateUndoRedoButtons();
  }

  // -------------------------------------------------------------
  // Presets & Margin Removal
  // -------------------------------------------------------------
  applyRatioPreset(preset) {
    this.activePreset = preset;

    this.presetButtons?.forEach(btn => {
      const match = btn.dataset.preset === preset;
      btn.classList.toggle('bg-blue-600', match);
      btn.classList.toggle('text-white', match);
      btn.classList.toggle('border-blue-600', match);
      btn.classList.toggle('bg-white', !match);
      btn.classList.toggle('dark:bg-neutral-800', !match);
      btn.classList.toggle('border-neutral-200', !match);
      btn.classList.toggle('dark:border-neutral-700', !match);
    });

    if (preset === 'free') return;

    let targetRatio = 1.0;
    if (preset === 'a4') {
      targetRatio = 210 / 297; // ~0.707
    } else if (preset === 'letter') {
      targetRatio = 8.5 / 11; // ~0.772
    } else if (preset === 'square') {
      targetRatio = 1.0;
    } else if (preset === '16-9') {
      targetRatio = 16 / 9; // ~1.777
    }

    const currentCenterX = this.cropBox.x + this.cropBox.width / 2;
    const currentCenterY = this.cropBox.y + this.cropBox.height / 2;

    let newW = this.cropBox.width;
    let newH = Math.round(newW / targetRatio);

    if (newH > this.canvasHeight) {
      newH = this.canvasHeight - 20;
      newW = Math.round(newH * targetRatio);
    }
    if (newW > this.canvasWidth) {
      newW = this.canvasWidth - 20;
      newH = Math.round(newW / targetRatio);
    }

    let newX = Math.round(currentCenterX - newW / 2);
    let newY = Math.round(currentCenterY - newH / 2);

    newX = Math.max(0, Math.min(this.canvasWidth - newW, newX));
    newY = Math.max(0, Math.min(this.canvasHeight - newH, newY));

    this.cropBox = { x: newX, y: newY, width: newW, height: newH };
    this.pushHistory();
    this.updateCropBoxDOM();
    this.showToast(`Applied ${preset.toUpperCase()} aspect ratio preset`, 'info');
  }

  applyMarginRemoval(mm) {
    if (!this.canvasWidth || !this.canvasHeight) return;

    // In PDF standard: 1 inch = 25.4 mm = 72 points.
    // 1 mm ≈ 2.83465 pt.
    // Scale mm to canvas preview pixels
    const ptPerMm = 2.83465;
    const ptMargin = mm * ptPerMm;
    const pxMargin = Math.round(ptMargin * (this.pageViewport?.scale || 1.0));

    const newW = this.canvasWidth - pxMargin * 2;
    const newH = this.canvasHeight - pxMargin * 2;

    if (newW < 50 || newH < 50) {
      this.showToast('Margin removal is too large for this document.', 'warning');
      return;
    }

    this.cropBox = {
      x: pxMargin,
      y: pxMargin,
      width: newW,
      height: newH
    };

    this.pushHistory();
    this.updateCropBoxDOM();
    this.showToast(`Removed ${mm}mm margins from all edges`, 'info');
  }

  resetCropToFull() {
    this.cropBox = {
      x: 0,
      y: 0,
      width: this.canvasWidth,
      height: this.canvasHeight
    };
    this.pushHistory();
    this.updateCropBoxDOM();
    this.showToast('Reset crop area to full page', 'info');
  }

  // -------------------------------------------------------------
  // Undo / Redo History
  // -------------------------------------------------------------
  pushHistory() {
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push({ ...this.cropBox });
    this.historyIndex = this.history.length - 1;
    this.updateUndoRedoButtons();
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.cropBox = { ...this.history[this.historyIndex] };
      this.updateCropBoxDOM();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.cropBox = { ...this.history[this.historyIndex] };
      this.updateCropBoxDOM();
    }
  }

  updateUndoRedoButtons() {
    if (this.undoBtn) this.undoBtn.disabled = this.historyIndex <= 0;
    if (this.redoBtn) this.redoBtn.disabled = this.historyIndex >= this.history.length - 1;
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

      if (part.includes('-')) {
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
      this.rangeHint.textContent = `Crop will be applied to all ${this.totalPages} pages.`;
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
  // Execution: Apply Crop using pdf-lib
  // -------------------------------------------------------------
  async executeCropPdf() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    if (this.cropBox.width < 50 || this.cropBox.height < 50) {
      this.showToast('Crop area is too small. Minimum size: 50x50px.', 'warning');
      return;
    }

    const targetedPages = this.parseTargetPageNumbers();
    if (targetedPages.length === 0) {
      this.showToast('Please specify valid page numbers to crop.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Applying crop boundaries to PDF...');

    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this.pdfBytes);
      const pages = pdfDoc.getPages();

      // Compute relative proportions of crop box (0.0 to 1.0) on the preview canvas
      const relX = this.cropBox.x / this.canvasWidth;
      const relY = this.cropBox.y / this.canvasHeight;
      const relW = this.cropBox.width / this.canvasWidth;
      const relH = this.cropBox.height / this.canvasHeight;

      const totalToProcess = targetedPages.length;
      for (let i = 0; i < totalToProcess; i++) {
        const pageIdx = targetedPages[i] - 1;
        const page = pages[pageIdx];
        if (!page) continue;

        const pct = Math.round(((i + 1) / totalToProcess) * 100);
        this.updateProgress(pct, `Cropping page ${targetedPages[i]} of ${this.totalPages}...`);

        const { width: pageW, height: pageH } = page.getSize();

        // Convert from preview canvas coordinates (top-left origin)
        // to PDF coordinates (bottom-left origin)
        const pdfX = relX * pageW;
        const pdfW = relW * pageW;
        const pdfH = relH * pageH;
        const pdfY = pageH - (relY + relH) * pageH;

        page.setCropBox(pdfX, pdfY, pdfW, pdfH);
      }

      this.updateProgress(100, 'Saving cropped PDF document...');
      const savedBytes = await pdfDoc.save();

      this.croppedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.croppedUrl) URL.revokeObjectURL(this.croppedUrl);
      this.croppedUrl = URL.createObjectURL(this.croppedBlob);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection();
      }, 300);
    } catch (err) {
      console.error('Crop execution error:', err);
      this.showProcessingModal(false);
      this.showToast(`Cropping failed: ${err.message}`, 'error');
    }
  }

  showDownloadSection() {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSizeBadge && this.croppedBlob) {
      this.resultSizeBadge.textContent = formatBytes(this.croppedBlob.size);
    }

    this.showToast('✅ Cropped successfully!', 'success');
  }

  downloadCroppedPdf() {
    if (!this.croppedBlob || !this.croppedUrl) return;

    const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_cropped_${timestamp}.pdf`;

    const a = document.createElement('a');
    a.href = this.croppedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetAll() {
    if (this.croppedUrl) URL.revokeObjectURL(this.croppedUrl);
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.croppedBlob = null;
    this.croppedUrl = null;
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.cropBox = { x: 0, y: 0, width: 0, height: 0 };
    this.history = [];
    this.historyIndex = -1;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
  }

  // -------------------------------------------------------------
  // UI & Progress Modal Helpers
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
  window.cropPdfApp = new CropPdfApp();
});
