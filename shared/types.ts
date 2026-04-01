/**
 * Shared type definitions for build-your-own-agent.
 *
 * These types are used across all tasks and the reference implementation.
 * They mirror the Anthropic Messages API format for minimal abstraction.
 */

// ─── Message Types ───

export type Role = 'user' | 'assistant';

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;

export interface Message {
  role: Role;
  content: string | ContentBlock[];
}

// ─── Tool Types ───

export interface JSONSchema {
  type: string;
  properties?: Record<string, unknown>;
  required?: string[];
  description?: string;
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: JSONSchema;
}

export interface ToolResult {
  content: string;
  is_error?: boolean;
}

// ─── Agent Types ───

export type AgentEvent =
  | { type: 'text'; content: string }
  | { type: 'tool_call'; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; name: string; output: string; is_error?: boolean }
  | { type: 'done'; finalMessage: string }
  | { type: 'error'; error: string };

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens';
