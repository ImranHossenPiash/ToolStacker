/**
 * Shared JavaScript for Multi-Page Online Utility Tools Suite
 * Pure Client-Side Vanilla JS • No External AI APIs
 */

// Centralized Tools Registry
export const TOOLS_DATA = [
  {
    id: 'video-to-mp3',
    title: 'Video to MP3 Converter',
    shortDesc: 'Extract MP3 (up to 320kbps) or lossless WAV audio from video files with touch-friendly trimmer.',
    category: 'Utilities',
    categorySlug: 'utilities',
    icon: 'music',
    badge: 'New',
    url: '/tools/video-to-mp3.html',
    tags: ['video to mp3', 'video to audio', 'extract audio', 'mp4 to mp3', 'mkv to mp3', 'audio trimmer', 'wav', 'sound']
  },
  {
    id: 'image-to-text',
    title: 'Image-to-Text (OCR)',
    shortDesc: 'Extract plain and formatted text from photos, scans, and documents directly in browser.',
    category: 'Text & OCR',
    categorySlug: 'text',
    icon: 'scan-text',
    badge: 'Popular',
    url: '/tools/image-to-text.html',
    tags: ['ocr', 'tesseract', 'image', 'photo', 'scanner', 'extract', 'read']
  },
  {
    id: 'discount-calculator',
    title: 'Discount & Sale Calculator',
    shortDesc: 'Calculate final prices, savings, stacked coupons, and sales tax with live breakdown.',
    category: 'Calculators',
    categorySlug: 'calculators',
    icon: 'badge-percent',
    badge: 'Finance',
    url: '/tools/discount-calculator.html',
    tags: ['discount', 'sale', 'percentage', 'coupon', 'tax', 'shopping', 'price']
  },
  {
    id: 'word-counter',
    title: 'Word & Character Counter',
    shortDesc: 'Analyze text statistics, word count, character density, and estimated reading time in real-time.',
    category: 'Text & OCR',
    categorySlug: 'text',
    icon: 'file-text',
    badge: 'Writing',
    url: '/tools/word-counter.html',
    tags: ['words', 'characters', 'reading time', 'sentences', 'editor', 'count']
  },
  {
    id: 'qr-code-generator',
    title: 'QR Code Generator',
    shortDesc: 'Generate customizable, high-resolution QR codes for URLs, WiFi, and contacts with instant PNG download.',
    category: 'Utilities',
    categorySlug: 'utilities',
    icon: 'qr-code',
    badge: 'Free',
    url: '/tools/qr-code-generator.html',
    tags: ['qr', 'code', 'barcode', 'link', 'generator', 'download']
  },
  {
    id: 'json-formatter',
    title: 'JSON Formatter & Validator',
    shortDesc: 'Beautify, validate, format, and minify messy JSON data client-side with syntax highlighting.',
    category: 'Developer Tools',
    categorySlug: 'developer',
    icon: 'code-2',
    badge: 'Dev',
    url: '/tools/json-formatter.html',
    tags: ['json', 'format', 'minify', 'pretty', 'developer', 'parse']
  },
  {
    id: 'unit-converter',
    title: 'Universal Unit Converter',
    shortDesc: 'Convert metric and imperial units for length, weight, temperature, area, and digital data.',
    category: 'Calculators',
    categorySlug: 'calculators',
    icon: 'scale',
    badge: 'Essential',
    url: '/tools/unit-converter.html',
    tags: ['units', 'convert', 'metric', 'imperial', 'length', 'weight', 'temperature']
  },
  {
    id: 'age-calculator',
    title: 'Chronological Age Calculator',
    shortDesc: 'Calculate exact age in years, months, and days, next birthday countdown, and total life milestones.',
    category: 'Calculators',
    categorySlug: 'calculators',
    icon: 'calendar-heart',
    badge: 'Popular',
    url: '/tools/age-calculator.html',
    tags: ['age', 'birthday', 'calculator', 'date', 'leap year', 'chronological', 'countdown']
  },
  {
    id: 'image-compressor',
    title: 'Image Compressor',
    shortDesc: 'Compress JPEG, PNG, WebP, AVIF images online without losing quality. 100% client-side, free, and unlimited.',
    category: 'Image Tools',
    categorySlug: 'image-tools',
    icon: 'image-down',
    badge: 'New',
    url: '/tools/image-compressor.html',
    tags: ['image', 'compress', 'compressor', 'optimizer', 'jpeg', 'png', 'webp', 'avif', 'resize', 'batch']
  },
  {
    id: 'image-converter',
    title: 'Image Format Converter',
    shortDesc: 'Convert JPG, PNG, WebP, AVIF, HEIC, GIF, BMP, ICO and SVG in your browser. 100% client-side, free, and private.',
    category: 'Image Tools',
    categorySlug: 'image-tools',
    icon: 'refresh-cw',
    badge: 'New',
    url: '/tools/image-converter.html',
    tags: ['image', 'convert', 'converter', 'format', 'jpeg', 'jpg', 'png', 'webp', 'avif', 'heic', 'gif', 'bmp', 'ico', 'svg', 'batch']
  },
  {
    id: 'merge-pdf',
    title: 'Merge PDF',
    shortDesc: 'Combine multiple PDF files into one document instantly. 100% client-side, free, no signup, no watermark.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'files',
    badge: 'New',
    url: '/tools/merge-pdf.html',
    tags: ['pdf', 'merge', 'combine', 'join', 'document', 'png', 'jpg', 'docx', 'xlsx', 'reorder']
  },
  {
    id: 'split-pdf',
    title: 'Split PDF',
    shortDesc: 'Extract pages, split by range, or divide every N pages from a PDF document. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'scissors',
    badge: 'New',
    url: '/tools/split-pdf.html',
    tags: ['pdf', 'split', 'extract', 'pages', 'range', 'divide', 'separate', 'even', 'odd', 'cut']
  },
  {
    id: 'compress-pdf',
    title: 'Compress PDF',
    shortDesc: 'Reduce PDF file size by up to 90% while maintaining crisp quality. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'file-down',
    badge: 'New',
    url: '/tools/compress-pdf.html',
    tags: ['pdf', 'compress', 'compressor', 'shrink', 'reduce', 'optimize', 'size', 'downscale', 'email']
  },
  {
    id: 'pdf-image-converter',
    title: 'PDF ↔ Image Converter',
    shortDesc: 'Convert PDF to PNG/JPG/WebP or combine multiple photos into a crisp PDF. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'arrow-left-right',
    badge: 'New',
    url: '/tools/pdf-image-converter.html',
    tags: ['pdf', 'image', 'convert', 'png', 'jpg', 'jpeg', 'webp', 'dpi', 'extract', 'combine', 'batch']
  },
  {
    id: 'sign-pdf',
    title: 'Sign PDF',
    shortDesc: 'Draw, type, or upload your signature to sign PDF documents online. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'pen-tool',
    badge: 'New',
    url: '/tools/sign-pdf.html',
    tags: ['pdf', 'sign', 'signature', 'draw', 'type', 'autograph', 'fill', 'e-sign', 'legal', 'document']
  },
  {
    id: 'protect-unlock-pdf',
    title: 'Protect & Unlock PDF',
    shortDesc: 'Add AES-256 password protection or remove passwords from PDF documents. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'shield-check',
    badge: 'New',
    url: '/tools/protect-unlock-pdf.html',
    tags: ['pdf', 'protect', 'unlock', 'password', 'encrypt', 'decrypt', 'security', 'aes-256', 'permissions', 'restriction']
  },
  {
    id: 'watermark-pdf',
    title: 'Watermark PDF',
    shortDesc: 'Add custom text or image watermark stamps to your PDF documents with real-time live preview. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'stamp',
    badge: 'New',
    url: '/tools/watermark-pdf.html',
    tags: ['pdf', 'watermark', 'stamp', 'text', 'image', 'logo', 'copyright', 'confidential', 'draft', 'overlay', 'protect']
  },
  {
    id: 'rotate-pdf',
    title: 'Rotate PDF',
    shortDesc: 'Rotate PDF pages clockwise or counterclockwise with visual page thumbnails. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'rotate-cw',
    badge: 'New',
    url: '/tools/rotate-pdf.html',
    tags: ['pdf', 'rotate', 'orientation', 'turn', 'clockwise', 'counterclockwise', 'angle', 'flip', 'pages', 'landscape', 'portrait']
  },
  {
    id: 'crop-pdf',
    title: 'Crop PDF',
    shortDesc: 'Crop PDF pages to remove margins, trim borders, or extract visual areas with interactive box. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'crop',
    badge: 'New',
    url: '/tools/crop-pdf.html',
    tags: ['pdf', 'crop', 'trim', 'margin', 'cut', 'box', 'resize', 'border', 'clean', 'format']
  },
  {
    id: 'reorder-pdf',
    title: 'Remove & Reorder PDF Pages',
    shortDesc: 'Delete unwanted pages and rearrange PDF page order with visual drag-and-drop. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'arrow-down-up',
    badge: 'New',
    url: '/tools/reorder-pdf.html',
    tags: ['pdf', 'reorder', 'remove', 'delete', 'organize', 'arrange', 'sort', 'drag and drop', 'pages', 'reverse', 'extract']
  },
  {
    id: 'flatten-pdf',
    title: 'Flatten PDF',
    shortDesc: 'Flatten form fields and visual annotations to make them permanent and non-editable. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'stamp',
    badge: 'New',
    url: '/tools/flatten-pdf.html',
    tags: ['pdf', 'flatten', 'form', 'fields', 'annotations', 'permanent', 'lock', 'tamper-proof', 'comments', 'highlights', 'acroform']
  },
  {
    id: 'grayscale-pdf',
    title: 'Grayscale PDF',
    shortDesc: 'Convert color PDF documents to black and white grayscale to reduce file size and optimize printing. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'sun-dim',
    badge: 'New',
    url: '/tools/grayscale-pdf.html',
    tags: ['pdf', 'grayscale', 'black and white', 'monochrome', 'compress', 'reduce size', 'printer', 'ink', 'color to bw']
  },
  {
    id: 'page-numbers-pdf',
    title: 'Add Page Numbers',
    shortDesc: 'Insert customized page numbers into PDF documents with 9 preset positions, roman numerals, and range controls. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'hash',
    badge: 'New',
    url: '/tools/page-numbers-pdf.html',
    tags: ['pdf', 'page numbers', 'numbering', 'pagination', 'header', 'footer', 'roman', 'page count', 'bates']
  },
  {
    id: 'edit-pdf-metadata',
    title: 'Edit PDF Metadata',
    shortDesc: 'View, edit, or strip PDF properties (title, author, subject, keywords) to protect personal privacy. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'tags',
    badge: 'New',
    url: '/tools/edit-pdf-metadata.html',
    tags: ['pdf', 'metadata', 'properties', 'author', 'title', 'subject', 'keywords', 'privacy', 'strip metadata', 'remove metadata', 'clean pdf']
  },
  {
    id: 'stamp-pdf',
    title: 'Stamp PDF',
    shortDesc: 'Add digital rubber stamps (APPROVED, DRAFT, CONFIDENTIAL) or custom logos to PDF documents. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'stamp',
    badge: 'New',
    url: '/tools/stamp-pdf.html',
    tags: ['pdf', 'stamp', 'rubber stamp', 'approved', 'draft', 'confidential', 'watermark', 'badge', 'logo', 'embed stamp', 'document stamp']
  },
  {
    id: 'invoice-generator',
    title: 'Invoice Generator',
    shortDesc: 'Create professional PDF invoices with 5 customizable templates, auto-calculations, and instant printing. 100% free, private, and client-side.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'file-text',
    badge: 'New',
    url: '/tools/invoice-generator.html',
    tags: ['invoice', 'invoice generator', 'pdf invoice', 'billing', 'receipt', 'finance', 'business', 'estimate', 'quotes', 'accounting', 'client billing']
  },
  {
    id: 'image-to-pdf',
    title: 'Image to PDF Converter',
    shortDesc: 'Convert JPG, PNG, and WebP images into a single PDF document with custom page sizes, orientations, and margins. 100% client-side, free, and private.',
    category: 'PDF & Documents',
    categorySlug: 'pdf',
    icon: 'camera',
    badge: 'New',
    url: '/tools/image-to-pdf.html',
    tags: ['image to pdf', 'jpg to pdf', 'png to pdf', 'webp to pdf', 'photos to pdf', 'convert images', 'combine images', 'album', 'scan to pdf', 'multi-image']
  }
];

