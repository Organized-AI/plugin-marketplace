---
description: Run an Apify Actor locally with test input and display results
---

# Actor Local Test

Prepare input, run the Actor locally with `apify run`, and display the output.

## Steps

### 1. Ensure Build is Current

```bash
npm run build
```

### 2. Prepare Input

Create the local storage directory and input file:

```bash
mkdir -p storage/key_value_stores/default
```

Ask the user what input to provide, or use existing test data. Write the input as JSON:

```bash
# Write INPUT.json to storage/key_value_stores/default/INPUT.json
```

The input JSON must match the fields defined in `.actor/input_schema.json`.

### 3. Run Actor

```bash
apify run
```

Note: The first run may rename `apify_storage/` to `storage/` (Apify SDK v3 migration). This is normal.

Note: If not logged in, you'll see a warning about Apify Proxy. This is fine for local testing.

### 4. Display Results

Check for output in the local storage:

**Dataset results:**
```bash
ls storage/datasets/default/
```

Read and display each dataset item:
```bash
cat storage/datasets/default/000000001.json
```

**KV Store results:**
```bash
ls storage/key_value_stores/default/
```

Read any output files (reports, results, etc.) — skip `INPUT.json` and internal files.

### 5. Report

```
Actor Local Test Results:
  Status:   ✅ Completed / ❌ Failed
  Dataset:  N items
  KV Store: [list of output keys]

  [Display key output or summary]
```

## Troubleshooting

| Error | Fix |
|-------|-----|
| `Input schema is not valid` | Every field in input_schema.json needs an `editor` property |
| `Cannot find module` | Run `npm run build` first |
| `dist/ empty` | Check tsconfig.json: set `importHelpers: false`, `incremental: false` |
| `All default local stores were purged` | Normal on first run — input is preserved |
