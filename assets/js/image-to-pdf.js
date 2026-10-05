/**
 * ToolStacker Image to PDF Converter
 * 100% Client-Side • Multi-Format (JPG, PNG, WebP) • Drag & Drop Reorder • Customizable Page Settings
 * Powered by jsPDF
 */

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

class ImageToPdfApp {
  constructor() {
    this.images = []; // Array of { id, file, name, size, type, dataUrl, width, height, selected }
    this.draggedIndex = null;

    // Conversion settings
    this.settings = {
      pageSize: 'a4', // 'a4' | 'letter' | 'fit'
      orientation: 'portrait', // 'portrait' | 'landscape' | 'auto'
      margin: 10, // 0 | 10 | 20 (mm)
      quality: 'high', // 'medium' (150 DPI) | 'high' (300 DPI)
    };

    // Result PDF Blob
    this.pdfBlob = null;
    this.pdfUrl = null;
    this.pdfFilename = '';

    this.cacheDom();
    this.bindEvents();
    this.updateUiState();
  }

  cacheDom() {
    // Dropzone & File Input
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Workspace & Controls
    this.workspace = document.getElementById('workspace');
    this.toolbar = document.getElementById('grid-toolbar');
    this.imageCountLabel = document.getElementById('image-count-label');
    this.selectAllBtn = document.getElementById('select-all-btn');
    this.deselectAllBtn = document.getElementById('deselect-all-btn');
    this.clearAllBtn = document.getElementById('clear-all-btn');
    this.addMoreInput = document.getElementById('add-more-input');
    this.addMoreBtn = document.getElementById('add-more-btn');

    // Thumbnail Grid
    this.gridContainer = document.getElementById('image-grid');

    // Settings Panel Inputs
    this.pageSizeSelect = document.getElementById('page-size-select');
    this.orientationRadios = document.querySelectorAll('input[name="orientation"]');
    this.marginRadios = document.querySelectorAll('input[name="margin"]');
    this.qualitySelect = document.getElementById('quality-select');

    // Action Buttons
    this.convertBtn = document.getElementById('convert-btn');
    this.convertBtnText = document.getElementById('convert-btn-text');
    this.resetBtn = document.getElementById('reset-btn');
    this.stickyConvertBtn = document.getElementById('sticky-convert-btn');
    this.stickyBar = document.getElementById('sticky-action-bar');

    // Progress Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('progress-fill');
    this.progressPct = document.getElementById('progress-pct');
    this.progressText = document.getElementById('progress-text');

    // Download Section
    this.downloadSection = document.getElementById('download-section');
    this.resultSuccessMsg = document.getElementById('result-success-msg');
    this.resultDetailsBadge = document.getElementById('result-details-badge');
    this.downloadPdfBtn = document.getElementById('download-pdf-btn');
    this.convertMoreLink = document.getElementById('convert-more-link');
  }

