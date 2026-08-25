import { useState, useEffect, useRef } from 'react';
import { renderInline } from '../../lib/inlineMarkup';

export default function VocabularyMatchingPlayer({ activity, value = '', onChange, disabled, autoFocus }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  const pairs = config.pairs || [];

  // value stores the first attempts as JSON: { "0": 0, "2": 2, "1": -1 } etc.
  // -1 means "attempted but wrong" (or not yet attempted if undefined)
  const [firstAttempts, setFirstAttempts] = useState(() => {
    try {
      return value ? JSON.parse(value) : {};
    } catch { return {}; }
  });

  // Temporary state for visual feedback
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [wrongPair, setWrongPair] = useState(null); // { term: idx, def: idx }
  const timeoutRef = useRef(null);

  // Track which pairs are currently correctly matched (for UI only)
  const [correctMatches, setCorrectMatches] = useState(() => {
    const matches = {};
    Object.entries(firstAttempts).forEach(([termIdx, defIdx]) => {
      if (parseInt(termIdx, 10) === defIdx) {
        matches[termIdx] = defIdx;
      }
    });
    return matches;
  });

  // Shuffle definitions on mount
  const [shuffledDefs, setShuffledDefs] = useState([]);

  useEffect(() => {
    const defs = pairs.map((_, i) => i);
    for (let i = defs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [defs[i], defs[j]] = [defs[j], defs[i]];
    }
    setShuffledDefs(defs);
  }, [pairs]);

  // When firstAttempts changes, update parent and derive correctMatches
  useEffect(() => {
    onChange(JSON.stringify(firstAttempts));
    const matches = {};
    Object.entries(firstAttempts).forEach(([termIdx, defIdx]) => {
      const t = parseInt(termIdx, 10);
      const d = parseInt(defIdx, 10);
      if (t === d) {
        matches[t] = d;
      }
    });
    setCorrectMatches(matches);
  }, [firstAttempts, onChange]);

  // Clear wrongPair after timeout
  useEffect(() => {
    if (wrongPair) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setWrongPair(null);
      }, 1500);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [wrongPair]);

  if (pairs.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ No vocabulary pairs provided.</p>
      </div>
    );
  }

  // Helpers
  const isTermMatched = (termIdx) => correctMatches[termIdx] !== undefined;
  const isDefMatched = (defIdx) => Object.values(correctMatches).includes(defIdx);
  
  // Has the term already been attempted (correct or wrong)?
  const isTermAttempted = (termIdx) => firstAttempts[termIdx] !== undefined;

  const handleTermClick = (termIdx) => {
    if (disabled) return;
    if (isTermMatched(termIdx)) return;
    if (wrongPair) return;
    if (selectedTerm === termIdx) {
      setSelectedTerm(null);
    } else {
      setSelectedTerm(termIdx);
    }
  };

  const handleDefClick = (defIdx) => {
    if (disabled) return;
    if (isDefMatched(defIdx)) return;
    if (wrongPair) return;
    if (selectedTerm === null) return;

    const termIdx = selectedTerm;
    if (isTermMatched(termIdx)) {
      setSelectedTerm(null);
      return;
    }

    // Check if this term already has a first attempt (shouldn't happen if matched, but guard)
    if (isTermAttempted(termIdx)) {
      setSelectedTerm(null);
      return;
    }

    // Determine if correct (term index == definition index)
    const isCorrect = termIdx === defIdx;

    // Record the first attempt
    setFirstAttempts((prev) => ({
      ...prev,
      [termIdx]: isCorrect ? defIdx : -1 // -1 means "attempted but wrong"
    }));

    if (isCorrect) {
      // Correct – grey out immediately
      setSelectedTerm(null);
    } else {
      // Wrong – show red feedback
      setWrongPair({ term: termIdx, def: defIdx });
      setSelectedTerm(null);
      // The item will revert after timeout, but the firstAttempt is locked as -1.
    }
  };

  // UI classes
  const getTermClass = (termIdx) => {
    if (isTermMatched(termIdx)) {
      return 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 opacity-60 cursor-not-allowed';
    }
    if (wrongPair && wrongPair.term === termIdx) {
      return 'bg-red-300 dark:bg-red-700 border-red-500 dark:border-red-400';
    }
    // Check if it was attempted but wrong (firstAttempts[termIdx] === -1) – we want it to look normal but maybe show a subtle marker?
    // We'll keep it normal so they can still practice.
    if (selectedTerm === termIdx) {
      return 'bg-green-300 dark:bg-green-700 border-green-500 dark:border-green-400';
    }
    return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer';
  };

  const getDefClass = (defIdx) => {
    if (isDefMatched(defIdx)) {
      return 'bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 opacity-60 cursor-not-allowed';
    }
    if (wrongPair && wrongPair.def === defIdx) {
      return 'bg-red-300 dark:bg-red-700 border-red-500 dark:border-red-400';
    }
    return 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer';
  };

  // Count how many terms are still un-attempted
  const attemptedCount = Object.keys(firstAttempts).length;
  const totalPairs = pairs.length;
  const remaining = totalPairs - attemptedCount;

  return (
    <div className="space-y-3">
      {prompt && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {renderInline(prompt)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Terms</h4>
          {pairs.map((pair, idx) => (
            <div
              key={idx}
              className={`p-2 border rounded transition-colors ${getTermClass(idx)}`}
              onClick={() => handleTermClick(idx)}
            >
              {pair.term}
              {/* Show a small indicator if attempted but wrong */}
              {firstAttempts[idx] === -1 && !isTermMatched(idx) && (
                <span className="ml-2 text-xs text-red-500">(tried)</span>
              )}
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Definitions</h4>
          {shuffledDefs.map((defIdx) => {
            const pair = pairs[defIdx];
            return (
              <div
                key={defIdx}
                className={`p-2 border rounded transition-colors ${getDefClass(defIdx)}`}
                onClick={() => handleDefClick(defIdx)}
              >
                {pair.definition}
                {/* Show a small indicator if this definition was wrongly attempted */}
                {wrongPair && wrongPair.def === defIdx && (
                  <span className="ml-2 text-xs text-red-500">(wrong)</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>{remaining} pair{remaining !== 1 ? 's' : ''} remaining to attempt</span>
        <span>
          {attemptedCount - Object.keys(correctMatches).length} wrong • {Object.keys(correctMatches).length} correct
        </span>
      </div>
      <p className="text-xs text-gray-400">
        Your first attempt for each pair determines your score. Wrong attempts can be practised again, but the score is locked.
      </p>
    </div>
  );
}