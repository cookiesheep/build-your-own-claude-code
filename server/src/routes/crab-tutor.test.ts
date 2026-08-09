import { describe, expect, it } from 'vitest';
import { createMiniCPMPayload, resolveMiniCPMEndpoint } from './crab-tutor.js';

describe('crab tutor proxy helpers', () => {
  it('expands an OpenAI-compatible v1 base URL', () => {
    expect(resolveMiniCPMEndpoint('https://api.modelbest.cn/v1/')).toBe(
      'https://api.modelbest.cn/v1/chat/completions'
    );
  });

  it('keeps an explicit chat endpoint unchanged', () => {
    expect(resolveMiniCPMEndpoint('https://example.com/chat/completions')).toBe(
      'https://example.com/chat/completions'
    );
  });

  it('pins the configured model and disables streaming', () => {
    expect(
      createMiniCPMPayload(
        {
          model: 'client-model',
          messages: [{ role: 'user', content: 'hello' }],
          temperature: 0.4,
          stream: true,
        },
        'MiniCPM-O-4.5-9B'
      )
    ).toEqual({
      model: 'MiniCPM-O-4.5-9B',
      messages: [{ role: 'user', content: 'hello' }],
      temperature: 0.4,
      stream: false,
    });
  });

  it('rejects payloads without messages', () => {
    expect(() => createMiniCPMPayload({ model: 'MiniCPM-O-4.5-9B' })).toThrow(
      'messages must be an array'
    );
  });
});
