# FounderVoice API on Hugging Face Spaces.
#
# The application source is not copied in here — it is cloned from GitHub at
# build time, so this file cannot drift from the repo. To pick up new commits,
# use "Factory rebuild" in the Space settings.
FROM python:3.12-slim

ARG REPO=https://github.com/piyushshukla599/FOUNDERVOICE.git
ARG REF=main

# librosa decodes the browser's webm uploads through ffmpeg; without it every
# upload fails at the decode step rather than at startup.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

# Spaces run the container as uid 1000. Anything the app writes has to be owned
# by that user, or it fails on the first upload instead of at build time.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH
WORKDIR /home/user/api

RUN git clone --depth 1 --branch ${REF} ${REPO} /tmp/src \
    && cp -r /tmp/src/apps/api/app ./app \
    && cp /tmp/src/apps/api/requirements.txt ./requirements.txt \
    && rm -rf /tmp/src

# Transcription is hosted here, so faster-whisper and its runtime (ctranslate2,
# onnxruntime, av) are several hundred megabytes that would never be loaded.
RUN grep -v '^faster-whisper' requirements.txt > requirements.hosted.txt \
    && pip install --no-cache-dir --user -r requirements.hosted.txt

ENV PYTHONUNBUFFERED=1 \
    DATA_DIR=/home/user/data \
    ASR_PROVIDER=groq \
    GROQ_MODEL=whisper-large-v3-turbo \
    API_DOCS_ENABLED=false \
    PORT=7860

# Spaces reach the container only through their own proxy, so the forwarded
# client address is trustworthy here. Bound directly to the internet it would
# not be, and the per-IP quota would be forgeable in one curl.
ENV TRUSTED_PROXY_HEADER=x-forwarded-for

EXPOSE 7860

CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860} --timeout-keep-alive 75
