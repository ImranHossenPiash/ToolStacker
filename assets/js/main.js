/**
 * ToolStacker Shared Utilities
 * Pure Client-Side • PWA Service Worker Registration • Theme Toggle
 */

// 1. Theme Management (System preference + manual toggle)
export function initTheme() {
  const storedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (storedTheme === 'dark' || (!storedTheme && systemPrefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  // Update theme toggle icons across all pages
  updateThemeIcons();

  // Listen to system changes if user hasn't explicitly set a preference
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('theme')) {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      updateThemeIcons();
    }
  });

  // Bind toggle buttons
  document.querySelectorAll('[data-theme-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark) {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
      updateThemeIcons();
    });
  });
}

export function updateThemeIcons() {
  const isDark = document.documentElement.classList.contains('dark');
  document.querySelectorAll('.theme-icon-sun').forEach(el => {
    el.classList.toggle('hidden', !isDark);
  });
  document.querySelectorAll('.theme-icon-moon').forEach(el => {
    el.classList.toggle('hidden', isDark);
  });
}

// 2. Service Worker & PWA Install Management
export function initPWA() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        // console.log('ServiceWorker registered:', reg.scope);
      }).catch((err) => {
        console.warn('ServiceWorker registration error:', err);
      });
    });
  }

  // In-App Install Prompt Handling
  let deferredPrompt = null;
  const installBtn = document.getElementById('pwa-install-btn');
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator).standalone === true;

  if (isStandalone && installBtn) {
    installBtn.classList.add('hidden');
    return;
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        // Detect iOS
        const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
        if (isIOS) {
          alert('To install on iOS: tap the Share button in Safari, then tap "Add to Home Screen".');
        }
        return;
      }
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        installBtn.classList.add('hidden');
      }
      deferredPrompt = null;
    });
  }

  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.classList.add('hidden');
  });
}

// 3. Dropdown Menu & Mobile Nav Handlers
export function initNav() {
  const menuBtn = document.getElementById('tools-menu-btn');
  const dropdown = document.getElementById('tools-dropdown-menu');

  if (menuBtn && dropdown) {
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !dropdown.classList.contains('invisible');
      if (isOpen) {
        dropdown.classList.add('invisible', 'opacity-0', '-translate-y-2', 'pointer-events-none');
        menuBtn.setAttribute('aria-expanded', 'false');
      } else {
        dropdown.classList.remove('invisible', 'opacity-0', '-translate-y-2', 'pointer-events-none');
        menuBtn.setAttribute('aria-expanded', 'true');
      }
    });

    document.addEventListener('click', (e) => {
      if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('invisible', 'opacity-0', '-translate-y-2', 'pointer-events-none');
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Mobile drawer
  const mobileBtn = document.getElementById('mobile-menu-btn');
  const mobileDrawer = document.getElementById('mobile-menu-drawer');
  const mobileClose = document.getElementById('mobile-menu-close');

  if (mobileBtn && mobileDrawer) {
    mobileBtn.addEventListener('click', () => {
      mobileDrawer.classList.remove('hidden');
      document.body.classList.add('overflow-hidden');
    });
  }

  if (mobileClose && mobileDrawer) {
    mobileClose.addEventListener('click', () => {
      mobileDrawer.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    });

    mobileDrawer.addEventListener('click', (e) => {
      if (e.target === mobileDrawer) {
        mobileDrawer.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
      }
    });
  }
}

// Auto init on DOM ready or immediate if already loaded
function initAll() {
  initTheme();
  initPWA();
  initNav();
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAll);
} else {
  initAll();
}
