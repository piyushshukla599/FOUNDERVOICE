# FounderVoice API — production image (local-first analysis stays in this container's volume)
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

ENV PYTHONUNBUFFERED=1 \
    DATA_DIR=/data \
    WHISPER_MODEL=base \
    API_DOCS_ENABLED=false

EXPOSE 8000

VOLUME ["/data"]

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --timeout-keep-alive 75
