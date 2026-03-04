# References

This folder contains reference documentation and extended guides.

## Contents

Place the following types of files here:
- **API documentation**: Detailed API references, endpoint docs
- **Extended guides**: In-depth tutorials, advanced usage patterns
- **Domain knowledge**: Business rules, terminology glossaries
- **Examples**: Comprehensive code samples, usage examples
- **Specifications**: Technical specs, data schemas

## Usage

Reference from SKILL.md using progressive disclosure:
```markdown
**Advanced configuration**: See [ADVANCED.md](references/ADVANCED.md)
**API Reference**: See [API.md](references/API.md)
```

## Best Practices (per Anthropic)

- Keep references ONE level deep from SKILL.md (avoid nested references)
- Add table of contents for files > 100 lines
- Use consistent terminology throughout
- Reference files are loaded on-demand to save context tokens

