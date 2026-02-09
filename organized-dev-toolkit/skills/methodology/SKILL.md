---
name: methodology
description: |
  Meta-skill that routes to the optimal development methodology based on project needs.
  Routes to Boris (verification-first), GSD (fresh-context orchestration), or Ralphy (autonomous execution).
  Use when starting any significant work, or when asked "which approach should I use?"
metadata:
  version: 1.0.0
  author: Organized Codebase
  integrates_with:
    - boris (skill)
    - gsd-mode (skill)
    - ralphy-mode (skill)
    - long-runner (skill)
    - phased-build (skill)
triggers:
  - "which methodology"
  - "how should I approach"
  - "what workflow"
  - "start project"
  - "methodology"
  - "boris or gsd"
  - "autonomous mode"
  - "verification mode"
---

# Methodology Router Skill

Meta-orchestrator that helps select the optimal development methodology based on project characteristics.

---

## The Three Approaches

```
┌─────────────────────────────────────────────────────────────────┐
│                    METHODOLOGY SPECTRUM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   AUTONOMY              ORCHESTRATION              CONTROL      │
│       │                      │                        │         │
│   RALPHY                   GSD                     BORIS        │
│       │                      │                        │         │
│  "Fire-and-forget"   "Fresh contexts"      "Verify everything"  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| Approach | Philosophy | Best For |
|----------|------------|----------|
| **Ralphy** | One command, walk away | Known patterns, MVPs |
| **GSD** | Keep context fresh | Large complex projects |
| **Boris** | Verify before trusting | Quality-critical, teams |

---

## Decision Framework

When user asks which approach to use, ask these questions:

### Question 1: Project Complexity
```
Is this project:
  a) Simple/known pattern (CRUD, REST API, boilerplate) → RALPHY
  b) Complex with 20+ features → GSD
  c) Quality-critical production code → BORIS
```

### Question 2: Human Involvement Preference
```
How much do you want to be involved?
  a) Minimal - let AI run → RALPHY
  b) Milestone checkpoints → GSD
  c) Every verification gate → BORIS
```

### Question 3: Session Duration
```
Will this take:
  a) One session → BORIS or RALPHY
  b) Multiple sessions → GSD or long-runner
  c) Ongoing maintenance → BORIS
```

### Question 4: Context Sensitivity
```
Is context freshness critical?
  a) Not really → BORIS or RALPHY
  b) Yes, quality degrades in long sessions → GSD
```

---

## Quick Router

```
START
  │
  ├── "I have clear PRD/requirements and want to walk away"
  │     └── RALPHY MODE → /ralphy-mode
  │
  ├── "This is a large/complex project with many features"
  │     └── GSD MODE → /gsd-mode
  │
  ├── "I need maximum quality and verification"
  │     └── BORIS MODE → /boris
  │
  ├── "I want to learn from the process"
  │     └── BORIS MODE → /boris
  │
  └── "Not sure / Mixed requirements"
        └── START WITH BORIS → Upgrade to GSD if context rots
```

---

## Protocol: Methodology Selection

When this skill activates:

### Step 1: Assess Project
```
1. Check for existing artifacts:
   - prd/*.md files → Suggests Ralphy
   - PLANNING/implementation-phases/ → Suggests Boris/phased-build
   - PROJECT.md, REQUIREMENTS.md → Suggests GSD
   - CLAUDE.md with "DO NOT" section → Already using Boris

2. Check project size:
   - Small (<10 files affected) → Boris
   - Medium (10-50 files) → Boris or GSD
   - Large (50+ files) → GSD

3. Check user's stated goal:
   - "Quick prototype" → Ralphy
   - "Production quality" → Boris
   - "Big feature build" → GSD
```

### Step 2: Recommend Methodology
```
Based on assessment, recommend ONE approach:

RALPHY RECOMMENDED:
- Clear requirements in PRD format
- Known patterns (auth, CRUD, standard features)
- User wants minimal involvement
- Speed > verification

GSD RECOMMENDED:
- Complex multi-feature projects
- Context freshness is critical
- Parallel execution beneficial
- Multiple milestones/versions

BORIS RECOMMENDED:
- Quality is paramount
- Team projects with conventions
- Maintenance/bug fixes
- Learning from the process
```

### Step 3: Initialize Chosen Methodology
```
After selection, invoke the appropriate skill:

RALPHY: Check for .ralphy/config.yaml, PRD files
GSD: Initialize with /gsd:new-project or check existing artifacts
BORIS: Run /status, check CLAUDE.md, enter plan mode
```

---

## Hybrid Approaches

### Ralphy → Boris (Speed then Quality)
```
1. Use Ralphy to scaffold quickly
2. Switch to Boris for refinement
3. Apply Boris verification to Ralphy output
```

### GSD + Boris (Fresh Context + Verification)
```
1. Use GSD's parallel executors for heavy lifting
2. Apply Boris /verify before each commit
3. Use Boris /review before PRs
```

### Long-Runner + Boris (Multi-Session + Quality)
```
1. Use long-runner for session management
2. Apply Boris workflow within each session
3. /verify at every checkpoint
```

---

## Command Reference

| Need | Command | Methodology |
|------|---------|-------------|
| Start autonomous build | `just ralphy` | Ralphy |
| Start fresh-context project | `/gsd:new-project` | GSD |
| Start verified session | `/status` | Boris |
| Run verification | `/verify` | Boris |
| Smart commit | `/commit` | Boris |
| Discuss phase | `/gsd:discuss-phase N` | GSD |
| Plan phase | `/gsd:plan-phase N` | GSD |
| Execute phase | `/gsd:execute-phase N` | GSD |

---

## Integration with Organized Codebase

All three methodologies share:
- `.claude/` directory structure
- CLAUDE.md for project context
- PLANNING/ for implementation phases
- AGENT-HANDOFF/ for session transfer

The difference is in **when** and **how** verification happens:
- Ralphy: After (automated)
- GSD: Per-milestone (human UAT)
- Boris: Before every commit (human + automated)

---

## Quick Start by Scenario

### "I want to build a TODO app"
→ **Ralphy** (known pattern, simple)

### "I want to build a complex SaaS with 50 features"
→ **GSD** (fresh contexts, parallel execution)

### "I want to fix bugs in production code"
→ **Boris** (verification-first, anti-patterns)

### "I'm not sure what I'm building yet"
→ **Boris** (iterative, can upgrade to GSD later)

---

**Remember:** The best methodology is the one you'll actually use consistently. Start with Boris for learning, graduate to GSD for scale, use Ralphy for speed.
