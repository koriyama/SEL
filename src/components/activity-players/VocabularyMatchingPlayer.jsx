import { useState, useEffect } from 'react';
import { renderInline } from '../../lib/inlineMarkup';

export default function VocabularyMatchingPlayer({ activity, value = '', onChange, disabled, autoFocus }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  const pairs = config.pairs || [];

  // value is a JSON string of matches: { "0": 1, "2": 0 } etc.
  const [matches, setMatches] = useState(() => {
    try {
      return value ? JSON.parse(value) : {};
    } catch { return {}; }
  });

  const [selectedTerm, setSelectedTerm] = useState(null);

  // For display, shuffle the definitions independently (but keep terms in order)
  const [shuffledDefs, setShuffledDefs] = useState([]);

  useEffect(() => {
    // Shuffle definitions on mount or when pairs change
    const defs = pairs.map((_, i) => i);
    for (let i = defs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [defs[i], defs[j]] = [defs[j], defs[i]];
    }
    setShuffledDefs(defs);
  }, [pairs]);

  // When matches change, update parent
  useEffect(() => {
    onChange(JSON.stringify(matches));
  }, [matches, onChange]);

  const handleTermClick = (termIndex) => {
    if (disabled) return;
    if (selectedTerm === termIndex) {
      setSelectedTerm(null);
    } else {
      setSelectedTerm(termIndex);
    }
  };

  const handleDefClick = (defIndex) => {
    if (disabled) return;
    if (selectedTerm === null) return;
    // Check if this definition is already matched
    const alreadyMatched = Object.values(matches).includes(defIndex);
    if (alreadyMatched) {
      // Unmatch the previous term
      const newMatches = { ...matches };
      for (const [key, val] of Object.entries(newMatches)) {
        if (val === defIndex) {
          delete newMatches[key];
          break;
        }
      }
      setMatches(newMatches);
      setSelectedTerm(null);
      return;
    }
    // Check if term already matched
    if (matches[selectedTerm] !== undefined) {
      // Unmatch the old definition
      const newMatches = { ...matches };
      delete newMatches[selectedTerm];
      setMatches(newMatches);
    }
    // Assign new match
    setMatches({ ...matches, [selectedTerm]: defIndex });
    setSelectedTerm(null);
  };

  if (pairs.length === 0) {
    return (
      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ No vocabulary pairs provided.</p>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Terms</h4>
          {pairs.map((pair, idx) => {
            const isMatched = matches[idx] !== undefined;
            const isSelected = selectedTerm === idx;
            return (
              <div
                key={idx}
                className={`p-2 border rounded cursor-pointer transition ${
                  isMatched ? 'bg-green-100 dark:bg-green-900/30 border-green-400' :
                  isSelected ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-400' :
                  'bg-white dark:bg-gray-800 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleTermClick(idx)}
              >
                {pair.term}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">Definitions</h4>
          {shuffledDefs.map((defIdx) => {
            const isMatched = Object.values(matches).includes(defIdx);
            const pair = pairs[defIdx];
            return (
              <div
                key={defIdx}
                className={`p-2 border rounded cursor-pointer transition ${
                  isMatched ? 'bg-green-100 dark:bg-green-900/30 border-green-400' :
                  'bg-white dark:bg-gray-800 border-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                onClick={() => handleDefClick(defIdx)}
              >
                {pair.definition}
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-gray-400">
        Click a term, then click a definition to match. Click a matched pair to unmatch.
      </p>
    </div>
  );
}