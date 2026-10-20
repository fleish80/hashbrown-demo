import type { RunAgentInput } from '@ag-ui/core';
import { createHash } from 'node:crypto';

export type RunInput = RunAgentInput & {
  hashbrown?: { responseSchema?: object; ui?: boolean };
};

export interface ToolResultSummary {
  readonly name: string;
  readonly content: string;
}

/**
 * What makes two runs "the same request" for replay purposes. Everything that changes the model's
 * answer is in here; ids, timestamps and the system prompt are not.
 */
export interface RunFingerprint {
  readonly ui: boolean;
  readonly structured: boolean;
  readonly lastUserMessage: string;
  readonly toolResults: readonly ToolResultSummary[];
}

function normalize(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

function userText(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => (part && typeof part === 'object' && 'text' in part ? String(part.text) : ''))
      .join(' ');
  }
  return '';
}

export function fingerprint(input: RunInput): RunFingerprint {
  const messages = input.messages ?? [];
  const lastUserIndex = messages.map((message) => message.role).lastIndexOf('user');
  const lastUser = lastUserIndex >= 0 ? messages[lastUserIndex] : undefined;
  const toolNames = new Map<string, string>();
  for (const message of messages) {
    if (message.role === 'assistant') {
      for (const call of message.toolCalls ?? []) {
        toolNames.set(call.id, call.function.name);
      }
    }
  }
  const toolResults = messages
    .slice(lastUserIndex + 1)
    .filter((message) => message.role === 'tool')
    .map((message) => ({
      name: toolNames.get(message.toolCallId) ?? 'unknown',
      content: message.content,
    }));
  return {
    ui: Boolean(input.hashbrown?.ui),
    structured: Boolean(input.hashbrown?.responseSchema),
    lastUserMessage: lastUser ? normalize(userText(lastUser.content)) : '',
    toolResults,
  };
}

function hash(value: unknown): string {
  return createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 10);
}

/** Matches the full request, including what the tools returned. */
export function exactKey(print: RunFingerprint): string {
  return hash(print);
}

/** Matches the same prompt and tool names, whatever the tools returned. */
export function looseKey(print: RunFingerprint): string {
  return hash({ ...print, toolResults: print.toolResults.map((result) => result.name) });
}

/** A readable file name: mode, the prompt, and the exact key so two requests never collide. */
export function fixtureFileName(print: RunFingerprint): string {
  const mode = print.ui ? 'ui' : print.structured ? 'structured' : 'chat';
  const prompt = print.lastUserMessage
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const tools = print.toolResults.length ? `-after-${print.toolResults.map((result) => result.name).join('-')}` : '';
  return `${mode}-${prompt || 'empty'}${tools}-${exactKey(print)}.json`;
}
