#!/bin/bash
# Organized Codebase Applicator - Applies template and cleans up projects

set -e

RED='\033[0;31m' GREEN='\033[0;32m' YELLOW='\033[1;33m' BLUE='\033[0;34m' NC='\033[0m'

DEFAULT_TEMPLATE="$HOME/Library/Mobile Documents/com~apple~CloudDocs/BHT Promo iCloud/Organized AI/Windsurf/Organized Codebase"
TEMPLATE_PATH="" TARGET_PATH="" DRY_RUN=false CLEANUP_ONLY=false TEMPLATE_ONLY=false FORCE=false

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

confirm() {
    [ "$FORCE" = true ] && return 0
    read -p "$1 [y/N]: " -n 1 -r; echo
    [[ $REPLY =~ ^[Yy]$ ]]
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --template) TEMPLATE_PATH="$2"; shift 2 ;;
        --target) TARGET_PATH="$2"; shift 2 ;;
        --cleanup-only) CLEANUP_ONLY=true; shift ;;
        --template-only) TEMPLATE_ONLY=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --force) FORCE=true; shift ;;
        -h|--help) echo "Usage: $0 --target PATH [--template PATH] [--dry-run] [--force]"; exit 0 ;;
        *) log_error "Unknown: $1"; exit 1 ;;
    esac
done

[ -z "$TARGET_PATH" ] && { log_error "Target path required"; exit 1; }
[ -z "$TEMPLATE_PATH" ] && TEMPLATE_PATH="$DEFAULT_TEMPLATE"
[ ! -d "$TARGET_PATH" ] && { log_error "Target not found: $TARGET_PATH"; exit 1; }
[ ! -d "$TEMPLATE_PATH" ] && [ "$CLEANUP_ONLY" = false ] && { log_error "Template not found: $TEMPLATE_PATH"; exit 1; }

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Organized Codebase Applicator"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo "Template: $TEMPLATE_PATH"
echo "Target:   $TARGET_PATH"
echo -e "Mode:     $([ "$DRY_RUN" = true ] && echo "DRY RUN" || echo "LIVE")\n"

cd "$TARGET_PATH"

# Analysis
log_info "Analyzing project structure..."
echo "📁 Current Structure:"
for item in */ .[!.]*/; do
    [ -d "$item" ] 2>/dev/null || continue
    name="${item%/}"; size=$(du -sh "$item" 2>/dev/null | cut -f1)
    note=""
    [[ "$name" =~ -pwa$|-app$|-v[0-9]+$|-old$|-backup$ ]] && note=" ← 📋 Archive candidate"
    [[ "$name" == "node_modules" || "$name" == "dist" || "$name" == "build" ]] && note=" ← 🗑️ Regenerable"
    [[ "$name" == ".git" ]] && note=" ← 🔒 Protected"
    echo "├── $name/ ($size)$note"
done 2>/dev/null
echo ""

# Cleanup
if [ "$TEMPLATE_ONLY" = false ]; then
    CLEANUP_ITEMS=()
    for item in */; do
        [ -d "$item" ] || continue
        name="${item%/}"
        [[ "$name" == ".git" || "$name" == ".claude" || "$name" == ".archive" || "$name" == "PLANNING" ]] && continue
        [[ "$name" =~ -pwa$|-app$|-v[0-9]+$|-old$|-backup$ ]] && CLEANUP_ITEMS+=("$name")
    done

    if [ ${#CLEANUP_ITEMS[@]} -gt 0 ]; then
        echo "🧹 Cleanup Recommendations:"
        for i in "${!CLEANUP_ITEMS[@]}"; do
            item="${CLEANUP_ITEMS[$i]}"
            size=$(du -sh "$item" 2>/dev/null | cut -f1)
            echo "  [$((i+1))] Archive: $item/ ($size) → .archive/$item/"
        done
        echo ""

        if [ "$DRY_RUN" = true ]; then
            log_warning "DRY RUN - No changes made"
        elif confirm "Apply cleanup?"; then
            mkdir -p .archive
            for item in "${CLEANUP_ITEMS[@]}"; do
                [ -d "$item" ] && mv "$item" .archive/ && log_success "Archived: $item"
            done
        fi
    else
        log_success "No cleanup needed"
    fi
fi

# Template Application
if [ "$CLEANUP_ONLY" = false ]; then
    if [ "$DRY_RUN" = false ] && confirm "Apply Organized Codebase template?"; then
        echo -e "\n📦 Copying template..."
        for dir in .claude PLANNING ARCHITECTURE DOCUMENTATION SPECIFICATIONS AGENT-HANDOFF CONFIG scripts; do
            if [ -d "$TEMPLATE_PATH/$dir" ] && [ ! -d "$dir" ]; then
                cp -r "$TEMPLATE_PATH/$dir" . && log_success "Copied: $dir/"
            elif [ -d "$dir" ]; then
                log_warning "Skipped: $dir/ (exists)"
            fi
        done

        [ -f "$TEMPLATE_PATH/.env.example" ] && [ ! -f ".env.example" ] && cp "$TEMPLATE_PATH/.env.example" . && log_success "Copied: .env.example"
        [ -f "$TEMPLATE_PATH/BASIC_PROCESS.md" ] && [ ! -f "BASIC_PROCESS.md" ] && cp "$TEMPLATE_PATH/BASIC_PROCESS.md" . && log_success "Copied: BASIC_PROCESS.md"

        if [ -f "$TEMPLATE_PATH/.gitignore" ]; then
            if [ -f ".gitignore" ]; then
                cat "$TEMPLATE_PATH/.gitignore" >> .gitignore
                sort -u .gitignore -o .gitignore
                log_success "Merged: .gitignore"
            else
                cp "$TEMPLATE_PATH/.gitignore" . && log_success "Copied: .gitignore"
            fi
        fi

        PROJECT_NAME=$(basename "$TARGET_PATH")
        find . -name "*.md" -type f -exec sed -i '' "s/\[Your Project Name\]/$PROJECT_NAME/g" {} \; 2>/dev/null || true
        log_success "Updated project name in templates"
    fi
fi

# Git commit
if [ "$DRY_RUN" = false ] && [ -d ".git" ] && [ -n "$(git status --porcelain)" ]; then
    if confirm "Commit changes to git?"; then
        git add -A
        git commit -m "Apply Organized Codebase template

Applied by: organized-codebase-applicator"
        log_success "Changes committed"
    fi
fi

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
