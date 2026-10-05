/**
 * ToolStacker Rotate PDF Tool
 * 100% Client-Side • Visual Page Grid • Bulk & Individual Rotation
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

class RotatePdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;

    // Array of page metadata:
    // { pageNum: 1, originalRotation: 0, addedRotation: 0, isSelected: false, canvasDataUrl: null }
    this.pagesData = [];

    // Result PDF
    this.rotatedBlob = null;
    this.rotatedUrl = null;

    this.cacheDom();
    this.bindEvents();
  }

  cacheDom() {
    // Dropzone & Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Workspace & Overview
    this.workspace = document.getElementById('workspace');
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.resetBtn = document.getElementById('reset-btn');

    // Bulk Toolbar Buttons
    this.rotateAllCwBtn = document.getElementById('rotate-all-cw-btn');
    this.rotateAllCcwBtn = document.getElementById('rotate-all-ccw-btn');
    this.rotateSelectedCwBtn = document.getElementById('rotate-selected-cw-btn');
    this.selectAllBtn = document.getElementById('select-all-btn');
    this.deselectAllBtn = document.getElementById('deselect-all-btn');
    this.resetAllRotationsBtn = document.getElementById('reset-all-rotations-btn');
    this.selectedCountBadge = document.getElementById('selected-count-badge');

    // Page Grid
    this.pageGrid = document.getElementById('page-grid');

    // Bottom Action Bar
    this.applyRotationBtn = document.getElementById('apply-rotation-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.stickyApplyBtn = document.getElementById('sticky-apply-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSizeBadge = document.getElementById('result-size-badge');
    this.rotateAnotherBtn = document.getElementById('rotate-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('rot-progress-fill');
    this.progressPct = document.getElementById('rot-progress-pct');
    this.progressText = document.getElementById('rot-progress-text');
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
    this.rotateAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Bulk Actions
    this.rotateAllCwBtn?.addEventListener('click', () => this.rotateAll(90));
    this.rotateAllCcwBtn?.addEventListener('click', () => this.rotateAll(-90));
    this.rotateSelectedCwBtn?.addEventListener('click', () => this.rotateSelected(90));
    this.selectAllBtn?.addEventListener('click', () => this.setSelectionAll(true));
    this.deselectAllBtn?.addEventListener('click', () => this.setSelectionAll(false));
    this.resetAllRotationsBtn?.addEventListener('click', () => this.resetRotations());

    // Submit / Apply Rotation
    this.applyRotationBtn?.addEventListener('click', () => this.executeRotatePdf());
    this.stickyApplyBtn?.addEventListener('click', () => this.executeRotatePdf());
    this.downloadBtn?.addEventListener('click', () => this.downloadRotatedPdf());
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

    if (file.size > 50 * 1024 * 1024) {
      this.showToast('Large file loaded. May take longer to process.', 'warning');
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

      if (this.docName) this.docName.textContent = file.name;
      if (this.docDetails) {
        this.docDetails.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      this.pagesData = [];
      for (let i = 1; i <= this.totalPages; i++) {
        this.pagesData.push({
          pageNum: i,
          originalRotation: 0,
          addedRotation: 0,
          isSelected: false,
          canvasDataUrl: null
        });
      }

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      this.renderGridSkeleton();
      this.loadThumbnailsLazily();
      this.updateSelectedCountUI();

      this.showToast(`Loaded "${file.name}" (${this.totalPages} pages). Click any page to rotate!`, 'info');
    } catch (err) {
      console.error('PDF load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to open PDF: ${err.message}`, 'error');
    }
  }

  renderGridSkeleton() {
    if (!this.pageGrid) return;
    this.pageGrid.innerHTML = '';

    this.pagesData.forEach((pageItem, index) => {
      const card = document.createElement('div');
      card.className =
        'group relative bg-white dark:bg-neutral-900 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 p-3 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 transition-all flex flex-col items-center gap-2 select-none cursor-pointer';
      card.id = `page-card-${pageItem.pageNum}`;
      card.dataset.pageNum = pageItem.pageNum;

      card.innerHTML = `
        <!-- Top Toolbar on card -->
        <div class="w-full flex items-center justify-between text-[11px] font-semibold text-neutral-500">
          <label class="flex items-center gap-1.5 cursor-pointer py-0.5 px-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" onclick="event.stopPropagation()">
            <input type="checkbox" class="page-checkbox w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer" data-page-idx="${index}" />
            <span class="text-neutral-700 dark:text-neutral-300 font-bold text-xs">${pageItem.pageNum}</span>
          </label>

          <!-- Current Rotation Angle Badge -->
          <span class="angle-badge inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            0°
          </span>
        </div>

        <!-- Thumbnail Container (100x130px ratio container) -->
        <div class="thumb-wrapper relative w-[110px] h-[142px] bg-neutral-100 dark:bg-neutral-950 rounded-xl overflow-hidden flex items-center justify-center p-1 border border-neutral-100 dark:border-neutral-800">
          <div class="thumb-canvas-box transition-transform duration-200 ease-out flex items-center justify-center">
            <canvas id="canvas-p-${pageItem.pageNum}" class="max-w-[102px] max-h-[134px] object-contain shadow-xs rounded-sm"></canvas>
          </div>

          <!-- Loading Spinner -->
          <div class="thumb-loader absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xs">
            <i data-lucide="loader-2" class="w-5 h-5 text-blue-500 animate-spin"></i>
          </div>
        </div>

        <!-- Quick Rotate Action Buttons -->
        <div class="w-full flex items-center justify-between gap-1 pt-1 border-t border-neutral-100 dark:border-neutral-800" onclick="event.stopPropagation()">
          <button
            type="button"
            class="btn-rotate-ccw flex-1 py-1 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Rotate 90° Counterclockwise"
          >
            <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i>
            <span>-90°</span>
          </button>
          
          <button
            type="button"
            class="btn-rotate-cw flex-1 py-1 rounded-lg text-neutral-600 dark:text-neutral-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[10px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            title="Rotate 90° Clockwise"
          >
            <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
            <span>+90°</span>
          </button>
        </div>
      `;

      // Click card to rotate +90°
      card.addEventListener('click', () => {
        this.rotatePage(index, 90);
      });

      // Context menu / right-click to rotate -90°
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.rotatePage(index, -90);
      });

      // Checkbox click
      const checkbox = card.querySelector('.page-checkbox');
      checkbox?.addEventListener('change', (e) => {
        pageItem.isSelected = e.target.checked;
        card.classList.toggle('border-blue-600', pageItem.isSelected);
        card.classList.toggle('bg-blue-50/30', pageItem.isSelected);
        card.classList.toggle('dark:bg-blue-950/20', pageItem.isSelected);
        this.updateSelectedCountUI();
      });

      // CCW and CW button clicks
      card.querySelector('.btn-rotate-ccw')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotatePage(index, -90);
      });

      card.querySelector('.btn-rotate-cw')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.rotatePage(index, 90);
      });

      this.pageGrid.appendChild(card);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  async loadThumbnailsLazily() {
    if (!this.pdfDocProxy) return;

    for (let i = 0; i < this.pagesData.length; i++) {
      const pageItem = this.pagesData[i];
      try {
        const page = await this.pdfDocProxy.getPage(pageItem.pageNum);
        pageItem.originalRotation = page.rotate || 0;

        const viewport = page.getViewport({ scale: 0.35 });
        const canvas = document.getElementById(`canvas-p-${pageItem.pageNum}`);
        if (canvas) {
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext('2d');
          await page.render({ canvasContext: ctx, viewport }).promise;

          const card = document.getElementById(`page-card-${pageItem.pageNum}`);
          card?.querySelector('.thumb-loader')?.classList.add('hidden');
        }
      } catch (err) {
        console.warn(`Error rendering thumbnail page ${pageItem.pageNum}:`, err);
      }
    }
  }

  // -------------------------------------------------------------
  // Rotation Logic
  // -------------------------------------------------------------
  rotatePage(index, angleChange) {
    const pageItem = this.pagesData[index];
    if (!pageItem) return;

    let newAdded = (pageItem.addedRotation + angleChange) % 360;
    if (newAdded < 0) newAdded += 360;
    pageItem.addedRotation = newAdded;

    this.updatePageCardUI(pageItem);
  }

  rotateAll(angleChange) {
    this.pagesData.forEach((pageItem) => {
      let newAdded = (pageItem.addedRotation + angleChange) % 360;
      if (newAdded < 0) newAdded += 360;
      pageItem.addedRotation = newAdded;
      this.updatePageCardUI(pageItem);
    });

    const directionText = angleChange > 0 ? 'clockwise (+90°)' : 'counterclockwise (-90°)';
    this.showToast(`Rotated all pages ${directionText}`, 'info');
  }

  rotateSelected(angleChange) {
    const selected = this.pagesData.filter(p => p.isSelected);
    if (selected.length === 0) {
      this.showToast('Please select at least one page to rotate.', 'warning');
      return;
    }

    selected.forEach(pageItem => {
      let newAdded = (pageItem.addedRotation + angleChange) % 360;
      if (newAdded < 0) newAdded += 360;
      pageItem.addedRotation = newAdded;
      this.updatePageCardUI(pageItem);
    });

    this.showToast(`Rotated ${selected.length} selected pages!`, 'info');
  }

  setSelectionAll(selected) {
    this.pagesData.forEach((pageItem) => {
      pageItem.isSelected = selected;
      const card = document.getElementById(`page-card-${pageItem.pageNum}`);
      if (card) {
        const checkbox = card.querySelector('.page-checkbox');
        if (checkbox) checkbox.checked = selected;
        card.classList.toggle('border-blue-600', selected);
        card.classList.toggle('bg-blue-50/30', selected);
        card.classList.toggle('dark:bg-blue-950/20', selected);
      }
    });

    this.updateSelectedCountUI();
    this.showToast(selected ? 'Selected all pages' : 'Deselected all pages', 'info');
  }

  resetRotations() {
    this.pagesData.forEach((pageItem) => {
      pageItem.addedRotation = 0;
      this.updatePageCardUI(pageItem);
    });

    this.showToast('Reset all rotations to original orientation', 'info');
  }

  updatePageCardUI(pageItem) {
    const card = document.getElementById(`page-card-${pageItem.pageNum}`);
    if (!card) return;

    // Update Angle Badge
    const badge = card.querySelector('.angle-badge');
    if (badge) {
      badge.textContent = `${pageItem.addedRotation}°`;
      if (pageItem.addedRotation !== 0) {
        badge.classList.remove('bg-neutral-100', 'text-neutral-600', 'dark:bg-neutral-800', 'dark:text-neutral-300');
        badge.classList.add('bg-blue-600', 'text-white');
      } else {
        badge.classList.add('bg-neutral-100', 'text-neutral-600', 'dark:bg-neutral-800', 'dark:text-neutral-300');
        badge.classList.remove('bg-blue-600', 'text-white');
      }
    }

    // Update CSS transform on canvas container
    const canvasBox = card.querySelector('.thumb-canvas-box');
    if (canvasBox) {
      canvasBox.style.transform = `rotate(${pageItem.addedRotation}deg)`;
    }
  }

  updateSelectedCountUI() {
    const count = this.pagesData.filter(p => p.isSelected).length;
    if (this.selectedCountBadge) {
      this.selectedCountBadge.textContent = `${count} selected`;
      this.selectedCountBadge.classList.toggle('hidden', count === 0);
    }
    if (this.rotateSelectedCwBtn) {
      this.rotateSelectedCwBtn.disabled = count === 0;
    }
  }

  // -------------------------------------------------------------
  // Execution: Apply Rotation using pdf-lib
  // -------------------------------------------------------------
  async executeRotatePdf() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    // Check if any rotations were changed
    const hasChanges = this.pagesData.some(p => p.addedRotation !== 0);
    if (!hasChanges) {
      this.showToast('No rotations applied. Click pages or use bulk rotate first.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF processing library is loading...', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Applying page rotations to PDF...');

    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this.pdfBytes);
      const pages = pdfDoc.getPages();

      const total = pages.length;
      for (let i = 0; i < total; i++) {
        const page = pages[i];
        const pageData = this.pagesData[i];

        if (pageData && pageData.addedRotation !== 0) {
          const currentAngle = page.getRotation().angle || 0;
          let newAngle = (currentAngle + pageData.addedRotation) % 360;
          if (newAngle < 0) newAngle += 360;
          page.setRotation(degrees(newAngle));
        }

        const pct = Math.round(((i + 1) / total) * 100);
        this.updateProgress(pct, `Rotating page ${i + 1} of ${total}...`);
      }

      this.updateProgress(100, 'Saving rotated document...');
      const savedBytes = await pdfDoc.save();

      this.rotatedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.rotatedUrl) URL.revokeObjectURL(this.rotatedUrl);
      this.rotatedUrl = URL.createObjectURL(this.rotatedBlob);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection();
      }, 300);
    } catch (err) {
      console.error('Rotate execution error:', err);
      this.showProcessingModal(false);
      this.showToast(`Rotation failed: ${err.message}`, 'error');
    }
  }

  showDownloadSection() {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSizeBadge && this.rotatedBlob) {
      this.resultSizeBadge.textContent = formatBytes(this.rotatedBlob.size);
    }

    this.showToast('✅ Rotated successfully!', 'success');
  }

  downloadRotatedPdf() {
    if (!this.rotatedBlob || !this.rotatedUrl) return;

    const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const timestamp = getFormattedTimestamp();
    const filename = `rotated_${timestamp}.pdf`;

    const a = document.createElement('a');
    a.href = this.rotatedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetAll() {
    if (this.rotatedUrl) URL.revokeObjectURL(this.rotatedUrl);
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.pagesData = [];
    this.rotatedBlob = null;
    this.rotatedUrl = null;
    this.totalPages = 0;

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
  window.rotatePdfApp = new RotatePdfApp();
});