  bindEvents() {
    // Dropzone Click & Keyboard
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

      // Dragover visual styles
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
        if (e.dataTransfer && e.dataTransfer.files) {
          this.handleIncomingFiles(e.dataTransfer.files);
        }
      });
    }

    this.browseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput?.click();
    });

    this.fileInput?.addEventListener('change', (e) => {
      if (e.target.files) {
        this.handleIncomingFiles(e.target.files);
        e.target.value = '';
      }
    });

    // Add more images button
    this.addMoreBtn?.addEventListener('click', () => this.addMoreInput?.click());
    this.addMoreInput?.addEventListener('change', (e) => {
      if (e.target.files) {
        this.handleIncomingFiles(e.target.files);
        e.target.value = '';
      }
    });

    // Toolbar actions
    this.selectAllBtn?.addEventListener('click', () => {
      this.images.forEach((img) => (img.selected = true));
      this.renderGrid();
      this.updateUiState();
    });

    this.deselectAllBtn?.addEventListener('click', () => {
      this.images.forEach((img) => (img.selected = false));
      this.renderGrid();
      this.updateUiState();
    });

    this.clearAllBtn?.addEventListener('click', () => {
      if (this.images.length === 0) return;
      if (confirm('Clear all uploaded images?')) {
        this.images = [];
        this.renderGrid();
        this.updateUiState();
        this.showToast('All images cleared.', 'info');
      }
    });

    // Settings listeners
    this.pageSizeSelect?.addEventListener('change', (e) => {
      this.settings.pageSize = e.target.value;
    });

    this.orientationRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.settings.orientation = e.target.value;
        }
      });
    });

    this.marginRadios.forEach((radio) => {
      radio.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.settings.margin = parseInt(e.target.value, 10);
        }
      });
    });

    this.qualitySelect?.addEventListener('change', (e) => {
      this.settings.quality = e.target.value;
    });

    // Convert & Reset
    this.convertBtn?.addEventListener('click', () => this.executeConversion());
    this.stickyConvertBtn?.addEventListener('click', () => this.executeConversion());
    this.resetBtn?.addEventListener('click', () => this.resetAll());
    this.convertMoreLink?.addEventListener('click', (e) => {
      e.preventDefault();
      this.resetAll();
    });

    // Download PDF Action
    this.downloadPdfBtn?.addEventListener('click', () => this.triggerDownload());
  }

  // -------------------------------------------------------------
  // File Ingestion & Validation
  // -------------------------------------------------------------
  async handleIncomingFiles(fileList) {
    if (!fileList || fileList.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const incoming = Array.from(fileList);
    let skippedNonImage = 0;
    let largeCount = 0;

    const remainingSlots = 50 - this.images.length;
    if (remainingSlots <= 0) {
      this.showToast('Maximum 50 images allowed. Please convert or clear existing images.', 'warning');
      return;
    }

    const filesToProcess = [];

    for (const file of incoming) {
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const isImage = validTypes.includes(file.type) || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);

      if (!isImage) {
        skippedNonImage++;
        continue;
      }

      if (filesToProcess.length >= remainingSlots) {
        break;
      }

      if (file.size > 10 * 1024 * 1024) {
        largeCount++;
      }

      filesToProcess.push(file);
    }

    if (skippedNonImage > 0) {
      this.showToast(`Skipped ${skippedNonImage} non-image file(s). Only JPG, PNG, WebP supported.`, 'warning');
    }

    if (incoming.length > filesToProcess.length + skippedNonImage) {
      this.showToast('Maximum 50 images allowed. Extra images were omitted.', 'warning');
    }

    if (largeCount > 0) {
      this.showToast(`${largeCount} image(s) exceed 10MB. Conversion may take slightly longer.`, 'info');
    }

    if (filesToProcess.length === 0) return;

    this.showProcessingModal(true, 'Reading and preparing images...');
    this.updateProgress(10, `Processing ${filesToProcess.length} image(s)...`);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      try {
        const item = await this.readImageFile(file);
        this.images.push(item);
      } catch (err) {
        console.error('Failed to read image:', file.name, err);
      }
      const pct = Math.round(10 + ((i + 1) / filesToProcess.length) * 80);
      this.updateProgress(pct, `Loaded ${i + 1} of ${filesToProcess.length} images...`);
    }

    this.showProcessingModal(false);
    this.renderGrid();
    this.updateUiState();
    this.showToast(`Added ${filesToProcess.length} image(s).`, 'success');
  }

  readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        const img = new Image();
        img.onload = () => {
          resolve({
            id: 'img_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            file,
            name: file.name,
            size: file.size,
            type: file.type || 'image/jpeg',
            dataUrl,
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 600,
            selected: true,
          });
        };
        img.onerror = () => reject(new Error('Invalid image file'));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(file);
    });
  }

  // -------------------------------------------------------------
  // Grid Rendering & Drag-to-Reorder
  // -------------------------------------------------------------
  renderGrid() {
    if (!this.gridContainer) return;
    this.gridContainer.innerHTML = '';

    if (this.images.length === 0) {
      return;
    }

    this.images.forEach((item, index) => {
      const card = document.createElement('div');
      card.className = `image-card group relative bg-white dark:bg-neutral-900 rounded-2xl border-2 transition-all p-3 flex flex-col justify-between ${
        item.selected
          ? 'border-blue-600 dark:border-blue-500 shadow-sm'
          : 'border-neutral-200 dark:border-neutral-800 opacity-60'
      }`;
      card.setAttribute('draggable', 'true');
      card.setAttribute('data-index', index);

      // Card Header: Order badge & Delete button
      const headerDiv = document.createElement('div');
      headerDiv.className = 'flex items-center justify-between gap-1 mb-2';

      const leftBadge = document.createElement('div');
      leftBadge.className = 'flex items-center gap-1.5';

      // Drag Handle Icon
      const dragHandle = document.createElement('span');
      dragHandle.className = 'cursor-grab active:cursor-grabbing text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-sm select-none';
      dragHandle.innerHTML = '⋮⋮';
      dragHandle.title = 'Drag to reorder';

      // Page sequence badge
      const numBadge = document.createElement('span');
      numBadge.className = 'inline-block px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300';
      numBadge.textContent = `#${index + 1}`;

      leftBadge.appendChild(dragHandle);
      leftBadge.appendChild(numBadge);

      // Delete Button (X)
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'p-1 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer';
      deleteBtn.setAttribute('title', 'Remove image');
      deleteBtn.innerHTML = '<i data-lucide="x" class="w-3.5 h-3.5"></i>';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeImage(index);
      });

      headerDiv.appendChild(leftBadge);
      headerDiv.appendChild(deleteBtn);

      // Thumbnail Container (150px height)
      const thumbBox = document.createElement('div');
      thumbBox.className = 'w-full h-36 rounded-xl bg-neutral-100 dark:bg-neutral-950/60 overflow-hidden flex items-center justify-center relative cursor-pointer';
      thumbBox.addEventListener('click', () => {
        item.selected = !item.selected;
        this.renderGrid();
        this.updateUiState();
      });

      const imgEl = document.createElement('img');
      imgEl.src = item.dataUrl;
      imgEl.alt = item.name;
      imgEl.className = 'max-w-full max-h-full object-contain pointer-events-none select-none';
      imgEl.loading = 'lazy';
      thumbBox.appendChild(imgEl);

      // Card Footer: Filename, size & reorder buttons
      const footerDiv = document.createElement('div');
      footerDiv.className = 'mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px]';

      const fileInfo = document.createElement('div');
      fileInfo.className = 'min-w-0 pr-1';
      fileInfo.innerHTML = `
        <div class="font-semibold text-neutral-800 dark:text-neutral-200 truncate" title="${item.name}">${item.name}</div>
        <div class="text-[10px] text-neutral-400 font-mono">${formatBytes(item.size)} • ${item.width}×${item.height}</div>
      `;

      // Quick move arrows for accessibility & touch devices
      const arrowControls = document.createElement('div');
      arrowControls.className = 'flex items-center gap-0.5 shrink-0';

      const moveLeftBtn = document.createElement('button');
      moveLeftBtn.type = 'button';
      moveLeftBtn.className = 'p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 disabled:opacity-20 cursor-pointer';
      moveLeftBtn.disabled = index === 0;
      moveLeftBtn.innerHTML = '←';
      moveLeftBtn.title = 'Move Left';
      moveLeftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.swapImages(index, index - 1);
      });

      const moveRightBtn = document.createElement('button');
      moveRightBtn.type = 'button';
      moveRightBtn.className = 'p-1 rounded text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-100 disabled:opacity-20 cursor-pointer';
      moveRightBtn.disabled = index === this.images.length - 1;
      moveRightBtn.innerHTML = '→';
      moveRightBtn.title = 'Move Right';
      moveRightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.swapImages(index, index + 1);
      });

      arrowControls.appendChild(moveLeftBtn);
      arrowControls.appendChild(moveRightBtn);

      footerDiv.appendChild(fileInfo);
      footerDiv.appendChild(arrowControls);

      card.appendChild(headerDiv);
      card.appendChild(thumbBox);
      card.appendChild(footerDiv);

      // Drag and drop event listeners
      this.attachDragEvents(card, index);

      this.gridContainer.appendChild(card);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  attachDragEvents(card, index) {
    card.addEventListener('dragstart', (e) => {
      this.draggedIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index);
      card.classList.add('opacity-40', 'scale-95');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('opacity-40', 'scale-95');
      this.draggedIndex = null;
      document.querySelectorAll('.image-card').forEach((c) => {
        c.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/20');
      });
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        card.classList.add('ring-2', 'ring-blue-500', 'bg-blue-50/20');
      }
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/20');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('ring-2', 'ring-blue-500', 'bg-blue-50/20');
      if (this.draggedIndex !== null && this.draggedIndex !== index) {
        const itemToMove = this.images.splice(this.draggedIndex, 1)[0];
        this.images.splice(index, 0, itemToMove);
        this.renderGrid();
        this.updateUiState();
        this.showToast('Reordered images.', 'info');
      }
    });
  }

  swapImages(fromIdx, toIdx) {
    if (toIdx < 0 || toIdx >= this.images.length) return;
    const temp = this.images[fromIdx];
    this.images[fromIdx] = this.images[toIdx];
    this.images[toIdx] = temp;
    this.renderGrid();
    this.updateUiState();
  }

  removeImage(index) {
    const removed = this.images.splice(index, 1)[0];
    this.renderGrid();
    this.updateUiState();
    if (removed) {
      this.showToast(`Removed "${removed.name}".`, 'info');
    }
  }

  // -------------------------------------------------------------
  // UI State Coordinator
  // -------------------------------------------------------------
  updateUiState() {
    const totalCount = this.images.length;
    const selectedCount = this.images.filter((img) => img.selected).length;

    if (totalCount === 0) {
      this.workspace?.classList.add('hidden');
      this.stickyBar?.classList.add('hidden');
      this.dropzone?.classList.remove('hidden');
      return;
    }

    this.dropzone?.classList.add('hidden');
    this.workspace?.classList.remove('hidden');
    this.stickyBar?.classList.remove('hidden');

    if (this.imageCountLabel) {
      this.imageCountLabel.textContent = `${totalCount} image${totalCount === 1 ? '' : 's'}${
        selectedCount !== totalCount ? ` (${selectedCount} selected)` : ''
      }`;
    }

    const targetCount = selectedCount > 0 ? selectedCount : totalCount;
    const btnText = `Convert ${targetCount} image${targetCount === 1 ? '' : 's'} to PDF`;

    if (this.convertBtnText) this.convertBtnText.textContent = btnText;
    if (this.convertBtn) this.convertBtn.disabled = targetCount === 0;
    if (this.stickyConvertBtn) this.stickyConvertBtn.disabled = targetCount === 0;
  }

  // -------------------------------------------------------------
  // Conversion Execution (jsPDF)
  // -------------------------------------------------------------
  async executeConversion() {
    const targetImages = this.images.filter((img) => img.selected);
    const imagesToConvert = targetImages.length > 0 ? targetImages : this.images;

    if (imagesToConvert.length === 0) {
      this.showToast('Please upload at least one image to convert.', 'warning');
      return;
    }

    if (!window.jspdf || !window.jspdf.jsPDF) {
      this.showToast('jsPDF library is not loaded. Please check connection.', 'error');
      return;
    }

    this.showProcessingModal(true, `Converting ${imagesToConvert.length} images... Please wait`);
    this.updateProgress(5, 'Initializing PDF document...');

    try {
      const { jsPDF } = window.jspdf;
      const { pageSize, orientation, margin, quality } = this.settings;

      // jsPDF instance placeholder (will initialize with first page settings)
      let doc = null;

      for (let i = 0; i < imagesToConvert.length; i++) {
        const item = imagesToConvert[i];

        // Yield execution so UI progress bar refreshes smoothly
        await new Promise((r) => setTimeout(r, 20));

        // 1. Determine orientation for this image
        let pageOrient = orientation;
        if (orientation === 'auto') {
          pageOrient = item.width >= item.height ? 'landscape' : 'portrait';
        }

        // 2. Determine page format and page dimensions in mm
        let pageFormat = pageSize;
        let pWidthMm = 210;
        let pHeightMm = 297;

        if (pageSize === 'a4') {
          pWidthMm = pageOrient === 'landscape' ? 297 : 210;
          pHeightMm = pageOrient === 'landscape' ? 210 : 297;
          pageFormat = 'a4';
        } else if (pageSize === 'letter') {
          pWidthMm = pageOrient === 'landscape' ? 279.4 : 215.9;
          pHeightMm = pageOrient === 'landscape' ? 215.9 : 279.4;
          pageFormat = 'letter';
        } else if (pageSize === 'fit') {
          // Fit to image: page dimensions proportional to image aspect ratio
          // DPI: 150 (Medium) vs 300 (High)
          const dpi = quality === 'medium' ? 150 : 300;
          const imgWMm = (item.width / dpi) * 25.4;
          const imgHMm = (item.height / dpi) * 25.4;
          pWidthMm = imgWMm + margin * 2;
          pHeightMm = imgHMm + margin * 2;
          pageFormat = [pWidthMm, pHeightMm];
          pageOrient = pWidthMm >= pHeightMm ? 'landscape' : 'portrait';
        }

        // Initialize doc on first page, or addPage on subsequent
        if (i === 0) {
          doc = new jsPDF({
            orientation: pageOrient,
            unit: 'mm',
            format: pageFormat,
            compress: true,
          });
        } else {
          doc.addPage(pageFormat, pageOrient);
        }

        // 3. Calculate fitted dimensions respecting margins & aspect ratio
        const availWidth = Math.max(10, pWidthMm - margin * 2);
        const availHeight = Math.max(10, pHeightMm - margin * 2);

        const imgAspect = item.width / item.height;
        const availAspect = availWidth / availHeight;

        let drawW = availWidth;
        let drawH = availHeight;

        if (imgAspect > availAspect) {
          drawW = availWidth;
          drawH = drawW / imgAspect;
        } else {
          drawH = availHeight;
          drawW = drawH * imgAspect;
        }

        const drawX = margin + (availWidth - drawW) / 2;
        const drawY = margin + (availHeight - drawH) / 2;

        // 4. Format image data for jsPDF
        // Quality compression settings
        const compressionQuality = quality === 'medium' ? 'MEDIUM' : 'FAST';
        const imageFormat = item.type === 'image/png' ? 'PNG' : 'JPEG';

        doc.addImage(
          item.dataUrl,
          imageFormat,
          drawX,
          drawY,
          drawW,
          drawH,
          undefined,
          compressionQuality
        );

        const progressPercent = Math.round(((i + 1) / imagesToConvert.length) * 90);
        this.updateProgress(progressPercent, `Converted page ${i + 1} of ${imagesToConvert.length}...`);
      }

      this.updateProgress(95, 'Building PDF file...');
      await new Promise((r) => setTimeout(r, 50));

      const pdfArrayBuffer = doc.output('arraybuffer');
      this.pdfBlob = new Blob([pdfArrayBuffer], { type: 'application/pdf' });
      if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
      this.pdfUrl = URL.createObjectURL(this.pdfBlob);

      const timestamp = getFormattedTimestamp();
      this.pdfFilename = `images_${timestamp}.pdf`;

      this.updateProgress(100, 'Complete!');
      await new Promise((r) => setTimeout(r, 200));

      this.showProcessingModal(false);
      this.showDownloadState(imagesToConvert.length);
    } catch (err) {
      console.error('PDF Conversion error:', err);
      this.showProcessingModal(false);
      this.showToast(`Conversion failed: ${err.message}`, 'error');
    }
  }

  showDownloadState(pageCount) {
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.downloadSection?.classList.remove('hidden');

    if (this.resultSuccessMsg) {
      const sizeStr = this.pdfBlob ? formatBytes(this.pdfBlob.size) : '0 MB';
      this.resultSuccessMsg.textContent = `✅ Converted successfully! (${sizeStr})`;
    }

    if (this.resultDetailsBadge) {
      this.resultDetailsBadge.textContent = `${pageCount} page${pageCount === 1 ? '' : 's'} • ${this.pdfFilename}`;
    }

    this.showToast('✅ PDF generated successfully!', 'success');
  }

  triggerDownload() {
    if (!this.pdfBlob || !this.pdfUrl) return;

    const a = document.createElement('a');
    a.href = this.pdfUrl;
    a.download = this.pdfFilename || 'images.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloading "${this.pdfFilename}"...`, 'success');
  }

  resetAll() {
    if (this.pdfUrl) URL.revokeObjectURL(this.pdfUrl);
    this.pdfBlob = null;
    this.pdfUrl = null;
    this.pdfFilename = '';
    this.images = [];

    this.downloadSection?.classList.add('hidden');
    this.workspace?.classList.add('hidden');
    this.stickyBar?.classList.add('hidden');
    this.dropzone?.classList.remove('hidden');

    if (this.fileInput) this.fileInput.value = '';
    if (this.addMoreInput) this.addMoreInput.value = '';

    this.renderGrid();
    this.updateUiState();
  }

  // -------------------------------------------------------------
  // Helpers
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
    }, 3000);
  }
}

// -------------------------------------------------------------
// Initialize App
// -------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  window.imageToPdfApp = new ImageToPdfApp();
});
