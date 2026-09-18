import { useState } from 'react';
import { toolLabel, type ToolCall } from '../lib/parts';
import { CheckIcon, CloseIcon, ShieldIcon } from './icons';

export type RespondToApproval = (input: {
  id: string;
  approved: boolean;
  reason?: string;
}) => void | PromiseLike<void>;

/**
 * Shown for tools declared with `needsApproval: true` on the Nest side
 * (`cancelOrder` in this starter). The agent resumes once a response is sent.
 */
export function ApprovalCard({
  call,
  approvalId,
  respond,
}: {
  call: ToolCall;
  approvalId: string;
  respond: RespondToApproval;
}) {
  const [sending, setSending] = useState(false);

  async function answer(approved: boolean) {
    setSending(true);
    try {
      await respond({
        id: approvalId,
        approved,
        reason: approved ? undefined : 'User rejected the tool call',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="approval">
      <div className="approval-title">
        <ShieldIcon size={16} />
        Approval required
      </div>
      <p>
        Here is what will run: <code>{call.name}</code> ({toolLabel(call.name)}
        ). It will not execute until you approve it.
      </p>
      <pre>{JSON.stringify(call.input ?? {}, null, 2)}</pre>
      <div className="approval-actions">
        <button
          type="button"
          className="btn"
          disabled={sending}
          onClick={() => void answer(true)}
        >
          <CheckIcon size={14} />
          Approve
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={sending}
          onClick={() => void answer(false)}
        >
          <CloseIcon size={14} />
          Reject
        </button>
      </div>
    </div>
  );
}
