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

say() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

say "System packages"
# Oracle's default image is Oracle Linux (login: opc); Ubuntu is opt-in
# (login: ubuntu). Both are offered on the same Always Free shape, so detect
# rather than assume - an apt-only script dies on line one under Oracle Linux.
#
# ffmpeg is the package that matters most here: it is not in requirements.txt,
# but librosa needs it to decode the .webm the browser records. Without it
# every single upload fails at the decode step.
if command -v apt-get >/dev/null 2>&1; then
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3-venv python3-dev build-essential ffmpeg git curl
elif command -v dnf >/dev/null 2>&1; then
  sudo dnf install -y -q oracle-epel-release-el9 2>/dev/null || sudo dnf install -y -q epel-release 2>/dev/null || true
  # ffmpeg is not in Oracle Linux's own repos; RPM Fusion carries it.
  sudo dnf install -y -q --nogpgcheck "https://mirrors.rpmfusion.org/free/el/rpmfusion-free-release-$(rpm -E %rhel).noarch.rpm" 2>/dev/null || true
  # EL9 ships Python 3.9, but numpy 2.2 requires 3.10+. Pull a newer
  # interpreter alongside it rather than fighting pip resolution later.
  sudo dnf install -y -q python3.12 python3.12-devel 2>/dev/null || sudo dnf install -y -q python3.11 python3.11-devel 2>/dev/null || true
  sudo dnf install -y -q python3 python3-devel gcc gcc-c++ make git curl
  sudo dnf install -y -q ffmpeg-free || sudo dnf install -y -q ffmpeg || {
    echo "!! ffmpeg could not be installed. Uploads will fail to decode."
    echo "   Install it by hand before taking traffic."
  }
else
  echo "Unsupported distro: need apt-get or dnf." >&2; exit 1
fi
command -v ffmpeg >/dev/null || echo "!! WARNING: ffmpeg missing - audio decode will fail."

say "Source"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi

say "Python environment (this pulls ~1 GB of wheels; give it a few minutes)"
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
"$API_DIR/.venv/bin/pip" install -q --upgrade pip
"$API_DIR/.venv/bin/pip" install -q -r "$API_DIR/requirements.txt"

say "Configuration"
if [ ! -f "$API_DIR/.env" ]; then
  cp "$API_DIR/.env.example" "$API_DIR/.env"
  # base runs in ~1 GB and transcribes a 2-minute clip in seconds on 2 ARM
  # cores. large-v3 wants ~3 GB and is several times slower — not a starting
  # point for a shared box.
  sed -i 's|^WHISPER_MODEL=.*|WHISPER_MODEL=base|' "$API_DIR/.env"
  # A stable secret is what makes the free-tier counters survive a restart.
  SECRET=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
  sed -i "s|^QUOTA_SECRET=.*|QUOTA_SECRET=$SECRET|" "$API_DIR/.env"
  sed -i 's|^API_DOCS_ENABLED=.*|API_DOCS_ENABLED=false|' "$API_DIR/.env"
  echo "   wrote $API_DIR/.env with a fresh QUOTA_SECRET"
else
  echo "   $API_DIR/.env exists — left untouched"
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
