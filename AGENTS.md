<!-- Generated: 2026-04-07 -->

# build-your-own-claude-code

## Purpose
A progressive teaching project based on real Claude Code source code (416,500 lines). Learners complete 6 Labs to incrementally implement Agent Harness core modules, ultimately seeing the real Claude Code TUI driven by their own code.

## Key Files

| File | Description |
|------|-------------|
| `CLAUDE.md` | Project overview, Lab design, tech stack, Codex cost optimization guidelines |
| `项目大脑启动提示词.md` | Prompt to bootstrap a new "project brain" coordinator session |
| `README.md` | Public-facing project intro (byocc.cc web platform) |
| `platform/src/lib/lab-files.json` | Single source of truth for Lab skeletons (variant file injection) |

> Historical research/handoff docs (HANDOFF, LAB_DESIGN, old prompts, etc.) live in `internal/_archive/` — they are stale snapshots, not current truth.

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
- Treat **code + `platform/src/lib/lab-files.json`** as the only source of truth for current state; docs (including this file) may lag
- Read `CLAUDE.md` and `项目大脑启动提示词.md` before making architectural decisions
- Read `internal/TEAM_PROGRESS.md` (May-onward) for recent work history; pre-May history is in `internal/_archive/`
- After every substantive work session, append to `internal/TEAM_PROGRESS.md`:
  - date/theme marker
  - completed work / in-progress / blockers
  - verification performed (commands run + observed result)
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
