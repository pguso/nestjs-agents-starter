import { useEffect, useRef, type KeyboardEvent } from 'react';
import { SendIcon, StopIcon } from './icons';

export function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  busy,
  blocked,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop: () => void;
  busy: boolean;
  /** True while a tool approval is pending - the agent is waiting on a decision. */
  blocked: boolean;
}) {
  const textarea = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const node = textarea.current;
    if (!node) {
      return;
    }
    node.style.height = 'auto';
    node.style.height = `${node.scrollHeight}px`;
  }, [value]);

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  const canSend = value.trim().length > 0 && !busy && !blocked;

  return (
    <>
      <div className="composer">
        <textarea
          ref={textarea}
          rows={1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={
            blocked
              ? 'Approve or reject to continue…'
              : 'Ask about your orders, or cancel ord_1002…'
          }
          disabled={blocked}
          aria-label="Message"
        />
        {busy ? (
          <button
            type="button"
            className="send-button stop"
            onClick={onStop}
            aria-label="Stop generating"
          >
            <StopIcon size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="send-button"
            onClick={onSubmit}
            disabled={!canSend}
            aria-label="Send message"
          >
            <SendIcon size={16} />
          </button>
        )}
      </div>
      <div className="composer-hint">
        <span>
          <kbd>Enter</kbd> to send, <kbd>Shift</kbd> + <kbd>Enter</kbd> for a
          new line
        </span>
        <span className="spacer" />
        <span>Streams the AI SDK UI message protocol</span>
      </div>
    </>
  );
}
