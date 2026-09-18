import { FormEvent, useMemo, useState } from 'react';
import { useChat, type UIMessage } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from 'ai';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const USER_ID = import.meta.env.VITE_USER_ID ?? 'demo-user';
const CONVERSATION_ID = 'demo-chat-ui';

function textFromParts(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } => part.type === 'text',
    )
    .map((part) => part.text)
    .join('');
}

function approvalParts(message: UIMessage) {
  return message.parts.flatMap((part) => {
    if (part.type !== 'tool-approval-request') {
      return [];
    }
    const approvalId =
      'approvalId' in part && typeof part.approvalId === 'string'
        ? part.approvalId
        : undefined;
    if (!approvalId) {
      return [];
    }
    return [{ approvalId }];
  });
}

function ApprovalControls({
  message,
  addToolApprovalResponse,
}: {
  message: UIMessage;
  addToolApprovalResponse: (input: {
    id: string;
    approved: boolean;
    reason?: string;
  }) => void | PromiseLike<void>;
}) {
  const approvals = approvalParts(message);

  if (approvals.length === 0) {
    return null;
  }

  return (
    <div className="approval">
      <strong>Tool approval required</strong>
      {approvals.map((part) => (
        <div key={part.approvalId} className="approval-actions">
          <span>Approve cancelOrder?</span>
          <button
            type="button"
            onClick={() =>
              void addToolApprovalResponse({
                id: part.approvalId,
                approved: true,
              })
            }
          >
            Approve
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() =>
              void addToolApprovalResponse({
                id: part.approvalId,
                approved: false,
                reason: 'User rejected the cancellation',
              })
            }
          >
            Reject
          </button>
        </div>
      ))}
    </div>
  );
}

export function App() {
  const [input, setInput] = useState('');

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE}/chat`,
        headers: {
          'x-user-id': USER_ID,
        },
        body: {
          conversationId: CONVERSATION_ID,
        },
      }),
    [],
  );

  const { messages, sendMessage, status, addToolApprovalResponse, error } =
    useChat({
      transport,
      sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
    });

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text) {
      return;
    }
    setInput('');
    await sendMessage({ text });
  }

  return (
    <div className="app">
      <header>
        <h1>NestJS Agents</h1>
        <p>
          Minimal <code>useChat</code> client against the starter API - including
          approve/reject for <code>cancelOrder</code>.
        </p>
      </header>

      <div className="meta">
        <span>API: {API_BASE}</span>
        <span>User: {USER_ID}</span>
        <span>Conversation: {CONVERSATION_ID}</span>
      </div>

      <div className="messages">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`bubble ${message.role === 'user' ? 'user' : ''}`}
          >
            <div className="role">{message.role}</div>
            <div>{textFromParts(message) || '(tool / approval parts)'}</div>
            {message.parts
              .filter((part) => part.type.startsWith('tool-'))
              .map((part, index) => (
                <pre key={`${message.id}-tool-${index}`} className="tool">
                  {JSON.stringify(part, null, 2)}
                </pre>
              ))}
            {message.role === 'assistant' ? (
              <ApprovalControls
                message={message}
                addToolApprovalResponse={addToolApprovalResponse}
              />
            ) : null}
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about orders, or cancel ord_1002…"
          disabled={status === 'streaming' || status === 'submitted'}
        />
        <button
          type="submit"
          disabled={status === 'streaming' || status === 'submitted'}
        >
          Send
        </button>
      </form>

      <div className="status">
        Status: {status}
        {error ? ` - ${error.message}` : ''}
      </div>
    </div>
  );
}
