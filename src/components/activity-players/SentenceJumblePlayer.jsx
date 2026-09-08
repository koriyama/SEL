// src/components/activity-players/SentenceJumblePlayer.jsx
import { useState, useEffect, useRef } from 'react';
import { renderInline } from '../../lib/inlineMarkup';

export default function SentenceJumblePlayer({ 
  activity, 
  value = '', 
  onChange, 
  disabled, 
  autoFocus,
  onSubmit
}) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  const correctWords = config.words || [];

  // Ref to guard against re-initializing on value changes after first load
  const initializedRef = useRef(false);

  // State: filled array, each entry is a word index or undefined (empty)
  const [filled, setFilled] = useState([]);

  // State: pool of all middle indices with a 'placed' flag – fixed length
  const [pool, setPool] = useState([]); // array of { index, placed }

  // Helper: convert filled array to a comma‑separated string for storage
  const filledToString = (arr) =>
    arr.map(v => (v !== undefined && v !== null ? v : -1)).join(',');

  // Helper: parse stored string back to a filled array
  const parseFilled = (str, length) => {
    if (!str) return Array(length).fill(undefined);
    const parts = str.split(',').map(s => parseInt(s.trim(), 10));
    const result = [];
    for (let i = 0; i < length; i++) {
      const val = i < parts.length ? parts[i] : -1;
      result.push(val === -1 ? undefined : val);
    }
    return result;
  };

  // ---- Initialise – only when the word list changes (not on every value update) ----
  useEffect(() => {
    if (!correctWords || correctWords.length === 0) {
      setFilled([]);
      setPool([]);
      initializedRef.current = false;
      return;
    }

    const total = correctWords.length;
    const firstIdx = 0;
    const lastIdx = total - 1;

    // If we have a saved value and haven't initialised yet, parse it
    if (value && !initializedRef.current) {
      const parsed = parseFilled(value, total);
      if (parsed.some(v => v !== undefined)) {
        const used = new Set(parsed.filter(v => v !== undefined));
        const middle = [...Array(total).keys()].filter(idx => idx !== firstIdx && idx !== lastIdx);
        // Shuffle middle once
        for (let i = middle.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [middle[i], middle[j]] = [middle[j], middle[i]];
        }
        const poolData = middle.map(idx => ({
          index: idx,
          placed: used.has(idx)
        }));
        setFilled(parsed);
        setPool(poolData);
        initializedRef.current = true;
        return;
      }
    }

    // No saved value – start with first and last pre‑placed
    const newFilled = Array(total).fill(undefined);
    newFilled[0] = firstIdx;
    newFilled[total - 1] = lastIdx;
    setFilled(newFilled);

    // Shuffle middle words once, all unplaced
    const middle = [...Array(total).keys()].filter(idx => idx !== firstIdx && idx !== lastIdx);
    for (let i = middle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [middle[i], middle[j]] = [middle[j], middle[i]];
    }
    const poolData = middle.map(idx => ({ index: idx, placed: false }));
    setPool(poolData);
    initializedRef.current = true;
  }, [correctWords]); // <-- only runs when the word list changes, not on value updates

  // ---- Handlers ----
  const handleTileClick = (item) => {
    if (disabled || item.placed) return;

    const emptyIndex = filled.findIndex(val => val === undefined);
    if (emptyIndex === -1) return;

    const newFilled = [...filled];
    newFilled[emptyIndex] = item.index;
    setFilled(newFilled);

    // Mark the tile as placed (keeps pool length constant)
    const newPool = pool.map(p =>
      p.index === item.index ? { ...p, placed: true } : p
    );
    setPool(newPool);

    onChange(filledToString(newFilled));
  };

  const handleBlankClick = (blankIndex) => {
    if (disabled) return;
    const idx = filled[blankIndex];
    if (idx === undefined) return;

    // Don't allow removal of first or last word
    if (blankIndex === 0 || blankIndex === correctWords.length - 1) return;

    const newFilled = [...filled];
    newFilled[blankIndex] = undefined;
    setFilled(newFilled);

    // Mark the tile as unplaced
    const newPool = pool.map(p =>
      p.index === idx ? { ...p, placed: false } : p
    );
    setPool(newPool);

    onChange(filledToString(newFilled));
  };

  // ---- Submit ----
  const handleSubmit = () => {
    if (disabled || !onSubmit) return;

    const filledCount = filled.filter(v => v !== undefined).length;
    if (filledCount < correctWords.length) {
      if (!window.confirm(
        `You have placed ${filledCount} out of ${correctWords.length} tiles. ` +
        'Do you want to submit the sentence as is?'
      )) return;
    }
    onSubmit();
  };

  // ---- Render ----
  if (correctWords.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ No words provided.</p>
      </div>
    );
  }

  const totalBlanks = correctWords.length;
  const filledCount = filled.filter(v => v !== undefined).length;
  const isComplete = filledCount === totalBlanks;

  const isPrePlaced = (blankIndex) =>
    blankIndex === 0 || blankIndex === correctWords.length - 1;

  return (
    <div className="space-y-4">
      {prompt && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {renderInline(prompt)}
        </div>
      )}

      {/* Blanks row */}
      <div className="flex flex-wrap gap-2 justify-center py-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 min-h-[60px]">
        {Array.from({ length: totalBlanks }).map((_, idx) => {
          const wordIdx = filled[idx];
          const word = wordIdx !== undefined ? correctWords[wordIdx] : null;
          const prePlaced = isPrePlaced(idx);
          const isFilled = word !== null;

          return (
            <div
              key={idx}
              onClick={() => handleBlankClick(idx)}
              className={`relative w-20 h-12 flex items-center justify-center border-2 rounded-lg transition ${
                isFilled
                  ? prePlaced
                    ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 text-gray-800 dark:text-white cursor-default opacity-80'
                    : 'bg-blue-100 dark:bg-blue-900/30 border-blue-400 dark:border-blue-600 text-gray-800 dark:text-white cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-800/30'
                  : 'border-gray-400 dark:border-gray-500 bg-transparent hover:border-gray-600 dark:hover:border-gray-400'
              }`}
            >
              {word !== null ? word : '____'}
              {prePlaced && isFilled && (
                <span className="absolute -top-2 -right-2 text-[8px] bg-green-500 text-white rounded-full px-1">
                  ✓
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pool of tiles – stable layout, placed tiles are invisible but occupy space */}
      <div className="flex flex-wrap gap-2 justify-center p-2">
        {pool.map((item) => {
          const isPlaced = item.placed;
          const word = correctWords[item.index];
          return (
            <div
              key={item.index}
              onClick={() => handleTileClick(item)}
              className={`px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 rounded-lg shadow-sm transition ${
                disabled || isPlaced
                  ? 'opacity-0 pointer-events-none'
                  : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 active:scale-95'
              }`}
              style={{ minWidth: '3rem', textAlign: 'center' }}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* Submit button */}
      {!disabled && onSubmit && (
        <div className="flex justify-center mt-4">
          <button
            onClick={handleSubmit}
            className={`px-6 py-2 rounded-lg font-medium text-white transition ${
              isComplete
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isComplete ? '✅ Submit Complete' : '📤 Submit (incomplete)'}
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        The first and last words are pre-placed. Tap a tile to fill the next blank. Tap a filled blank (blue) to remove it.
      </p>
    </div>
  );
}