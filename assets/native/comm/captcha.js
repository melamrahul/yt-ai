
/* ============================================================
   YT-Ai — Cloudflare Turnstile
   Path: /yt-ai/assets/native/comm/captcha.js
   ============================================================ */

(function () {
  'use strict';

  var TURNSTILE_SITE_KEY = '0x4AAAAAAGGfePks0FnUxoL3';

  var turnstileWidgetId = null;
  var turnstileToken = '';
  var isRendering = false;
  var widgetVisible = false;

  var container = null;
  var btn = null;
  var pasteBtn = null;
  var urlInput = null;
  var captchaLabel = null;

  /* ---- Expose token to min.js ---- */

  Object.defineProperty(window, '__turnstileToken', {
    get: function () {
      return turnstileToken;
    },
    configurable: false
  });

  /* ---- Theme ---- */

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'dark'
      : 'light';
  }

  /* ---- Button state ---- */

  function setBtnEnabled(enabled) {
    if (!btn) btn = document.getElementById('btn-go');
    if (!btn) return;

    btn.disabled = !enabled;
    btn.style.opacity = enabled ? '1' : '0.55';
    btn.style.cursor = enabled ? 'pointer' : 'not-allowed';

    btn.title = enabled
      ? ''
      : 'Please complete the human verification first';
  }

  /* ---- Show widget ---- */

  function showWidget() {
    if (!container) {
      container = document.getElementById('turnstile-container');
    }

    if (!captchaLabel) {
      captchaLabel = document.querySelector('.captcha-label');
    }

    if (!container) return;

    container.style.display = 'flex';

    if (captchaLabel) {
      captchaLabel.style.display = 'block';
    }

    widgetVisible = true;

    renderTurnstile();
  }

  /* ---- Hide widget ---- */

  function hideWidget() {
    if (!container) {
      container = document.getElementById('turnstile-container');
    }

    if (!captchaLabel) {
      captchaLabel = document.querySelector('.captcha-label');
    }

    if (!container) return;

    container.style.display = 'none';

    if (captchaLabel) {
      captchaLabel.style.display = 'none';
    }

    widgetVisible = false;
  }

  /* ---- Start conversion directly ---- */

  function startConversion() {
    if (typeof window.__startFlow !== 'function') {
      console.error('[captcha] startFlow is not available');
      return;
    }

    try {
      window.__startFlow();
    } catch (e) {
      console.error('[captcha] startFlow failed:', e);
    }
  }

  /* ---- Render Turnstile ---- */

  function renderTurnstile() {
    if (!window.turnstile) {
      setTimeout(renderTurnstile, 120);
      return;
    }

    if (!container) {
      container = document.getElementById('turnstile-container');
    }

    if (!container) {
      setTimeout(renderTurnstile, 200);
      return;
    }

    if (turnstileWidgetId !== null || isRendering) {
      return;
    }

    isRendering = true;

    try {
      turnstileWidgetId = window.turnstile.render(container, {

        sitekey: TURNSTILE_SITE_KEY,

        theme: getTheme(),

        callback: function (token) {

          console.log('[captcha] verification successful');

          turnstileToken = token;

          setBtnEnabled(true);

          /* Hide CAPTCHA immediately */
          hideWidget();

          /* Start conversion automatically */
          startConversion();
        },

        'expired-callback': function () {

          console.warn('[captcha] token expired');

          turnstileToken = '';

          setBtnEnabled(false);

          if (widgetVisible) {
            showWidget();
          }
        },

        'error-callback': function (err) {

          console.error('[captcha] error:', err);

          turnstileToken = '';

          setBtnEnabled(false);
        }

      });

    } catch (e) {

      turnstileWidgetId = null;

      console.error('[captcha] render failed:', e);

    } finally {

      isRendering = false;

    }
  }

  /* ---- Turnstile loaded ---- */

  window.onTurnstileLoaded = function () {
    console.log('[captcha] Turnstile API loaded');
  };

  /* ---- Theme change ---- */

  document.addEventListener('yt-ai:theme-change', function () {

    if (!window.turnstile) return;

    if (turnstileWidgetId !== null) {

      try {
        window.turnstile.remove(turnstileWidgetId);
      } catch (_) {}

      turnstileWidgetId = null;
    }

    turnstileToken = '';

    setBtnEnabled(false);

    if (widgetVisible) {
      renderTurnstile();
    }
  });

  /* ---- Reset Turnstile ---- */

  document.addEventListener('yt-ai:reset-turnstile', function () {

    console.log('[captcha] resetting');

    turnstileToken = '';

    setBtnEnabled(false);

    hideWidget();

    if (turnstileWidgetId !== null && window.turnstile) {

      try {
        window.turnstile.reset(turnstileWidgetId);
      } catch (e) {
        console.error('[captcha] reset failed:', e);
      }
    }
  });

  /* ---- Download click ---- */

  function onDownloadClick(e) {

    if (turnstileToken) {
      return;
    }

    e.preventDefault();
    e.stopImmediatePropagation();

    showWidget();
  }

  /* ---- Paste button ---- */

  function onPasteClick(e) {

    e.preventDefault();
    e.stopImmediatePropagation();

    if (!navigator.clipboard || !navigator.clipboard.readText) {
      if (urlInput) urlInput.focus();
      return;
    }

    navigator.clipboard.readText().then(function (txt) {

      if (!urlInput) {
        urlInput = document.getElementById('yt-url');
      }

      if (urlInput) {
        urlInput.value = txt;

        urlInput.dispatchEvent(
          new Event('input', { bubbles: true })
        );
      }

    }).catch(function () {

      if (urlInput) urlInput.focus();

    });
  }

  /* ---- Enter key ---- */

  function onEnterKey(e) {

    if (e.key !== 'Enter') return;

    if (turnstileToken) return;

    e.preventDefault();
    e.stopImmediatePropagation();

    showWidget();
  }

  /* ---- Fetch interceptor ---- */

  var originalFetch = window.fetch;

  window.fetch = function (input, init) {

    var url = typeof input === 'string'
      ? input
      : (input && input.url) || '';

    var isConversionRequest =
      url.indexOf('/x/a') !== -1;

    if (!isConversionRequest) {
      return originalFetch.call(this, input, init);
    }

    var updatedInit = init || {};

    if (
      updatedInit.method &&
      updatedInit.method.toUpperCase() === 'POST' &&
      updatedInit.body
    ) {

      try {

        var body = JSON.parse(updatedInit.body);

        body.turnstile_token = turnstileToken;

        updatedInit = Object.assign({}, updatedInit, {
          body: JSON.stringify(body)
        });

      } catch (e) {

        console.error('[captcha] token attachment failed:', e);

      }
    }

    return originalFetch.call(this, input, updatedInit)
      .then(function (response) {

        /*
         * Do not reset token here.
         * min.js may retry a 503 response.
         * Reset happens when Convert Another is clicked.
         */

        return response;

      });
  };

  /* ---- Boot ---- */

  function bind() {

    btn = document.getElementById('btn-go');

    pasteBtn = document.getElementById('paste-btn');

    urlInput = document.getElementById('yt-url');

    container = document.getElementById('turnstile-container');

    captchaLabel = document.querySelector('.captcha-label');

    if (!btn || !pasteBtn || !container) {
      setTimeout(bind, 100);
      return;
    }

    container.style.display = 'none';

    if (captchaLabel) {
      captchaLabel.style.display = 'none';
    }

    btn.addEventListener('click', onDownloadClick, true);

    pasteBtn.addEventListener('click', onPasteClick, true);

    if (urlInput) {
      urlInput.addEventListener('keydown', onEnterKey, true);
    }

    console.log('[captcha] initialized');

  }

  if (document.readyState === 'loading') {

    document.addEventListener('DOMContentLoaded', bind);

  } else {

    bind();

  }

})();
