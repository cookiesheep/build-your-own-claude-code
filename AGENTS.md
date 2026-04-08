<!-- Generated: 2026-04-07 -->

# build-your-own-claude-code

## Purpose
A progressive teaching project based on real Claude Code source code (416,500 lines). Learners complete 6 Labs to incrementally implement Agent Harness core modules, ultimately seeing the real Claude Code TUI driven by their own code.

## Key Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project overview, tech stack, Codex cost optimization guidelines |
| `HANDOFF.md` | Complete context handoff: research, PoC results, design decisions, priorities |
| `SESSION_STARTER.md` | Prompt template for new AI sessions |
| `package.json` | TypeScript project with Anthropic SDK, Vitest, ESLint |
| `vitest.config.ts` | Test configuration |
| `tsconfig.json` | TypeScript strict mode configuration |
| `mkdocs.yml` | Documentation site configuration (Material for MkDocs) |
| `.env.example` | Environment variable template (API keys) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `docs/` | MkDocs documentation site source (see `docs/AGENTS.md`) |
| `labs/` | Lab skeleton code and tests — learner workspace (see `labs/AGENTS.md`) |
| `shared/` | Shared TypeScript type definitions (see `shared/AGENTS.md`) |
| `internal/` | Internal design docs, team progress, architecture (see `internal/AGENTS.md`) |
| `src/` | Platform source code (to be implemented) |

## For AI Agents

### Working In This Directory
- Read `HANDOFF.md` before making any architectural decisions
- Read `internal/TEAM_PROGRESS.md` before starting work to check current state
- Lab 3 (Agent Loop) is the core — gets 80% of effort
- TypeScript strict mode, ESM, conventional commits
- Cost-conscious: implementation tasks → Codex/omx; design/review → Claude

### Testing Requirements
- `npm test` runs Vitest with Mock LLM (offline, deterministic)
- `npx tsc --noEmit` for type checking
- All tests must work without API keys

### Key Relationships
- **Sister repo**: `claude-code-diy` at `D:\test-claude-code\claude-code` — the full runnable Claude Code source
- **Key file in sister repo**: `src/query.ts` (1,729 lines) — the real Agent Loop that gets "hollowed out"
- **PoC verified**: `build.mjs --lab` injects simplified query into full Claude Code build

### Architecture Overview
```
claude-code-diy (416K lines, full Claude Code)
  └── src/query.ts → replaced by query-lab-XX.ts (learner's code)
  └── build.mjs --lab → injects learner implementation

build-your-own-claude-code (this repo)
  └── docs/ → teaching content (MkDocs)
  └── labs/ → skeleton code + tests
  └── shared/ → type definitions
  └── src/ → web platform (Next.js + Docker)
```

<!-- MANUAL: -->
