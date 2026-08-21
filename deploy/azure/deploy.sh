#!/usr/bin/env bash
# Deploy the FounderVoice API to Azure Container Apps.
#
#   az login
#   GROQ_API_KEY=gsk_... bash deploy/azure/deploy.sh
#
# The Consumption plan includes 180,000 vCPU-seconds, 360,000 GiB-seconds and
# 2M requests per subscription per month at no charge. At 0.5 vCPU that is
# about 100 hours of running time, so the app MUST scale to zero to stay
# inside the grant - a single always-on replica would exhaust it in four days.
set -euo pipefail

RG="${RG:-foundervoice}"
LOCATION="${LOCATION:-centralindia}"
ENV_NAME="${ENV_NAME:-foundervoice-env}"
APP="${APP:-foundervoice-api}"
WEB_ORIGIN="${WEB_ORIGIN:-https://foundervoice.safeedges.in}"
CONTEXT="$(cd "$(dirname "$0")/../container" && pwd)"

say() { printf '\n==> %s\n' "$*"; }

command -v az >/dev/null 2>&1 || {
  echo "Azure CLI not found: https://aka.ms/azure-cli" >&2; exit 1; }
[ -n "${GROQ_API_KEY:-}" ] || {
  echo "Set GROQ_API_KEY first (free key: https://console.groq.com/keys)." >&2; exit 1; }

PY=$(command -v python3 || command -v python)
# Must stay stable across redeploys, or every visitor's free-tier counters
# reset to zero. Pass QUOTA_SECRET explicitly when redeploying.
QUOTA_SECRET="${QUOTA_SECRET:-$("$PY" -c 'import secrets; print(secrets.token_hex(32))')}"

say "Resource group $RG in $LOCATION"
az group create -n "$RG" -l "$LOCATION" -o none

say "Build and deploy (first run also creates the environment and registry)"
# --source builds in the cloud through ACR Tasks, so no local Docker daemon
# is needed. The context holds only the Dockerfile; it clones the app itself.
az containerapp up \
  --name "$APP" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --environment "$ENV_NAME" \
  --source "$CONTEXT" \
  --target-port 7860 \
  --ingress external \
  -o none

say "Secrets"
az containerapp secret set -n "$APP" -g "$RG" \
  --secrets groq-api-key="$GROQ_API_KEY" quota-secret="$QUOTA_SECRET" -o none

say "Configuration"
az containerapp update -n "$APP" -g "$RG" \
  --min-replicas 0 --max-replicas 1 \
  --set-env-vars \
    GROQ_API_KEY=secretref:groq-api-key \
    QUOTA_SECRET=secretref:quota-secret \
    CORS_ORIGINS="$WEB_ORIGIN" \
  -o none

FQDN=$(az containerapp show -n "$APP" -g "$RG" \
  --query properties.configuration.ingress.fqdn -o tsv)

say "Live"
echo "   https://$FQDN/api/health"
echo
echo "Then set in Vercel:"
echo "   NEXT_PUBLIC_API_BASE=https://$FQDN"
echo
echo "Keep this QUOTA_SECRET for future redeploys:"
echo "   $QUOTA_SECRET"
