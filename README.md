<div align="center">

<img src="https://img.shields.io/badge/ruvs.in-YouTube%20to%20MP3%20Converter-FF0000?style=for-the-badge&logo=youtube&logoColor=white" alt="ruvs.in — Free YouTube to MP3 & MP4 Converter" width="420"/>

# YouTube to MP3 Converter

### Fast · Free · No Signup · No Watermark · Privacy Friendly

**The simplest online YouTube downloader — convert any YouTube video to MP3 or MP4 in seconds, right in your browser.**

🌐 **[Try it Free → www.ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv)**

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fwww.ruvs.in&label=ruvs.in&style=flat-square&color=brightgreen&logo=google-chrome)]([https://www.ruvs.in/](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv))
[![Ko-fi](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-Ko--fi-FF5E5B?style=flat-square&logo=ko-fi&logoColor=white)](https://ko-fi.com/ruvsin)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![yt-dlp](https://img.shields.io/badge/yt--dlp-latest-FF6600?style=flat-square)](https://github.com/yt-dlp/yt-dlp)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com/)
[![GitHub Stars](https://img.shields.io/github/stars/ruvs-in/youtube-to-mp3-converter?style=flat-square&color=gold&logo=github)](https://github.com/ruvs-in/youtube-to-mp3-converter/stargazers)

</div>

---

## 🚀 What Is This?

This repository contains the **open-source backend** powering **[www.ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv)** — a free, fast, and privacy-friendly **YouTube to MP3 and MP4 converter** built with Python, Flask, `yt-dlp`, and `ffmpeg`.

> 🎯 **Just want to convert a YouTube video?**
> Head straight to **[www.ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv)** — works instantly in your browser, no installation, no account, no watermark.

---

## ✨ Features

| Feature | Details |
|---|---|
| 🎵 **YouTube → MP3** | 64 / 128 / 192 / 320 kbps quality options |
| 🎬 **YouTube → MP4** | 360p / 480p / 720p / 1080p resolutions |
| ⚡ **Instant Streaming** | Chunked streaming — no server-side storage ever |
| 🔒 **Privacy First** | No login, no tracking, no ads |
| 🛡️ **Bot Protection** | Per-IP rate limiting + User-Agent validation |
| 🌍 **CORS Ready** | Configurable allowed origins |
| 🩺 **Health Endpoint** | `/healthz` for uptime monitoring |
| 🐳 **Docker Ready** | One-command deploy with `ffmpeg` pre-bundled |
| 🔑 **Cookie Auth Support** | Base64 cookie injection to bypass bot-blocks |

---

## ☕ Support This Project

If this Repo or **[www.ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv)** helped you or saved your time, buy me a coffee — it keeps the servers running and motivates me to keep building free tools. 🙏

<div align="center">

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/ruvsin)

</div>

Every coffee = faster servers, more features, and a very happy developer. ☕

---

## 🌐 Live Demo

> 🔗 **[https://www.ruvs.in/](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv)**

1. Paste any YouTube URL
2. Choose **MP3** or **MP4** and pick your quality
3. Click **Download** — that's it

No watermarks. No file size limits. No email required. Completely free.

---

## 🛠️ Tech Stack

```
YouTube URL
    │
    ▼
Flask API  ──►  yt-dlp  ──►  ffmpeg  ──►  Streamed file to browser
    │
    └── Rate Limiting · Bot Blocking · CORS · Security Headers
```

| Layer | Technology |
|---|---|
| Web Framework | Python · Flask 3.0 |
| Video/Audio Extraction | yt-dlp (always latest) |
| Audio/Video Processing | ffmpeg |
| Production Server | Gunicorn (multi-threaded) |
| Deployment | Docker · Render.com |

---

## 📦 Self-Hosting Guide

Want to run your own YouTube to MP3 converter? Here's how.

### Prerequisites

- Python 3.11+
- `ffmpeg` installed on your system
- Docker (optional, but recommended)

### Option 1 — Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/ruvs-in/youtube-to-mp3-converter.git
cd youtube-to-mp3-converter

# Build and run
docker build -t yt-converter .
docker run -p 10000:10000 yt-converter
```

Your converter is now live at `http://localhost:10000` 🎉

### Option 2 — Manual (Python + Gunicorn)

```bash
# Clone the repo
git clone https://github.com/ruvs-in/youtube-to-mp3-converter.git
cd youtube-to-mp3-converter

# Install Python dependencies
pip install -r requirements.txt

# Run with Gunicorn (production)
gunicorn app:app --workers 1 --threads 8 --timeout 0 --bind 0.0.0.0:10000

# Or run locally for development
python app.py
```

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `change-me-in-prod` | Flask secret key — **change this in production** |
| `MAX_DURATION` | `1800` | Max video length in seconds (default: 30 min) |
| `ALLOWED_ORIGINS` | *(empty = all)* | Comma-separated CORS allowed origins |
| `YOUTUBE_COOKIES_B64` | *(empty)* | Base64-encoded Netscape cookies file for auth |

> ⚠️ **Always set a strong `SECRET_KEY` before deploying to production.**

---

## 📡 API Reference

### `POST /info`

Fetch video title and duration without downloading anything.

**Request:**
```json
{ "url": "https://www.youtube.com/watch?v=xxxxxxxxxxxx" }
```

**Response:**
```json
{
  "title": "Video Title Here",
  "duration": 215
}
```

---

### `GET /stream`

Stream the converted MP3 or MP4 file directly to the browser.

**Query Parameters:**

| Parameter | Required | Accepted Values | Default |
|---|---|---|---|
| `url` | ✅ | Any YouTube URL | — |
| `format` | ✅ | `mp3` or `mp4` | `mp3` |
| `quality` | ❌ | MP3: `64` `128` `192` `320` · MP4: `360p` `480p` `720p` `1080p` | `192` / `720p` |

**Download MP3 at 320 kbps:**
```
GET /stream?url=https://youtu.be/dQw4w9WgXcQ&format=mp3&quality=320
```

**Download MP4 at 1080p:**
```
GET /stream?url=https://youtu.be/dQw4w9WgXcQ&format=mp4&quality=1080p
```

**Response:** Binary file stream with `Content-Disposition` headers — auto-triggers download in the browser.

---

### `GET /healthz`

Returns `200 ok` — for uptime checks, load balancer pings, and monitoring tools.

---

## 🔒 Security Design

- **Rate Limiting:** `/info` → 20 requests/min · `/stream` → 5 requests/min per IP
- **Bot Blocking:** Rejects known crawler, scraper, and headless browser User-Agents
- **URL Allowlist:** Only accepts `youtube.com`, `youtu.be`, `music.youtube.com`, `m.youtube.com`
- **Security Headers:** `X-Frame-Options: DENY` · `X-Content-Type-Options: nosniff` · `Referrer-Policy: no-referrer` · `Permissions-Policy`
- **Zero Storage:** Files stream directly from YouTube → ffmpeg → your browser. Nothing is ever written to disk.

---

## 🐳 Dockerfile Overview

```dockerfile
FROM python:3.11-slim

# Install ffmpeg at build time
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py .

EXPOSE 10000
CMD ["gunicorn", "app:app", \
     "--workers", "1", \
     "--threads", "8", \
     "--timeout", "0", \
     "--bind", "0.0.0.0:10000"]
```

Single-stage slim Python image. Gunicorn runs 1 worker × 8 threads — handles concurrent streams without excess memory use.

---

## 📂 Project Structure

```
youtube-to-mp3-converter/
├── app.py              # Main Flask application & all routes
├── Dockerfile          # Docker image with ffmpeg pre-installed
├── requirements.txt    # Python dependencies (Flask, yt-dlp, gunicorn)
└── README.md           # You are here
```

---

## ❓ FAQ

**Q: Is ruvs.in completely free?**
A: Yes — 100% free, no account needed. Just visit **[www.ruvs.in](https://www.ruvs.in/)** and paste your URL.

**Q: Which YouTube URLs are supported?**
A: `youtube.com`, `youtu.be`, `music.youtube.com`, and `m.youtube.com` are all supported.

**Q: What's the maximum video length?**
A: The live site supports up to 30 minutes. If you self-host, increase `MAX_DURATION` to any value you like.

**Q: Are downloaded files stored on the server?**
A: No. Files are streamed directly to your browser in real time — nothing is ever saved server-side.

**Q: Why am I getting a rate-limit error?**
A: Stream requests are capped at 5 per minute per IP to prevent abuse. Wait 60 seconds and try again.

**Q: Does this support YouTube playlists?**
A: No — playlists are intentionally disabled (`--no-playlist`) to keep things simple and safe.

**Q: Can I use this code commercially?**
A: The code is MIT licensed, so yes. You are solely responsible for complying with [YouTube's Terms of Service](https://www.youtube.com/t/terms).

**Q: How do I fix YouTube bot-detection errors?**
A: Export your browser's YouTube cookies as a Netscape-format file, base64-encode it, and set it as `YOUTUBE_COOKIES_B64`.

---

## ⚖️ Disclaimer

This project is intended for **educational and personal use only**. Downloading YouTube content may violate [YouTube's Terms of Service](https://www.youtube.com/t/terms). Always respect copyright law and only download content you have the legal right to access. The author assumes no liability for misuse.

---

## 👨‍💻 Author

**M. Rahul** — building free tools at **[ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv)**

| | |
|---|---|
| 🌐 Website | [www.ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv) |
| 🐙 GitHub | [@ruvs-in](https://github.com/ruvs-in) |
| ☕ Ko-fi | [ko-fi.com/ruvsin](https://ko-fi.com/ruvsin) |

---

## 📄 License

```
MIT License

Copyright (c) 2026 M. Rahul (ruvs.in)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

See [LICENSE](LICENSE) for the full text.

---

<!-- SEO Keywords (GitHub indexes this content) -->
<!-- youtube to mp3 converter · youtube to mp4 downloader · free youtube downloader · yt-dlp python flask · convert youtube video to mp3 · download youtube audio · youtube mp3 320kbps · youtube 1080p downloader · no signup youtube converter · online youtube to mp3 · ruvs.in -->

<div align="center">

**⭐ If this repo helped you, please star it — it helps others find it too!**

Made with ❤️ by [M. Rahul](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv) &nbsp;·&nbsp; [www.ruvs.in](https://www.ruvs.in/?utm_source=gh-rdme-yt-mp3-conv) &nbsp;·&nbsp; [Ko-fi](https://ko-fi.com/ruvsin)

</div>
