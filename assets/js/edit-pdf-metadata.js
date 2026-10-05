/**
 * ToolStacker Edit PDF Metadata Tool
 * 100% Client-Side • View, Edit, or Strip PDF Document Properties • Live Before/After Diff
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

function formatDate(d) {
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '(none)';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

class EditPdfMetadataApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDoc = null;
    this.totalPages = 0;

    // Original Metadata Snapshot
    this.originalMetadata = {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      creator: '',
      producer: '',
      creationDate: null,
      modificationDate: null,
    };

    // Modified PDF Result
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

    // Workspace & Header
    this.workspace = document.getElementById('workspace');
    this.docName = document.getElementById('doc-name');
    this.docDetails = document.getElementById('doc-details');
    this.resetBtn = document.getElementById('reset-btn');

    // Protected PDF / Empty Warnings
    this.protectedWarning = document.getElementById('protected-warning');
    this.noMetadataInfo = document.getElementById('no-metadata-info');

    // Current Read-Only Metadata Badges
    this.dispTitle = document.getElementById('disp-title');
    this.dispAuthor = document.getElementById('disp-author');
    this.dispSubject = document.getElementById('disp-subject');
    this.dispKeywords = document.getElementById('disp-keywords');
    this.dispCreator = document.getElementById('disp-creator');
    this.dispProducer = document.getElementById('disp-producer');
    this.dispCreationDate = document.getElementById('disp-creation-date');
    this.dispModificationDate = document.getElementById('disp-modification-date');

    // Form Inputs
    this.inputTitle = document.getElementById('input-title');
    this.inputAuthor = document.getElementById('input-author');
    this.inputSubject = document.getElementById('input-subject');
    this.inputKeywords = document.getElementById('input-keywords');
    this.inputCreator = document.getElementById('input-creator');
    this.inputProducer = document.getElementById('input-producer');

    // Action Buttons
    this.stripAllBtn = document.getElementById('strip-all-btn');
    this.saveBtn = document.getElementById('save-btn');
    this.cancelBtn = document.getElementById('cancel-btn');
    this.stickySaveBtn = document.getElementById('sticky-save-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Comparison Diff Table
    this.diffTableContainer = document.getElementById('diff-table-container');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.downloadBtn = document.getElementById('download-btn');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultFileBadge = document.getElementById('result-file-badge');
    this.editAnotherBtn = document.getElementById('edit-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('meta-progress-fill');
    this.progressPct = document.getElementById('meta-progress-pct');
    this.progressText = document.getElementById('meta-progress-text');
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
    this.editAnotherBtn?.addEventListener('click', () => this.resetAll());

    // Live update of before/after diff table when typing in inputs
    const inputs = [
      this.inputTitle,
      this.inputAuthor,
      this.inputSubject,
      this.inputKeywords,
      this.inputCreator,
      this.inputProducer,
    ];
    inputs.forEach((input) => {
      input?.addEventListener('input', () => this.renderDiffTable());
    });

    // Strip All Metadata Button
    this.stripAllBtn?.addEventListener('click', () => this.stripAllMetadataFields());

    // Save Changes Execution
    this.saveBtn?.addEventListener('click', () => this.executeSaveMetadata());
    this.stickySaveBtn?.addEventListener('click', () => this.executeSaveMetadata());
    this.downloadBtn?.addEventListener('click', () => this.downloadModifiedPdf());
  }

  // -------------------------------------------------------------
  // Load PDF & Extract Metadata
  // -------------------------------------------------------------
  async loadPdfFile(file) {
    if (!file) return;

    if (file.size === 0) {
      this.showToast('Selected file is empty (0 bytes).', 'error');
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      this.showToast('File exceeds 200MB maximum size limit.', 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document.', 'error');
      return;
    }

    this.showProcessingModal(true, 'Reading PDF properties & dictionary...');
    this.updateProgress(20, 'Parsing PDF Document Information Dictionary...');

    try {
      this.currentFile = file;
      this.pdfBytes = await file.arrayBuffer();

      if (!window.PDFLib) {
        throw new Error('PDF library is not loaded yet.');
      }

      const { PDFDocument } = window.PDFLib;
      
      // Load PDF
      let pdfDoc;
      try {
        pdfDoc = await PDFDocument.load(this.pdfBytes);
      } catch (loadErr) {
        if (loadErr.message && loadErr.message.toLowerCase().includes('encrypt')) {
          this.showProcessingModal(false);
          this.showProtectedWarning();
          return;
        }
        // Try fallback with ignoreEncryption
        pdfDoc = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });
      }

      this.pdfDoc = pdfDoc;
      this.totalPages = pdfDoc.getPageCount();

      this.updateProgress(60, 'Extracting document attributes...');

      // Extract Current Metadata
      const rawKeywords = pdfDoc.getKeywords();
      let keywordsStr = '';
      if (Array.isArray(rawKeywords)) {
        keywordsStr = rawKeywords.join(', ');
      } else if (typeof rawKeywords === 'string') {
        keywordsStr = rawKeywords;
      }

      this.originalMetadata = {
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
        subject: pdfDoc.getSubject() || '',
        keywords: keywordsStr || '',
        creator: pdfDoc.getCreator() || '',
        producer: pdfDoc.getProducer() || '',
        creationDate: pdfDoc.getCreationDate() || null,
        modificationDate: pdfDoc.getModificationDate() || null,
      };

      if (this.docName) this.docName.textContent = file.name;
      if (this.docDetails) {
        this.docDetails.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      // Populate Read-Only Display
      this.populateReadOnlyDisplay();

      // Populate Editable Form Inputs
      this.populateEditInputs();

      // Render Initial Diff
      this.renderDiffTable();

      // Check if document has zero metadata
      const hasAnyMeta = Object.entries(this.originalMetadata).some(([k, v]) => {
        if (k === 'creationDate' || k === 'modificationDate') return !!v;
        return typeof v === 'string' && v.trim().length > 0;
      });

      if (this.noMetadataInfo) {
        this.noMetadataInfo.classList.toggle('hidden', hasAnyMeta);
      }

      this.showProcessingModal(false);
      this.dropzone?.classList.add('hidden');
      this.workspace?.classList.remove('hidden');
      this.stickyBar?.classList.remove('hidden');

      this.showToast(`Loaded metadata for "${file.name}".`, 'info');
    } catch (err) {
      console.error('PDF load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to read PDF: ${err.message}`, 'error');
    }
  }

  showProtectedWarning() {
    this.dropzone?.classList.add('hidden');
    this.workspace?.classList.remove('hidden');
    if (this.protectedWarning) this.protectedWarning.classList.remove('hidden');
    if (this.saveBtn) this.saveBtn.disabled = true;
    if (this.stripAllBtn) this.stripAllBtn.disabled = true;
    if (this.stickySaveBtn) this.stickySaveBtn.disabled = true;
    this.showToast('This PDF is password-protected. Cannot edit metadata.', 'error');
  }

  populateReadOnlyDisplay() {
    const setDisp = (el, val) => {
      if (!el) return;
      const cleanVal = (val || '').trim();
      if (cleanVal) {
        el.textContent = cleanVal;
        el.className = 'font-bold text-neutral-800 dark:text-neutral-100 text-xs break-all';
      } else {
        el.textContent = '(none)';
        el.className = 'italic text-neutral-400 dark:text-neutral-500 text-xs';
      }
    };

    setDisp(this.dispTitle, this.originalMetadata.title);
    setDisp(this.dispAuthor, this.originalMetadata.author);
    setDisp(this.dispSubject, this.originalMetadata.subject);
    setDisp(this.dispKeywords, this.originalMetadata.keywords);
    setDisp(this.dispCreator, this.originalMetadata.creator);
    setDisp(this.dispProducer, this.originalMetadata.producer);

    if (this.dispCreationDate) {
      this.dispCreationDate.textContent = formatDate(this.originalMetadata.creationDate);
    }
    if (this.dispModificationDate) {
      this.dispModificationDate.textContent = formatDate(this.originalMetadata.modificationDate);
    }
  }

  populateEditInputs() {
    if (this.inputTitle) this.inputTitle.value = this.originalMetadata.title;
    if (this.inputAuthor) this.inputAuthor.value = this.originalMetadata.author;
    if (this.inputSubject) this.inputSubject.value = this.originalMetadata.subject;
    if (this.inputKeywords) this.inputKeywords.value = this.originalMetadata.keywords;
    if (this.inputCreator) this.inputCreator.value = this.originalMetadata.creator;
    if (this.inputProducer) this.inputProducer.value = this.originalMetadata.producer;
  }

  stripAllMetadataFields() {
    if (this.inputTitle) this.inputTitle.value = '';
    if (this.inputAuthor) this.inputAuthor.value = '';
    if (this.inputSubject) this.inputSubject.value = '';
    if (this.inputKeywords) this.inputKeywords.value = '';
    if (this.inputCreator) this.inputCreator.value = '';
    if (this.inputProducer) this.inputProducer.value = '';

    this.renderDiffTable();
    this.showToast('All metadata cleared from form. Click "Save Changes" to apply.', 'warning');
  }

  // -------------------------------------------------------------
  // Live Before / After Comparison Table
  // -------------------------------------------------------------
  renderDiffTable() {
    if (!this.diffTableContainer) return;

    const fields = [
      { key: 'title', label: 'Title', orig: this.originalMetadata.title, cur: this.inputTitle?.value || '' },
      { key: 'author', label: 'Author', orig: this.originalMetadata.author, cur: this.inputAuthor?.value || '' },
      { key: 'subject', label: 'Subject', orig: this.originalMetadata.subject, cur: this.inputSubject?.value || '' },
      { key: 'keywords', label: 'Keywords', orig: this.originalMetadata.keywords, cur: this.inputKeywords?.value || '' },
      { key: 'creator', label: 'Creator', orig: this.originalMetadata.creator, cur: this.inputCreator?.value || '' },
      { key: 'producer', label: 'Producer', orig: this.originalMetadata.producer, cur: this.inputProducer?.value || '' },
    ];

    let html = `
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs border-collapse">
          <thead>
            <tr class="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 font-semibold text-[11px] uppercase tracking-wider">
              <th class="py-2.5 px-3">Property</th>
              <th class="py-2.5 px-3">Original Value</th>
              <th class="py-2.5 px-3">New Value</th>
              <th class="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100 dark:divide-neutral-800">
    `;

    fields.forEach((f) => {
      const origTrim = f.orig.trim();
      const curTrim = f.cur.trim();

      let statusBadge = '';
      if (origTrim === curTrim) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">Unchanged</span>';
      } else if (origTrim && !curTrim) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">Removed</span>';
      } else if (!origTrim && curTrim) {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Added</span>';
      } else {
        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">Modified</span>';
      }

      html += `
        <tr class="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
          <td class="py-2.5 px-3 font-semibold text-neutral-700 dark:text-neutral-300 whitespace-nowrap">${f.label}</td>
          <td class="py-2.5 px-3 text-neutral-500 font-mono text-[11px] max-w-[150px] truncate" title="${origTrim || '(none)'}">
            ${origTrim ? origTrim : '<span class="italic text-neutral-400">(none)</span>'}
          </td>
          <td class="py-2.5 px-3 text-neutral-900 dark:text-neutral-100 font-mono text-[11px] font-bold max-w-[150px] truncate" title="${curTrim || '(none)'}">
            ${curTrim ? curTrim : '<span class="italic text-neutral-400 font-normal">(empty)</span>'}
          </td>
          <td class="py-2.5 px-3 text-right whitespace-nowrap">${statusBadge}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    this.diffTableContainer.innerHTML = html;
  }

  // -------------------------------------------------------------
  // Execution: Save Metadata using pdf-lib
  // -------------------------------------------------------------
  async executeSaveMetadata() {
    if (!this.pdfBytes) {
      this.showToast('Please upload a PDF file first.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF library is loading... Please wait.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Updating PDF metadata dictionary...');
    this.updateProgress(25, 'Loading PDF document stream...');

    try {
      const { PDFDocument } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });

      const newTitle = this.inputTitle?.value.trim() || '';
      const newAuthor = this.inputAuthor?.value.trim() || '';
      const newSubject = this.inputSubject?.value.trim() || '';
      const newKeywordsStr = this.inputKeywords?.value.trim() || '';
      const newCreator = this.inputCreator?.value.trim() || '';
      const newProducer = this.inputProducer?.value.trim() || '';

      this.updateProgress(50, 'Writing updated properties...');

      // Apply metadata
      pdfDoc.setTitle(newTitle);
      pdfDoc.setAuthor(newAuthor);
      pdfDoc.setSubject(newSubject);

      const kwArray = newKeywordsStr
        ? newKeywordsStr.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      pdfDoc.setKeywords(kwArray);

      pdfDoc.setCreator(newCreator);
      pdfDoc.setProducer(newProducer);
      pdfDoc.setModificationDate(new Date());

      this.updateProgress(85, 'Re-serializing PDF document...');
      const savedBytes = await pdfDoc.save();

      this.modifiedBlob = new Blob([savedBytes], { type: 'application/pdf' });
      if (this.modifiedUrl) URL.revokeObjectURL(this.modifiedUrl);
      this.modifiedUrl = URL.createObjectURL(this.modifiedBlob);

      this.updateProgress(100, 'Done!');

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadSection();
      }, 300);
    } catch (err) {
      console.error('Metadata save error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to update metadata: ${err.message}`, 'error');
    }
  }

  showDownloadSection() {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSuccessMsg && this.currentFile) {
      this.resultSuccessMsg.textContent = `Metadata updated for "${this.currentFile.name}"!`;
    }

    if (this.resultFileBadge && this.modifiedBlob) {
      this.resultFileBadge.textContent = `${formatBytes(this.modifiedBlob.size)} • ${this.totalPages} pages`;
    }

    this.showToast('✅ Metadata updated successfully!', 'success');
  }

  downloadModifiedPdf() {
    if (!this.modifiedBlob || !this.modifiedUrl) return;

    const baseName = this.currentFile
      ? this.currentFile.name.replace(/\.[^/.]+$/, '')
      : 'document';
    const timestamp = getFormattedTimestamp();
    const filename = `${baseName}_metadata_${timestamp}.pdf`;

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
    this.pdfDoc = null;
    this.totalPages = 0;
    this.modifiedBlob = null;
    this.modifiedUrl = null;

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.protectedWarning) this.protectedWarning.classList.add('hidden');
    if (this.noMetadataInfo) this.noMetadataInfo.classList.add('hidden');
    if (this.saveBtn) this.saveBtn.disabled = false;
    if (this.stripAllBtn) this.stripAllBtn.disabled = false;
    if (this.stickySaveBtn) this.stickySaveBtn.disabled = false;

    if (this.fileInput) this.fileInput.value = '';
    if (this.inputTitle) this.inputTitle.value = '';
    if (this.inputAuthor) this.inputAuthor.value = '';
    if (this.inputSubject) this.inputSubject.value = '';
    if (this.inputKeywords) this.inputKeywords.value = '';
    if (this.inputCreator) this.inputCreator.value = '';
    if (this.inputProducer) this.inputProducer.value = '';
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
  window.editPdfMetadataApp = new EditPdfMetadataApp();
});
