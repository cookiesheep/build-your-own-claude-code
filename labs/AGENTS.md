<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 -->

# labs

## Purpose
Lab skeleton code, tests, and reference implementations. Each subdirectory contains one Lab's learner workspace. Currently empty — skeleton code to be generated.

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `lab-00-environment/` | Lab 0: Environment setup and Claude Code experience |
| `lab-01-messages/` | Lab 1: Message types, Conversation class, LLM client |
| `lab-02-tools/` | Lab 2: Tool definitions, registry, executor |
| `lab-03-agent-loop/` | Lab 3: Core Agent Loop (while(true)) — **highest priority** |
| `lab-04-integration/` | Lab 4: TodoWrite planning + Subagent spawning |

## For AI Agents

### Working In This Directory
- Each lab directory should contain: `src/` (skeleton), `tests/` (vitest), `solution/` (reference), `demo.ts` (runnable demo)
- All tests use Mock LLM — no API key needed
- Lab 3 is the core lab, gets 80% of effort
- Types are imported from `../../shared/types.ts`

### Expected Lab Structure (per lab)
```
lab-XX-name/
├── src/           # Skeleton code with TODO comments
├── tests/         # Vitest test files with Mock LLM
├── solution/      # Complete reference implementation
└── demo.ts        # Runnable demo (Mock mode + optional Live mode)
```

<!-- MANUAL: -->
