<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 -->

# docs

## Purpose
MkDocs documentation site source. Contains all teaching content: Lab instructions, background knowledge guides, and project information. Deployed to GitHub Pages via GitHub Actions.

## Key Files

| File | Description |
|------|-------------|
| `index.md` | Site homepage |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `labs/` | Lab 0-5 instructions and task descriptions |
| `guide/` | Background knowledge: TypeScript, Messages API, Tool Calling, Agent Loop, Claude Code Architecture |
| `about/` | Project background and FAQ |

## For AI Agents

### Working In This Directory
- After modifying docs, push to main triggers auto-deploy via `.github/workflows/docs.yml`
- Local preview: `mkdocs serve` (requires `pip install mkdocs-material`)
- Lab pages have two files each: `index.md` (knowledge) + `tasks.md` (exercises)
- Lab 4-5 docs are framework-only, need content

<!-- MANUAL: -->
