# Assets

This folder contains static assets for the skill.

## Contents

Place the following types of files here:
- **Images**: Screenshots, diagrams, visual guides (PNG, JPG, SVG)
- **Data files**: Sample data, configuration templates, JSON/YAML examples
- **Templates**: Visual templates, design mockups
- **Icons**: Logos, icons, visual identifiers

## Usage

Reference assets from SKILL.md using relative paths:
```markdown
![Diagram](assets/workflow-diagram.png)
```

## Best Practices (per Anthropic)

- Use descriptive filenames: `form-layout-example.png` not `image1.png`
- Keep file sizes reasonable for context efficiency
- Assets are loaded on-demand, not pre-loaded into context

