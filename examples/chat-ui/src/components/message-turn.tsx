import type { UIMessage } from 'ai';
import { Markdown } from '../lib/markdown';
import { messageBlocks } from '../lib/parts';
import { ApprovalCard, type RespondToApproval } from './approval-card';
import { ChevronIcon, SparkleIcon, UserIcon } from './icons';
import { ToolCallCard } from './tool-call-card';

export function MessageTurn({
  message,
  respond,
}: {
  message: UIMessage;
  respond: RespondToApproval;
}) {
  const isUser = message.role === 'user';

  return (
    <article className={`turn ${isUser ? 'user' : 'assistant'}`}>
      <div className="avatar" aria-hidden="true">
        {isUser ? <UserIcon size={14} /> : <SparkleIcon size={14} />}
      </div>

      <div className="turn-body">
        <span className="sr-only">{isUser ? 'You' : 'Assistant'}</span>

        {messageBlocks(message).map((block) => {
          if (block.kind === 'text') {
            return (
              <div className="bubble" key={block.key}>
                <Markdown text={block.text} />
              </div>
            );
          }

          if (block.kind === 'reasoning') {
            return (
              <details className="tool-card" key={block.key}>
                <summary className="tool-head">
                  <span className="tool-name">Reasoning</span>
                  <ChevronIcon size={14} className="chevron" />
                </summary>
                <div className="tool-body">
                  <Markdown text={block.text} />
                </div>
              </details>
            );
          }

          return (
            <div className="tool-block" key={block.key}>
              <ToolCallCard call={block.call} />
              {block.call.approvalId ? (
                <ApprovalCard
                  call={block.call}
                  approvalId={block.call.approvalId}
                  respond={respond}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}
