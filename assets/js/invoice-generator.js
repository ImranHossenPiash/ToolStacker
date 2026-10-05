/**
 * ToolStacker Invoice Generator
 * 100% Client-Side • 5 Professional Templates • Live Preview • PDF & Print Ready
 * Powered by html2canvas & jsPDF with localStorage Draft Persistence
 */

function formatCurrency(amount, currencyCode = 'USD', symbol = '$') {
  const num = Number(amount) || 0;
  const formattedNum = num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  switch (currencyCode) {
    case 'EUR':
      return `${formattedNum} €`;
    case 'GBP':
      return `£${formattedNum}`;
    case 'BDT':
      return `৳${formattedNum}`;
    case 'INR':
      return `₹${formattedNum}`;
    case 'JPY':
      return `¥${Math.round(num).toLocaleString()}`;
    case 'CAD':
    case 'AUD':
    case 'USD':
    default:
      return `${symbol}${formattedNum}`;
  }
}

function getFormattedDate(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysToDate(d, days) {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

function generateInvoiceNumber() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const rand = Math.floor(100 + Math.random() * 900);
  return `INV-${yyyy}${mm}${dd}-${rand}`;
}

const DEFAULT_SAMPLE_INVOICE = {
  template: 'modern',
  currency: 'USD',
  currencySymbol: '$',
  sender: {
    name: 'Acme Digital Studios LLC',
    address: '100 Innovation Blvd, Suite 400\nSan Francisco, CA 94105\nUnited States',
    email: 'billing@acmedigital.io',
    phone: '+1 (555) 234-5678',
    logoUrl: '',
  },
  client: {
    name: 'Starlight Enterprises Inc.',
    address: '742 Evergreen Terrace\nSeattle, WA 98101\nUnited States',
    email: 'accounts@starlight.co',
    phone: '+1 (555) 987-6543',
  },
  details: {
    invoiceNumber: generateInvoiceNumber(),
    invoiceDate: getFormattedDate(),
    dueDate: getFormattedDate(addDaysToDate(new Date(), 14)),
    poNumber: 'PO-98214',
  },
  items: [
    {
      id: 'item_1',
      description: 'Web Application UI/UX Design & Prototyping',
      quantity: 40,
      rate: 85,
    },
    {
      id: 'item_2',
      description: 'Full-Stack Frontend & Backend API Development',
      quantity: 65,
      rate: 95,
    },
    {
      id: 'item_3',
      description: 'Cloud Infrastructure Setup & Security Audit',
      quantity: 1,
      rate: 1250,
    },
  ],
  taxRate: 8.5,
  discountType: 'percent', // 'percent' | 'fixed'
  discountValue: 5,
  notes: 'Thank you for choosing Acme Digital Studios! Please send payment within 14 days of invoice date.',
  terms: 'Payment terms: Bank wire transfer or ACH. A late fee of 1.5% per month will be assessed on past-due balances.',
};

class InvoiceGeneratorApp {
  constructor() {
    this.state = this.loadDraft() || JSON.parse(JSON.stringify(DEFAULT_SAMPLE_INVOICE));
    this.debounceTimer = null;
    this.isGeneratingPdf = false;

    this.cacheDom();
    this.bindEvents();
    this.populateFormFromState();
    this.renderLineItemsTable();
    this.renderLivePreview();
  }

  cacheDom() {
    // Top actions
    this.newInvoiceBtn = document.getElementById('new-invoice-btn');
    this.loadSampleBtn = document.getElementById('load-sample-btn');
    this.saveDraftBtn = document.getElementById('save-draft-btn');
    this.printBtn = document.getElementById('print-btn');
    this.downloadPdfBtn = document.getElementById('download-pdf-btn');
    this.stickyDownloadBtn = document.getElementById('sticky-download-btn');

    // Template Selector Cards
    this.templateBtns = document.querySelectorAll('.template-select-btn');

    // Business info
    this.senderName = document.getElementById('sender-name');
    this.senderAddress = document.getElementById('sender-address');
    this.senderEmail = document.getElementById('sender-email');
    this.senderPhone = document.getElementById('sender-phone');
    this.logoInput = document.getElementById('logo-file-input');
    this.logoPreviewContainer = document.getElementById('logo-preview-container');
    this.logoPreviewImg = document.getElementById('logo-preview-img');
    this.removeLogoBtn = document.getElementById('remove-logo-btn');

    // Client info
    this.clientName = document.getElementById('client-name');
    this.clientAddress = document.getElementById('client-address');
    this.clientEmail = document.getElementById('client-email');
    this.clientPhone = document.getElementById('client-phone');

    // Invoice details
    this.invoiceNumber = document.getElementById('invoice-number');
    this.autoGenNumberBtn = document.getElementById('auto-gen-number-btn');
    this.invoiceDate = document.getElementById('invoice-date');
    this.dueDate = document.getElementById('due-date');
    this.poNumber = document.getElementById('po-number');
    this.currencySelect = document.getElementById('currency-select');

    // Line items
    this.lineItemsTbody = document.getElementById('line-items-tbody');
    this.addItemBtn = document.getElementById('add-item-btn');

    // Totals & Discounts
    this.taxRateInput = document.getElementById('tax-rate-input');
    this.discountTypeSelect = document.getElementById('discount-type-select');
    this.discountValInput = document.getElementById('discount-val-input');

    // Form summary labels
    this.summarySubtotal = document.getElementById('form-summary-subtotal');
    this.summaryTax = document.getElementById('form-summary-tax');
    this.summaryDiscount = document.getElementById('form-summary-discount');
    this.summaryTotal = document.getElementById('form-summary-total');

    // Notes & Terms
    this.notesInput = document.getElementById('notes-input');
    this.termsInput = document.getElementById('terms-input');

    // Preview Container
    this.previewContainer = document.getElementById('invoice-preview-container');
    this.previewWrapper = document.getElementById('invoice-paper');

    // Processing modal
    this.processingModal = document.getElementById('invoice-processing-modal');
  }

  bindEvents() {
    // Header actions
    this.newInvoiceBtn?.addEventListener('click', () => this.startNewInvoice());
    this.loadSampleBtn?.addEventListener('click', () => this.loadSampleData());
    this.saveDraftBtn?.addEventListener('click', () => {
      this.saveDraft();
      this.showToast('Draft invoice saved to browser storage.', 'success');
    });

    this.printBtn?.addEventListener('click', () => this.printInvoice());
    this.downloadPdfBtn?.addEventListener('click', () => this.exportPdf());
    this.stickyDownloadBtn?.addEventListener('click', () => this.exportPdf());

    // Template Switcher
    this.templateBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tpl = btn.getAttribute('data-template');
        if (tpl) {
          this.state.template = tpl;
          this.updateTemplateButtons();
          this.triggerLivePreviewUpdate();
        }
      });
    });

    // Sender Info Events
    this.senderName?.addEventListener('input', (e) => {
      this.state.sender.name = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.senderAddress?.addEventListener('input', (e) => {
      this.state.sender.address = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.senderEmail?.addEventListener('input', (e) => {
      this.state.sender.email = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.senderPhone?.addEventListener('input', (e) => {
      this.state.sender.phone = e.target.value;
      this.triggerLivePreviewUpdate();
    });

    // Logo Upload
    this.logoInput?.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        this.handleLogoUpload(e.target.files[0]);
      }
    });

    this.removeLogoBtn?.addEventListener('click', () => {
      this.state.sender.logoUrl = '';
      if (this.logoPreviewContainer) this.logoPreviewContainer.classList.add('hidden');
      if (this.logoInput) this.logoInput.value = '';
      this.triggerLivePreviewUpdate();
      this.showToast('Logo removed.', 'info');
    });

    // Client Info Events
    this.clientName?.addEventListener('input', (e) => {
      this.state.client.name = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.clientAddress?.addEventListener('input', (e) => {
      this.state.client.address = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.clientEmail?.addEventListener('input', (e) => {
      this.state.client.email = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.clientPhone?.addEventListener('input', (e) => {
      this.state.client.phone = e.target.value;
      this.triggerLivePreviewUpdate();
    });

    // Details Events
    this.invoiceNumber?.addEventListener('input', (e) => {
      this.state.details.invoiceNumber = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.autoGenNumberBtn?.addEventListener('click', () => {
      const num = generateInvoiceNumber();
      this.state.details.invoiceNumber = num;
      if (this.invoiceNumber) this.invoiceNumber.value = num;
      this.triggerLivePreviewUpdate();
    });

    this.invoiceDate?.addEventListener('change', (e) => {
      this.state.details.invoiceDate = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.dueDate?.addEventListener('change', (e) => {
      this.state.details.dueDate = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.poNumber?.addEventListener('input', (e) => {
      this.state.details.poNumber = e.target.value;
      this.triggerLivePreviewUpdate();
    });

    // Currency selector
    this.currencySelect?.addEventListener('change', (e) => {
      const val = e.target.value;
      this.state.currency = val;
      const symbols = {
        USD: '$',
        EUR: '€',
        GBP: '£',
        BDT: '৳',
        CAD: '$',
        AUD: '$',
        INR: '₹',
        JPY: '¥',
        CHF: 'Fr',
      };
      this.state.currencySymbol = symbols[val] || '$';
      this.triggerLivePreviewUpdate();
    });

    // Line items
    this.addItemBtn?.addEventListener('click', () => this.addLineItem());

    // Tax & Discounts
    this.taxRateInput?.addEventListener('input', (e) => {
      this.state.taxRate = Math.max(0, parseFloat(e.target.value) || 0);
      this.triggerLivePreviewUpdate();
    });

    this.discountTypeSelect?.addEventListener('change', (e) => {
      this.state.discountType = e.target.value;
      this.triggerLivePreviewUpdate();
    });

    this.discountValInput?.addEventListener('input', (e) => {
      this.state.discountValue = Math.max(0, parseFloat(e.target.value) || 0);
      this.triggerLivePreviewUpdate();
    });

    // Notes & Terms
    this.notesInput?.addEventListener('input', (e) => {
      this.state.notes = e.target.value;
      this.triggerLivePreviewUpdate();
    });
    this.termsInput?.addEventListener('input', (e) => {
      this.state.terms = e.target.value;
      this.triggerLivePreviewUpdate();
    });
  }

  handleLogoUpload(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.showToast('Please upload an image file (PNG, JPG, SVG).', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.showToast('Logo file size must be under 5MB.', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.state.sender.logoUrl = dataUrl;
      if (this.logoPreviewImg) this.logoPreviewImg.src = dataUrl;
      if (this.logoPreviewContainer) this.logoPreviewContainer.classList.remove('hidden');
      this.triggerLivePreviewUpdate();
      this.showToast('Business logo uploaded!', 'success');
    };
    reader.readAsDataURL(file);
  }

  populateFormFromState() {
    this.updateTemplateButtons();

    if (this.senderName) this.senderName.value = this.state.sender.name || '';
    if (this.senderAddress) this.senderAddress.value = this.state.sender.address || '';
    if (this.senderEmail) this.senderEmail.value = this.state.sender.email || '';
    if (this.senderPhone) this.senderPhone.value = this.state.sender.phone || '';

    if (this.state.sender.logoUrl) {
      if (this.logoPreviewImg) this.logoPreviewImg.src = this.state.sender.logoUrl;
      if (this.logoPreviewContainer) this.logoPreviewContainer.classList.remove('hidden');
    } else {
      if (this.logoPreviewContainer) this.logoPreviewContainer.classList.add('hidden');
    }

    if (this.clientName) this.clientName.value = this.state.client.name || '';
    if (this.clientAddress) this.clientAddress.value = this.state.client.address || '';
    if (this.clientEmail) this.clientEmail.value = this.state.client.email || '';
    if (this.clientPhone) this.clientPhone.value = this.state.client.phone || '';

    if (this.invoiceNumber) this.invoiceNumber.value = this.state.details.invoiceNumber || '';
    if (this.invoiceDate) this.invoiceDate.value = this.state.details.invoiceDate || '';
    if (this.dueDate) this.dueDate.value = this.state.details.dueDate || '';
    if (this.poNumber) this.poNumber.value = this.state.details.poNumber || '';
    if (this.currencySelect) this.currencySelect.value = this.state.currency || 'USD';

    if (this.taxRateInput) this.taxRateInput.value = this.state.taxRate !== undefined ? this.state.taxRate : 0;
    if (this.discountTypeSelect) this.discountTypeSelect.value = this.state.discountType || 'percent';
    if (this.discountValInput) this.discountValInput.value = this.state.discountValue !== undefined ? this.state.discountValue : 0;

    if (this.notesInput) this.notesInput.value = this.state.notes || '';
    if (this.termsInput) this.termsInput.value = this.state.terms || '';
  }

  updateTemplateButtons() {
    this.templateBtns.forEach((btn) => {
      const match = btn.getAttribute('data-template') === this.state.template;
      btn.classList.toggle('border-blue-600', match);
      btn.classList.toggle('ring-2', match);
      btn.classList.toggle('ring-blue-500/20', match);
      btn.classList.toggle('border-neutral-200', !match);
      btn.classList.toggle('dark:border-neutral-800', !match);
    });
  }

  // -------------------------------------------------------------
  // Line Items Table Management
  // -------------------------------------------------------------
  renderLineItemsTable() {
    if (!this.lineItemsTbody) return;
    this.lineItemsTbody.innerHTML = '';

    this.state.items.forEach((item, index) => {
      const tr = document.createElement('tr');
      tr.className = 'border-b border-neutral-100 dark:border-neutral-800 text-xs hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20';

      const lineTotal = (Number(item.quantity) || 0) * (Number(item.rate) || 0);

      tr.innerHTML = `
        <td class="p-2 sm:p-2.5">
          <input
            type="text"
            placeholder="Item or service description"
            value="${item.description ? item.description.replace(/"/g, '&quot;') : ''}"
            class="item-desc w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-index="${index}"
          />
        </td>
        <td class="p-2 sm:p-2.5 w-20">
          <input
            type="number"
            min="0"
            step="any"
            value="${item.quantity}"
            class="item-qty w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-index="${index}"
          />
        </td>
        <td class="p-2 sm:p-2.5 w-28">
          <input
            type="number"
            min="0"
            step="any"
            value="${item.rate}"
            class="item-rate w-full px-2 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-mono text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
            data-index="${index}"
          />
        </td>
        <td class="p-2 sm:p-2.5 w-28 text-right font-mono font-bold text-neutral-800 dark:text-neutral-200 whitespace-nowrap">
          ${formatCurrency(lineTotal, this.state.currency, this.state.currencySymbol)}
        </td>
        <td class="p-2 sm:p-2.5 w-10 text-center">
          <button
            type="button"
            class="delete-item-btn p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
            data-index="${index}"
            title="Remove item"
          >
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      `;

      this.lineItemsTbody.appendChild(tr);
    });

    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }

    // Attach dynamic line item input listeners
    this.lineItemsTbody.querySelectorAll('.item-desc').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (this.state.items[idx]) {
          this.state.items[idx].description = e.target.value;
          this.triggerLivePreviewUpdate();
        }
      });
    });

    this.lineItemsTbody.querySelectorAll('.item-qty').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (this.state.items[idx]) {
          this.state.items[idx].quantity = Math.max(0, parseFloat(e.target.value) || 0);
          this.renderLineItemsTable();
          this.triggerLivePreviewUpdate();
        }
      });
    });

    this.lineItemsTbody.querySelectorAll('.item-rate').forEach((input) => {
      input.addEventListener('input', (e) => {
        const idx = parseInt(e.target.getAttribute('data-index'), 10);
        if (this.state.items[idx]) {
          this.state.items[idx].rate = Math.max(0, parseFloat(e.target.value) || 0);
          this.renderLineItemsTable();
          this.triggerLivePreviewUpdate();
        }
      });
    });

    this.lineItemsTbody.querySelectorAll('.delete-item-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (this.state.items.length <= 1) {
          this.showToast('Invoice must have at least one line item.', 'warning');
          return;
        }
        this.state.items.splice(idx, 1);
        this.renderLineItemsTable();
        this.triggerLivePreviewUpdate();
      });
    });
  }

  addLineItem() {
    this.state.items.push({
      id: 'item_' + Date.now(),
      description: 'New service item',
      quantity: 1,
      rate: 100,
    });
    this.renderLineItemsTable();
    this.triggerLivePreviewUpdate();
  }

  // -------------------------------------------------------------
  // Calculations
  // -------------------------------------------------------------
  calculateTotals() {
    let subtotal = 0;
    this.state.items.forEach((item) => {
      const q = Number(item.quantity) || 0;
      const r = Number(item.rate) || 0;
      subtotal += q * r;
    });

    const taxRate = Number(this.state.taxRate) || 0;
    const taxAmount = (subtotal * taxRate) / 100;

    const discountVal = Number(this.state.discountValue) || 0;
    let discountAmount = 0;
    if (this.state.discountType === 'percent') {
      discountAmount = (subtotal * discountVal) / 100;
    } else {
      discountAmount = discountVal;
    }

    const total = Math.max(0, subtotal + taxAmount - discountAmount);

    return {
      subtotal,
      taxAmount,
      discountAmount,
      total,
    };
  }

  updateFormSummary() {
    const { subtotal, taxAmount, discountAmount, total } = this.calculateTotals();
    const curr = this.state.currency;
    const sym = this.state.currencySymbol;

    if (this.summarySubtotal) this.summarySubtotal.textContent = formatCurrency(subtotal, curr, sym);
    if (this.summaryTax) this.summaryTax.textContent = `+${formatCurrency(taxAmount, curr, sym)}`;
    if (this.summaryDiscount) this.summaryDiscount.textContent = `-${formatCurrency(discountAmount, curr, sym)}`;
    if (this.summaryTotal) this.summaryTotal.textContent = formatCurrency(total, curr, sym);
  }

  // -------------------------------------------------------------
  // Live Preview Rendering (5 Templates)
  // -------------------------------------------------------------
  triggerLivePreviewUpdate() {
    this.updateFormSummary();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.renderLivePreview();
      this.saveDraft();
    }, 200);
  }

  renderLivePreview() {
    if (!this.previewWrapper) return;
    const { subtotal, taxAmount, discountAmount, total } = this.calculateTotals();
    const tpl = this.state.template || 'modern';

    let html = '';
    switch (tpl) {
      case 'corporate':
        html = this.renderCorporateTemplate(subtotal, taxAmount, discountAmount, total);
        break;
      case 'creative':
        html = this.renderCreativeTemplate(subtotal, taxAmount, discountAmount, total);
        break;
      case 'classic':
        html = this.renderClassicTemplate(subtotal, taxAmount, discountAmount, total);
        break;
      case 'startup':
        html = this.renderStartupTemplate(subtotal, taxAmount, discountAmount, total);
        break;
      case 'modern':
      default:
        html = this.renderModernTemplate(subtotal, taxAmount, discountAmount, total);
        break;
    }

    this.previewWrapper.innerHTML = html;
  }

  // --- Template 1: Modern Minimalist ---
  renderModernTemplate(subtotal, tax, discount, total) {
    const s = this.state;
    const curr = s.currency;
    const sym = s.currencySymbol;

    return `
      <div class="p-8 sm:p-12 text-slate-900 bg-white font-sans text-xs leading-relaxed">
        <!-- Header -->
        <div class="flex justify-between items-start border-b border-slate-200 pb-8">
          <div>
            ${s.sender.logoUrl ? `<img src="${s.sender.logoUrl}" alt="Logo" class="max-h-16 max-w-[200px] mb-4 object-contain" />` : ''}
            <h1 class="text-xl font-bold tracking-tight text-slate-900 font-display">${s.sender.name || 'Your Company'}</h1>
            <div class="text-slate-500 whitespace-pre-line mt-1 text-[11px]">${s.sender.address || ''}</div>
            <div class="text-slate-500 text-[11px] mt-1">
              ${s.sender.email ? `<span>${s.sender.email}</span>` : ''}
              ${s.sender.email && s.sender.phone ? ` • ` : ''}
              ${s.sender.phone ? `<span>${s.sender.phone}</span>` : ''}
            </div>
          </div>
          <div class="text-right">
            <span class="inline-block px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-blue-50 text-blue-700 border border-blue-100">
              Invoice
            </span>
            <div class="mt-3 font-mono font-bold text-base text-slate-800">${s.details.invoiceNumber || 'INV-001'}</div>
            <div class="mt-2 text-slate-500 text-[11px] space-y-0.5">
              <div><span class="font-semibold text-slate-700">Date:</span> ${s.details.invoiceDate || ''}</div>
              <div><span class="font-semibold text-slate-700">Due:</span> ${s.details.dueDate || ''}</div>
              ${s.details.poNumber ? `<div><span class="font-semibold text-slate-700">PO:</span> ${s.details.poNumber}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Bill To -->
        <div class="py-6 border-b border-slate-100">
          <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Billed To</span>
          <div class="font-bold text-sm text-slate-900">${s.client.name || 'Client Name'}</div>
          <div class="text-slate-500 whitespace-pre-line text-[11px] mt-0.5">${s.client.address || ''}</div>
          ${s.client.email ? `<div class="text-slate-500 text-[11px]">${s.client.email}</div>` : ''}
        </div>

        <!-- Table -->
        <table class="w-full text-left my-6">
          <thead>
            <tr class="border-b-2 border-slate-200 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <th class="py-3 px-2">Description</th>
              <th class="py-3 px-2 text-center w-16">Qty</th>
              <th class="py-3 px-2 text-right w-24">Rate</th>
              <th class="py-3 px-2 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${s.items.map(item => `
              <tr>
                <td class="py-3.5 px-2 font-medium text-slate-800">${item.description || 'Item'}</td>
                <td class="py-3.5 px-2 text-center font-mono text-slate-600">${item.quantity}</td>
                <td class="py-3.5 px-2 text-right font-mono text-slate-600">${formatCurrency(item.rate, curr, sym)}</td>
                <td class="py-3.5 px-2 text-right font-mono font-bold text-slate-900">${formatCurrency((item.quantity || 0) * (item.rate || 0), curr, sym)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="flex justify-end pt-4">
          <div class="w-64 space-y-2 text-[11px]">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span class="font-mono">${formatCurrency(subtotal, curr, sym)}</span>
            </div>
            ${tax > 0 ? `
              <div class="flex justify-between text-slate-600">
                <span>Tax (${s.taxRate}%):</span>
                <span class="font-mono">${formatCurrency(tax, curr, sym)}</span>
              </div>
            ` : ''}
            ${discount > 0 ? `
              <div class="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span class="font-mono">-${formatCurrency(discount, curr, sym)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-base font-bold text-slate-900 border-t-2 border-slate-900 pt-2 mt-2">
              <span>Total Due:</span>
              <span class="font-mono text-blue-600">${formatCurrency(total, curr, sym)}</span>
            </div>
          </div>
        </div>

        <!-- Footer Notes -->
        ${(s.notes || s.terms) ? `
          <div class="mt-12 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-6 text-[10px] text-slate-500">
            ${s.notes ? `<div><span class="font-bold text-slate-700 block uppercase mb-1">Notes</span><p class="whitespace-pre-line">${s.notes}</p></div>` : ''}
            ${s.terms ? `<div><span class="font-bold text-slate-700 block uppercase mb-1">Terms &amp; Conditions</span><p class="whitespace-pre-line">${s.terms}</p></div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- Template 2: Corporate Executive ---
  renderCorporateTemplate(subtotal, tax, discount, total) {
    const s = this.state;
    const curr = s.currency;
    const sym = s.currencySymbol;

    return `
      <div class="bg-white text-slate-900 font-sans text-xs leading-relaxed">
        <!-- Top Navy Banner -->
        <div class="bg-slate-900 text-white p-8 sm:p-10 flex justify-between items-center">
          <div>
            ${s.sender.logoUrl ? `<img src="${s.sender.logoUrl}" alt="Logo" class="max-h-14 max-w-[180px] mb-3 brightness-0 invert object-contain" />` : ''}
            <h1 class="text-xl font-bold tracking-tight text-white uppercase">${s.sender.name || 'Company Name'}</h1>
            <div class="text-slate-300 text-[11px] whitespace-pre-line mt-1">${s.sender.address || ''}</div>
          </div>
          <div class="text-right">
            <div class="text-3xl font-extrabold tracking-wider uppercase font-display text-blue-400">INVOICE</div>
            <div class="font-mono font-bold mt-1 text-slate-200"># ${s.details.invoiceNumber || 'INV-001'}</div>
          </div>
        </div>

        <div class="p-8 sm:p-10 space-y-6">
          <!-- Client & Metadata Grid -->
          <div class="grid grid-cols-2 gap-8 bg-slate-50 p-5 rounded-xl border border-slate-200">
            <div>
              <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">CLIENT BILL TO</span>
              <div class="font-bold text-slate-900 text-sm">${s.client.name || 'Client Name'}</div>
              <div class="text-slate-600 whitespace-pre-line text-[11px] mt-0.5">${s.client.address || ''}</div>
              ${s.client.email ? `<div class="text-slate-600 text-[11px] mt-0.5">${s.client.email}</div>` : ''}
            </div>
            <div class="text-right space-y-1 text-[11px]">
              <div><span class="font-bold text-slate-600 uppercase">Invoice Date:</span> <span class="font-mono text-slate-900">${s.details.invoiceDate}</span></div>
              <div><span class="font-bold text-slate-600 uppercase">Payment Due:</span> <span class="font-mono text-slate-900 font-bold">${s.details.dueDate}</span></div>
              ${s.details.poNumber ? `<div><span class="font-bold text-slate-600 uppercase">P.O. Number:</span> <span class="font-mono">${s.details.poNumber}</span></div>` : ''}
            </div>
          </div>

          <!-- Table -->
          <table class="w-full text-left border-collapse border border-slate-200">
            <thead>
              <tr class="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <th class="py-2.5 px-3">Item Description</th>
                <th class="py-2.5 px-3 text-center w-16">Quantity</th>
                <th class="py-2.5 px-3 text-right w-24">Unit Price</th>
                <th class="py-2.5 px-3 text-right w-28">Total</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              ${s.items.map(item => `
                <tr>
                  <td class="py-3 px-3 font-medium text-slate-800">${item.description}</td>
                  <td class="py-3 px-3 text-center font-mono">${item.quantity}</td>
                  <td class="py-3 px-3 text-right font-mono">${formatCurrency(item.rate, curr, sym)}</td>
                  <td class="py-3 px-3 text-right font-mono font-bold">${formatCurrency((item.quantity || 0) * (item.rate || 0), curr, sym)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Totals -->
          <div class="flex justify-end">
            <div class="w-72 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 text-xs">
              <div class="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span class="font-mono">${formatCurrency(subtotal, curr, sym)}</span>
              </div>
              ${tax > 0 ? `
                <div class="flex justify-between text-slate-600">
                  <span>Tax (${s.taxRate}%):</span>
                  <span class="font-mono">${formatCurrency(tax, curr, sym)}</span>
                </div>
              ` : ''}
              ${discount > 0 ? `
                <div class="flex justify-between text-rose-600">
                  <span>Discount:</span>
                  <span class="font-mono">-${formatCurrency(discount, curr, sym)}</span>
                </div>
              ` : ''}
              <div class="flex justify-between text-base font-extrabold text-slate-900 border-t border-slate-300 pt-2.5 mt-2">
                <span>BALANCE DUE:</span>
                <span class="font-mono text-slate-900">${formatCurrency(total, curr, sym)}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${(s.notes || s.terms) ? `
            <div class="pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-2">
              ${s.notes ? `<div><span class="font-bold text-slate-700">SPECIAL NOTES:</span> ${s.notes}</div>` : ''}
              ${s.terms ? `<div><span class="font-bold text-slate-700">TERMS:</span> ${s.terms}</div>` : ''}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  // --- Template 3: Creative Studio ---
  renderCreativeTemplate(subtotal, tax, discount, total) {
    const s = this.state;
    const curr = s.currency;
    const sym = s.currencySymbol;

    return `
      <div class="p-8 sm:p-12 text-neutral-900 bg-white font-sans text-xs leading-relaxed">
        <div class="flex justify-between items-start">
          <div>
            ${s.sender.logoUrl ? `<img src="${s.sender.logoUrl}" alt="Logo" class="max-h-16 max-w-[200px] mb-4 object-contain" />` : ''}
            <h1 class="text-2xl font-black tracking-tight text-neutral-900 font-display">${s.sender.name}</h1>
            <p class="text-neutral-500 whitespace-pre-line text-[11px] mt-1">${s.sender.address}</p>
          </div>
          <div class="text-right">
            <div class="inline-block px-4 py-1.5 rounded-2xl bg-indigo-600 text-white font-extrabold text-xs tracking-wider uppercase shadow-xs">
              INVOICE
            </div>
            <div class="mt-2 text-lg font-black font-mono text-neutral-800">${s.details.invoiceNumber}</div>
            <div class="text-[11px] text-neutral-500 mt-1">Issued: ${s.details.invoiceDate}</div>
            <div class="text-[11px] font-bold text-indigo-600">Due: ${s.details.dueDate}</div>
          </div>
        </div>

        <!-- Decorative Divider -->
        <div class="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full my-6"></div>

        <!-- Client Box -->
        <div class="bg-indigo-50/60 rounded-2xl p-5 border border-indigo-100 flex justify-between items-start">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Invoice Prepared For</span>
            <div class="font-extrabold text-base text-neutral-900 mt-0.5">${s.client.name}</div>
            <div class="text-neutral-600 text-[11px] whitespace-pre-line mt-1">${s.client.address}</div>
          </div>
          <div class="text-right text-[11px] text-neutral-500">
            ${s.client.email ? `<div>${s.client.email}</div>` : ''}
            ${s.client.phone ? `<div>${s.client.phone}</div>` : ''}
          </div>
        </div>

        <!-- Table -->
        <table class="w-full text-left my-6">
          <thead>
            <tr class="bg-neutral-100 rounded-xl text-neutral-600 font-bold text-[10px] uppercase">
              <th class="py-3 px-3 rounded-l-xl">Service / Project Scope</th>
              <th class="py-3 px-2 text-center w-16">Hours/Qty</th>
              <th class="py-3 px-2 text-right w-24">Price</th>
              <th class="py-3 px-3 text-right rounded-r-xl w-28">Total</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-100">
            ${s.items.map(item => `
              <tr>
                <td class="py-3.5 px-3 font-semibold text-neutral-800">${item.description}</td>
                <td class="py-3.5 px-2 text-center font-mono text-neutral-600">${item.quantity}</td>
                <td class="py-3.5 px-2 text-right font-mono text-neutral-600">${formatCurrency(item.rate, curr, sym)}</td>
                <td class="py-3.5 px-3 text-right font-mono font-bold text-indigo-900">${formatCurrency((item.quantity || 0) * (item.rate || 0), curr, sym)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals Card -->
        <div class="flex justify-end pt-2">
          <div class="w-72 bg-neutral-50 rounded-2xl p-4 border border-neutral-200 space-y-2 text-xs">
            <div class="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span class="font-mono font-semibold">${formatCurrency(subtotal, curr, sym)}</span>
            </div>
            ${tax > 0 ? `
              <div class="flex justify-between text-neutral-600">
                <span>Tax (${s.taxRate}%):</span>
                <span class="font-mono font-semibold">${formatCurrency(tax, curr, sym)}</span>
              </div>
            ` : ''}
            ${discount > 0 ? `
              <div class="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span class="font-mono font-semibold">-${formatCurrency(discount, curr, sym)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-base font-black text-indigo-600 border-t border-neutral-200 pt-2.5 mt-2">
              <span>Total:</span>
              <span class="font-mono">${formatCurrency(total, curr, sym)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${(s.notes || s.terms) ? `
          <div class="mt-8 pt-4 border-t border-neutral-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] text-neutral-500">
            ${s.notes ? `<div><span class="font-bold text-neutral-700 block uppercase">Notes:</span><p class="whitespace-pre-line mt-0.5">${s.notes}</p></div>` : ''}
            ${s.terms ? `<div><span class="font-bold text-neutral-700 block uppercase">Payment Terms:</span><p class="whitespace-pre-line mt-0.5">${s.terms}</p></div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- Template 4: Classic Professional ---
  renderClassicTemplate(subtotal, tax, discount, total) {
    const s = this.state;
    const curr = s.currency;
    const sym = s.currencySymbol;

    return `
      <div class="p-8 sm:p-12 text-neutral-900 bg-white font-serif text-xs leading-relaxed">
        <div class="text-center pb-6 border-b border-neutral-300">
          ${s.sender.logoUrl ? `<img src="${s.sender.logoUrl}" alt="Logo" class="max-h-16 mx-auto mb-3 object-contain" />` : ''}
          <h1 class="text-2xl font-bold uppercase tracking-wider text-neutral-900">${s.sender.name}</h1>
          <div class="text-neutral-600 font-sans text-[11px] whitespace-pre-line mt-1">${s.sender.address}</div>
          <div class="text-neutral-500 font-sans text-[11px] mt-0.5">
            ${s.sender.email ? `Email: ${s.sender.email}` : ''}
            ${s.sender.phone ? ` • Phone: ${s.sender.phone}` : ''}
          </div>
        </div>

        <div class="flex justify-between items-start py-6 border-b border-neutral-300 font-sans">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">To:</span>
            <div class="font-bold text-neutral-900 text-sm">${s.client.name}</div>
            <div class="text-neutral-600 text-[11px] whitespace-pre-line mt-0.5">${s.client.address}</div>
          </div>
          <div class="text-right space-y-1 text-[11px]">
            <div><span class="font-bold">INVOICE NO:</span> <span class="font-mono">${s.details.invoiceNumber}</span></div>
            <div><span class="font-bold">DATE:</span> ${s.details.invoiceDate}</div>
            <div><span class="font-bold">DUE DATE:</span> ${s.details.dueDate}</div>
          </div>
        </div>

        <!-- Table -->
        <table class="w-full text-left my-6 font-sans">
          <thead>
            <tr class="border-b-2 border-neutral-900 text-neutral-900 font-bold uppercase text-[10px]">
              <th class="py-2.5 px-2">Description</th>
              <th class="py-2.5 px-2 text-center w-16">Quantity</th>
              <th class="py-2.5 px-2 text-right w-24">Price</th>
              <th class="py-2.5 px-2 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-neutral-200">
            ${s.items.map(item => `
              <tr>
                <td class="py-3 px-2 text-neutral-800">${item.description}</td>
                <td class="py-3 px-2 text-center font-mono">${item.quantity}</td>
                <td class="py-3 px-2 text-right font-mono">${formatCurrency(item.rate, curr, sym)}</td>
                <td class="py-3 px-2 text-right font-mono font-bold">${formatCurrency((item.quantity || 0) * (item.rate || 0), curr, sym)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Totals -->
        <div class="flex justify-end font-sans pt-2">
          <div class="w-64 space-y-2 text-xs">
            <div class="flex justify-between text-neutral-600">
              <span>Subtotal:</span>
              <span class="font-mono">${formatCurrency(subtotal, curr, sym)}</span>
            </div>
            ${tax > 0 ? `
              <div class="flex justify-between text-neutral-600">
                <span>Tax (${s.taxRate}%):</span>
                <span class="font-mono">${formatCurrency(tax, curr, sym)}</span>
              </div>
            ` : ''}
            ${discount > 0 ? `
              <div class="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span class="font-mono">-${formatCurrency(discount, curr, sym)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-base font-bold text-neutral-900 border-t-2 border-b-2 border-neutral-900 py-2 mt-2">
              <span>TOTAL DUE:</span>
              <span class="font-mono">${formatCurrency(total, curr, sym)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${(s.notes || s.terms) ? `
          <div class="mt-12 pt-4 border-t border-neutral-300 font-sans text-[10px] text-neutral-600 space-y-2">
            ${s.notes ? `<div><strong>Notes:</strong> ${s.notes}</div>` : ''}
            ${s.terms ? `<div><strong>Terms &amp; Conditions:</strong> ${s.terms}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // --- Template 5: Tech Startup ---
  renderStartupTemplate(subtotal, tax, discount, total) {
    const s = this.state;
    const curr = s.currency;
    const sym = s.currencySymbol;

    return `
      <div class="p-8 sm:p-12 text-slate-800 bg-white font-sans text-xs leading-relaxed">
        <div class="flex justify-between items-start">
          <div class="flex items-center gap-4">
            ${s.sender.logoUrl ? `<img src="${s.sender.logoUrl}" alt="Logo" class="max-h-14 max-w-[160px] object-contain rounded-xl" />` : `
              <div class="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-xs">
                ${(s.sender.name || 'A').charAt(0).toUpperCase()}
              </div>
            `}
            <div>
              <h1 class="text-xl font-extrabold text-slate-900 font-display">${s.sender.name}</h1>
              <div class="text-[11px] text-slate-500">${s.sender.email || ''}</div>
            </div>
          </div>

          <div class="text-right">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Payment Request
            </span>
            <div class="mt-2 text-base font-black font-mono text-slate-900">${s.details.invoiceNumber}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Due by <span class="font-bold text-slate-800">${s.details.dueDate}</span></div>
          </div>
        </div>

        <!-- Info Grid -->
        <div class="grid grid-cols-2 gap-4 my-8">
          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Customer Details</span>
            <div class="font-bold text-slate-900 text-sm">${s.client.name}</div>
            <div class="text-slate-500 text-[11px] whitespace-pre-line mt-1">${s.client.address}</div>
          </div>

          <div class="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between text-[11px]">
            <div>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Issue Date</span>
              <div class="font-mono font-bold text-slate-800">${s.details.invoiceDate}</div>
            </div>
            ${s.details.poNumber ? `
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mt-2">Reference / PO</span>
                <div class="font-mono text-slate-800">${s.details.poNumber}</div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Items Table -->
        <div class="rounded-2xl border border-slate-200 overflow-hidden my-6">
          <table class="w-full text-left">
            <thead class="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
              <tr>
                <th class="py-3 px-4">Item &amp; Description</th>
                <th class="py-3 px-3 text-center w-16">Qty</th>
                <th class="py-3 px-3 text-right w-24">Price</th>
                <th class="py-3 px-4 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${s.items.map(item => `
                <tr>
                  <td class="py-3.5 px-4 font-semibold text-slate-800">${item.description}</td>
                  <td class="py-3.5 px-3 text-center font-mono text-slate-600">${item.quantity}</td>
                  <td class="py-3.5 px-3 text-right font-mono text-slate-600">${formatCurrency(item.rate, curr, sym)}</td>
                  <td class="py-3.5 px-4 text-right font-mono font-bold text-slate-900">${formatCurrency((item.quantity || 0) * (item.rate || 0), curr, sym)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="flex justify-end pt-2">
          <div class="w-72 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 space-y-2 text-xs">
            <div class="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span class="font-mono font-semibold">${formatCurrency(subtotal, curr, sym)}</span>
            </div>
            ${tax > 0 ? `
              <div class="flex justify-between text-slate-600">
                <span>Tax (${s.taxRate}%):</span>
                <span class="font-mono font-semibold">${formatCurrency(tax, curr, sym)}</span>
              </div>
            ` : ''}
            ${discount > 0 ? `
              <div class="flex justify-between text-rose-600">
                <span>Discount:</span>
                <span class="font-mono font-semibold">-${formatCurrency(discount, curr, sym)}</span>
              </div>
            ` : ''}
            <div class="flex justify-between text-base font-black text-emerald-800 border-t border-emerald-200 pt-3 mt-2">
              <span>Amount Due:</span>
              <span class="font-mono">${formatCurrency(total, curr, sym)}</span>
            </div>
          </div>
        </div>

        <!-- Notes -->
        ${(s.notes || s.terms) ? `
          <div class="mt-8 pt-4 border-t border-slate-200 text-[10px] text-slate-500 space-y-2">
            ${s.notes ? `<div><span class="font-bold text-slate-700">Notes:</span> ${s.notes}</div>` : ''}
            ${s.terms ? `<div><span class="font-bold text-slate-700">Terms:</span> ${s.terms}</div>` : ''}
          </div>
        ` : ''}
      </div>
    `;
  }

  // -------------------------------------------------------------
  // PDF Export & Printing
  // -------------------------------------------------------------
  async exportPdf() {
    if (!this.previewWrapper) return;
    if (this.isGeneratingPdf) return;

    // Validation check
    if (!this.state.sender.name || !this.state.client.name) {
      this.showToast('Please provide both Business Name and Client Name.', 'warning');
      return;
    }
    if (!this.state.items || this.state.items.length === 0) {
      this.showToast('Please add at least one line item to the invoice.', 'warning');
      return;
    }

    this.isGeneratingPdf = true;
    this.showProcessingModal(true, 'Generating PDF invoice...');

    try {
      if (!window.html2canvas || !window.jspdf) {
        throw new Error('PDF conversion libraries are not ready.');
      }

      // Render invoice to high-resolution canvas (scale: 2 for crisp 300DPI-like print output)
      const canvas = await window.html2canvas(this.previewWrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const { jsPDF } = window.jspdf;

      // A4 dimensions in mm: 210 x 297
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const clientClean = (this.state.client.name || 'client').replace(/[^a-zA-Z0-9]/g, '_');
      const numClean = (this.state.details.invoiceNumber || 'INV').replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${numClean}_${clientClean}.pdf`;

      pdf.save(filename);
      this.showToast(`Downloaded "${filename}"!`, 'success');
    } catch (err) {
      console.error('PDF generation error:', err);
      this.showToast(`Failed to generate PDF: ${err.message}`, 'error');
    } finally {
      this.isGeneratingPdf = false;
      this.showProcessingModal(false);
    }
  }

  printInvoice() {
    window.print();
  }

  // -------------------------------------------------------------
  // Draft Persistence
  // -------------------------------------------------------------
  saveDraft() {
    try {
      localStorage.setItem('toolstacker_invoice_draft', JSON.stringify(this.state));
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  loadDraft() {
    try {
      const raw = localStorage.getItem('toolstacker_invoice_draft');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('LocalStorage load failed:', e);
    }
    return null;
  }

  startNewInvoice() {
    if (confirm('Start a new blank invoice? Any unsaved changes in current invoice will be cleared.')) {
      this.state = {
        template: this.state.template || 'modern',
        currency: 'USD',
        currencySymbol: '$',
        sender: {
          name: '',
          address: '',
          email: '',
          phone: '',
          logoUrl: '',
        },
        client: {
          name: '',
          address: '',
          email: '',
          phone: '',
        },
        details: {
          invoiceNumber: generateInvoiceNumber(),
          invoiceDate: getFormattedDate(),
          dueDate: getFormattedDate(addDaysToDate(new Date(), 14)),
          poNumber: '',
        },
        items: [
          {
            id: 'item_' + Date.now(),
            description: '',
            quantity: 1,
            rate: 0,
          },
        ],
        taxRate: 0,
        discountType: 'percent',
        discountValue: 0,
        notes: '',
        terms: '',
      };
      this.saveDraft();
      this.populateFormFromState();
      this.renderLineItemsTable();
      this.renderLivePreview();
      this.showToast('Started new invoice.', 'info');
    }
  }

  loadSampleData() {
    this.state = JSON.parse(JSON.stringify(DEFAULT_SAMPLE_INVOICE));
    this.state.details.invoiceNumber = generateInvoiceNumber();
    this.saveDraft();
    this.populateFormFromState();
    this.renderLineItemsTable();
    this.renderLivePreview();
    this.showToast('Loaded sample business invoice data.', 'info');
  }

  // -------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------
  showProcessingModal(show, text = 'Processing...') {
    if (!this.processingModal) return;
    this.processingModal.classList.toggle('hidden', !show);
    const label = document.getElementById('invoice-processing-text');
    if (label && text) label.textContent = text;
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
  window.invoiceGeneratorApp = new InvoiceGeneratorApp();
});
