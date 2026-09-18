import { SparkleIcon } from './icons';

const SUGGESTIONS = [
  'What can you do?',
  'Show my orders',
  'Look up ord_1001',
  'Show my orders, then cancel ord_1002',
];

export function EmptyState({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="empty">
      <div className="empty-glyph">
        <SparkleIcon size={22} />
      </div>
      <h2>Shopping assistant</h2>
      <p>
        A NestJS agent with three tools: list orders, look up an order, and
        cancel one - cancelling asks for your approval first.
      </p>
      <div className="suggestions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            className="suggestion"
            onClick={() => onPick(suggestion)}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
