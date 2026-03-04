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

## Template Script Structure

```python
#!/usr/bin/env python3
"""
Script description here.

Dependencies: pip install package1 package2
Usage: python scripts/this_script.py <args>
"""

# Constants with explanations
TIMEOUT = 30  # HTTP requests typically complete in <30s

def main():
    try:
        # Main logic here
        pass
    except FileNotFoundError as e:
        print(f"File not found: {e}. Creating default...")
        # Handle gracefully instead of failing
    except Exception as e:
        print(f"Error: {e}")
        return 1
    return 0

if __name__ == "__main__":
    exit(main())
```

