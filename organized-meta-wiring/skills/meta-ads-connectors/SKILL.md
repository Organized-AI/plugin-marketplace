---
name: meta-ads-connectors
description: Chooses and sets up the right Meta Ads connector — the Meta Ads CLI, Meta's hosted Ads MCP server, or calling the Graph API directly from a Worker. Use when the user mentions "Meta Ads CLI", "meta ads command", "Ads MCP server", "mcp.facebook.com", "ads_mcp_management", "connect an agent to Meta ads", or asks how to script or automate Meta ad management.
---

# Meta Ads connectors

Three ways to reach Meta Ads. They do not share credentials, and picking by habit rather than fit wastes a token-minting cycle.

Call `meta_connector_compare` with the actual job to get a recommendation.

## Meta Ads CLI

A **Python** package — `pip install meta-ads`, Python 3.12+, entrypoint `meta`. Authenticates with a **system user access token** and calls the Marketing API. No interactive login exists.

Environment variables are exactly three, and note there is **no `META_` prefix**: `ACCESS_TOKEN`, `AD_ACCOUNT_ID`, `BUSINESS_ID`. Config precedence is CLI flags, then shell env, then project `.env`, then `~/.config/meta/`.

Scopes the docs list: `business_management`, `ads_management`, `pages_show_list`, `pages_read_engagement`, `pages_manage_ads`, `catalog_management`, `read_insights`. Note it asks for `read_insights` rather than `ads_read`.

Shape is `meta [global options] ads <resource> <action> [options]`. **Global flags must come before the subcommand** — `meta --output json ads campaign list`, not the reverse. Exit codes are 0 success, 1 general, 2 usage, 3 auth, 4 API, 5 not found.

Traps: everything is created **paused** and going live takes three separate updates; budgets are in **cents**; business-id resolution falls back to an interactive prompt that hangs under `--no-input`, so set `BUSINESS_ID` explicitly in CI; dataset creation is gated on a business admin accepting the business tools ToS, which is another interactive blocker. The overview page also advertises product-item and product-set commands that do not appear in the command reference — verify with `meta ads --help` before scripting them.

Best for scripted and CI work, prototyping Marketing API calls, and piping JSON to `jq`.

## Meta hosted Ads MCP server

Meta-hosted at **`https://mcp.facebook.com/ads`** over streamable HTTP. Roughly 91 tools named `ads_*` spanning reporting, ad management, catalogs, datasets, help, experiments and activity logs.

Authenticates two ways: OAuth via Facebook Login for Business, or a **user access token** in an `Authorization: Bearer` header. Permissions: `ads_mcp_management`, `ads_read`, `ads_management`, `catalog_management`, `business_management`, `pages_show_list`, `instagram_basic`.

Connect from Claude Code:

```
claude mcp add --transport http --client-id <META_APP_ID> meta-ads https://mcp.facebook.com/ads
```

Owning a Meta app is **optional** — there is a no-app route through Business Manager. `ads_mcp_management` is MCP-only with no CLI or raw-API equivalent, and Advanced Access on it is required to manage other businesses' data as an agency. Tool availability is rolling out gradually per ad account, and the served list already runs ahead of the published docs, so enumerate with `tools/list` rather than assuming. Write tools create entities paused and confirm before activation.

Best for interactive, agent-driven work where you want no infrastructure.

## Worker calling Graph directly

The right default for unattended, multi-account, multi-client work. It is the only option that gives you an encrypted vault, your own fan-out, audit trails, role scoping and custom rate-limit accounting. You own the token lifecycle in exchange. See `meta-api-wiring`.

## The credential warning

A token minted for one connector will not cleanly serve another. The CLI wants a **system user** token with Page scopes and `read_insights`; the MCP server documents **user** tokens and needs `ads_mcp_management`, which the CLI never mentions. The CLI additionally requires adding the system user as an **App Admin**, which has no MCP counterpart. Mint separately per connector.
