/**
 * ToolStacker Merge PDF Tool
 * 100% Client-Side • Zero Server Uploads • High Fidelity PDF Merging
 * Powered by pdf-lib, pdf.js, Mammoth.js, and SheetJS
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
// Helper: Generate Smart Filename (merged_YYYYMMDD_HHMM.pdf)
// -------------------------------------------------------------
function generateDefaultMergedFilename() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `merged_${yyyy}${mm}${dd}_${hh}${min}.pdf`;
}

// -------------------------------------------------------------
// Main MergePdfApp Class
// -------------------------------------------------------------
class MergePdfApp {
  constructor() {
    this.files = []; // List of file objects
    this.isMerging = false;
    this.mergedPdfBlob = null;
    this.mergedPdfUrl = null;
    this.draggedIndex = null;

    this.cacheDom();
    this.bindEvents();
    this.updateUI();
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');
    this.addMoreBtn = document.getElementById('add-more-btn');
    this.addMoreInput = document.getElementById('add-more-input');

    // Sections
    this.heroSection = document.getElementById('hero-section');
    this.workspaceSection = document.getElementById('workspace-section');
    this.fileCardsContainer = document.getElementById('file-cards-container');
    this.processingModal = document.getElementById('processing-modal');
    this.downloadSection = document.getElementById('download-section');

    // Summary & Actions
    this.totalFilesCount = document.getElementById('total-files-count');
    this.totalEstimatedSize = document.getElementById('total-estimated-size');
    this.mergeBtn = document.getElementById('merge-btn');
    this.stickyMergeBtn = document.getElementById('sticky-merge-btn');
    this.clearAllBtn = document.getElementById('clear-all-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Processing Elements
    this.progressFill = document.getElementById('merge-progress-fill');
    this.progressPct = document.getElementById('merge-progress-pct');
    this.progressText = document.getElementById('merge-progress-text');

    // Download Elements
    this.downloadBtn = document.getElementById('download-merged-btn');
    this.downloadSizeBadge = document.getElementById('download-size-badge');
    this.mergeMoreBtn = document.getElementById('merge-more-btn');
    this.customFilenameInput = document.getElementById('custom-filename-input');

    // Toast Container
    this.toastContainer = document.getElementById('toast-container');
  }

  bindEvents() {
    // Dropzone click & drag
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
        if (e.dataTransfer && e.dataTransfer.files) {
          this.handleFiles(Array.from(e.dataTransfer.files));
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
        if (e.target.files) {
          this.handleFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      });
    }

    // Add More Files Button
    if (this.addMoreBtn && this.addMoreInput) {
      this.addMoreBtn.addEventListener('click', () => {
        this.addMoreInput.click();
      });
      this.addMoreInput.addEventListener('change', (e) => {
        if (e.target.files) {
          this.handleFiles(Array.from(e.target.files));
          e.target.value = '';
        }
      });
    }

    // Global Paste (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      const files = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].kind === 'file') {
          const file = items[i].getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        this.handleFiles(files);
        this.showToast('Files added from clipboard!', 'info');
      }
    });

    // Merge Buttons
    if (this.mergeBtn) {
      this.mergeBtn.addEventListener('click', () => this.startMerge());
    }
    if (this.stickyMergeBtn) {
      this.stickyMergeBtn.addEventListener('click', () => this.startMerge());
    }

    // Clear All
    if (this.clearAllBtn) {
      this.clearAllBtn.addEventListener('click', () => this.clearAll());
    }

    // Download Merged PDF
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadMergedPdf());
    }

    // Merge More Files (Reset)
    if (this.mergeMoreBtn) {
      this.mergeMoreBtn.addEventListener('click', () => {
        this.downloadSection.classList.add('hidden');
        this.workspaceSection.classList.remove('hidden');
        this.updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (this.files.length >= 2 && !this.isMerging) {
          this.startMerge();
        }
      }
    });
  }

  // -------------------------------------------------------------
  // File Validation & Intake
  // -------------------------------------------------------------
  async handleFiles(incomingFiles) {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const allowedExtensions = ['pdf', 'png', 'jpg', 'jpeg', 'docx', 'xlsx'];
    const maxFiles = 20;
    const maxBytes = 100 * 1024 * 1024; // 100MB

    for (const file of incomingFiles) {
      if (this.files.length >= maxFiles) {
        this.showToast(`Maximum ${maxFiles} files allowed at a time.`, 'warning');
        break;
      }

      // Check empty file
      if (file.size === 0) {
        this.showToast(`"${file.name}" is empty (0 bytes). Please select a valid file.`, 'error');
        continue;
      }

      // Check file size > 100MB
      if (file.size > maxBytes) {
        this.showToast(`"${file.name}" exceeds 100MB limit.`, 'error');
        continue;
      }

      // Extension check
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        this.showToast(`Only PDF, PNG, JPG, DOCX, XLSX files are supported. "${file.name}" was skipped.`, 'error');
        continue;
      }

      // Duplicate check (by name and size)
      const isDuplicate = this.files.some(f => f.name === file.name && f.size === file.size);
      if (isDuplicate) {
        this.showToast(`"${file.name}" is already in the merge list.`, 'warning');
        continue;
      }

      // Create item object
      const item = {
        id: 'file_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now(),
        file: file,
        name: file.name,
        size: file.size,
        ext: ext,
        pageCount: null, // will be computed
        thumbnailUrl: null,
        isProcessingThumbnail: true,
        error: null
      };

      this.files.push(item);
      this.generatePreviewAndMetadata(item);
    }

    this.updateUI();
  }

  // -------------------------------------------------------------
  // Preview & Page Count Generator (PDF.js / Canvas)
  // -------------------------------------------------------------
  async generatePreviewAndMetadata(item) {
    try {
      if (item.ext === 'pdf') {
        const arrayBuffer = await item.file.arrayBuffer();
        if (!window.pdfjsLib) {
          throw new Error('PDF viewer library not loaded');
        }

        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        item.pageCount = pdfDoc.numPages;

        // Render first page to thumbnail canvas
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1.0 });

        // Calculate thumb scale (max width 160, max height 220)
        const targetWidth = 160;
        const scale = targetWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: Math.min(scale, 1.5) });

        const canvas = document.createElement('canvas');
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({
          canvasContext: ctx,
          viewport: scaledViewport
        }).promise;

        item.thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
      } else if (item.ext === 'png' || item.ext === 'jpg' || item.ext === 'jpeg') {
        item.pageCount = 1;
        // Image preview directly via object URL
        item.thumbnailUrl = URL.createObjectURL(item.file);
      } else if (item.ext === 'docx') {
        item.pageCount = 'Doc';
        item.thumbnailUrl = null; // Will show formatted Doc icon
      } else if (item.ext === 'xlsx') {
        item.pageCount = 'Sheet';
        item.thumbnailUrl = null; // Will show formatted Sheet icon
      }
    } catch (err) {
      console.warn('Preview generation note for', item.name, err);
      item.error = 'Could not generate preview';
      item.pageCount = item.ext === 'pdf' ? 'PDF' : 1;
    } finally {
      item.isProcessingThumbnail = false;
      this.renderCards();
      this.updateSummary();
    }
  }

  // -------------------------------------------------------------
  // UI Rendering & Card List
  // -------------------------------------------------------------
  updateUI() {
    const hasFiles = this.files.length > 0;
    if (this.workspaceSection) {
      this.workspaceSection.classList.toggle('hidden', !hasFiles);
    }
    if (this.heroSection) {
      // Keep hero visible or compact
      this.heroSection.classList.toggle('hidden', hasFiles);
    }
    if (this.stickyBar) {
      this.stickyBar.classList.toggle('hidden', !hasFiles);
    }

    this.renderCards();
    this.updateSummary();
  }

  updateSummary() {
    if (this.totalFilesCount) {
      this.totalFilesCount.textContent = `${this.files.length} file${this.files.length === 1 ? '' : 's'}`;
    }

    const totalBytes = this.files.reduce((acc, f) => acc + (f.size || 0), 0);
    if (this.totalEstimatedSize) {
      this.totalEstimatedSize.textContent = formatBytes(totalBytes);
    }

    const canMerge = this.files.length >= 2;
    if (this.mergeBtn) {
      this.mergeBtn.disabled = !canMerge;
      this.mergeBtn.classList.toggle('opacity-50', !canMerge);
      this.mergeBtn.classList.toggle('cursor-not-allowed', !canMerge);
    }
    if (this.stickyMergeBtn) {
      this.stickyMergeBtn.disabled = !canMerge;
      this.stickyMergeBtn.classList.toggle('opacity-50', !canMerge);
      this.stickyMergeBtn.classList.toggle('cursor-not-allowed', !canMerge);
    }
  }

  renderCards() {
    if (!this.fileCardsContainer) return;
    this.fileCardsContainer.innerHTML = '';

    this.files.forEach((item, index) => {
      const card = document.createElement('div');
      card.className =
        'file-card group relative flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xs hover:border-blue-500/50 hover:shadow-md transition-all select-none';
      card.setAttribute('draggable', 'true');
      card.dataset.index = index;

      // Thumbnail view
      let thumbHtml = '';
      if (item.isProcessingThumbnail) {
        thumbHtml = `
          <div class="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center text-neutral-400 shrink-0 border border-neutral-200 dark:border-neutral-700">
            <i data-lucide="loader-2" class="w-5 h-5 animate-spin text-blue-500"></i>
            <span class="text-[10px] mt-1 font-semibold">Loading</span>
          </div>`;
      } else if (item.thumbnailUrl) {
        thumbHtml = `
          <div class="w-16 h-20 sm:w-20 sm:h-24 rounded-xl bg-neutral-100 dark:bg-neutral-950 overflow-hidden shrink-0 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shadow-2xs">
            <img src="${item.thumbnailUrl}" alt="Preview" class="w-full h-full object-contain pointer-events-none" />
          </div>`;
      } else {
        // Icon fallback for DOCX, XLSX or failed preview
        let iconName = 'file-text';
        let badgeBg = 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400';
        if (item.ext === 'docx') {
          iconName = 'file-text';
          badgeBg = 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400';
        } else if (item.ext === 'xlsx') {
          iconName = 'table';
          badgeBg = 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400';
        }
        thumbHtml = `
          <div class="w-16 h-20 sm:w-20 sm:h-24 rounded-xl ${badgeBg} flex flex-col items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
            <i data-lucide="${iconName}" class="w-6 h-6"></i>
            <span class="text-[10px] uppercase font-bold mt-1">${item.ext}</span>
          </div>`;
      }

      // Page Count badge
      let pageCountDisplay = '';
      if (item.pageCount) {
        pageCountDisplay = typeof item.pageCount === 'number'
          ? `${item.pageCount} page${item.pageCount === 1 ? '' : 's'}`
          : `${item.pageCount}`;
      } else {
        pageCountDisplay = '...';
      }

      card.innerHTML = `
        <!-- Drag Handle (Desktop & Mobile) -->
        <button type="button" class="drag-handle touch-manipulation p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-grab active:cursor-grabbing rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0" title="Drag to reorder" aria-label="Drag to reorder">
          <i data-lucide="grip-vertical" class="w-5 h-5 pointer-events-none"></i>
        </button>

        <!-- Position Badge -->
        <span class="w-6 h-6 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px] font-bold text-neutral-600 dark:text-neutral-300 flex items-center justify-center shrink-0 border border-neutral-200 dark:border-neutral-700">
          ${index + 1}
        </span>

        <!-- Thumbnail Preview -->
        ${thumbHtml}

        <!-- File Details -->
        <div class="flex-1 min-w-0 pr-2">
          <h4 class="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate" title="${item.name}">
            ${item.name}
          </h4>
          <div class="flex flex-wrap items-center gap-2 mt-1.5">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              <i data-lucide="layers" class="w-3 h-3"></i>
              ${pageCountDisplay}
            </span>
            <span class="text-[11px] text-neutral-500 font-mono">
              ${formatBytes(item.size)}
            </span>
          </div>
        </div>

        <!-- Controls: Move Up, Move Down & Delete -->
        <div class="flex items-center gap-1 shrink-0">
          <!-- Move Up (Touch / Accessibility) -->
          <button type="button" class="btn-move-up p-2 min-w-[40px] min-h-[40px] rounded-xl text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer ${index === 0 ? 'opacity-30 pointer-events-none' : ''}" title="Move Up" aria-label="Move Up">
            <i data-lucide="arrow-up" class="w-4 h-4 pointer-events-none"></i>
          </button>

          <!-- Move Down (Touch / Accessibility) -->
          <button type="button" class="btn-move-down p-2 min-w-[40px] min-h-[40px] rounded-xl text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors cursor-pointer ${index === this.files.length - 1 ? 'opacity-30 pointer-events-none' : ''}" title="Move Down" aria-label="Move Down">
            <i data-lucide="arrow-down" class="w-4 h-4 pointer-events-none"></i>
          </button>

          <!-- Delete File -->
          <button type="button" class="btn-delete p-2 min-w-[40px] min-h-[40px] rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer" title="Remove File" aria-label="Remove File">
            <i data-lucide="trash-2" class="w-4 h-4 pointer-events-none"></i>
          </button>
        </div>
      `;

      // Bind drag and drop events on card
      this.bindDragEvents(card, index);

      // Bind button events
      card.querySelector('.btn-move-up')?.addEventListener('click', () => this.moveItem(index, index - 1));
      card.querySelector('.btn-move-down')?.addEventListener('click', () => this.moveItem(index, index + 1));
      card.querySelector('.btn-delete')?.addEventListener('click', () => this.deleteItem(index));

      this.fileCardsContainer.appendChild(card);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // -------------------------------------------------------------
  // Drag and Drop Reordering
  // -------------------------------------------------------------
  bindDragEvents(card, index) {
    card.addEventListener('dragstart', (e) => {
      this.draggedIndex = index;
      card.classList.add('opacity-40', 'scale-[0.98]');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-40', 'scale-[0.98]');
      document.querySelectorAll('.file-card').forEach((el) => {
        el.classList.remove('border-blue-500', 'bg-blue-50/40', 'dark:bg-blue-950/20');
      });
      this.draggedIndex = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        card.classList.add('border-blue-500', 'bg-blue-50/40', 'dark:bg-blue-950/20');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('border-blue-500', 'bg-blue-50/40', 'dark:bg-blue-950/20');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('border-blue-500', 'bg-blue-50/40', 'dark:bg-blue-950/20');
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        this.moveItem(this.draggedIndex, index);
      }
    });
  }

  moveItem(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= this.files.length) return;
    if (toIndex < 0 || toIndex >= this.files.length) return;

    const [moved] = this.files.splice(fromIndex, 1);
    this.files.splice(toIndex, 0, moved);
    this.renderCards();
  }

  deleteItem(index) {
    if (index >= 0 && index < this.files.length) {
      const removed = this.files.splice(index, 1)[0];
      if (removed.thumbnailUrl && removed.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removed.thumbnailUrl);
      }
      this.updateUI();
      this.showToast(`Removed "${removed.name}"`, 'info');
    }
  }

  clearAll() {
    this.files.forEach((f) => {
      if (f.thumbnailUrl && f.thumbnailUrl.startsWith('blob:')) {
        URL.revokeObjectURL(f.thumbnailUrl);
      }
    });
    this.files = [];
    if (this.mergedPdfUrl) {
      URL.revokeObjectURL(this.mergedPdfUrl);
      this.mergedPdfUrl = null;
    }
    this.updateUI();
    this.showToast('All files cleared', 'info');
  }

  // -------------------------------------------------------------
  // Merge Execution Engine (pdf-lib)
  // -------------------------------------------------------------
  async startMerge() {
    if (this.files.length < 2) {
      this.showToast('Please select at least 2 files to merge.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF merging engine is still loading. Please wait a moment...', 'warning');
      return;
    }

    this.isMerging = true;
    this.showProcessingModal(true);

    try {
      const { PDFDocument } = window.PDFLib;
      const mergedPdf = await PDFDocument.create();

      const total = this.files.length;
      for (let i = 0; i < total; i++) {
        const item = this.files[i];
        const progressPct = Math.round(((i + 1) / total) * 100);
        this.updateProgress(progressPct, `Processing ${i + 1} of ${total}: ${item.name}...`);

        if (item.ext === 'pdf') {
          const fileBytes = await item.file.arrayBuffer();
          const srcDoc = await PDFDocument.load(fileBytes, { ignoreEncryption: true });
          const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
          copiedPages.forEach((page) => mergedPdf.addPage(page));
        } else if (item.ext === 'png' || item.ext === 'jpg' || item.ext === 'jpeg') {
          // Convert image to PDF page
          const imgBytes = await item.file.arrayBuffer();
          let embeddedImage;
          if (item.ext === 'png') {
            embeddedImage = await mergedPdf.embedPng(imgBytes);
          } else {
            embeddedImage = await mergedPdf.embedJpg(imgBytes);
          }

          // Create page scaled to standard letter/A4 or image native dimensions
          const { width, height } = embeddedImage.scale(1);
          // Scale down if massive (e.g. > 1200px)
          const maxDim = 842; // A4 height points
          let scaleFactor = 1;
          if (width > maxDim || height > maxDim) {
            scaleFactor = maxDim / Math.max(width, height);
          }

          const pageW = width * scaleFactor;
          const pageH = height * scaleFactor;
          const page = mergedPdf.addPage([pageW, pageH]);
          page.drawImage(embeddedImage, {
            x: 0,
            y: 0,
            width: pageW,
            height: pageH
          });
        } else if (item.ext === 'docx') {
          // Convert DOCX to formatted PDF page
          await this.convertDocxToPdfPage(item.file, mergedPdf);
        } else if (item.ext === 'xlsx') {
          // Convert XLSX to formatted PDF page
          await this.convertXlsxToPdfPage(item.file, mergedPdf);
        }
      }

      this.updateProgress(100, 'Finalizing merged document...');

      const mergedPdfBytes = await mergedPdf.save();
      this.mergedPdfBlob = new Blob([mergedPdfBytes], { type: 'application/pdf' });

      if (this.mergedPdfUrl) {
        URL.revokeObjectURL(this.mergedPdfUrl);
      }
      this.mergedPdfUrl = URL.createObjectURL(this.mergedPdfBlob);

      // Hide modal & show download state
      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadState(this.mergedPdfBlob.size);
      }, 300);
    } catch (err) {
      console.error('Merge failure:', err);
      this.showProcessingModal(false);
      this.showToast(`Merge failed: ${err.message || 'Please check that files are valid.'}`, 'error');
    } finally {
      this.isMerging = false;
    }
  }

  // -------------------------------------------------------------
  // DOCX & XLSX to PDF Page Converters
  // -------------------------------------------------------------
  async convertDocxToPdfPage(file, targetPdfDoc) {
    const { rgb, StandardFonts } = window.PDFLib;
    let textContent = '';

    if (window.mammoth) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        textContent = result.value || '';
      } catch (e) {
        textContent = `[DOCX Document: ${file.name}]`;
      }
    } else {
      textContent = `[DOCX Document: ${file.name}]`;
    }

    const font = await targetPdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 11;
    const margin = 50;
    const pageWidth = 595.28; // A4
    const pageHeight = 841.89;
    const maxLineWidth = pageWidth - margin * 2;

    const lines = textContent.split('\n');
    let currentPage = targetPdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Header
    currentPage.drawText(file.name, {
      x: margin,
      y: y,
      size: 14,
      font: font,
      color: rgb(0.1, 0.2, 0.6)
    });
    y -= 25;

    for (const rawLine of lines) {
      if (y < margin + 20) {
        currentPage = targetPdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      const trimmed = rawLine.trim();
      if (!trimmed) {
        y -= 12;
        continue;
      }

      // Word wrapping
      const words = trimmed.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width < maxLineWidth) {
          currentLine = testLine;
        } else {
          currentPage.drawText(currentLine, {
            x: margin,
            y: y,
            size: fontSize,
            font: font,
            color: rgb(0.2, 0.2, 0.2)
          });
          y -= 16;
          currentLine = word;

          if (y < margin + 20) {
            currentPage = targetPdfDoc.addPage([pageWidth, pageHeight]);
            y = pageHeight - margin;
          }
        }
      }

      if (currentLine) {
        currentPage.drawText(currentLine, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0.2, 0.2, 0.2)
        });
        y -= 16;
      }
    }
  }

  async convertXlsxToPdfPage(file, targetPdfDoc) {
    const { rgb, StandardFonts } = window.PDFLib;
    const font = await targetPdfDoc.embedFont(StandardFonts.Helvetica);
    const pageWidth = 841.89; // Landscape A4
    const pageHeight = 595.28;
    const margin = 40;

    let rows = [];
    if (window.XLSX) {
      try {
        const data = await file.arrayBuffer();
        const workbook = window.XLSX.read(data);
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        rows = window.XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      } catch (e) {
        rows = [[`Spreadsheet: ${file.name}`]];
      }
    }

    let currentPage = targetPdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    currentPage.drawText(`Spreadsheet: ${file.name}`, {
      x: margin,
      y: y,
      size: 14,
      font: font,
      color: rgb(0.05, 0.45, 0.25)
    });
    y -= 25;

    for (let r = 0; r < Math.min(rows.length, 40); r++) {
      if (y < margin + 20) {
        currentPage = targetPdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }

      const row = rows[r];
      if (!Array.isArray(row)) continue;

      let x = margin;
      const colWidth = (pageWidth - margin * 2) / Math.min(Math.max(row.length, 1), 7);

      for (let c = 0; c < Math.min(row.length, 7); c++) {
        const cellText = String(row[c] !== undefined ? row[c] : '').substring(0, 20);
        currentPage.drawText(cellText, {
          x: x,
          y: y,
          size: 9,
          font: font,
          color: r === 0 ? rgb(0.1, 0.1, 0.1) : rgb(0.3, 0.3, 0.3)
        });
        x += colWidth;
      }
      y -= 14;
    }
  }

  // -------------------------------------------------------------
  // Progress Modal & Download Screen
  // -------------------------------------------------------------
  showProcessingModal(show) {
    if (!this.processingModal) return;
    this.processingModal.classList.toggle('hidden', !show);
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

  showDownloadState(mergedSizeBytes) {
    if (this.workspaceSection) this.workspaceSection.classList.add('hidden');
    if (this.heroSection) this.heroSection.classList.add('hidden');
    if (this.stickyBar) this.stickyBar.classList.add('hidden');

    if (this.downloadSection) {
      this.downloadSection.classList.remove('hidden');
      this.downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (this.downloadSizeBadge) {
      this.downloadSizeBadge.textContent = formatBytes(mergedSizeBytes);
    }

    if (this.customFilenameInput) {
      this.customFilenameInput.value = generateDefaultMergedFilename();
    }

    this.showToast('✅ Merged successfully!', 'success');
  }

  downloadMergedPdf() {
    if (!this.mergedPdfBlob || !this.mergedPdfUrl) {
      this.showToast('No merged PDF found. Please merge files first.', 'error');
      return;
    }

    let filename = (this.customFilenameInput && this.customFilenameInput.value.trim()) || generateDefaultMergedFilename();
    if (!filename.toLowerCase().endsWith('.pdf')) {
      filename += '.pdf';
    }

    const a = document.createElement('a');
    a.href = this.mergedPdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast('Download started!', 'success');
  }

  // -------------------------------------------------------------
  // Toast Notifications
  // -------------------------------------------------------------
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
// Initialize App on DOM Ready
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.mergePdfApp = new MergePdfApp();
});
