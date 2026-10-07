"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 YouTube to MP3 & MP4 Converter - www.ruvs.in
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Author      : M. Rahul
Website     : https://www.ruvs.in/
GitHub      : https://github.com/ruvs-in
Version     : 1.0.0
License     : MIT
Created On  : 22 May 2026
Language    : Python

Description :
A simple YouTube downloader and converter
that downloads videos in MP3 and MP4 formats.

Features :
✔ Download YouTube videos
✔ Convert videos to MP3
✔ Save in MP4 format
✔ Fast download speed
✔ User-friendly interface

Requirements :
- Python 3.10+
- pytube / yt-dlp
- ffmpeg

Disclaimer :
This tool is made for educational purposes only.
Users are responsible for complying with
YouTube's Terms of Service.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""

from flask import Flask, request, Response, stream_with_context, jsonify, abort
from functools import wraps
import yt_dlp, subprocess, shutil, os, urllib.parse
import time, re, logging, base64, tempfile, atexit
from collections import defaultdict
import threading

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger(__name__)

app = Flask(__name__)

SECRET_KEY      = os.environ.get('SECRET_KEY', 'change-me-in-prod')
MAX_DURATION    = int(os.environ.get('MAX_DURATION', 1800))
ALLOWED_ORIGINS = set(filter(None, os.environ.get('ALLOWED_ORIGINS', '').split(',')))

ffmpeg_path = shutil.which('ffmpeg') or ''
ffmpeg_dir  = os.path.dirname(ffmpeg_path) if ffmpeg_path else ''
log.info("ffmpeg: %s", ffmpeg_path or "NOT FOUND")

_COOKIE_FILE = None

def _init_cookies():
    global _COOKIE_FILE
    b64 = os.environ.get('YOUTUBE_COOKIES_B64', '').strip()
    if not b64:
        log.warning("No YOUTUBE_COOKIES_B64 set — YouTube may bot-block requests")
        return
    try:
        data = base64.b64decode(b64)
        tmp  = tempfile.NamedTemporaryFile(delete=False, suffix='.txt', mode='wb')
        tmp.write(data)
        tmp.close()
        _COOKIE_FILE = tmp.name
        log.info("Cookies loaded: %s", _COOKIE_FILE)
        atexit.register(lambda: os.unlink(_COOKIE_FILE) if os.path.exists(_COOKIE_FILE) else None)
    except Exception as e:
        log.error("Failed to init cookies: %s", e)

_init_cookies()


_rl_lock          = threading.Lock()
_rl_counts        = defaultdict(list)
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_INFO   = 20
RATE_LIMIT_STREAM = 5

def _client_ip():
    xff = request.headers.get('X-Forwarded-For', '')
    return xff.split(',')[0].strip() if xff else (request.remote_addr or '0.0.0.0')

def rate_limit(max_calls):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            ip  = _client_ip()
            key = f"{fn.__name__}:{ip}"
            now = time.time()
            with _rl_lock:
                _rl_counts[key] = [t for t in _rl_counts[key] if now - t < RATE_LIMIT_WINDOW]
                if len(_rl_counts[key]) >= max_calls:
                    log.warning("Rate limit: %s", key)
                    r = jsonify({'error': 'Too many requests — slow down.'})
                    r.status_code = 429
                    r.headers['Retry-After'] = str(RATE_LIMIT_WINDOW)
                    return r
                _rl_counts[key].append(now)
            return fn(*args, **kwargs)
        return wrapper
    return decorator


_BAD_UA_RE = re.compile(
    r'(bot|crawler|spider|scraper|curl|wget|python-requests|java|'
    r'go-http|okhttp|axios|libwww|mechanize|scrapy|phantomjs|headless)', re.I)
_BAD_HEADERS = {'via','x-forwarded-host','x-originating-ip',
                'x-remote-addr','x-remote-ip','forwarded-for'}

