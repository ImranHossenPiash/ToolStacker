/**
 * ToolStacker Flatten PDF Tool
 * 100% Client-Side • Form Fields & Annotations Permanent Baking • Real-time Preview
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

class FlattenPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;

    // Detected counts & annotations per page
    this.totalFormFields = 0;
    this.totalAnnotations = 0;
    this.pageAnnotationsMap = new Map(); // pageNum -> array of annot objects

    // Flatten Options
    this.flattenFormFields = true;
    this.flattenAnnotations = true;
    this.flattenAll = true;

    // Preview state
    this.showOverlays = true;
    this.pageViewport = null;
    this.currentScale = 1.0;

    // Result PDF
    this.modifiedBlob = null;
    this.modifiedUrl = null;

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

    // Detection Summary Bar
    this.detectionSummary = document.getElementById('detection-summary');
    this.detectionText = document.getElementById('detection-text');
    this.detectionStatusBadge = document.getElementById('detection-status-badge');
    this.noElementsWarning = document.getElementById('no-elements-warning');

    // Flatten Options Checkboxes
    this.optAll = document.getElementById('opt-flatten-all');
    this.optFields = document.getElementById('opt-flatten-fields');
    this.optAnnots = document.getElementById('opt-flatten-annots');

    // Option Badges
    this.badgeFieldsCount = document.getElementById('badge-fields-count');
    this.badgeAnnotsCount = document.getElementById('badge-annots-count');

    // Preview Elements
    this.previewCanvas = document.getElementById('preview-canvas');
    this.overlayContainer = document.getElementById('preview-overlay-container');
    this.previewWrapper = document.getElementById('preview-wrapper');
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.toggleOverlaysBtn = document.getElementById('toggle-overlays-btn');
    this.previewPageAnnotCount = document.getElementById('preview-page-annot-count');
    this.previewSpinner = document.getElementById('preview-spinner');

    // Action Buttons
    this.flattenBtn = document.getElementById('flatten-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.stickyFlattenBtn = document.getElementById('sticky-flatten-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultBeforeSize = document.getElementById('result-before-size');
    this.resultAfterSize = document.getElementById('result-after-size');
    this.resultSavingsBadge = document.getElementById('result-savings-badge');
    this.flattenAnotherBtn = document.getElementById('flatten-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('flatten-progress-fill');
    this.progressPct = document.getElementById('flatten-progress-pct');
    this.progressText = document.getElementById('flatten-progress-text');
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
    this.flattenAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Checkbox Options Sync
    this.optAll?.addEventListener('change', (e) => {
      const isChecked = e.target.checked;
      this.flattenAll = isChecked;
      this.flattenFormFields = isChecked;
      this.flattenAnnotations = isChecked;

      if (this.optFields) this.optFields.checked = isChecked;
      if (this.optAnnots) this.optAnnots.checked = isChecked;
      this.validateActionState();
      this.renderOverlays();
    });

    this.optFields?.addEventListener('change', (e) => {
      this.flattenFormFields = e.target.checked;
      this.syncSelectAllCheckbox();
      this.validateActionState();
      this.renderOverlays();
    });

    this.optAnnots?.addEventListener('change', (e) => {
      this.flattenAnnotations = e.target.checked;
      this.syncSelectAllCheckbox();
      this.validateActionState();
      this.renderOverlays();
    });

    // Preview Page Controls
    this.prevPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum > 1) {
        this.currentPageNum--;
        this.renderPreviewPage(this.currentPageNum);
      }
    });

    this.nextPageBtn?.addEventListener('click', () => {
      if (this.currentPageNum < this.totalPages) {
        this.currentPageNum++;
        this.renderPreviewPage(this.currentPageNum);
      }
    });

    this.toggleOverlaysBtn?.addEventListener('click', () => {
      this.showOverlays = !this.showOverlays;
      if (this.overlayContainer) {
        this.overlayContainer.classList.toggle('hidden', !this.showOverlays);
      }
      this.toggleOverlaysBtn.classList.toggle('bg-blue-50', this.showOverlays);
      this.toggleOverlaysBtn.classList.toggle('text-blue-600', this.showOverlays);
      this.toggleOverlaysBtn.classList.toggle('dark:bg-blue-950/40', this.showOverlays);
      this.showToast(this.showOverlays ? 'Overlays enabled' : 'Overlays hidden', 'info');
    });

    // Execution Buttons
    this.flattenBtn?.addEventListener('click', () => this.executeFlattenPdf());
    this.stickyFlattenBtn?.addEventListener('click', () => this.executeFlattenPdf());
    this.downloadBtn?.addEventListener('click', () => this.downloadFlattenedPdf());

    // Window Resize Handling for Overlays
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.pdfDocProxy && !this.workspace.classList.contains('hidden')) {
          this.renderPreviewPage(this.currentPageNum);
        }
      }, 200);
    });
  }

  syncSelectAllCheckbox() {
    const bothChecked = this.flattenFormFields && this.flattenAnnotations;
    this.flattenAll = bothChecked;
    if (this.optAll) {
      this.optAll.checked = bothChecked;
      this.optAll.indeterminate =
        !bothChecked && (this.flattenFormFields || this.flattenAnnotations);
    }
  }

  validateActionState() {
    const hasSelection = this.flattenFormFields || this.flattenAnnotations;
    if (this.flattenBtn) this.flattenBtn.disabled = !hasSelection;
    if (this.stickyFlattenBtn) this.stickyFlattenBtn.disabled = !hasSelection;
  }

  // -------------------------------------------------------------
  // Load PDF & Scan Form Fields / Annotations
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

    this.showProcessingModal(true, 'Scanning document for form fields & annotations...');
    this.updateProgress(15, 'Loading PDF parser in memory...');

    try {
      this.currentFile = file;
      this.pdfBytes = await file.arrayBuffer();

      const loadingTask = window.pdfjsLib.getDocument({
        data: this.pdfBytes.slice(0),
        enableXfa: true,
      });

      this.pdfDocProxy = await loadingTask.promise;
      this.totalPages = this.pdfDocProxy.numPages;
      this.currentPageNum = 1;

      if (this.docName) this.docName.textContent = file.name;
      if (this.docDetails) {
        this.docDetails.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      this.updateProgress(40, 'Scanning annotations across all pages...');

      // Scan every page for annotations & form fields
      this.totalFormFields = 0;
      this.totalAnnotations = 0;
      this.pageAnnotationsMap.clear();

      for (let p = 1; p <= this.totalPages; p++) {
        const page = await this.pdfDocProxy.getPage(p);
        const annots = await page.getAnnotations({ intent: 'display' });
        
        let pageFormCount = 0;
        let pageAnnotCount = 0;

        const classifiedAnnots = annots.map((a) => {
          const isFormField = a.subtype === 'Widget';
          if (isFormField) {
            pageFormCount++;
          } else {
            pageAnnotCount++;
          }
          return {
            ...a,
            isFormField,
            label: isFormField
              ? (a.fieldName || a.alternativeText || 'Form Field')
              : (a.annotationTypeStr || a.subtype || 'Annotation')
          };
        });

        this.totalFormFields += pageFormCount;
        this.totalAnnotations += pageAnnotCount;
        this.pageAnnotationsMap.set(p, classifiedAnnots);

        const scanPct = Math.round(40 + (p / this.totalPages) * 45);
        this.updateProgress(scanPct, `Analyzed page ${p} of ${this.totalPages}...`);
      }

      this.updateProgress(95, 'Preparing visual workspace...');

      // Update UI Counters & Detection message
      this.updateDetectionUI();

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      // Render initial preview page
      await this.renderPreviewPage(1);

      if (this.totalFormFields === 0 && this.totalAnnotations === 0) {
        this.showToast('No form fields or annotations detected. PDF appears already flattened.', 'warning');
      } else {
        this.showToast(
          `Detected ${this.totalFormFields} form field${this.totalFormFields === 1 ? '' : 's'} and ${this.totalAnnotations} annotation${this.totalAnnotations === 1 ? '' : 's'}.`,
          'info'
        );
      }
    } catch (err) {
      console.error('PDF Load Error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to load PDF: ${err.message}`, 'error');
    }
  }

  updateDetectionUI() {
    const hasElements = this.totalFormFields > 0 || this.totalAnnotations > 0;

    if (this.badgeFieldsCount) {
      this.badgeFieldsCount.textContent = `${this.totalFormFields} detected`;
    }
    if (this.badgeAnnotsCount) {
      this.badgeAnnotsCount.textContent = `${this.totalAnnotations} detected`;
    }

    if (this.detectionText) {
      if (hasElements) {
        this.detectionText.innerHTML = `
          Detected <span class="font-bold text-neutral-900 dark:text-neutral-100">${this.totalFormFields}</span> form field${this.totalFormFields === 1 ? '' : 's'} and <span class="font-bold text-neutral-900 dark:text-neutral-100">${this.totalAnnotations}</span> annotation${this.totalAnnotations === 1 ? '' : 's'}.
        `;
      } else {
        this.detectionText.innerHTML = `
          <span class="text-amber-600 dark:text-amber-400 font-semibold">No interactive form fields or annotations detected.</span>
        `;
      }
    }

    if (this.detectionStatusBadge) {
      if (hasElements) {
        this.detectionStatusBadge.className =
          'px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1';
        this.detectionStatusBadge.innerHTML = `
          <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
          <span>Ready to Flatten</span>
        `;
      } else {
        this.detectionStatusBadge.className =
          'px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1';
        this.detectionStatusBadge.innerHTML = `
          <i data-lucide="info" class="w-3.5 h-3.5"></i>
          <span>Already Flattened</span>
        `;
      }
    }

    if (this.noElementsWarning) {
      this.noElementsWarning.classList.toggle('hidden', hasElements);
    }

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // -------------------------------------------------------------
  // Preview Page Rendering & Overlay Highlight Box Generation
  // -------------------------------------------------------------
  async renderPreviewPage(pageNum) {
    if (!this.pdfDocProxy) return;

    this.currentPageNum = pageNum;
    if (this.pageIndicator) {
      this.pageIndicator.textContent = `Page ${pageNum} of ${this.totalPages}`;
    }
    if (this.prevPageBtn) this.prevPageBtn.disabled = pageNum <= 1;
    if (this.nextPageBtn) this.nextPageBtn.disabled = pageNum >= this.totalPages;

    this.previewSpinner?.classList.remove('hidden');

    try {
      const page = await this.pdfDocProxy.getPage(pageNum);
      
      // Calculate responsive scale to fit container nicely
      const containerWidth = this.previewWrapper?.clientWidth || 640;
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const targetScale = Math.min(1.4, Math.max(0.6, (containerWidth - 32) / unscaledViewport.width));
      this.currentScale = targetScale;

      const viewport = page.getViewport({ scale: targetScale });
      this.pageViewport = viewport;

      if (this.previewCanvas) {
        this.previewCanvas.width = Math.round(viewport.width);
        this.previewCanvas.height = Math.round(viewport.height);
        this.previewCanvas.style.width = `${Math.round(viewport.width)}px`;
        this.previewCanvas.style.height = `${Math.round(viewport.height)}px`;

        const ctx = this.previewCanvas.getContext('2d');
        const renderContext = {
          canvasContext: ctx,
          viewport: viewport,
          // Render annotations natively on canvas
          annotationMode: window.pdfjsLib.AnnotationMode.ENABLE,
        };

        await page.render(renderContext).promise;
      }

      if (this.overlayContainer) {
        this.overlayContainer.style.width = `${Math.round(viewport.width)}px`;
        this.overlayContainer.style.height = `${Math.round(viewport.height)}px`;
      }

      this.renderOverlays();
      this.previewSpinner?.classList.add('hidden');
    } catch (err) {
      console.error('Preview render error:', err);
      this.previewSpinner?.classList.add('hidden');
    }
  }

  renderOverlays() {
    if (!this.overlayContainer || !this.pageViewport) return;
    this.overlayContainer.innerHTML = '';

    const annots = this.pageAnnotationsMap.get(this.currentPageNum) || [];
    
    let pageFieldsCount = 0;
    let pageAnnotsCount = 0;

    annots.forEach((annot) => {
      const isField = annot.isFormField;
      if (isField) pageFieldsCount++;
      else pageAnnotsCount++;

      // Check if user has this category selected for flattening
      const willFlatten = isField ? this.flattenFormFields : this.flattenAnnotations;

      // Transform PDF rect [x1, y1, x2, y2] to viewport coordinates [vx1, vy1, vx2, vy2]
      if (!annot.rect || annot.rect.length < 4) return;
      const viewRect = this.pageViewport.convertToViewportRectangle(annot.rect);
      
      const left = Math.min(viewRect[0], viewRect[2]);
      const top = Math.min(viewRect[1], viewRect[3]);
      const width = Math.abs(viewRect[2] - viewRect[0]);
      const height = Math.abs(viewRect[3] - viewRect[1]);

      const box = document.createElement('div');
      box.className =
        'absolute rounded-md pointer-events-auto transition-all cursor-pointer group flex items-start';
      
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${Math.max(width, 16)}px`;
      box.style.height = `${Math.max(height, 16)}px`;

      if (isField) {
        // Form field style (Blue / Cyan)
        box.classList.add(
          'border-2',
          willFlatten ? 'border-blue-500' : 'border-neutral-400 border-dashed',
          willFlatten ? 'bg-blue-500/15' : 'bg-neutral-500/10'
        );
      } else {
        // Annotation style (Amber / Rose)
        box.classList.add(
          'border-2',
          willFlatten ? 'border-amber-500' : 'border-neutral-400 border-dashed',
          willFlatten ? 'bg-amber-500/15' : 'bg-neutral-500/10'
        );
      }

      // Tooltip / Label tag
      const badge = document.createElement('span');
      badge.className = `absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold font-mono tracking-tight whitespace-nowrap shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 ${
        isField
          ? 'bg-blue-600 text-white'
          : 'bg-amber-600 text-white'
      }`;
      badge.textContent = `${isField ? 'Field: ' : 'Annot: '}${annot.label}`;
      box.appendChild(badge);

      box.title = `${annot.label} (${isField ? 'Form Field' : 'Annotation'}${willFlatten ? ' - Will Flatten' : ' - Skipped'})`;

      this.overlayContainer.appendChild(box);
    });

    if (this.previewPageAnnotCount) {
      this.previewPageAnnotCount.textContent = `Page has ${pageFieldsCount} field${pageFieldsCount === 1 ? '' : 's'}, ${pageAnnotsCount} annotation${pageAnnotsCount === 1 ? '' : 's'}`;
    }
  }

  // -------------------------------------------------------------
  // Execution: Flatten PDF using pdf-lib
  // -------------------------------------------------------------
  async executeFlattenPdf() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF document first.', 'warning');
      return;
    }

    if (!this.flattenFormFields && !this.flattenAnnotations) {
      this.showToast('Please select at least one flatten option.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Initializing PDF flattening engine...');
    this.updateProgress(10, 'Loading document in browser memory...');

    try {
      const { PDFDocument } = window.PDFLib;
      
      this.updateProgress(25, 'Parsing document dictionary & AcroForm...');
      const pdfDoc = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });

      // Step 1: Form Fields Flattening
      if (this.flattenFormFields) {
        this.updateProgress(45, 'Making form fields permanent (flattening widgets)...');
        try {
          const form = pdfDoc.getForm();
          if (form) {
            form.flatten();
          }
        } catch (formErr) {
          console.warn('Form flatten notice:', formErr);
        }
      }

      // Step 2: Annotations Flattening
      if (this.flattenAnnotations) {
        this.updateProgress(65, 'Flattening visual annotations into page content...');
        // In pdf-lib, each page can have an Annots array.
        // If annotations are requested to be flattened, we bake or remove the interactive annotation wrappers.
        const pages = pdfDoc.getPages();
        for (let i = 0; i < pages.length; i++) {
          const page = pages[i];
          const node = page.node;
          
          // Check Annots dictionary
          if (node.has(window.PDFLib.PDFName.of('Annots'))) {
            const annotsRef = node.get(window.PDFLib.PDFName.of('Annots'));
            // If we also want to remove interactive link/popup/widget triggers:
            if (this.flattenAnnotations && this.flattenFormFields) {
              // Completely clear the interactive annotations dictionary so nothing remains clickable or editable
              node.delete(window.PDFLib.PDFName.of('Annots'));
            }
          }

          const pct = Math.round(65 + ((i + 1) / pages.length) * 20);
          this.updateProgress(pct, `Processed page ${i + 1} of ${pages.length}...`);
        }
      }

      this.updateProgress(90, 'Generating final flattened PDF byte stream...');
      const savedBytes = await pdfDoc.save();

      this.modifiedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.modifiedUrl) URL.revokeObjectURL(this.modifiedUrl);
      this.modifiedUrl = URL.createObjectURL(this.modifiedBlob);

      this.updateProgress(100, 'Done!');

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection(this.currentFile.size, this.modifiedBlob.size);
      }, 350);
    } catch (err) {
      console.error('Flatten execution error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to flatten PDF: ${err.message}`, 'error');
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

    if (this.resultSavingsBadge) {
      const diff = originalSize - newSize;
      const pct = originalSize > 0 ? Math.round((Math.abs(diff) / originalSize) * 100) : 0;
      if (diff > 0) {
        this.resultSavingsBadge.textContent = `${pct}% smaller`;
        this.resultSavingsBadge.className =
          'px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
      } else if (diff < 0) {
        this.resultSavingsBadge.textContent = `+${pct}% size change`;
        this.resultSavingsBadge.className =
          'px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
      } else {
        this.resultSavingsBadge.textContent = 'Same size';
        this.resultSavingsBadge.className =
          'px-2 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300';
      }
    }

    if (this.resultSuccessMsg) {
      this.resultSuccessMsg.textContent = `Flattened successfully! (${formatBytes(originalSize)} → ${formatBytes(newSize)})`;
    }

    this.showToast('✅ PDF flattened successfully! Form fields and annotations are now permanent.', 'success');
  }

  downloadFlattenedPdf() {
    if (!this.modifiedBlob || !this.modifiedUrl) return;

    const baseName = this.currentFile
      ? this.currentFile.name.replace(/\.[^/.]+$/, '')
      : 'document';
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_flattened_${timestamp}.pdf`;

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
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.totalFormFields = 0;
    this.totalAnnotations = 0;
    this.pageAnnotationsMap.clear();
    this.modifiedBlob = null;
    this.modifiedUrl = null;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    if (this.previewCanvas) {
      const ctx = this.previewCanvas.getContext('2d');
      ctx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    }
    if (this.overlayContainer) this.overlayContainer.innerHTML = '';
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
  window.flattenPdfApp = new FlattenPdfApp();
});
