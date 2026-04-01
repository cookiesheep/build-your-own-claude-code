# CLAUDE.md — Build Your Own Agent

## Project Identity

**Name**: build-your-own-agent
**Tagline**: Learn to build an agent harness from scratch — the "other 40%" that makes AI coding agents actually work.
**Type**: Task-driven, learn-by-building open source educational project
**License**: MIT

## What This Project Is

This is NOT a product. It's a **structured learning experience** that teaches people how to build a coding agent (like Claude Code, Cursor Agent, etc.) from scratch.

The project decomposes a coding agent into 7 progressive tasks. Learners complete TODO sections in skeleton code, run tests to verify, and gradually build up a fully functional coding agent.

After completing all 7 tasks, the learner will have built:
- A message protocol for LLM conversations
- An LLM API client with streaming
- A tool definition and registration system
- Real coding tools (file read/write, bash execute)
- A tool execution engine
- The core agent loop
- A working CLI coding agent

## Key Concept: Agent Harness

A "coding agent" = **Model (60%) + Harness (40%)**

The model (Claude, GPT, etc.) provides intelligence. The **harness** is everything else:
- How you format and manage messages
- How you define and execute tools
- How you orchestrate the agent loop (prompt → LLM → tool call → execute → feedback → repeat)
- How you manage context, safety, and UX

This project teaches the harness — the 40% that most tutorials skip.

## Project Background

This project originated from the team lead's deep exploration of Claude Code's source code through the [claude-code-diy](https://github.com/cookiesheep/claude-code-diy) project, where they recovered and fixed ~1888 TypeScript source files from npm source maps. That hands-on experience revealed how the agent harness works internally, and inspired this educational project.

## Team

- **Size**: 5-person undergraduate student team (sophomore year)
- **Context**: Software engineering course final project
- **University**: Sun Yat-sen University (SYSU)
- **Semester**: Fall 2025 (approximately 12 effective weeks)
- **Goals**:
  1. Complete course requirements with high quality
  2. Create a genuinely useful open source project
  3. Build portfolio-worthy work
  4. Learn AI agent architecture hands-on

## Tech Stack

| Category | Choice | Reason |
|----------|--------|--------|
| Language | TypeScript | Type safety for learning, matches Claude Code |
| Runtime | Node.js >= 18 | Universal, ESM support |
| Testing | Vitest | Fast, modern, good DX |
| LLM API | Anthropic SDK | Primary target, can abstract later |
| CLI | Node.js readline | Simple, no framework dependency |

## Project Structure

```
build-your-own-agent/
├── CLAUDE.md                     # This file — AI session context
├── README.md                     # Project overview (bilingual CN/EN)
├── docs/
│   ├── PRD.md                    # Product requirements document
│   ├── MVP_SCOPE.md              # MVP boundaries & task design
│   ├── ARCHITECTURE.md           # Technical architecture
│   └── TEAM_BRIEF.md             # Team introduction & sprint plan
├── tasks/
│   ├── task-01-messages/         # Task 1: Message protocol
│   │   ├── README.md             # Knowledge + learning objectives
│   │   ├── src/                  # Skeleton code with TODOs
│   │   ├── tests/                # Automated tests
│   │   ├── solution/             # Reference implementation
│   │   └── hints.md              # Progressive hints
│   ├── task-02-llm-client/       # Task 2: LLM API client
│   ├── task-03-tool-definition/  # Task 3: Tool schema & registry
│   ├── task-04-core-tools/       # Task 4: File/bash tools
│   ├── task-05-tool-execution/   # Task 5: Tool dispatch engine
│   ├── task-06-agent-loop/       # Task 6: Core agent loop
│   └── task-07-integration/      # Task 7: Complete CLI agent
├── shared/                       # Shared types used across tasks
│   └── types.ts
├── src/                          # Reference implementation (complete)
│   └── main.ts                   # Entry point for reference agent
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .env.example
```

## Development Conventions

### Code Style
- TypeScript strict mode
- ESM modules (`"type": "module"`)
- Prefer explicit types over `any`
- Functions should be small and well-named (no comments needed if self-explanatory)
- Each task module should be independently testable

### Testing Strategy
- **Unit tests**: Use mock LLM responses (fixed JSON), never depend on real API for grading
- **Mock fixtures**: Store in `tasks/task-XX/tests/fixtures/` as JSON files
- **Integration tests**: Optional, require API key, labeled with `describe.skip` by default
- **Coverage target**: Each task's skeleton should have 90%+ test coverage when correctly implemented

### Git Conventions
- Branch naming: `feat/task-01-messages`, `fix/task-03-schema-validation`
- Commit messages: conventional commits (`feat:`, `fix:`, `docs:`, `test:`)
- PR required for merging to main

### Task Design Principles
1. **One clear learning objective per task** — don't mix concerns
2. **Tests are the specification** — learner knows they're done when tests pass
3. **Progressive difficulty** — Task 1 is approachable, Task 7 requires synthesizing everything
4. **No hidden dependencies** — each task's README lists exact prerequisites
5. **Time-boxed** — each task should be completable in 1-3 hours
6. **Real code, not pseudocode** — the skeleton compiles and runs, just returns wrong/placeholder values

### Documentation Standards
- Each task README follows a fixed template (see docs/MVP_SCOPE.md)
- Bilingual: primary Chinese, English section below
- Code comments only where logic is non-obvious

## Working Guidelines for AI Sessions

When working on this project in a new Claude Code session:

1. **Read this file first** to understand project context
2. **Check docs/MVP_SCOPE.md** for current task design status
3. **Check git log** for recent changes and current state
4. **Ask which task or doc the user wants to work on** before starting
5. **Never create solution code without the corresponding skeleton + tests first**
6. **Test everything** — run `npx vitest run` before claiming anything works

## What NOT To Do

- Don't over-engineer — this is an educational project, clarity > cleverness
- Don't add frameworks (React, Express, etc.) — keep dependencies minimal
- Don't create WebUI — CLI only for MVP
- Don't implement multi-model support — Anthropic SDK only for MVP
- Don't write solution code in the skeleton files — keep TODOs clean
- Don't use LangChain, CrewAI, or other agent frameworks — the point is to build from scratch
