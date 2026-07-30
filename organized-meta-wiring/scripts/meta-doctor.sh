#!/usr/bin/env bash
# Diagnose a Meta credential and a deployed Worker.
#   ./meta-doctor.sh <app-id> <app-secret> <token> [worker-url]
set -euo pipefail
APP_ID="${1:?usage: meta-doctor.sh <app-id> <app-secret> <token> [worker-url]}"
APP_SECRET="${2:?missing app secret}"
TOKEN="${3:?missing token}"
WORKER_URL="${4:-}"
VERSION="${GRAPH_VERSION:-v26.0}"

echo "== token =="
curl -s "https://graph.facebook.com/$VERSION/debug_token?input_token=$TOKEN&access_token=$APP_ID|$APP_SECRET" \
 | python3 -c "
import json,sys,datetime,time
d=json.load(sys.stdin).get('data',{})
if not d: print('  no data returned — app id/secret wrong, or token from another app'); raise SystemExit
exp=d.get('expires_at',0); now=int(time.time())
print('  type       :', d.get('type'))
print('  valid      :', d.get('is_valid'))
print('  app_id     :', d.get('app_id'))
if not exp:
    print('  expires    : never (non-expiring system user token)')
    print('  NOTE       : Meta now says some businesses MUST use expiring tokens.')
else:
    days=(exp-now)/86400
    print(f'  expires    : {datetime.datetime.utcfromtimestamp(exp).isoformat()}Z  ({days:.1f} days left)')
    if days < 0:   print('  ACTION     : EXPIRED. Token is forfeit — mint a new one.')
    elif days<15:  print('  ACTION     : refresh NOW; you are inside the danger window.')
    elif days<25:  print('  ACTION     : schedule a refresh soon.')
dae=d.get('data_access_expires_at',0)
if dae and dae<now: print('  WARNING    : data_access_expires_at has passed — token looks valid but user-data reads will fail.')
print('  scopes     :', ','.join(d.get('scopes',[])) or '(none)')
gran=d.get('granular_scopes',[])
if gran:
    print('  assets     :')
    for g in gran[:8]:
        ids=g.get('target_ids',[])
        print(f\"     {g.get('scope')}: {', '.join(ids[:4])}{' ...' if len(ids)>4 else '' if ids else '(all)'}\")
"

echo
echo "== rate limit snapshot =="
curl -s -D /tmp/mh -o /dev/null "https://graph.facebook.com/$VERSION/me?access_token=$TOKEN" || true
for h in x-app-usage x-business-use-case-usage x-ad-account-usage; do
  V=$(grep -i "^$h:" /tmp/mh 2>/dev/null | cut -d' ' -f2- || true)
  [ -n "$V" ] && echo "  $h: $V"
done
rm -f /tmp/mh
echo "  (values are PERCENTAGES of allowance; estimated_time_to_regain_access is MINUTES)"

if [ -n "$WORKER_URL" ]; then
  echo
  echo "== worker =="
  curl -s "$WORKER_URL/health" | python3 -c "
import json,sys
try: h=json.load(sys.stdin)
except Exception: print('  no JSON from /health'); raise SystemExit
print('  status :', h.get('status'))
for k,v in (h.get('checks') or {}).items(): print(f'  {k:10}:', v)
" || echo "  unreachable"
fi
