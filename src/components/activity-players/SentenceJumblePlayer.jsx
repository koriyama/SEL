import { useState, useEffect } from 'react';
import { renderInline } from '../../lib/inlineMarkup';

export default function SentenceJumblePlayer({ activity, value = '', onChange, disabled, autoFocus }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  const correctWords = config.words || [];

  // The value is a comma-separated list of indices in the current order (e.g., "2,0,1")
  // If no value, we shuffle the correct words.
  const [order, setOrder] = useState(() => {
    if (value) {
      const indices = value.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
      if (indices.length === correctWords.length) return indices;
    }
    // Shuffle the correct order
    const shuffled = [...Array(correctWords.length).keys()];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  });

  // When correctWords change, re-shuffle (but only if not already user-set)
  useEffect(() => {
    if (!value && correctWords.length > 0) {
      const shuffled = [...Array(correctWords.length).keys()];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setOrder(shuffled);
    }
  }, [correctWords, value]);

  const moveItem = (index, direction) => {
    if (disabled) return;
    const newOrder = [...order];
    const target = index + direction;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setOrder(newOrder);
    onChange(newOrder.join(','));
  };

  if (correctWords.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ No words provided.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {prompt && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {renderInline(prompt)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {order.map((wordIndex, idx) => (
          <div key={idx} className="flex items-center gap-1">
            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600">
              {correctWords[wordIndex]}
            </span>
            {!disabled && (
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => moveItem(idx, -1)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={idx === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveItem(idx, 1)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                  disabled={idx === order.length - 1}
                >
                  ↓
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400">
        Use the arrows to reorder the words.
      </p>
    </div>
  );
}