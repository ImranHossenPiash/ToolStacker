/**
 * ToolStacker PDF ↔ Image Converter
 * 100% Client-Side • Zero Server Uploads • Two-Way Conversion
 * Powered by pdf.js, jsPDF, and JSZip
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
// Main PdfImageConverterApp Class
// -------------------------------------------------------------
class PdfImageConverterApp {
  constructor() {
    this.activeMode = 'pdf-to-img'; // 'pdf-to-img' | 'img-to-pdf'
    
    // PDF to Image State
    this.pdfFiles = []; // List of { file, name, size, totalPages, pages: [{ num, dataUrl }] }
    this.pdfFormat = 'png'; // 'png' | 'jpeg' | 'webp'
    this.pdfDpi = 150; // 72 | 150 | 300
    this.pdfQuality = 0.90; // 0.01 - 1.0
    this.pdfConvertedImages = []; // List of { filename, blob, url, size }

    // Image to PDF State
    this.imageFiles = []; // List of { id, file, name, size, dataUrl, width, height }
    this.pageSize = 'a4'; // 'a4' | 'letter' | 'custom'
    this.pageOrientation = 'portrait'; // 'portrait' | 'landscape'
    this.pageMargin = 10; // 0 - 50 mm
    this.generatedPdfBlob = null;
    this.generatedPdfUrl = null;
    this.draggedImageIndex = null;

    this.cacheDom();
    this.bindEvents();
    this.updateUI();
  }

  cacheDom() {
    // Top Tabs
    this.tabPdfToImg = document.getElementById('tab-pdf-to-img');
    this.tabImgToPdf = document.getElementById('tab-img-to-pdf');
    this.panelPdfToImg = document.getElementById('panel-pdf-to-img');
    this.panelImgToPdf = document.getElementById('panel-img-to-pdf');

    // ----------------- PDF to Image DOM -----------------
    this.pdfDropzone = document.getElementById('pdf-dropzone');
    this.pdfFileInput = document.getElementById('pdf-file-input');
    this.pdfBrowseBtn = document.getElementById('pdf-browse-btn');
    this.pdfWorkspace = document.getElementById('pdf-workspace');
    this.pdfSummary = document.getElementById('pdf-summary-text');
    this.pdfResetBtn = document.getElementById('pdf-reset-btn');
    this.pdfPreviewGrid = document.getElementById('pdf-preview-grid');

    // PDF to Image Settings
    this.formatRadios = document.querySelectorAll('input[name="pdf-img-format"]');
    this.dpiRadios = document.querySelectorAll('input[name="pdf-img-dpi"]');
    this.qualitySlider = document.getElementById('pdf-quality-slider');
    this.qualityValDisplay = document.getElementById('pdf-quality-val');
    this.qualityContainer = document.getElementById('pdf-quality-container');
    this.convertPdfBtn = document.getElementById('convert-pdf-btn');

    // PDF to Image Results
    this.pdfDownloadSection = document.getElementById('pdf-download-section');
    this.pdfDownloadZipBtn = document.getElementById('pdf-download-zip-btn');
    this.pdfResultsList = document.getElementById('pdf-results-list');
    this.convertMorePdfBtn = document.getElementById('convert-more-pdf-btn');

    // ----------------- Image to PDF DOM -----------------
    this.imgDropzone = document.getElementById('img-dropzone');
    this.imgFileInput = document.getElementById('img-file-input');
    this.imgBrowseBtn = document.getElementById('img-browse-btn');
    this.imgAddMoreInput = document.getElementById('img-add-more-input');
    this.imgAddMoreBtn = document.getElementById('img-add-more-btn');
    this.imgWorkspace = document.getElementById('img-workspace');
    this.imgSummary = document.getElementById('img-summary-text');
    this.imgResetBtn = document.getElementById('img-reset-btn');
    this.imgCardsContainer = document.getElementById('img-cards-container');

    // Image to PDF Settings
    this.pageSizeSelect = document.getElementById('img-page-size');
    this.customSizeInputs = document.getElementById('custom-size-inputs');
    this.customWidthInput = document.getElementById('custom-page-width');
    this.customHeightInput = document.getElementById('custom-page-height');
    this.orientationRadios = document.querySelectorAll('input[name="img-orientation"]');
    this.marginSlider = document.getElementById('img-margin-slider');
    this.marginValDisplay = document.getElementById('img-margin-val');
    this.convertImgBtn = document.getElementById('convert-img-btn');

    // Image to PDF Results
    this.imgDownloadSection = document.getElementById('img-download-section');
    this.downloadPdfBtn = document.getElementById('download-pdf-btn');
    this.pdfSizeBadge = document.getElementById('generated-pdf-size');
    this.convertMoreImgBtn = document.getElementById('convert-more-img-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('converter-progress-fill');
    this.progressPct = document.getElementById('converter-progress-pct');
    this.progressText = document.getElementById('converter-progress-text');
  }

  bindEvents() {
    // Mode Switch Tabs
    this.tabPdfToImg.addEventListener('click', () => this.switchMode('pdf-to-img'));
    this.tabImgToPdf.addEventListener('click', () => this.switchMode('img-to-pdf'));

    // ----------------- PDF to Image Events -----------------
    if (this.pdfDropzone && this.pdfFileInput) {
      this.pdfDropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#pdf-browse-btn')) {
          this.pdfFileInput.click();
        }
      });

      this.pdfDropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.pdfFileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach((evt) => {
        this.pdfDropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.pdfDropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach((evt) => {
        this.pdfDropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.pdfDropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.pdfDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
          this.handlePdfFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    if (this.pdfBrowseBtn && this.pdfFileInput) {
      this.pdfBrowseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.pdfFileInput.click();
      });
    }

    if (this.pdfFileInput) {
      this.pdfFileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.handlePdfFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      });
    }

    // Format selection
    this.formatRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        this.pdfFormat = e.target.value;
        const isLossless = this.pdfFormat === 'png';
        if (this.qualityContainer) {
          this.qualityContainer.classList.toggle('opacity-40', isLossless);
          this.qualityContainer.classList.toggle('pointer-events-none', isLossless);
        }
      });
    });

    // DPI selection
    this.dpiRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        this.pdfDpi = parseInt(e.target.value, 10);
      });
    });

    // Quality slider
    if (this.qualitySlider) {
      this.qualitySlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        this.pdfQuality = val / 100;
        if (this.qualityValDisplay) this.qualityValDisplay.textContent = `${val}%`;
      });
    }

    // Convert PDF button
    if (this.convertPdfBtn) {
      this.convertPdfBtn.addEventListener('click', () => this.startPdfToImageConversion());
    }

    // PDF Reset & Convert More
    if (this.pdfResetBtn) {
      this.pdfResetBtn.addEventListener('click', () => this.resetPdfMode());
    }
    if (this.convertMorePdfBtn) {
      this.convertMorePdfBtn.addEventListener('click', () => this.resetPdfMode());
    }
    if (this.pdfDownloadZipBtn) {
      this.pdfDownloadZipBtn.addEventListener('click', () => this.downloadAllImagesZip());
    }

    // ----------------- Image to PDF Events -----------------
    if (this.imgDropzone && this.imgFileInput) {
      this.imgDropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#img-browse-btn')) {
          this.imgFileInput.click();
        }
      });

      this.imgDropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.imgFileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach((evt) => {
        this.imgDropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.imgDropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach((evt) => {
        this.imgDropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.imgDropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.imgDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files) {
          this.handleImageFiles(Array.from(e.dataTransfer.files));
        }
      });
    }

    if (this.imgBrowseBtn && this.imgFileInput) {
      this.imgBrowseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.imgFileInput.click();
      });
    }

    if (this.imgFileInput) {
      this.imgFileInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.handleImageFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      });
    }

    if (this.imgAddMoreBtn && this.imgAddMoreInput) {
      this.imgAddMoreBtn.addEventListener('click', () => this.imgAddMoreInput.click());
      this.imgAddMoreInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.handleImageFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      });
    }

    // Page Size & Orientation settings
    if (this.pageSizeSelect) {
      this.pageSizeSelect.addEventListener('change', (e) => {
        this.pageSize = e.target.value;
        if (this.customSizeInputs) {
          this.customSizeInputs.classList.toggle('hidden', this.pageSize !== 'custom');
        }
      });
    }

    this.orientationRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        this.pageOrientation = e.target.value;
      });
    });

    if (this.marginSlider) {
      this.marginSlider.addEventListener('input', (e) => {
        this.pageMargin = parseInt(e.target.value, 10);
        if (this.marginValDisplay) this.marginValDisplay.textContent = `${this.pageMargin} mm`;
      });
    }

    // Convert Images to PDF button
    if (this.convertImgBtn) {
      this.convertImgBtn.addEventListener('click', () => this.startImageToPdfConversion());
    }

    // Image to PDF Reset & Download
    if (this.imgResetBtn) {
      this.imgResetBtn.addEventListener('click', () => this.resetImageMode());
    }
    if (this.convertMoreImgBtn) {
      this.convertMoreImgBtn.addEventListener('click', () => this.resetImageMode());
    }
    if (this.downloadPdfBtn) {
      this.downloadPdfBtn.addEventListener('click', () => this.downloadGeneratedPdf());
    }
  }

  // -------------------------------------------------------------
  // Mode Switching
  // -------------------------------------------------------------
  switchMode(mode) {
    this.activeMode = mode;
    const isPdfToImg = mode === 'pdf-to-img';

    // Tabs UI
    this.tabPdfToImg.classList.toggle('bg-blue-600', isPdfToImg);
    this.tabPdfToImg.classList.toggle('text-white', isPdfToImg);
    this.tabPdfToImg.classList.toggle('shadow-xs', isPdfToImg);
    this.tabPdfToImg.classList.toggle('text-neutral-600', !isPdfToImg);
    this.tabPdfToImg.classList.toggle('dark:text-neutral-300', !isPdfToImg);

    this.tabImgToPdf.classList.toggle('bg-blue-600', !isPdfToImg);
    this.tabImgToPdf.classList.toggle('text-white', !isPdfToImg);
    this.tabImgToPdf.classList.toggle('shadow-xs', !isPdfToImg);
    this.tabImgToPdf.classList.toggle('text-neutral-600', isPdfToImg);
    this.tabImgToPdf.classList.toggle('dark:text-neutral-300', isPdfToImg);

    // Panels
    this.panelPdfToImg.classList.toggle('hidden', !isPdfToImg);
    this.panelImgToPdf.classList.toggle('hidden', isPdfToImg);
  }

  // -------------------------------------------------------------
  // PDF to Image Logic
  // -------------------------------------------------------------
  async handlePdfFiles(files) {
    const validPdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf');
    if (validPdfs.length === 0) {
      this.showToast('Please select valid PDF documents.', 'error');
      return;
    }

    this.showProcessingModal(true, 'Reading PDF pages...');

    for (const file of validPdfs) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const doc = await loadingTask.promise;
        const totalPages = doc.numPages;

        const pdfItem = {
          file: file,
          name: file.name,
          size: file.size,
          totalPages: totalPages,
          docProxy: doc,
          firstPageThumb: null
        };

        // Render first page thumbnail for preview
        const firstPage = await doc.getPage(1);
        const vp = firstPage.getViewport({ scale: 1.0 });
        const scale = 160 / vp.width;
        const thumbVp = firstPage.getViewport({ scale: scale });

        const canvas = document.createElement('canvas');
        canvas.width = thumbVp.width;
        canvas.height = thumbVp.height;
        const ctx = canvas.getContext('2d');
        await firstPage.render({ canvasContext: ctx, viewport: thumbVp }).promise;

        pdfItem.firstPageThumb = canvas.toDataURL('image/jpeg', 0.8);
        this.pdfFiles.push(pdfItem);
      } catch (err) {
        console.warn('PDF Read failure:', file.name, err);
        this.showToast(`Could not load "${file.name}".`, 'error');
      }
    }

    this.showProcessingModal(false);
    this.renderPdfWorkspace();
  }

  renderPdfWorkspace() {
    const hasFiles = this.pdfFiles.length > 0;
    if (this.pdfDropzone) this.pdfDropzone.classList.toggle('hidden', hasFiles);
    if (this.pdfWorkspace) this.pdfWorkspace.classList.toggle('hidden', !hasFiles);

    if (this.pdfSummary) {
      const totalPages = this.pdfFiles.reduce((acc, p) => acc + p.totalPages, 0);
      this.pdfSummary.textContent = `${this.pdfFiles.length} PDF${this.pdfFiles.length === 1 ? '' : 's'} (${totalPages} total pages)`;
    }

    if (this.pdfPreviewGrid) {
      this.pdfPreviewGrid.innerHTML = '';
      this.pdfFiles.forEach((p, idx) => {
        const card = document.createElement('div');
        card.className =
          'p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center gap-3 relative';
        card.innerHTML = `
          <div class="w-14 h-18 rounded-xl bg-neutral-100 dark:bg-neutral-950 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
            ${p.firstPageThumb ? `<img src="${p.firstPageThumb}" alt="Thumbnail" class="w-full h-full object-contain" />` : '<i data-lucide="file-text" class="w-6 h-6 text-neutral-400"></i>'}
          </div>
          <div class="flex-1 min-w-0 pr-2">
            <h4 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate" title="${p.name}">
              ${p.name}
            </h4>
            <div class="flex items-center gap-2 mt-1 text-xs text-neutral-500">
              <span class="font-bold text-blue-600 dark:text-blue-400">${p.totalPages} pages</span>
              <span>•</span>
              <span class="font-mono">${formatBytes(p.size)}</span>
            </div>
          </div>
          <button type="button" class="remove-pdf-btn p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer" title="Remove">
            <i data-lucide="x" class="w-4 h-4"></i>
          </button>
        `;

        card.querySelector('.remove-pdf-btn')?.addEventListener('click', () => {
          this.pdfFiles.splice(idx, 1);
          this.renderPdfWorkspace();
        });

        this.pdfPreviewGrid.appendChild(card);
      });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  async startPdfToImageConversion() {
    if (this.pdfFiles.length === 0) return;

    this.showProcessingModal(true, 'Converting PDF pages to images...');
    this.pdfConvertedImages = [];

    // Scale calculation based on DPI: 72 DPI = 1.0x, 150 DPI = 2.08x, 300 DPI = 4.16x
    let scaleMultiplier = 1.0;
    if (this.pdfDpi === 150) scaleMultiplier = 2.083;
    else if (this.pdfDpi === 300) scaleMultiplier = 4.166;

    const mimeType = this.pdfFormat === 'png' ? 'image/png' : this.pdfFormat === 'webp' ? 'image/webp' : 'image/jpeg';
    const totalPagesAcrossAll = this.pdfFiles.reduce((acc, p) => acc + p.totalPages, 0);
    let processedCount = 0;

    try {
      for (const pdfItem of this.pdfFiles) {
        const baseName = pdfItem.name.replace(/\.[^/.]+$/, '');
        for (let pageNum = 1; pageNum <= pdfItem.totalPages; pageNum++) {
          processedCount++;
          const pct = Math.round((processedCount / totalPagesAcrossAll) * 100);
          this.updateProgress(pct, `Converting ${baseName} - Page ${pageNum} of ${pdfItem.totalPages}...`);

          const page = await pdfItem.docProxy.getPage(pageNum);
          const viewport = page.getViewport({ scale: scaleMultiplier });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');

          // White background for JPEG if transparency
          if (this.pdfFormat === 'jpeg') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          await page.render({ canvasContext: ctx, viewport: viewport }).promise;

          const qualityArg = this.pdfFormat === 'png' ? undefined : this.pdfQuality;
          const blob = await new Promise(resolve => canvas.toBlob(resolve, mimeType, qualityArg));
          const url = URL.createObjectURL(blob);

          const pageSuffix = String(pageNum).padStart(String(pdfItem.totalPages).length, '0');
          const filename = `${baseName}_page_${pageSuffix}.${this.pdfFormat}`;

          this.pdfConvertedImages.push({
            filename: filename,
            blob: blob,
            url: url,
            size: blob.size,
            width: canvas.width,
            height: canvas.height
          });
        }
      }

      this.updateProgress(100, 'All images ready!');
      setTimeout(() => {
        this.showProcessingModal(false);
        this.showPdfResults();
      }, 300);
    } catch (err) {
      console.error('PDF to Image error:', err);
      this.showProcessingModal(false);
      this.showToast(`Conversion failed: ${err.message}`, 'error');
    }
  }

  showPdfResults() {
    if (this.pdfWorkspace) this.pdfWorkspace.classList.add('hidden');
    if (this.pdfDownloadSection) this.pdfDownloadSection.classList.remove('hidden');

    if (this.pdfResultsList) {
      this.pdfResultsList.innerHTML = '';
      this.pdfConvertedImages.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className =
          'p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs flex items-center justify-between gap-3';
        item.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-950 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
              <img src="${img.url}" alt="Preview" class="w-full h-full object-contain" />
            </div>
            <div class="min-w-0">
              <h4 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">${img.filename}</h4>
              <p class="text-[11px] text-neutral-500 mt-0.5">${img.width} × ${img.height} px • <span class="font-mono">${formatBytes(img.size)}</span></p>
            </div>
          </div>
          <button type="button" class="download-single-btn px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shrink-0">
            Download
          </button>
        `;

        item.querySelector('.download-single-btn')?.addEventListener('click', () => {
          this.downloadSingleFile(img.url, img.filename);
        });

        this.pdfResultsList.appendChild(item);
      });
    }

    this.showToast(`Converted ${this.pdfConvertedImages.length} images!`, 'success');
  }

  async downloadAllImagesZip() {
    if (!this.pdfConvertedImages || this.pdfConvertedImages.length === 0) return;
    if (!window.JSZip) {
      this.showToast('ZIP packaging library loading...', 'warning');
      return;
    }

    this.showToast('Creating ZIP archive...', 'info');
    const zip = new window.JSZip();
    this.pdfConvertedImages.forEach((img) => {
      zip.file(img.filename, img.blob);
    });

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const zipUrl = URL.createObjectURL(zipBlob);
    this.downloadSingleFile(zipUrl, 'converted_pdf_images.zip');
    setTimeout(() => URL.revokeObjectURL(zipUrl), 30000);
  }

  resetPdfMode() {
    this.pdfFiles = [];
    this.pdfConvertedImages.forEach(img => {
      if (img.url) URL.revokeObjectURL(img.url);
    });
    this.pdfConvertedImages = [];
    if (this.pdfDownloadSection) this.pdfDownloadSection.classList.add('hidden');
    if (this.pdfWorkspace) this.pdfWorkspace.classList.add('hidden');
    if (this.pdfDropzone) this.pdfDropzone.classList.remove('hidden');
    if (this.pdfFileInput) this.pdfFileInput.value = '';
  }

  // -------------------------------------------------------------
  // Image to PDF Logic
  // -------------------------------------------------------------
  async handleImageFiles(files) {
    const validExts = ['png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg'];
    const validImages = files.filter(f => {
      const ext = (f.name.split('.').pop() || '').toLowerCase();
      return validExts.includes(ext) || f.type.startsWith('image/');
    });

    if (validImages.length === 0) {
      this.showToast('Please select valid images (PNG, JPG, WebP, etc.).', 'error');
      return;
    }

    for (const file of validImages) {
      const dataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.readAsDataURL(file);
      });

      const dimensions = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 800, height: 600 });
        img.src = dataUrl;
      });

      this.imageFiles.push({
        id: 'img_' + Math.random().toString(36).substr(2, 9),
        file: file,
        name: file.name,
        size: file.size,
        dataUrl: dataUrl,
        width: dimensions.width,
        height: dimensions.height
      });
    }

    this.renderImageWorkspace();
  }

  renderImageWorkspace() {
    const hasFiles = this.imageFiles.length > 0;
    if (this.imgDropzone) this.imgDropzone.classList.toggle('hidden', hasFiles);
    if (this.imgWorkspace) this.imgWorkspace.classList.toggle('hidden', !hasFiles);

    if (this.imgSummary) {
      const totalBytes = this.imageFiles.reduce((acc, f) => acc + f.size, 0);
      this.imgSummary.textContent = `${this.imageFiles.length} image${this.imageFiles.length === 1 ? '' : 's'} (${formatBytes(totalBytes)})`;
    }

    if (this.imgCardsContainer) {
      this.imgCardsContainer.innerHTML = '';
      this.imageFiles.forEach((item, index) => {
        const card = document.createElement('div');
        card.className =
          'img-card group relative flex items-center gap-3 p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-blue-500/50 transition-all select-none';
        card.setAttribute('draggable', 'true');

        card.innerHTML = `
          <!-- Drag Handle -->
          <button type="button" class="drag-handle touch-manipulation p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-grab active:cursor-grabbing rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0" title="Drag to reorder">
            <i data-lucide="grip-vertical" class="w-5 h-5 pointer-events-none"></i>
          </button>

          <!-- Index Badge -->
          <span class="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
            ${index + 1}
          </span>

          <!-- Thumbnail -->
          <div class="w-16 h-16 rounded-xl bg-neutral-100 dark:bg-neutral-950 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
            <img src="${item.dataUrl}" alt="Preview" class="w-full h-full object-cover pointer-events-none" />
          </div>

          <!-- File Info -->
          <div class="flex-1 min-w-0 pr-2">
            <h4 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate" title="${item.name}">${item.name}</h4>
            <div class="flex items-center gap-2 mt-1 text-xs text-neutral-500 font-mono">
              <span>${item.width} × ${item.height}</span>
              <span>•</span>
              <span>${formatBytes(item.size)}</span>
            </div>
          </div>

          <!-- Controls: Move Up, Move Down, Delete -->
          <div class="flex items-center gap-1 shrink-0">
            <button type="button" class="btn-move-up p-2 min-w-[36px] min-h-[36px] rounded-xl text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer ${index === 0 ? 'opacity-30 pointer-events-none' : ''}" title="Move Up">
              <i data-lucide="arrow-up" class="w-4 h-4 pointer-events-none"></i>
            </button>
            <button type="button" class="btn-move-down p-2 min-w-[36px] min-h-[36px] rounded-xl text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer ${index === this.imageFiles.length - 1 ? 'opacity-30 pointer-events-none' : ''}" title="Move Down">
              <i data-lucide="arrow-down" class="w-4 h-4 pointer-events-none"></i>
            </button>
            <button type="button" class="btn-delete p-2 min-w-[36px] min-h-[36px] rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer" title="Remove">
              <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
            </button>
          </div>
        `;

        // Bind drag
        card.addEventListener('dragstart', (e) => {
          this.draggedImageIndex = index;
          card.classList.add('opacity-40');
          e.dataTransfer.effectAllowed = 'move';
        });

        card.addEventListener('dragend', () => {
          card.classList.remove('opacity-40');
          this.draggedImageIndex = null;
        });

        card.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
        });

        card.addEventListener('drop', (e) => {
          e.preventDefault();
          if (this.draggedImageIndex !== null && this.draggedImageIndex !== index) {
            const [moved] = this.imageFiles.splice(this.draggedImageIndex, 1);
            this.imageFiles.splice(index, 0, moved);
            this.renderImageWorkspace();
          }
        });

        card.querySelector('.btn-move-up')?.addEventListener('click', () => {
          if (index > 0) {
            const [moved] = this.imageFiles.splice(index, 1);
            this.imageFiles.splice(index - 1, 0, moved);
            this.renderImageWorkspace();
          }
        });

        card.querySelector('.btn-move-down')?.addEventListener('click', () => {
          if (index < this.imageFiles.length - 1) {
            const [moved] = this.imageFiles.splice(index, 1);
            this.imageFiles.splice(index + 1, 0, moved);
            this.renderImageWorkspace();
          }
        });

        card.querySelector('.btn-delete')?.addEventListener('click', () => {
          this.imageFiles.splice(index, 1);
          this.renderImageWorkspace();
        });

        this.imgCardsContainer.appendChild(card);
      });
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  async startImageToPdfConversion() {
    if (this.imageFiles.length === 0) return;

    this.showProcessingModal(true, 'Assembling PDF document...');

    try {
      const { jsPDF } = window.jspdf;
      
      // Determine page dimensions in mm
      let pageW = 210; // A4
      let pageH = 297;
      let format = 'a4';

      if (this.pageSize === 'letter') {
        pageW = 215.9;
        pageH = 279.4;
        format = 'letter';
      } else if (this.pageSize === 'custom') {
        pageW = parseFloat(this.customWidthInput?.value || 210);
        pageH = parseFloat(this.customHeightInput?.value || 297);
        format = [pageW, pageH];
      }

      const orientation = this.pageOrientation; // 'portrait' | 'landscape'
      if (orientation === 'landscape' && typeof format === 'string') {
        const temp = pageW;
        pageW = pageH;
        pageH = temp;
      }

      const margin = this.pageMargin; // mm
      const printableW = pageW - margin * 2;
      const printableH = pageH - margin * 2;

      const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: format
      });

      const total = this.imageFiles.length;
      for (let i = 0; i < total; i++) {
        if (i > 0) {
          doc.addPage(format, orientation);
        }

        const pct = Math.round(((i + 1) / total) * 100);
        this.updateProgress(pct, `Adding image ${i + 1} of ${total}...`);

        const item = this.imageFiles[i];

        // Calculate aspect ratio fit within printable area
        const imgRatio = item.width / item.height;
        const pageRatio = printableW / printableH;

        let renderW, renderH;
        if (imgRatio > pageRatio) {
          renderW = printableW;
          renderH = printableW / imgRatio;
        } else {
          renderH = printableH;
          renderW = printableH * imgRatio;
        }

        // Center on page
        const posX = margin + (printableW - renderW) / 2;
        const posY = margin + (printableH - renderH) / 2;

        const imgExt = item.name.toLowerCase().endsWith('.png') ? 'PNG' : 'JPEG';
        doc.addImage(item.dataUrl, imgExt, posX, posY, renderW, renderH, undefined, 'FAST');
      }

      this.updateProgress(100, 'Finalizing document...');

      const pdfOutput = doc.output('blob');
      this.generatedPdfBlob = pdfOutput;
      if (this.generatedPdfUrl) URL.revokeObjectURL(this.generatedPdfUrl);
      this.generatedPdfUrl = URL.createObjectURL(pdfOutput);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showImageResults();
      }, 300);
    } catch (err) {
      console.error('Image to PDF error:', err);
      this.showProcessingModal(false);
      this.showToast(`PDF generation failed: ${err.message}`, 'error');
    }
  }

  showImageResults() {
    if (this.imgWorkspace) this.imgWorkspace.classList.add('hidden');
    if (this.imgDownloadSection) this.imgDownloadSection.classList.remove('hidden');

    if (this.pdfSizeBadge && this.generatedPdfBlob) {
      this.pdfSizeBadge.textContent = formatBytes(this.generatedPdfBlob.size);
    }

    this.showToast('✅ PDF created successfully!', 'success');
  }

  downloadGeneratedPdf() {
    if (!this.generatedPdfBlob || !this.generatedPdfUrl) return;
    this.downloadSingleFile(this.generatedPdfUrl, 'combined_images.pdf');
  }

  resetImageMode() {
    this.imageFiles = [];
    if (this.generatedPdfUrl) URL.revokeObjectURL(this.generatedPdfUrl);
    this.generatedPdfBlob = null;
    this.generatedPdfUrl = null;
    if (this.imgDownloadSection) this.imgDownloadSection.classList.add('hidden');
    if (this.imgWorkspace) this.imgWorkspace.classList.add('hidden');
    if (this.imgDropzone) this.imgDropzone.classList.remove('hidden');
    if (this.imgFileInput) this.imgFileInput.value = '';
  }

  downloadSingleFile(url, filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  // -------------------------------------------------------------
  // Modal & Toast Utilities
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

  updateUI() {
    // Mode defaults
    this.switchMode(this.activeMode);
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
  window.pdfImageConverterApp = new PdfImageConverterApp();
});
