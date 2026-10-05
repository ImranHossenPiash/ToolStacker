/**
 * ToolStacker Add Page Numbers to PDF Tool
 * 100% Client-Side • 9 Preset Positions + Custom Coordinates • Multiple Numbering Formats
 * Live Interactive Preview • Batch Support
 * Powered by pdf-lib, pdf.js, and JSZip
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

function toRoman(num) {
  if (num <= 0) return num.toString();
  const romanMap = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'],
    [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'],
    [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']
  ];
  let result = '';
  for (const [val, letter] of romanMap) {
    while (num >= val) {
      result += letter;
      num -= val;
    }
  }
  return result || num.toString();
}

function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  if (cleanHex.length === 3) {
    const r = ((bigint >> 8) & 0xf) * 17;
    const g = ((bigint >> 4) & 0xf) * 17;
    const b = (bigint & 0xf) * 17;
    return { r, g, b };
  }
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
}

class PageNumbersPdfApp {
  constructor() {
    // Files state (single & batch)
    this.files = []; // [{ id, file, pdfBytes, docProxy, totalPages, convertedBlob, convertedUrl, newSize }]
    this.activeFileIndex = 0;

    // Preview state
    this.currentPageNum = 1;
    this.viewport = null;
    this.renderTask = null;

    // Numbering Configuration
    this.position = 'bottom-center'; // top-left, top-center, top-right, middle-left, middle-center, middle-right, bottom-left, bottom-center, bottom-right, custom
    this.customX = 20; // mm from left
    this.customY = 15; // mm from bottom
    this.format = 'simple'; // 'simple' (1, 2), 'text' (Page 1), 'roman' (I, II), 'total' (Page 1 of 10)
    this.customTextPrefix = '';
    this.customTextSuffix = '';

    // Font & Style
    this.fontFamily = 'Helvetica'; // Helvetica, Helvetica-Bold, TimesRoman, TimesRoman-Bold, Courier
    this.fontSize = 12; // 8 - 24 pt
    this.fontColor = '#1f2937'; // hex
    this.opacity = 100; // 50 - 100%

    // Margin & Range
    this.marginMm = 15; // 5 - 50 mm
    this.startNumber = 1;
    this.skipFirst = 0;
    this.skipLast = 0;

    this.cacheDom();
    this.bindEvents();
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Workspace & Overview
    this.workspace = document.getElementById('workspace');
    this.batchTabBar = document.getElementById('batch-tab-bar');
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.resetBtn = document.getElementById('reset-btn');

    // Position Selector (9-grid buttons + custom)
    this.positionGrid = document.getElementById('position-grid');
    this.positionBtns = document.querySelectorAll('.btn-pos');
    this.customPosToggle = document.getElementById('custom-pos-toggle');
    this.customPosInputs = document.getElementById('custom-pos-inputs');
    this.customXInput = document.getElementById('custom-x-input');
    this.customYInput = document.getElementById('custom-y-input');

    // Numbering Format radios
    this.formatRadios = document.querySelectorAll('input[name="numbering-format"]');

    // Font & Style
    this.fontFamilySelect = document.getElementById('font-family-select');
    this.fontSizeSlider = document.getElementById('font-size-slider');
    this.fontSizeValue = document.getElementById('font-size-value');
    this.fontColorInput = document.getElementById('font-color-input');
    this.fontColorText = document.getElementById('font-color-text');
    this.opacitySlider = document.getElementById('opacity-slider');
    this.opacityValue = document.getElementById('opacity-value');
    this.colorPaletteBtns = document.querySelectorAll('.btn-color-palette');

    // Margin & Range
    this.marginSlider = document.getElementById('margin-slider');
    this.marginValue = document.getElementById('margin-value');
    this.startNumberInput = document.getElementById('start-number-input');
    this.skipFirstInput = document.getElementById('skip-first-input');
    this.skipLastInput = document.getElementById('skip-last-input');
    this.rangeWarning = document.getElementById('range-warning');
    this.rangeSummary = document.getElementById('range-summary');

    // Live Preview
    this.previewWrapper = document.getElementById('preview-wrapper');
    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewOverlay = document.getElementById('preview-number-overlay');
    this.previewSpinner = document.getElementById('preview-spinner');
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.previewSampleText = document.getElementById('preview-sample-text');

    // Action Buttons
    this.applyBtn = document.getElementById('apply-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.stickyApplyBtn = document.getElementById('sticky-apply-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.downloadZipBtn = document.getElementById('download-zip-btn');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultFileBadge = document.getElementById('result-file-badge');
    this.batchResultsList = document.getElementById('batch-results-list');
    this.addAnotherBtn = document.getElementById('add-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('number-progress-fill');
    this.progressPct = document.getElementById('number-progress-pct');
    this.progressText = document.getElementById('number-progress-text');
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
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.loadPdfFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    this.browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        this.loadPdfFiles(Array.from(e.target.files));
        e.target.value = '';
      }
    });

    this.resetBtn?.addEventListener('click', () => this.resetAll());
    this.cancelBtn?.addEventListener('click', () => this.resetAll());
    this.addAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Position Grid Buttons
    this.positionBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const pos = btn.dataset.pos;
        this.setPosition(pos);
      });
    });

    // Custom Position Toggle & Inputs
    this.customPosToggle?.addEventListener('change', (e) => {
      if (e.target.checked) {
        this.setPosition('custom');
      } else {
        this.setPosition('bottom-center');
      }
    });

    this.customXInput?.addEventListener('input', (e) => {
      this.customX = parseFloat(e.target.value) || 0;
      this.updatePreviewOverlay();
    });

    this.customYInput?.addEventListener('input', (e) => {
      this.customY = parseFloat(e.target.value) || 0;
      this.updatePreviewOverlay();
    });

    // Numbering Format
    this.formatRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.format = e.target.value;
          this.updateRangeSummary();
          this.updatePreviewOverlay();
        }
      });
    });

    // Font Family
    this.fontFamilySelect?.addEventListener('change', (e) => {
      this.fontFamily = e.target.value;
      this.updatePreviewOverlay();
    });

    // Font Size
    this.fontSizeSlider?.addEventListener('input', (e) => {
      this.fontSize = parseInt(e.target.value, 10);
      if (this.fontSizeValue) this.fontSizeValue.textContent = `${this.fontSize} pt`;
      this.updatePreviewOverlay();
    });

    // Font Color
    this.fontColorInput?.addEventListener('input', (e) => {
      this.fontColor = e.target.value;
      if (this.fontColorText) this.fontColorText.value = this.fontColor.toUpperCase();
      this.updatePreviewOverlay();
    });

    this.fontColorText?.addEventListener('change', (e) => {
      let val = e.target.value.trim();
      if (!val.startsWith('#')) val = '#' + val;
      if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
        this.fontColor = val;
        if (this.fontColorInput) this.fontColorInput.value = val;
        this.updatePreviewOverlay();
      }
    });

    this.colorPaletteBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const col = btn.dataset.color;
        if (col) {
          this.fontColor = col;
          if (this.fontColorInput) this.fontColorInput.value = col;
          if (this.fontColorText) this.fontColorText.value = col.toUpperCase();
          this.updatePreviewOverlay();
        }
      });
    });

    // Opacity
    this.opacitySlider?.addEventListener('input', (e) => {
      this.opacity = parseInt(e.target.value, 10);
      if (this.opacityValue) this.opacityValue.textContent = `${this.opacity}%`;
      this.updatePreviewOverlay();
    });

    // Margin
    this.marginSlider?.addEventListener('input', (e) => {
      this.marginMm = parseInt(e.target.value, 10);
      if (this.marginValue) this.marginValue.textContent = `${this.marginMm} mm`;
      this.updatePreviewOverlay();
    });

    // Start Number & Skip Pages Inputs
    this.startNumberInput?.addEventListener('input', (e) => {
      this.startNumber = parseInt(e.target.value, 10) || 1;
      this.validateRanges();
      this.updatePreviewOverlay();
    });

    this.skipFirstInput?.addEventListener('input', (e) => {
      this.skipFirst = Math.max(0, parseInt(e.target.value, 10) || 0);
      this.validateRanges();
      this.updatePreviewOverlay();
    });

    this.skipLastInput?.addEventListener('input', (e) => {
      this.skipLast = Math.max(0, parseInt(e.target.value, 10) || 0);
      this.validateRanges();
      this.updatePreviewOverlay();
    });

    // Page Navigator
    this.prevPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.currentPageNum--;
        this.renderPreviewPage(this.currentPageNum);
      }
    });

    this.nextPageBtn?.addEventListener('click', () => {
      const active = this.files[this.activeFileIndex];
      if (active && this.currentPageNum < active.totalPages) {
        this.currentPageNum++;
        this.renderPreviewPage(this.currentPageNum);
      }
    });

    // Execution Buttons
    this.applyBtn?.addEventListener('click', () => this.executeAddPageNumbers());
    this.stickyApplyBtn?.addEventListener('click', () => this.executeAddPageNumbers());
    this.downloadBtn?.addEventListener('click', () => this.downloadSinglePdf());
    this.downloadZipBtn?.addEventListener('click', () => this.downloadBatchZip());

    // Window resize handler for overlay repositioning
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.files.length > 0 && !this.workspace.classList.contains('hidden')) {
          this.renderPreviewPage(this.currentPageNum);
        }
      }, 200);
    });
  }

  setPosition(pos) {
    this.position = pos;

    // Update 3x3 grid buttons styling
    this.positionBtns.forEach((btn) => {
      const isSelected = btn.dataset.pos === pos;
      btn.classList.toggle('border-blue-600', isSelected);
      btn.classList.toggle('bg-blue-50', isSelected);
      btn.classList.toggle('dark:bg-blue-950/50', isSelected);
      btn.classList.toggle('text-blue-600', isSelected);
      btn.classList.toggle('dark:text-blue-400', isSelected);
    });

    const isCustom = pos === 'custom';
    if (this.customPosToggle) this.customPosToggle.checked = isCustom;
    if (this.customPosInputs) this.customPosInputs.classList.toggle('hidden', !isCustom);

    this.updatePreviewOverlay();
  }

  // -------------------------------------------------------------
  // Load PDF Files (Single or Batch)
  // -------------------------------------------------------------
  async loadPdfFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const validPdfs = fileList.filter((file) => {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      return ext === 'pdf' || file.type === 'application/pdf';
    });

    if (validPdfs.length === 0) {
      this.showToast('Please select valid PDF documents.', 'error');
      return;
    }

    for (const f of validPdfs) {
      if (f.size > 200 * 1024 * 1024) {
        this.showToast(`"${f.name}" exceeds 200MB size limit.`, 'error');
        return;
      }
      if (f.size > 50 * 1024 * 1024) {
        this.showToast(`Large file loaded (${formatBytes(f.size)}). Processing may take longer.`, 'warning');
      }
    }

    this.showProcessingModal(true, 'Loading PDF documents in browser memory...');
    this.updateProgress(10, 'Parsing PDF structure...');

    try {
      this.files = [];
      for (let i = 0; i < validPdfs.length; i++) {
        const file = validPdfs[i];
        const bytes = await file.arrayBuffer();

        const loadingTask = window.pdfjsLib.getDocument({
          data: bytes.slice(0),
        });
        const docProxy = await loadingTask.promise;

        this.files.push({
          id: `file_${Date.now()}_${i}`,
          file,
          pdfBytes: bytes,
          docProxy,
          totalPages: docProxy.numPages,
          convertedBlob: null,
          convertedUrl: null,
          newSize: 0,
        });

        const pct = Math.round(10 + ((i + 1) / validPdfs.length) * 40);
        this.updateProgress(pct, `Loaded ${i + 1} of ${validPdfs.length} files...`);
      }

      this.activeFileIndex = 0;
      this.currentPageNum = 1;

      this.renderBatchTabs();
      this.updateActiveFileInfo();
      this.validateRanges();

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      await this.renderPreviewPage(1);

      this.showToast(
        validPdfs.length === 1
          ? `Loaded "${validPdfs[0].name}" (${this.files[0].totalPages} pages).`
          : `Loaded ${validPdfs.length} PDFs for batch numbering.`,
        'info'
      );
    } catch (err) {
      console.error('PDF Load Error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to load PDF: ${err.message}`, 'error');
    }
  }

  renderBatchTabs() {
    if (!this.batchTabBar) return;

    if (this.files.length <= 1) {
      this.batchTabBar.classList.add('hidden');
      return;
    }

    this.batchTabBar.classList.remove('hidden');
    this.batchTabBar.innerHTML = '';

    this.files.forEach((item, index) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      const isActive = index === this.activeFileIndex;
      tab.className = `px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
        isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700'
      }`;
      tab.innerHTML = `
        <i data-lucide="file" class="w-3.5 h-3.5"></i>
        <span class="max-w-[130px] truncate">${item.file.name}</span>
        <span class="text-[10px] opacity-70">(${item.totalPages}p)</span>
      `;
      tab.addEventListener('click', async () => {
        this.activeFileIndex = index;
        this.currentPageNum = 1;
        this.renderBatchTabs();
        this.updateActiveFileInfo();
        this.validateRanges();
        await this.renderPreviewPage(1);
      });

      this.batchTabBar.appendChild(tab);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  updateActiveFileInfo() {
    const active = this.files[this.activeFileIndex];
    if (!active) return;

    if (this.docName) this.docName.textContent = active.file.name;
    if (this.docDetails) {
      this.docDetails.textContent = `${formatBytes(active.file.size)} • ${active.totalPages} page${active.totalPages === 1 ? '' : 's'}`;
    }
  }

  validateRanges() {
    const active = this.files[this.activeFileIndex];
    if (!active) return;

    const total = active.totalPages;
    const isInvalid = this.skipFirst + this.skipLast >= total;

    if (this.rangeWarning) {
      this.rangeWarning.classList.toggle('hidden', !isInvalid);
    }

    if (this.applyBtn) this.applyBtn.disabled = isInvalid;
    if (this.stickyApplyBtn) this.stickyApplyBtn.disabled = isInvalid;

    this.updateRangeSummary();
  }

  updateRangeSummary() {
    const active = this.files[this.activeFileIndex];
    if (!active || !this.rangeSummary) return;

    const total = active.totalPages;
    const numberedPagesCount = Math.max(0, total - this.skipFirst - this.skipLast);

    let summary = `Will number <strong class="text-neutral-900 dark:text-neutral-100">${numberedPagesCount}</strong> of ${total} pages`;
    if (this.skipFirst > 0 || this.skipLast > 0) {
      summary += ` (skipping `;
      const parts = [];
      if (this.skipFirst > 0) parts.push(`first ${this.skipFirst}`);
      if (this.skipLast > 0) parts.push(`last ${this.skipLast}`);
      summary += parts.join(' and ') + ')';
    }
    this.rangeSummary.innerHTML = summary;
  }

  // -------------------------------------------------------------
  // Number String Generator based on Format & Position
  // -------------------------------------------------------------
  getPageNumberText(pageIndex, totalPages) {
    // pageIndex is 1-based index in the document
    if (pageIndex <= this.skipFirst || pageIndex > totalPages - this.skipLast) {
      return null; // Skipped
    }

    // Number offset:
    const relativeNum = this.startNumber + (pageIndex - this.skipFirst - 1);
    const numberedTotal = totalPages - this.skipFirst - this.skipLast;

    switch (this.format) {
      case 'simple':
        return `${relativeNum}`;
      case 'text':
        return `Page ${relativeNum}`;
      case 'roman':
        return toRoman(relativeNum);
      case 'total':
        return `Page ${relativeNum} of ${numberedTotal}`;
      default:
        return `${relativeNum}`;
    }
  }

  // -------------------------------------------------------------
  // Live Preview Rendering with PDF.js & Overlay
  // -------------------------------------------------------------
  async renderPreviewPage(pageNum) {
    const active = this.files[this.activeFileIndex];
    if (!active || !active.docProxy) return;

    this.currentPageNum = pageNum;
    if (this.pageIndicator) {
      this.pageIndicator.textContent = `Page ${pageNum} of ${active.totalPages}`;
    }
    if (this.prevPageBtn) this.prevPageBtn.disabled = pageNum <= 1;
    if (this.nextPageBtn) this.nextPageBtn.disabled = pageNum >= active.totalPages;

    this.previewSpinner?.classList.remove('hidden');

    try {
      const page = await active.docProxy.getPage(pageNum);
      
      const containerWidth = this.previewWrapper?.clientWidth || 560;
      const unscaled = page.getViewport({ scale: 1.0 });
      const targetScale = Math.min(1.4, Math.max(0.6, (containerWidth - 48) / unscaled.width));

      const viewport = page.getViewport({ scale: targetScale });
      this.viewport = viewport;

      if (this.previewCanvas) {
        this.previewCanvas.width = Math.round(viewport.width);
        this.previewCanvas.height = Math.round(viewport.height);
        this.previewCanvas.style.width = `${Math.round(viewport.width)}px`;
        this.previewCanvas.style.height = `${Math.round(viewport.height)}px`;

        const ctx = this.previewCanvas.getContext('2d');
        await page.render({
          canvasContext: ctx,
          viewport: viewport,
          annotationMode: window.pdfjsLib.AnnotationMode.ENABLE,
        }).promise;
      }

      this.updatePreviewOverlay();
      this.previewSpinner?.classList.add('hidden');
    } catch (err) {
      console.error('Preview render error:', err);
      this.previewSpinner?.classList.add('hidden');
    }
  }

  updatePreviewOverlay() {
    if (!this.previewOverlay || !this.viewport) return;

    const active = this.files[this.activeFileIndex];
    const totalPages = active ? active.totalPages : 1;
    const numText = this.getPageNumberText(this.currentPageNum, totalPages);

    if (!numText) {
      this.previewOverlay.textContent = 'Skipped on this page';
      this.previewOverlay.className =
        'absolute px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 pointer-events-none transition-all';
      // Center the skipped notice
      this.previewOverlay.style.left = '50%';
      this.previewOverlay.style.top = '50%';
      this.previewOverlay.style.transform = 'translate(-50%, -50%)';
      this.previewOverlay.style.opacity = '1';
      return;
    }

    this.previewOverlay.textContent = numText;
    this.previewOverlay.className =
      'absolute px-2 py-0.5 rounded pointer-events-none select-none border border-dashed border-blue-500/60 bg-blue-500/10 transition-all font-mono whitespace-nowrap shadow-xs';

    // Apply Style
    this.previewOverlay.style.fontSize = `${Math.max(10, Math.round(this.fontSize * (this.viewport.scale / 1.0)))}px`;
    this.previewOverlay.style.color = this.fontColor;
    this.previewOverlay.style.opacity = (this.opacity / 100).toString();

    // Map font family
    let cssFontFamily = 'system-ui, sans-serif';
    if (this.fontFamily.includes('Courier')) cssFontFamily = '"JetBrains Mono", monospace';
    if (this.fontFamily.includes('Times')) cssFontFamily = 'Georgia, "Times New Roman", serif';
    this.previewOverlay.style.fontFamily = cssFontFamily;
    this.previewOverlay.style.fontWeight = this.fontFamily.includes('Bold') ? 'bold' : 'normal';

    // Compute Canvas pixel coordinates
    // Convert margin (mm) to points (1mm ≈ 2.83465 pt), then scale to viewport
    const ptPerMm = 72 / 25.4;
    const marginCanvasPx = this.marginMm * ptPerMm * this.viewport.scale;

    const canvasW = this.previewCanvas.width;
    const canvasH = this.previewCanvas.height;

    // Reset styles
    this.previewOverlay.style.left = '';
    this.previewOverlay.style.right = '';
    this.previewOverlay.style.top = '';
    this.previewOverlay.style.bottom = '';
    this.previewOverlay.style.transform = '';

    if (this.position === 'custom') {
      const xPx = this.customX * ptPerMm * this.viewport.scale;
      const yPx = canvasH - (this.customY * ptPerMm * this.viewport.scale);
      this.previewOverlay.style.left = `${Math.min(canvasW - 40, Math.max(0, xPx))}px`;
      this.previewOverlay.style.top = `${Math.min(canvasH - 20, Math.max(0, yPx))}px`;
      return;
    }

    switch (this.position) {
      case 'top-left':
        this.previewOverlay.style.left = `${marginCanvasPx}px`;
        this.previewOverlay.style.top = `${marginCanvasPx}px`;
        break;
      case 'top-center':
        this.previewOverlay.style.left = '50%';
        this.previewOverlay.style.top = `${marginCanvasPx}px`;
        this.previewOverlay.style.transform = 'translateX(-50%)';
        break;
      case 'top-right':
        this.previewOverlay.style.right = `${marginCanvasPx}px`;
        this.previewOverlay.style.top = `${marginCanvasPx}px`;
        break;

      case 'middle-left':
        this.previewOverlay.style.left = `${marginCanvasPx}px`;
        this.previewOverlay.style.top = '50%';
        this.previewOverlay.style.transform = 'translateY(-50%)';
        break;
      case 'middle-center':
        this.previewOverlay.style.left = '50%';
        this.previewOverlay.style.top = '50%';
        this.previewOverlay.style.transform = 'translate(-50%, -50%)';
        break;
      case 'middle-right':
        this.previewOverlay.style.right = `${marginCanvasPx}px`;
        this.previewOverlay.style.top = '50%';
        this.previewOverlay.style.transform = 'translateY(-50%)';
        break;

      case 'bottom-left':
        this.previewOverlay.style.left = `${marginCanvasPx}px`;
        this.previewOverlay.style.bottom = `${marginCanvasPx}px`;
        break;
      case 'bottom-center':
        this.previewOverlay.style.left = '50%';
        this.previewOverlay.style.bottom = `${marginCanvasPx}px`;
        this.previewOverlay.style.transform = 'translateX(-50%)';
        break;
      case 'bottom-right':
        this.previewOverlay.style.right = `${marginCanvasPx}px`;
        this.previewOverlay.style.bottom = `${marginCanvasPx}px`;
        break;
    }
  }

  // -------------------------------------------------------------
  // Execution: Add Page Numbers using pdf-lib
  // -------------------------------------------------------------
  async executeAddPageNumbers() {
    if (!this.files || this.files.length === 0) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Initializing PDF typography engine...');
    this.updateProgress(5, 'Loading PDF document streams...');

    const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
    const ptPerMm = 72 / 25.4;
    const marginPt = this.marginMm * ptPerMm;
    const rgbCol = hexToRgb(this.fontColor);
    const pdfColor = rgb(rgbCol.r / 255, rgbCol.g / 255, rgbCol.b / 255);
    const pdfOpacity = this.opacity / 100;

    const totalFilesCount = this.files.length;

    try {
      for (let fIdx = 0; fIdx < totalFilesCount; fIdx++) {
        const item = this.files[fIdx];
        const pdfDoc = await PDFDocument.load(item.pdfBytes, { ignoreEncryption: true });

        // Map Standard Fonts
        let standardFontName = StandardFonts.Helvetica;
        if (this.fontFamily === 'Helvetica-Bold') standardFontName = StandardFonts.HelveticaBold;
        else if (this.fontFamily === 'TimesRoman') standardFontName = StandardFonts.TimesRoman;
        else if (this.fontFamily === 'TimesRoman-Bold') standardFontName = StandardFonts.TimesRomanBold;
        else if (this.fontFamily === 'Courier') standardFontName = StandardFonts.Courier;
        else if (this.fontFamily === 'Courier-Bold') standardFontName = StandardFonts.CourierBold;

        const embeddedFont = await pdfDoc.embedStandardFont(standardFontName);
        const pages = pdfDoc.getPages();
        const totalDocPages = pages.length;

        for (let pIdx = 0; pIdx < totalDocPages; pIdx++) {
          const pageNum = pIdx + 1;
          const text = this.getPageNumberText(pageNum, totalDocPages);

          if (text) {
            const page = pages[pIdx];
            const pageWidth = page.getWidth();
            const pageHeight = page.getHeight();

            const textWidth = embeddedFont.widthOfTextAtSize(text, this.fontSize);
            const textHeight = this.fontSize * 0.8;

            let x = 0;
            let y = 0;

            if (this.position === 'custom') {
              x = this.customX * ptPerMm;
              y = this.customY * ptPerMm;
            } else {
              switch (this.position) {
                case 'top-left':
                  x = marginPt;
                  y = pageHeight - marginPt - textHeight;
                  break;
                case 'top-center':
                  x = (pageWidth - textWidth) / 2;
                  y = pageHeight - marginPt - textHeight;
                  break;
                case 'top-right':
                  x = pageWidth - marginPt - textWidth;
                  y = pageHeight - marginPt - textHeight;
                  break;

                case 'middle-left':
                  x = marginPt;
                  y = (pageHeight - textHeight) / 2;
                  break;
                case 'middle-center':
                  x = (pageWidth - textWidth) / 2;
                  y = (pageHeight - textHeight) / 2;
                  break;
                case 'middle-right':
                  x = pageWidth - marginPt - textWidth;
                  y = (pageHeight - textHeight) / 2;
                  break;

                case 'bottom-left':
                  x = marginPt;
                  y = marginPt;
                  break;
                case 'bottom-center':
                  x = (pageWidth - textWidth) / 2;
                  y = marginPt;
                  break;
                case 'bottom-right':
                  x = pageWidth - marginPt - textWidth;
                  y = marginPt;
                  break;
              }
            }

            // Clamping bounds to prevent text overflow off-page
            x = Math.max(4, Math.min(pageWidth - textWidth - 4, x));
            y = Math.max(4, Math.min(pageHeight - textHeight - 4, y));

            page.drawText(text, {
              x,
              y,
              size: this.fontSize,
              font: embeddedFont,
              color: pdfColor,
              opacity: pdfOpacity,
            });
          }

          const fileProgress = (fIdx / totalFilesCount) * 85;
          const pageProgress = ((pIdx + 1) / totalDocPages) * (85 / totalFilesCount);
          this.updateProgress(
            Math.round(5 + fileProgress + pageProgress),
            totalFilesCount > 1
              ? `Numbering file ${fIdx + 1}/${totalFilesCount} (Page ${pageNum}/${totalDocPages})...`
              : `Drawing page numbers: page ${pageNum} of ${totalDocPages}...`
          );
        }

        const savedBytes = await pdfDoc.save();
        item.convertedBlob = new Blob([savedBytes], { type: 'application/pdf' });
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
        item.convertedUrl = URL.createObjectURL(item.convertedBlob);
        item.newSize = item.convertedBlob.size;
      }

      this.updateProgress(100, 'Done! Page numbers applied.');

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection();
      }, 350);
    } catch (err) {
      console.error('Add page numbers error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to add page numbers: ${err.message}`, 'error');
    }
  }

  showDownloadSection() {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    const active = this.files[this.activeFileIndex] || this.files[0];

    if (this.resultSuccessMsg) {
      if (this.files.length === 1) {
        this.resultSuccessMsg.textContent = `Page numbers added to "${active.file.name}"!`;
      } else {
        this.resultSuccessMsg.textContent = `Page numbers added to all ${this.files.length} PDFs!`;
      }
    }

    if (this.resultFileBadge && active && active.convertedBlob) {
      this.resultFileBadge.textContent = `${formatBytes(active.convertedBlob.size)} • ${active.totalPages} pages`;
    }

    if (this.files.length > 1) {
      this.downloadZipBtn?.classList.remove('hidden');
      this.renderBatchResultsList();
    } else {
      this.downloadZipBtn?.classList.add('hidden');
      if (this.batchResultsList) this.batchResultsList.innerHTML = '';
    }

    this.showToast('✅ Page numbers added successfully!', 'success');
  }

  renderBatchResultsList() {
    if (!this.batchResultsList) return;
    this.batchResultsList.innerHTML = '';

    const listContainer = document.createElement('div');
    listContainer.className = 'w-full max-w-lg mx-auto space-y-2 text-left pt-2';

    this.files.forEach((item) => {
      const card = document.createElement('div');
      card.className =
        'flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 text-xs';

      card.innerHTML = `
        <div class="min-w-0 pr-3">
          <p class="font-bold text-neutral-900 dark:text-neutral-100 truncate">${item.file.name}</p>
          <p class="text-neutral-500 font-mono text-[11px]">
            ${formatBytes(item.newSize)} • ${item.totalPages} pages
          </p>
        </div>
        <button
          type="button"
          class="btn-dl-individual px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors cursor-pointer shrink-0"
        >
          Download
        </button>
      `;

      card.querySelector('.btn-dl-individual')?.addEventListener('click', () => {
        this.downloadFileItem(item);
      });

      listContainer.appendChild(card);
    });

    this.batchResultsList.appendChild(listContainer);
  }

  downloadSinglePdf() {
    const active = this.files[this.activeFileIndex] || this.files[0];
    if (!active || !active.convertedBlob) return;
    this.downloadFileItem(active);
  }

  downloadFileItem(item) {
    if (!item.convertedUrl) return;

    const baseName = item.file.name.replace(/\.[^/.]+$/, '');
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_numbered_${timestamp}.pdf`;

    const a = document.createElement('a');
    a.href = item.convertedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  async downloadBatchZip() {
    if (!window.JSZip) {
      this.showToast('JSZip library loading... please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Packaging numbered PDFs into ZIP archive...');
    this.updateProgress(30, 'Compressing files into ZIP...');

    try {
      const zip = new window.JSZip();
      const timestamp = getFormattedTimestamp();

      for (let i = 0; i < this.files.length; i++) {
        const item = this.files[i];
        if (item.convertedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, '');
          const filename = `${baseName}_numbered.pdf`;
          zip.file(filename, item.convertedBlob);
        }
      }

      this.updateProgress(75, 'Generating downloadable ZIP bundle...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipFilename = `numbered_pdfs_${timestamp}.zip`;

      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(zipUrl);

      this.showProcessingModal(false);
      this.showToast(`Downloaded batch archive "${zipFilename}"!`, 'success');
    } catch (err) {
      console.error('ZIP package error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to create ZIP: ${err.message}`, 'error');
    }
  }

  resetAll() {
    this.files.forEach((item) => {
      if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
    });
    this.files = [];
    this.activeFileIndex = 0;
    this.currentPageNum = 1;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    if (this.previewCanvas) {
      const ctx = this.previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }
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
  window.pageNumbersPdfApp = new PageNumbersPdfApp();
});