// 1. Theme Management (Dark/Light Mode)
export function initTheme() {
  const savedTheme = localStorage.getItem('toolstacker_theme') || localStorage.getItem('omni_theme');
  const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme ? savedTheme === 'dark' : systemPrefersDark;

  applyTheme(isDark);

  const themeToggleBtns = document.querySelectorAll('[data-theme-toggle]');
  themeToggleBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const currentIsDark = document.documentElement.classList.contains('dark');
      const newIsDark = !currentIsDark;
      applyTheme(newIsDark);
      localStorage.setItem('toolstacker_theme', newIsDark ? 'dark' : 'light');
    });
  });
}

function applyTheme(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeIcons(isDark);
}

function updateThemeIcons(isDark) {
  const sunIcons = document.querySelectorAll('.theme-icon-sun');
  const moonIcons = document.querySelectorAll('.theme-icon-moon');

  sunIcons.forEach(el => {
    if (isDark) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  moonIcons.forEach(el => {
    if (isDark) {
      el.classList.add('hidden');
    } else {
      el.classList.remove('hidden');
    }
  });
}

// 2. Header Dropdown & Mobile Navigation
export function initHeaderDropdown() {
  const toolsMenuBtn = document.getElementById('tools-menu-btn');
  const toolsDropdownMenu = document.getElementById('tools-dropdown-menu');

  if (toolsMenuBtn && toolsDropdownMenu) {
    let isOpen = false;

    function openDropdown() {
      isOpen = true;
      toolsDropdownMenu.classList.remove('opacity-0', 'invisible', '-translate-y-2', 'pointer-events-none');
      toolsDropdownMenu.classList.add('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
      toolsMenuBtn.setAttribute('aria-expanded', 'true');
      const chevron = toolsMenuBtn.querySelector('[data-chevron]');
      if (chevron) chevron.classList.add('rotate-180');
    }

    function closeDropdown() {
      isOpen = false;
      toolsDropdownMenu.classList.add('opacity-0', 'invisible', '-translate-y-2', 'pointer-events-none');
      toolsDropdownMenu.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
      toolsMenuBtn.setAttribute('aria-expanded', 'false');
      const chevron = toolsMenuBtn.querySelector('[data-chevron]');
      if (chevron) chevron.classList.remove('rotate-180');
    }

    toolsMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!toolsMenuBtn.contains(e.target) && !toolsDropdownMenu.contains(e.target)) {
        if (isOpen) closeDropdown();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) {
        closeDropdown();
        toolsMenuBtn.focus();
      }
    });
  }
}

