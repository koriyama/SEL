export default function VocabularyMatchingEditor({ activity, onChange, inputRef }) {
  const config = activity.config || {};
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } });

  const pairs = config.pairs || [];

  const addPair = () => {
    const newPairs = [...pairs, { term: '', definition: '' }];
    updateConfig({ pairs: newPairs });
  };

  const removePair = (index) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    updateConfig({ pairs: newPairs });
  };

  const updatePair = (index, field, value) => {
    const newPairs = [...pairs];
    newPairs[index][field] = value;
    updateConfig({ pairs: newPairs });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt</label>
        <textarea
          ref={inputRef}
          className="field-input"
          rows={2}
          value={activity.prompt || ''}
          onChange={(e) => onChange({ ...activity, prompt: e.target.value })}
          placeholder="e.g. Match each word with its correct definition."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Term ↔ Definition pairs</label>
        <div className="space-y-2">
          {pairs.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                className="field-input flex-1"
                placeholder="Term"
                value={pair.term}
                onChange={(e) => updatePair(idx, 'term', e.target.value)}
              />
              <span className="text-gray-400">↔</span>
              <input
                className="field-input flex-1"
                placeholder="Definition"
                value={pair.definition}
                onChange={(e) => updatePair(idx, 'definition', e.target.value)}
              />
              <button
                type="button"
                className="text-red-400 hover:text-red-600 px-1"
                onClick={() => removePair(idx)}
              >
                ×
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-ghost text-xs"
            onClick={addPair}
          >
            + Add Pair
          </button>
        </div>
      </div>
    </div>
  );
}