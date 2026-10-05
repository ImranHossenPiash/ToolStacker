/**
 * ToolStacker Remove & Reorder PDF Pages Tool
 * 100% Client-Side • Drag & Drop Reordering • Delete Pages • Reverse Sequence
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

class ReorderPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.initialTotalPages = 0;

    // Array of active page items:
    // { id: 'page_1', originalIndex: 1, isSelected: false }
    this.pages = [];
    this.originalOrderSnapshot = [];

    // Drag-and-drop state
    this.draggedItemIndex = null;

    // Result PDF
    this.modifiedBlob = null;
    this.modifiedUrl = null;

    // Thumbnail Data Cache (originalIndex -> objectUrl)
    this.thumbnailCache = new Map();

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
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.resetBtn = document.getElementById('reset-btn');

    // Toolbar Controls
    this.deleteSelectedBtn = document.getElementById('delete-selected-btn');
    this.deleteSelectedBadge = document.getElementById('delete-selected-badge');
    this.reverseOrderBtn = document.getElementById('reverse-order-btn');
    this.selectAllBtn = document.getElementById('select-all-btn');
    this.deselectAllBtn = document.getElementById('deselect-all-btn');
    this.resetOrderBtn = document.getElementById('reset-order-btn');
    this.pageCountBadge = document.getElementById('page-count-badge');
    this.jumpInput = document.getElementById('jump-input');
    this.jumpBtn = document.getElementById('jump-btn');

    // Page Grid
    this.pageGrid = document.getElementById('page-grid');

    // Bottom Action Bar
    this.applyChangesBtn = document.getElementById('apply-changes-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.stickyApplyBtn = document.getElementById('sticky-apply-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultSizeBadge = document.getElementById('result-size-badge');
    this.editAnotherBtn = document.getElementById('edit-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('reorder-progress-fill');
    this.progressPct = document.getElementById('reorder-progress-pct');
    this.progressText = document.getElementById('reorder-progress-text');
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
    this.cancelBtn?.addEventListener('click', () => this.resetAll());
    this.editAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Toolbar Actions
    this.deleteSelectedBtn?.addEventListener('click', () => this.deleteSelectedPages());
    this.reverseOrderBtn?.addEventListener('click', () => this.reversePages());
    this.selectAllBtn?.addEventListener('click', () => this.selectAll(true));
    this.deselectAllBtn?.addEventListener('click', () => this.selectAll(false));
    this.resetOrderBtn?.addEventListener('click', () => this.resetToOriginalOrder());

    // Jump to page
    this.jumpBtn?.addEventListener('click', () => this.jumpToPage());
    this.jumpInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.jumpToPage();
      }
    });

    // Apply Changes / Execution
    this.applyChangesBtn?.addEventListener('click', () => this.executeApplyChanges());
    this.stickyApplyBtn?.addEventListener('click', () => this.executeApplyChanges());
    this.downloadBtn?.addEventListener('click', () => this.downloadModifiedPdf());
  }

  // -------------------------------------------------------------
  // PDF Loading & Thumbnail Rendering
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

    if (file.size > 50 * 1024 * 1024) {
      this.showToast('Large file loaded. Processing may take longer.', 'warning');
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
      this.initialTotalPages = this.pdfDocProxy.numPages;

      if (this.docName) this.docName.textContent = file.name;
      if (this.docDetails) {
        this.docDetails.textContent = `${formatBytes(file.size)} • ${this.initialTotalPages} pages initially`;
      }

      this.pages = [];
      for (let i = 1; i <= this.initialTotalPages; i++) {
        this.pages.push({
          id: `page_${i}`,
          originalIndex: i,
          isSelected: false
        });
      }
      this.originalOrderSnapshot = JSON.parse(JSON.stringify(this.pages));

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      this.renderGrid();
      this.updateToolbarStats();

      this.showToast(`Loaded "${file.name}" (${this.initialTotalPages} pages). Drag to reorder, click X to delete!`, 'info');
    } catch (err) {
      console.error('PDF load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to open PDF: ${err.message}`, 'error');
    }
  }

  renderGrid() {
    if (!this.pageGrid) return;
    this.pageGrid.innerHTML = '';

    this.pages.forEach((pageItem, currentIndex) => {
      const card = document.createElement('div');
      card.className =
        'page-card group relative bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 p-2.5 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col items-center gap-2 select-none';
      card.id = `card-${pageItem.id}`;
      card.draggable = true;
      card.dataset.index = currentIndex;

      if (pageItem.isSelected) {
        card.classList.add('border-blue-600', 'bg-blue-50/40', 'dark:bg-blue-950/20');
      }

      const cachedSrc = this.thumbnailCache.get(pageItem.originalIndex);

      card.innerHTML = `
        <!-- Card Header: Drag Handle, Page # & Checkbox, Delete X -->
        <div class="w-full flex items-center justify-between text-xs font-semibold text-neutral-500">
          
          <!-- Drag Handle -->
          <div class="drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" title="Drag to reorder">
            <i data-lucide="grip-vertical" class="w-4 h-4"></i>
          </div>

          <!-- Page Position Badge & Checkbox -->
          <label class="flex items-center gap-1.5 cursor-pointer py-0.5 px-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <input type="checkbox" class="page-checkbox w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" ${pageItem.isSelected ? 'checked' : ''} />
            <span class="font-bold text-neutral-800 dark:text-neutral-100 text-xs">#${currentIndex + 1}</span>
            ${
              pageItem.originalIndex !== currentIndex + 1
                ? `<span class="text-[10px] text-neutral-400 font-mono" title="Original Page Number">(${pageItem.originalIndex})</span>`
                : ''
            }
          </label>

          <!-- Delete Button (X) -->
          <button
            type="button"
            class="btn-delete-page p-1 -mr-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            title="Delete this page"
          >
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Thumbnail Container (100x130px ratio) -->
        <div class="thumb-container relative w-[105px] h-[138px] bg-neutral-100 dark:bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-neutral-100 dark:border-neutral-800">
          ${
            cachedSrc
              ? `<img src="${cachedSrc}" class="max-w-[98px] max-h-[130px] object-contain shadow-xs rounded-sm" alt="Page ${currentIndex + 1}" />`
              : `<canvas id="thumb-canvas-${pageItem.id}" class="max-w-[98px] max-h-[130px] object-contain shadow-xs rounded-sm"></canvas>
                 <div class="thumb-spinner absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xs">
                   <i data-lucide="loader-2" class="w-4 h-4 text-blue-500 animate-spin"></i>
                 </div>`
          }
        </div>

        <!-- Mobile Quick Move Buttons: Move Left & Move Right -->
        <div class="w-full flex items-center justify-between gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
          <button
            type="button"
            class="btn-move-left flex-1 py-1 rounded-lg text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            ${currentIndex === 0 ? 'disabled' : ''}
            title="Move left"
          >
            <i data-lucide="arrow-left" class="w-3 h-3"></i>
            <span>Prev</span>
          </button>

          <button
            type="button"
            class="btn-move-right flex-1 py-1 rounded-lg text-neutral-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-bold flex items-center justify-center gap-0.5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            ${currentIndex === this.pages.length - 1 ? 'disabled' : ''}
            title="Move right"
          >
            <span>Next</span>
            <i data-lucide="arrow-right" class="w-3 h-3"></i>
          </button>
        </div>
      `;

      // Checkbox event
      const checkbox = card.querySelector('.page-checkbox');
      checkbox?.addEventListener('change', (e) => {
        pageItem.isSelected = e.target.checked;
        card.classList.toggle('border-blue-600', pageItem.isSelected);
        card.classList.toggle('bg-blue-50/40', pageItem.isSelected);
        card.classList.toggle('dark:bg-blue-950/20', pageItem.isSelected);
        this.updateToolbarStats();
      });

      // Delete button event
      card.querySelector('.btn-delete-page')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteSinglePage(currentIndex);
      });

      // Move left/right buttons
      card.querySelector('.btn-move-left')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.movePage(currentIndex, currentIndex - 1);
      });

      card.querySelector('.btn-move-right')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.movePage(currentIndex, currentIndex + 1);
      });

      // HTML5 Drag and Drop Events
      this.attachDragAndDropEvents(card, currentIndex);

      this.pageGrid.appendChild(card);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    this.renderThumbnailsForPages();
  }

  attachDragAndDropEvents(card, index) {
    card.addEventListener('dragstart', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('label')) {
        e.preventDefault();
        return;
      }
      this.draggedItemIndex = index;
      card.classList.add('opacity-40', 'scale-95');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-40', 'scale-95');
      this.draggedItemIndex = null;
      document.querySelectorAll('.page-card').forEach(c => {
        c.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });

    card.addEventListener('dragenter', (e) => {
      e.preventDefault();
      if (this.draggedItemIndex !== null && this.draggedItemIndex !== index) {
        card.classList.add('border-blue-500', 'ring-2', 'ring-blue-500/30');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('border-blue-500', 'ring-2', 'ring-blue-500/30');

      const fromIndex = this.draggedItemIndex;
      const toIndex = index;

      if (fromIndex !== null && fromIndex !== toIndex) {
        this.movePage(fromIndex, toIndex);
      }
    });
  }

  async renderThumbnailsForPages() {
    if (!this.pdfDocProxy) return;

    for (const pageItem of this.pages) {
      if (this.thumbnailCache.has(pageItem.originalIndex)) continue;

      const canvas = document.getElementById(`thumb-canvas-${pageItem.id}`);
      if (!canvas || canvas.dataset.rendered === 'true') continue;

      try {
        const page = await this.pdfDocProxy.getPage(pageItem.originalIndex);
        const viewport = page.getViewport({ scale: 0.35 });

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;

        canvas.dataset.rendered = 'true';
        this.thumbnailCache.set(pageItem.originalIndex, canvas.toDataURL());

        const card = document.getElementById(`card-${pageItem.id}`);
        card?.querySelector('.thumb-spinner')?.classList.add('hidden');
      } catch (err) {
        console.warn(`Thumbnail render failed for original page ${pageItem.originalIndex}:`, err);
      }
    }
  }

  // -------------------------------------------------------------
  // Page Manipulation (Move, Delete, Reverse, Select, Jump)
  // -------------------------------------------------------------
  movePage(fromIndex, toIndex) {
    if (toIndex < 0 || toIndex >= this.pages.length || fromIndex === toIndex) return;

    const [movedItem] = this.pages.splice(fromIndex, 1);
    this.pages.splice(toIndex, 0, movedItem);

    this.renderGrid();
    this.updateToolbarStats();
    this.showToast(`Moved page to position #${toIndex + 1}`, 'info');
  }

  deleteSinglePage(index) {
    if (this.pages.length <= 1) {
      this.showToast('Cannot delete all pages. At least one page must remain.', 'error');
      return;
    }

    const removed = this.pages.splice(index, 1);
    this.renderGrid();
    this.updateToolbarStats();
    this.showToast(`Deleted page #${index + 1} (Original #${removed[0].originalIndex})`, 'info');
  }

  deleteSelectedPages() {
    const selectedIndices = [];
    this.pages.forEach((p, idx) => {
      if (p.isSelected) selectedIndices.push(idx);
    });

    if (selectedIndices.length === 0) {
      this.showToast('No pages selected to delete.', 'warning');
      return;
    }

    if (selectedIndices.length >= this.pages.length) {
      this.showToast('Cannot delete all pages. At least one page must remain.', 'error');
      return;
    }

    const toDeleteCount = selectedIndices.length;
    this.pages = this.pages.filter(p => !p.isSelected);

    this.renderGrid();
    this.updateToolbarStats();
    this.showToast(`Deleted ${toDeleteCount} selected page${toDeleteCount === 1 ? '' : 's'}!`, 'success');
  }

  reversePages() {
    if (this.pages.length <= 1) return;
    this.pages.reverse();
    this.renderGrid();
    this.updateToolbarStats();
    this.showToast('Reversed page sequence!', 'info');
  }

  selectAll(selected) {
    this.pages.forEach(p => (p.isSelected = selected));
    this.renderGrid();
    this.updateToolbarStats();
    this.showToast(selected ? 'Selected all pages' : 'Deselected all pages', 'info');
  }

  resetToOriginalOrder() {
    if (this.originalOrderSnapshot.length === 0) return;
    this.pages = JSON.parse(JSON.stringify(this.originalOrderSnapshot));
    this.renderGrid();
    this.updateToolbarStats();
    this.showToast('Reset pages to original order & restored all deleted pages', 'info');
  }

  jumpToPage() {
    if (!this.jumpInput) return;
    const targetNum = parseInt(this.jumpInput.value, 10);
    if (isNaN(targetNum) || targetNum < 1 || targetNum > this.pages.length) {
      this.showToast(`Enter a valid page number between 1 and ${this.pages.length}.`, 'warning');
      return;
    }

    const card = document.querySelectorAll('.page-card')[targetNum - 1];
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('ring-4', 'ring-blue-500', 'scale-105');
      setTimeout(() => {
        card.classList.remove('ring-4', 'ring-blue-500', 'scale-105');
      }, 1200);
      this.showToast(`Jumped to page #${targetNum}`, 'info');
    }
  }

  updateToolbarStats() {
    const totalRemaining = this.pages.length;
    const selectedCount = this.pages.filter(p => p.isSelected).length;

    if (this.pageCountBadge) {
      this.pageCountBadge.textContent = `${totalRemaining} page${totalRemaining === 1 ? '' : 's'} remaining`;
    }

    if (this.deleteSelectedBtn) {
      this.deleteSelectedBtn.disabled = selectedCount === 0;
    }

    if (this.deleteSelectedBadge) {
      this.deleteSelectedBadge.textContent = selectedCount;
      this.deleteSelectedBadge.classList.toggle('hidden', selectedCount === 0);
    }
  }

  // -------------------------------------------------------------
  // Execution: Apply Changes using pdf-lib
  // -------------------------------------------------------------
  async executeApplyChanges() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    if (this.pages.length === 0) {
      this.showToast('Cannot delete all pages. At least one page must remain.', 'error');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Copying & reordering pages in browser RAM...');

    try {
      const { PDFDocument } = window.PDFLib;
      const srcDoc = await PDFDocument.load(this.pdfBytes);
      const newDoc = await PDFDocument.create();

      const totalPagesToSave = this.pages.length;
      const pageIndices = this.pages.map(p => p.originalIndex - 1);

      this.updateProgress(30, `Copying ${totalPagesToSave} pages in new order...`);

      const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);

      for (let i = 0; i < copiedPages.length; i++) {
        newDoc.addPage(copiedPages[i]);
        const pct = Math.round(30 + ((i + 1) / copiedPages.length) * 60);
        this.updateProgress(pct, `Assembling page ${i + 1} of ${totalPagesToSave}...`);
      }

      this.updateProgress(95, 'Finalizing modified PDF document...');
      const savedBytes = await newDoc.save();

      this.modifiedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.modifiedUrl) URL.revokeObjectURL(this.modifiedUrl);
      this.modifiedUrl = URL.createObjectURL(this.modifiedBlob);

      const deletedCount = this.initialTotalPages - totalPagesToSave;

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection(deletedCount, totalPagesToSave);
      }, 300);
    } catch (err) {
      console.error('Reorder execution error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to process PDF: ${err.message}`, 'error');
    }
  }

  showDownloadSection(deletedCount, keptCount) {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSuccessMsg) {
      if (deletedCount > 0) {
        this.resultSuccessMsg.textContent = `Removed ${deletedCount} page${deletedCount === 1 ? '' : 's'}. Kept ${keptCount} pages.`;
      } else {
        this.resultSuccessMsg.textContent = `Reordered ${keptCount} pages successfully!`;
      }
    }

    if (this.resultSizeBadge && this.modifiedBlob) {
      this.resultSizeBadge.textContent = `${formatBytes(this.modifiedBlob.size)} • ${keptCount} pages`;
    }

    this.showToast('✅ PDF reordered and updated successfully!', 'success');
  }

  downloadModifiedPdf() {
    if (!this.modifiedBlob || !this.modifiedUrl) return;

    const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_reordered_${timestamp}.pdf`;

    const a = document.createElement('a');
    a.href = this.modifiedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetAll() {
    if (this.modifiedUrl) URL.revokeObjectURL(this.modifiedUrl);
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.pages = [];
    this.originalOrderSnapshot = [];
    this.modifiedBlob = null;
    this.modifiedUrl = null;
    this.initialTotalPages = 0;
    this.thumbnailCache.clear();

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    if (this.pageGrid) this.pageGrid.innerHTML = '';
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
  window.reorderPdfApp = new ReorderPdfApp();
});
