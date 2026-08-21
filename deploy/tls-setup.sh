#!/usr/bin/env bash
#
# Puts the API behind HTTPS. Run AFTER oracle-setup.sh, and only once
# api-foundervoice.safeedges.in resolves to this box — Caddy proves ownership
# over port 80 and fails if the A record is not live.
#
#   bash ~/voicecoach/deploy/tls-setup.sh
#
# Idempotent.

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/voicecoach}"
API_DIR="$APP_DIR/apps/api"
API_HOST="${API_HOST:-api-foundervoice.safeedges.in}"
WEB_ORIGIN="${WEB_ORIGIN:-https://foundervoice.safeedges.in}"

say() { printf '\n\033[1;35m==>\033[0m %s\n' "$1"; }

say "Checking DNS for $API_HOST"
# These pipelines legitimately produce no output, and grep -v exits 1 when it
# filters everything out. Under pipefail that aborts the script before it can
# report anything - the no-AAAA case is exactly what we want to succeed.
MYIP=$(curl -fsS --max-time 10 https://api.ipify.org || echo "?")
V4=$(getent ahostsv4 "$API_HOST" 2>/dev/null | awk '{print $1}' | sort -u || true)
V6=$(getent ahostsv6 "$API_HOST" 2>/dev/null | awk '{print $1}' | grep -v '^::ffff:' | sort -u || true)
echo "   this box : $MYIP"
echo "   A    -> ${V4:-<none>}"
echo "   AAAA -> ${V6:-<none>}"

if [ -z "$V4" ]; then
  echo "!! $API_HOST has no A record. Add it and wait a few minutes." >&2
  exit 1
fi
# An AAAA left over from shared hosting is the quiet killer: this box has no
# IPv6, so anything preferring it - Let's Encrypt included - reaches the wrong
# server and the failure never mentions DNS.
if [ -n "$V6" ]; then
  echo "!! $API_HOST still has AAAA (IPv6) records:" >&2
  echo "$V6" | sed 's/^/     /' >&2
  echo "   This box has no IPv6, so certificate issuance will fail." >&2
  echo "   Delete them in your DNS editor, then re-run." >&2
  exit 1
fi
if [ "$MYIP" != "?" ] && ! echo "$V4" | grep -qx "$MYIP"; then
  echo "!! DNS points at:" >&2
  echo "$V4" | sed 's/^/     /' >&2
  echo "   but this box is $MYIP. Certificate issuance will fail." >&2
  exit 1
fi
if [ "$(echo "$V4" | wc -l)" -gt 1 ]; then
  echo "!! More than one A record; leave exactly one pointing here." >&2
  exit 1
fi
echo "   DNS OK"

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
  # Caddy is not in Oracle Linux's repos, and enabling COPR means another large
  # dnf transaction - the step that repeatedly took this instance offline. The
  # official static binary needs only curl.
  if ! command -v caddy >/dev/null 2>&1; then
    case "$(uname -m)" in
      x86_64)  CADDY_ARCH=amd64 ;;
      aarch64) CADDY_ARCH=arm64 ;;
      *) echo "Unsupported architecture: $(uname -m)" >&2; exit 1 ;;
    esac
    echo "   downloading the official static build ($CADDY_ARCH)"
    curl -fsSL "https://caddyserver.com/api/download?os=linux&arch=$CADDY_ARCH" -o /tmp/caddy
    sudo install -m 0755 /tmp/caddy /usr/local/bin/caddy
    rm -f /tmp/caddy

    id caddy >/dev/null 2>&1 || sudo useradd --system \
      --home-dir /var/lib/caddy --shell /sbin/nologin caddy
    sudo mkdir -p /etc/caddy /var/lib/caddy
    sudo chown -R caddy:caddy /var/lib/caddy

    # Same SELinux trap as the API service: systemd cannot exec a binary whose
    # label says otherwise, and the failure reads as "Permission denied".
    if command -v selinuxenabled >/dev/null 2>&1 && selinuxenabled 2>/dev/null; then
      sudo chcon -t bin_t /usr/local/bin/caddy || true
    fi

    # The distro packages ship a unit; a bare binary does not.
    sudo tee /etc/systemd/system/caddy.service >/dev/null <<'UNIT'
[Unit]
Description=Caddy
Documentation=https://caddyserver.com/docs/
After=network.target

[Service]
User=caddy
Group=caddy
Environment=XDG_DATA_HOME=/var/lib/caddy
ExecStart=/usr/local/bin/caddy run --config /etc/caddy/Caddyfile
ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile --force
Restart=on-failure
TimeoutStopSec=5s
LimitNOFILE=1048576
# Lets an unprivileged process bind 80 and 443 without setcap, which would
# need another package installed.
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
UNIT
    sudo systemctl daemon-reload
  fi
fi

say "Configuration"
# The template is domain-agnostic; a plain copy would have kept whatever
# hostname happened to be committed and issued a certificate for that
# instead of $API_HOST.
sed "s|API_HOST_PLACEHOLDER|$API_HOST|" "$APP_DIR/deploy/Caddyfile" \n  | sudo tee /etc/caddy/Caddyfile >/dev/null
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
