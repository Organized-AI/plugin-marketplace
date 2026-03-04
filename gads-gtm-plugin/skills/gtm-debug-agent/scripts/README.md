# Scripts

This folder contains executable utility scripts for the skill.

## Contents

Place the following types of files here:
- **Utility scripts**: Python, Bash, Node.js scripts
- **Validation scripts**: Input/output validators
- **Helper tools**: Data processing, format conversion
- **Automation scripts**: Workflow automation tools

## Usage

Reference scripts from SKILL.md for execution:
```markdown
Run: `python scripts/validate.py input.json`
```

Or for reading as reference:
```markdown
See `scripts/analyze.py` for the extraction algorithm
```

## Best Practices (per Anthropic)

- Scripts should SOLVE problems, not punt to Claude
- Handle errors explicitly with helpful messages
- No "voodoo constants" - document all magic numbers
- Use Unix-style paths (forward slashes)
- List dependencies at top of each script
- Scripts are EXECUTED, not loaded into context (efficient!)

