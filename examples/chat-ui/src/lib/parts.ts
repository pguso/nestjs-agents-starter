import { getToolName, isReasoningUIPart, isTextUIPart, isToolUIPart } from 'ai';
import type { UIMessage } from 'ai';

/**
 * A tool part flattened into the handful of fields the UI cares about.
 * Static (`tool-<name>`) and dynamic tool parts render identically here.
 */
export type ToolCall = {
  toolCallId: string;
  name: string;
  state:
    | 'input-streaming'
    | 'input-available'
    | 'approval-requested'
    | 'approval-responded'
    | 'output-available'
    | 'output-error'
    | 'output-denied';
  input?: unknown;
  output?: unknown;
  errorText?: string;
  /** Set while the tool waits for `addToolApprovalResponse`. */
  approvalId?: string;
};

/** Message parts in the order the agent produced them. */
export type MessageBlock =
  | { kind: 'text'; key: string; text: string }
  | { kind: 'reasoning'; key: string; text: string }
  | { kind: 'tool'; key: string; call: ToolCall };

export function messageBlocks(message: UIMessage): MessageBlock[] {
  const blocks: MessageBlock[] = [];

  message.parts.forEach((part, index) => {
    const key = `${message.id}-${index}`;

    if (isTextUIPart(part)) {
      const previous = blocks[blocks.length - 1];
      // Consecutive text parts (one per step) belong in the same bubble.
      if (previous?.kind === 'text') {
        previous.text += part.text;
      } else {
        blocks.push({ kind: 'text', key, text: part.text });
      }
      return;
    }

    if (isReasoningUIPart(part)) {
      blocks.push({ kind: 'reasoning', key, text: part.text });
      return;
    }

    if (isToolUIPart(part)) {
      blocks.push({
        kind: 'tool',
        key,
        call: {
          toolCallId: part.toolCallId,
          name: getToolName(part),
          state: part.state,
          input: part.input,
          output: part.output,
          errorText: part.errorText,
          approvalId:
            part.state === 'approval-requested' ? part.approval?.id : undefined,
        },
      });
    }
  });

  return blocks;
}

export function hasPendingApproval(messages: UIMessage[]): boolean {
  return messages.some((message) =>
    messageBlocks(message).some(
      (block) => block.kind === 'tool' && block.call.approvalId !== undefined,
    ),
  );
}

/** Human label for a tool name, e.g. `listOrders` -> `List orders`. */
export function toolLabel(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatCents(totalCents: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
  }).format(totalCents / 100);
}
