#!/bin/bash
#
# GTM-AI Plugin Installer v2.0
# Installs skills, agents, commands, hooks, scripts, and MCP configuration
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory (plugin location)
PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$PLUGIN_DIR/../../.." && pwd)"

echo -e "${BLUE}╔════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     GTM-AI Plugin Installer v2.0.0     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Plugin location: ${YELLOW}$PLUGIN_DIR${NC}"
echo -e "Project root: ${YELLOW}$PROJECT_DIR${NC}"
echo ""

# Function to create directory if not exists
ensure_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo -e "${GREEN}Created${NC} $1"
    fi
}

# 1. Install Skills
echo -e "${BLUE}[1/8] Installing Skills...${NC}"
ensure_dir "$PROJECT_DIR/.claude/skills"

# Copy gtm-AI skill
if [ -d "$PLUGIN_DIR/skills/gtm-AI" ]; then
    cp -r "$PLUGIN_DIR/skills/gtm-AI" "$PROJECT_DIR/.claude/skills/"
    echo -e "  ${GREEN}✓${NC} Installed gtm-AI skill"
else
    if [ -d "$PROJECT_DIR/.claude/skills/gtm-AI" ]; then
        echo -e "  ${YELLOW}→${NC} gtm-AI skill already exists"
    else
        echo -e "  ${RED}✗${NC} gtm-AI skill not found in plugin"
    fi
fi

# Copy tidy-gtm skill
if [ -d "$PLUGIN_DIR/skills/tidy-gtm" ]; then
    cp -r "$PLUGIN_DIR/skills/tidy-gtm" "$PROJECT_DIR/.claude/skills/"
    echo -e "  ${GREEN}✓${NC} Installed tidy-gtm skill"
else
    if [ -d "$PROJECT_DIR/.claude/skills/tidy-gtm" ]; then
        echo -e "  ${YELLOW}→${NC} tidy-gtm skill already exists"
    else
        echo -e "  ${RED}✗${NC} tidy-gtm skill not found in plugin"
    fi
fi

# Copy linkedin-capi-setup skill
if [ -d "$PLUGIN_DIR/skills/linkedin-capi-setup" ]; then
    cp -r "$PLUGIN_DIR/skills/linkedin-capi-setup" "$PROJECT_DIR/.claude/skills/"
    echo -e "  ${GREEN}✓${NC} Installed linkedin-capi-setup skill"
else
    if [ -d "$PROJECT_DIR/.claude/skills/linkedin-capi-setup" ]; then
        echo -e "  ${YELLOW}→${NC} linkedin-capi-setup skill already exists"
    else
        echo -e "  ${YELLOW}!${NC} linkedin-capi-setup skill not found (optional)"
    fi
fi

# 2. Install Agents
echo -e "${BLUE}[2/8] Installing Agents...${NC}"
ensure_dir "$PROJECT_DIR/.claude/agents"

if [ -f "$PLUGIN_DIR/agents/gtm-automation-agent.md" ]; then
    cp "$PLUGIN_DIR/agents/gtm-automation-agent.md" "$PROJECT_DIR/.claude/agents/"
    echo -e "  ${GREEN}✓${NC} Installed gtm-automation-agent"
fi

# 3. Install Commands
echo -e "${BLUE}[3/8] Installing Commands...${NC}"
ensure_dir "$PROJECT_DIR/.claude/commands"

for cmd in gtm-deploy gtm-audit gtm-status gtm-rollback; do
    if [ -f "$PLUGIN_DIR/commands/$cmd.md" ]; then
        cp "$PLUGIN_DIR/commands/$cmd.md" "$PROJECT_DIR/.claude/commands/"
        echo -e "  ${GREEN}✓${NC} Installed /$cmd"
    fi
done

# 4. Install Hooks
echo -e "${BLUE}[4/8] Installing Hooks...${NC}"
ensure_dir "$PROJECT_DIR/.claude/hooks"

if [ -d "$PLUGIN_DIR/hooks" ]; then
    cp "$PLUGIN_DIR/hooks/"*.json "$PROJECT_DIR/.claude/hooks/" 2>/dev/null || true
    cp "$PLUGIN_DIR/hooks/"*.md "$PROJECT_DIR/.claude/hooks/" 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Installed pre-phase and post-phase hooks"
fi

# 5. Install Scripts
echo -e "${BLUE}[5/8] Installing Scripts...${NC}"
ensure_dir "$PROJECT_DIR/scripts"

if [ -d "$PLUGIN_DIR/scripts" ]; then
    cp "$PLUGIN_DIR/scripts/"*.sh "$PROJECT_DIR/scripts/" 2>/dev/null || true
    chmod +x "$PROJECT_DIR/scripts/"*.sh 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Installed execute-phase.sh and start-agent.sh"
fi

# 6. Install Planning Templates
echo -e "${BLUE}[6/8] Installing Planning...${NC}"
ensure_dir "$PROJECT_DIR/PLANNING"
ensure_dir "$PROJECT_DIR/PLANNING/implementation-phases"

if [ -f "$PLUGIN_DIR/planning/IMPLEMENTATION-MASTER-PLAN.md" ]; then
    cp "$PLUGIN_DIR/planning/IMPLEMENTATION-MASTER-PLAN.md" "$PROJECT_DIR/PLANNING/"
    echo -e "  ${GREEN}✓${NC} Installed IMPLEMENTATION-MASTER-PLAN.md"
fi

