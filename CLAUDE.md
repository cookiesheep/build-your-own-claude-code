# CLAUDE.md — Build Your Own Agent

## Project Identity

**Name**: build-your-own-agent
**Tagline**: Learn to build an agent harness from scratch — the "other 40%" that makes AI coding agents actually work.
**Type**: Task-driven, learn-by-building open source educational project
**License**: MIT
**Docs Site**: Material for MkDocs (GitHub Pages)
**Sister Project**: [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) — recovered Claude Code source running on Node.js

## What This Project Is

A structured learning experience that teaches people how to build a coding agent harness (like the one inside Claude Code) through **5 progressive Labs**. The key differentiator: **learners' code runs inside the real Claude Code system**, not a toy environment.

The final experience: learner implements the agent loop → builds the project → launches Claude Code's full TUI → the agent loop driving everything is the code they wrote.

## Core Concept: Agent Harness

A "coding agent" = **Model (60%) + Harness (40%)**

The model (Claude, GPT) provides intelligence. The **harness** is everything else:
- **Message protocol**: how conversations are structured and managed
- **Tool system**: how LLM "uses" external tools via JSON Schema
- **Agent loop**: the while(true) cycle — call LLM → execute tools → feed back results → repeat
- **Context management**: when to truncate, compact, or summarize history

The harness is what turns a chatbot into an agent. This project teaches that 40%.

Claude Code's real `query.ts` (1,729 lines) implements this loop with production complexity. Strip away error recovery, context compression, permissions, and streaming optimizations — the core logic is ~100 lines. That's what learners implement.

## Project Background

The team lead explored Claude Code's internal architecture through [claude-code-diy](https://github.com/cookiesheep/claude-code-diy), recovering and running ~1,888 TypeScript source files (416,500 lines) from npm source maps. Key finding:

- Total codebase: 416,500 lines across 1,916 files
- Core harness (`query.ts`, `QueryEngine.ts`, tool execution): ~12,000 lines (3%)
- TUI/React/Ink UI: ~73,000 lines (18%)
- Tool implementations (50+): ~50,829 lines (12%)
- Infrastructure (auth, telemetry, etc.): ~32,000 lines (8%)
- Utilities, commands, other: ~248,000 lines (59%)

The core agent loop in `query.ts` already has dependency injection (`QueryDeps`), making it possible to swap in a learner's simplified implementation.

## Team

- **Size**: 5-person undergraduate student team (sophomore year)
- **Context**: Software engineering course final project
- **University**: Sun Yat-sen University (SYSU)
- **Semester**: Fall 2025 (~12 effective weeks)
- **Reference project**: YatSenOS v2 (OS lab series, same university, similar structure)

## Architecture Overview

### Two-track design

```
Track A: Standalone Agent (~800 lines)
  Labs 0-4 build a standalone CLI agent from scratch.
  Each lab adds a visible capability.
  Tests use Mock LLM (deterministic, no API key needed).

Track B: Claude Code Integration (Lab 5)
  Learner's agent-loop implementation replaces query.ts
  in the real Claude Code system (via claude-code-diy).
  Full TUI runs with learner's code as the engine.
```

### Lab structure (5 Labs, not 7)

| Lab | Topic | Priority | Core Deliverable | Visible Feedback |
|-----|-------|----------|-----------------|-----------------|
| **0** | Environment + Experience | P0 | Clone, build, run Claude Code | See full TUI running |
| **1** | Messages + LLM Client | P1 | Message types, API call | "I called Claude API and got a response" |
| **2** | Tool System | P1 | Tool registry, execution | "I triggered a tool and it ran" |
| **3** | Agent Loop (★ CORE) | P0 | The while(true) cycle | "Agent autonomously called tools in a loop!" |
| **4** | Integration | P0 | Insert into Claude Code | "Full Claude Code TUI, driven by MY code" |

**Lab 3 is the heart of the project. Labs 1-2 are fast prerequisites. Lab 4 is the climax.**

### Feedback design (inspired by YatSenOS)

Each lab has two feedback mechanisms:
1. **Unit tests** (`npx vitest run`) — deterministic, Mock LLM, works offline
2. **Demo script** (`npx tsx labs/lab-XX/demo.ts`) — visual output showing what the lab achieved
   - Without API key: uses recorded mock responses (same visual effect)
   - With API key: uses live API (real interaction)

### File structure

```
build-your-own-agent/
├── CLAUDE.md                     # This file
├── README.md                     # GitHub landing page
├── mkdocs.yml                    # Documentation site config
├── docs/                         # MkDocs content (Material for MkDocs)
│   ├── index.md                  # Homepage
│   ├── labs/                     # Lab guides
│   │   ├── lab-00/               # Lab 0: Environment
│   │   ├── lab-01/               # Lab 1: Messages + LLM
│   │   ├── lab-02/               # Lab 2: Tools
│   │   ├── lab-03/               # Lab 3: Agent Loop
│   │   └── lab-04/               # Lab 4: Integration
│   ├── guide/                    # Reference materials
│   └── about/                    # Project background
├── labs/                         # Lab code (skeleton + tests + solution)
│   ├── lab-00-environment/
│   ├── lab-01-messages/
│   ├── lab-02-tools/
│   ├── lab-03-agent-loop/
│   └── lab-04-integration/
├── src/                          # Reference implementation (~800 lines)
├── shared/                       # Shared types
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## Tech Stack

| Category | Choice | Reason |
|----------|--------|--------|
| Language | TypeScript | Type safety for learning, matches Claude Code |
| Runtime | Node.js >= 18 | Universal, ESM support |
| Testing | Vitest | Fast, modern, TypeScript native |
| LLM API | Anthropic SDK | Primary target, matches Claude Code |
| Docs | Material for MkDocs | Same as YatSenOS, professional, easy to maintain |
| Deployment | GitHub Pages | Free, CI/CD via GitHub Actions |

## Development Conventions

### Code Style
- TypeScript strict mode, ESM modules
- Prefer explicit types over `any`
- Functions should be small and well-named
- Each lab module independently testable

### Testing Strategy
- **Unit tests**: Mock LLM (fixed JSON responses), deterministic, no API dependency
- **Demo scripts**: dual-mode (mock / live), always produce visual output
- **Integration tests**: optional, require API key, skip by default

### Git
- Branch: `feat/lab-01`, `fix/lab-03-loop`, `docs/lab-02-guide`
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`
- PR required for main

### Lab Design Principles
1. **Visible feedback for every lab** — not just "tests pass" but "I can see something new working"
2. **Tests are the spec** — pass all tests = lab complete
3. **Progressive capability** — each lab adds one observable agent capability
4. **Mock-first** — all grading tests work offline, no API key needed
5. **Real code** — skeleton compiles and runs, just returns placeholder values
6. **Core lab gets 80% effort** — Lab 3 (Agent Loop) is the star, others are supporting cast

## Working Guidelines for AI Sessions

1. **Read this file first** for full project context
2. **Check git log** for current state
3. **Ask what the user wants to work on** before starting
4. **Prioritize Lab 3** — if anything conflicts with Lab 3 quality, Lab 3 wins
5. **Test everything** — `npx vitest run` before claiming done
6. **PoC first** — before building a feature, verify the approach works

## What NOT To Do

- Don't over-engineer — clarity > cleverness
- Don't add heavy frameworks — minimal dependencies
- Don't treat all labs equally — Lab 3 is king, Labs 1-2 are quick setup
- Don't write solution before skeleton + tests
- Don't use LangChain/CrewAI — the point is from scratch
- Don't skip visual feedback — every lab must produce something the learner can see
