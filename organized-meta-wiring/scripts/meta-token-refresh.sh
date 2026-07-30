#!/usr/bin/env bash
# Roll a 60-day system user token. Meta returns a NEW token; the OLD one stays
# valid until its original expiry, so this is safe to run mid-flight.
#
#   ./meta-token-refresh.sh <app-id> <app-secret> <current-token> [worker-name]
set -euo pipefail
APP_ID="${1:?usage: meta-token-refresh.sh <app-id> <app-secret> <current-token> [worker-name]}"
APP_SECRET="${2:?missing app secret}"
CURRENT="${3:?missing current token}"
WORKER="${4:-}"
VERSION="${GRAPH_VERSION:-v26.0}"

echo "==> current token state"
curl -s "https://graph.facebook.com/$VERSION/debug_token?input_token=$CURRENT&access_token=$APP_ID|$APP_SECRET" \
 | python3 -c "
import json,sys,datetime
d=json.load(sys.stdin).get('data',{})
exp=d.get('expires_at',0)
print('   type      :', d.get('type'))
print('   app_id    :', d.get('app_id'))
print('   valid     :', d.get('is_valid'))
print('   expires   :', 'never' if not exp else datetime.datetime.utcfromtimestamp(exp).isoformat()+'Z')
dae=d.get('data_access_expires_at',0)
print('   data acc. :', 'n/a' if not dae else datetime.datetime.utcfromtimestamp(dae).isoformat()+'Z')
print('   scopes    :', ','.join(d.get('scopes',[])))
"

echo "==> refreshing"
NEW=$(curl -s "https://graph.facebook.com/$VERSION/oauth/access_token?grant_type=fb_exchange_token&client_id=$APP_ID&client_secret=$APP_SECRET&set_token_expires_in_60_days=true&fb_exchange_token=$CURRENT")
TOKEN=$(echo "$NEW" | python3 -c "import json,sys;print(json.load(sys.stdin).get('access_token',''))")
if [ -z "$TOKEN" ]; then
  echo "$NEW" | python3 -m json.tool >&2
  echo "x refresh failed. If the error is code 190 the token is already dead —" >&2
  echo "  refreshing cannot save it, mint a new one in Business Settings." >&2
  exit 1
fi
echo "    new token obtained, expires_in $(echo "$NEW" | python3 -c "import json,sys;print(json.load(sys.stdin).get('expires_in','?'))")s"

if [ -n "$WORKER" ]; then
  printf '%s' "$TOKEN" | wrangler secret put META_SYSTEM_USER_TOKEN --name "$WORKER"
  echo "    uploaded to worker $WORKER"
else
  echo
  echo "    $TOKEN"
fi

cat <<EOF

The OLD token is still valid until its original expiry. Verify the new one
works, then revoke the old one explicitly:

  curl -s "https://graph.facebook.com/$VERSION/oauth/revoke?client_id=$APP_ID&client_secret=$APP_SECRET&revoke_token=<OLD>&access_token=<NEW>"
EOF
