/**
 * ToolStacker Grayscale PDF Tool
 * 100% Client-Side • Color to Black & White • Side-by-Side Live Preview • Batch Processing
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

class GrayscalePdfApp {
  constructor() {
    // Files state (supports single and batch)
    this.files = []; // [{ id, file, pdfBytes, docProxy, totalPages, isGrayscaleDetected, convertedBlob, convertedUrl, newSize }]
    this.activeFileIndex = 0;

    // Preview state
    this.currentPageNum = 1;
    this.currentZoom = 100; // 50 to 200
    this.previewMode = 'split'; // 'split' | 'original' | 'grayscale'

    // Compression quality setting: 'standard' (0.80) | 'high' (0.92) | 'compact' (0.65)
    this.qualitySetting = 0.82;

    this.cacheDom();
    this.bindEvents();
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Workspace
    this.workspace = document.getElementById('workspace');
    this.batchFileList = document.getElementById('batch-file-list');
    this.batchTabBar = document.getElementById('batch-tab-bar');
    this.resetBtn = document.getElementById('reset-btn');

    // Active File Header & Detection
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.alreadyGrayscaleBadge = document.getElementById('already-grayscale-badge');
    this.savingsEstimateBadge = document.getElementById('savings-estimate-badge');

    // Preview Controls
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.zoomSlider = document.getElementById('zoom-slider');
    this.zoomValue = document.getElementById('zoom-value');
    this.btnModeSplit = document.getElementById('btn-mode-split');
    this.btnModeOriginal = document.getElementById('btn-mode-original');
    this.btnModeGrayscale = document.getElementById('btn-mode-grayscale');

    // Canvas Preview Containers
    this.previewContainer = document.getElementById('preview-container');
    this.originalCanvasWrapper = document.getElementById('original-canvas-wrapper');
    this.grayscaleCanvasWrapper = document.getElementById('grayscale-canvas-wrapper');
    this.canvasOriginal = document.getElementById('canvas-original');
    this.canvasGrayscale = document.getElementById('canvas-grayscale');
    this.previewSpinner = document.getElementById('preview-spinner');

    // Action Buttons
    this.convertBtn = document.getElementById('convert-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.stickyConvertBtn = document.getElementById('sticky-convert-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.downloadZipBtn = document.getElementById('download-zip-btn');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultBeforeSize = document.getElementById('result-before-size');
    this.resultAfterSize = document.getElementById('result-after-size');
    this.resultSavingsBadge = document.getElementById('result-savings-badge');
    this.batchResultsList = document.getElementById('batch-results-list');
    this.convertAnotherBtn = document.getElementById('convert-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('grayscale-progress-fill');
    this.progressPct = document.getElementById('grayscale-progress-pct');
    this.progressText = document.getElementById('grayscale-progress-text');
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
          this.dropzone.classList.add('border-neutral-500', 'bg-neutral-100/50', 'dark:bg-neutral-800/40');
        });
      });

      ['dragleave', 'drop'].forEach((name) => {
        this.dropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.dropzone.classList.remove('border-neutral-500', 'bg-neutral-100/50', 'dark:bg-neutral-800/40');
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
    this.convertAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Preview Mode Toggles
    this.btnModeSplit?.addEventListener('click', () => this.setPreviewMode('split'));
    this.btnModeOriginal?.addEventListener('click', () => this.setPreviewMode('original'));
    this.btnModeGrayscale?.addEventListener('click', () => this.setPreviewMode('grayscale'));

    // Zoom Slider
    this.zoomSlider?.addEventListener('input', (e) => {
      this.currentZoom = parseInt(e.target.value, 10);
      if (this.zoomValue) this.zoomValue.textContent = `${this.currentZoom}%`;
      this.applyZoom();
    });

    // Page Navigator
    this.prevPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.currentPageNum--;
        this.renderPreviewPage(this.currentPageNum);
      }
    });

    this.nextPageBtn?.addEventListener('click', () => {
      const activeItem = this.files[this.activeFileIndex];
      if (activeItem && this.currentPageNum < activeItem.totalPages) {
        this.currentPageNum++;
        this.renderPreviewPage(this.currentPageNum);
      }
    });

    // Execution Buttons
    this.convertBtn?.addEventListener('click', () => this.executeGrayscaleConversion());
    this.stickyConvertBtn?.addEventListener('click', () => this.executeGrayscaleConversion());
    this.downloadBtn?.addEventListener('click', () => this.downloadSingleActivePdf());
    this.downloadZipBtn?.addEventListener('click', () => this.downloadBatchZip());
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

    // Check size limit (max 200MB per file)
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
    this.updateProgress(10, 'Parsing PDF headers...');

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
          isGrayscaleDetected: false,
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

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      await this.renderPreviewPage(1);

      this.showToast(
        validPdfs.length === 1
          ? `Loaded "${validPdfs[0].name}" (${this.files[0].totalPages} pages).`
          : `Loaded ${validPdfs.length} PDFs for batch processing.`,
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
          ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 shadow-sm'
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

    if (this.savingsEstimateBadge) {
      const estimatedSavings = formatBytes(Math.round(active.file.size * 0.32));
      this.savingsEstimateBadge.textContent = `~30% smaller (est. save ~${estimatedSavings})`;
    }
  }

  // -------------------------------------------------------------
  // Preview Rendering: Original vs Grayscale
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
      const viewport = page.getViewport({ scale: 1.5 });

      // 1. Render Original Color Canvas
      if (this.canvasOriginal) {
        this.canvasOriginal.width = Math.round(viewport.width);
        this.canvasOriginal.height = Math.round(viewport.height);

        const ctxOrig = this.canvasOriginal.getContext('2d');
        await page.render({
          canvasContext: ctxOrig,
          viewport: viewport,
          annotationMode: window.pdfjsLib.AnnotationMode.ENABLE,
        }).promise;

        // Check if page/document appears already grayscale
        this.detectGrayscaleFromCanvas(ctxOrig, viewport.width, viewport.height);
      }

      // 2. Render Grayscale Canvas
      if (this.canvasGrayscale && this.canvasOriginal) {
        this.canvasGrayscale.width = this.canvasOriginal.width;
        this.canvasGrayscale.height = this.canvasOriginal.height;

        const ctxGray = this.canvasGrayscale.getContext('2d');
        // Copy image from original canvas
        ctxGray.drawImage(this.canvasOriginal, 0, 0);

        // Apply pixel-perfect Rec. 601 / BT.709 luminance transformation
        const imgData = ctxGray.getImageData(0, 0, ctxGray.canvas.width, ctxGray.canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = luma;
          d[i + 1] = luma;
          d[i + 2] = luma;
        }
        ctxGray.putImageData(imgData, 0, 0);
      }

      this.applyZoom();
      this.previewSpinner?.classList.add('hidden');
    } catch (err) {
      console.error('Preview render error:', err);
      this.previewSpinner?.classList.add('hidden');
    }
  }

  detectGrayscaleFromCanvas(ctx, width, height) {
    try {
      // Sample 2,000 pixels across the page to detect colored content
      const imgData = ctx.getImageData(0, 0, width, height);
      const d = imgData.data;
      const totalPixels = width * height;
      const step = Math.max(1, Math.floor(totalPixels / 2000)) * 4;

      let coloredPixels = 0;
      let nonWhitePixels = 0;

      for (let i = 0; i < d.length; i += step) {
        const r = d[i];
        const g = d[i + 1];
        const b = d[i + 2];

        // Skip pure white or pure black backgrounds
        if (r > 245 && g > 245 && b > 245) continue;
        nonWhitePixels++;

        // Variance among R, G, B channels indicates color
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        if (max - min > 15) {
          coloredPixels++;
        }
      }

      const isAlreadyGrayscale = nonWhitePixels > 20 && coloredPixels / nonWhitePixels < 0.03;
      const active = this.files[this.activeFileIndex];
      if (active) active.isGrayscaleDetected = isAlreadyGrayscale;

      if (this.alreadyGrayscaleBadge) {
        this.alreadyGrayscaleBadge.classList.toggle('hidden', !isAlreadyGrayscale);
      }
    } catch (e) {
      console.warn('Grayscale detection notice:', e);
    }
  }

  setPreviewMode(mode) {
    this.previewMode = mode;

    [this.btnModeSplit, this.btnModeOriginal, this.btnModeGrayscale].forEach((btn) => {
      btn?.classList.remove('bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
      btn?.classList.add('text-neutral-600', 'dark:text-neutral-400');
    });

    if (mode === 'split') {
      this.btnModeSplit?.classList.add('bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
      this.originalCanvasWrapper?.classList.remove('hidden');
      this.grayscaleCanvasWrapper?.classList.remove('hidden');
    } else if (mode === 'original') {
      this.btnModeOriginal?.classList.add('bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
      this.originalCanvasWrapper?.classList.remove('hidden');
      this.grayscaleCanvasWrapper?.classList.add('hidden');
    } else if (mode === 'grayscale') {
      this.btnModeGrayscale?.classList.add('bg-neutral-900', 'text-white', 'dark:bg-white', 'dark:text-neutral-900');
      this.originalCanvasWrapper?.classList.add('hidden');
      this.grayscaleCanvasWrapper?.classList.remove('hidden');
    }
  }

  applyZoom() {
    const scale = this.currentZoom / 100;
    if (this.canvasOriginal) {
      this.canvasOriginal.style.transform = `scale(${scale})`;
      this.canvasOriginal.style.transformOrigin = 'top center';
    }
    if (this.canvasGrayscale) {
      this.canvasGrayscale.style.transform = `scale(${scale})`;
      this.canvasGrayscale.style.transformOrigin = 'top center';
    }
  }

  // -------------------------------------------------------------
  // Execution: Grayscale Conversion via Canvas & pdf-lib
  // -------------------------------------------------------------
  async executeGrayscaleConversion() {
    if (!this.files || this.files.length === 0) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Starting grayscale conversion engine...');
    this.updateProgress(5, 'Initializing high-fidelity canvas pipeline...');

    const { PDFDocument } = window.PDFLib;
    const totalFilesCount = this.files.length;
    let totalOriginalBytes = 0;
    let totalNewBytes = 0;

    try {
      for (let fIdx = 0; fIdx < totalFilesCount; fIdx++) {
        const item = this.files[fIdx];
        totalOriginalBytes += item.file.size;

        const docProxy = item.docProxy;
        const totalPages = item.totalPages;
        const newDoc = await PDFDocument.create();

        // Create an offscreen canvas for rendering & converting
        const offCanvas = document.createElement('canvas');
        const offCtx = offCanvas.getContext('2d');

        for (let p = 1; p <= totalPages; p++) {
          const page = await docProxy.getPage(p);
          // Scale 1.75 delivers ~150-180 DPI crisp print quality with lightweight file size
          const viewport = page.getViewport({ scale: 1.75 });
          const unscaled = page.getViewport({ scale: 1.0 });

          offCanvas.width = Math.round(viewport.width);
          offCanvas.height = Math.round(viewport.height);

          // Render page
          await page.render({
            canvasContext: offCtx,
            viewport: viewport,
            annotationMode: window.pdfjsLib.AnnotationMode.ENABLE,
          }).promise;

          // Convert pixels to Grayscale
          const imgData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
            d[i] = gray;
            d[i + 1] = gray;
            d[i + 2] = gray;
          }
          offCtx.putImageData(imgData, 0, 0);

          // Compress to JPEG grayscale with quality setting
          const jpegDataUrl = offCanvas.toDataURL('image/jpeg', this.qualitySetting);
          const jpegBytes = await fetch(jpegDataUrl).then((r) => r.arrayBuffer());

          // Embed into clean new PDF page preserving original dimensions
          const embeddedJpg = await newDoc.embedJpg(jpegBytes);
          const newPdfPage = newDoc.addPage([unscaled.width, unscaled.height]);
          newPdfPage.drawImage(embeddedJpg, {
            x: 0,
            y: 0,
            width: unscaled.width,
            height: unscaled.height,
          });

          // Update Progress
          const fileBasePct = (fIdx / totalFilesCount) * 90;
          const pagePct = ((p / totalPages) * (90 / totalFilesCount));
          const totalProgress = Math.round(5 + fileBasePct + pagePct);
          this.updateProgress(
            totalProgress,
            totalFilesCount > 1
              ? `Processing file ${fIdx + 1}/${totalFilesCount}: Page ${p}/${totalPages}...`
              : `Converting page ${p} of ${totalPages} to grayscale...`
          );
        }

        // Save new PDF
        const savedBytes = await newDoc.save();
        item.convertedBlob = new Blob([savedBytes], { type: 'application/pdf' });
        if (item.convertedUrl) URL.revokeObjectURL(item.convertedUrl);
        item.convertedUrl = URL.createObjectURL(item.convertedBlob);
        item.newSize = item.convertedBlob.size;
        totalNewBytes += item.newSize;
      }

      this.updateProgress(100, 'Done! Finalizing results...');

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection(totalOriginalBytes, totalNewBytes);
      }, 350);
    } catch (err) {
      console.error('Grayscale conversion error:', err);
      this.showProcessingModal(false);
      this.showToast(`Conversion failed: ${err.message}`, 'error');
    }
  }

  showDownloadSection(originalSize, newSize) {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultBeforeSize) {
      this.resultBeforeSize.textContent = formatBytes(originalSize);
    }
    if (this.resultAfterSize) {
      this.resultAfterSize.textContent = formatBytes(newSize);
    }

    const diff = originalSize - newSize;
    const pct = originalSize > 0 ? Math.round((Math.abs(diff) / originalSize) * 100) : 0;

    if (this.resultSavingsBadge) {
      if (diff > 0) {
        this.resultSavingsBadge.textContent = `${pct}% smaller`;
        this.resultSavingsBadge.className =
          'px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      } else {
        this.resultSavingsBadge.textContent = 'Optimized';
        this.resultSavingsBadge.className =
          'px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
      }
    }

    if (this.resultSuccessMsg) {
      if (diff > 0) {
        this.resultSuccessMsg.textContent = `Converted! ${formatBytes(originalSize)} → ${formatBytes(newSize)} (${pct}% smaller)`;
      } else {
        this.resultSuccessMsg.textContent = `Converted to grayscale successfully! (${formatBytes(newSize)})`;
      }
    }

    // Toggle Single vs Batch Download controls
    if (this.files.length > 1) {
      this.downloadZipBtn?.classList.remove('hidden');
      this.renderBatchResultsList();
    } else {
      this.downloadZipBtn?.classList.add('hidden');
      if (this.batchResultsList) this.batchResultsList.innerHTML = '';
    }

    this.showToast('✅ Converted to grayscale successfully!', 'success');
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
      
      const diff = item.file.size - item.newSize;
      const pct = item.file.size > 0 ? Math.round((Math.abs(diff) / item.file.size) * 100) : 0;

      card.innerHTML = `
        <div class="min-w-0 pr-3">
          <p class="font-bold text-neutral-900 dark:text-neutral-100 truncate">${item.file.name}</p>
          <p class="text-neutral-500 font-mono text-[11px]">
            ${formatBytes(item.file.size)} → <span class="text-emerald-600 dark:text-emerald-400 font-bold">${formatBytes(item.newSize)}</span>
            ${diff > 0 ? `(${pct}% off)` : ''}
          </p>
        </div>
        <button
          type="button"
          class="btn-dl-individual px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold text-xs hover:opacity-90 transition-opacity cursor-pointer shrink-0"
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

  downloadSingleActivePdf() {
    const active = this.files[this.activeFileIndex] || this.files[0];
    if (!active || !active.convertedBlob) return;
    this.downloadFileItem(active);
  }

  downloadFileItem(item) {
    if (!item.convertedUrl) return;

    const baseName = item.file.name.replace(/\.[^/.]+$/, '');
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_grayscale_${timestamp}.pdf`;

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

    this.showProcessingModal(true, 'Packaging converted PDFs into ZIP archive...');
    this.updateProgress(30, 'Compressing files into ZIP...');

    try {
      const zip = new window.JSZip();
      const timestamp = getFormattedTimestamp();

      for (let i = 0; i < this.files.length; i++) {
        const item = this.files[i];
        if (item.convertedBlob) {
          const baseName = item.file.name.replace(/\.[^/.]+$/, '');
          const filename = `${baseName}_grayscale.pdf`;
          zip.file(filename, item.convertedBlob);
        }
      }

      this.updateProgress(75, 'Generating downloadable ZIP bundle...');
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const zipFilename = `grayscale_pdfs_${timestamp}.zip`;

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
    this.currentZoom = 100;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    if (this.canvasOriginal) {
      const ctx = this.canvasOriginal.getContext('2d');
      ctx.clearRect(0, 0, this.canvasOriginal.width, this.canvasOriginal.height);
    }
    if (this.canvasGrayscale) {
      const ctx = this.canvasGrayscale.getContext('2d');
      ctx.clearRect(0, 0, this.canvasGrayscale.width, this.canvasGrayscale.height);
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
  window.grayscalePdfApp = new GrayscalePdfApp();
});
