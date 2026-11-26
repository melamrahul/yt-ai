/* ============================================================
   YT-Ai — UI Utilities (theme, language, custom dropdowns,
   custom dialogs, clipboard, install, etc.)
   Path: /yt-ai/assets/native/utils.js
   ============================================================ */
(function () {
  'use strict';

  /* ---------- DOM helpers ---------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- Theme ---------- */
  const Theme = {
    KEY: 'yt-ai-theme',
    init() {
      const saved = localStorage.getItem(this.KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const theme = saved || (prefersDark ? 'dark' : 'light');
      this.apply(theme);

      const btn = $('#themeToggle');
      if (btn) {
        this.updateIcon(btn, theme);
        btn.addEventListener('click', () => this.toggle());
      }
    },
    apply(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem(this.KEY, theme);
      const btn = $('#themeToggle');
      if (btn) this.updateIcon(btn, theme);
      document.dispatchEvent(new CustomEvent('yt-ai:theme-change', { detail: { theme } }));
    },
    toggle() {
      const cur = document.documentElement.getAttribute('data-theme');
      this.apply(cur === 'dark' ? 'light' : 'dark');
    },
    updateIcon(btn, theme) {
      const icon = btn.querySelector('i');
      if (!icon) return;
      icon.classList.toggle('fa-moon', theme !== 'dark');
      icon.classList.toggle('fa-sun', theme === 'dark');
    }
  };

  /* ---------- Language selector ---------- */
  const Language = {
    LANGS: { en: 'EN', es: 'ES', fr: 'FR', id: 'ID', de: 'DE' },
    init() {
      const btn = $('#langBtn');
      const dropdown = $('#langDropdown');
      const label = $('#langLabel');
      if (!btn || !dropdown || !label) return;

      const match = location.pathname.match(/\/yt-ai\/lang\/([a-z]{2})\//);
      const current = match ? match[1] : 'en';
      label.textContent = this.LANGS[current] || 'EN';

      $$('a', dropdown).forEach(a => {
        a.classList.toggle('active', a.dataset.lang === current);
      });

      btn.addEventListener('click', e => {
        e.stopPropagation();
        dropdown.classList.toggle('open');
      });

      document.addEventListener('click', e => {
        if (!dropdown.contains(e.target) && e.target !== btn) dropdown.classList.remove('open');
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') dropdown.classList.remove('open');
      });
    }
  };

  /* ---------- Custom dropdown (generic) ---------- */
  class CustomSelect {
    constructor(root, { onChange } = {}) {
      this.root = root;
      this.trigger = $('.select-trigger', root);
      this.menu = $('.select-menu', root);
      this.labelEl = $('.select-label', root) || this.trigger;
      this.options = $$('.option', root);
      this.onChange = onChange || (() => {});
      this.value = null;
      this._bind();
      // set initial from active option or first
      const active = this.options.find(o => o.classList.contains('active')) || this.options[0];
      if (active) this.select(active.dataset.value, active.textContent.trim(), false);
    }
    _bind() {
      this.trigger.addEventListener('click', e => {
        e.stopPropagation();
        document.querySelectorAll('.custom-select.open').forEach(el => { if (el !== this.root) el.classList.remove('open'); });
        this.root.classList.toggle('open');
      });
      this.options.forEach(opt => {
        opt.addEventListener('click', () => {
          this.select(opt.dataset.value, opt.textContent.trim(), true);
          this.root.classList.remove('open');
        });
      });
      document.addEventListener('click', e => {
        if (!this.root.contains(e.target)) this.root.classList.remove('open');
      });
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') this.root.classList.remove('open');
      });
    }
    select(value, text, fire) {
      this.value = value;
      if (this.labelEl) this.labelEl.textContent = text;
      this.options.forEach(o => o.classList.toggle('active', o.dataset.value === value));
      if (fire) this.onChange(value);
    }
    getValue() { return this.value; }
  }

  /* ---------- Custom Dialog ---------- */
  const Dialog = {
    _el: null,
    _resolve: null,
    _build() {
      if (this._el) return this._el;
      const backdrop = document.createElement('div');
      backdrop.className = 'dialog-backdrop';
      backdrop.innerHTML = `
        <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlgTitle">
          <div class="dialog-header" id="dlgTitle"></div>
          <div class="dialog-body" id="dlgBody"></div>
          <div class="dialog-actions" id="dlgActions"></div>
        </div>`;
      document.body.appendChild(backdrop);
      this._el = backdrop;
      return backdrop;
    },
    /**
     * Show dialog.
     * @param {Object} opts { title, body, buttons: [{text, type, value, autoClose}], dismissible }
     * @returns {Promise<string>} resolves with button value or null
     */
    show(opts) {
      const bd = this._build();
      $('#dlgTitle', bd).textContent = opts.title || '';
      $('#dlgBody', bd).innerHTML = opts.body || '';
      const actions = $('#dlgActions', bd);
      actions.innerHTML = '';

      const buttons = opts.buttons || [{ text: 'OK', type: 'primary', value: 'ok' }];
      buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.className = `dialog-btn ${b.type || 'secondary'}`;
        btn.type = 'button';
        btn.textContent = b.text;
        btn.addEventListener('click', () => {
          if (b.autoClose !== false) this.close(b.value);
          else if (b.onClick) b.onClick();
        });
        actions.appendChild(btn);
      });

      bd.classList.add('open');
      document.body.style.overflow = 'hidden';

      // backdrop click
      if (opts.dismissible !== false) {
        bd.addEventListener('click', e => {
          if (e.target === bd) this.close(null);
        }, { once: true });
      }

      return new Promise(res => { this._resolve = res; });
    },
    close(value) {
      if (!this._el) return;
      this._el.classList.remove('open');
      document.body.style.overflow = '';
      const r = this._resolve; this._resolve = null;
      if (r) r(value);
    },
    alert(msg, title = 'Notice') {
      return this.show({ title, body: msg, buttons: [{ text: 'OK', type: 'primary', value: 'ok' }] });
    },
    confirm(msg, title = 'Confirm') {
      return this.show({
        title, body: msg,
        buttons: [
          { text: 'Cancel', type: 'secondary', value: 'cancel' },
          { text: 'Continue', type: 'primary', value: 'ok' }
        ]
      });
    }
  };

  /* ---------- Clipboard paste helper ---------- */
  const Clipboard = {
    async read() {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API unavailable');
      }
      return navigator.clipboard.readText();
    },
    async pasteInto(inputEl) {
      if (!inputEl) return false;
      try {
        const text = await this.read();
        if (text) {
          inputEl.value = text.trim();
          inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          return true;
        }
        return false;
      } catch (err) {
        // Permission denied or unsupported
        const res = await Dialog.show({
          title: 'Clipboard Permission',
          body: `We need permission to read your clipboard.<br>Your browser will ask. Please click <strong>Allow</strong>.<br><br>
                 <small style="opacity:.7">If denied: open Site settings → Allow Clipboard → refresh.</small>`,
          buttons: [
            { text: 'Cancel', type: 'secondary', value: 'cancel' },
            { text: 'Continue', type: 'primary', value: 'ok' }
          ]
        });
        if (res === 'ok') {
          try {
            const text = await this.read();
            if (text) {
              inputEl.value = text.trim();
              inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            }
          } catch (_) {
            await Dialog.alert('Clipboard access is denied. Please paste manually using Ctrl+V / ⌘+V.');
          }
        }
        return false;
      }
    }
  };

  /* ---------- Install button (PWA) ---------- */
  const Install = {
    init() {
      const btn = $('#installBtn');
      if (!btn) return;
      let deferredPrompt = null;
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent) ||
                       (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

      if (isStandalone) { btn.style.display = 'none'; return; }

      // icon hint
      const icon = btn.querySelector('.material-symbols-outlined, i');
      if (icon && !isIOS) icon.textContent = '';

      window.addEventListener('beforeinstallprompt', e => {
        e.preventDefault();
        deferredPrompt = e;
        btn.style.display = 'inline-flex';
      });

      if (isIOS) btn.style.display = 'inline-flex';

      btn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          await deferredPrompt.userChoice;
          deferredPrompt = null;
          btn.style.display = 'none';
        } else if (isIOS) {
          await Dialog.alert('To install: tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.', 'Install YT-Ai');
        }
      });

      window.addEventListener('appinstalled', () => {
        deferredPrompt = null;
        btn.style.display = 'none';
      });
    }
  };

  /* ---------- Global loader ---------- */
  const Loader = {
    show() { const el = $('#globalLoader'); if (el) el.classList.add('active'); },
    hide() { const el = $('#globalLoader'); if (el) el.classList.remove('active'); }
  };

  /* ---------- Boot ---------- */
  function boot() {
    Theme.init();
    Language.init();
    Install.init();

    // Expose globally for min.js
    window.YTAi = {
      Dialog, CustomSelect, Clipboard, Loader, Theme, Language,
      $, $$,
      getQualitySelect: () => window.__qualitySelect || null
    };

    // Init any declarative custom selects
    $$('[data-custom-select]').forEach(el => {
      const id = el.id;
      const inst = new CustomSelect(el, {
        onChange: v => {
          if (id === 'audioQuality') {
            const hidden = document.getElementById('qualityValue');
            if (hidden) hidden.value = v;
          }
        }
      });
      if (id === 'audioQuality') window.__qualitySelect = inst;
    });

    // Paste button
    const pasteBtn = $('#pasteBtn');
    const urlInput = $('#youtubeUrl');
    if (pasteBtn && urlInput) {
      pasteBtn.addEventListener('click', async () => {
        await Clipboard.pasteInto(urlInput);
        urlInput.focus();
      });
    }

    // Theme toggle fallback (in case utils loaded after DOM)
    if (!window.__themeReady) window.__themeReady = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();