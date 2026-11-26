/* ============================================================
   YT-Ai — Cloudflare Turnstile captcha integration
   Path: /yt-ai/assets/native/comm/captcha.js
   ============================================================ */
(function () {
  'use strict';

  var TURNSTILE_SITE_KEY = '0x4AAAAAAGGfePks0FnUxoL3';
  var turnstileWidgetId = null;
  var turnstileToken = '';
  var pendingAction = null;
  var isRendering = false;

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function setBtnEnabled(enabled) {
    var btn = document.getElementById('btn-go');
    if (!btn) return;
    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.55';
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    btn.title = enabled ? '' : 'Please complete the human verification first';
  }

  function flushPending() {
    if (!pendingAction) return;
    var fn = pendingAction;
    pendingAction = null;
    try { fn(); } catch (e) { console.error('[captcha] pending action failed:', e); }
  }

  function renderTurnstile() {
    if (!window.turnstile) { setTimeout(renderTurnstile, 100); return; }
    var el = document.getElementById('turnstile-container');
    if (!el) { setTimeout(renderTurnstile, 200); return; }
    if (turnstileWidgetId !== null || isRendering) return;

    isRendering = true;
    try {
      turnstileWidgetId = window.turnstile.render(el, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: currentTheme(),           // light or dark — matches page
        callback: function (token) {
          turnstileToken = token;
          setBtnEnabled(true);
          flushPending();
        },
        'expired-callback': function () {
          turnstileToken = '';
          setBtnEnabled(false);
        },
        'error-callback': function (err) {
          turnstileToken = '';
          setBtnEnabled(false);
          console.error('[captcha] Turnstile error:', err);
        }
      });
    } catch (e) {
      turnstileWidgetId = null;
      console.error('[captcha] render failed:', e);
    } finally {
      isRendering = false;
    }
  }

  window.onTurnstileLoaded = function () { renderTurnstile(); };

  /* Re-render when the page theme changes so the widget follows */
  document.addEventListener('yt-ai:theme-change', function () {
    if (turnstileWidgetId !== null && window.turnstile) {
      try { window.turnstile.remove(turnstileWidgetId); } catch (_) {}
      turnstileWidgetId = null;
      turnstileToken = '';
      setBtnEnabled(false);
      renderTurnstile();
    }
  });

  /* ---------- Fetch interceptor for /x/a — attach token, no 5s delay ---------- */
  var originalFetch = window.fetch;
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf('/x/a') === -1) return originalFetch.call(this, input, init);

    var self = this;
    var updatedInit = init ? Object.assign({}, init) : {};
    updatedInit.headers = Object.assign({}, updatedInit.headers || {});

    /* Attach token in header (works for most backends) */
    if (turnstileToken) {
      try {
        if (updatedInit.headers instanceof Headers) {
          updatedInit.headers.set('CF-Turnstile-Response', turnstileToken);
        } else {
          updatedInit.headers['CF-Turnstile-Response'] = turnstileToken;
        }
      } catch (_) {}
    }

    /* Also attach in JSON body (your current backend expects this) */
    if (updatedInit.body && typeof updatedInit.body === 'string') {
      try {
        var body = JSON.parse(updatedInit.body);
        body.turnstile_token = turnstileToken;
        updatedInit.body = JSON.stringify(body);
      } catch (e) {
        console.error('[captcha] could not attach token to body:', e);
      }
    }

    /* Fire immediately — no 5s delay — so the token is fresh */
    return originalFetch.call(self, input, updatedInit).then(function (response) {
      /* Clear + reset only AFTER backend responds so retries stay valid */
      setTimeout(function () {
        turnstileToken = '';
        setBtnEnabled(false);
        if (turnstileWidgetId !== null && window.turnstile) {
          try { window.turnstile.reset(turnstileWidgetId); } catch (_) {}
        }
      }, 100);
      return response;
    });
  };

  /* ---------- Interceptors ---------- */
  function interceptBtn() {
    var btn = document.getElementById('btn-go');
    if (!btn) { setTimeout(interceptBtn, 100); return; }
    btn.addEventListener('click', function (e) {
      if (turnstileToken) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      pendingAction = function () { btn.click(); };
    }, true);
  }

  function interceptPaste() {
    var p = document.getElementById('paste-btn');
    if (!p) { setTimeout(interceptPaste, 100); return; }
    p.addEventListener('click', function (e) {
      if (turnstileToken) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function (txt) {
            var input = document.getElementById('yt-url');
            if (input) {
              input.value = txt;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            pendingAction = function () { p.click(); };
          }).catch(function () {
            pendingAction = function () { p.click(); };
          });
        } else {
          pendingAction = function () { p.click(); };
        }
      } catch (e) {
        pendingAction = function () { p.click(); };
      }
    }, true);
  }

  function interceptEnter() {
    var input = document.getElementById('yt-url');
    if (!input) { setTimeout(interceptEnter, 100); return; }
    input.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || turnstileToken) return;
      e.stopImmediatePropagation();
      e.preventDefault();
      pendingAction = function () {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      };
    }, true);
  }

  function boot() {
    setBtnEnabled(false);
    renderTurnstile();
    interceptBtn();
    interceptPaste();
    interceptEnter();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();