<!-- Generated: 2026-04-07 -->

# build-your-own-claude-code

## Purpose
A progressive teaching project based on real Claude Code source code (416,500 lines). Learners complete 6 Labs to incrementally implement Agent Harness core modules, ultimately seeing the real Claude Code TUI driven by their own code.

## Key Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project overview, Lab design, tech stack, Codex cost optimization guidelines |
| `HANDOFF.md` | Complete context handoff: research, PoC results, design decisions, priorities |
| `SECOND_BRAIN_PROMPT.md` | Prompt for the "second brain" session (project coordinator) |

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `docs/` | MkDocs documentation site source (see `docs/AGENTS.md`) |
| `labs/` | Lab skeleton code (see `labs/AGENTS.md`) |
| `shared/` | Shared TypeScript type definitions (see `shared/AGENTS.md`) |
| `internal/` | Internal design docs, prompts, architecture (see `internal/AGENTS.md`) |
| `platform/` | Next.js 16 Web platform — Monaco Editor + xterm.js terminal (see `platform/AGENTS.md`) |
| `server/` | Express backend — Docker management + LLM proxy + auth + SQLite |
| `infrastructure/` | Dockerfile, docker-compose, Cloudflare Tunnel config |

## For AI Agents

### Working In This Directory
- Read `HANDOFF.md` before making any architectural decisions
- Read `WORK_LOG.md` for the project logging contract
- Read `internal/TEAM_PROGRESS.md` before starting work to check current state
- After every substantive work session, update `internal/TEAM_PROGRESS.md` with:
  - date/session marker
  - completed work
  - in-progress work
  - blockers
  - verification performed
- If the work changes project-wide understanding, also update `internal/PROJECT_BRIEFING.md` and/or `SESSION_STARTER.md`
- Lab 3 (Agent Loop) is the core — gets 80% of effort
- TypeScript strict mode, ESM, conventional commits
- Cost-conscious: implementation tasks → Codex/omx; design/review → Claude

### Testing Requirements
- Lab evaluation: `build.mjs --lab=N` compilation + TUI observation (NO Mock LLM, NO test framework)
- Server tests: `npx vitest run` for backend unit tests
- `npx tsc --noEmit` for type checking

### Key Relationships
- **Sister repo**: `claude-code-diy` at `D:\test-claude-code\claude-code` — the full runnable Claude Code source
- **Key file in sister repo**: `src/query.ts` (1,729 lines) — the real Agent Loop that gets "hollowed out"
- **PoC verified**: `build.mjs --lab` injects simplified query into full Claude Code build

### Architecture Overview
```
claude-code-diy (416K lines, full Claude Code)
  └── src/services/agent/query.ts → replaced by query-labN.ts (learner's code)
  └── build.mjs --lab=N → injects variant file, compiles full system

build-your-own-claude-code (this repo)
  └── platform/ → Next.js Web Editor + xterm.js terminal
  └── server/   → Express + Docker + LLM proxy + SQLite
  └── docs/     → teaching content (MkDocs)
  └── labs/     → skeleton code + reference implementations
```

<!-- MANUAL: -->
