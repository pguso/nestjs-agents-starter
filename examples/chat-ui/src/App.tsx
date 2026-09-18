import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
} from 'ai';
import type { RespondToApproval } from './components/approval-card';
import { Composer } from './components/composer';
import { EmptyState } from './components/empty-state';
import {
  AlertIcon,
  CloseIcon,
  MoonIcon,
  NewChatIcon,
  RetryIcon,
  SparkleIcon,
  SunIcon,
} from './components/icons';
import { MessageTurn } from './components/message-turn';
import {
  applyDemoApproval,
  DEMO_MESSAGES,
  isDemoMode,
} from './lib/demo-fixture';
import { useAutoScroll, useTheme } from './lib/hooks';
import { hasPendingApproval } from './lib/parts';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000';
const USER_ID = import.meta.env.VITE_USER_ID ?? 'demo-user';

function newConversationId() {
  return `chat-ui-${Math.random().toString(36).slice(2, 10)}`;
}

export function App() {
  const [input, setInput] = useState('');
  const { theme, toggleTheme } = useTheme();
  const demo = useMemo(() => isDemoMode(), []);

  // The server persists per (userId, conversationId); a new chat needs a new id.
  const [conversationId, setConversationId] = useState(newConversationId);
  const conversationIdRef = useRef(conversationId);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE}/chat`,
        headers: { 'x-user-id': USER_ID },
        body: () => ({ conversationId: conversationIdRef.current }),
      }),
    [],
  );

  const {
    messages,
    setMessages,
    sendMessage,
    regenerate,
    stop,
    status,
    error,
    clearError,
    addToolApprovalResponse,
  } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
  });

  useEffect(() => {
    if (demo) {
      setMessages(DEMO_MESSAGES);
    }
  }, [demo, setMessages]);

  const busy = status === 'submitted' || status === 'streaming';
  const awaitingApproval = hasPendingApproval(messages);
  const { ref: threadRef, onScroll } = useAutoScroll(messages);

  const respondToApproval: RespondToApproval = useCallback(
    (response) => {
      if (demo) {
        setMessages((current) => applyDemoApproval(current, response));
        return;
      }
      return addToolApprovalResponse(response);
    },
    [addToolApprovalResponse, demo, setMessages],
  );

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || busy || demo) {
        return;
      }
      setInput('');
      void sendMessage({ text: trimmed });
    },
    [busy, demo, sendMessage],
  );

  function startNewChat() {
    void stop();
    clearError();
    const next = newConversationId();
    conversationIdRef.current = next;
    setConversationId(next);
    setMessages([]);
    setInput('');
  }

  const lastMessage = messages[messages.length - 1];
  const showTyping =
    busy &&
    (lastMessage?.role !== 'assistant' || lastMessage.parts.length === 0);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <SparkleIcon size={18} />
          </div>
          <div className="brand-text">
            <h1>NestJS Agents</h1>
            <p>
              {USER_ID} · {conversationId}
            </p>
          </div>
        </div>

        <div className="topbar-actions">
          <span className="status-pill" data-state={statusState(status)}>
            <span className="status-dot" />
            <span>{statusLabel(status, awaitingApproval)}</span>
          </span>
          <button
            type="button"
            className="icon-button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            title="Toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={startNewChat}
            aria-label="Start a new chat"
            title="New chat"
          >
            <NewChatIcon />
          </button>
        </div>
      </header>

      <div className="thread" ref={threadRef} onScroll={onScroll}>
        {messages.length === 0 ? (
          <EmptyState onPick={send} />
        ) : (
          <div className="turns" aria-live="polite">
            {messages.map((message) => (
              <MessageTurn
                key={message.id}
                message={message}
                respond={respondToApproval}
              />
            ))}
            {showTyping ? (
              <div className="turn assistant">
                <div className="avatar" aria-hidden="true">
                  <SparkleIcon size={14} />
                </div>
                <div className="turn-body">
                  <div
                    className="bubble typing"
                    aria-label="Assistant is typing"
                  >
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="composer-area">
        {error ? (
          <div className="error-banner" role="alert">
            <AlertIcon size={16} />
            <span className="error-text">{error.message}</span>
            <button
              type="button"
              className="btn ghost"
              onClick={() => void regenerate()}
            >
              <RetryIcon size={13} />
              Retry
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={clearError}
              aria-label="Dismiss error"
            >
              <CloseIcon size={14} />
            </button>
          </div>
        ) : null}

        <Composer
          value={input}
          onChange={setInput}
          onSubmit={() => send(input)}
          onStop={stop}
          busy={busy}
          blocked={awaitingApproval}
        />
      </div>
    </div>
  );
}

function statusState(status: string): 'ready' | 'busy' | 'error' | 'idle' {
  if (status === 'error') {
    return 'error';
  }
  if (status === 'submitted' || status === 'streaming') {
    return 'busy';
  }
  return status === 'ready' ? 'ready' : 'idle';
}

function statusLabel(status: string, awaitingApproval: boolean): string {
  if (awaitingApproval) {
    return 'Waiting for you';
  }
  switch (status) {
    case 'submitted':
      return 'Thinking';
    case 'streaming':
      return 'Streaming';
    case 'error':
      return 'Error';
    default:
      return 'Connected';
  }
}
