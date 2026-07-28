#!/usr/bin/env bash
# Provision everything that CAN be automated for a Google-backed Cloudflare Worker.
#
#   ./gcp-provision.sh <worker-name> <gcp-project-id> <api...>
#   ./gcp-provision.sh my-ga4-worker my-ga4-proj analytics-data analytics-admin
#
# Creates: GCP project (if absent), enables the APIs, creates D1 + KV,
# applies the schema, generates and uploads VAULT_MASTER_KEY / SESSION_SECRET.
#
# It does NOT create the OAuth client. Nothing can — see google-oauth-preflight.
set -euo pipefail

WORKER="${1:?usage: gcp-provision.sh <worker-name> <gcp-project-id> [api ...]}"
PROJECT="${2:?missing gcp project id}"
shift 2
APIS=("$@")

HERE="$(cd "$(dirname "$0")" && pwd)"
CATALOGUE="$HERE/../mcp/api-catalogue.json"

need() { command -v "$1" >/dev/null || { echo "missing dependency: $1" >&2; exit 1; }; }
need wrangler; need python3; need openssl

# ---- token: gcloud user creds often need reauth; ADC usually still works ----
TOK="$(gcloud auth application-default print-access-token 2>/dev/null || true)"
if [[ -z "$TOK" ]]; then
  echo "No Google credentials. Run: gcloud auth application-default login" >&2; exit 1
fi

echo "==> resolving services for: ${APIS[*]:-none}"
SERVICES=$(python3 - "$CATALOGUE" "${APIS[@]}" <<'PY'
import json,sys
cat=json.load(open(sys.argv[1]))
out=[]
for a in sys.argv[2:]:
    api=cat['apis'].get(a)
    if not api: print(f"# unknown api id: {a}", file=sys.stderr); continue
    if api['service']: out.append(api['service'])
print(' '.join(sorted(set(out))))
PY
)
echo "    $SERVICES"

echo "==> project $PROJECT"
if ! curl -sf -H "Authorization: Bearer $TOK" \
     "https://cloudresourcemanager.googleapis.com/v1/projects/$PROJECT" >/dev/null; then
  ORG="${GCP_ORG_ID:-}"
  PARENT=""
  [[ -n "$ORG" ]] && PARENT=",\"parent\":{\"type\":\"organization\",\"id\":\"$ORG\"}"
  curl -s -X POST -H "Authorization: Bearer $TOK" -H "Content-Type: application/json" \
    "https://cloudresourcemanager.googleapis.com/v1/projects" \
    -d "{\"projectId\":\"$PROJECT\",\"name\":\"$PROJECT\"$PARENT}" >/dev/null
  echo "    created, waiting..."; sleep 25
else
  echo "    already exists"
fi

for S in $SERVICES; do
  echo "==> enabling $S"
  curl -s -X POST -H "Authorization: Bearer $TOK" \
    "https://serviceusage.googleapis.com/v1/projects/$PROJECT/services/$S:enable" -d '{}' >/dev/null
done

echo "==> Cloudflare D1"
D1_JSON=$(wrangler d1 create "$WORKER" 2>&1 || true)
D1_ID=$(wrangler d1 list --json 2>/dev/null | python3 -c "
import json,sys
for d in json.load(sys.stdin):
    if d['name']=='$WORKER': print(d['uuid']); break")
echo "    database_id: ${D1_ID:-FAILED}"

echo "==> Cloudflare KV"
KV_ID=$(wrangler kv namespace create "${WORKER}-CACHE" 2>/dev/null \
  | grep -oE '[0-9a-f]{32}' | head -1 || true)
if [[ -z "$KV_ID" ]]; then
  KV_ID=$(wrangler kv namespace list 2>/dev/null | python3 -c "
import json,sys
try:
  for n in json.load(sys.stdin):
    if n['title'].endswith('${WORKER}-CACHE'): print(n['id']); break
except Exception: pass")
fi
echo "    kv id: ${KV_ID:-FAILED}"

echo "==> schema"
SCHEMA="$HERE/../skills/google-worker-scaffold/template/schema.sql"
[[ -f "$SCHEMA" ]] && wrangler d1 execute "$WORKER" --remote --file "$SCHEMA" >/dev/null && echo "    applied" \
  || echo "    schema.sql not found, skipping"

echo "==> secrets"
BACKUP="$HOME/.$WORKER/secrets.env"
mkdir -p "$(dirname "$BACKUP")"; chmod 700 "$(dirname "$BACKUP")"
VMK=$(openssl rand -base64 32); SS=$(openssl rand -base64 32)
printf '%s' "$VMK" | wrangler secret put VAULT_MASTER_KEY --name "$WORKER" >/dev/null 2>&1 || \
  echo "    (deploy the Worker once, then re-run to upload secrets)"
printf '%s' "$SS"  | wrangler secret put SESSION_SECRET   --name "$WORKER" >/dev/null 2>&1 || true
printf 'VAULT_MASTER_KEY=%s\nSESSION_SECRET=%s\n' "$VMK" "$SS" > "$BACKUP"; chmod 600 "$BACKUP"
echo "    backup: $BACKUP"

cat <<EOF

Paste into wrangler.jsonc:

  "d1_databases": [{ "binding": "DB", "database_name": "$WORKER", "database_id": "$D1_ID" }],
  "kv_namespaces": [{ "binding": "CACHE", "id": "$KV_ID" }]

Still manual (no API exists for it) — create the OAuth Web application client:
  https://console.cloud.google.com/auth/branding?project=$PROJECT   -> External
  https://console.cloud.google.com/auth/audience?project=$PROJECT   -> PUBLISH APP (or tokens die in 7 days)
  https://console.cloud.google.com/auth/clients?project=$PROJECT    -> Web application
  redirect URI: https://$WORKER.<your-subdomain>.workers.dev/oauth/callback

Then: ./set-google-secrets.sh $WORKER ~/Downloads/client_secret_*.json
EOF
