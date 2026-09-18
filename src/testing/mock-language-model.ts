import { MockLanguageModelV3, simulateReadableStream } from 'ai/test';

export const testUsage = {
  inputTokens: {
    total: 10,
    noCache: 10,
    cacheRead: undefined,
    cacheWrite: undefined,
  },
  outputTokens: {
    total: 10,
    text: 10,
    reasoning: undefined,
  },
};

export type MockToolCall = {
  toolCallId: string;
  toolName: string;
  input: Record<string, unknown>;
};

function toGenerateResult(step: MockToolCall[] | 'stop') {
  if (step === 'stop') {
    return {
      content: [{ type: 'text' as const, text: 'done' }],
      finishReason: { unified: 'stop' as const, raw: undefined },
      usage: testUsage,
      warnings: [],
    };
  }

  return {
    content: step.map((call) => ({
      type: 'tool-call' as const,
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      input: JSON.stringify(call.input),
    })),
    finishReason: { unified: 'tool-calls' as const, raw: undefined },
    usage: testUsage,
    warnings: [],
  };
}

function toStreamResult(step: MockToolCall[] | 'stop') {
  if (step === 'stop') {
    return {
      stream: simulateReadableStream({
        chunks: [
          { type: 'text-start' as const, id: 'text-1' },
          { type: 'text-delta' as const, id: 'text-1', delta: 'done' },
          { type: 'text-end' as const, id: 'text-1' },
          {
            type: 'finish' as const,
            finishReason: { unified: 'stop' as const, raw: undefined },
            usage: testUsage,
          },
        ],
      }),
    };
  }

  return {
    stream: simulateReadableStream({
      chunks: [
        ...step.map((call) => ({
          type: 'tool-call' as const,
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          input: JSON.stringify(call.input),
        })),
        {
          type: 'finish' as const,
          finishReason: { unified: 'tool-calls' as const, raw: undefined },
          usage: testUsage,
        },
      ],
    }),
  };
}

/** Scripted model: each entry is one generate/stream call; leftover calls return stop text. */
export function createScriptedModel(script: Array<MockToolCall[] | 'stop'>) {
  let callCount = 0;

  const nextStep = () => {
    const step = script[callCount] ?? 'stop';
    callCount += 1;
    return step;
  };

  const model = new MockLanguageModelV3({
    doGenerate: async () => toGenerateResult(nextStep()),
    doStream: async () => toStreamResult(nextStep()),
  });

  return { model, getCallCount: () => callCount };
}

export function toolOutputs(result: {
  steps: Array<{
    toolResults: Array<{ toolName: string; output: unknown }>;
    content: Array<{ type: string; toolName?: string; error?: unknown }>;
  }>;
}) {
  return result.steps.flatMap((step) =>
    step.toolResults.map((tr) => ({
      toolName: tr.toolName,
      output: tr.output,
    })),
  );
}

export function toolErrors(result: {
  steps: Array<{
    content: Array<{ type: string; toolName?: string; error?: unknown }>;
  }>;
}) {
  return result.steps.flatMap((step) =>
    step.content.filter((part) => part.type === 'tool-error'),
  );
}
