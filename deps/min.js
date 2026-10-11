// min.js  -> upload to /yt-ai/deps/min.js
'use strict';

(function () {
  // ---- Backend origin (your ruvs.in server). Relative /api/* paths are resolved against this. ----
  const SITE = 'https://www.ruvs.in';
  const abs = (u) => (/^https?:/i.test(u) ? u : SITE + u);

  const _d = (arr) => arr.map((c) => String.fromCharCode(c)).join('');

  const BASE = _d([104, 116, 116, 112, 115, 58, 47, 47, 114, 97, 104, 117, 108, 46, 115, 101, 114, 118, 48, 48, 46, 110, 101, 116]);
  const EP = SITE + _d([47, 95, 112, 53, 118, 55, 99, 47, 95, 111, 55, 115, 114]);
  const FB = BASE + _d([47, 95, 107, 53, 52, 118, 47, 95, 110, 118, 52, 51, 101]);
  const FB3 = SITE + _d([47, 95, 118, 57, 52, 98, 47, 95, 99, 55, 51, 100]);
  const V34Y = SITE + _d([47, 95, 98, 51, 118, 101, 47, 95, 118, 56, 53, 99]);
  const TB = BASE + _d([47, 95, 104, 55, 51, 118]);
  const TBR = TB + _d([47, 114, 55, 113]);
  const TBK = TB + _d([47, 95, 107, 51, 122]);
  const S2B = _d([104, 116, 116, 112, 115, 58, 47, 47, 114, 97, 104, 117, 108, 46, 115, 101, 114, 118, 48, 48, 46, 110, 101, 116]);
  const S2E = _d([47, 95, 104, 55, 51, 118, 47, 95, 110, 57, 48, 53, 99]);
  const S2 = S2B + S2E;

  const WS_MP3 = _d([119, 115, 115, 58, 47, 47, 97, 109, 112, 51, 46, 99, 99, 47, 119, 115]);
  const WS_MP4 = _d([119, 115, 115, 58, 47, 47, 97, 109, 112, 52, 46, 99, 99, 47, 119, 115]);
  const vuw = _d([97, 109, 112, 52, 46, 99, 99]);
  const S2q = _d([63, 117, 114, 108, 61]);
  const S2InitBase = _d([104, 116, 116, 112, 115, 58, 47, 47, 97, 46, 121, 109, 99, 100, 110, 46, 111, 114, 103, 47, 97, 112, 105, 47, 118, 49, 47, 105, 110, 105, 116, 63, 112, 61, 121, 38, 50, 51, 61, 49, 108, 108, 117, 109, 49, 110, 52, 55, 49, 38, 95, 61]);

  const _vChain = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '240p', '144p'];
  const _fallbackMsgs = [
    '☕ Take a small break.', '🎵 Music makes everything better.', '💭 Every song has a story.',
    '✨ Small project, big dreams.', '🌱 Good things take time.', '🚀 Built with coffee and code.',
    '🫶 Thanks for being here.', '🌎 Somewhere, someone loves this song too.', '💡 Simple is powerful.',
    '🎧 Good music is never wasted.', '⭐ Thanks for supporting this project.', '☀️ Hope your day is going well.',
    '🌙 Late-night downloads hit different.', '🎶 Turn the volume up.', '📖 Every creator starts somewhere.',
    '💗 You keep this project alive.', '🤝 Thanks for your patience.', '🌊 Go with the flow.', '🔥 Keep building.', '🎉 You are awesome.'
  ];

  const _st = { aborted: false, title: '', mode: 'mp3', quality: '192k', youtubeId: null, flowTimer: null };
  let _lastMsg = '';

  const $ = (id) => document.getElementById(id);

  const els = {
    rahulContainer: $('rahul-container'),
    userKnown: $('user-known'),
    urlInput: $('yt-url'),
    btnGo: $('btn-go'),
    statusBox: $('status-box'),
    statusLabel: $('status-label'),
    infinityLoader: $('infinity-loader'),
    downloadBtn: $('download-btn'),
    preview: $('video-preview'),
    thumb: $('video-thumb'),
    title: $('video-title'),
    channel: $('video-channel'),
    mainCard: $('main-card'),
    successView: $('success-view'),
  };

  // Bail out quietly if the converter markup isn't on this page.
  if (!els.urlInput || !els.btnGo || !els.mainCard) return;

  const cdBackdrop = $('clipboardBackdrop');
  const cdDialog = $('clipboardDialog');
  const cdMessage = $('cd-message');
  const cdHelp = $('cd-help');

  const _sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function _extractId(s) {
    const m = s.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function _detectOS() {
    const p = (navigator.platform || '').toLowerCase();
    const ua = navigator.userAgent.toLowerCase();
    if (p.includes('win') || ua.includes('windows')) return 'windows';
    if (/android/i.test(ua)) return 'android';
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
    if (p.includes('mac') || ua.includes('mac os')) return 'mac';
    return 'linux';
  }

  function _detectService(url) {
    const map = {
      youtube: /(youtube\.com|youtu\.be)/, soundcloud: /soundcloud\.com/, tiktok: /tiktok\.com/,
      reddit: /reddit\.com|redd\.it/, instagram: /instagram\.com/, facebook: /facebook\.com|fb\.com/,
      twitch: /twitch\.tv/, x: /(twitter\.com|x\.com)/,
    };
    for (const svc in map) {
      if (map[svc].test(url)) return svc;
    }
    return null;
  }

  // FIXED: previously 192/256/320 kbps all returned the same value.
  // Assumption: 4 is the provider's top tier. Test a 320k download to confirm.
  function _audioQualityVal(q) {
    const n = parseInt(String(q || '').replace(/\D/g, ''), 10);
    if (!n) return 4;
    if (n <= 64) return 2;
    if (n <= 128) return 3;
    return 4;
  }

  function _videoQualityVal(q) {
    if (!q) return 720;
    const n = parseInt(String(q).replace(/[^0-9]/g, ''), 10);
    return isNaN(n) ? 720 : n;
  }

  function _resolveVideoQuality(preferred, available) {
    if (!available || !available.length) return preferred;
    const norm = (q) => String(q).toLowerCase().replace(/\s/g, '');
    const avail = available.map(norm);
    const pref = norm(preferred);

    if (avail.indexOf(pref) !== -1) return preferred;

    const pi = _vChain.indexOf(preferred);
    if (pi === -1) return available[0];

    for (let d = pi + 1; d < _vChain.length; d++) {
      if (avail.indexOf(norm(_vChain[d])) !== -1) return _vChain[d];
    }
    for (let u = pi - 1; u >= 0; u--) {
      if (avail.indexOf(norm(_vChain[u])) !== -1) return _vChain[u];
    }
    return available[0];
  }

  function _makeFilename(title, ext) {
    if (!title) return ext === 'mp4' ? '[yt-ai] - video.mp4' : '[yt-ai] - audio.' + ext;
    return '[yt-ai] - ' + title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) + '.' + ext;
  }

  function _short(text, max = 70) {
    text = String(text || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? text.slice(0, max - 3) + '...' : text;
  }

  function _randomFallback() {
    let msg;
    do {
      msg = _fallbackMsgs[Math.floor(Math.random() * _fallbackMsgs.length)];
    } while (_fallbackMsgs.length > 1 && msg === _lastMsg);
    _lastMsg = msg;
    return msg;
  }

  async function _fetchJson(url, opts, timeout = 3000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      const res = await fetch(url, { ...(opts || {}), signal: controller.signal });
      if (!res.ok) throw new Error();
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  async function _sha256hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  async function _sign(bodyString, endpoint) {
    const juiceEp = endpoint === 'fallback' ? (FB + '?action=juice') : (EP + '?action=juice');
    const r = await fetch(juiceEp);
    if (!r.ok) throw new Error('Servers are busy. Please wait a moment and try again.');
    const j = await r.json();
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(j.juice), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const buf = await crypto.subtle.sign('HMAC', key, enc.encode(bodyString));
    const sig = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    return { timestamp: j.timestamp, nonce: j.nonce, sig: sig };
  }

  async function _signedPost(url, payload, endpoint) {
    const body = JSON.stringify(payload);
    const signed = await _sign(body, endpoint || 'primary');
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Timestamp': String(signed.timestamp),
        'X-Request-Nonce': signed.nonce,
        'X-Request-Sig': signed.sig,
      },
      body: body,
    });
  }

  async function _solvePow(cap) {
    const startTime = Date.now();
    const maxnumber = cap.maxNumber || cap.maxnumber || 200000;

    for (let n = 0; n <= maxnumber; n++) {
      if (n % 5000 === 0) await _sleep(0);
      const hash = await _sha256hex(cap.salt + n);
      if (hash === cap.challenge) {
        return { number: n, took: Date.now() - startTime };
      }
    }
    throw new Error('Captcha unsolvable. Max: ' + maxnumber);
  }

  function _buildAltcha(cap, sol) {
    return btoa(JSON.stringify({
      algorithm: cap.algorithm, challenge: cap.challenge,
      number: sol.number, salt: cap.salt,
      signature: cap.signature, took: sol.took || 0,
    }));
  }

  function collectBrowserFingerprint() {
    const fp = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: Array.from(navigator.languages || [navigator.language]),
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      deviceMemory: navigator.deviceMemory || 8,
      screenWidth: screen.width,
      screenHeight: screen.height,
      screenColorDepth: screen.colorDepth,
      screenPixelRatio: window.devicePixelRatio || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      webglVendor: '',
      webglRenderer: '',
      canvasHash: ''
    };

    try {
      const canvasGl = document.createElement('canvas');
      const gl = canvasGl.getContext('webgl') || canvasGl.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          fp.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          fp.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        }
      }
    } catch (e) { }

    try {
      const canvas2d = document.createElement('canvas');
      canvas2d.width = 200;
      canvas2d.height = 50;
      const ctx = canvas2d.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Bot Check 🎵', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Bot Check 🎵', 4, 17);
      fp.canvasHash = canvas2d.toDataURL().slice(-100);
    } catch (e) { }

    return fp;
  }

  async function _ytApiPost(mode, body, extraHeaders) {
    const headers = Object.assign({ 'Content-Type': 'application/json', 'X-Mode': mode }, extraHeaders || {});
    const r = await fetch(V34Y, { method: 'POST', headers: headers, body: JSON.stringify(body) });
    if (!r.ok) throw new Error('yt-proxy POST failed (' + r.status + ')');
    return r.json();
  }

  async function _ytApiGet(mode, extraHeaders) {
    const headers = Object.assign({ 'X-Mode': mode }, extraHeaders || {});
    const r = await fetch(V34Y, { method: 'GET', headers: headers });
    if (!r.ok) throw new Error('yt-proxy GET failed (' + r.status + ')');
    return r.json();
  }

  async function _ampApiGet(action) {
    const r = await fetch(EP + '?action=' + action);
    if (!r.ok) throw new Error(action + ' failed (' + r.status + ')');
    return r.json();
  }

  async function _ampApiPost(action, data) {
    const fd = new FormData();
    for (const k in data) {
      if (data[k] !== '' && data[k] !== null) fd.append(k, data[k]);
    }
    const r = await fetch(EP + '?action=' + action, {
      method: 'POST',
      body: fd,
      headers: { 'Accept': 'application/json' }
    });
    if (!r.ok) throw new Error(action + ' failed (' + r.status + ')');
    return r.json();
  }

  function _buildAmpDlUrl(jid, file, worker) {
    const enc = encodeURIComponent(file);
    const domain = worker ? (worker + '.ampx.cc') : 'ampx.cc';
    return 'https://' + domain + '/dl/' + jid + '/' + enc;
  }

  async function _ytApiMp3(videoId) {
    const init = await _ytApiPost('init-mp3', { videoId: videoId, format: 'mp3' }, { 'X-Mode': 'init-mp3', 'X-Vid': videoId });
    if (!init.eoy) throw new Error(init.error || 'yt-api: no eoy for mp3');

    const api = await _ytApiPost('mp3-api', {}, { 'X-Mode': 'mp3-api', 'X-eoy': init.eoy });
    if (api.downloadUrl) return api.downloadUrl;

    if (api.status === 'processing') {
      const hash = api.hash;
      _setStatus('Converting…', true);
      for (let i = 0; i < 40; i++) {
        await _sleep(5000);
        const st = await _ytApiPost('mp3-status', { hash: hash }, { 'X-Mode': 'mp3-status', 'X-eoy': init.eoy });
        if (st.downloadUrl) return st.downloadUrl;
        _setStatus('Converting… ' + (st.progress != null ? st.progress + '%' : ''), true);
      }
      throw new Error('yt-api mp3: unexpected response');
    }
    throw new Error('yt-api mp3: unexpected response');
  }

  async function _ytApiMp4(videoId) {
    const init = await _ytApiPost('init-mp4', {}, { 'X-Mode': 'init-mp4', 'X-Vid': videoId });
    if (!init.eoy) throw new Error(init.error || 'yt-api: no eoy for mp4');

    const ajax = await _ytApiGet('mp4-ajax', { 'X-Mode': 'mp4-ajax', 'X-eoy': init.eoy, 'X-Vid': videoId });
    if (!ajax.success) throw new Error('yt-api mp4: ajax failed');

    _setStatus('Converting…', true);
    for (let i = 0; i < 40; i++) {
      await _sleep(5000);
      const prog = await _ytApiGet('mp4-progress', { 'X-Mode': 'mp4-progress', 'X-eoy': init.eoy, 'X-Job': ajax.id });
      if (prog.success == 1 && prog.download_url) return prog.download_url;
      if (prog.status === 'fail') throw new Error(prog.message || 'yt-api mp4: failed');
      _setStatus('Converting… ' + Math.round((prog.progress || 0) / 10) + '%', true);
    }
    throw new Error('yt-api mp4: timed out');
  }

  async function _ytApiFallbackDownload(videoId, fmt, title) {
    _setStatus('Converting…', true);
    const dlUrl = fmt === 'mp4' ? await _ytApiMp4(videoId) : await _ytApiMp3(videoId);
    const fname = _makeFilename(title || _st.title, fmt);
    _doDownload(dlUrl, fname);
  }

  const _TB_POLL_INTERVAL = 4000;
  const _TB_POLL_MAX = 30;

  async function _pollR7q(youtubeId, quality, formatValue, title, fmt) {
    for (let i = 0; i < _TB_POLL_MAX; i++) {
      if (_st.aborted) return;
      await _sleep(_TB_POLL_INTERVAL);
      if (_st.aborted) return;
      try {
        const res = await fetch(TBR, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ youtube_id: youtubeId, quality, formatValue, title, action: 'check_only' }),
        });
        const data = await res.json();
        if (data.success && data.status === 'ready' && data.download_link) {
          _doDownloadR7q(data.download_link, fmt, data.title || title);
          return;
        }
      } catch (e) { }
    }
    throw new Error('Conversion timed out — please try again.');
  }

  function _doDownloadR7q(downloadLink, fmt, title) {
    const fname = _makeFilename(title || _st.title, fmt);
    const href = TBK + '?url=' + encodeURIComponent(downloadLink) + '&format=' + encodeURIComponent(fmt) + '&title=' + encodeURIComponent(title || _st.title || '');
    _doDownload(href, fname);
  }

  async function _thirdFallbackDownload(youtubeId, rawUrl, fmt, audioQuality, videoQuality, title) {
    _setStatus('Converting…', true);
    const formatValue = fmt === 'mp4' ? 0 : 1;
    const quality = fmt === 'mp4' ? _videoQualityVal(videoQuality) : _audioQualityVal(audioQuality);

    try {
      const dbRes = await fetch(TBR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_id: youtubeId, quality, formatValue, title, action: 'check_only' }),
      });
      if (dbRes.ok) {
        const dbData = await dbRes.json();
        if (dbData.success && dbData.status === 'ready' && dbData.download_link) {
          _doDownloadR7q(dbData.download_link, fmt, dbData.title || title);
          return;
        }
      }
    } catch (e) { }

    _setStatus('Converting…', true);
    const res = await fetch(TBR, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ youtube_id: youtubeId, url: rawUrl, quality, formatValue, title, action: 'auto' }),
    });
    if (!res.ok) throw new Error('Server error ' + res.status);
    const data = await res.json();

    if (data.success && data.status === 'ready' && data.download_link) {
      _doDownloadR7q(data.download_link, fmt, data.title || title);
      return;
    }
    if (data.status === 'converting') {
      _setStatus('Still converting…', true);
      await _pollR7q(youtubeId, quality, formatValue, title, fmt);
      return;
    }
    throw new Error(data.message || data.error || 'Unexpected response from backup server.');
  }

  async function S2Download(rawUrl, videoId, fmt, quality, title) {
    _setStatus('Converting…', true);
    const initUrl = S2InitBase + Math.random();

    const initRes = await fetch(S2 + S2q + encodeURIComponent(initUrl));
    if (!initRes.ok) throw new Error('s2 init failed');
    const initData = await initRes.json();
    if (initData.error !== 0) throw new Error('s2 init error');

    const convBaseUrl = initData.convertURL + '&v=' + videoId + '&f=' + fmt + '&_=' + Math.random();
    const convRes = await fetch(S2 + S2q + encodeURIComponent(convBaseUrl));
    if (!convRes.ok) throw new Error('s2 convert failed');
    const convData = await convRes.json();
    if (convData.error !== 0) throw new Error('s2 convert error');

    _setStatus('Converting…', true);
    for (let i = 0; i < 40; i++) {
      await _sleep(2500);
      const progRes = await fetch(S2 + S2q + encodeURIComponent(convData.progressURL + '&_=' + Math.random()));
      if (!progRes.ok) continue;
      const progData = await progRes.json();
      _setStatus('Converting…', true);
      if (progData.progress >= 3) break;
    }

    const fname = _makeFilename(convData.title || title || _st.title, fmt);
    _doDownload(S2 + S2q + encodeURIComponent(convData.downloadURL) + '&dl=1&fname=' + encodeURIComponent(fname), fname);
  }

  async function _ampDownload(rawUrl, youtubeId, fmt, quality, title) {
    _setStatus("Verifying you're not a bot…", true);
    const cap = await _ampApiGet('captcha');
    const sol = await _solvePow(cap);

    _setStatus('Getting Information…', true);
    const tokenData = await _ampApiGet('token&format=' + fmt);
    if (!tokenData.token) throw new Error('Could not retrieve CSRF token');

    _setStatus('Completing…', true);
    const service = _detectService(rawUrl) || 'youtube';
    const isVideo = fmt === 'mp4';
    const ampQuality = isVideo ? quality : (quality || '192k').replace(/[^0-9]/g, '') + 'k';

    const conv = await _ampApiPost('convert', {
      url: rawUrl, format: fmt, quality: ampQuality,
      playlist: 'false', service: service,
      altcha: _buildAltcha(cap, sol), _token: tokenData.token,
    });

    if (!conv.ok) {
      const errMap = {
        'Invalid URL': 'Invalid URL',
        'Captcha failed': 'Captcha rejected — try again',
        'No suitable candidate found': 'Queue full — try later',
      };
      throw new Error(errMap[conv.message] || conv.message || 'Conversion rejected');
    }

    const jid = conv.data.token;
    const wsToken = conv.data.ws_token;
    _setStatus('Converting…', true);

    await new Promise(function (resolve, reject) {
      const ws = new WebSocket(WS_MP3, 'json');
      let settled = false;
      let botCheckAttempts = 0;
      const timer = setTimeout(() => finish(new Error('Timed out waiting for conversion')), 90000);

      function finish(err) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        ws.onclose = null;
        ws.onerror = null;
        try { ws.close(); } catch (e) { }
        err ? reject(err) : resolve();
      }

      ws.onopen = () => ws.send(JSON.stringify({ jid, token: wsToken }));
      ws.onerror = () => finish(new Error('WebSocket connection error'));
      ws.onclose = (e) => { if (!e.wasClean) finish(new Error('WebSocket closed unexpectedly')); };

      ws.onmessage = function (e) {
        let msg;
        try { msg = JSON.parse(e.data); } catch (err) { return; }

        if (msg.class === 'bot_check' && msg.event === 'error') {
          botCheckAttempts++;
          if (botCheckAttempts > 3) {
            finish(new Error('Bot check failed after multiple attempts'));
            return;
          }
          _setStatus('Verifying browser...', true);
          ws.send(JSON.stringify({ event: 'bot_check_response', fingerprint: collectBrowserFingerprint(), jid, token: wsToken }));
          return;
        }

        if (msg.class === 'bot_check' && msg.success === true) {
          _setStatus('Converting…', true);
          return;
        }

        if (!msg.event) return;

        switch (msg.event) {
          case 'queue':
            _setStatus(msg.title ? msg.title : 'Processing…', true);
            break;
          case 'download':
            _setStatus('Downloading… ' + Math.round(msg.progress || 0) + '%', true);
            break;
          case 'file':
            if (msg.done) {
              const dlUrl = _buildAmpDlUrl(jid, msg.file, msg.worker || '');
              _doDownload(dlUrl, _makeFilename(msg.title || title || _st.title, fmt));
              finish(null);
            } else {
              _setStatus('Processing next item…', true);
            }
            break;
          case 'error': {
            console.error('Conversion error:', msg);
            const ampErrMap = {
              'Video unavailable. The uploader has not made this video available in your country': 'Video unavailable in this region',
              'failed to run job': 'Conversion failed',
              'max duration exceeded': 'Video too long',
              'URL not found': 'Video may be private, deleted, or region-locked',
              'bot check required': 'Bot detection failed - please refresh and try again',
            };
            const friendly = ampErrMap[msg.message] || msg.message || 'Conversion error';
            if (msg.done !== false) finish(new Error(friendly));
            else _setStatus(friendly, true);
            break;
          }
        }
      };
    });
  }

  const _PMIN = 2000, _PMAX = 5000, _PSTEP = 500, _PMAX_ATT = 35;

  async function _pollFallback(statusUrl, fname) {
    clearTimeout(_st.flowTimer);
    for (let i = 1; i <= _PMAX_ATT; i++) {
      if (_st.aborted) return;
      try {
        const res = await fetch(FB + '?status=' + encodeURIComponent(statusUrl));
        const data = await res.json();
        if (typeof data.progress !== 'undefined') _setStatus('Converting… ' + Math.round(data.progress) + '%', true);
        if (data.error) { _setStatus('Try again: ' + data.error, false); _enableBtn(); return; }
        if (data.status === 'completed' || data.status === 'done') {
          const raw2 = data.url || data.downloadUrl || data.link || data.download;
          const hash = data.id || data.hash;
          const base = (statusUrl || '').match(/^(https:\/\/[^/]+)/)?.[1] || '';
          const absUrl = raw2 ? (raw2.startsWith('http') ? raw2 : base + raw2) : (hash ? base + '/api/proxy/' + hash : null);
          if (absUrl) _doDownload(FB + '?dl=' + encodeURIComponent(absUrl) + '&filename=' + encodeURIComponent(data.filename || fname), data.filename || fname);
          return;
        }
      } catch (e) { }
      await _sleep(Math.min(_PMIN + (i - 1) * _PSTEP, _PMAX));
    }
    _setStatus('Timed out. Please try again.', false);
    _enableBtn();
  }

  async function _fallbackDownload(raw, fmt, quality, title) {
    _setStatus('Converting…', true);
    const audioBitrate = fmt === 'mp4' ? '128k' : ((quality || '128').match(/^(\d+)/) || ['', '128'])[1] + 'k';
    const payload = {
      url: raw, os: _detectOS(),
      audio: { bitrate: audioBitrate },
      output: { type: fmt === 'mp3' ? 'audio' : 'video', format: fmt === 'mp3' ? 'mp3' : 'mp4', quality },
    };

    const res = await _signedPost(FB, payload, 'fallback');
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || res.status);

    const fname = _makeFilename(data.title || title || 'download', fmt);
    if (data.statusUrl) {
      const mi = _startMsgs();
      await _pollFallback(data.statusUrl, fname);
      clearInterval(mi);
      return;
    }

    const link = data.url || data.downloadUrl || data.link || data.download;
    const hash = data.id || data.hash;
    const base = (data._backend || '').replace('/api/v2/download', '');
    const absUrl = link ? (link.startsWith('http') ? link : base + link) : (hash ? base + '/api/proxy/' + hash : null);

    if (absUrl) _doDownload(FB + '?dl=' + encodeURIComponent(absUrl) + '&filename=' + encodeURIComponent(fname), fname);
    else throw new Error('No download link in response');
  }

  async function _phpBackendDownload(rawUrl, youtubeId, fmt, quality, title) {
    if (fmt !== 'mp3') throw new Error('PHP backend only supports MP3');
    sessionStorage.removeItem('autoRetryCount');
    sessionStorage.removeItem('autoResumeUrl');
    _setStatus('Connecting...', true);

    try {
      const tokenRes = await fetch(FB3 + '?action=get_token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: youtubeId })
      });
      if (!tokenRes.ok) throw new Error('Failed to fetch token');
      const tokenData = await tokenRes.json();
      if (!tokenData.token) throw new Error('Token not found');

      _setStatus('Downloading MP3...', true);
      const iframeName = 'dl_php_' + Date.now();
      const iframe = document.createElement('iframe');
      iframe.name = iframeName;
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const form = document.createElement('form');
      form.method = 'POST';
      form.action = FB3 + '?action=download_mp3';
      form.target = iframeName;

      const fields = { id: youtubeId, title: title || youtubeId, token: tokenData.token };
      for (const k in fields) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = k;
        input.value = fields[k];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
      document.body.removeChild(form);

      setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 5000);
      _showSuccess();
    } catch (e) {
      throw new Error('PHP backend token error: ' + (e.message || 'Unknown'));
    }
  }

  // Async PHP backend on ruvs.in. Paths are made absolute so they work from github.io.
  async function apd(ru, yi, fmt, q, t) {
    _setStatus('Converting...', true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(SITE + '/api/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ru, format: fmt, quality: String(q).replace(/[^0-9]/g, '') }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('Server returned ' + response.status);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      if (data.status !== 'processing' || !data.job_id) throw new Error('Invalid server response');

      _setStatus('Converting video... Please wait.', true);

      return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 40;
        const pollInterval = setInterval(async () => {
          attempts++;
          if (_st.aborted) { clearInterval(pollInterval); reject(new Error('Aborted by user')); return; }
          if (attempts >= maxAttempts) { clearInterval(pollInterval); reject(new Error('Conversion timeout')); return; }

          try {
            const checkRes = await fetch(SITE + '/api/check?job_id=' + encodeURIComponent(data.job_id));
            const checkData = await checkRes.json();
            if (checkData.status === 'completed') {
              clearInterval(pollInterval);
              _setStatus('Download ready!', true);
              const downloadUrl = abs(checkData.download_url || ('/api/file?job_id=' + encodeURIComponent(data.job_id)));
              _doDownload(downloadUrl, checkData.filename || _makeFilename(t || _st.title, fmt));
              resolve();
            } else if (checkData.status === 'error') {
              clearInterval(pollInterval);
              reject(new Error(checkData.message || 'Conversion failed'));
            } else {
              _setStatus('Converting video...', true);
            }
          } catch (pollErr) { console.error('Poll Error:', pollErr); }
        }, 2000);
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') console.error('Request aborted (timeout).');
      throw error;
    }
  }

  const PROVIDERS = [
    { name: 'primary', run: (ctx) => _ampDownload(ctx.raw, ctx.id, ctx.fmt, ctx.resolvedQuality, ctx.title) },
    { name: 'ytApiFallback', run: (ctx) => _ytApiFallbackDownload(ctx.id, ctx.fmt, ctx.title) },
    { name: 'asyncPhp', run: (ctx) => apd(ctx.raw, ctx.id, ctx.fmt, ctx.resolvedQuality, ctx.title) },
    { name: 'thirdFallback', run: (ctx) => _thirdFallbackDownload(ctx.id, ctx.raw, ctx.fmt, ctx.quality, ctx.resolvedQuality, ctx.title) },
    { name: 'phpBackend', run: (ctx) => _phpBackendDownload(ctx.raw, ctx.id, ctx.fmt, ctx.quality, ctx.title) },
    { name: 's2', run: (ctx) => S2Download(ctx.raw, ctx.id, ctx.fmt, ctx.resolvedQuality, ctx.title) },
    { name: 'ownProxy', run: (ctx) => _fallbackDownload(ctx.raw, ctx.fmt, ctx.fmt === 'mp4' ? ctx.resolvedQuality : ctx.quality, ctx.title) },
  ];

  async function _runProviderChain(ctx) {
    let lastErr = null;
    for (let i = 0; i < PROVIDERS.length; i++) {
      try {
        // Internal provider names are logged, not shown to users.
        _setStatus('Converting…', true);
        await PROVIDERS[i].run(ctx);
        return;
      } catch (e) {
        lastErr = e;
        console.warn('[provider:' + PROVIDERS[i].name + '] failed:', e && e.message);
      }
    }
    _setStatus((lastErr && lastErr.message ? lastErr.message : 'All providers failed') + ' — please try again.', false);
    _enableBtn();
  }

  async function _fetchMeta(id) {
    els.thumb.src = 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg';
    els.title.textContent = 'Loading…';
    els.channel.textContent = '';
    els.preview.classList.add('visible');
    try {
      const res = await fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json');
      if (!res.ok) throw new Error();
      const d = await res.json();
      els.thumb.src = d.thumbnail_url || els.thumb.src;
      els.title.textContent = d.title || '—';
      els.channel.textContent = d.author_name || '';
      if (d.title) _st.title = d.title;
    } catch (e) {
      els.title.textContent = '—';
    }
  }

  // Stub kept as in the original: no format probing, so the quality fallback chain is inactive.
  async function _getFormats(videoId) { return null; }

  function _startMsgs() {
    const msgs = [
      'Processing your video…', 'Converting...', 'Processing...',
      'Built for simplicity, speed and reliability',
      'Converting your video...',
    ];
    let i = 0;
    _setStatus(msgs[i], true);
    return setInterval(() => {
      i = (i + 1) % msgs.length;
      _setStatus(msgs[i], true);
    }, 3000);
  }

  async function startFlow() {
    const raw = els.urlInput.value.trim();
    if (!raw) { _showErr('Please paste a YouTube link'); return; }

    const id = _extractId(raw);
    if (!id) { _showErr('Invalid YouTube URL'); return; }

    _st.aborted = false;
    _st.youtubeId = id;
    _st.title = '';

    const fmt = localStorage.getItem('selectedFormat') || 'mp3';
    const aq = (localStorage.getItem('audioQuality') || '192kbps').replace(/kbps$/i, 'k');
    const vq = localStorage.getItem('videoQuality') || '720p';

    _st.mode = fmt;
    _st.quality = fmt === 'mp3' ? aq : vq;

    if (els.infinityLoader) els.infinityLoader.style.display = 'none';
    els.downloadBtn.classList.remove('visible');
    els.downloadBtn.style.display = 'none';
    els.statusBox.classList.remove('visible');
    els.successView.classList.remove('visible');

    els.rahulContainer.style.display = 'block';
    els.rahulContainer.classList.remove('fade-out');
    els.userKnown.style.display = 'none';

    setTimeout(() => { els.userKnown.style.display = 'block'; }, 8000);

    els.mainCard.style.display = 'none';
    els.btnGo.disabled = true;
    els.btnGo.textContent = '…';

    els.preview.classList.remove('visible');
    els.title.textContent = '—';
    els.channel.textContent = '';

    _setStatus('Starting…', true);

    await Promise.race([_fetchMeta(id), _sleep(6000)]);
    if (_st.aborted) { console.warn('[FLOW] Aborted'); return; }

    let resolvedQuality = _st.quality;
    if (fmt === 'mp4') {
      _setStatus('Checking available formats…', true);
      const info = await _getFormats(id);
      if (info && info.formats) {
        const availVQ = info.formats.filter(f => f.type === 'video').map(f => f.quality);
        resolvedQuality = _resolveVideoQuality(_st.quality, availVQ);
        if (info.title) {
          _st.title = info.title;
          els.title.textContent = info.title;
        }
      }
    }

    const mi = _startMsgs();
    _st.flowTimer = setTimeout(() => {
      const retries = parseInt(sessionStorage.getItem('autoRetryCount') || '0', 10);
      if (retries < 2) {
        sessionStorage.setItem('autoRetryCount', retries + 1);
        sessionStorage.setItem('autoResumeUrl', els.urlInput.value);
        window.location.reload();
      } else {
        sessionStorage.removeItem('autoRetryCount');
        sessionStorage.removeItem('autoResumeUrl');
        _setStatus('Traffic is heavy at the moment. Please try again.', false);
        _enableBtn();
      }
    }, 120000);

    try {
      await _runProviderChain({ raw, id, fmt, quality: _st.quality, resolvedQuality, aq, title: _st.title });
    } finally {
      clearInterval(mi);
      clearTimeout(_st.flowTimer);
    }
  }

  function _setStatus(label, loading) {
    els.statusBox.classList.add('visible');
    els.statusLabel.textContent = label;
    if (els.infinityLoader) els.infinityLoader.style.display = loading === false ? 'none' : 'block';
  }

  function _enableBtn() {
    els.btnGo.disabled = false;
    els.btnGo.textContent = _st.mode === 'mp3' ? 'Download MP3' : 'Download MP4';
  }

  function _showSuccess() {
    setTimeout(() => {
      els.rahulContainer.classList.add('fade-out');
      setTimeout(() => {
        els.rahulContainer.style.display = 'none';
        els.userKnown.style.display = 'none';
        els.downloadBtn.style.display = 'none';
        els.successView.classList.add('visible');
        const after = $('after-download-section');
        if (after) after.style.display = 'block';
        _enableBtn();
        window.scrollTo(0, 0);
      }, 400);
    }, 700);
  }

  function _doDownload(url, filename) {
    sessionStorage.removeItem('autoRetryCount');
    sessionStorage.removeItem('autoResumeUrl');
    _setStatus('Preparing your download…', true);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    setTimeout(() => { if (document.body.contains(a)) document.body.removeChild(a); }, 2000);
    _showSuccess();
  }

  function initCustomSelect(selectId, storageKey, callback) {
    const select = $(selectId);
    if (!select) return;
    const selected = select.querySelector('.select-selected');
    const options = select.querySelectorAll('.select-items div');
    const saved = localStorage.getItem(storageKey);

    options.forEach(function (opt) {
      if (saved && opt.dataset.value === saved) selected.textContent = opt.textContent;
      opt.addEventListener('click', function () {
        selected.textContent = opt.textContent;
        localStorage.setItem(storageKey, opt.dataset.value);
        select.classList.remove('active');
        if (callback) callback(opt.dataset.value);
      });
    });

    selected.addEventListener('click', function (e) {
      e.stopPropagation();
      document.querySelectorAll('.custom-select').forEach(function (el) {
        if (el !== select) el.classList.remove('active');
      });
      select.classList.toggle('active');
    });
  }

  function handleFormatChange(fmt) {
    const aOpts = $('audio-options');
    const vOpts = $('video-options');
    const btn = $('btn-go');

    if (fmt === 'mp3') {
      if (aOpts) aOpts.style.display = 'flex';
      if (vOpts) vOpts.style.display = 'none';
      if (btn) btn.textContent = 'Download MP3';
    } else {
      if (aOpts) aOpts.style.display = 'none';
      if (vOpts) vOpts.style.display = 'flex';
      if (btn) btn.textContent = 'Download MP4';
    }
  }

  function _openCdDialog() {
    if (!cdDialog || !cdBackdrop) return;
    cdBackdrop.style.display = 'block';
    cdDialog.style.display = 'block';
    requestAnimationFrame(() => cdDialog.classList.add('cd-open'));
  }

  function _closeCdDialog() {
    if (!cdDialog || !cdBackdrop) return;
    cdDialog.classList.remove('cd-open');
    setTimeout(() => {
      cdBackdrop.style.display = 'none';
      cdDialog.style.display = 'none';
      const titleEl = $('cd-title');
      if (titleEl) titleEl.textContent = 'Clipboard Permission';
      const contBtn = $('cd-continue');
      if (contBtn) contBtn.textContent = 'Continue';
      const cancelBtn = $('cd-cancel');
      if (cancelBtn) cancelBtn.style.display = '';
      if (cdMessage) cdMessage.style.display = 'block';
      if (cdHelp) cdHelp.style.display = 'none';
    }, 250);
  }

  function _showCdHelp() {
    if (cdMessage) cdMessage.style.display = 'none';
    if (cdHelp) cdHelp.style.display = 'block';
  }

  function _showErr(msg) {
    if (!cdMessage) { alert(msg); return; }
    const titleEl = $('cd-title');
    if (titleEl) titleEl.textContent = '';
    cdMessage.style.display = 'block';
    if (cdHelp) cdHelp.style.display = 'none';
    cdMessage.textContent = msg;
    const contBtn = $('cd-continue');
    if (contBtn) contBtn.textContent = 'OK';
    const cancelBtn = $('cd-cancel');
    if (cancelBtn) cancelBtn.style.display = 'none';
    _openCdDialog();
  }

  window.resetUI = function () {
    els.successView.classList.remove('visible');
    els.mainCard.style.display = 'block';
    els.rahulContainer.style.display = 'none';
    els.rahulContainer.classList.remove('fade-out');
    els.userKnown.style.display = 'none';
    els.preview.classList.remove('visible');
    els.thumb.src = '';
    els.title.textContent = '—';
    els.channel.textContent = '';
    _st.aborted = true;
    if (els.infinityLoader) els.infinityLoader.style.display = 'none';

    const after = $('after-download-section');
    if (after) after.style.display = 'none';

    els.downloadBtn.classList.remove('visible');
    els.downloadBtn.style.display = 'none';
    els.statusBox.classList.remove('visible');
    els.urlInput.value = '';
    els.urlInput.focus();
    _enableBtn();
  };

  // ---- Clipboard paste ----
  const pasteBtn = $('paste-btn');
  if (pasteBtn) pasteBtn.onclick = async function () {
    try {
      const perm = await navigator.permissions.query({ name: 'clipboard-read' });
      if (perm.state === 'granted') {
        els.urlInput.value = await navigator.clipboard.readText();
        startFlow();
        return;
      }
      if (perm.state === 'denied') {
        _showCdHelp();
        _openCdDialog();
        return;
      }
      if (cdMessage) cdMessage.style.display = 'block';
      if (cdHelp) cdHelp.style.display = 'none';
      _openCdDialog();
    } catch (e) {
      // Browsers without the clipboard-read permission name (e.g. Firefox/Safari)
      _openCdDialog();
    }
  };

  const cdContinue = $('cd-continue');
  if (cdContinue) cdContinue.onclick = async function () {
    if (cdHelp && cdHelp.style.display === 'block') { _closeCdDialog(); return; }
    // "OK" button of an error message
    if (cdContinue.textContent === 'OK') { _closeCdDialog(); return; }
    try {
      els.urlInput.value = await navigator.clipboard.readText();
      _closeCdDialog();
      startFlow();
    } catch (e) {
      _showCdHelp();
    }
  };

  const cdCancel = $('cd-cancel');
  if (cdCancel) cdCancel.onclick = _closeCdDialog;

  // ---- Selects and buttons ----
  initCustomSelect('format-select', 'selectedFormat', handleFormatChange);
  initCustomSelect('audio-quality-select', 'audioQuality', null);
  initCustomSelect('video-quality-select', 'videoQuality', null);

  const _savedFmt = localStorage.getItem('selectedFormat') || 'mp3';
  handleFormatChange(_savedFmt);
  els.btnGo.textContent = _savedFmt === 'mp3' ? 'Download MP3' : 'Download MP4';

  document.addEventListener('click', function () {
    document.querySelectorAll('.custom-select').forEach(function (el) { el.classList.remove('active'); });
  });

  els.btnGo.addEventListener('click', startFlow);
  els.urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') startFlow();
  });

  // ---- Resume after auto-retry reload ----
  const autoUrl = sessionStorage.getItem('autoResumeUrl');
  if (autoUrl) {
    els.urlInput.value = autoUrl;
    sessionStorage.removeItem('autoResumeUrl');
    setTimeout(() => { startFlow(); }, 500);
  }

})();