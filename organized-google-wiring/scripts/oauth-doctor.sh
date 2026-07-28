#!/usr/bin/env bash
# Diagnose a deployed Google-backed Worker.
#   ./oauth-doctor.sh https://my-worker.subdomain.workers.dev [session-cookie]
set -euo pipefail
B="${1:?usage: oauth-doctor.sh <worker-url> [go_session cookie value]}"
COOKIE="${2:-}"

echo "== /health =="
curl -s "$B/health" | python3 -c "
import json,sys
try: h=json.load(sys.stdin)
except Exception: print('  no JSON from /health — is the Worker deployed?'); sys.exit()
print('  status :', h.get('status'))
c=h.get('checks',{})
for k in ('d1','kv','assets','queue'):
    if k in c: print(f'  {k:7}:', c[k])
s=c.get('secrets',{})
print('  secrets:', 'all set' if s.get('configured') else 'MISSING ' + ', '.join(s.get('missing',[])))
w=c.get('token_age_warning')
if w: print('  WARNING:', w)
"

if [[ -n "$COOKIE" ]]; then
  echo
  echo "== what the Worker sends to Google =="
  LOC=$(curl -s -o /dev/null -w "%{redirect_url}" -H "cookie: go_session=$COOKIE" "$B/oauth/start?caps=mail.read" || true)
  if [[ -z "$LOC" ]]; then
    echo "  /oauth/start did not redirect — check the session cookie and that GOOGLE_CLIENT_ID is set"
  else
    python3 - "$LOC" <<'PY'
import sys,urllib.parse as u
q=u.parse_qs(u.urlparse(sys.argv[1]).query)
cid=q.get('client_id',['?'])[0]
print('  client_id   :', cid)
print('  project no. :', cid.split('-')[0], '(must be the project whose APIs you enabled)')
print('  redirect_uri:', q.get('redirect_uri',['?'])[0])
print('  pkce        :', q.get('code_challenge_method',['none'])[0])
print('  access_type :', q.get('access_type',['?'])[0], '(must be offline for refresh tokens)')
print('  prompt      :', q.get('prompt',['?'])[0], '(consent guarantees a refresh token)')
PY
    echo
    echo "  Paste that exact redirect_uri into the client's Authorised redirect URIs."
    echo "  Do NOT judge health by fetching the auth URL — Google serves sign-in before validating it."
  fi
else
  echo
  echo "(pass a go_session cookie value as arg 2 to inspect the outgoing OAuth request)"
fi
