'use strict';
(function () {
  var _st = { aborted: false, title: '', mode: 'mp3', quality: '320k', youtubeId: null },
      _pt = null,
      $ = function (id) { return document.getElementById(id); },
      els = {
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
        successView: $('success-view')
      };

  /* Hard-fail only if the three critical elements are missing */
  if (!els.urlInput || !els.btnGo || !els.mainCard) {
    console.error('[min.js] Missing critical elements: urlInput/btnGo/mainCard');
    return;
  }

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /* ---------- Helpers ---------- */
  function extractId(s) {
    var m = s.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  function audioQ(q) {
    var m = String(q || '').match(/(\d+)/);
    return m ? m[1] : '320';
  }
  function videoQ(q) {
    var m = String(q || '').match(/(\d+)/);
    return m ? m[1] : '720';
  }
  function fname(t, e) {
    var s = (t || 'yt-ai').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return '[yt-ai] - ' + (s || 'download') + '.' + e;
  }

  function setStatus(l, showLoader) {
    if (!els.statusBox) return;
    els.statusBox.classList.add('visible');
    els.statusBox.style.display = 'block';
    els.statusLabel.textContent = l;
    if (els.infinityLoader) els.infinityLoader.style.display = showLoader === false ? 'none' : 'block';
  }

  function enableBtn() {
    if (!els.btnGo) return;
    els.btnGo.disabled = false;
    els.btnGo.textContent = _st.mode === 'mp3' ? 'Download MP3' : 'Download MP4';
  }

  /* ---------- Error display (no custom clipboard dialog anymore) ---------- */
  function showErr(msg) {
    /* Use the shared custom dialog if utils.js exposed it, else fallback to inline status */
    if (window.YTAi && window.YTAi.Dialog) {
      window.YTAi.Dialog.alert(msg, 'Notice');
    } else {
      setStatus(msg, false);
    }
  }

  /* ---------- YouTube metadata ---------- */
  function fetchMeta(id) {
    if (!els.thumb || !els.title) return Promise.resolve();
    els.thumb.src = 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg';
    els.title.textContent = 'Loading…';
    if (els.channel) els.channel.textContent = '';

    return fetch('https://www.youtube.com/oembed?url=' + encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json')
      .then(function (r) { if (!r.ok) throw new Error('oembed failed'); return r.json(); })
      .then(function (d) {
        if (!els.thumb || !els.title) return;
        els.thumb.src = d.thumbnail_url || els.thumb.src;
        els.title.textContent = d.title || '—';
        if (els.channel) els.channel.textContent = d.author_name || '';
        if (d.title) _st.title = d.title;
      })
      .catch(function () {
        if (els.title) els.title.textContent = '—';
      });
  }

  /* ---------- Download trigger ---------- */
  function doDownload(url, filename) {
    _st.dl = { url: url, name: filename };
    setStatus('Downloading securely…', true);

    var a = document.createElement('a');
    a.href = url;
    if (filename) a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (document.body.contains(a)) document.body.removeChild(a); }, 2000);

    setTimeout(function () {
      if (els.rahulContainer) {
        els.rahulContainer.classList.add('fade-out');
        setTimeout(function () {
          els.rahulContainer.style.display = 'none';
          els.rahulContainer.classList.remove('fade-out');
          if (els.userKnown) els.userKnown.style.display = 'none';
          if (els.downloadBtn) els.downloadBtn.style.display = 'none';
          if (els.successView) els.successView.style.display = 'block';
          var after = $('after-download-section');
          if (after) after.style.display = 'block';
          enableBtn();
          window.scrollTo(0, 0);
        }, 400);
      }
    }, 700);
  }

  /* ---------- Main flow ---------- */
  function startFlow() {
    var raw = els.urlInput.value.trim();
    if (!raw) { showErr('Please paste a YouTube link'); return; }
    var id = extractId(raw);
    if (!id) { showErr('Invalid YouTube URL'); return; }

    var fmt = localStorage.getItem('selectedFormat') || 'mp3';
    var aq = audioQ(localStorage.getItem('audioQuality') || '320kbps');
    var vq = videoQ(localStorage.getItem('videoQuality') || '720p');

    _st.aborted = false;
    _st.youtubeId = id;
    _st.title = '';
    _st.mode = fmt;
    _st.quality = fmt === 'mp3' ? aq : vq;

    /* Reset UI state */
    if (els.infinityLoader) els.infinityLoader.style.display = 'none';
    if (els.downloadBtn) { els.downloadBtn.classList.remove('visible'); els.downloadBtn.style.display = 'none'; }
    if (els.statusBox) els.statusBox.style.display = 'none';
    if (els.successView) els.successView.style.display = 'none';

    /* Show result pane */
    if (els.rahulContainer) {
      els.rahulContainer.style.display = 'block';
      els.rahulContainer.classList.remove('fade-out');
    }
    if (els.userKnown) {
      els.userKnown.style.display = 'none';
      setTimeout(function () { els.userKnown.style.display = 'block'; }, 8000);
    }

    /* Hide main card */
    els.mainCard.style.display = 'none';
    els.btnGo.disabled = true;
    els.btnGo.textContent = '…';

    if (els.title) els.title.textContent = '—';
    if (els.channel) els.channel.textContent = '';

    setStatus('Starting…', true);

    Promise.race([fetchMeta(id), sleep(6000)])
      .then(function () {
        if (_st.aborted) return;
        setStatus('Converting…', true);
        return runConvert(fmt);
      })
      .catch(function (err) {
        if (_st.aborted) return;
        console.error('[flow]', err);
        setStatus((err && err.message) ? err.message : 'Conversion failed. Please try again.', false);
        enableBtn();
      });
  }

  /* ---------- Backend calls ---------- */
  function postConvert(fmt, attempt) {
    return fetch('https://tools.ruvs.in' + (function (n) { return '/x/' + String.fromCharCode(n); })(97), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/' + _st.youtubeId,
        format: fmt,
        quality: _st.quality
      })
    }).then(function (res) {
      if (res.status === 503) {
        if (attempt < 3) {
          setStatus('Converting…', true);
          return sleep(2000).then(function () { return postConvert(fmt, attempt + 1); });
        }
        throw new Error('Queue is full, Please try again.');
      }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || ('Server error ' + res.status));
        });
      }
      return res.json();
    });
  }

  function runConvert(fmt) {
    return postConvert(fmt, 0).then(function (data) {
      if (data.error) throw new Error(data.error);
      if (!data.job_id) throw new Error('Invalid server response');

      return new Promise(function (resolve, reject) {
        var polls = 0;
        _pt = setInterval(function () {
          polls++;
          if (_st.aborted) { clearInterval(_pt); reject(new Error('Aborted')); return; }
          if (polls > 150) { clearInterval(_pt); reject(new Error('Timed out. Please try again.')); return; }

          fetch('https://tools.ruvs.in' + (function (n) { return '/x/' + String.fromCharCode(n); })(98) + '?job_id=' + encodeURIComponent(data.job_id))
            .then(function (cr) { return cr.json(); })
            .then(function (cd) {
              if (cd.status === 'completed') {
                clearInterval(_pt);
                var link = 'https://tools.ruvs.in' + (function (n) { return '/x/' + String.fromCharCode(n); })(99) + '?job_id=' + encodeURIComponent(data.job_id);
                var f = fname(cd.filename || _st.title, fmt);
                setStatus('Download ready!', false);
                doDownload(link, f);
                resolve();
                return;
              }
              if (cd.status === 'error') {
                clearInterval(_pt);
                reject(new Error(cd.message || 'Conversion failed'));
                return;
              }
              setStatus('Converting…', true);
            })
            .catch(function () { /* swallow transient poll errors */ });
        }, 2000);
      });
    });
  }

  /* ---------- Public: reset & manual download ---------- */
  window.resetUI = function () {
    if (_pt) { clearInterval(_pt); _pt = null; }
    _st.aborted = true;
    if (els.successView) els.successView.style.display = 'none';
    if (els.mainCard) els.mainCard.style.display = 'block';
    if (els.rahulContainer) {
      els.rahulContainer.style.display = 'none';
      els.rahulContainer.classList.remove('fade-out');
    }
    if (els.userKnown) els.userKnown.style.display = 'none';
    if (els.thumb) els.thumb.src = '';
    if (els.title) els.title.textContent = '—';
    if (els.channel) els.channel.textContent = '';
    if (els.infinityLoader) els.infinityLoader.style.display = 'none';
    var after = $('after-download-section');
    if (after) after.style.display = 'none';
    if (els.downloadBtn) { els.downloadBtn.classList.remove('visible'); els.downloadBtn.style.display = 'none'; }
    if (els.statusBox) els.statusBox.style.display = 'none';
    if (els.urlInput) { els.urlInput.value = ''; els.urlInput.focus(); }
    enableBtn();
  };

  window.manualDownload = function () {
    if (!_st.dl || !_st.dl.url) return;
    var a = document.createElement('a');
    a.href = _st.dl.url;
    if (_st.dl.name) a.download = _st.dl.name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { if (document.body.contains(a)) document.body.removeChild(a); }, 2000);
  };

  /* ---------- Quality dropdown (single source of truth) ----------
     Handles #audio-quality-select. Writes to localStorage 'audioQuality'.
     NOTE: index.html also has inline code that does this — that is now
     redundant, but harmless. Remove it later if you want.
  ------------------------------------------------------------- */
  function initQualitySelect() {
    var sel = $('audio-quality-select');
    if (!sel) return;
    var selected = sel.querySelector('.select-selected');
    var items = sel.querySelectorAll('.select-items div');
    if (!selected || !items.length) return;

    var saved = localStorage.getItem('audioQuality');
    if (saved) {
      items.forEach(function (o) {
        if (o.dataset.value === saved) {
          selected.textContent = o.textContent;
          items.forEach(function (x) { x.classList.remove('active'); });
          o.classList.add('active');
        }
      });
    } else {
      /* Ensure localStorage always has a value */
      var active = sel.querySelector('.select-items div.active') || items[items.length - 1];
      if (active) localStorage.setItem('audioQuality', active.dataset.value);
    }

    items.forEach(function (opt) {
      opt.addEventListener('click', function () {
        selected.textContent = opt.textContent;
        items.forEach(function (x) { x.classList.remove('active'); });
        opt.classList.add('active');
        localStorage.setItem('audioQuality', opt.dataset.value);
        sel.classList.remove('active');
      });
    });

    selected.addEventListener('click', function (e) {
      e.stopPropagation();
      document.querySelectorAll('.custom-select').forEach(function (el) {
        if (el !== sel) el.classList.remove('active');
      });
      sel.classList.toggle('active');
    });

    document.addEventListener('click', function () {
      sel.classList.remove('active');
    });
  }

  /* ---------- Format (mp3 only for now, but structure is ready for mp4) ---------- */
  function formatChange(fmt) {
    if (els.btnGo) els.btnGo.textContent = fmt === 'mp3' ? 'Download MP3' : 'Download MP4';
    _st.mode = fmt;
  }

  /* ---------- Boot ---------- */
  function boot() {
    initQualitySelect();

    var savedFmt = localStorage.getItem('selectedFormat') || 'mp3';
    formatChange(savedFmt);

    if (els.btnGo) els.btnGo.addEventListener('click', startFlow);
    if (els.urlInput) {
      els.urlInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') startFlow();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();