/* ============================================================
   YT-Ai — Cloudflare Turnstile (lazy, auto-run after solve)
   Path: /yt-ai/assets/native/comm/captcha.js
   ============================================================ */
(function () {
  'use strict';

  var TURNSTILE_SITE_KEY = '0x4AAAAAAGGfePks0FnUxoL3';
  var turnstileWidgetId = null;
  var turnstileToken = '';
  var pendingAction = null;
  var isRendering = false;
  var widgetVisible = false;

  var container = null;
  var btn = null;
  var pasteBtn = null;
  var urlInput = null;
  var captchaLabel = null;

  Object.defineProperty(window, '__turnstileToken', {
    get: function () { return turnstileToken; },
    configurable: false
  });

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setBtnEnabled(enabled) {
    if (!btn) btn = document.getElementById('btn-go');
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.55';
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    btn.title = enabled ? '' : 'Please complete the human verification first';
  }

  function showWidget() {
    if (!container) container = document.getElementById('turnstile-container');
    if (!captchaLabel) captchaLabel = document.querySelector('.captcha-label');
    if (!container) return;
    container.style.display = 'flex';
    if (captchaLabel) captchaLabel.style.display = 'block';
    widgetVisible = true;
    renderTurnstile();
  }

  function hideWidget() {
    if (!container) container = document.getElementById('turnstile-container');
    if (!captchaLabel) captchaLabel = document.querySelector('.captcha-label');
    if (!container) return;
    container.style.display = 'none';
    if (captchaLabel) captchaLabel.style.display = 'none';
    widgetVisible = false;
  }

  function flushPending() {
    if (!pendingAction) return;
    var fn = pendingAction;
    pendingAction = null;
    try { fn(); } catch (e) { console.error('[captcha] pending:', e); }
  }

  function renderTurnstile() {
    if (!window.turnstile) { setTimeout(renderTurnstile, 120); return; }
    var el = document.getElementById('turnstile-container');
    if (!el) { setTimeout(renderTurnstile, 200); return; }
    if (turnstileWidgetId !== null || isRendering) return;

    isRendering = true;
    try {
      turnstileWidgetId = window.turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: getTheme(),
        callback: function (token) {
          turnstileToken = token;
          window.__turnstileToken = token;
          setBtnEnabled(true);
          // Auto-run the conversion immediately after solve
          flushPending();
        },
        'expired-callback': function () {
          turnstileToken = '';
          window.__turnstileToken = '';
          setBtnEnabled(false);
        },
        'error-callback': function (err) {
          turnstileToken = '';
          window.__turnstileToken = '';
          setBtnEnabled(false);
          console.error('[captcha] error:', err);
        }
      });
    } catch (e) {
      turnstileWidgetId = null;
      console.error('[captcha] render failed:', e);
    } finally {
      isRendering = false;
    }
  }

  window.onTurnstileLoaded = function () { /* lazy — no auto render */ };

  document.addEventListener('yt-ai:theme-change', function () {
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.remove(turnstileWidgetId); } catch (_) {}
      turnstileWidgetId = null;
      turnstileToken = '';
      window.__turnstileToken = '';
      setBtnEnabled(false);
      if (widgetVisible) renderTurnstile();
    }
  });

  document.addEventListener('yt-ai:reset-turnstile', function () {
    turnstileToken = '';
    window.__turnstileToken = '';
    setBtnEnabled(false);
    hideWidget();
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.reset(turnstileWidgetId); } catch (_) {}
    }
  });

  /* ---- First Download click → show captcha, remember action ---- */
  function onDownloadClick(e) {
    if (turnstileToken) return;              // token already present → let real handler run
    e.stopImmediatePropagation();
    e.preventDefault();
    showWidget();
    pendingAction = function () { btn.click(); };   // re-fire once token arrives
  }

  /* ---- Paste button — always works, no captcha required ---- */
  function onPasteClick(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function (txt) {
          if (!urlInput) urlInput = document.getElementById('yt-url');
          if (urlInput) {
            urlInput.value = txt;
            urlInput.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }).catch(function () {
          if (!urlInput) urlInput = document.getElementById('yt-url');
          if (urlInput) urlInput.focus();
        });
      } else {
        if (!urlInput) urlInput = document.getElementById('yt-url');
        if (urlInput) urlInput.focus();
      }
    } catch (_) {
      if (!urlInput) urlInput = document.getElementById('yt-url');
      if (urlInput) urlInput.focus();
    }
  }

  /* ---- Enter key → same as Download ---- */
  function onEnterKey(e) {
    if (e.key !== 'Enter') return;
    if (turnstileToken) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    showWidget();
    pendingAction = function () {
      if (!urlInput) urlInput = document.getElementById('yt-url');
      if (urlInput) {
        urlInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      }
    };
  }

  /* ---- Fetch interceptor (attaches token to /x/a POST) ---- */
  var originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('/x/a') === -1) return originalFetch.call(this, input, init);

    var self = this;
    return new Promise(function (resolve, reject) {
      setTimeout(function () {
        var updatedInit = init;
        if (updatedInit && updatedInit.method && updatedInit.method.toUpperCase() === 'POST' && updatedInit.body) {
          try {
            var body = JSON.parse(updatedInit.body);
            body.turnstile_token = turnstileToken;
            updatedInit = Object.assign({}, updatedInit, { body: JSON.stringify(body) });
          } catch (e) {
            console.error('[captcha] body attach failed:', e);
          }
        }
        originalFetch.call(self, input, updatedInit).then(function (response) {
          setTimeout(function () {
            turnstileToken = '';
            window.__turnstileToken = '';
            setBtnEnabled(false);
            if (turnstileWidgetId !== null && window.turnstile) {
              try { window.turnstile.reset(turnstileWidgetId); } catch (_) {}
            }
          }, 100);
          resolve(response);
        }).catch(reject);
      }, 5000);
    });
  };

  /* ---- Boot ---- */
  function bind() {
    btn = document.getElementById('btn-go');
    pasteBtn = document.getElementById('paste-btn');
    urlInput = document.getElementById('yt-url');
    container = document.getElementById('turnstile-container');
    captchaLabel = document.querySelector('.captcha-label');

    if (!btn) { setTimeout(bind, 100); return; }
    if (!pasteBtn) { setTimeout(bind, 100); return; }
    if (!container) { setTimeout(bind, 100); return; }

    // Hide captcha + label by default
    container.style.display = 'none';
    if (captchaLabel) captchaLabel.style.display = 'none';

    btn.addEventListener('click', onDownloadClick, true);
    pasteBtn.addEventListener('click', onPasteClick, true);
    urlInput && urlInput.addEventListener('keydown', onEnterKey, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();