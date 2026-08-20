#!/usr/bin/env bash
# Keep asking Oracle for an Always Free ARM instance until one is granted.
#
# Run this in the OCI Cloud Shell (the >_ icon in the console top bar):
#
#   cat > ~/fv.pub <<'EOF'
#   <paste your SSH public key on one line>
#   EOF
#   curl -fsSL https://raw.githubusercontent.com/piyushshukla599/FOUNDERVOICE/main/deploy/oracle-arm-retry.sh | bash
#
# Cloud Shell is already authenticated, so there is nothing to configure.
# It idles out after ~20 min of no keystrokes, so leave the tab focused.
set -uo pipefail

OCPUS="${OCPUS:-1}"
MEM_GB="${MEM_GB:-6}"
BOOT_GB="${BOOT_GB:-50}"
NAME="${NAME:-foundervoice-arm}"
SLEEP="${SLEEP:-60}"
PUBKEY_FILE="${PUBKEY_FILE:-$HOME/fv.pub}"

say() { printf '\n==> %s\n' "$*"; }
die() { printf '\n!! %s\n' "$*" >&2; exit 1; }

[ -s "$PUBKEY_FILE" ] || die "No SSH public key at $PUBKEY_FILE. See the header of this script."
PUBKEY=$(tr -d '\r\n' < "$PUBKEY_FILE")
case "$PUBKEY" in
  ssh-rsa*|ssh-ed25519*|ecdsa-sha2-*) ;;
  *) die "$PUBKEY_FILE does not look like a public key. It must start with ssh-rsa or ssh-ed25519." ;;
esac

COMP="${COMPARTMENT_OCID:-${OCI_TENANCY:-}}"
[ -n "$COMP" ] || die "Could not determine a compartment. Set COMPARTMENT_OCID and re-run."

say "Reusing the network of your existing instance"
# Everything except the shape is copied from the box that already works, so the
# new instance lands in the same VCN/subnet and keeps the same security rules.
INST_ID=$(oci compute instance list -c "$COMP" --lifecycle-state RUNNING \
  --query 'data[0].id' --raw-output 2>/dev/null || true)
[ -n "$INST_ID" ] || die "No running instance found in this compartment to copy the subnet from."

SUBNET=$(oci compute instance list-vnics --instance-id "$INST_ID" \
  --query 'data[0]."subnet-id"' --raw-output)
[ -n "$SUBNET" ] || die "Could not read the subnet of $INST_ID."
echo "    subnet $SUBNET"

say "Finding the newest Ubuntu 22.04 ARM image"
IMAGE=$(oci compute image list -c "$COMP" \
  --operating-system "Canonical Ubuntu" --operating-system-version "22.04" \
  --shape VM.Standard.A1.Flex --sort-by TIMECREATED --sort-order DESC \
  --query 'data[0].id' --raw-output)
[ -n "$IMAGE" ] || die "No Ubuntu 22.04 ARM image available in this region."
echo "    image $IMAGE"

say "Availability domains to rotate through"
mapfile -t ADS < <(oci iam availability-domain list --query 'data[].name' --raw-output \
  | tr -d '[]", ' | grep -v '^$')
[ "${#ADS[@]}" -gt 0 ] || die "Could not list availability domains."
printf '    %s\n' "${ADS[@]}"

# If a previous run already succeeded, stop rather than burning the free quota
# on a second instance.
EXISTING=$(oci compute instance list -c "$COMP" --display-name "$NAME" \
  --lifecycle-state RUNNING --query 'data[0].id' --raw-output 2>/dev/null || true)
if [ -n "$EXISTING" ]; then
  say "$NAME already exists and is running"
  oci compute instance list-vnics --instance-id "$EXISTING" \
    --query 'data[0]."public-ip"' --raw-output
  exit 0
fi

say "Asking for ${OCPUS} OCPU / ${MEM_GB} GB. Ctrl-C to give up."
ATTEMPT=0
while :; do
  for AD in "${ADS[@]}"; do
    ATTEMPT=$((ATTEMPT + 1))
    printf '[%s] attempt %d in %s ... ' "$(date +%H:%M:%S)" "$ATTEMPT" "$AD"

    OUT=$(oci compute instance launch \
      --compartment-id "$COMP" \
      --availability-domain "$AD" \
      --shape VM.Standard.A1.Flex \
      --shape-config "{\"ocpus\":$OCPUS,\"memoryInGBs\":$MEM_GB}" \
      --image-id "$IMAGE" \
      --subnet-id "$SUBNET" \
      --assign-public-ip true \
      --display-name "$NAME" \
      --boot-volume-size-in-gbs "$BOOT_GB" \
      --metadata "{\"ssh_authorized_keys\":\"$PUBKEY\"}" \
      --wait-for-state RUNNING 2>&1)

    if [ $? -eq 0 ]; then
      NEW_ID=$(printf '%s' "$OUT" | grep -o 'ocid1\.instance\.[a-z0-9.-]*' | head -1)
      say "Got one."
      echo "    instance $NEW_ID"
      echo -n "    public IP: "
      oci compute instance list-vnics --instance-id "$NEW_ID" \
        --query 'data[0]."public-ip"' --raw-output
      echo
      echo "Next: ssh -i <your key> ubuntu@<that IP>"
      exit 0
    fi

    if printf '%s' "$OUT" | grep -qi 'out of host capacity'; then
      echo "no capacity"
    elif printf '%s' "$OUT" | grep -qi 'LimitExceeded\|QuotaExceeded'; then
      say "Quota, not capacity - retrying will never help:"
      printf '%s\n' "$OUT" | tail -5
      exit 1
    else
      say "Unexpected error:"
      printf '%s\n' "$OUT" | tail -20
      exit 1
    fi
  done
  sleep "$SLEEP"
done
