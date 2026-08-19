#!/usr/bin/env bash
#
# Puts the API behind HTTPS. Run AFTER oracle-setup.sh, and only once
# api.foundervoice.safeedges.in resolves to this box — Caddy proves ownership
# over port 80 and fails if the A record is not live.
#
#   bash ~/voicecoach/deploy/tls-setup.sh
#
# Idempotent.

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/voicecoach}"
API_DIR="$APP_DIR/apps/api"
API_HOST="${API_HOST:-api.foundervoice.safeedges.in}"
WEB_ORIGIN="${WEB_ORIGIN:-https://foundervoice.safeedges.in}"

say() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

say "Checking DNS for $API_HOST"
MYIP=$(curl -fsS --max-time 10 https://api.ipify.org || echo "?")
RESOLVED=$(getent hosts "$API_HOST" | awk '{print $1}' | head -1 || true)
echo "   this box : $MYIP"
echo "   DNS says : ${RESOLVED:-<nothing>}"
if [ -z "$RESOLVED" ]; then
  echo "!! $API_HOST does not resolve. Add the A record and wait a few minutes." >&2
  exit 1
fi
if [ "$RESOLVED" != "$MYIP" ] && [ "$MYIP" != "?" ]; then
  echo "!! DNS points at $RESOLVED, not this box. Certificate issuance will fail." >&2
  exit 1
fi

say "Installing Caddy"
if command -v apt-get >/dev/null 2>&1; then
  if ! command -v caddy >/dev/null 2>&1; then
    sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
      | sudo gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
      | sudo tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    sudo apt-get update && sudo apt-get install -y caddy
  fi
else
  # Caddy is not in Oracle Linux's repos; COPR carries the official build.
  if ! command -v caddy >/dev/null 2>&1; then
    sudo dnf -y install 'dnf-command(copr)'
    sudo dnf -y copr enable @caddy/caddy epel-9-$(uname -m)
    sudo dnf -y install caddy
  fi
fi

say "Configuration"
sudo cp "$APP_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
sudo systemctl enable --now caddy
sudo systemctl reload caddy || sudo systemctl restart caddy

say "Pointing the API at its real origin"
# CORS must name the web origin, and the quota must read the client IP from
# Caddy rather than the socket — behind a proxy every request otherwise looks
# like it came from 127.0.0.1 and would share one exempt bucket.
sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=$WEB_ORIGIN|" "$API_DIR/.env"
sed -i "s|^TRUSTED_PROXY_HEADER=.*|TRUSTED_PROXY_HEADER=x-forwarded-for|" "$API_DIR/.env"
sudo systemctl restart foundervoice

say "Waiting for the certificate (up to 60s)"
for i in $(seq 1 12); do
  if curl -fsS --max-time 8 "https://$API_HOST/api/health" >/dev/null 2>&1; then
    echo "   certificate live"
    break
  fi
  sleep 5
done

say "Result"
curl -fsS "https://$API_HOST/api/health" && echo || {
  echo "!! Not serving yet. Check: sudo journalctl -u caddy -n 40 --no-pager"; exit 1;
}

cat <<NEXT

  API is live at https://$API_HOST

  Set these in Vercel (Project -> Settings -> Environment Variables),
  then redeploy:

    NEXT_PUBLIC_API_BASE=https://$API_HOST
    NEXT_PUBLIC_SITE_URL=$WEB_ORIGIN

NEXT
