---
description: Check BLADE LinkedIn implementation status and phase progress
---

# Check Implementation Status

Report current status of the LinkedIn Insight Tag implementation.

## What This Command Does

1. Read `CONFIG/phase-state.json` for phase progress
2. Check GTM workspace status via MCP
3. Report completed vs pending phases
4. Identify any blockers

## Output

```
╔═══════════════════════════════════════════════════╗
║  BLADE LinkedIn Implementation Status             ║
╠═══════════════════════════════════════════════════╣
║  Phase 0: Template    [✅/⏳]                     ║
║  Phase 1: Variables   [✅/⏳]                     ║
║  Phase 2: Tags        [✅/⏳]                     ║
║  Phase 3: Validation  [✅/⏳]                     ║
║  Phase 4: Published   [✅/⏳]                     ║
╠═══════════════════════════════════════════════════╣
║  Partner ID: [VALUE or NEEDED]                    ║
║  Template ID: [VALUE or PENDING]                  ║
╚═══════════════════════════════════════════════════╝
```

## Actions Based on Status

- If Phase 0 pending → Run `/blade-deploy` or Phase 0 prompt
- If Partner ID needed → Request from Campaign Manager
- If conflicts detected → Run workspace sync
