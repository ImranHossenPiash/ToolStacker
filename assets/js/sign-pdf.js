/**
 * ToolStacker Sign PDF Tool
 * 100% Client-Side • Draw, Type, or Upload Signature • Reusable Local Signatures
 * Powered by pdf-lib, pdf.js, and signature_pad
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

class SignPdfApp {
  constructor() {
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.currentScale = 1.0;
    this.currentViewport = null;

    // Placed signatures on the PDF
    // Array of { id, pageNum, x, y, width, height, rotation, dataUrl }
    this.placedSignatures = [];
    this.activeSignatureId = null;

    // Signature Creation Modal State
    this.activeCreationMode = 'draw'; // 'draw' | 'type' | 'upload'
    this.signaturePad = null;
    this.penColor = '#000000';
    this.selectedTypeFont = 'Dancing Script';

    // Local Storage saved signatures
    this.savedSignatures = [];
    this.loadSavedSignaturesFromStorage();

    // Result signed PDF
    this.signedPdfBlob = null;
    this.signedPdfUrl = null;

    this.cacheDom();
    this.bindEvents();
    this.initSignaturePad();
    this.renderSavedSignaturesBar();
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

    // Workspace Document Info
    this.docNameDisplay = document.getElementById('doc-name-display');
    this.docDetailsDisplay = document.getElementById('doc-details-display');
    this.changeDocBtn = document.getElementById('change-doc-btn');
    this.resetBtn = document.getElementById('reset-btn');

    // Page Navigation & Zoom
    this.prevPageBtn = document.getElementById('prev-page-btn');
    this.nextPageBtn = document.getElementById('next-page-btn');
    this.pageIndicator = document.getElementById('page-indicator');
    this.zoomSelect = document.getElementById('zoom-select');

    // PDF Canvas & Overlay Wrapper
    this.canvasWrapper = document.getElementById('pdf-canvas-wrapper');
    this.pdfCanvas = document.getElementById('pdf-canvas');
    this.signatureOverlay = document.getElementById('signature-overlay');

    // Top Action Buttons
    this.openSignModalBtn = document.getElementById('open-sign-modal-btn');
    this.savePdfBtn = document.getElementById('save-pdf-btn');
    this.stickySaveBtn = document.getElementById('sticky-save-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');
    this.savedSignaturesList = document.getElementById('saved-signatures-list');

    // Signature Creation Modal
    this.signModal = document.getElementById('sign-modal');
    this.closeSignModalBtn = document.getElementById('close-sign-modal-btn');
    this.tabDraw = document.getElementById('tab-draw');
    this.tabType = document.getElementById('tab-type');
    this.tabUpload = document.getElementById('tab-upload');
    this.panelDraw = document.getElementById('panel-draw');
    this.panelType = document.getElementById('panel-type');
    this.panelUpload = document.getElementById('panel-upload');

    // Draw Mode Elements
    this.drawCanvas = document.getElementById('draw-canvas');
    this.clearDrawBtn = document.getElementById('clear-draw-btn');
    this.undoDrawBtn = document.getElementById('undo-draw-btn');
    this.penColorRadios = document.querySelectorAll('input[name="pen-color"]');
    this.brushSizeSlider = document.getElementById('brush-size-slider');

    // Type Mode Elements
    this.typeInput = document.getElementById('type-signature-input');
    this.typeFontSelect = document.getElementById('type-font-select');
    this.typePreviewCanvas = document.getElementById('type-preview-canvas');

    // Upload Mode Elements
    this.uploadSignatureInput = document.getElementById('upload-signature-input');
    this.uploadPreviewImg = document.getElementById('upload-preview-img');
    this.uploadedDataUrl = null;

    // Insert Signature to PDF button
    this.insertSignatureBtn = document.getElementById('insert-signature-btn');
    this.saveToStorageCheckbox = document.getElementById('save-to-storage-checkbox');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('sign-progress-fill');
    this.progressPct = document.getElementById('sign-progress-pct');
    this.progressText = document.getElementById('sign-progress-text');

    // Download Section
    this.downloadBtn = document.getElementById('download-signed-pdf-btn');
    this.signAnotherBtn = document.getElementById('sign-another-btn');
    this.signedDocSizeBadge = document.getElementById('signed-doc-size');
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

      ['dragenter', 'dragover'].forEach((evt) => {
        this.dropzone.addEventListener(evt, (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.dropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach((evt) => {
        this.dropzone.addEventListener(evt, (e) => {
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
          if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            this.loadPdfFile(file);
            break;
          }
        }
      }
    });

    // Page Navigation
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener('click', () => {
        if (this.currentPageNum > 1) {
          this.currentPageNum--;
          this.renderCurrentPage();
        }
      });
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener('click', () => {
        if (this.currentPageNum < this.totalPages) {
          this.currentPageNum++;
          this.renderCurrentPage();
        }
      });
    }

    // Zoom Selector
    if (this.zoomSelect) {
      this.zoomSelect.addEventListener('change', (e) => {
        this.currentScale = parseFloat(e.target.value);
        this.renderCurrentPage();
      });
    }

    // Open/Close Signature Modal
    if (this.openSignModalBtn) {
      this.openSignModalBtn.addEventListener('click', () => this.openSignatureModal());
    }
    if (this.closeSignModalBtn) {
      this.closeSignModalBtn.addEventListener('click', () => this.closeSignatureModal());
    }

    // Modal Tabs
    if (this.tabDraw) this.tabDraw.addEventListener('click', () => this.switchCreationTab('draw'));
    if (this.tabType) this.tabType.addEventListener('click', () => this.switchCreationTab('type'));
    if (this.tabUpload) this.tabUpload.addEventListener('click', () => this.switchCreationTab('upload'));

    // Draw Mode Tools
    if (this.clearDrawBtn) {
      this.clearDrawBtn.addEventListener('click', () => {
        if (this.signaturePad) this.signaturePad.clear();
      });
    }
    if (this.undoDrawBtn) {
      this.undoDrawBtn.addEventListener('click', () => {
        if (this.signaturePad) {
          const data = this.signaturePad.toData();
          if (data && data.length > 0) {
            data.pop();
            this.signaturePad.fromData(data);
          }
        }
      });
    }
    this.penColorRadios.forEach((r) => {
      r.addEventListener('change', (e) => {
        this.penColor = e.target.value;
        if (this.signaturePad) this.signaturePad.penColor = this.penColor;
      });
    });
    if (this.brushSizeSlider) {
      this.brushSizeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.signaturePad) {
          this.signaturePad.minWidth = Math.max(0.5, val - 1);
          this.signaturePad.maxWidth = val + 1;
        }
      });
    }

    // Type Mode Tools
    if (this.typeInput) {
      this.typeInput.addEventListener('input', () => this.renderTypePreview());
    }
    if (this.typeFontSelect) {
      this.typeFontSelect.addEventListener('change', (e) => {
        this.selectedTypeFont = e.target.value;
        this.renderTypePreview();
      });
    }

    // Upload Mode Input
    if (this.uploadSignatureInput) {
      this.uploadSignatureInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            this.uploadedDataUrl = evt.target.result;
            if (this.uploadPreviewImg) {
              this.uploadPreviewImg.src = this.uploadedDataUrl;
              this.uploadPreviewImg.classList.remove('hidden');
            }
          };
          reader.readAsDataURL(e.target.files[0]);
        }
      });
    }

    // Insert Signature to PDF
    if (this.insertSignatureBtn) {
      this.insertSignatureBtn.addEventListener('click', () => this.handleInsertSignature());
    }

    // Save Signed PDF
    if (this.savePdfBtn) {
      this.savePdfBtn.addEventListener('click', () => this.exportSignedPdf());
    }
    if (this.stickySaveBtn) {
      this.stickySaveBtn.addEventListener('click', () => this.exportSignedPdf());
    }

    // Reset & Change Document
    if (this.changeDocBtn) this.changeDocBtn.addEventListener('click', () => this.fileInput.click());
    if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.resetAll());
    if (this.signAnotherBtn) this.signAnotherBtn.addEventListener('click', () => this.resetAll());

    // Download Signed PDF
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener('click', () => this.downloadSignedPdf());
    }
  }

  // -------------------------------------------------------------
  // Signature Pad Initialization
  // -------------------------------------------------------------
  initSignaturePad() {
    if (!this.drawCanvas) return;
    this.resizeDrawCanvas();

    if (window.SignaturePad) {
      this.signaturePad = new window.SignaturePad(this.drawCanvas, {
        penColor: this.penColor,
        minWidth: 1.5,
        maxWidth: 3.5,
        throttle: 16
      });
    }
  }

  resizeDrawCanvas() {
    if (!this.drawCanvas) return;
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = this.drawCanvas.getBoundingClientRect();
    this.drawCanvas.width = (rect.width || 480) * ratio;
    this.drawCanvas.height = (rect.height || 200) * ratio;
    const ctx = this.drawCanvas.getContext('2d');
    ctx.scale(ratio, ratio);
  }

  // -------------------------------------------------------------
  // PDF Intake & Rendering
  // -------------------------------------------------------------
  async loadPdfFile(file) {
    if (!file) return;

    if (file.size === 0) {
      this.showToast('Selected file is empty (0 bytes).', 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document (.pdf).', 'error');
      return;
    }

    this.currentFile = file;
    this.showProcessingModal(true, 'Loading PDF document...');

    try {
      this.pdfBytes = await file.arrayBuffer();

      if (!window.pdfjsLib) {
        throw new Error('PDF viewing library is not ready.');
      }

      const loadingTask = window.pdfjsLib.getDocument({ data: this.pdfBytes });
      this.pdfDocProxy = await loadingTask.promise;
      this.totalPages = this.pdfDocProxy.numPages;
      this.currentPageNum = 1;
      this.placedSignatures = [];

      // Update Header Info
      if (this.docNameDisplay) this.docNameDisplay.textContent = file.name;
      if (this.docDetailsDisplay) {
        this.docDetailsDisplay.textContent = `${formatBytes(file.size)} • ${this.totalPages} page${this.totalPages === 1 ? '' : 's'}`;
      }

      await this.renderCurrentPage();

      this.showProcessingModal(false);
      this.updateUI();
      this.showToast(`Document loaded! ${this.totalPages} pages ready to sign.`, 'success');
    } catch (err) {
      console.error('PDF Load Error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to load PDF: ${err.message}`, 'error');
      this.resetAll();
    }
  }

  async renderCurrentPage() {
    if (!this.pdfDocProxy || !this.pdfCanvas) return;

    try {
      const page = await this.pdfDocProxy.getPage(this.currentPageNum);
      const viewport = page.getViewport({ scale: this.currentScale });
      this.currentViewport = viewport;

      this.pdfCanvas.width = viewport.width;
      this.pdfCanvas.height = viewport.height;

      // Update overlay dimensions to match canvas
      if (this.signatureOverlay) {
        this.signatureOverlay.style.width = `${viewport.width}px`;
        this.signatureOverlay.style.height = `${viewport.height}px`;
      }

      const ctx = this.pdfCanvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: viewport }).promise;

      // Update page indicators
      if (this.pageIndicator) {
        this.pageIndicator.textContent = `Page ${this.currentPageNum} of ${this.totalPages}`;
      }
      if (this.prevPageBtn) this.prevPageBtn.disabled = this.currentPageNum <= 1;
      if (this.nextPageBtn) this.nextPageBtn.disabled = this.currentPageNum >= this.totalPages;

      // Render placed signatures for this page
      this.renderOverlaySignatures();
    } catch (err) {
      console.warn('Page render issue:', err);
    }
  }

  // -------------------------------------------------------------
  // Signature Creation Modal Logic
  // -------------------------------------------------------------
  openSignatureModal() {
    if (!this.signModal) return;
    this.signModal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    setTimeout(() => {
      this.resizeDrawCanvas();
      if (this.signaturePad) this.signaturePad.clear();
      this.renderTypePreview();
    }, 50);
  }

  closeSignatureModal() {
    if (!this.signModal) return;
    this.signModal.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  }

  switchCreationTab(tab) {
    this.activeCreationMode = tab;

    const isDraw = tab === 'draw';
    const isType = tab === 'type';
    const isUpload = tab === 'upload';

    // Tabs UI
    if (this.tabDraw) {
      this.tabDraw.classList.toggle('border-blue-600', isDraw);
      this.tabDraw.classList.toggle('text-blue-600', isDraw);
      this.tabDraw.classList.toggle('dark:text-blue-400', isDraw);
      this.tabDraw.classList.toggle('border-transparent', !isDraw);
      this.tabDraw.classList.toggle('text-neutral-500', !isDraw);
    }
    if (this.tabType) {
      this.tabType.classList.toggle('border-blue-600', isType);
      this.tabType.classList.toggle('text-blue-600', isType);
      this.tabType.classList.toggle('dark:text-blue-400', isType);
      this.tabType.classList.toggle('border-transparent', !isType);
      this.tabType.classList.toggle('text-neutral-500', !isType);
    }
    if (this.tabUpload) {
      this.tabUpload.classList.toggle('border-blue-600', isUpload);
      this.tabUpload.classList.toggle('text-blue-600', isUpload);
      this.tabUpload.classList.toggle('dark:text-blue-400', isUpload);
      this.tabUpload.classList.toggle('border-transparent', !isUpload);
      this.tabUpload.classList.toggle('text-neutral-500', !isUpload);
    }

    // Panels UI
    if (this.panelDraw) this.panelDraw.classList.toggle('hidden', !isDraw);
    if (this.panelType) this.panelType.classList.toggle('hidden', !isType);
    if (this.panelUpload) this.panelUpload.classList.toggle('hidden', !isUpload);

    if (isDraw) {
      setTimeout(() => this.resizeDrawCanvas(), 50);
    } else if (isType) {
      this.renderTypePreview();
    }
  }

  renderTypePreview() {
    if (!this.typePreviewCanvas) return;
    const text = (this.typeInput && this.typeInput.value.trim()) || 'Your Signature';
    const font = this.selectedTypeFont || 'Dancing Script';

    const canvas = this.typePreviewCanvas;
    canvas.width = 500;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = this.penColor || '#000000';
    ctx.font = `48px "${font}", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  async handleInsertSignature() {
    let signatureDataUrl = null;

    if (this.activeCreationMode === 'draw') {
      if (!this.signaturePad || this.signaturePad.isEmpty()) {
        this.showToast('Please draw your signature first.', 'warning');
        return;
      }
      signatureDataUrl = this.signaturePad.toDataURL('image/png');
    } else if (this.activeCreationMode === 'type') {
      const text = this.typeInput ? this.typeInput.value.trim() : '';
      if (!text) {
        this.showToast('Please type your name or initials.', 'warning');
        return;
      }
      signatureDataUrl = this.typePreviewCanvas.toDataURL('image/png');
    } else if (this.activeCreationMode === 'upload') {
      if (!this.uploadedDataUrl) {
        this.showToast('Please select a signature image file.', 'warning');
        return;
      }
      signatureDataUrl = this.uploadedDataUrl;
    }

    if (!signatureDataUrl) return;

    // Save to localStorage if checked
    if (this.saveToStorageCheckbox && this.saveToStorageCheckbox.checked) {
      this.saveSignatureToStorage(signatureDataUrl);
    }

    this.placeSignatureOnCurrentPage(signatureDataUrl);
    this.closeSignatureModal();
    this.showToast('Signature placed! Drag and resize anywhere on the page.', 'success');
  }

  // -------------------------------------------------------------
  // Overlay Signatures Placement & Interaction
  // -------------------------------------------------------------
  placeSignatureOnCurrentPage(dataUrl) {
    const id = 'sig_' + Math.random().toString(36).substr(2, 9);
    
    // Default initial dimensions & position centered on visible canvas
    const overlayW = this.pdfCanvas.width || 600;
    const overlayH = this.pdfCanvas.height || 800;

    const defaultWidth = Math.min(180, overlayW * 0.35);
    const defaultHeight = defaultWidth * 0.45;
    const defaultX = (overlayW - defaultWidth) / 2;
    const defaultY = (overlayH - defaultHeight) / 2;

    const item = {
      id: id,
      pageNum: this.currentPageNum,
      x: defaultX,
      y: defaultY,
      width: defaultWidth,
      height: defaultHeight,
      rotation: 0,
      dataUrl: dataUrl
    };

    this.placedSignatures.push(item);
    this.activeSignatureId = id;
    this.renderOverlaySignatures();
  }

  renderOverlaySignatures() {
    if (!this.signatureOverlay) return;
    this.signatureOverlay.innerHTML = '';

    const pageSigs = this.placedSignatures.filter(s => s.pageNum === this.currentPageNum);

    pageSigs.forEach((sig) => {
      const el = document.createElement('div');
      el.id = `sig-el-${sig.id}`;
      el.className =
        'placed-signature absolute select-none group cursor-move flex items-center justify-center border-2 transition-shadow ' +
        (this.activeSignatureId === sig.id
          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10'
          : 'border-transparent hover:border-blue-300');

      el.style.left = `${sig.x}px`;
      el.style.top = `${sig.y}px`;
      el.style.width = `${sig.width}px`;
      el.style.height = `${sig.height}px`;
      el.style.transform = `rotate(${sig.rotation}deg)`;

      el.innerHTML = `
        <img src="${sig.dataUrl}" alt="Signature" class="w-full h-full object-contain pointer-events-none" />

        <!-- Control Handles (Visible when active) -->
        <div class="sig-controls absolute -top-8 right-0 flex items-center gap-1 ${this.activeSignatureId === sig.id ? '' : 'hidden group-hover:flex'}">
          <!-- Rotation Input button -->
          <button type="button" class="btn-rotate p-1 rounded-lg bg-neutral-900 text-white hover:bg-blue-600 shadow text-[10px] cursor-pointer" title="Rotate 90°">
            <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
          </button>
          <!-- Delete button -->
          <button type="button" class="btn-delete p-1 rounded-lg bg-neutral-900 text-white hover:bg-red-600 shadow text-[10px] cursor-pointer" title="Remove">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          </button>
        </div>

        <!-- Corner Resize Handle (Bottom-Right) -->
        <div class="resize-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-600 border-2 border-white cursor-nwse-resize shadow-xs ${this.activeSignatureId === sig.id ? '' : 'hidden group-hover:block'}"></div>
      `;

      this.bindSignatureElementInteractions(el, sig);
      this.signatureOverlay.appendChild(el);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    this.updateSaveButtonState();
  }

  bindSignatureElementInteractions(el, sig) {
    // Select on click
    el.addEventListener('mousedown', (e) => {
      if (e.target.closest('.sig-controls') || e.target.closest('.resize-handle')) return;
      this.activeSignatureId = sig.id;
      this.renderOverlaySignatures();
      this.startDraggingSignature(e, sig);
    });

    el.addEventListener('touchstart', (e) => {
      if (e.target.closest('.sig-controls') || e.target.closest('.resize-handle')) return;
      this.activeSignatureId = sig.id;
      this.renderOverlaySignatures();
      this.startDraggingSignatureTouch(e, sig);
    }, { passive: false });

    // Rotate button (increments by 15 degrees)
    el.querySelector('.btn-rotate')?.addEventListener('click', (e) => {
      e.stopPropagation();
      sig.rotation = (sig.rotation + 15) % 360;
      this.renderOverlaySignatures();
    });

    // Delete button
    el.querySelector('.btn-delete')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.placedSignatures = this.placedSignatures.filter(s => s.id !== sig.id);
      this.activeSignatureId = null;
      this.renderOverlaySignatures();
      this.showToast('Signature removed.', 'info');
    });

    // Resize handle
    const resizeHandle = el.querySelector('.resize-handle');
    if (resizeHandle) {
      resizeHandle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        this.startResizingSignature(e, sig);
      });
      resizeHandle.addEventListener('touchstart', (e) => {
        e.stopPropagation();
        this.startResizingSignatureTouch(e, sig);
      }, { passive: false });
    }
  }

  startDraggingSignature(e, sig) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = sig.x;
    const initY = sig.y;

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      sig.x = Math.max(0, Math.min((this.pdfCanvas.width || 800) - sig.width, initX + dx));
      sig.y = Math.max(0, Math.min((this.pdfCanvas.height || 1000) - sig.height, initY + dy));

      const sigEl = document.getElementById(`sig-el-${sig.id}`);
      if (sigEl) {
        sigEl.style.left = `${sig.x}px`;
        sigEl.style.top = `${sig.y}px`;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  startDraggingSignatureTouch(e, sig) {
    if (!e.touches || e.touches.length === 0) return;
    e.preventDefault();
    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    const initX = sig.x;
    const initY = sig.y;

    const onTouchMove = (moveEvent) => {
      if (!moveEvent.touches || moveEvent.touches.length === 0) return;
      moveEvent.preventDefault();
      const t = moveEvent.touches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;

      sig.x = Math.max(0, Math.min((this.pdfCanvas.width || 800) - sig.width, initX + dx));
      sig.y = Math.max(0, Math.min((this.pdfCanvas.height || 1000) - sig.height, initY + dy));

      const sigEl = document.getElementById(`sig-el-${sig.id}`);
      if (sigEl) {
        sigEl.style.left = `${sig.x}px`;
        sigEl.style.top = `${sig.y}px`;
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }

  startResizingSignature(e, sig) {
    e.preventDefault();
    const startX = e.clientX;
    const initW = sig.width;
    const initH = sig.height;
    const ratio = initH / initW;

    const onMouseMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const newW = Math.max(50, Math.min(400, initW + dx));
      const newH = newW * ratio;

      sig.width = newW;
      sig.height = newH;

      const sigEl = document.getElementById(`sig-el-${sig.id}`);
      if (sigEl) {
        sigEl.style.width = `${sig.width}px`;
        sigEl.style.height = `${sig.height}px`;
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  startResizingSignatureTouch(e, sig) {
    if (!e.touches || e.touches.length === 0) return;
    e.preventDefault();
    const startX = e.touches[0].clientX;
    const initW = sig.width;
    const initH = sig.height;
    const ratio = initH / initW;

    const onTouchMove = (moveEvent) => {
      if (!moveEvent.touches || moveEvent.touches.length === 0) return;
      moveEvent.preventDefault();
      const dx = moveEvent.touches[0].clientX - startX;
      const newW = Math.max(50, Math.min(400, initW + dx));
      const newH = newW * ratio;

      sig.width = newW;
      sig.height = newH;

      const sigEl = document.getElementById(`sig-el-${sig.id}`);
      if (sigEl) {
        sigEl.style.width = `${sig.width}px`;
        sigEl.style.height = `${sig.height}px`;
      }
    };

    const onTouchEnd = () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
  }

  updateSaveButtonState() {
    const hasSigs = this.placedSignatures.length > 0;
    if (this.savePdfBtn) {
      this.savePdfBtn.disabled = !hasSigs;
      this.savePdfBtn.classList.toggle('opacity-50', !hasSigs);
      this.savePdfBtn.classList.toggle('cursor-not-allowed', !hasSigs);
    }
    if (this.stickySaveBtn) {
      this.stickySaveBtn.disabled = !hasSigs;
      this.stickySaveBtn.classList.toggle('opacity-50', !hasSigs);
      this.stickySaveBtn.classList.toggle('cursor-not-allowed', !hasSigs);
    }
  }

  // -------------------------------------------------------------
  // LocalStorage Saved Signatures Management
  // -------------------------------------------------------------
  loadSavedSignaturesFromStorage() {
    try {
      const data = localStorage.getItem('toolstacker_saved_signatures');
      if (data) {
        this.savedSignatures = JSON.parse(data) || [];
      }
    } catch (e) {
      this.savedSignatures = [];
    }
  }

  saveSignatureToStorage(dataUrl) {
    if (!this.savedSignatures.includes(dataUrl)) {
      this.savedSignatures.unshift(dataUrl);
      if (this.savedSignatures.length > 6) {
        this.savedSignatures.pop(); // keep last 6
      }
      try {
        localStorage.setItem('toolstacker_saved_signatures', JSON.stringify(this.savedSignatures));
      } catch (e) {}
      this.renderSavedSignaturesBar();
    }
  }

  renderSavedSignaturesBar() {
    if (!this.savedSignaturesList) return;
    this.savedSignaturesList.innerHTML = '';

    if (this.savedSignatures.length === 0) {
      this.savedSignaturesList.innerHTML = `
        <span class="text-xs text-neutral-400 italic">No saved signatures yet</span>
      `;
      return;
    }

    this.savedSignatures.forEach((dataUrl, idx) => {
      const chip = document.createElement('div');
      chip.className =
        'flex items-center gap-1.5 p-1.5 pl-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-blue-500 transition-all cursor-pointer group shadow-2xs';

      chip.innerHTML = `
        <img src="${dataUrl}" alt="Saved" class="h-6 w-14 object-contain pointer-events-none" />
        <button type="button" class="del-saved-btn p-1 text-neutral-400 hover:text-red-500 rounded transition-colors" title="Delete">
          <i data-lucide="x" class="w-3 h-3"></i>
        </button>
      `;

      chip.addEventListener('click', (e) => {
        if (e.target.closest('.del-saved-btn')) return;
        this.placeSignatureOnCurrentPage(dataUrl);
        this.showToast('Signature added from your saved library!', 'success');
      });

      chip.querySelector('.del-saved-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.savedSignatures.splice(idx, 1);
        try {
          localStorage.setItem('toolstacker_saved_signatures', JSON.stringify(this.savedSignatures));
        } catch (err) {}
        this.renderSavedSignaturesBar();
      });

      this.savedSignaturesList.appendChild(chip);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  // -------------------------------------------------------------
  // PDF Export Engine (pdf-lib)
  // -------------------------------------------------------------
  async exportSignedPdf() {
    if (this.placedSignatures.length === 0) {
      this.showToast('Please add at least one signature to your document.', 'warning');
      return;
    }

    if (!window.PDFLib) {
      this.showToast('PDF rendering engine is still loading...', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Embedding signatures into PDF...');

    try {
      const { PDFDocument, degrees } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(this.pdfBytes, { ignoreEncryption: true });
      const pages = pdfDoc.getPages();

      // Group signatures by page
      const sigsByPage = {};
      this.placedSignatures.forEach((sig) => {
        if (!sigsByPage[sig.pageNum]) sigsByPage[sig.pageNum] = [];
        sigsByPage[sig.pageNum].push(sig);
      });

      // Embed signatures into target pages
      const totalSigs = this.placedSignatures.length;
      let processedSigs = 0;

      for (const pageNumStr of Object.keys(sigsByPage)) {
        const pageNum = parseInt(pageNumStr, 10);
        const pageIdx = pageNum - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;

        const targetPage = pages[pageIdx];
        const pdfPageW = targetPage.getWidth();
        const pdfPageH = targetPage.getHeight();

        // Get viewport coordinates for that page
        const pdfJsPage = await this.pdfDocProxy.getPage(pageNum);
        const originalVp = pdfJsPage.getViewport({ scale: this.currentScale });
        const canvasW = originalVp.width;
        const canvasH = originalVp.height;

        const scaleX = pdfPageW / canvasW;
        const scaleY = pdfPageH / canvasH;

        for (const sig of sigsByPage[pageNum]) {
          processedSigs++;
          const pct = Math.round((processedSigs / totalSigs) * 100);
          this.updateProgress(pct, `Embedding signature ${processedSigs} of ${totalSigs}...`);

          // Fetch signature PNG bytes
          const response = await fetch(sig.dataUrl);
          const sigBytes = await response.arrayBuffer();
          const embeddedImage = await pdfDoc.embedPng(sigBytes);

          // Calculate PDF coordinates (PDF has (0,0) at bottom-left!)
          const embedW = sig.width * scaleX;
          const embedH = sig.height * scaleY;
          const embedX = sig.x * scaleX;
          const embedY = (canvasH - (sig.y + sig.height)) * scaleY;

          targetPage.drawImage(embeddedImage, {
            x: embedX,
            y: embedY,
            width: embedW,
            height: embedH,
            rotate: degrees(sig.rotation ? -sig.rotation : 0) // inverted for PDF coordinate space
          });
        }
      }

      this.updateProgress(100, 'Saving final document...');

      const signedBytes = await pdfDoc.save();
      this.signedPdfBlob = new Blob([signedBytes], { type: 'application/pdf' });

      if (this.signedPdfUrl) URL.revokeObjectURL(this.signedPdfUrl);
      this.signedPdfUrl = URL.createObjectURL(this.signedPdfBlob);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showDownloadState();
      }, 350);
    } catch (err) {
      console.error('Export signed PDF error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to export signed PDF: ${err.message}`, 'error');
    }
  }

  showDownloadState() {
    if (this.heroSection) this.heroSection.classList.add('hidden');
    if (this.workspaceSection) this.workspaceSection.classList.add('hidden');
    if (this.stickyBar) this.stickyBar.classList.add('hidden');

    if (this.downloadSection) {
      this.downloadSection.classList.remove('hidden');
      this.downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    if (this.signedDocSizeBadge && this.signedPdfBlob) {
      this.signedDocSizeBadge.textContent = formatBytes(this.signedPdfBlob.size);
    }

    this.showToast('✅ PDF signed successfully!', 'success');
  }

  downloadSignedPdf() {
    if (!this.signedPdfBlob || !this.signedPdfUrl) {
      this.showToast('No signed document found.', 'error');
      return;
    }

    const baseName = this.currentFile ? this.currentFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const filename = `${baseName}_signed.pdf`;

    const a = document.createElement('a');
    a.href = this.signedPdfUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  // -------------------------------------------------------------
  // UI & Reset Management
  // -------------------------------------------------------------
  updateUI() {
    const hasDoc = !!this.currentFile;
    if (this.heroSection) this.heroSection.classList.toggle('hidden', hasDoc);
    if (this.workspaceSection) this.workspaceSection.classList.toggle('hidden', !hasDoc);
    if (this.stickyBar) this.stickyBar.classList.toggle('hidden', !hasDoc);
    if (this.downloadSection) this.downloadSection.classList.add('hidden');
  }

  resetAll() {
    if (this.signedPdfUrl) URL.revokeObjectURL(this.signedPdfUrl);
    this.currentFile = null;
    this.pdfBytes = null;
    this.pdfDocProxy = null;
    this.totalPages = 0;
    this.currentPageNum = 1;
    this.placedSignatures = [];
    this.activeSignatureId = null;
    this.signedPdfBlob = null;
    this.signedPdfUrl = null;

    if (this.fileInput) this.fileInput.value = '';
    this.updateUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

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
  window.signPdfApp = new SignPdfApp();
});