# Copy phase prompt templates
if [ -d "$PLUGIN_DIR/skills/gtm-AI/assets/phase-prompts" ]; then
    for phase in 0 1 2 3 4; do
        if [ -f "$PLUGIN_DIR/skills/gtm-AI/assets/phase-prompts/PHASE-${phase}-TEMPLATE.md" ]; then
            cp "$PLUGIN_DIR/skills/gtm-AI/assets/phase-prompts/PHASE-${phase}-TEMPLATE.md" \
               "$PROJECT_DIR/PLANNING/implementation-phases/PHASE-${phase}-PROMPT.md"
        fi
    done
    echo -e "  ${GREEN}✓${NC} Installed phase prompts (0-4)"
fi

# 7. Merge MCP Servers
echo -e "${BLUE}[7/8] Configuring MCP Servers...${NC}"

MCP_CONFIG="$PROJECT_DIR/.mcp.json"

if [ -f "$MCP_CONFIG" ]; then
    echo -e "  ${YELLOW}→${NC} .mcp.json exists - checking servers..."

    # Check if servers already configured
    if grep -q "google-tag-manager-mcp-server" "$MCP_CONFIG"; then
        echo -e "  ${YELLOW}→${NC} google-tag-manager-mcp-server already configured"
    else
        echo -e "  ${YELLOW}!${NC} Add google-tag-manager-mcp-server manually:"
        echo -e "      URL: https://gtm-mcp.stape.ai/mcp"
    fi

    if grep -q "stape-mcp-server" "$MCP_CONFIG"; then
        echo -e "  ${YELLOW}→${NC} stape-mcp-server already configured"
    else
        echo -e "  ${YELLOW}!${NC} Optional: Add stape-mcp-server"
        echo -e "      URL: https://mcp.stape.ai/sse"
    fi
else
    echo -e "  ${GREEN}Creating${NC} .mcp.json..."
    cat > "$MCP_CONFIG" << 'EOF'
{
  "mcpServers": {
    "google-tag-manager-mcp-server": {
      "url": "https://gtm-mcp.stape.ai/mcp"
    },
    "stape-mcp-server": {
      "url": "https://mcp.stape.ai/sse"
    }
  }
}
EOF
    echo -e "  ${GREEN}✓${NC} Created .mcp.json with MCP servers"
fi

# 8. Create CONFIG directory
echo -e "${BLUE}[8/8] Setting up CONFIG...${NC}"
ensure_dir "$PROJECT_DIR/CONFIG"

if [ ! -f "$PROJECT_DIR/CONFIG/config.json" ]; then
    if [ -f "$PLUGIN_DIR/templates/config.template.json" ]; then
        cp "$PLUGIN_DIR/templates/config.template.json" "$PROJECT_DIR/CONFIG/config.json"
    else
        cat > "$PROJECT_DIR/CONFIG/config.json" << 'EOF'
{
  "project": {
    "name": "My GTM Project",
    "description": "GTM tracking implementation"
  },
  "gtm": {
    "accountId": "YOUR_ACCOUNT_ID",
    "webContainer": {
      "id": "YOUR_CONTAINER_ID",
      "publicId": "GTM-XXXXXXX"
    },
    "serverContainer": {
      "id": "YOUR_SERVER_CONTAINER_ID",
      "publicId": "GTM-XXXXXXX"
    },
    "workspace": {
      "id": "YOUR_WORKSPACE_ID"
    }
  },
  "platforms": {
    "linkedin": {
      "partnerId": "",
      "conversionIds": {
        "lead": "",
        "purchase": ""
      }
    }
  },
  "triggers": {
    "allPages": "2147479553",
    "lead": "",
    "purchase": ""
  }
}
EOF
    fi
    echo -e "  ${GREEN}✓${NC} Created CONFIG/config.json template"
    echo -e "  ${YELLOW}!${NC} Edit CONFIG/config.json with your GTM IDs"
else
    echo -e "  ${YELLOW}→${NC} CONFIG/config.json already exists"
fi

# Initialize phase state
if [ ! -f "$PROJECT_DIR/CONFIG/phase-state.json" ]; then
    if [ -f "$PLUGIN_DIR/templates/phase-state.template.json" ]; then
        cp "$PLUGIN_DIR/templates/phase-state.template.json" "$PROJECT_DIR/CONFIG/phase-state.json"
        echo -e "  ${GREEN}✓${NC} Initialized phase-state.json"
    fi
fi

# Summary
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║       Installation Complete!           ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""
echo -e "Installed components:"
echo -e "  Skills:   gtm-AI, tidy-gtm, linkedin-capi-setup"
echo -e "  Agents:   gtm-automation-agent"
echo -e "  Commands: /gtm-deploy, /gtm-audit, /gtm-status, /gtm-rollback"
echo -e "  Hooks:    pre-phase, post-phase"
echo -e "  Scripts:  execute-phase.sh, start-agent.sh"
echo -e "  Planning: IMPLEMENTATION-MASTER-PLAN.md, Phase prompts (0-4)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "  1. Edit ${BLUE}CONFIG/config.json${NC} with your GTM IDs"
echo -e "  2. Restart Claude Code to load new commands"
echo -e "  3. Run ${BLUE}/gtm-status${NC} to verify connection"
echo ""
echo -e "Usage options:"
echo -e "  ${BLUE}# Autonomous agent (recommended)${NC}"
echo -e "  ./scripts/start-agent.sh linkedin"
echo ""
echo -e "  ${BLUE}# Step-by-step phases${NC}"
echo -e "  ./scripts/execute-phase.sh 0"
echo ""
echo -e "  ${BLUE}# Slash commands${NC}"
echo -e "  /gtm-deploy linkedin --partner-id 1234567"
echo -e "  /gtm-audit"
echo ""
echo -e "  ${BLUE}# Natural language${NC}"
echo -e "  \"Deploy LinkedIn tracking to my GTM container\""
echo ""
