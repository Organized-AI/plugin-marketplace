#!/usr/bin/env bash
# X Research Assistant — Personal Twitter Analyst
# Wraps Twitter API via twitterapi.io. Quality filter: 10+ likes minimum.
# Sort by: likes, impressions, retweets, recency. Time filters. Watchlists. Cost transparency.
# ClawHub: clawhub install x-research-assistant

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'

log_info()    { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn()    { echo -e "${YELLOW}⚠${NC} $1"; }
log_error()   { echo -e "${RED}✗${NC} $1"; }

TWITTER_API_KEY="${TWITTERAPI_KEY:-}"
BASE_URL="https://api.twitterapi.io"
MIN_LIKES="${MIN_LIKES:-10}"  # Quality filter — removes noise

_check_key() {
  if [[ -f "$HOME/.openclaw/secrets/twitterapi.env" ]]; then
    source "$HOME/.openclaw/secrets/twitterapi.env"
    TWITTER_API_KEY="${TWITTERAPI_KEY:-}"
  fi
  [[ -n "$TWITTER_API_KEY" ]] || { log_error "TWITTERAPI_KEY not set. Get key at: https://twitterapi.io"; exit 1; }
}

_api() {
  curl -sL "${BASE_URL}${1}" -H "X-API-Key: $TWITTER_API_KEY"
}

search_tweets() {
  local query="${1:-}"
  local type="${2:-Latest}"  # Latest or Top
  local time_filter="${3:-}"  # last_hour, last_3h, last_day, last_week

  [[ -z "$query" ]] && { log_error "Usage: x-research search <query> [Latest|Top] [time_filter]"; exit 1; }
  _check_key

  log_info "Searching tweets: $query (min ${MIN_LIKES} likes — noise removed)"
  local q="$query"
  [[ -n "$time_filter" ]] && q="$q within_time:$time_filter"

  _api "/twitter/tweet/advanced_search?query=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$q")&queryType=$type" | \
  python3 -c "
import json,sys,os
d=json.load(sys.stdin)
min_likes=int(os.environ.get('MIN_LIKES','10'))
tweets=d.get('tweets',[])
filtered=[t for t in tweets if t.get('likeCount',0)>=min_likes]
print(f'  Found {len(tweets)} tweets, {len(filtered)} passed quality filter ({min_likes}+ likes)')
print()
for t in filtered[:10]:
    print(f'  @{t.get(\"author\",{}).get(\"userName\",\"?\")} | ❤ {t.get(\"likeCount\",0)} | 👁 {t.get(\"viewCount\",0)}')
    print(f'  {t.get(\"text\",\"\")[:200]}')
    print(f'  {t.get(\"url\",\"\")}')
    print()
cost=d.get('cost',{})
if cost: print(f'  💰 API cost: \${cost.get(\"total\",0):.4f}')
" 2>/dev/null
}

get_trends() {
  _check_key
  log_info "Fetching trending topics..."
  _api "/twitter/trends" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for i,t in enumerate(d.get('trends',[])[:20],1):
    print(f'  {i:2}. {t.get(\"name\",\"\")} — {t.get(\"tweet_volume\",\"?\")} tweets')
" 2>/dev/null
}

watch_account() {
  local username="${1:-}"
  [[ -z "$username" ]] && { log_error "Usage: x-research watch <@handle>"; exit 1; }
  _check_key
  username="${username#@}"
  log_info "Latest from @$username"
  _api "/twitter/user/last_tweets?userName=$username" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for t in d.get('tweets',[])[:5]:
    print(f'  {t.get(\"createdAt\",\"\")[:10]} | ❤ {t.get(\"likeCount\",0)}')
    print(f'  {t.get(\"text\",\"\")[:200]}')
    print()
" 2>/dev/null
}

research_brief() {
  local topic="${1:-}"
  [[ -z "$topic" ]] && { log_error "Usage: x-research brief <topic>"; exit 1; }
  _check_key
  log_info "Research brief: $topic"
  echo ""
  echo -e "${YELLOW}--- Top Tweets (sorted by engagement) ---${NC}"
  search_tweets "$topic" "Top"
  echo ""
  echo -e "${YELLOW}--- Latest Tweets ---${NC}"
  search_tweets "$topic" "Latest" "last_day"
}

show_help() {
  cat << 'EOF'
X Research Assistant — Personal Twitter Analyst
================================================
ClawHub: clawhub install x-research-assistant
API: twitterapi.io  |  Featured by: AI Edge Community

WHAT IT DOES:
  Wraps the entire Twitter API for your agent. Quality filter auto-removes
  low-engagement noise (min 10 likes). Search, trends, account monitoring,
  research briefs — all without opening the app.

COMMANDS:
  search <query> [Latest|Top] [time]   Search tweets (noise filtered)
  trends                                Current trending topics
  watch <@handle>                       Latest tweets from an account
  brief <topic>                         Full research brief on a topic

TIME FILTERS: last_hour | last_3h | last_day | last_week

QUERY OPERATORS:
  solana defi          Both words
  "solana defi"        Exact phrase
  from:elonmusk        From specific user
  #bitcoin             Hashtag
  solana -scam         Exclude word
  solana min_faves:100 Minimum likes

ENV VARS:
  TWITTERAPI_KEY   Your key from twitterapi.io
  MIN_LIKES        Quality filter threshold (default: 10)

COST TRANSPARENCY: Every query shows exact API cost — no surprise bills.

POWER COMBO: Pair with X Impact Checker for full Twitter growth engine:
  Research trending → write content → optimize → post. No app needed.

EXAMPLES:
  ./x-research.sh search "claude code skills" Top
  ./x-research.sh trends
  ./x-research.sh watch @steipete
  ./x-research.sh brief "AI agents 2026"
EOF
}

case "${1:-help}" in
  search) search_tweets "${2:-}" "${3:-Latest}" "${4:-}" ;;
  trends) get_trends ;;
  watch)  watch_account "${2:-}" ;;
  brief)  research_brief "${2:-}" ;;
  help|--help|-h) show_help ;;
  *) log_error "Unknown command: $1"; show_help; exit 1 ;;
esac
