/**
 * ToolStacker Split PDF Tool
 * 100% Client-Side • Zero Server Uploads • Fast Canvas & WebAssembly Engine
 * Powered by pdf-lib, pdf.js, and JSZip
 */

// Initialize pdf.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

// -------------------------------------------------------------
// Helper: Format Bytes
// -------------------------------------------------------------
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// -------------------------------------------------------------
// Helper: Range String Parser & Formatter
// -------------------------------------------------------------
/**
 * Parses a string like "1, 3, 5-7, 10" into a sorted array of unique integers [1, 3, 5, 6, 7, 10]
 */
function parsePageRanges(rangeStr, maxPages) {
  if (!rangeStr || !rangeStr.trim()) return [];
  const parts = rangeStr.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
  const pages = new Set();

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end)) {
        throw new Error(`Invalid range format: "${part}"`);
      }
      if (start <= 0 || end <= 0) {
        throw new Error(`Page numbers must be 1 or greater in range "${part}".`);
      }
      if (start > end) {
        throw new Error(`Invalid range "${part}": Start page (${start}) cannot be greater than end page (${end}).`);
      }

      for (let p = start; p <= end; p++) {
        if (p <= maxPages) {
          pages.add(p);
        }
      }
    } else {
      const pageNum = parseInt(part, 10);
      if (isNaN(pageNum)) {
        throw new Error(`Invalid page number: "${part}"`);
      }
      if (pageNum <= 0) {
        throw new Error(`Page numbers must be 1 or greater.`);
      }
      if (pageNum <= maxPages) {
        pages.add(pageNum);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Converts a sorted array of page numbers [1, 2, 3, 5, 7, 8, 9] into a concise string "1-3, 5, 7-9"
 */
function formatPageRanges(pagesArray) {
  if (!pagesArray || pagesArray.length === 0) return '';
  const sorted = Array.from(new Set(pagesArray)).sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0];
  let end = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? `${start}` : `${start}-${end}`);
      start = sorted[i];
      end = sorted[i];
    }
  }
  ranges.push(start === end ? `${start}` : `${start}-${end}`);
  return ranges.join(', ');
}

