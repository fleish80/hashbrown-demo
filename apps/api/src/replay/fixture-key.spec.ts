import { describe, expect, it } from 'vitest';
import { exactKey, fingerprint, fixtureFileName, looseKey, type RunInput } from './fixture-key.js';

const base = { threadId: 't', runId: 'r', state: {}, tools: [], context: [], forwardedProps: {} };

function chat(text: string): RunInput {
  return {
    ...base,
    messages: [
      { id: 's', role: 'system', content: 'be nice' },
      { id: 'u', role: 'user', content: text },
    ],
  };
}

function afterTool(content: string): RunInput {
  return {
    ...base,
    messages: [
      { id: 'u', role: 'user', content: "What's left?" },
      {
        id: 'a',
        role: 'assistant',
        content: '',
        toolCalls: [{ id: 'call-1', type: 'function', function: { name: 'listTodos', arguments: '{}' } }],
      },
      { id: 't', role: 'tool', toolCallId: 'call-1', content },
    ],
  };
}

describe('fingerprint', () => {
  it('should ignore ids, whitespace and letter case of the prompt', () => {
    const a = fingerprint(chat('  Say HI  in five words '));
    const b = fingerprint({ ...chat('say hi in five words'), runId: 'other' });
    expect(a).toEqual(b);
    expect(a.lastUserMessage).toBe('say hi in five words');
    expect(a.ui).toBe(false);
    expect(a.structured).toBe(false);
  });

  it('should tell chat, structured and ui requests apart', () => {
    const plain = exactKey(fingerprint(chat('hi')));
    const structured = exactKey(fingerprint({ ...chat('hi'), hashbrown: { responseSchema: {} } }));
    const ui = exactKey(fingerprint({ ...chat('hi'), hashbrown: { responseSchema: {}, ui: true } }));
    expect(new Set([plain, structured, ui]).size).toBe(3);
  });

  it('should name tool results sent back after the last user message', () => {
    const print = fingerprint(afterTool('[]'));
    expect(print.lastUserMessage).toBe("what's left?");
    expect(print.toolResults).toEqual([{ name: 'listTodos', content: '[]' }]);
  });

  it('should match loosely on tool names but exactly on tool output', () => {
    const empty = fingerprint(afterTool('[]'));
    const full = fingerprint(afterTool('[{"id":1}]'));
    expect(exactKey(empty)).not.toBe(exactKey(full));
    expect(looseKey(empty)).toBe(looseKey(full));
  });

  it('should build a readable file name', () => {
    expect(fixtureFileName(fingerprint(afterTool('[]')))).toMatch(/^chat-what-s-left-after-listTodos-[0-9a-f]{10}\.json$/);
    expect(fixtureFileName(fingerprint({ ...chat('How are we doing?'), hashbrown: { ui: true } }))).toMatch(/^ui-how-are-we-doing-[0-9a-f]{10}\.json$/);
  });
});
