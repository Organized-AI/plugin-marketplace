---
name: organized-codebase-applicator
description: Applies Organized Codebase template structure to existing projects and cleans up unused/redundant directories. Use when user wants to organize an existing project, apply the Organized Codebase template, clean up a messy codebase, remove iteration folders, standardize project structure, or mentions "organized codebase", "clean up codebase", "apply template", "remove unused folders", or "standardize project".
---

# Organized Codebase Applicator

Applies the Organized Codebase template to existing projects and performs intelligent cleanup of unused or redundant directories.

## Workflow

### Phase 1: Analysis

Analyze target project before making changes:

1. List current structure with size and modification dates
2. Identify redundancy patterns: `-v[0-9]`, `-old`, `-backup`, `-pwa`, `-app` suffixes
3. Detect regenerable directories: `node_modules/`, `dist/`, `build/`, `.next/`
4. Check for existing Organized Codebase presence

### Phase 2: Cleanup

Archive iteration directories to `.archive/` (never delete):

```bash
# Patterns to archive
*-pwa/           # PWA variants
*-app/           # App variants  
*-v[0-9]*/       # Version iterations
*-old/           # Old versions
*-backup/        # Backups
```

**Safety rules**: Never delete `.git/`, always archive (don't delete), confirm before changes.

### Phase 3: Template Application

Copy from Organized Codebase template if directories don't exist:

```
.claude/           # Claude hooks and configurations
PLANNING/          # Project planning docs
ARCHITECTURE/      # System architecture docs
DOCUMENTATION/     # General documentation
SPECIFICATIONS/    # Functional/technical specs
AGENT-HANDOFF/     # Agent instructions
CONFIG/            # Configuration docs
scripts/           # Automation scripts
.env.example       # Environment template
BASIC_PROCESS.md   # Process documentation
.gitignore         # Merge with existing
```

### Phase 4: Finalize

1. Update project name placeholders in copied files
2. Merge `.gitignore` entries (append unique lines)
3. Git commit all changes

## Script Usage

```bash
bash scripts/apply-organized-codebase.sh --target /path/to/project [OPTIONS]

Options:
  --template PATH    Custom template path (default: iCloud Organized Codebase)
  --target PATH      Target project path (required)
  --cleanup-only     Only archive iterations, skip template
  --template-only    Only apply template, skip cleanup
  --dry-run          Preview changes without applying
  --force            Skip confirmations
```

## Default Template Path

```
~/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Organized Codebase
```

## Cleanup Patterns

| Pattern | Action | Confidence |
|---------|--------|------------|
| `*-v[0-9]*/` | Archive | High |
| `*-old/`, `*-backup/` | Archive | High |
| `*-pwa/`, `*-app/` | Archive | Medium |
| `node_modules/`, `dist/` | Can delete | High |
| `.next/`, `.cache/` | Can delete | High |
