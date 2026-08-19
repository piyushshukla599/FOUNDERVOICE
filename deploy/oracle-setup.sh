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
sudo apt-get update -qq
# ffmpeg is not in requirements.txt, but librosa needs it to decode the .webm
# the browser records. Without it every upload fails at the decode step.
sudo apt-get install -y -qq python3-venv python3-dev build-essential ffmpeg git curl

say "Source"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi

say "Python environment (this pulls ~1 GB of wheels; give it a few minutes)"
[ -d "$API_DIR/.venv" ] || python3 -m venv "$API_DIR/.venv"
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
sudo iptables -C INPUT -p tcp --dport 80 -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -C INPUT -p tcp --dport 443 -j ACCEPT 2>/dev/null || \
  sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save >/dev/null 2>&1 || true

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
