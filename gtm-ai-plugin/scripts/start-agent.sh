#!/bin/bash
#
# GTM-AI Agent Launcher
# Starts the autonomous GTM automation agent
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

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      GTM-AI Agent Launcher v1.0        ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}Running pre-flight checks...${NC}"

# Check config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ CONFIG/config.json not found${NC}"
    echo "  Run: cp CONFIG/config.template.json CONFIG/config.json"
    echo "  Then edit with your GTM IDs"
    exit 1
fi
echo -e "${GREEN}✓${NC} CONFIG/config.json exists"

# Check for required IDs in config
ACCOUNT_ID=$(jq -r '.gtm.accountId' "$CONFIG_FILE" 2>/dev/null)
CONTAINER_ID=$(jq -r '.gtm.webContainer.id' "$CONFIG_FILE" 2>/dev/null)

if [ "$ACCOUNT_ID" == "null" ] || [ "$ACCOUNT_ID" == "YOUR_ACCOUNT_ID" ]; then
    echo -e "${RED}✗ GTM Account ID not configured${NC}"
    echo "  Edit CONFIG/config.json and set gtm.accountId"
    exit 1
fi
echo -e "${GREEN}✓${NC} GTM Account ID: $ACCOUNT_ID"

if [ "$CONTAINER_ID" == "null" ] || [ "$CONTAINER_ID" == "YOUR_CONTAINER_ID" ]; then
    echo -e "${RED}✗ GTM Container ID not configured${NC}"
    echo "  Edit CONFIG/config.json and set gtm.webContainer.id"
    exit 1
fi
echo -e "${GREEN}✓${NC} GTM Container ID: $CONTAINER_ID"

# Check MCP auth (optional warning)
if [ -d "$HOME/.mcp-auth" ]; then
    echo -e "${GREEN}✓${NC} MCP auth directory exists"
else
    echo -e "${YELLOW}⚠${NC} MCP auth not found - will authenticate on first use"
fi

echo ""
echo -e "${GREEN}Pre-flight checks passed!${NC}"
echo ""

# Platform argument
PLATFORM=${1:-""}

if [ -n "$PLATFORM" ]; then
    echo -e "Platform: ${BLUE}$PLATFORM${NC}"
    PROMPT="Deploy $PLATFORM tracking to my GTM container. Execute all phases automatically."
else
    PROMPT="Read the GTM automation agent and deploy tracking. Execute all phases."
fi

echo ""
echo -e "${YELLOW}Starting Claude Code with agent...${NC}"
echo ""
echo -e "Prompt: ${BLUE}$PROMPT${NC}"
echo ""

# Check if claude command exists
if command -v claude &> /dev/null; then
    echo -e "${GREEN}Launching Claude Code...${NC}"
    echo ""

    # Launch Claude with the prompt
    cd "$PROJECT_DIR"
    claude --dangerously-skip-permissions "$PROMPT"
else
    echo -e "${YELLOW}Claude CLI not found. Use this prompt in Claude Code:${NC}"
    echo ""
    echo -e "${BLUE}────────────────────────────────────────${NC}"
    echo "$PROMPT"
    echo -e "${BLUE}────────────────────────────────────────${NC}"
fi
