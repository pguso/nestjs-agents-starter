import { isToolUIPart, type UIMessage } from 'ai';

/** Stable approval id used by the `?demo` fixture and Playwright assertions. */
export const DEMO_APPROVAL_ID = 'demo-approval-cancel-ord_1002';

/**
 * Static thread for `?demo`: a completed listOrders card plus a pending
 * cancelOrder approval. No API calls required.
 */
export const DEMO_MESSAGES: UIMessage[] = [
  {
    id: 'demo-user-1',
    role: 'user',
    parts: [{ type: 'text', text: 'Show my orders, then cancel ord_1002' }],
  },
  {
    id: 'demo-assistant-1',
    role: 'assistant',
    parts: [
      {
        type: 'text',
        text: 'Here are your orders. Cancelling ord_1002 needs your approval first.',
      },
      {
        type: 'dynamic-tool',
        toolName: 'listOrders',
        toolCallId: 'demo-call-list',
        state: 'output-available',
        input: {},
        output: [
          { id: 'ord_1001', status: 'shipped', totalCents: 4299 },
          { id: 'ord_1002', status: 'pending', totalCents: 1999 },
        ],
      },
      {
        type: 'dynamic-tool',
        toolName: 'cancelOrder',
        toolCallId: 'demo-call-cancel',
        state: 'approval-requested',
        input: { orderId: 'ord_1002' },
        approval: { id: DEMO_APPROVAL_ID },
      },
    ],
  },
];

export function isDemoMode(): boolean {
  return new URLSearchParams(window.location.search).has('demo');
}

/** Apply Approve / Reject locally without hitting the Nest API. */
export function applyDemoApproval(
  messages: UIMessage[],
  response: { id: string; approved: boolean; reason?: string },
): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      if (!isToolUIPart(part)) {
        return part;
      }
      if (
        part.state !== 'approval-requested' ||
        part.approval?.id !== response.id
      ) {
        return part;
      }

      if (response.approved) {
        return {
          ...part,
          state: 'output-available' as const,
          output: {
            id: 'ord_1002',
            status: 'cancelled',
            totalCents: 1999,
            items: ['Clean Architecture paperback'],
          },
          approval: {
            id: response.id,
            approved: true as const,
          },
        };
      }

      return {
        ...part,
        state: 'output-denied' as const,
        approval: {
          id: response.id,
          approved: false as const,
          reason: response.reason ?? 'User rejected the tool call',
        },
      };
    }),
  }));
}
