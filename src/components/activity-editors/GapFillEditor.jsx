// src/components/activity-editors/GapFillEditor.jsx
export default function GapFillEditor({ activity, onChange }) {
  const config = activity.config || {};
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } });

  const [answerString, setAnswerString] = useState(
    config.answers ? config.answers.join(', ') : ''
  );

  useEffect(() => {
    setAnswerString(config.answers ? config.answers.join(', ') : '');
  }, [config.answers]);

  const handleAnswerBlur = () => {
    const arr = answerString.split(',').map(s => s.trim()).filter(Boolean);
    updateConfig({ answers: arr });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt (English)</label>
        <textarea
          className="field-input"
          rows={2}
          value={activity.prompt_en || ''}
          onChange={(e) => onChange({ ...activity, prompt_en: e.target.value })}
          placeholder="e.g. Fill in the missing words."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Prompt (日本語)</label>
        <textarea
          className="field-input"
          rows={2}
          value={activity.prompt_ja || ''}
          onChange={(e) => onChange({ ...activity, prompt_ja: e.target.value })}
          placeholder="例：欠けている単語を埋めてください。"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Text with blanks (English)</label>
        <textarea
          className="field-input"
          rows={3}
          value={config.text_en || ''}
          onChange={(e) => updateConfig({ text_en: e.target.value })}
          placeholder='Use [[curly brackets]], ____, or ___ for blanks, e.g. "The ___ sat on the ___."'
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Text with blanks (日本語)</label>
        <textarea
          className="field-input"
          rows={3}
          value={config.text_ja || ''}
          onChange={(e) => updateConfig({ text_ja: e.target.value })}
          placeholder='例：「____ は ____ に座った。」'
        />
        <p className="text-xs text-muted mt-1">
          Use <code className="bg-gray-100 px-1">[[ ]]</code>, <code className="bg-gray-100 px-1">____</code>, or <code className="bg-gray-100 px-1">___</code> around the missing word(s).
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Answer key (one per blank, comma separated)</label>
        <input
          className="field-input"
          value={answerString}
          onChange={(e) => setAnswerString(e.target.value)}
          onBlur={handleAnswerBlur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAnswerBlur();
            }
          }}
          placeholder="great, trivialised|trivialized, New York|New York City"
        />
        <p className="text-xs text-muted mt-1">
          For each blank, list acceptable answers separated by commas. 
          To allow multiple variants for one blank, separate them with a pipe (<code className="bg-gray-100 px-1">|</code>). 
          Spaces around the pipe are ignored. <strong>Multi‑word answers (e.g., "New York") are supported</strong>.
        </p>
      </div>
    </div>
  );
}