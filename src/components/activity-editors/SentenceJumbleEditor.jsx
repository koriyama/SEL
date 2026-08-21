export default function SentenceJumbleEditor({ activity, onChange, inputRef }) {
  const config = activity.config || {};
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } });

  const wordsString = (config.words || []).join(' ');

  const handleWordsChange = (e) => {
    const raw = e.target.value;
    const words = raw.split(/\s+/).filter(w => w.trim());
    updateConfig({ words });
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
          placeholder="e.g. Put the words in the correct order to form a sentence."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Words (correct order)</label>
        <input
          className="field-input"
          value={wordsString}
          onChange={handleWordsChange}
          placeholder="The cat sat on the mat"
        />
        <p className="text-xs text-muted mt-1">
          Enter the words in the correct order, separated by spaces. The student will see them shuffled.
        </p>
      </div>
    </div>
  );
}