def block_bots(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        ua = request.headers.get('User-Agent', '')
        if not ua or _BAD_UA_RE.search(ua):
            abort(403)
        for h in _BAD_HEADERS:
            if request.headers.get(h):
                abort(403)
        return fn(*args, **kwargs)
    return wrapper


@app.after_request
def apply_cors(resp):
    origin = request.headers.get('Origin', '')
    if ALLOWED_ORIGINS and origin not in ALLOWED_ORIGINS:
        resp.headers.pop('Access-Control-Allow-Origin', None)
        return resp
    if origin:
        resp.headers['Access-Control-Allow-Origin']  = origin
        resp.headers['Vary']                          = 'Origin'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    return resp


@app.after_request
def security_headers(resp):
    h = resp.headers
    h['X-Content-Type-Options'] = 'nosniff'
    h['X-Frame-Options']        = 'DENY'
    h['Referrer-Policy']        = 'no-referrer'
    h['Permissions-Policy']     = 'geolocation=(), camera=(), microphone=()'
    if 'Cache-Control' not in h:
        h['Cache-Control'] = 'no-store'
    return resp


_QUALITY_MP3 = {'64', '128', '192', '320'}
_QUALITY_MP4 = {'360p', '480p', '720p', '1080p'}

def normalise_quality(fmt: str, raw: str) -> str:
    q = re.sub(r'kbps$', '', raw.strip(), flags=re.I)
    q = re.sub(r'k$',    '', q,           flags=re.I)
    q = q.lower()
    allowed = _QUALITY_MP3 if fmt == 'mp3' else _QUALITY_MP4
    if q not in allowed:
        abort(400, f'quality must be one of: {", ".join(sorted(allowed))}')
    return q


_ALLOWED_HOSTS = re.compile(
    r'^https?://(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com|m\.youtube\.com)', re.I)

def validate_url(url):
    url = url.strip()
    if not url:
        abort(400, 'URL required')
    if not _ALLOWED_HOSTS.match(url):
        abort(400, 'Only YouTube URLs are supported')
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        abort(400, 'Invalid URL scheme')
    return url

def validate_format(fmt):
    if fmt not in ('mp3', 'mp4'):
        abort(400, 'format must be mp3 or mp4')


def _make_info_opts():
    opts = {
        'quiet': True, 'no_warnings': True,
        'skip_download': True, 'socket_timeout': 10,
        'noplaylist': True,
    }
    if _COOKIE_FILE:
        opts['cookiefile'] = _COOKIE_FILE
    return opts

def get_info(url):
    with yt_dlp.YoutubeDL(_make_info_opts()) as ydl:
        info = ydl.extract_info(url, download=False)
    duration = info.get('duration') or 0
    if duration > MAX_DURATION:
        abort(400, f'Video too long (max {MAX_DURATION // 60} min)')
    title = info.get('title', 'download')
    safe  = ''.join(c for c in title.encode('ascii', 'ignore').decode()
                    if c.isalnum() or c in ' -_')[:60].strip() or 'download'
    return safe, info


@app.route('/info', methods=['POST'])
@block_bots
@rate_limit(RATE_LIMIT_INFO)
def info_route():
    body = request.get_json(silent=True) or {}
    url  = validate_url(body.get('url', ''))
    try:
        title, info = get_info(url)
        return jsonify({
            'title':    title,
            'duration': info.get('duration', 0),
        })
    except Exception as e:
        log.error("/info error for %s: %s", url, e)
        return jsonify({'error': str(e)}), 500


@app.route('/stream')
@block_bots
@rate_limit(RATE_LIMIT_STREAM)
def stream_route():
    url   = validate_url(request.args.get('url', ''))
    fmt   = request.args.get('format', 'mp3').lower()
    raw_q = request.args.get('quality', '192' if fmt == 'mp3' else '720p')

    validate_format(fmt)
    quality = normalise_quality(fmt, raw_q)

    # Try to get a clean title for Content-Disposition.
    # Never abort on failure — streaming is more important than the filename.
    title = 'download'
    try:
        title, _ = get_info(url)
    except Exception as e:
        log.warning("/stream get_info failed (using fallback title): %s", e)

    filename    = urllib.parse.quote(title + '.' + fmt)
    disposition = f'attachment; filename="{title}.{fmt}"; filename*=UTF-8\'\'{filename}'


    base_flags = [
        'yt-dlp', '--no-playlist',
        '--socket-timeout', '15',
        '--ffmpeg-location', ffmpeg_dir,
        '-o', '-', '--quiet',
    ]
    if _COOKIE_FILE:
        base_flags += ['--cookies', _COOKIE_FILE]

    if fmt == 'mp3':
        cmd  = base_flags + [
            '-f', 'bestaudio/best',
            '--extract-audio', '--audio-format', 'mp3',
            '--audio-quality', quality,
            url,
        ]
        mime = 'audio/mpeg'
    else:
        h   = quality.replace('p', '')
        cmd = base_flags + [
            '-f', (f'bestvideo[height<={h}][ext=mp4]+'
                   f'bestaudio[ext=m4a]/best[height<={h}][ext=mp4]/best'),
            '--merge-output-format', 'mp4',
            url,
        ]
        mime = 'video/mp4'


    preflight_cmd = [
        'yt-dlp', '--simulate', '--no-playlist',
        '--socket-timeout', '15', '--quiet', '--no-warnings',
    ]
    if _COOKIE_FILE:
        preflight_cmd += ['--cookies', _COOKIE_FILE]
    preflight_cmd.append(url)

    try:
        check = subprocess.run(preflight_cmd, capture_output=True, timeout=40)
        if check.returncode != 0:
            err = check.stderr.decode(errors='ignore')[:600]
            log.error("yt-dlp preflight failed: %s", err)
            return jsonify({'error': 'Video unavailable — ' + err}), 500
    except subprocess.TimeoutExpired:
        log.error("yt-dlp preflight timeout")
        return jsonify({'error': 'Request timed out — try again'}), 504

    def generate():
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, bufsize=0)
        try:
            while True:
                chunk = proc.stdout.read(65536)
                if not chunk:
                    break
                yield chunk
        except GeneratorExit:
            proc.kill()
        finally:
            proc.stdout.close()
            stderr_out = proc.stderr.read().decode(errors='ignore')
            proc.wait()
            if stderr_out:
                log.error("yt-dlp stderr [%s]: %s", title, stderr_out[:2000])
            log.info("Stream done rc=%d: %s fmt=%s q=%s",
                     proc.returncode, title, fmt, quality)

    return Response(
        stream_with_context(generate()),
        mimetype=mime,
        headers={
            'Content-Disposition': disposition,
            'X-Accel-Buffering':   'no',
            'Cache-Control':       'no-store',
        },
    )


@app.route('/healthz')
def healthz():
    return 'ok', 200


@app.errorhandler(400)
def bad_request(e):  return jsonify({'error': str(e.description)}), 400
@app.errorhandler(403)
def forbidden(e):    return jsonify({'error': 'Forbidden'}), 403
@app.errorhandler(429)
def too_many(e):     return jsonify({'error': 'Too many requests'}), 429
@app.errorhandler(500)
def server_error(e): return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    app.run(debug=False, port=10000, threaded=True)