export function initMobileNav() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenuDrawer = document.getElementById('mobile-menu-drawer');
  const mobileMenuClose = document.getElementById('mobile-menu-close');

  if (mobileMenuBtn && mobileMenuDrawer) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenuDrawer.classList.toggle('hidden');
    });
  }

  if (mobileMenuClose && mobileMenuDrawer) {
    mobileMenuClose.addEventListener('click', () => {
      mobileMenuDrawer.classList.add('hidden');
    });
  }
}

// 3. Homepage Tool Search & Category Filter
export function initToolGrid(tools = TOOLS_DATA) {
  const gridContainer = document.getElementById('tools-grid');
  const searchInput = document.getElementById('tool-search-input');
  const filterPills = document.querySelectorAll('[data-category-filter]');
  const countDisplay = document.getElementById('tools-count-display');
  const emptyState = document.getElementById('tools-empty-state');
  const resetSearchBtn = document.getElementById('reset-search-btn');

  if (!gridContainer) return;

  let currentCategory = 'all';
  let currentSearch = '';

  function renderCards(items) {
    gridContainer.innerHTML = '';

    if (items.length === 0) {
      if (emptyState) emptyState.classList.remove('hidden');
      if (countDisplay) countDisplay.textContent = '0 tools found';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (countDisplay) {
      countDisplay.textContent = `Showing ${items.length} of ${tools.length} tools`;
    }

    items.forEach(tool => {
      const card = document.createElement('article');
      card.className = 'group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-200';
      
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-105 transition-transform">
              <i data-lucide="${tool.icon}" class="w-6 h-6"></i>
            </div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-700">
              ${tool.badge || tool.category}
            </span>
          </div>

          <h3 class="text-lg font-bold text-neutral-900 dark:text-neutral-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors font-display mb-2">
            ${escapeHtml(tool.title)}
          </h3>

          <p class="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed line-clamp-2">
            ${escapeHtml(tool.shortDesc)}
          </p>
        </div>

        <div class="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <span class="text-xs font-medium text-neutral-500 dark:text-neutral-500">
            ${tool.category}
          </span>
          <a
            href="${tool.url}"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-neutral-900 dark:bg-neutral-100 dark:text-neutral-900 hover:bg-blue-600 dark:hover:bg-blue-500 dark:hover:text-white transition-colors"
          >
            <span>Try Tool</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </a>
        </div>
      `;

      gridContainer.appendChild(card);
    });

    // Refresh Lucide icons after rendering
    if (window.lucide && typeof window.lucide.createIcons === 'function') {
      window.lucide.createIcons();
    }
  }

  function filterTools() {
    const query = currentSearch.trim().toLowerCase();
    const filtered = tools.filter(tool => {
      const matchesCategory = currentCategory === 'all' || tool.categorySlug === currentCategory;
      const matchesSearch = !query || 
        tool.title.toLowerCase().includes(query) ||
        tool.shortDesc.toLowerCase().includes(query) ||
        tool.category.toLowerCase().includes(query) ||
        tool.tags.some(t => t.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    renderCards(filtered);
  }

  // Bind Search Input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      filterTools();
    });

    // Keyboard shortcut '/' to focus search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== searchInput && !['input', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
        e.preventDefault();
        searchInput.focus();
      }
    });
  }

  // Bind Category Pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => {
        p.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        p.classList.add('bg-white', 'dark:bg-neutral-900', 'text-neutral-700', 'dark:text-neutral-300', 'border-neutral-200', 'dark:border-neutral-800');
      });

      pill.classList.remove('bg-white', 'dark:bg-neutral-900', 'text-neutral-700', 'dark:text-neutral-300', 'border-neutral-200', 'dark:border-neutral-800');
      pill.classList.add('bg-blue-600', 'text-white', 'border-blue-600');

      currentCategory = pill.getAttribute('data-category-filter') || 'all';
      filterTools();
    });
  });

  // Reset button
  if (resetSearchBtn) {
    resetSearchBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      currentSearch = '';
      currentCategory = 'all';
      filterPills.forEach((p, idx) => {
        if (idx === 0) {
          p.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
        } else {
          p.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
        }
      });
      filterTools();
    });
  }

  // Initial render
  filterTools();
}

// 4. Utility Toast Notification
export function showToast(message, type = 'success') {
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.className = 'fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  const bgClass = type === 'success' 
    ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 border-neutral-700' 
    : 'bg-red-600 text-white border-red-700';

  toast.className = `px-4 py-2.5 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 pointer-events-auto ${bgClass}`;
  toast.innerHTML = `
    <span>${escapeHtml(message)}</span>
  `;

  toastContainer.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Auto remove
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// Helper: Escape HTML string safely
export function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// 5. Global Header Auth & Profile Widget
export async function initGlobalHeaderAuth() {
  try {
    const { auth } = await import('/js/firebase.js');
    const { onAuthStateChanged } = await import('firebase/auth');

    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (!themeToggle || !themeToggle.parentElement) return;

    const parent = themeToggle.parentElement;
    let authWidget = document.getElementById('global-header-auth-widget');
    if (!authWidget) {
      authWidget = document.createElement('div');
      authWidget.id = 'global-header-auth-widget';
      authWidget.className = 'flex items-center gap-1.5';
      parent.insertBefore(authWidget, themeToggle);
    }

    onAuthStateChanged(auth, (user) => {
      if (user) {
        const initial = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
        authWidget.innerHTML = `
          <a href="/profile.html" class="flex items-center gap-1.5 p-1 pl-1.5 pr-2.5 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 transition-colors group cursor-pointer" title="View Profile & Saved Works">
            ${user.photoURL 
              ? `<img src="${user.photoURL}" alt="${escapeHtml(user.displayName)}" class="w-6 h-6 rounded-full object-cover" />`
              : `<div class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">${initial}</div>`
            }
            <span class="text-xs font-bold text-neutral-800 dark:text-neutral-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate max-w-[100px] hidden sm:inline">
              ${escapeHtml(user.displayName ? user.displayName.split(' ')[0] : 'Profile')}
            </span>
          </a>
        `;
      } else {
        authWidget.innerHTML = `
          <a href="/profile.html" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-semibold transition-colors cursor-pointer" title="View Profile & Saved Works">
            <i data-lucide="user" class="w-3.5 h-3.5"></i>
            <span class="hidden sm:inline">Profile</span>
          </a>
        `;
      }
      if (window.lucide && typeof window.lucide.createIcons === 'function') {
        window.lucide.createIcons();
      }
    });
  } catch (err) {
    console.warn('Firebase header auth initialization skipped:', err);
  }
}

// Auto-run common setup on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initHeaderDropdown();
  initMobileNav();
  initGlobalHeaderAuth();
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
});
