import { formatCents, toolLabel, type ToolCall } from '../lib/parts';
import { ChevronIcon, ToolIcon } from './icons';

type Order = {
  id: string;
  status: string;
  totalCents: number;
  items?: string[];
};

const STATE_CHIPS: Record<ToolCall['state'], { label: string; tone: string }> =
  {
    'input-streaming': { label: 'preparing', tone: 'running' },
    'input-available': { label: 'running', tone: 'running' },
    'approval-requested': { label: 'needs approval', tone: 'warn' },
    'approval-responded': { label: 'running', tone: 'running' },
    'output-available': { label: 'done', tone: 'ok' },
    'output-error': { label: 'failed', tone: 'bad' },
    'output-denied': { label: 'rejected', tone: 'bad' },
  };

const ORDER_TONES: Record<string, string> = {
  pending: 'warn',
  shipped: 'running',
  delivered: 'ok',
  cancelled: 'bad',
};

export function ToolCallCard({ call }: { call: ToolCall }) {
  const chip = STATE_CHIPS[call.state];
  const orders = asOrders(call.output);
  // Approval requests stay collapsed - the approval card below repeats the input.
  const openByDefault = call.state === 'output-error' || Boolean(orders);

  return (
    <details className="tool-card" open={openByDefault}>
      <summary className="tool-head">
        <ToolIcon size={14} />
        <span className="tool-name">{call.name}</span>
        <span className="chip" data-tone={chip.tone}>
          {chip.label}
        </span>
        <span className="tool-preview">{preview(call, orders)}</span>
        <ChevronIcon size={14} className="chevron" />
      </summary>

      <div className="tool-body">
        {hasInput(call.input) ? (
          <div>
            <div className="field-label">Input</div>
            <pre>{json(call.input)}</pre>
          </div>
        ) : null}

        {orders ? (
          <div>
            <div className="field-label">
              {toolLabel(call.name)} - {orders.length}{' '}
              {orders.length === 1 ? 'order' : 'orders'}
            </div>
            <div className="orders">
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </div>
          </div>
        ) : call.output !== undefined ? (
          <div>
            <div className="field-label">Output</div>
            <pre>{json(call.output)}</pre>
          </div>
        ) : null}

        {call.errorText ? (
          <div>
            <div className="field-label">Error</div>
            <pre>{call.errorText}</pre>
          </div>
        ) : null}

        {call.state === 'output-denied' ? (
          <p className="field-label">
            You rejected this call, so it never ran.
          </p>
        ) : null}
      </div>
    </details>
  );
}

function OrderRow({ order }: { order: Order }) {
  return (
    <div>
      <div className="order-row">
        <span className="order-id">{order.id}</span>
        <span
          className="chip"
          data-tone={ORDER_TONES[order.status] ?? 'neutral'}
        >
          {order.status}
        </span>
        <span className="order-total">{formatCents(order.totalCents)}</span>
      </div>
      {order.items?.length ? (
        <ul className="order-items">
          {order.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

/**
 * The starter's order tools return either one order or a list of them. Anything
 * else falls back to raw JSON, so new tools still render something useful.
 */
function asOrders(output: unknown): Order[] | undefined {
  const candidates = Array.isArray(output) ? output : [output];
  const orders = candidates.filter(isOrder);
  return orders.length === candidates.length && orders.length > 0
    ? orders
    : undefined;
}

function isOrder(value: unknown): value is Order {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.status === 'string' &&
    typeof candidate.totalCents === 'number'
  );
}

function json(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

/** `listOrders` takes no arguments - no point showing an empty object. */
function hasInput(input: unknown): boolean {
  if (input === undefined || input === null) {
    return false;
  }
  return typeof input !== 'object' || Object.keys(input).length > 0;
}

/** One-line hint so a collapsed card still says something useful. */
function preview(call: ToolCall, orders: Order[] | undefined): string {
  if (call.errorText) {
    return call.errorText;
  }
  if (orders) {
    return orders.map((order) => order.id).join(', ');
  }
  const orderId = (call.input as { orderId?: string } | undefined)?.orderId;
  return orderId ?? '';
}
