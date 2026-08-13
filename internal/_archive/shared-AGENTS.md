<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-04-07 -->

# shared

## Purpose
Shared TypeScript type definitions used across all Labs and the reference implementation. Types mirror the Anthropic Messages API format.

## Key Files

| File | Description |
|------|-------------|
| `types.ts` | Core types: Message, ContentBlock (TextBlock, ToolUseBlock, ToolResultBlock), ToolDefinition, AgentEvent, StopReason |

## For AI Agents

### Working In This Directory
- These types are the contract between Labs — changes here affect all Lab code
- Types intentionally mirror Anthropic API format for minimal abstraction
- AgentEvent is the event stream type that the Agent Loop yields to external consumers

<!-- MANUAL: -->
