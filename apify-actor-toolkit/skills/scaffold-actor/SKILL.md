---
name: scaffold-actor
description: |
  Generate a complete Apify Actor TypeScript project with all configuration, boilerplate, and directory structure.
  Use when: (1) User wants to create a new Apify Actor, (2) User says "scaffold an actor", "create an apify actor", "new actor project", (3) User needs the Apify project boilerplate with TypeScript, Docker, and testing.
---

# Scaffold Apify Actor

Generate a production-ready Apify Actor project with TypeScript, Docker, testing, and all required configuration.

## Prerequisites

Verify Apify CLI is installed:
```bash
which apify || echo "Install with: brew install apify-cli"
```

## Workflow

### 1. Gather Requirements

Ask the user:
- **Actor name** — kebab-case (e.g., `web-scraper`, `data-processor`)
- **Description** — What does this Actor do?
- **Input fields** — What data does the Actor accept? (name, type, description for each)
- **Output format** — What does the Actor produce? (dataset fields, KV store keys)

### 2. Create Directory Structure

```bash
mkdir -p src tests/fixtures tests/integration .actor hooks
```

### 3. Create package.json

```json
{
  "name": "<actor-name>",
  "version": "1.0.0",
  "type": "module",
  "description": "<description>",
  "engines": { "node": ">=22" },
  "main": "dist/main.js",
  "scripts": {
    "start": "node dist/main.js",
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "apify": "^3.5.2",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@apify/tsconfig": "^0.1.0",
    "typescript": "~5.6.0",
    "vitest": "^2.1.0"
  }
}
```

### 4. Create tsconfig.json

CRITICAL: Must override `importHelpers` and `incremental` from `@apify/tsconfig` or `tsc` silently produces no output.

```json
{
  "extends": "@apify/tsconfig",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "target": "ES2022",
    "lib": ["ES2022"],
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "declaration": true,
    "importHelpers": false,
    "incremental": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 5. Create .actor/actor.json

```json
{
  "actorSpecification": 1,
  "name": "<actor-name>",
  "title": "<Actor Title>",
  "description": "<description>",
  "version": "1.0.0",
  "input": "./input_schema.json",
  "dockerfile": "./Dockerfile",
  "storages": {
    "dataset": {
      "actorSpecification": 1,
      "views": {
        "overview": {
          "title": "Results",
          "transformation": {
            "fields": ["<output-field-1>", "<output-field-2>"]
          },
          "display": {
            "component": "table",
            "properties": {}
          }
        }
      }
    }
  }
}
```

### 6. Create .actor/input_schema.json

Every field MUST have an `editor` property or `apify run` will reject it.

```json
{
  "title": "<Actor Title> Input",
  "type": "object",
  "schemaVersion": 1,
  "properties": {
    "<field-name>": {
      "title": "<Field Title>",
      "type": "string",
      "description": "<field description>",
      "editor": "textfield"
    }
  },
  "required": []
}
```

Valid editor values: `textfield`, `textarea`, `select`, `json`, `requestListSources`, `pseudoUrls`, `globs`, `keyValue`, `hidden`.

### 7. Create .actor/Dockerfile

```dockerfile
FROM apify/actor-node:22 AS builder

COPY package*.json ./
RUN npm ci --include=dev --audit=false

COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

FROM apify/actor-node:22

COPY package*.json ./
RUN npm ci --omit=dev --audit=false

COPY --from=builder /home/myuser/dist ./dist
COPY .actor/ ./.actor/

CMD ["node", "dist/main.js"]
```

### 8. Create Supporting Files

**.actorignore:**
```
.git/
.claude/
tests/
node_modules/
dist/
*.md
!.actor/*.md
```

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    testTimeout: 30_000,
    include: ['tests/**/*.test.ts'],
    exclude: ['.claude/**', 'node_modules/**'],
  },
});
```

**.gitignore:**
```
node_modules/
dist/
storage/
apify_storage/
.env
*.log
.DS_Store
```

### 9. Create src/main.ts Skeleton

```typescript
import { Actor, log } from 'apify';

interface ActorInput {
  // Define input fields here
}

await Actor.init();

try {
  const input = await Actor.getInput<ActorInput>() ?? {};
  log.info('<Actor Name> starting', { input });

  // TODO: Implement Actor logic here

  // Push results to dataset
  // await Actor.pushData([{ ... }]);

  // Store results in KV store
  // const kvStore = await Actor.openKeyValueStore();
  // await kvStore.setValue('result', data);

} catch (err) {
  log.error('Actor failed', { error: String(err) });
  throw err;
}

await Actor.exit();
```

### 10. Create Placeholder Test

**tests/main.test.ts:**
```typescript
import { describe, it, expect } from 'vitest';

describe('<actor-name>', () => {
  it('placeholder', () => {
    expect(true).toBe(true);
  });
});
```

### 11. Install and Verify

```bash
npm install && npm run build && npm test && npx tsc --noEmit
```

All four commands must pass before the scaffold is complete.

### 12. Report

Print a summary:
```
Scaffolded Apify Actor: <actor-name>
  - package.json ✓
  - tsconfig.json ✓ (importHelpers: false, incremental: false)
  - .actor/actor.json ✓
  - .actor/input_schema.json ✓
  - .actor/Dockerfile ✓ (apify/actor-node:22)
  - src/main.ts ✓
  - vitest.config.ts ✓
  - npm install ✓
  - npm run build ✓
  - npm test ✓

Next steps:
  1. Implement your Actor logic in src/main.ts
  2. Run /gate-check after changes
  3. Run /actor-local-test to test locally
  4. Run /actor-deploy to push to Apify cloud
```

## Common Patterns

| Actor Type | Key Dependencies | Approach |
|------------|-----------------|----------|
| Web scraper | `crawlee`, `cheerio` | Use CheerioCrawler or PlaywrightCrawler |
| API processor | `zod` | Validate input, call APIs, push to dataset |
| Data transformer | `zod` | Read from KV store, transform, output to dataset |
| Scheduled job | `apify` | Use Actor.getInput() for config, run on schedule |
