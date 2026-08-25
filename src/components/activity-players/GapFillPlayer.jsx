// src/components/activity-players/GapFillPlayer.jsx
import { useState, useEffect, useRef } from 'react';
import { renderInline } from '../../lib/inlineMarkup';

export default function GapFillPlayer({ activity, value = '', onChange, disabled, autoFocus, language = 'en' }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  
  // Choose text based on language
  let textWithBlanks = '';
  if (language === 'ja' && config.text_ja) {
    textWithBlanks = config.text_ja;
  } else if (config.text_en) {
    textWithBlanks = config.text_en;
  } else {
    textWithBlanks = config.text || '';
  }

  // Parse the text to extract blanks and text segments
  const parts = [];
  let blankIndex = 0;
  let lastIndex = 0;
  const regex = /(\[\[.*?\]\]|____|___)/g;
  let match;

  while ((match = regex.exec(textWithBlanks)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: textWithBlanks.slice(lastIndex, match.index)
      });
    }
    parts.push({
      type: 'blank',
      index: blankIndex++
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < textWithBlanks.length) {
    parts.push({
      type: 'text',
      content: textWithBlanks.slice(lastIndex)
    });
  }

  // Parse the initial values from the parent
  const initialValues = value ? value.split(',').map(s => s.trim()) : [];

  // Local state for each blank's text
  const [blankValues, setBlankValues] = useState(() => {
    const vals = [...initialValues];
    while (vals.length < blankIndex) vals.push('');
    return vals.slice(0, blankIndex);
  });

  // When parent value changes, update local state (e.g., on load or reset)
  useEffect(() => {
    const newVals = value ? value.split(',').map(s => s.trim()) : [];
    const filled = [...newVals];
    while (filled.length < blankIndex) filled.push('');
    setBlankValues(filled.slice(0, blankIndex));
  }, [value, blankIndex]);

  // Notify parent when a blank loses focus (or on unmount)
  const handleBlur = () => {
    const trimmed = blankValues.map(v => v.trim());
    const joined = trimmed.join(', ');
    if (joined !== value) {
      onChange(joined);
    }
  };

  // Update local state on input change
  const handleChange = (index, newText) => {
    const newVals = [...blankValues];
    newVals[index] = newText;
    setBlankValues(newVals);
  };

  // Also update on unmount
  useEffect(() => {
    return () => {
      handleBlur();
    };
  }, [blankValues]);

  if (!textWithBlanks) {
    return (
      <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ This gap-fill activity has no text.</p>
      </div>
    );
  }

  if (blankIndex === 0) {
    return (
      <div className="space-y-2">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {renderInline(textWithBlanks)}
        </div>
        <p className="text-xs text-gray-400">No blanks found in this activity.</p>
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

      <div className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <span key={`text-${idx}`}>{renderInline(part.content)}</span>;
          }
          const blankIdx = part.index;
          return (
            <textarea
              key={`blank-${idx}`}
              rows={1}
              value={blankValues[blankIdx] || ''}
              onChange={(e) => handleChange(blankIdx, e.target.value)}
              onBlur={handleBlur}
              disabled={disabled}
              autoFocus={autoFocus && blankIdx === 0}
              className="mx-1 px-2 py-0.5 border-b-2 border-blue-400 bg-transparent focus:outline-none focus:border-blue-600 min-w-[120px] w-auto inline-block align-bottom resize-none overflow-hidden disabled:opacity-50 disabled:border-gray-300"
              placeholder="Type answer (spaces allowed)"
              style={{ 
                minWidth: '120px',
                height: '2rem',
                lineHeight: '1.5rem',
                verticalAlign: 'bottom'
              }}
              spellCheck="false"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
            />
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-gray-400">
        <span>
          {blankIndex} blank{blankIndex > 1 ? 's' : ''}
        </span>
        <span>💡 You can type multiple words in each blank.</span>
      </div>
    </div>
  );
}