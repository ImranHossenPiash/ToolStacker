/**
 * ToolStacker Protect & Unlock PDF Tool
 * 100% Client-Side • Dual Mode • Zero Server Uploads
 * Powered by pdf-lib, pdf.js, and jsPDF
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

class ProtectUnlockPdfApp {
  constructor() {
    this.activeMode = 'protect'; // 'protect' | 'unlock'
    
    // Protect Mode State
    this.protectFile = null;
    this.protectBytes = null;
    this.protectDocProxy = null;
    this.protectTotalPages = 0;
    this.protectedBlob = null;
    this.protectedUrl = null;

    // Unlock Mode State
    this.unlockFile = null;
    this.unlockBytes = null;
    this.unlockedBlob = null;
    this.unlockedUrl = null;

    this.cacheDom();
    this.bindEvents();
    this.updateUI();
  }

  cacheDom() {
    // Mode Switch Tabs
    this.tabProtect = document.getElementById('tab-protect');
    this.tabUnlock = document.getElementById('tab-unlock');
    this.panelProtect = document.getElementById('panel-protect');
    this.panelUnlock = document.getElementById('panel-unlock');

    // ----------------- Protect Mode DOM -----------------
    this.protectDropzone = document.getElementById('protect-dropzone');
    this.protectFileInput = document.getElementById('protect-file-input');
    this.protectBrowseBtn = document.getElementById('protect-browse-btn');
    this.protectWorkspace = document.getElementById('protect-workspace');
    this.protectDocName = document.getElementById('protect-doc-name');
    this.protectDocDetails = document.getElementById('protect-doc-details');
    this.protectResetBtn = document.getElementById('protect-reset-btn');

    // Protect Password Inputs
    this.protectPasswordInput = document.getElementById('protect-password-input');
    this.protectConfirmInput = document.getElementById('protect-confirm-input');
    this.toggleProtectPasswordBtn = document.getElementById('toggle-protect-password-btn');
    this.toggleProtectConfirmBtn = document.getElementById('toggle-protect-confirm-btn');
    this.generatePasswordBtn = document.getElementById('generate-password-btn');

    // Permission Checkboxes
    this.permPrint = document.getElementById('perm-print');
    this.permCopy = document.getElementById('perm-copy');
    this.permModify = document.getElementById('perm-modify');
    this.permAnnot = document.getElementById('perm-annot');

    // Protect Action & Download
    this.protectSubmitBtn = document.getElementById('protect-submit-btn');
    this.protectDownloadSection = document.getElementById('protect-download-section');
    this.downloadProtectedBtn = document.getElementById('download-protected-btn');
    this.protectedSizeBadge = document.getElementById('protected-size-badge');
    this.protectAnotherBtn = document.getElementById('protect-another-btn');

    // ----------------- Unlock Mode DOM -----------------
    this.unlockDropzone = document.getElementById('unlock-dropzone');
    this.unlockFileInput = document.getElementById('unlock-file-input');
    this.unlockBrowseBtn = document.getElementById('unlock-browse-btn');
    this.unlockWorkspace = document.getElementById('unlock-workspace');
    this.unlockDocName = document.getElementById('unlock-doc-name');
    this.unlockDocDetails = document.getElementById('unlock-doc-details');
    this.unlockResetBtn = document.getElementById('unlock-reset-btn');

    // Unlock Password Input
    this.unlockPasswordInput = document.getElementById('unlock-password-input');
    this.toggleUnlockPasswordBtn = document.getElementById('toggle-unlock-password-btn');
    this.unlockSubmitBtn = document.getElementById('unlock-submit-btn');

    // Unlock Download Section
    this.unlockDownloadSection = document.getElementById('unlock-download-section');
    this.downloadUnlockedBtn = document.getElementById('download-unlocked-btn');
    this.unlockedSizeBadge = document.getElementById('unlocked-size-badge');
    this.unlockAnotherBtn = document.getElementById('unlock-another-btn');

    // Processing Modal
    this.processingModal = document.getElementById('processing-modal');
    this.progressFill = document.getElementById('sec-progress-fill');
    this.progressPct = document.getElementById('sec-progress-pct');
    this.progressText = document.getElementById('sec-progress-text');
  }

  bindEvents() {
    // Top Tabs
    this.tabProtect.addEventListener('click', () => this.switchMode('protect'));
    this.tabUnlock.addEventListener('click', () => this.switchMode('unlock'));

    // ----------------- Protect Events -----------------
    if (this.protectDropzone && this.protectFileInput) {
      this.protectDropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#protect-browse-btn')) {
          this.protectFileInput.click();
        }
      });

      this.protectDropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.protectFileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach(name => {
        this.protectDropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.protectDropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        this.protectDropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.protectDropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.protectDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadProtectFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (this.protectBrowseBtn && this.protectFileInput) {
      this.protectBrowseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.protectFileInput.click();
      });
    }

    if (this.protectFileInput) {
      this.protectFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadProtectFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Toggle Password Visibility
    this.toggleProtectPasswordBtn?.addEventListener('click', () => {
      this.toggleInputVisibility(this.protectPasswordInput, this.toggleProtectPasswordBtn);
    });
    this.toggleProtectConfirmBtn?.addEventListener('click', () => {
      this.toggleInputVisibility(this.protectConfirmInput, this.toggleProtectConfirmBtn);
    });

    // Generate Strong Password
    this.generatePasswordBtn?.addEventListener('click', () => this.generateStrongPassword());

    // Submit Protect
    this.protectSubmitBtn?.addEventListener('click', () => this.executeProtectPdf());
    this.protectResetBtn?.addEventListener('click', () => this.resetProtectMode());
    this.protectAnotherBtn?.addEventListener('click', () => this.resetProtectMode());
    this.downloadProtectedBtn?.addEventListener('click', () => this.downloadProtectedPdf());

    // ----------------- Unlock Events -----------------
    if (this.unlockDropzone && this.unlockFileInput) {
      this.unlockDropzone.addEventListener('click', (e) => {
        if (!e.target.closest('#unlock-browse-btn')) {
          this.unlockFileInput.click();
        }
      });

      this.unlockDropzone.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.unlockFileInput.click();
        }
      });

      ['dragenter', 'dragover'].forEach(name => {
        this.unlockDropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.unlockDropzone.classList.add('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      ['dragleave', 'drop'].forEach(name => {
        this.unlockDropzone.addEventListener(name, (e) => {
          e.preventDefault();
          this.unlockDropzone.classList.remove('border-blue-500', 'bg-blue-50/50', 'dark:bg-blue-950/20');
        });
      });

      this.unlockDropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.loadUnlockFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (this.unlockBrowseBtn && this.unlockFileInput) {
      this.unlockBrowseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.unlockFileInput.click();
      });
    }

    if (this.unlockFileInput) {
      this.unlockFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.loadUnlockFile(e.target.files[0]);
          e.target.value = '';
        }
      });
    }

    // Toggle Unlock Password Visibility
    this.toggleUnlockPasswordBtn?.addEventListener('click', () => {
      this.toggleInputVisibility(this.unlockPasswordInput, this.toggleUnlockPasswordBtn);
    });

    // Submit Unlock
    this.unlockSubmitBtn?.addEventListener('click', () => this.executeUnlockPdf());
    this.unlockResetBtn?.addEventListener('click', () => this.resetUnlockMode());
    this.unlockAnotherBtn?.addEventListener('click', () => this.resetUnlockMode());
    this.downloadUnlockedBtn?.addEventListener('click', () => this.downloadUnlockedPdf());
  }

  // -------------------------------------------------------------
  // Mode Switching & Password Helpers
  // -------------------------------------------------------------
  switchMode(mode) {
    this.activeMode = mode;
    const isProtect = mode === 'protect';

    // Update Tab Styles
    this.tabProtect.classList.toggle('bg-blue-600', isProtect);
    this.tabProtect.classList.toggle('text-white', isProtect);
    this.tabProtect.classList.toggle('shadow-xs', isProtect);
    this.tabProtect.classList.toggle('text-neutral-600', !isProtect);
    this.tabProtect.classList.toggle('dark:text-neutral-300', !isProtect);

    this.tabUnlock.classList.toggle('bg-blue-600', !isProtect);
    this.tabUnlock.classList.toggle('text-white', !isProtect);
    this.tabUnlock.classList.toggle('shadow-xs', !isProtect);
    this.tabUnlock.classList.toggle('text-neutral-600', isProtect);
    this.tabUnlock.classList.toggle('dark:text-neutral-300', isProtect);

    // Toggle Panels
    this.panelProtect.classList.toggle('hidden', !isProtect);
    this.panelUnlock.classList.toggle('hidden', isProtect);
  }

  toggleInputVisibility(inputEl, btnEl) {
    if (!inputEl) return;
    const isPass = inputEl.type === 'password';
    inputEl.type = isPass ? 'text' : 'password';

    const icon = btnEl?.querySelector('i');
    if (icon) {
      icon.setAttribute('data-lucide', isPass ? 'eye-off' : 'eye');
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    }
  }

  generateStrongPassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()_+';
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    let password = '';
    for (let i = 0; i < array.length; i++) {
      password += chars[array[i] % chars.length];
    }

    if (this.protectPasswordInput) this.protectPasswordInput.value = password;
    if (this.protectConfirmInput) this.protectConfirmInput.value = password;

    // Show password in plaintext briefly so user can see it
    if (this.protectPasswordInput) this.protectPasswordInput.type = 'text';
    if (this.protectConfirmInput) this.protectConfirmInput.type = 'text';

    navigator.clipboard?.writeText(password);
    this.showToast('Generated strong password & copied to clipboard!', 'success');
  }

  // -------------------------------------------------------------
  // Protect Mode Logic
  // -------------------------------------------------------------
  async loadProtectFile(file) {
    if (!file) return;

    if (file.size === 0) {
      this.showToast('Selected file is empty (0 bytes).', 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document.', 'error');
      return;
    }

    this.showProcessingModal(true, 'Reading PDF structure...');

    try {
      this.protectFile = file;
      this.protectBytes = await file.arrayBuffer();

      const loadingTask = window.pdfjsLib.getDocument({ data: this.protectBytes });
      this.protectDocProxy = await loadingTask.promise;
      this.protectTotalPages = this.protectDocProxy.numPages;

      if (this.protectDocName) this.protectDocName.textContent = file.name;
      if (this.protectDocDetails) {
        this.protectDocDetails.textContent = `${formatBytes(file.size)} • ${this.protectTotalPages} page${this.protectTotalPages === 1 ? '' : 's'}`;
      }

      this.showProcessingModal(false);
      if (this.protectDropzone) this.protectDropzone.classList.add('hidden');
      if (this.protectWorkspace) this.protectWorkspace.classList.remove('hidden');

      this.showToast(`Ready to protect "${file.name}"!`, 'info');
    } catch (err) {
      console.error('Protect load error:', err);
      this.showProcessingModal(false);
      this.showToast(`Failed to read PDF: ${err.message}`, 'error');
    }
  }

  async executeProtectPdf() {
    const password = this.protectPasswordInput?.value || '';
    const confirm = this.protectConfirmInput?.value || '';

    if (!password) {
      this.showToast('Please enter a password to protect your PDF.', 'warning');
      return;
    }

    if (password.length < 8) {
      this.showToast('Use at least 8 characters for security.', 'warning');
      return;
    }

    if (password !== confirm) {
      this.showToast('Passwords do not match. Please verify your entries.', 'error');
      return;
    }

    if (!window.jspdf) {
      this.showToast('PDF encryption library is loading...', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Applying AES encryption to PDF...');

    try {
      const { jsPDF } = window.jspdf;

      // Collect permissions
      const permissions = [];
      if (this.permPrint?.checked) permissions.push('print');
      if (this.permCopy?.checked) permissions.push('copy');
      if (this.permModify?.checked) permissions.push('modify');
      if (this.permAnnot?.checked) permissions.push('annot-forms');

      const ownerPass = password + '_sec_owner_' + Math.random().toString(36).substr(2, 6);

      // Render first page to determine dimension
      const firstPage = await this.protectDocProxy.getPage(1);
      const firstVp = firstPage.getViewport({ scale: 1.0 });

      const doc = new jsPDF({
        orientation: firstVp.width > firstVp.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [firstVp.width, firstVp.height],
        encryption: {
          userPassword: password,
          ownerPassword: ownerPass,
          userPermissions: permissions
        }
      });

      const total = this.protectTotalPages;
      for (let i = 1; i <= total; i++) {
        const pct = Math.round((i / total) * 100);
        this.updateProgress(pct, `Encrypting page ${i} of ${total}...`);

        const page = await this.protectDocProxy.getPage(i);
        const vp = page.getViewport({ scale: 1.5 }); // High resolution render

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width);
        canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport: vp }).promise;

        const imgData = canvas.toDataURL('image/jpeg', 0.92);

        if (i > 1) {
          const ptW = page.getViewport({ scale: 1.0 }).width;
          const ptH = page.getViewport({ scale: 1.0 }).height;
          doc.addPage([ptW, ptH], ptW > ptH ? 'landscape' : 'portrait');
        }

        const pagePtW = page.getViewport({ scale: 1.0 }).width;
        const pagePtH = page.getViewport({ scale: 1.0 }).height;
        doc.addImage(imgData, 'JPEG', 0, 0, pagePtW, pagePtH, undefined, 'FAST');
      }

      this.updateProgress(100, 'Finalizing encrypted document...');

      const blob = doc.output('blob');
      this.protectedBlob = blob;
      if (this.protectedUrl) URL.revokeObjectURL(this.protectedUrl);
      this.protectedUrl = URL.createObjectURL(blob);

      setTimeout(() => {
        this.showProcessingModal(false);
        this.showProtectResults();
      }, 300);
    } catch (err) {
      console.error('Protect execution error:', err);
      this.showProcessingModal(false);
      this.showToast(`Encryption failed: ${err.message}`, 'error');
    }
  }

  showProtectResults() {
    if (this.protectWorkspace) this.protectWorkspace.classList.add('hidden');
    if (this.protectDownloadSection) this.protectDownloadSection.classList.remove('hidden');

    if (this.protectedSizeBadge && this.protectedBlob) {
      this.protectedSizeBadge.textContent = formatBytes(this.protectedBlob.size);
    }

    this.showToast('✅ Document password protected successfully!', 'success');
  }

  downloadProtectedPdf() {
    if (!this.protectedBlob || !this.protectedUrl) return;
    const base = this.protectFile ? this.protectFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const filename = `${base}_protected.pdf`;

    const a = document.createElement('a');
    a.href = this.protectedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetProtectMode() {
    if (this.protectedUrl) URL.revokeObjectURL(this.protectedUrl);
    this.protectFile = null;
    this.protectBytes = null;
    this.protectDocProxy = null;
    this.protectedBlob = null;
    this.protectedUrl = null;

    if (this.protectPasswordInput) this.protectPasswordInput.value = '';
    if (this.protectConfirmInput) this.protectConfirmInput.value = '';
    if (this.protectFileInput) this.protectFileInput.value = '';

    if (this.protectDownloadSection) this.protectDownloadSection.classList.add('hidden');
    if (this.protectWorkspace) this.protectWorkspace.classList.add('hidden');
    if (this.protectDropzone) this.protectDropzone.classList.remove('hidden');
  }

  // -------------------------------------------------------------
  // Unlock Mode Logic
  // -------------------------------------------------------------
  async loadUnlockFile(file) {
    if (!file) return;

    if (file.size === 0) {
      this.showToast('Selected file is empty (0 bytes).', 'error');
      return;
    }

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext !== 'pdf' && file.type !== 'application/pdf') {
      this.showToast('Please upload a valid PDF document.', 'error');
      return;
    }

    this.unlockFile = file;
    this.unlockBytes = await file.arrayBuffer();

    if (this.unlockDocName) this.unlockDocName.textContent = file.name;
    if (this.unlockDocDetails) {
      this.unlockDocDetails.textContent = `${formatBytes(file.size)}`;
    }

    if (this.unlockDropzone) this.unlockDropzone.classList.add('hidden');
    if (this.unlockWorkspace) this.unlockWorkspace.classList.remove('hidden');

    this.showToast(`File loaded. Please enter password to unlock.`, 'info');
  }

  async executeUnlockPdf() {
    const password = this.unlockPasswordInput?.value || '';
    if (!password) {
      this.showToast('Please enter the document password to unlock.', 'warning');
      return;
    }

    this.showProcessingModal(true, 'Verifying password and decrypting...');

    try {
      // 1. Verify password with pdf.js
      const loadingTask = window.pdfjsLib.getDocument({
        data: this.unlockBytes,
        password: password
      });

      const doc = await loadingTask.promise;
      const totalPages = doc.numPages;

      // 2. Load with pdf-lib or render clean unlocked PDF
      let unlockedBytes;
      try {
        if (window.PDFLib) {
          const pdfDoc = await window.PDFLib.PDFDocument.load(this.unlockBytes, {
            password: password,
            ignoreEncryption: false
          });
          unlockedBytes = await pdfDoc.save();
        }
      } catch (e) {
        console.warn('pdf-lib direct unlock note, falling back to canvas unlock:', e);
      }

      // If pdf-lib direct decrypt couldn't parse the cipher, re-render via verified pdf.js
      if (!unlockedBytes) {
        const { jsPDF } = window.jspdf;
        const firstPage = await doc.getPage(1);
        const firstVp = firstPage.getViewport({ scale: 1.0 });

        const cleanDoc = new jsPDF({
          orientation: firstVp.width > firstVp.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [firstVp.width, firstVp.height]
        });

        for (let i = 1; i <= totalPages; i++) {
          this.updateProgress(Math.round((i / totalPages) * 100), `Decrypting page ${i} of ${totalPages}...`);
          const p = await doc.getPage(i);
          const vp = p.getViewport({ scale: 1.5 });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(vp.width);
          canvas.height = Math.round(vp.height);
          const ctx = canvas.getContext('2d');
          await p.render({ canvasContext: ctx, viewport: vp }).promise;

          const img = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 1) {
            const ptW = p.getViewport({ scale: 1.0 }).width;
            const ptH = p.getViewport({ scale: 1.0 }).height;
            cleanDoc.addPage([ptW, ptH], ptW > ptH ? 'landscape' : 'portrait');
          }
          const ptW = p.getViewport({ scale: 1.0 }).width;
          const ptH = p.getViewport({ scale: 1.0 }).height;
          cleanDoc.addImage(img, 'JPEG', 0, 0, ptW, ptH, undefined, 'FAST');
        }

        unlockedBytes = cleanDoc.output('arraybuffer');
      }

      this.unlockedBlob = new Blob([unlockedBytes], { type: 'application/pdf' });
      if (this.unlockedUrl) URL.revokeObjectURL(this.unlockedUrl);
      this.unlockedUrl = URL.createObjectURL(this.unlockedBlob);

      this.showProcessingModal(false);
      this.showUnlockResults();
    } catch (err) {
      console.error('Unlock error:', err);
      this.showProcessingModal(false);
      if (err.name === 'PasswordException' || String(err).includes('password') || String(err).includes('Incorrect')) {
        this.showToast('Incorrect password. Please verify and try again.', 'error');
      } else {
        this.showToast(`Decryption failed: ${err.message || 'Incorrect password.'}`, 'error');
      }
    }
  }

  showUnlockResults() {
    if (this.unlockWorkspace) this.unlockWorkspace.classList.add('hidden');
    if (this.unlockDownloadSection) this.unlockDownloadSection.classList.remove('hidden');

    if (this.unlockedSizeBadge && this.unlockedBlob) {
      this.unlockedSizeBadge.textContent = formatBytes(this.unlockedBlob.size);
    }

    this.showToast('✅ PDF unlocked and password removed!', 'success');
  }

  downloadUnlockedPdf() {
    if (!this.unlockedBlob || !this.unlockedUrl) return;
    const base = this.unlockFile ? this.unlockFile.name.replace(/\.[^/.]+$/, '') : 'document';
    const filename = `${base}_unlocked.pdf`;

    const a = document.createElement('a');
    a.href = this.unlockedUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    this.showToast(`Downloaded "${filename}"!`, 'success');
  }

  resetUnlockMode() {
    if (this.unlockedUrl) URL.revokeObjectURL(this.unlockedUrl);
    this.unlockFile = null;
    this.unlockBytes = null;
    this.unlockedBlob = null;
    this.unlockedUrl = null;

    if (this.unlockPasswordInput) this.unlockPasswordInput.value = '';
    if (this.unlockFileInput) this.unlockFileInput.value = '';

    if (this.unlockDownloadSection) this.unlockDownloadSection.classList.add('hidden');
    if (this.unlockWorkspace) this.unlockWorkspace.classList.add('hidden');
    if (this.unlockDropzone) this.unlockDropzone.classList.remove('hidden');
  }

  // -------------------------------------------------------------
  // UI & Toast Helpers
  // -------------------------------------------------------------
  updateUI() {
    this.switchMode(this.activeMode);
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
  window.protectUnlockPdfApp = new ProtectUnlockPdfApp();
});
