# ClawHub Skills Plugin

Top 13 ClawHub skills for OpenClaw / Claude Code agents. Sourced from the official openclaw/skills registry.

## Skills Included

| Skill | What it does | ClawHub Rank |
|-------|-------------|-------------|
| larry | TikTok slideshow marketing engine | — |
| capability-evolver | Self-upgrading meta-skill | #1 (35k downloads) |
| qmd | Token killer — 70% reduction via BM25+vector | — |
| anti-ai-slop | Strips 24 AI writing tells + code slop | — |
| brave-search | Free web search ($5/mo credit) | — |
| gog | Google Workspace CLI (Gmail, Calendar, Drive, Sheets, Docs) | — |
| x-research | Twitter analyst with quality filter | — |
| bite-rover | Persistent memory across sessions | #3 (16k downloads) |
| whatsapp-cli | WhatsApp bridge | #2 (16.4k downloads) |
| playwright | Full Chrome browser automation + stealth | — |
| mission-control | Daily intel dashboard | — |
| x-impact-checker | Tweet optimizer vs real Twitter algorithm | — |

## Power Combos

- **Morning Intel**: mission-control + gog + x-research
- **Twitter Growth**: x-research + x-impact-checker
- **Token Savings**: qmd + bite-rover
- **Content Pipeline**: larry + anti-ai-slop + brave-search
- **Self-Improving Agent**: capability-evolver (run daily)

## Usage

Each skill has a `SKILL.md` at root and a CLI bash tool in `scripts/`.

Load any skill into your agent:
```
/skill load clawhub-skills/<skill-name>
```

Or reference the skill path directly in CLAUDE.md.

## ENV Vars

See `skills/brave-search/SKILL.md`, `skills/larry/SKILL.md` etc. for per-skill env requirements.
Quick reference:
- `BRAVE_SEARCH_API_KEY` — brave-search
- `TWITTERAPI_KEY` — x-research, x-impact-checker
- `OPENAI_API_KEY` + `POSTIZ_API_KEY` — larry
- `A2A_NODE_ID` — capability-evolver
- `GOG_ACCOUNT` — gog
