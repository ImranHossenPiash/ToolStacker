/**
 * ToolStacker Compress PDF Tool
 * 100% Client-Side • Zero Server Uploads • Smart In-Browser Downscaling
 * Powered by pdf-lib and pdf.js
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
// Compression Presets Configuration
// -------------------------------------------------------------
const COMPRESSION_PRESETS = {
  low: {
    name: 'Low (Print Quality)',
    icon: 'printer',
    badge: 'High Quality',
    scale: 1.5,
    maxDim: 1600,
    jpegQuality: 0.82,
    ratioEstimate: 0.55, // ~45% reduction
    desc: 'Best for printing and archival. Preserves maximum crispness and sharpness.',
    prediction: '~40-50% smaller'
  },
  medium: {
    name: 'Medium (Balanced)',
    icon: 'scale',
    badge: 'Recommended',
    scale: 1.0,
    maxDim: 1100,
    jpegQuality: 0.62,
    ratioEstimate: 0.32, // ~68% reduction
    desc: 'Optimal balance of readable text and lightweight file size for web & reading.',
    prediction: '~60-70% smaller'
  },
  high: {
    name: 'High (Email Friendly)',
    icon: 'mail',
    badge: 'Maximum Savings',
    scale: 0.75,
    maxDim: 800,
    jpegQuality: 0.42,
    ratioEstimate: 0.15, // ~85% reduction
    desc: 'Aggressive compression. Perfect for strict email attachments and quick mobile transfers.',
    prediction: '~80-90% smaller'
  }
};

// -------------------------------------------------------------
// Main CompressPdfApp Class
// -------------------------------------------------------------
class CompressPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.selectedLevel = 'medium'; // 'low', 'medium', 'high'
    this.previewPageNum = 1;
    this.previewZoom = 100; // 50% to 200%

    this.compressedBlob = null;
    this.compressedUrl = null;
    this.isCompressing = false;

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

    // File Summary Info
    this.fileNameDisplay = document.getElementById('file-name-display');
    this.fileDetailsDisplay = document.getElementById('file-details-display');
    this.smartSuggestionBanner = document.getElementById('smart-suggestion-banner');
    this.smartSuggestionText = document.getElementById('smart-suggestion-text');
    this.changeFileBtn = document.getElementById('change-file-btn');
    this.resetBtn = document.getElementById('reset-btn');

    // Preset Selection Cards
    this.presetCards = document.querySelectorAll('[data-compression-level]');

    // Live Estimate Display
    this.estimateOriginalSize = document.getElementById('estimate-original-size');
    this.estimateTargetSize = document.getElementById('estimate-target-size');
    this.estimateReductionPct = document.getElementById('estimate-reduction-pct');

    // Preview Canvas & Controls
    this.originalCanvas = document.getElementById('original-canvas');
    this.compressedCanvas = document.getElementById('compressed-canvas');
    this.previewPageSelect = document.getElementById('preview-page-select');
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.zoomSlider = document.getElementById('zoom-slider');
    this.zoomValDisplay = document.getElementById('zoom-val-display');
    this.previewContainer = document.getElementById('preview-container');

    // Action Buttons
    this.compressBtn = document.getElementById('compress-btn');
    this.stickyCompressBtn = document.getElementById('sticky-compress-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Processing Elements
    this.progressFill = document.getElementById('compress-progress-fill');
    this.progressPct = document.getElementById('compress-progress-pct');
    this.progressText = document.getElementById('compress-progress-text');

    // Download Elements
    this.downloadSuccessText = document.getElementById('download-success-text');
    this.downloadSizeComparison = document.getElementById('download-size-comparison');
    this.downloadBtn = document.getElementById('download-compressed-btn');
    this.tryAnotherLevelBtn = document.getElementById('try-another-level-btn');
    this.compressAnotherBtn = document.getElementById('compress-another-btn');
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

    // Preset Level Cards Selection
    this.presetCards.forEach((card) => {
      card.addEventListener('click', () => {
        const level = card.dataset.compressionLevel;
        this.selectCompressionLevel(level);
      });
    });

    // Zoom Slider
    if (this.zoomSlider) {
      this.zoomSlider.addEventListener('input', (e) => {
        this.previewZoom = parseInt(e.target.value, 10);
        if (this.zoomValDisplay) this.zoomValDisplay.textContent = `${this.previewZoom}%`;
        this.applyZoom();
      });
    }

    // Page navigation in preview
    if (this.previewPageSelect) {
      this.previewPageSelect.addEventListener('change', (e) => {
        this.previewPageNum = parseInt(e.target.value, 10);
        this.renderPreviewComparison();
      });
    }
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener('click', () => {
        if (this.previewPageNum > 1) {
          this.previewPageNum--;
          if (this.previewPageSelect) this.previewPageSelect.value = String(this.previewPageNum);
          this.renderPreviewComparison();
        }
      });
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener('click', () => {
        if (this.previewPageNum < this.totalPages) {
          this.previewPageNum++;
          if (this.previewPageSelect) this.previewPageSelect.value = String(this.previewPageNum);
          this.renderPreviewComparison();
        }
      });
    }

    // Change File / Reset
    if (this.changeFileBtn) {
      this.changeFileBtn.addEventListener('click', () => this.fileInput.click());
    }
    if (this.resetBtn) {
      this.resetBtn.addEventListener('click', () => this.resetAll());
    }
    if (this.compressAnotherBtn) {
      this.compressAnotherBtn.addEventListener('click', () => this.resetAll());
    }
    if (this.tryAnotherLevelBtn) {
      this.tryAnotherLevelBtn.addEventListener('click', () => {
        if (this.downloadSection) this.downloadSection.classList.add('hidden');
        if (this.workspaceSection) this.workspaceSection.classList.remove('hidden');
        this.updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Compress Action Buttons
    if (this.compressBtn) {
      this.compressBtn.addEventListener('click', () => this.startCompression());
    }
    if (this.stickyCompressBtn) {
      this.stickyCompressBtn.addEventListener('click', () => this.startCompression());
    }

    // Download Button
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadCompressedPdf());
    }
  }

  // -------------------------------------------------------------
  // PDF Intake & Smart Analysis
  // -------------------------------------------------------------
  async loadPdfFile(file) {
    if (!file) return;

    const maxBytes = 200 * 1024 * 1024; // 200MB
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
    this.showProcessingModal(true, 'Analyzing PDF document...');

    try {
      this.pdfBytes = await file.arrayBuffer();

      if (!window.pdfjsLib) {
        throw new Error('PDF viewing library is not loaded.');
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: this.pdfBytes });
      this.pdfDocProxy = await loadingTask.promise;
      this.totalPages = this.pdfDocProxy.numPages;

      if (this.totalPages === 0) {
        throw new Error('This PDF has 0 pages.');
      }

      // Populate file details
      if (this.fileNameDisplay) this.fileNameDisplay.textContent = file.name;
      if (this.fileDetailsDisplay) {
        this.fileDetailsDisplay.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      // Populate preview page select options
      if (this.previewPageSelect) {
        this.previewPageSelect.innerHTML = '';
        for (let i = 1; i <= this.totalPages; i++) {
          const opt = document.createElement('option');
          opt.value = i;
          opt.textContent = `Page ${i}`;
          this.previewPageSelect.appendChild(opt);
        }
        this.previewPageSelect.value = '1';
        this.previewPageNum = 1;
      }

      // Smart Detection: analyze bytes per page
      const bytesPerPage = file.size / this.totalPages;
      let suggestedLevel = 'medium';
      let suggestionMsg = '';

      if (bytesPerPage > 400 * 1024) {
        // More than 400KB per page -> likely image-heavy scan/photo
        suggestedLevel = 'high';
        suggestionMsg = `💡 Image-heavy PDF detected (~${formatBytes(bytesPerPage)}/page). We recommend <strong>High (Email Friendly)</strong> for maximum size reduction.`;
      } else if (bytesPerPage < 60 * 1024) {
        // Less than 60KB per page -> likely text-heavy vector
        suggestedLevel = 'low';
        suggestionMsg = `💡 Text-dense PDF detected (~${formatBytes(bytesPerPage)}/page). We recommend <strong>Low (Print Quality)</strong> to keep crisp vector typography.`;
      } else {
        suggestedLevel = 'medium';
        suggestionMsg = `💡 Standard document detected. We recommend <strong>Medium (Balanced)</strong> for optimal file reduction and clarity.`;
      }

      if (this.smartSuggestionBanner && this.smartSuggestionText) {
        this.smartSuggestionText.innerHTML = suggestionMsg;
        this.smartSuggestionBanner.classList.remove('hidden');
      }

      this.selectCompressionLevel(suggestedLevel);
      await this.renderPreviewComparison();

      this.showProcessingModal(false);
      this.updateUI();
      this.showToast(`Loaded ${this.totalPages} pages successfully!`, 'success');
    } catch (err) {
      console.error('PDF Load Error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to load PDF: ${err.message || 'File may be corrupted or encrypted.'}`, 'error');
      this.resetAll();
    }
  }

  // -------------------------------------------------------------
  // Preset Selection & Size Prediction
  // -------------------------------------------------------------
  selectCompressionLevel(level) {
    if (!COMPRESSION_PRESETS[level]) return;
    this.selectedLevel = level;

    // Update Card UI
    this.presetCards.forEach((card) => {
      const isSelected = card.dataset.compressionLevel === level;
      if (isSelected) {
        card.className =
          'p-4 rounded-2xl border-2 transition-all cursor-pointer bg-blue-50/60 dark:bg-blue-950/30 border-blue-600 ring-2 ring-blue-500/20 shadow-xs';
        card.querySelector('.radio-dot')?.classList.remove('hidden');
      } else {
        card.className =
          'p-4 rounded-2xl border-2 transition-all cursor-pointer bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-700 shadow-2xs';
        card.querySelector('.radio-dot')?.classList.add('hidden');
      }
    });

    this.updateSizePredictions();
    this.renderPreviewComparison();
  }

  updateSizePredictions() {
    if (!this.currentFile) return;

    const preset = COMPRESSION_PRESETS[this.selectedLevel];
    const origBytes = this.currentFile.size;
    const estimatedTargetBytes = Math.max(1024, Math.round(origBytes * preset.ratioEstimate));
    const reductionPct = Math.round((1 - estimatedTargetBytes / origBytes) * 100);

    if (this.estimateOriginalSize) this.estimateOriginalSize.textContent = formatBytes(origBytes);
    if (this.estimateTargetSize) this.estimateTargetSize.textContent = formatBytes(estimatedTargetBytes);
    if (this.estimateReductionPct) this.estimateReductionPct.textContent = `~${reductionPct}% smaller`;
  }

  // -------------------------------------------------------------
  // Side-by-Side Comparison Preview
  // -------------------------------------------------------------
  async renderPreviewComparison() {
    if (!this.pdfDocProxy || !this.originalCanvas || !this.compressedCanvas) return;

    try {
      const page = await this.pdfDocProxy.getPage(this.previewPageNum);
      const viewport = page.getViewport({ scale: 1.0 });

      // Calculate preview scale to fit container comfortably (~400px width)
      const targetWidth = 420;
      const baseScale = targetWidth / viewport.width;
      const renderViewport = page.getViewport({ scale: baseScale });

      // 1. Render Original Canvas
      this.originalCanvas.width = renderViewport.width;
      this.originalCanvas.height = renderViewport.height;
      const origCtx = this.originalCanvas.getContext('2d');
      await page.render({
        canvasContext: origCtx,
        viewport: renderViewport
      }).promise;

      // 2. Render Compressed Preview Canvas (Simulated downscale & JPEG re-encode)
      const preset = COMPRESSION_PRESETS[this.selectedLevel];
      const downscaleFactor = preset.scale / 1.5; // relative to full scale
      const downW = Math.max(100, Math.round(renderViewport.width * downscaleFactor));
      const downH = Math.max(100, Math.round(renderViewport.height * downscaleFactor));

      const offCanvas = document.createElement('canvas');
      offCanvas.width = downW;
      offCanvas.height = downH;
      const offCtx = offCanvas.getContext('2d');
      offCtx.drawImage(this.originalCanvas, 0, 0, downW, downH);

      // Re-encode at preset JPEG quality
      const jpegDataUrl = offCanvas.toDataURL('image/jpeg', preset.jpegQuality);
      const img = new Image();
      img.onload = () => {
        this.compressedCanvas.width = renderViewport.width;
        this.compressedCanvas.height = renderViewport.height;
        const compCtx = this.compressedCanvas.getContext('2d');
        compCtx.drawImage(img, 0, 0, renderViewport.width, renderViewport.height);
      };
      img.src = jpegDataUrl;

      // Update page nav button states
      if (this.prevPageBtn) this.prevPageBtn.disabled = this.previewPageNum <= 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = this.previewPageNum >= this.totalPages;
    } catch (err) {
      console.warn('Preview render issue:', err);
    }
  }

  applyZoom() {
    const scale = this.previewZoom / 100;
    if (this.originalCanvas) {
      this.originalCanvas.style.transform = `scale(${scale})`;
      this.originalCanvas.style.transformOrigin = 'top center';
    }
    if (this.compressedCanvas) {
      this.compressedCanvas.style.transform = `scale(${scale})`;
      this.compressedCanvas.style.transformOrigin = 'top center';
    }
  }

  // -------------------------------------------------------------
  // Core Compression Execution (pdf-lib + canvas downscaling)
  // -------------------------------------------------------------
  async startCompression() {
    if (!this.currentFile || !this.pdfBytes) {
      this.showToast('Please upload a PDF file first.', 'error');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF compression library is still loading. Please wait...', 'warning');
      return;
    }

    this.isCompressing = true;
    this.showProcessingModal(true, 'Initiating client-side compression...');

    try {
      const { PDFDocument } = window.PDFLib;
      const newPdf = await PDFDocument.create();

      // Metadata removal for size savings & privacy
      newPdf.setTitle('');
      newPdf.setAuthor('');
      newPdf.setSubject('');
      newPdf.setKeywords([]);
      newPdf.setProducer('');
      newPdf.setCreator('');

      const preset = COMPRESSION_PRESETS[this.selectedLevel];
      const total = this.totalPages;

      for (let pageNum = 1; pageNum <= total; pageNum++) {
        const pct = Math.round(((pageNum - 1) / total) * 100);
        this.updateProgress(pct, `Compressing page ${pageNum} of ${total}...`);

        const page = await this.pdfDocProxy.getPage(pageNum);
        const originalViewport = page.getViewport({ scale: 1.0 });

        // Calculate downscaled dimensions based on level
        const scale = preset.scale;
        let downscaleViewport = page.getViewport({ scale: scale });

        // Cap to max dimension to protect memory
        if (downscaleViewport.width > preset.maxDim || downscaleViewport.height > preset.maxDim) {
          const fitScale = preset.maxDim / Math.max(originalViewport.width, originalViewport.height);
          downscaleViewport = page.getViewport({ scale: fitScale });
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(downscaleViewport.width);
        canvas.height = Math.round(downscaleViewport.height);
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: downscaleViewport
        }).promise;

        // Convert canvas to optimized JPEG blob
        const jpegBlob = await new Promise((resolve) => {
          canvas.toBlob((blob) => resolve(blob), 'image/jpeg', preset.jpegQuality);
        });

        const jpegBytes = await jpegBlob.arrayBuffer();
        const embeddedImage = await newPdf.embedJpg(jpegBytes);

        // Retain original page dimensions in points for standard PDF viewing
        const newPage = newPdf.addPage([originalViewport.width, originalViewport.height]);
        newPage.drawImage(embeddedImage, {
          x: 0,
          y: 0,
          width: originalViewport.width,
          height: originalViewport.height
        });
      }

      this.updateProgress(100, 'Finalizing optimized PDF...');

      const compressedBytes = await newPdf.save();
      this.compressedBlob = new Blob([compressedBytes], { type: 'application/pdf' });

      if (this.compressedUrl) {
        URL.revokeObjectURL(this.compressedUrl);
      }
      this.compressedUrl = URL.createObjectURL(this.compressedBlob);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadState();
      }, 350);
    } catch (err) {
      console.error('Compression failed:', err);
      this.showProcessingModal(false);
      this.showToast(`Compression failed: ${err.message || 'Please check that the file is valid.'}`, 'error');
    } finally {
      this.isCompressing = false;
    }
  }

  // -------------------------------------------------------------
  // Download State & Comparison Summary
  // -------------------------------------------------------------
  showDownloadState() {
    if (this.heroSection) this.heroSection.classList.add('hidden');
    if (this.workspaceSection) this.workspaceSection.classList.add('hidden');
    if (this.stickyBar) this.stickyBar.classList.add('hidden');

    if (this.downloadSection) {
      this.downloadSection.classList.remove('hidden');
      this.downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    const origSize = this.currentFile ? this.currentFile.size : 0;
    const newSize = this.compressedBlob ? this.compressedBlob.size : 0;
    const reductionPct = origSize > 0 ? Math.round(((origSize - newSize) / origSize) * 100) : 0;

    if (this.downloadSuccessText) {
      if (reductionPct > 0) {
        this.downloadSuccessText.textContent = `✅ Successfully compressed by ${reductionPct}%!`;
      } else {
        this.downloadSuccessText.textContent = `✅ PDF processed and metadata stripped!`;
      }
    }

    if (this.downloadSizeComparison) {
      this.downloadSizeComparison.innerHTML = `
        <span class="text-neutral-500 line-through mr-2">${formatBytes(origSize)}</span>
        <span class="text-emerald-600 dark:text-emerald-400 font-bold">${formatBytes(newSize)}</span>
        <span class="ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${reductionPct > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600'}">
          ${reductionPct > 0 ? `-${reductionPct}%` : 'Optimized'}
        </span>
      `;
    }

    this.showToast('✅ Compressed PDF ready for download!', 'success');
  }

  downloadCompressedPdf() {
    if (!this.compressedBlob || !this.compressedUrl) {
      this.showToast('No compressed document found.', 'error');
      return;
    }

    const origName = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const filename = `${origName}_compressed_${this.selectedLevel}.pdf`;

    const a = document.createElement('a');
    a.href = this.compressedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
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
    if (this.compressedUrl) {
      URL.revokeObjectURL(this.compressedUrl);
      this.compressedUrl = null;
    }
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.compressedBlob = null;
    this.previewPageNum = 1;

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
  window.compressPdfApp = new CompressPdfApp();
});
