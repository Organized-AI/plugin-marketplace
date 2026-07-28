#!/usr/bin/env bash
# Provision the Meta side that CAN be automated: system user, asset assignment,
# and first token. The APP itself must be created in the dashboard first —
# there is no API for it. See the meta-app-preflight skill.
#
#   ./meta-provision.sh <business-id> <system-user-name> <admin-token>
#
# <admin-token> is a token for a business admin with business_management.
set -euo pipefail
BUSINESS="${1:?usage: meta-provision.sh <business-id> <system-user-name> <admin-token>}"
NAME="${2:?missing system user name}"
ADMIN_TOKEN="${3:?missing admin token}"
VERSION="${GRAPH_VERSION:-v25.0}"
G="https://graph.facebook.com/$VERSION"

need(){ command -v "$1" >/dev/null || { echo "missing: $1" >&2; exit 1; }; }
need curl; need python3

jqp(){ python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('$1',''))"; }

echo "==> creating system user '$NAME' in business $BUSINESS"
SU=$(curl -s -X POST "$G/$BUSINESS/system_users" \
  -d "name=$NAME" -d "role=ADMIN" -d "access_token=$ADMIN_TOKEN")
SU_ID=$(echo "$SU" | jqp id)
if [ -z "$SU_ID" ]; then
  echo "$SU" | python3 -m json.tool >&2
  echo "x could not create system user. Common causes: token lacks business_management," >&2
  echo "  the business has hit its system user cap (1 on Limited tier, 10 on Full)," >&2
  echo "  or the caller is not a business admin." >&2
  exit 1
fi
echo "    system_user_id: $SU_ID"

cat <<EOF

Next, assign assets to the system user. Each is a separate call — assign only
what this integration needs:

  # ad account
  curl -X POST "$G/<AD_ACCOUNT_ID>/assigned_users" \\
    -d "user=$SU_ID" -d "tasks=MANAGE" -d "access_token=\$ADMIN_TOKEN"

  # page
  curl -X POST "$G/<PAGE_ID>/assigned_users" \\
    -d "user=$SU_ID" -d "tasks=MANAGE" -d "access_token=\$ADMIN_TOKEN"

  # dataset (pixel)
  curl -X POST "$G/<DATASET_ID>/assigned_users" \\
    -d "user=$SU_ID" -d "tasks=ADVERTISE,ANALYZE" -d "access_token=\$ADMIN_TOKEN"

STILL MANUAL (no API exists):
  1. Add the system user as an App Admin:
     App Dashboard > App Settings > Roles > Roles > Add
     Token generation FAILS without this and the error is unhelpful.
  2. Generate the token:
     Business Settings > Users > System Users > $NAME > Generate New Token
     Select your app, select scopes, Generate.
     Choose the 60-day expiring option and schedule a refresh.

Then store it:
  wrangler secret put META_SYSTEM_USER_TOKEN --name <worker>
EOF
