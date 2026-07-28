#!/usr/bin/env bash
# Upload Google OAuth client credentials to a Worker and verify.
#   ./set-google-secrets.sh <worker-name> <client_secret.json>
#   ./set-google-secrets.sh <worker-name>            # prompts
set -euo pipefail
WORKER="${1:?usage: set-google-secrets.sh <worker-name> [client_secret.json]}"
SRC="${2:-}"

if [[ -n "$SRC" && -f "$SRC" ]]; then
  KIND=$(python3 -c "import json,sys;print(list(json.load(open(sys.argv[1])))[0])" "$SRC")
  if [[ "$KIND" != "web" ]]; then
    echo "x This is a '$KIND' client. Only 'web' clients can hold an https redirect URI." >&2
    echo "  Create a new OAuth client of type 'Web application'." >&2
    exit 1
  fi
  CID=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['web']['client_id'])" "$SRC")
  SEC=$(python3 -c "import json,sys;print(json.load(open(sys.argv[1]))['web']['client_secret'])" "$SRC")
  echo "-> web client from $(basename "$SRC")"
  python3 -c "
import json,sys
u=json.load(open(sys.argv[1]))['web'].get('redirect_uris',[])
print('   redirect_uris registered:', u or 'NONE — this will fail with redirect_uri_mismatch')" "$SRC"
else
  read -rp "GOOGLE_CLIENT_ID: " CID
  read -rsp "GOOGLE_CLIENT_SECRET: " SEC; echo
fi

[[ "$CID" == *.apps.googleusercontent.com ]] || { echo "x not a Google client id" >&2; exit 1; }

printf '%s' "$CID" | wrangler secret put GOOGLE_CLIENT_ID --name "$WORKER"
printf '%s' "$SEC" | wrangler secret put GOOGLE_CLIENT_SECRET --name "$WORKER"

BACKUP="$HOME/.$WORKER/secrets.env"
mkdir -p "$(dirname "$BACKUP")"; chmod 700 "$(dirname "$BACKUP")"
TMP=$(mktemp); grep -v '^GOOGLE_CLIENT_' "$BACKUP" 2>/dev/null > "$TMP" || true
{ cat "$TMP"; printf 'GOOGLE_CLIENT_ID=%s\nGOOGLE_CLIENT_SECRET=%s\n' "$CID" "$SEC"; } > "$BACKUP"
rm -f "$TMP"; chmod 600 "$BACKUP"
echo "-> secrets uploaded; backup at $BACKUP"
echo "-> waiting for rollout"; sleep 25
echo "-> run ./oauth-doctor.sh https://$WORKER.<subdomain>.workers.dev to verify"
