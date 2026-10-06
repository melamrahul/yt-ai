# ── Stage 1: final image ──────────────────────────────────────────────────────
FROM python:3.11-slim

# Install ffmpeg at Docker build time (full root access here — works perfectly)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY app.py .

ENV PYTHONUNBUFFERED=1

# Render Docker services use port 10000 by default
EXPOSE 10000

CMD ["gunicorn", "app:app", \
     "--workers", "1", \
     "--threads", "8", \
     "--timeout", "0", \
     "--bind", "0.0.0.0:10000"]