// -------------------------------------------------------------
// SplitPdfApp Class
// -------------------------------------------------------------
class SplitPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfDocProxy = null; // pdf.js proxy for thumbnails
    this.pdfBytes = null; // raw ArrayBuffer
    this.totalPages = 0;
    this.selectedPages = new Set(); // 1-based page numbers
    this.activeMode = 'extract'; // 'extract', 'range', 'every-n', 'even-odd'
    this.evenOddSelection = 'both'; // 'even', 'odd', 'both'
    this.splitResults = []; // Array of { filename, blob, url, size, pageCount }
    this.isProcessing = false;

    this.cacheDom();
    this.bindEvents();
    this.updateUI();
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Sections
    this.heroSection = document.getElementById('hero-section');
    this.workspaceSection = document.getElementById('workspace-section');
    this.downloadSection = document.getElementById('download-section');
    this.processingModal = document.getElementById('processing-modal');

    // File Summary Bar
    this.fileNameDisplay = document.getElementById('file-name-display');
    this.fileDetailsDisplay = document.getElementById('file-details-display');
    this.changeFileBtn = document.getElementById('change-file-btn');
    this.resetBtn = document.getElementById('reset-btn');

    // Mode Tabs & Controls
    this.modeTabs = document.querySelectorAll('[data-split-mode]');
    this.modePanels = {
      extract: document.getElementById('mode-panel-extract'),
      range: document.getElementById('mode-panel-range'),
      'every-n': document.getElementById('mode-panel-every-n'),
      'even-odd': document.getElementById('mode-panel-even-odd')
    };

    // Mode Inputs
    this.extractPagesInput = document.getElementById('extract-pages-input');
    this.rangeStartInput = document.getElementById('range-start-input');
    this.rangeEndInput = document.getElementById('range-end-input');
    this.everyNInput = document.getElementById('every-n-input');
    this.evenOddRadios = document.querySelectorAll('input[name="even-odd-choice"]');

    // Visual Page Grid & Selection Controls
    this.pagesGrid = document.getElementById('pages-grid');
    this.selectedCountBadge = document.getElementById('selected-count-badge');
    this.selectAllBtn = document.getElementById('select-all-btn');
    this.deselectAllBtn = document.getElementById('deselect-all-btn');
    this.selectEvenBtn = document.getElementById('select-even-btn');
    this.selectOddBtn = document.getElementById('select-odd-btn');

    // Action Buttons
    this.splitBtn = document.getElementById('split-btn');
    this.stickySplitBtn = document.getElementById('sticky-split-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Processing Elements
    this.progressFill = document.getElementById('split-progress-fill');
    this.progressPct = document.getElementById('split-progress-pct');
    this.progressText = document.getElementById('split-progress-text');

    // Download Elements
    this.downloadSuccessText = document.getElementById('download-success-text');
    this.downloadZipBtn = document.getElementById('download-zip-btn');
    this.splitAnotherBtn = document.getElementById('split-another-btn');
    this.resultsList = document.getElementById('split-results-list');
  }

  bindEvents() {
    // Dropzone & File Input
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
          e.stopPropagation();
          this.dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach((name) => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.loadPdfFile(e.dataTransfer.files[0]);
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

    if (this.fileInput) {
      this.fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadPdfFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Change File / Reset
    if (this.changeFileBtn) {
      this.changeFileBtn.addEventListener('click', () => {
        this.fileInput.click();
      });
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetAll());
    }
    if (this.splitAnotherBtn) {
      this.splitAnotherBtn.addEventListener('click', () => this.resetAll());
    }

    // Global Paste (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) {
            this.loadPdfFile(file);
            break;
          }
        }
      }
    });

    // Mode Switch Tabs
    this.modeTabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const mode = tab.dataset.splitMode;
        this.setMode(mode);
      });
    });

    // Extract pages input sync
    if (this.extractPagesInput) {
      this.extractPagesInput.addEventListener('input', () => {
        try {
          const parsed = parsePageRanges(this.extractPagesInput.value, this.totalPages);
          this.selectedPages = new Set(parsed);
          this.updateGridHighlights();
          this.updateSelectedCountBadge();
        } catch (e) {
          // Keep user typing
        }
      });
    }

    // Range Inputs Sync
    if (this.rangeStartInput && this.rangeEndInput) {
      const handleRangeChange = () => {
        const s = parseInt(this.rangeStartInput.value, 10);
        const en = parseInt(this.rangeEndInput.value, 10);
        if (!isNaN(s) && !isNaN(en) && s <= en) {
          this.selectedPages.clear();
          for (let p = Math.max(1, s); p <= Math.min(this.totalPages, en); p++) {
            this.selectedPages.add(p);
          }
          this.updateGridHighlights();
          this.updateSelectedCountBadge();
        }
      };
      this.rangeStartInput.addEventListener('input', handleRangeChange);
      this.rangeEndInput.addEventListener('input', handleRangeChange);
    }

    // Even / Odd Radios
    this.evenOddRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        this.evenOddSelection = e.target.value;
        this.applyEvenOddSelection();
      });
    });

    // Selection Toolbar Buttons
    if (this.selectAllBtn) {
      this.selectAllBtn.addEventListener('click', () => this.selectAllPages());
    }
    if (this.deselectAllBtn) {
      this.deselectAllBtn.addEventListener('click', () => this.deselectAllPages());
    }
    if (this.selectEvenBtn) {
      this.selectEvenBtn.addEventListener('click', () => this.selectEvenPages());
    }
    if (this.selectOddBtn) {
      this.selectOddBtn.addEventListener('click', () => this.selectOddPages());
    }

    // Split Execution Buttons
    if (this.splitBtn) {
      this.splitBtn.addEventListener('click', () => this.startSplit());
    }
    if (this.stickySplitBtn) {
      this.stickySplitBtn.addEventListener('click', () => this.startSplit());
    }

    // Download ZIP
    if (this.downloadZipBtn) {
      this.downloadZipBtn.addEventListener('click', () => this.downloadAllZip());
    }
  }

  // -------------------------------------------------------------
  // PDF Intake & Parsing
  // -------------------------------------------------------------
  async loadPdfFile(file) {
    if (!file) return;

    // Check size limit: 200MB
    const maxBytes = 200 * 1024 * 1024;
    if (file.size > maxBytes) {
      this.showToast(`"${file.name}" exceeds 200MB limit.`, 'error');
      return;
    }

    if (file.size === 0) {
      this.showToast(`"${file.name}" is empty (0 bytes). Please select a valid PDF document.`, 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document (.pdf).', 'error');
      return;
    }

    this.currentFile = file;
    this.showProcessingModal(true, 'Reading PDF structure...');

    try {
      this.pdfBytes = await file.arrayBuffer();

      if (!window.pdfjsLib) {
        throw new Error('PDF viewing library is not loaded. Please check your connection.');
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: this.pdfBytes });
      this.pdfDocProxy = await loadingTask.promise;
      this.totalPages = this.pdfDocProxy.numPages;

      if (this.totalPages === 0) {
        throw new Error('This PDF contains 0 pages.');
      }

      // Initialize default selection: All pages selected
      this.selectedPages.clear();
      for (let i = 1; i <= this.totalPages; i++) {
        this.selectedPages.add(i);
      }

      // Populate File Details
      if (this.fileNameDisplay) this.fileNameDisplay.textContent = file.name;
      if (this.fileDetailsDisplay) {
        this.fileDetailsDisplay.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      // Initialize Mode Default Inputs
      if (this.extractPagesInput) {
        this.extractPagesInput.value = formatPageRanges(Array.from(this.selectedPages));
      }
      if (this.rangeStartInput) {
        this.rangeStartInput.value = '1';
        this.rangeStartInput.max = this.totalPages;
      }
      if (this.rangeEndInput) {
        this.rangeEndInput.value = String(Math.min(5, this.totalPages));
        this.rangeEndInput.max = this.totalPages;
      }
      if (this.everyNInput) {
        this.everyNInput.value = '2';
        this.everyNInput.max = this.totalPages;
      }

      // Render Visual Thumbnail Grid
      await this.renderPagesGrid();
      this.updateSelectedCountBadge();

      this.showProcessingModal(false);
      this.updateUI();
      this.showToast(`Loaded ${this.totalPages} pages successfully!`, 'success');
    } catch (err) {
      console.error('PDF Load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to load PDF: ${err.message || 'File may be corrupted or password protected.'}`, 'error');
      this.resetAll();
    }
  }

  // -------------------------------------------------------------
  // Visual Page Grid & Thumbnail Rendering
  // -------------------------------------------------------------
  async renderPagesGrid() {
    if (!this.pagesGrid) return;
    this.pagesGrid.innerHTML = '';

    const fragment = document.createDocumentFragment();

    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      const card = document.createElement('div');
      card.id = `page-card-${pageNum}`;
      card.dataset.page = pageNum;
      card.className =
        'page-card relative flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-neutral-900 border-2 transition-all cursor-pointer select-none group border-blue-600 ring-2 ring-blue-500/20 shadow-xs';

      card.innerHTML = `
        <!-- Thumbnail Canvas Container -->
        <div class="relative w-full aspect-[1/1.35] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center border border-neutral-200 dark:border-neutral-800">
          <canvas id="page-canvas-${pageNum}" class="w-full h-full object-contain pointer-events-none"></canvas>
          
          <!-- Checkbox Indicator Overlay -->
          <div class="checkbox-indicator absolute top-2 right-2 w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110">
            <i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>
          </div>

          <!-- Page Number Pill -->
          <div class="absolute bottom-1.5 inset-x-2 text-center">
            <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-neutral-900/80 text-white backdrop-blur-xs">
              Page ${pageNum}
            </span>
          </div>
        </div>
      `;

      card.addEventListener('click', () => {
        this.togglePageSelection(pageNum);
      });

      fragment.appendChild(card);
    }

    this.pagesGrid.appendChild(fragment);

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Progressively render canvas thumbnails
    this.renderThumbnailsProgressively();
  }

  async renderThumbnailsProgressively() {
    if (!this.pdfDocProxy) return;

    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      try {
        const canvas = document.getElementById(`page-canvas-${pageNum}`);
        if (!canvas) continue;

        const page = await this.pdfDocProxy.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });

        // Calculate thumb resolution (target width ~120px)
        const scale = 120 / viewport.width;
        const scaledViewport = page.getViewport({ scale: Math.min(scale, 1.2) });

        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport
        }).promise;
      } catch (err) {
        console.warn(`Thumbnail render failed for page ${pageNum}:`, err);
      }
    }
  }

  togglePageSelection(pageNum) {
    if (this.selectedPages.has(pageNum)) {
      this.selectedPages.delete(pageNum);
    } else {
      this.selectedPages.add(pageNum);
    }

    this.updateGridHighlights();
    this.updateSelectedCountBadge();

    // Sync to text input if in extract mode
    if (this.activeMode === 'extract' && this.extractPagesInput) {
      this.extractPagesInput.value = formatPageRanges(Array.from(this.selectedPages));
    }
  }

  selectAllPages() {
    this.selectedPages.clear();
    for (let i = 1; i <= this.totalPages; i++) {
      this.selectedPages.add(i);
    }
    this.onSelectionUpdated();
  }

  deselectAllPages() {
    this.selectedPages.clear();
    this.onSelectionUpdated();
  }

  selectEvenPages() {
    this.selectedPages.clear();
    for (let i = 2; i <= this.totalPages; i += 2) {
      this.selectedPages.add(i);
    }
    this.onSelectionUpdated();
  }

  selectOddPages() {
    this.selectedPages.clear();
    for (let i = 1; i <= this.totalPages; i += 2) {
      this.selectedPages.add(i);
    }
    this.onSelectionUpdated();
  }

  applyEvenOddSelection() {
    this.selectedPages.clear();
    for (let i = 1; i <= this.totalPages; i++) {
      if (this.evenOddSelection === 'even' && i % 2 === 0) {
        this.selectedPages.add(i);
      } else if (this.evenOddSelection === 'odd' && i % 2 !== 0) {
        this.selectedPages.add(i);
      } else if (this.evenOddSelection === 'both') {
        this.selectedPages.add(i);
      }
    }
    this.onSelectionUpdated();
  }

  onSelectionUpdated() {
    this.updateGridHighlights();
    this.updateSelectedCountBadge();
    if (this.activeMode === 'extract' && this.extractPagesInput) {
      this.extractPagesInput.value = formatPageRanges(Array.from(this.selectedPages));
    }
  }

  updateGridHighlights() {
    for (let pageNum = 1; pageNum <= this.totalPages; pageNum++) {
      const card = document.getElementById(`page-card-${pageNum}`);
      if (!card) continue;

      const isSelected = this.selectedPages.has(pageNum);
      const indicator = card.querySelector('.checkbox-indicator');

      if (isSelected) {
        card.className =
          'page-card relative flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-neutral-900 border-2 transition-all cursor-pointer select-none group border-blue-600 ring-2 ring-blue-500/20 shadow-xs';
        if (indicator) {
          indicator.className =
            'checkbox-indicator absolute top-2 right-2 w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-110';
          indicator.innerHTML = '<i data-lucide="check" class="w-3.5 h-3.5 stroke-[3]"></i>';
        }
      } else {
        card.className =
          'page-card relative flex flex-col items-center p-2 rounded-2xl bg-white dark:bg-neutral-900 border-2 transition-all cursor-pointer select-none group border-neutral-200 dark:border-neutral-800 opacity-60 hover:opacity-100';
        if (indicator) {
          indicator.className =
            'checkbox-indicator absolute top-2 right-2 w-6 h-6 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-transparent flex items-center justify-center shadow-2xs transition-transform group-hover:scale-110';
          indicator.innerHTML = '';
        }
      }
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  updateSelectedCountBadge() {
    if (this.selectedCountBadge) {
      this.selectedCountBadge.textContent = `${this.selectedPages.size} of ${this.totalPages} pages selected`;
    }

    const canSplit = this.selectedPages.size > 0;
    if (this.splitBtn) {
      this.splitBtn.disabled = !canSplit;
      this.splitBtn.classList.toggle('opacity-50', !canSplit);
      this.splitBtn.classList.toggle('cursor-not-allowed', !canSplit);
    }
    if (this.stickySplitBtn) {
      this.stickySplitBtn.disabled = !canSplit;
      this.stickySplitBtn.classList.toggle('opacity-50', !canSplit);
      this.stickySplitBtn.classList.toggle('cursor-not-allowed', !canSplit);
    }
  }

  // -------------------------------------------------------------
  // Mode Selection & Switching
  // -------------------------------------------------------------
  setMode(mode) {
    this.activeMode = mode;

    this.modeTabs.forEach((tab) => {
      const isActive = tab.dataset.splitMode === mode;
      tab.classList.toggle('bg-blue-600', isActive);
      tab.classList.toggle('text-white', isActive);
      tab.classList.toggle('shadow-xs', isActive);
      tab.classList.toggle('bg-neutral-100', !isActive);
      tab.classList.toggle('dark:bg-neutral-800', !isActive);
      tab.classList.toggle('text-neutral-600', !isActive);
      tab.classList.toggle('dark:text-neutral-300', !isActive);
    });

    Object.keys(this.modePanels).forEach((key) => {
      if (this.modePanels[key]) {
        this.modePanels[key].classList.toggle('hidden', key !== mode);
      }
    });

    // Update selection based on mode defaults
    if (mode === 'even-odd') {
      this.applyEvenOddSelection();
    } else if (mode === 'range') {
      const s = parseInt(this.rangeStartInput?.value || '1', 10);
      const en = parseInt(this.rangeEndInput?.value || String(this.totalPages), 10);
      this.selectedPages.clear();
      for (let p = Math.max(1, s); p <= Math.min(this.totalPages, en); p++) {
        this.selectedPages.add(p);
      }
      this.onSelectionUpdated();
    }
  }

  // -------------------------------------------------------------
  // Core Split Engine (pdf-lib)
  // -------------------------------------------------------------
  async startSplit() {
    if (!this.currentFile || !this.pdfBytes) {
      this.showToast('Please upload a PDF file first.', 'error');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF engine is loading. Please wait a moment...', 'warning');
      return;
    }

    this.isProcessing = true;
    this.showProcessingModal(true, 'Preparing split partitions...');

    try {
      const { PDFDocument } = window.PDFLib;
      const baseFilename = this.currentFile.name.replace(/\.[^/.]+$/, '');
      const partitions = this.calculatePartitions(baseFilename);

      if (partitions.length === 0) {
        throw new Error('Please select at least one page to extract.');
      }

      this.splitResults = [];
      const totalPartitions = partitions.length;

      // Load source PDF document once
      const srcDoc = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });

      for (let i = 0; i < totalPartitions; i++) {
        const part = partitions[i];
        const pct = Math.round(((i + 1) / totalPartitions) * 100);
        this.updateProgress(pct, `Creating ${part.filename} (${i + 1} of ${totalPartitions})...`);

        const newDoc = await PDFDocument.create();
        // Convert 1-based indices to 0-based
        const zeroBasedPages = part.pages.map(p => p - 1);
        const copiedPages = await newDoc.copyPages(srcDoc, zeroBasedPages);
        copiedPages.forEach(p => newDoc.addPage(p));

        const savedBytes = await newDoc.save();
        const blob = new Blob([savedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);

        this.splitResults.push({
          filename: part.filename,
          blob: blob,
          url: url,
          size: blob.size,
          pageCount: part.pages.length,
          pagesLabel: formatPageRanges(part.pages)
        });
      }

      this.updateProgress(100, 'Done!');
      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadState();
      }, 350);
    } catch (err) {
      console.error('Split error:', err);
      this.showProcessingModal(false);
      this.showToast(`Split failed: ${err.message}`, 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  calculatePartitions(baseName) {
    const partitions = [];

    if (this.activeMode === 'extract') {
      const pages = Array.from(this.selectedPages).sort((a, b) => a - b);
      if (pages.length === 0) return [];
      const rangeLabel = formatPageRanges(pages).replace(/[, ]+/g, '_');
      partitions.push({
        filename: `${baseName}_extracted_pages_${rangeLabel}.pdf`,
        pages: pages
      });
    } else if (this.activeMode === 'range') {
      const s = parseInt(this.rangeStartInput.value, 10);
      const en = parseInt(this.rangeEndInput.value, 10);

      if (isNaN(s) || isNaN(en) || s <= 0 || en <= 0) {
        throw new Error('Please enter valid numeric start and end page numbers.');
      }
      if (s > en) {
        throw new Error(`Invalid range: Start page (${s}) must be less than or equal to end page (${en}).`);
      }

      const pages = [];
      for (let p = s; p <= Math.min(en, this.totalPages); p++) {
        pages.push(p);
      }
      partitions.push({
        filename: `${baseName}_range_${s}-${en}.pdf`,
        pages: pages
      });
    } else if (this.activeMode === 'every-n') {
      const n = parseInt(this.everyNInput.value, 10);
      if (isNaN(n) || n <= 0) {
        throw new Error('Please enter a valid page interval (at least 1).');
      }

      let partIndex = 1;
      for (let p = 1; p <= this.totalPages; p += n) {
        const chunkPages = [];
        for (let j = p; j < p + n && j <= this.totalPages; j++) {
          chunkPages.push(j);
        }
        const rangeStr = `${chunkPages[0]}-${chunkPages[chunkPages.length - 1]}`;
        partitions.push({
          filename: `${baseName}_part_${partIndex}_pages_${rangeStr}.pdf`,
          pages: chunkPages
        });
        partIndex++;
      }
    } else if (this.activeMode === 'even-odd') {
      const evenPages = [];
      const oddPages = [];

      for (let p = 1; p <= this.totalPages; p++) {
        if (p % 2 === 0) evenPages.push(p);
        else oddPages.push(p);
      }

      if (this.evenOddSelection === 'even' || this.evenOddSelection === 'both') {
        if (evenPages.length > 0) {
          partitions.push({
            filename: `${baseName}_even_pages.pdf`,
            pages: evenPages
          });
        }
      }
      if (this.evenOddSelection === 'odd' || this.evenOddSelection === 'both') {
        if (oddPages.length > 0) {
          partitions.push({
            filename: `${baseName}_odd_pages.pdf`,
            pages: oddPages
          });
        }
      }
    }

    return partitions;
  }

  // -------------------------------------------------------------
  // Download State & ZIP Export
  // -------------------------------------------------------------
  showDownloadState() {
    if (this.heroSection) this.heroSection.classList.add('hidden');
    if (this.workspaceSection) this.workspaceSection.classList.add('hidden');
    if (this.stickyBar) this.stickyBar.classList.add('hidden');

    if (this.downloadSection) {
      this.downloadSection.classList.remove('hidden');
      this.downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const count = this.splitResults.length;
    if (this.downloadSuccessText) {
      this.downloadSuccessText.textContent = `✅ Successfully split into ${count} PDF file${count === 1 ? '' : 's'}!`;
    }

    // Toggle ZIP button if multiple
    if (this.downloadZipBtn) {
      this.downloadZipBtn.classList.toggle('hidden', count <= 1);
    }

    // Render individual download cards
    if (this.resultsList) {
      this.resultsList.innerHTML = '';
      this.splitResults.forEach((res, i) => {
        const itemEl = document.createElement('div');
        itemEl.className =
          'flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs text-left';

        itemEl.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <i data-lucide="file-text" class="w-5 h-5"></i>
            </div>
            <div class="min-w-0 flex-1">
              <h4 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate" title="${res.filename}">
                ${res.filename}
              </h4>
              <div class="flex items-center gap-2 mt-0.5 text-xs text-neutral-500">
                <span>${res.pageCount} page${res.pageCount === 1 ? '' : 's'} (${res.pagesLabel})</span>
                <span>•</span>
                <span class="font-mono">${formatBytes(res.size)}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="download-single-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer self-end sm:self-auto shrink-0"
          >
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
            <span>Download</span>
          </button>
        `;

        itemEl.querySelector('.download-single-btn')?.addEventListener('click', () => {
          this.downloadSingleFile(res);
        });

        this.resultsList.appendChild(itemEl);
      });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    this.showToast(`✅ Split into ${count} files ready for download!`, 'success');
  }

  downloadSingleFile(result) {
    const a = document.createElement('a');
    a.href = result.url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast(`Downloaded ${result.filename}`, 'success');
  }

  async downloadAllZip() {
    if (!this.splitResults || this.splitResults.length === 0) return;

    if (!window.JSZip) {
      this.showToast('ZIP generator loading...', 'warning');
      return;
    }

    this.showToast('Creating ZIP archive...', 'info');

    const zip = new window.JSZip();
    this.splitResults.forEach((res) => {
      zip.file(res.filename, res.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);

    const a = document.createElement('a');
    a.href = zipUrl;
    const base = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    a.download = `${base}_split_files.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(zipUrl), 30000);
    this.showToast('ZIP archive downloaded!', 'success');
  }

  // -------------------------------------------------------------
  // Progress Modal & Reset State
  // -------------------------------------------------------------
  showProcessingModal(show, statusText = 'Processing...') {
    if (!this.processingModal) return;
    this.processingModal.classList.toggle('hidden', !show);
    if (this.progressText && statusText) this.progressText.textContent = statusText;
    if (show) {
      document.body.classList.add('overflow-hidden');
    } else {
      document.body.classList.remove('overflow-hidden');
    }
  }

  updateProgress(pct, statusText) {
    if (this.progressFill) this.progressFill.style.width = `${pct}%`;
    if (this.progressPct) this.progressPct.textContent = `${pct}%`;
    if (this.progressText && statusText) this.progressText.textContent = statusText;
  }

  updateUI() {
    const hasFile = !!this.currentFile;
    if (this.heroSection) this.heroSection.classList.toggle('hidden', hasFile);
    if (this.workspaceSection) this.workspaceSection.classList.toggle('hidden', !hasFile);
    if (this.stickyBar) this.stickyBar.classList.toggle('hidden', !hasFile);
    if (this.downloadSection) this.downloadSection.classList.add('hidden');
  }

  resetAll() {
    // Revoke previous URLs
    this.splitResults.forEach((r) => {
      if (r.url) URL.revokeObjectURL(r.url);
    });

    this.currentFile = null;
    this.pdfDocProxy = null;
    this.pdfBytes = null;
    this.totalPages = 0;
    this.selectedPages.clear();
    this.splitResults = [];
    if (this.pagesGrid) this.pagesGrid.innerHTML = '';
    if (this.fileInput) this.fileInput.value = '';

    this.updateUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
  window.splitPdfApp = new SplitPdfApp();
});
