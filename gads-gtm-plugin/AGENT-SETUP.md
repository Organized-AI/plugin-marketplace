# Use this measurement kit with another coding agent

The marketplace package is native to Claude Code. The measurement artifacts themselves are portable: any agent that can read files and run a local command can use the same audit workflow.

## Claude Code (native install)

```text
/plugin marketplace add Organized-AI/plugin-marketplace
/plugin install gads-gtm-plugin@organized-ai-marketplace
```

Then ask: “Read `skills/event-surface-audit/SKILL.md` and use the included DOM Event Inventory Actor to create a proposed GTM event plan. Do not publish.”

## Any other coding agent (portable install)

1. Clone this repository or download the `gads-gtm-plugin` folder into the project the agent can read.
2. Give the agent this one-time instruction:

   ```text
   Follow gads-gtm-plugin/skills/event-surface-audit/SKILL.md.
   Use only authorized, read-only website inventories. Treat generated event maps as proposals;
   do not publish GTM, send conversions, click controls, submit forms, or expose secrets.
   ```

3. Run the actor and deterministic mapper from [QUICKSTART.md](QUICKSTART.md). Give the exported dataset and generated `event-surface-map.json` to the agent.
4. If the agent supports MCP, copy the applicable entries from [`.mcp.json`](.mcp.json) into that agent’s MCP settings. Add credentials through its secure configuration flow; never paste a token into source control or chat.

The agent’s own MCP configuration syntax and installation screen differ by product, so this guide deliberately provides portable files and a portable prompt instead of claiming a one-click install where none exists.

## Reproducible hand-off bundle

Give a novice these four things:

- `QUICKSTART.md` for the human procedure;
- `actors/dom-event-inventory/` to deploy or run the read-only Apify Actor;
- an exported dataset plus `scripts/build_event_surface_map.py` for repeatable event proposals;
- `config/conversion-api-readiness.example.json` and `scripts/create_measurement_release.py` for the server-side and versioning gates.

No item contains an advertising credential. Keep production destination IDs, platform tokens, and personal data out of the bundle.
