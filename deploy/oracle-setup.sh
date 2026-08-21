#!/usr/bin/env bash
#
# One-shot bootstrap for the FounderVoice API on an Oracle Always Free
# (Ampere/ARM, Ubuntu 22.04) instance.
#
#   curl -fsSL https://raw.githubusercontent.com/piyushshukla599/FOUNDERVOICE/main/deploy/oracle-setup.sh | bash
#
# Idempotent: safe to re-run after a failure or to pick up a new commit.
# It stops before writing secrets — the .env is yours to fill in.

set -euo pipefail

REPO="${REPO:-https://github.com/piyushshukla599/FOUNDERVOICE.git}"
APP_DIR="${APP_DIR:-$HOME/voicecoach}"
API_DIR="$APP_DIR/apps/api"
SERVICE=foundervoice
MEM_MB=$(awk '/MemTotal/{print int($2/1024)}' /proc/meminfo)

say() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

say "Swap"
# pip resolving and unpacking wheels is the peak-memory moment of this script,
# and on a 1 GB instance it is what takes sshd down with it. Swap makes that
# survivable - slowly, but without a reboot.
SWAP_MB=$(awk '/SwapTotal/{print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 2000 ] && [ "$SWAP_MB" -lt 2048 ] && [ ! -f /swapfile-fv ]; then
  sudo fallocate -l 2G /swapfile-fv 2>/dev/null || sudo dd if=/dev/zero of=/swapfile-fv bs=1M count=2048 status=none
  sudo chmod 600 /swapfile-fv
  sudo mkswap /swapfile-fv >/dev/null
  sudo swapon /swapfile-fv
  grep -q '/swapfile-fv' /etc/fstab || echo '/swapfile-fv none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  echo "   added 2 GB swap (total now $(awk '/SwapTotal/{print int($2/1024)}' /proc/meminfo) MB)"
else
  echo "   ${SWAP_MB} MB swap present - leaving it alone"
fi

say "System packages"
# Oracle's default image is Oracle Linux (login: opc); Ubuntu is opt-in
# (login: ubuntu). Both are offered on the same Always Free shape, so detect
# rather than assume - an apt-only script dies on line one under Oracle Linux.
#
# Keep this as small as possible. On the 1/8-OCPU Always Free shape a large dnf
# transaction starves sshd and takes the whole box offline, so only the
# interpreter is genuinely required: PyAV bundles its own ffmpeg, and the
# source can be fetched with curl when git is absent.
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y python3-venv python3-dev build-essential curl
elif command -v dnf >/dev/null 2>&1; then
  # Fail fast on a dead mirror instead of hanging on the default long retries.
  DNF="sudo dnf -y --setopt=timeout=20 --setopt=retries=2"

  # EL9 ships Python 3.9, but numpy 2.2 requires 3.10+. This is the one package
  # the install cannot proceed without.
  echo "-- interpreter (first dnf run rebuilds its cache; this is the slow step)"
  $DNF install python3.12 python3.12-devel || $DNF install python3.11 python3.11-devel || true
else
  echo "Unsupported distro: need apt-get or dnf." >&2; exit 1
fi

say "Source"
if command -v git >/dev/null 2>&1; then
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull --ff-only
  else
    git clone --depth 1 "$REPO" "$APP_DIR"
  fi
else
  # Installing git costs a full dnf transaction, which is exactly what knocks a
  # throttled instance offline. A tarball needs only curl and tar.
  echo "   git not installed - fetching a tarball instead"
  mkdir -p "$APP_DIR"
  curl -fsSL "${REPO%.git}/archive/refs/heads/${BRANCH:-main}.tar.gz" | tar xz -C "$APP_DIR" --strip-components=1
fi

say "Python environment (this pulls a few hundred MB of wheels; give it a few minutes)"
# Pick the newest interpreter present. numpy 2.2 refuses to build on 3.9,
# which is still the default python3 on Oracle Linux 9 - and the failure
# surfaces as an opaque wheel build error a long way from the cause.
PY_BIN=""
for c in python3.13 python3.12 python3.11 python3.10 python3; do
  if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' 2>/dev/null; then
    PY_BIN="$c"; break
  fi
done
if [ -z "$PY_BIN" ]; then
  echo "Need Python 3.10 or newer; found $(python3 -V 2>&1)." >&2; exit 1
fi
echo "   using $PY_BIN ($($PY_BIN -V 2>&1))"

[ -d "$API_DIR/.venv" ] || "$PY_BIN" -m venv "$API_DIR/.venv"
"$API_DIR/.venv/bin/pip" install --upgrade pip

# faster-whisper drags in ctranslate2, onnxruntime and av - several hundred MB
# that a hosted-ASR box downloads, stores, and never loads. On a 1 GB instance
# that is the step most likely to wedge the machine, so skip it.
REQ="$API_DIR/requirements.txt"
if [ -n "${GROQ_API_KEY:-}" ] || grep -qs '^ASR_PROVIDER=groq' "$API_DIR/.env"; then
  REQ=$(mktemp)
  grep -v '^faster-whisper' "$API_DIR/requirements.txt" > "$REQ"
  echo "   hosted ASR selected - skipping faster-whisper and its runtime"
fi
"$API_DIR/.venv/bin/pip" install -r "$REQ"

say "Configuration"
ENV_FILE="$API_DIR/.env"

# Older .env files predate some of these keys, so replacing in place is not
# enough — a missing key has to be appended or the setting silently vanishes.
set_env() {
  if grep -q "^$1=" "$ENV_FILE"; then
    sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"
  else
    printf '%s=%s
' "$1" "$2" >> "$ENV_FILE"
  fi
}

if [ ! -f "$ENV_FILE" ]; then
  cp "$API_DIR/.env.example" "$ENV_FILE"
  FRESH=1
  # A stable secret is what makes the free-tier counters survive a restart.
  set_env QUOTA_SECRET "$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
  set_env API_DOCS_ENABLED false
  echo "   wrote $ENV_FILE with a fresh QUOTA_SECRET"
else
  FRESH=0
  echo "   $ENV_FILE exists — keeping its QUOTA_SECRET and mail settings"
fi

# Transcription is the only part of this app with a real memory floor.
# faster-whisper needs roughly 2 GB resident; below that the kernel kills the
# worker mid-upload, which surfaces as a random 502 rather than as an
# out-of-memory error. Offer the hosted engine before that happens.
if [ -z "${GROQ_API_KEY:-}" ] && [ "$FRESH" = 1 ] && [ -t 0 ]; then
  echo
  echo "   This box has ${MEM_MB} MB of RAM."
  echo "   Local Whisper needs ~2000 MB. A free Groq key avoids that entirely:"
  echo "   https://console.groq.com/keys   (press Enter to use local Whisper)"
  printf '   GROQ_API_KEY: '
  read -r GROQ_API_KEY
  echo
fi

# An explicitly supplied key applies even to an existing .env — that is the
# whole point of re-running this after switching engines.
if [ -n "${GROQ_API_KEY:-}" ]; then
  set_env ASR_PROVIDER groq
  set_env GROQ_API_KEY "$GROQ_API_KEY"
  set_env GROQ_MODEL whisper-large-v3-turbo
  echo "   transcription: Groq whisper-large-v3-turbo (audio is uploaded to Groq)"
elif [ "$FRESH" = 1 ]; then
  set_env ASR_PROVIDER local
  # base runs in ~1 GB and transcribes a 2-minute clip in seconds on 2 ARM
  # cores. large-v3 wants ~3 GB and is several times slower — not a starting
  # point for a shared box.
  set_env WHISPER_MODEL base
  echo "   transcription: local faster-whisper (base)"
  if [ "$MEM_MB" -lt 2000 ]; then
    echo "   !! ${MEM_MB} MB is below what local Whisper needs. Expect the worker"
    echo "      to be OOM-killed on the first upload. Re-run with GROQ_API_KEY set."
  fi
else
  echo "   transcription: unchanged (pass GROQ_API_KEY=... to switch to Groq)"
fi

say "Firewall (the instance's own; the VCN security list is separate)"
# Oracle images ship with the host firewall closed to everything but 22, and
# the VCN security list is a second, independent gate. Both must open or the
# symptom is a connection that hangs rather than one that refuses.
if command -v firewall-cmd >/dev/null 2>&1 && sudo firewall-cmd --state >/dev/null 2>&1; then
  sudo firewall-cmd --permanent --add-service=http >/dev/null
  sudo firewall-cmd --permanent --add-service=https >/dev/null
  sudo firewall-cmd --reload >/dev/null
  echo "   firewalld: 80/443 open"
else
  for port in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport "$port" -j ACCEPT
  done
  sudo netfilter-persistent save >/dev/null 2>&1 || sudo service iptables save >/dev/null 2>&1 || true
  echo "   iptables: 80/443 open"
fi

say "Service"
sudo tee /etc/systemd/system/$SERVICE.service >/dev/null <<UNIT
[Unit]
Description=FounderVoice API
After=network.target

[Service]
User=$USER
WorkingDirectory=$API_DIR
ExecStart=$API_DIR/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --timeout-keep-alive 75
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl daemon-reload
sudo systemctl enable --now $SERVICE
sudo systemctl restart $SERVICE

sleep 3
say "Health"
curl -fsS http://127.0.0.1:8000/api/health || {
  echo "API did not answer. Logs:"; sudo journalctl -u $SERVICE -n 40 --no-pager; exit 1;
}

cat <<'NEXT'


  API is up on 127.0.0.1:8000 — deliberately not on the public interface.

  Browsers block the microphone over plain HTTP, so the API must be served
  over HTTPS before recording works from a remote origin. Bind it publicly
  only through a TLS terminator:

    sudo apt install -y caddy
    sudo cp ~/voicecoach/deploy/Caddyfile /etc/caddy/Caddyfile
    sudo nano /etc/caddy/Caddyfile        # put your real domain in
    sudo systemctl reload caddy

  Then in apps/api/.env:
    CORS_ORIGINS=https://yourdomain.com
    TRUSTED_PROXY_HEADER=x-forwarded-for
  and: sudo systemctl restart foundervoice

NEXT
