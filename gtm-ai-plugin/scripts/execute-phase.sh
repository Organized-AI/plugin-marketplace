#!/bin/bash
#
# GTM-AI Phase Executor
# Executes a specific phase with validation and state management
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get project root
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="$PROJECT_DIR/CONFIG/config.json"
STATE_FILE="$PROJECT_DIR/CONFIG/phase-state.json"
PLANNING_DIR="$PROJECT_DIR/PLANNING/implementation-phases"

# Phase argument
PHASE=${1:-""}

usage() {
    echo "Usage: $0 <phase-number>"
    echo ""
    echo "Phases:"
    echo "  0 - Template Installation"
    echo "  1 - Variable Creation"
    echo "  2 - Tag Creation"
    echo "  3 - Validation"
    echo "  4 - Test & Publish"
    echo ""
    echo "Examples:"
    echo "  $0 0      # Execute Phase 0"
    echo "  $0 next   # Execute next incomplete phase"
    echo "  $0 status # Show current status"
    exit 1
}

# Check if jq is available
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}Error: jq is required but not installed${NC}"
        echo "Install with: brew install jq"
        exit 1
    fi
}

# Initialize state file if not exists
init_state() {
    if [ ! -f "$STATE_FILE" ]; then
        mkdir -p "$(dirname "$STATE_FILE")"
        cat > "$STATE_FILE" << 'EOF'
{
  "currentPhase": null,
  "status": "not_started",
  "phases": {
    "0": { "status": "pending", "artifacts": {} },
    "1": { "status": "pending", "artifacts": {} },
    "2": { "status": "pending", "artifacts": {} },
    "3": { "status": "pending", "artifacts": {} },
    "4": { "status": "pending", "artifacts": {} }
  },
  "history": []
}
EOF
        echo -e "${GREEN}Initialized${NC} phase-state.json"
    fi
}

# Get phase status
get_phase_status() {
    local phase=$1
    jq -r ".phases.\"$phase\".status" "$STATE_FILE"
}

# Update phase status
update_phase_status() {
    local phase=$1
    local status=$2
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

    jq ".currentPhase = $phase | .status = \"$status\" | .phases.\"$phase\".status = \"$status\" | .phases.\"$phase\".updatedAt = \"$timestamp\"" "$STATE_FILE" > "${STATE_FILE}.tmp"
    mv "${STATE_FILE}.tmp" "$STATE_FILE"
}

# Check prerequisites for a phase
check_prerequisites() {
    local phase=$1

    # Phase 0: Need config file
    if [ "$phase" == "0" ]; then
        if [ ! -f "$CONFIG_FILE" ]; then
            echo -e "${RED}Missing:${NC} CONFIG/config.json"
            return 1
        fi
        return 0
    fi

    # All other phases need previous phase complete
    local prev_phase=$((phase - 1))
    local prev_status=$(get_phase_status $prev_phase)

    if [ "$prev_status" != "completed" ]; then
        echo -e "${RED}Phase $prev_phase not completed${NC} (status: $prev_status)"
        return 1
    fi

    # Check for completion file
    local completion_file="$PROJECT_DIR/PHASE-${prev_phase}-COMPLETE.md"
    if [ ! -f "$completion_file" ]; then
        echo -e "${YELLOW}Warning:${NC} PHASE-${prev_phase}-COMPLETE.md not found"
    fi

    return 0
}

# Show status
show_status() {
    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║         GTM-AI Phase Status            ║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    for i in {0..4}; do
        local status=$(get_phase_status $i)
        local phase_names=("Template Installation" "Variable Creation" "Tag Creation" "Validation" "Test & Publish")

        case $status in
            "completed")
                echo -e "  Phase $i: ${phase_names[$i]} ${GREEN}✓ Completed${NC}"
                ;;
            "in_progress")
                echo -e "  Phase $i: ${phase_names[$i]} ${YELLOW}⟳ In Progress${NC}"
                ;;
            "failed")
                echo -e "  Phase $i: ${phase_names[$i]} ${RED}✗ Failed${NC}"
                ;;
            *)
                echo -e "  Phase $i: ${phase_names[$i]} ○ Pending"
                ;;
        esac
    done
    echo ""
}

# Find next phase to execute
find_next_phase() {
    for i in {0..4}; do
        local status=$(get_phase_status $i)
        if [ "$status" != "completed" ]; then
            echo $i
            return
        fi
    done
    echo "-1"
}

# Execute phase
execute_phase() {
    local phase=$1
    local phase_file="$PLANNING_DIR/PHASE-${phase}-PROMPT.md"

    echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║      Executing Phase $phase              ${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
    echo ""

    # Check prerequisites
    echo -e "${YELLOW}Checking prerequisites...${NC}"
    if ! check_prerequisites $phase; then
        echo -e "${RED}Prerequisites not met. Aborting.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Prerequisites validated${NC}"
    echo ""

    # Check for phase prompt file
    if [ ! -f "$phase_file" ]; then
        # Use template from plugin
        phase_file="$PROJECT_DIR/.claude/plugins/gtm-ai-plugin/skills/gtm-AI/assets/phase-prompts/PHASE-${phase}-TEMPLATE.md"
        if [ ! -f "$phase_file" ]; then
            echo -e "${RED}Phase prompt not found: PHASE-${phase}-PROMPT.md${NC}"
            exit 1
        fi
    fi

    # Update state
    update_phase_status $phase "in_progress"

    # Output instructions
    echo -e "${GREEN}Phase $phase ready for execution${NC}"
    echo ""
    echo -e "To execute, run Claude Code with:"
    echo -e "${BLUE}  claude \"Read $phase_file and execute all tasks\"${NC}"
    echo ""
    echo -e "Or paste this prompt:"
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
    echo "Read $phase_file and execute all tasks. After completion, create PHASE-${phase}-COMPLETE.md with all artifacts."
    echo -e "${YELLOW}────────────────────────────────────────${NC}"
}

# Main
check_jq
init_state

case "$PHASE" in
    ""|"help"|"-h"|"--help")
        usage
        ;;
    "status")
        show_status
        ;;
    "next")
        next=$(find_next_phase)
        if [ "$next" == "-1" ]; then
            echo -e "${GREEN}All phases completed!${NC}"
            exit 0
        fi
        execute_phase $next
        ;;
    [0-4])
        execute_phase $PHASE
        ;;
    *)
        echo -e "${RED}Invalid phase: $PHASE${NC}"
        usage
        ;;
esac
