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

  // Track if we've already initialized from props
  const initialized = useRef(false);

  // State: filled array, length = correctWords.length, each entry is either a word index or -1 (empty)
  const [filled, setFilled] = useState([]);

  // State: pool of unused word indices (middle words only)
  const [pool, setPool] = useState([]);

  // Helper: convert filled array to string for storage
  const filledToString = (arr) => arr.map(v => v !== undefined && v !== null ? v : -1).join(',');

  // Helper: parse string to filled array
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

  // Initialize from props when they change
  useEffect(() => {
    if (!correctWords || correctWords.length === 0) {
      setFilled([]);
      setPool([]);
      return;
    }

    const total = correctWords.length;

    // If we have a value, parse it
    if (value) {
      const parsed = parseFilled(value, total);
      // Check if parsed has any valid entries
      if (parsed.some(v => v !== undefined)) {
        setFilled(parsed);
        // Build pool from indices not in filled
        const used = new Set(parsed.filter(v => v !== undefined));
        const remaining = [...Array(total).keys()].filter(idx => !used.has(idx));
        // Shuffle remaining
        for (let i = remaining.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
        }
        setPool(remaining);
        initialized.current = true;
        return;
      }
    }

    // No saved value – set up with first and last words pre-placed
    if (!initialized.current) {
      const firstIdx = 0;
      const lastIdx = total - 1;
      
      // Create filled array with undefined placeholders, then set first and last
      const newFilled = Array(total).fill(undefined);
      newFilled[0] = firstIdx;
      newFilled[total - 1] = lastIdx;
      
      // Middle words go to pool (shuffled)
      const middle = [...Array(total).keys()].filter(idx => idx !== firstIdx && idx !== lastIdx);
      for (let i = middle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [middle[i], middle[j]] = [middle[j], middle[i]];
      }
      
      setFilled(newFilled);
      setPool(middle);
      initialized.current = true;
    }
  }, [correctWords, value]);

  // ---- Handlers ----
  const handleTileClick = (idx) => {
    if (disabled) return;
    if (!pool.includes(idx)) return;
    
    // Find the first empty slot (undefined)
    const emptyIndex = filled.findIndex(val => val === undefined);
    if (emptyIndex === -1) return; // No empty slots
    
    const newFilled = [...filled];
    newFilled[emptyIndex] = idx;
    const newPool = pool.filter(i => i !== idx);
    setFilled(newFilled);
    setPool(newPool);
    onChange(filledToString(newFilled));
  };

  const handleBlankClick = (blankIndex) => {
    if (disabled) return;
    const idx = filled[blankIndex];
    if (idx === undefined) return;
    
    // Don't allow removal of first or last word (pre-placed)
    if (blankIndex === 0 || blankIndex === correctWords.length - 1) {
      return;
    }
    
    // Remove tile from this blank position back to pool
    const newFilled = [...filled];
    newFilled[blankIndex] = undefined;
    const newPool = [...pool, idx];
    // Shuffle pool for randomness
    for (let i = newPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newPool[i], newPool[j]] = [newPool[j], newPool[i]];
    }
    setFilled(newFilled);
    setPool(newPool);
    onChange(filledToString(newFilled));
  };

  // ---- Submit with error handling ----
  const handleSubmit = () => {
    if (disabled) {
      console.warn('⚠️ Submit attempted while disabled');
      return;
    }
    
    if (!onSubmit) {
      console.warn('⚠️ No onSubmit callback provided');
      return;
    }

    try {
      // Validate the current state
      const filledCount = filled.filter(val => val !== undefined).length;
      
      // If not all tiles are placed, confirm with user
      if (filledCount < correctWords.length) {
        const confirmSubmit = window.confirm(
          `You have placed ${filledCount} out of ${correctWords.length} tiles. ` +
          'Do you want to submit the sentence as is?'
        );
        if (!confirmSubmit) {
          return; // User cancelled
        }
      }
      
      // Ensure the filled data is valid before submitting
      const isValid = filled.every(val => {
        if (val === undefined) return true; // Empty slots are OK (handled by confirm)
        return typeof val === 'number' && val >= 0 && val < correctWords.length;
      });
      
      if (!isValid) {
        console.error('❌ Invalid filled data:', filled);
        alert('There was an issue with your answer. Please try rearranging the tiles.');
        return;
      }
      
      // All checks passed - call the onSubmit callback
      console.log('✅ Submitting jumble answer');
      onSubmit();
    } catch (error) {
      console.error('❌ Error during jumble submission:', error);
      alert('Something went wrong. Please try again.');
    }
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
  const filledCount = filled.filter(val => val !== undefined).length;
  const isComplete = filledCount === totalBlanks;

  // Helper to check if a blank position contains a pre-placed word
  const isPrePlaced = (blankIndex) => {
    return blankIndex === 0 || blankIndex === correctWords.length - 1;
  };

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

      {/* Pool of tiles (middle words only) – displayed in a flex wrap */}
      <div className="flex flex-wrap gap-2 justify-center p-2">
        {pool.map((idx) => (
          <div
            key={idx}
            onClick={() => handleTileClick(idx)}
            className={`px-4 py-2 bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 rounded-lg shadow-sm transition ${
              disabled 
                ? 'opacity-50 cursor-not-allowed' 
                : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-blue-400 dark:hover:border-blue-500 active:scale-95'
            }`}
          >
            {correctWords[idx]}
          </div>
        ))}
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