'use strict';
(function () {
  var _st = { aborted: false, title: '', quality: '720', youtubeId: null, dl: null };
  var _pt = null;

  var $ = function (id) { return document.getElementById(id); };

  var els = {
    rahulContainer: $('rahul-container'),
    userKnown:      $('user-known'),
    urlInput:       $('yt-url'),
    btnGo:          $('btn-go'),
    pasteBtn:       $('paste-btn'),
    statusBox:      $('status-box'),
    statusLabel:    $('status-label'),
    infinityLoader: $('infinity-loader'),
    downloadBtn:    $('download-btn'),
    preview:        $('video-preview'),
    thumb:          $('video-thumb'),
    title:          $('video-title'),
    channel:        $('video-channel'),
    mainCard:       $('main-card'),
    successView:    $('success-view')
  };

  if (!els.urlInput || !els.btnGo || !els.mainCard) return;

  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function extractId(s) {
    var m = s.match(/(?:v=|\/shorts\/|youtu\.be\/|embed\/|\/live\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function videoQ(q) {
    var m = String(q || '').match(/(\d+)/);
    return m ? m[1] : '720';
  }

  function fname(t, ext) {
    var s = (t || 'yt-ai').replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim().slice(0, 80);
    return '[yt-ai] - ' + (s || 'download') + '.' + ext;
  }

  function setStatus(label, loading) {
    if (!els.statusBox) return;
    els.statusBox.classList.add('visible');
    els.statusLabel.textContent = label;
    if (els.infinityLoader) {
      els.infinityLoader.style.display = loading === false ? 'none' : 'block';
    }
  }

  function enableBtn() {
    if (!els.btnGo) return;
    els.btnGo.disabled = false;
    els.btnGo.textContent = 'Download MP4';
  }

  function showErr(msg) {
    if (window.YTAi && window.YTAi.Dialog) { window.YTAi.Dialog.alert(msg, 'Notice'); return; }
    alert(msg);
  }

  function fetchMeta(id) {
    els.thumb.src = 'https://img.youtube.com/vi/' + id + '/mqdefault.jpg';
    els.title.textContent = 'Loading…';
    els.channel.textContent = '';
    els.preview.classList.add('visible');

    var url = 'https://www.youtube.com/oembed?url=' +
      encodeURIComponent('https://www.youtube.com/watch?v=' + id) + '&format=json';

    return fetch(url)
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) {
        els.thumb.src = d.thumbnail_url || els.thumb.src;
        els.title.textContent = d.title || '—';
        els.channel.textContent = d.author_name || '';
        if (d.title) _st.title = d.title;
      })
      .catch(function () { els.title.textContent = '—'; });
  }

  function triggerSave(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    if (filename) a.download = filename;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      if (document.body.contains(a)) document.body.removeChild(a);
    }, 2000);
  }

  function doDownload(url, filename) {
    _st.dl = { url: url, name: filename };
    setStatus('Downloading securely…', true);
    triggerSave(url, filename);

    setTimeout(function () {
      els.rahulContainer.classList.add('fade-out');
      setTimeout(function () {
        els.rahulContainer.style.display = 'none';
        els.rahulContainer.classList.remove('fade-out');
        if (els.userKnown) els.userKnown.style.display = 'none';
        if (els.downloadBtn) els.downloadBtn.style.display = 'none';
        if (els.successView) els.successView.classList.add('visible');
        enableBtn();
        window.scrollTo(0, 0);
      }, 400);
    }, 700);
  }

  function startFlow() {
    var raw = els.urlInput.value.trim();
    if (!raw) { showErr('Please paste a YouTube link'); return; }

    var id = extractId(raw);
    if (!id) { showErr('Invalid YouTube URL'); return; }

    _st.aborted = false;
    _st.youtubeId = id;
    _st.title = '';
    _st.quality = videoQ(localStorage.getItem('videoQuality') || '720p');

    if (els.infinityLoader) els.infinityLoader.style.display = 'none';
    if (els.downloadBtn) { els.downloadBtn.classList.remove('visible'); els.downloadBtn.style.display = 'none'; }
    if (els.statusBox) els.statusBox.classList.remove('visible');
    if (els.successView) els.successView.classList.remove('visible');

    els.rahulContainer.style.display = 'block';
    els.rahulContainer.classList.remove('fade-out');

    if (els.userKnown) {
      els.userKnown.style.display = 'none';
      setTimeout(function () {
        if (!_st.aborted) els.userKnown.style.display = 'block';
      }, 8000);
    }

    els.mainCard.style.display = 'none';
    els.btnGo.disabled = true;
    els.btnGo.textContent = '…';
    els.preview.classList.remove('visible');
    els.title.textContent = '—';
    els.channel.textContent = '';
    setStatus('Starting…', true);

    Promise.race([fetchMeta(id), sleep(6000)])
      .then(function () {
        if (_st.aborted) return;
        setStatus('Converting…', true);
        return sleep(8000).then(function () {
          if (_st.aborted) return;
          return runConvert();
        });
      })
      .catch(function (err) {
        if (_st.aborted) return;
        console.error('[flow]', err);
        setStatus(err && err.message ? err.message : 'Conversion failed. Please try again.', false);
        enableBtn();
      });
  }

  function postConvert(attempt) {
    return fetch('https://tools.ruvs.in/x/a', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: 'https://youtu.be/' + _st.youtubeId,
        format: 'mp4',
        quality: _st.quality
      })
    }).then(function (res) {
      if (res.status === 503) {
        if (attempt < 3) {
          setStatus('Converting…', true);
          return sleep(2000).then(function () { return postConvert(attempt + 1); });
        }
        throw new Error('Queue is full, please try again.');
      }
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (j) {
          throw new Error(j.error || ('Server error ' + res.status));
        });
      }
      return res.json();
    });
  }

  function runConvert() {
    return postConvert(0).then(function (data) {
      if (data.error) throw new Error(data.error);
      if (!data.job_id) throw new Error('Invalid server response');

      return new Promise(function (resolve, reject) {
        var polls = 0;
        _pt = setInterval(function () {
          polls++;

          if (_st.aborted) {
            clearInterval(_pt); _pt = null;
            reject(new Error('Aborted'));
            return;
          }
          if (polls > 150) {
            clearInterval(_pt); _pt = null;
            reject(new Error('Timed out. Please try again.'));
            return;
          }

          fetch('https://tools.ruvs.in/x/b?job_id=' + encodeURIComponent(data.job_id))
            .then(function (cr) { return cr.json(); })
            .then(function (cd) {
              if (cd.status === 'completed') {
                clearInterval(_pt); _pt = null;
                var link = 'https://tools.ruvs.in/x/c?job_id=' + encodeURIComponent(data.job_id);
                var f = fname(cd.filename || _st.title, 'mp4');
                setStatus('Download ready!', true);
                doDownload(link, f);
                resolve();
                return;
              }
              if (cd.status === 'error') {
                clearInterval(_pt); _pt = null;
                reject(new Error(cd.message || 'Conversion failed'));
                return;
              }
              setStatus('Converting…', true);
            })
            .catch(function () {});
        }, 2000);
      });
    });
  }

  window.resetUI = function () {
    if (_pt) { clearInterval(_pt); _pt = null; }
    _st.aborted = true;

    if (els.successView) els.successView.classList.remove('visible');
    if (els.mainCard) els.mainCard.style.display = 'block';
    els.rahulContainer.style.display = 'none';
    els.rahulContainer.classList.remove('fade-out');
    if (els.userKnown) els.userKnown.style.display = 'none';
    els.preview.classList.remove('visible');
    els.thumb.src = '';
    els.title.textContent = '—';
    els.channel.textContent = '';
    if (els.infinityLoader) els.infinityLoader.style.display = 'none';
    if (els.downloadBtn) { els.downloadBtn.classList.remove('visible'); els.downloadBtn.style.display = 'none'; }
    if (els.statusBox) els.statusBox.classList.remove('visible');

    els.urlInput.value = '';
    els.urlInput.focus();
    document.dispatchEvent(new Event('yt-ai:reset-turnstile'));
    enableBtn();
  };

  window.manualDownload = function () {
    if (!_st.dl || !_st.dl.url) return;
    triggerSave(_st.dl.url, _st.dl.name);
  };

  function initSelect(id, key) {
    var sel = $(id);
    if (!sel) return;

    var selected = sel.querySelector('.select-selected');
    var options = sel.querySelectorAll('.select-items div');
    var saved = localStorage.getItem(key);

    options.forEach(function (opt) {
      if (saved && opt.dataset.value === saved) selected.textContent = opt.textContent;
      opt.addEventListener('click', function () {
        selected.textContent = opt.textContent;
        localStorage.setItem(key, opt.dataset.value);
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
  }

  initSelect('video-quality-select', 'videoQuality');

  document.addEventListener('click', function () {
    document.querySelectorAll('.custom-select').forEach(function (el) {
      el.classList.remove('active');
    });
  });

  if (els.pasteBtn) {
    els.pasteBtn.addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        showErr('Clipboard access is not available. Please paste the link manually.');
        return;
      }
      navigator.clipboard.readText()
        .then(function (txt) {
          els.urlInput.value = txt;
          startFlow();
        })
        .catch(function () {
          showErr('Clipboard permission was denied. Please paste the link manually.');
        });
    });
  }

  els.btnGo.addEventListener('click', startFlow);
  els.urlInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') startFlow();
  });

  window.__startFlow = startFlow;
})();