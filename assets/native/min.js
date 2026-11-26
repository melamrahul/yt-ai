
'use strict';

(function () {

var _st = {
    aborted: false,
    title: '',
    mode: 'mp3',
    quality: '192k',
    youtubeId: null
};

var _pt = null;

var $ = function (i) {
    return document.getElementById(i);
};

var els = {
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

if (!els.urlInput || !els.btnGo || !els.mainCard) return;

var cdBackdrop = $('clipboardBackdrop');
var cdDialog = $('clipboardDialog');
var cdMessage = $('cd-message');
var cdHelp = $('cd-help');

var sleep = function (ms) {
    return new Promise(function (r) {
        setTimeout(r, ms);
    });
};


/* ============================================================
   YOUTUBE URL
   ============================================================ */

function extractId(s) {
    var m = s.match(
        /(?:v=|\/shorts\/|youtu\.be\/|embed\/|\/live\/)([a-zA-Z0-9_-]{11})/
    );

    return m ? m[1] : null;
}

function audioQ(q) {
    var m = String(q || '').match(/(\d+)/);
    return m ? m[1] : '192';
}

function videoQ(q) {
    var m = String(q || '').match(/(\d+)/);
    return m ? m[1] : '720';
}

function fname(t, e) {
    var s = (t || 'yt-ai')
        .replace(/[\\/:*?"<>|]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 80);

    return '[yt-ai] - ' + (s || 'download') + '.' + e;
}


/* ============================================================
   STATUS
   ============================================================ */

function setStatus(l, ld) {

    if (!els.statusBox) return;

    els.statusBox.classList.add('visible');

    els.statusLabel.textContent = l;

    if (els.infinityLoader) {
        els.infinityLoader.style.display =
            ld === false ? 'none' : 'block';
    }
}

function enableBtn() {

    if (!els.btnGo) return;

    els.btnGo.disabled = false;

    els.btnGo.textContent =
        _st.mode === 'mp3'
            ? 'Download MP3'
            : 'Download MP4';
}


/* ============================================================
   VIDEO METADATA
   ============================================================ */

function fetchMeta(id) {

    els.thumb.src =
        'https://img.youtube.com/vi/' + id + '/mqdefault.jpg';

    els.title.textContent = 'Loading…';

    els.channel.textContent = '';

    els.preview.classList.add('visible');

    return fetch(
        'https://www.youtube.com/oembed?url=' +
        encodeURIComponent(
            'https://www.youtube.com/watch?v=' + id
        ) +
        '&format=json'
    )
    .then(function (r) {

        if (!r.ok) throw new Error();

        return r.json();

    })
    .then(function (d) {

        els.thumb.src = d.thumbnail_url || els.thumb.src;

        els.title.textContent = d.title || '—';

        els.channel.textContent = d.author_name || '';

        if (d.title) {
            _st.title = d.title;
        }

    })
    .catch(function () {

        els.title.textContent = '—';

    });
}


/* ============================================================
   DOWNLOAD
   ============================================================ */

function doDownload(url, filename) {

    _st.dl = {
        url: url,
        name: filename
    };

    setStatus('Downloading securely…', true);

    var a = document.createElement('a');

    a.href = url;

    if (filename) {
        a.download = filename;
    }

    a.rel = 'noopener';

    a.style.display = 'none';

    document.body.appendChild(a);

    a.click();

    setTimeout(function () {

        if (document.body.contains(a)) {
            document.body.removeChild(a);
        }

    }, 2000);

    setTimeout(function () {

        els.rahulContainer.classList.add('fade-out');

        setTimeout(function () {

            els.rahulContainer.style.display = 'none';

            els.userKnown.style.display = 'none';

            els.downloadBtn.style.display = 'none';

            els.successView.classList.add('visible');

            var after = $('after-download-section');

            if (after) {
                after.style.display = 'block';
            }

            enableBtn();

            window.scrollTo(0, 0);

        }, 400);

    }, 700);
}


/* ============================================================
   CONVERSION FLOW
   ============================================================ */

function startFlow() {

    var raw = els.urlInput.value.trim();

    if (!raw) {
        showErr('Please paste a YouTube link');
        return;
    }

    var id = extractId(raw);

    if (!id) {
        showErr('Invalid YouTube URL');
        return;
    }

    var fmt =
        localStorage.getItem('selectedFormat') || 'mp3';

    var aq = audioQ(
        localStorage.getItem('audioQuality') || '192kbps'
    );

    var vq = videoQ(
        localStorage.getItem('videoQuality') || '720p'
    );

    _st.aborted = false;

    _st.youtubeId = id;

    _st.title = '';

    _st.mode = fmt;

    _st.quality = fmt === 'mp3' ? aq : vq;

    if (els.infinityLoader) {
        els.infinityLoader.style.display = 'none';
    }

    els.downloadBtn.classList.remove('visible');

    els.downloadBtn.style.display = 'none';

    els.statusBox.classList.remove('visible');

    els.successView.classList.remove('visible');

    els.rahulContainer.style.display = 'block';

    els.rahulContainer.classList.remove('fade-out');

    els.userKnown.style.display = 'none';

    setTimeout(function () {

        if (!_st.aborted) {
            els.userKnown.style.display = 'block';
        }

    }, 8000);

    els.mainCard.style.display = 'none';

    els.btnGo.disabled = false;
    els.btnGo.textContent =
    _st.mode === 'mp3' ? 'Download MP3' : 'Download MP4';

    els.preview.classList.remove('visible');

    els.title.textContent = '—';

    els.channel.textContent = '';

    setStatus('Starting…', true);

    Promise.race([
        fetchMeta(id),
        sleep(6000)
    ])
    .then(function () {

        if (_st.aborted) return;

        setStatus('Converting…', true);

        return runConvert(fmt);

    })
    .catch(function (err) {

        if (_st.aborted) return;

        console.error('[flow]', err);

        setStatus(
            err && err.message
                ? err.message
                : 'Conversion failed. Please try again.',
            false
        );

        enableBtn();

    });
}


/* ============================================================
   EXPOSE CONVERSION FUNCTION TO CAPTCHA.JS
   ============================================================ */

window.__startFlow = startFlow;


/* ============================================================
   CONVERSION API
   ============================================================ */

function postConvert(fmt, attempt) {

    return fetch('https://tools.ruvs.in/x/a', {

        method: 'POST',

        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({

            url: 'https://youtu.be/' + _st.youtubeId,

            format: fmt,

            quality: _st.quality

        })

    })
    .then(function (res) {

        if (res.status === 503) {

            if (attempt < 3) {

                setStatus('Converting…', true);

                return sleep(2000).then(function () {

                    return postConvert(fmt, attempt + 1);

                });

            }

            throw new Error(
                'Queue is full, Please try again.'
            );
        }

        if (!res.ok) {

            return res.json()
                .catch(function () {
                    return {};
                })
                .then(function (j) {

                    throw new Error(
                        j.error || ('Server error ' + res.status)
                    );

                });
        }

        return res.json();

    });
}


/* ============================================================
   CONVERSION POLLING
   ============================================================ */

function runConvert(fmt) {

    return postConvert(fmt, 0)

    .then(function (data) {

        if (data.error) {
            throw new Error(data.error);
        }

        if (!data.job_id) {
            throw new Error('Invalid server response');
        }

        return new Promise(function (resolve, reject) {

            var polls = 0;

            _pt = setInterval(function () {

                polls++;

                if (_st.aborted) {

                    clearInterval(_pt);

                    _pt = null;

                    reject(new Error('Aborted'));

                    return;
                }

                if (polls > 150) {

                    clearInterval(_pt);

                    _pt = null;

                    reject(
                        new Error('Timed out. Please try again.')
                    );

                    return;
                }

                fetch(
                    'https://tools.ruvs.in/x/b?job_id=' +
                    encodeURIComponent(data.job_id)
                )
                .then(function (cr) {

                    return cr.json();

                })
                .then(function (cd) {

                    if (cd.status === 'completed') {

                        clearInterval(_pt);

                        _pt = null;

                        var link =
                            'https://tools.ruvs.in/x/c?job_id=' +
                            encodeURIComponent(data.job_id);

                        var f = fname(
                            cd.filename || _st.title,
                            fmt
                        );

                        setStatus('Download ready!', true);

                        doDownload(link, f);

                        resolve();

                        return;
                    }

                    if (cd.status === 'error') {

                        clearInterval(_pt);

                        _pt = null;

                        reject(
                            new Error(
                                cd.message || 'Conversion failed'
                            )
                        );

                        return;
                    }

                    setStatus('Converting…', true);

                })
                .catch(function () {});

            }, 2000);

        });

    });
}


/* ============================================================
   CLIPBOARD DIALOG
   ============================================================ */

function openCd() {

    if (!cdDialog || !cdBackdrop) return;

    cdBackdrop.style.display = 'block';

    cdDialog.style.display = 'block';

    requestAnimationFrame(function () {

        cdDialog.classList.add('cd-open');

    });
}

function closeCd() {

    if (!cdDialog || !cdBackdrop) return;

    cdDialog.classList.remove('cd-open');

    setTimeout(function () {

        cdBackdrop.style.display = 'none';

        cdDialog.style.display = 'none';

        var t = $('cd-title');

        if (t) {
            t.textContent = 'Clipboard Permission';
        }

        var cb = $('cd-continue');

        if (cb) {
            cb.textContent = 'Continue';
        }

        var xb = $('cd-cancel');

        if (xb) {
            xb.style.display = '';
        }

        if (cdMessage) {
            cdMessage.style.display = 'block';
        }

        if (cdHelp) {
            cdHelp.style.display = 'none';
        }

    }, 250);
}

function cdHelpOn() {

    if (cdMessage) {
        cdMessage.style.display = 'none';
    }

    if (cdHelp) {
        cdHelp.style.display = 'block';
    }
}

function showErr(msg) {

    if (!cdMessage) {
        alert(msg);
        return;
    }

    var t = $('cd-title');

    if (t) {
        t.textContent = '';
    }

    cdMessage.style.display = 'block';

    if (cdHelp) {
        cdHelp.style.display = 'none';
    }

    cdMessage.textContent = msg;

    var cb = $('cd-continue');

    if (cb) {
        cb.textContent = 'OK';
    }

    var xb = $('cd-cancel');

    if (xb) {
        xb.style.display = 'none';
    }

    openCd();
}


/* ============================================================
   RESET UI — CONVERT ANOTHER
   ============================================================ */

window.resetUI = function () {

    if (_pt) {

        clearInterval(_pt);

        _pt = null;

    }

    _st.aborted = true;

    els.successView.classList.remove('visible');

    els.mainCard.style.display = 'block';

    els.rahulContainer.style.display = 'none';

    els.rahulContainer.classList.remove('fade-out');

    els.userKnown.style.display = 'none';

    els.preview.classList.remove('visible');

    els.thumb.src = '';

    els.title.textContent = '—';

    els.channel.textContent = '';

    if (els.infinityLoader) {
        els.infinityLoader.style.display = 'none';
    }

    var after = $('after-download-section');

    if (after) {
        after.style.display = 'none';
    }

    els.downloadBtn.classList.remove('visible');

    els.downloadBtn.style.display = 'none';

    els.statusBox.classList.remove('visible');

    els.urlInput.value = '';

    els.urlInput.focus();

    /*
     * Reset Turnstile before enabling the button.
     * The CAPTCHA script clears the token and hides
     * the widget. The button must remain enabled so
     * the next click can display a fresh challenge.
     */

    document.dispatchEvent(
        new Event('yt-ai:reset-turnstile')
    );

    enableBtn();

};


/* ============================================================
   MANUAL DOWNLOAD
   ============================================================ */

window.manualDownload = function () {

    if (!_st.dl || !_st.dl.url) return;

    var a = document.createElement('a');

    a.href = _st.dl.url;

    if (_st.dl.name) {
        a.download = _st.dl.name;
    }

    a.rel = 'noopener';

    a.style.display = 'none';

    document.body.appendChild(a);

    a.click();

    setTimeout(function () {

        if (document.body.contains(a)) {
            document.body.removeChild(a);
        }

    }, 2000);

};


/* ============================================================
   QUALITY SELECT
   ============================================================ */

function initSelect(id, key, cb) {

    var sel = $(id);

    if (!sel) return;

    var selected = sel.querySelector('.select-selected');

    var options = sel.querySelectorAll('.select-items div');

    var saved = localStorage.getItem(key);

    options.forEach(function (opt) {

        if (saved && opt.dataset.value === saved) {
            selected.textContent = opt.textContent;
        }

        opt.addEventListener('click', function () {

            selected.textContent = opt.textContent;

            localStorage.setItem(key, opt.dataset.value);

            sel.classList.remove('active');

            if (cb) {
                cb(opt.dataset.value);
            }

        });

    });

    selected.addEventListener('click', function (e) {

        e.stopPropagation();

        document.querySelectorAll('.custom-select')
            .forEach(function (el) {

                if (el !== sel) {
                    el.classList.remove('active');
                }

            });

        sel.classList.toggle('active');

    });

}


/* ============================================================
   FORMAT CHANGE
   ============================================================ */

function formatChange(fmt) {

    var aOpts = $('audio-options');

    var vOpts = $('video-options');

    var btn = $('btn-go');

    if (fmt === 'mp3') {

        if (aOpts) {
            aOpts.style.display = 'flex';
        }

        if (vOpts) {
            vOpts.style.display = 'none';
        }

        if (btn) {
            btn.textContent = 'Download MP3';
        }

    } else {

        if (aOpts) {
            aOpts.style.display = 'none';
        }

        if (vOpts) {
            vOpts.style.display = 'flex';
        }

        if (btn) {
            btn.textContent = 'Download MP4';
        }

    }

}


/* ============================================================
   PASTE BUTTON
   ============================================================ */

var pasteBtn = $('paste-btn');

if (pasteBtn) {

    pasteBtn.onclick = function () {

        navigator.permissions.query({
            name: 'clipboard-read'
        })
        .then(function (perm) {

            if (perm.state === 'granted') {

                navigator.clipboard.readText()
                    .then(function (txt) {

                        els.urlInput.value = txt;

                        startFlow();

                    });

                return;
            }

            if (perm.state === 'denied') {

                cdHelpOn();

                openCd();

                return;
            }

            if (cdMessage) {
                cdMessage.style.display = 'block';
            }

            if (cdHelp) {
                cdHelp.style.display = 'none';
            }

            openCd();

        })
        .catch(function () {

            openCd();

        });

    };

}


/* ============================================================
   CLIPBOARD DIALOG BUTTONS
   ============================================================ */

var cdContinue = $('cd-continue');

if (cdContinue) {

    cdContinue.onclick = function () {

        if (cdHelp && cdHelp.style.display === 'block') {

            closeCd();

            return;
        }

        if (cdContinue.textContent === 'OK') {

            closeCd();

            return;
        }

        navigator.clipboard.readText()

            .then(function (txt) {

                els.urlInput.value = txt;

                closeCd();

                startFlow();

            })

            .catch(function () {

                cdHelpOn();

            });

    };

}

var cdCancel = $('cd-cancel');

if (cdCancel) {
    cdCancel.onclick = closeCd;
}


/* ============================================================
   INITIALIZATION
   ============================================================ */

initSelect(
    'audio-quality-select',
    'audioQuality',
    null
);

var savedFmt =
    localStorage.getItem('selectedFormat') || 'mp3';

formatChange(savedFmt);

if (els.btnGo) {

    els.btnGo.textContent =
        savedFmt === 'mp3'
            ? 'Download MP3'
            : 'Download MP4';

}


/* ============================================================
   CLOSE CUSTOM SELECTS
   ============================================================ */

document.addEventListener('click', function () {

    document.querySelectorAll('.custom-select')
        .forEach(function (el) {

            el.classList.remove('active');

        });

});


/* ============================================================
   EVENT LISTENERS
   ============================================================ */

if (els.btnGo) {

    els.btnGo.addEventListener('click', startFlow);

}

if (els.urlInput) {

    els.urlInput.addEventListener('keydown', function (e) {

        if (e.key === 'Enter') {
            startFlow();
        }

    });

}

})();
