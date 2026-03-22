# clawhub-skills

> Top 13 ClawHub skills for OpenClaw / Claude Code agents.
> Source: [openclaw/skills](https://github.com/openclaw/skills) registry.

## Install

```bash
/plugin install clawhub-skills@organized-ai-marketplace
```

Or add to your `.mcp.json` / project CLAUDE.md and reference skill paths directly.

## Skills

| Skill | Install | Downloads |
|-------|---------|-----------|
| larry | `skills/larry` | viral |
| capability-evolver | `skills/capability-evolver` | 35,000+ (#1) |
| qmd | `skills/qmd` | — |
| anti-ai-slop | `skills/anti-ai-slop` | — |
| brave-search | `skills/brave-search` | — |
| gog | `skills/gog` | — |
| x-research | `skills/x-research` | — |
| bite-rover | `skills/bite-rover` | 16,000+ (#3) |
| whatsapp-cli | `skills/whatsapp-cli` | 16,400+ (#2) |
| playwright | `skills/playwright` | — |
| mission-control | `skills/mission-control` | — |
| x-impact-checker | `skills/x-impact-checker` | — |

## Structure

```
clawhub-skills/
├── .claude-plugin/
│   └── plugin.json
├── CLAUDE.md
├── README.md
└── skills/
    ├── larry/
    │   ├── SKILL.md
    │   ├── scripts/larry.sh
    │   └── references/
    ├── capability-evolver/
    │   ├── SKILL.md
    │   └── scripts/capability-evolver.sh
    └── ... (12 total)
```

## Source

All skills sourced from the official [openclaw/skills](https://github.com/openclaw/skills) registry (ClawHub).
CLI bash wrappers built by [Organized AI](https://github.com/Organized-AI) matching the Clawdbot Ready tool pattern.
