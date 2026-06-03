import { describe, expect, it } from 'vitest';
import {
  collectUsageFromSseText,
  getAnthropicPathFromOriginalUrl,
} from './llm-proxy.js';

describe('LLM proxy helpers', () => {
  it('maps proxy paths to Anthropic v1 paths', () => {
    expect(getAnthropicPathFromOriginalUrl('/api/llm/messages')).toBe('/v1/messages');
    expect(getAnthropicPathFromOriginalUrl('/api/llm/v1/messages')).toBe('/v1/messages');
    expect(getAnthropicPathFromOriginalUrl('/api/llm/messages?foo=bar')).toBe(
      '/v1/messages?foo=bar'
    );
  });

  it('extracts token usage from Anthropic-compatible SSE chunks', () => {
    const usage = collectUsageFromSseText(
      [
        'event: message_start',
        'data: {"type":"message_start","usage":{"input_tokens":12,"output_tokens":0}}',
        '',
        'event: message_delta',
        'data: {"type":"message_delta","delta":{"usage":{"output_tokens":34}}}',
        '',
      ].join('\n')
    );

    expect(usage).toEqual({
      input_tokens: 12,
      output_tokens: 34,
    });
  });
});
