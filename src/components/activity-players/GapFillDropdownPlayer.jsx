import { renderInline } from '../../lib/inlineMarkup';

export default function GapFillDropdownPlayer({ activity, value = '', onChange, disabled, autoFocus }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  const text = config.text || '';
  const dropdownOptions = config.dropdownOptions || [];

  // Parse text to extract blanks ([[...]]) and text segments
  const parts = [];
  const regex = /\[\[(.*?)\]\]/g;
  let lastIndex = 0;
  let match;
  let blankIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'blank', index: blankIndex++ });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }

  // The value is stored as a comma-separated list of selected indices (e.g., "0,2,1")
  const selectedIndices = value ? value.split(',').map(s => parseInt(s.trim(), 10)) : [];
  const blankValues = selectedIndices.map(idx => {
    const options = dropdownOptions[blankIndex] || [];
    return (idx >= 0 && idx < options.length) ? options[idx] : '';
  });

  const handleSelect = (blankIdx, selectedIndex) => {
    const newIndices = [...selectedIndices];
    newIndices[blankIdx] = selectedIndex;
    // Fill missing with -1
    for (let i = 0; i < blankIndex; i++) {
      if (newIndices[i] === undefined) newIndices[i] = -1;
    }
    onChange(newIndices.join(','));
  };

  if (!text) {
    return (
      <div className="space-y-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <p className="text-yellow-700 dark:text-yellow-300 text-sm">⚠️ This activity has no text.</p>
      </div>
    );
  }

  if (blankIndex === 0) {
    return (
      <div className="space-y-2">
        {prompt && <div className="text-sm font-medium">{renderInline(prompt)}</div>}
        <div className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
          {renderInline(text)}
        </div>
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
          const options = dropdownOptions[part.index] || [];
          const currentVal = selectedIndices[part.index] !== undefined ? selectedIndices[part.index] : -1;
          return (
            <select
              key={`blank-${idx}`}
              value={currentVal}
              onChange={(e) => handleSelect(part.index, parseInt(e.target.value, 10))}
              disabled={disabled}
              autoFocus={autoFocus && part.index === 0}
              className="mx-1 px-2 py-0.5 border-b-2 border-blue-400 bg-transparent focus:outline-none focus:border-blue-600 min-w-[80px] inline-block disabled:opacity-50 disabled:border-gray-300"
            >
              <option value="-1">—</option>
              {options.map((opt, oi) => (
                <option key={oi} value={oi}>{opt}</option>
              ))}
            </select>
          );
        })}
      </div>

      <p className="text-xs text-gray-400">
        {blankIndex} blank{blankIndex > 1 ? 's' : ''} • Select from dropdown
      </p>
    </div>
  );
}