import { useState, useEffect } from 'react';

export default function GapFillDropdownEditor({ activity, onChange, inputRef }) {
  const config = activity.config || {};
  const updateConfig = (patch) => onChange({ ...activity, config: { ...config, ...patch } });

  // Text with blanks: use [[ ]] to mark blanks, e.g., "The [[cat]] sat on the [[mat]]."
  const [text, setText] = useState(config.text || '');
  const [optionsString, setOptionsString] = useState(
    config.dropdownOptions ? config.dropdownOptions.map(arr => arr.join(' | ')).join('\n') : ''
  );

  useEffect(() => {
    setText(config.text || '');
    setOptionsString(
      config.dropdownOptions ? config.dropdownOptions.map(arr => arr.join(' | ')).join('\n') : ''
    );
  }, [config.text, config.dropdownOptions]);

  const handleOptionsBlur = () => {
    const lines = optionsString.split('\n').filter(line => line.trim());
    const parsed = lines.map(line => line.split('|').map(s => s.trim()).filter(Boolean));
    updateConfig({ dropdownOptions: parsed });
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
          placeholder="e.g. Choose the correct word for each blank."
        />
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Text with blanks</label>
        <textarea
          className="field-input"
          rows={3}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            updateConfig({ text: e.target.value });
          }}
          placeholder='Use [[curly brackets]] for blanks, e.g. "The [[cat]] sat on the [[mat]]."'
        />
        <p className="text-xs text-muted mt-1">
          Mark each blank with <code className="bg-gray-100 px-1">[[ ]]</code>.
        </p>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600">Dropdown options (one line per blank)</label>
        <textarea
          className="field-input"
          rows={4}
          value={optionsString}
          onChange={(e) => setOptionsString(e.target.value)}
          onBlur={handleOptionsBlur}
          placeholder="cat | dog | fish&#10;mat | rug | floor"
        />
        <p className="text-xs text-muted mt-1">
          Each line corresponds to a blank in order. Separate options with a pipe (<code className="bg-gray-100 px-1">|</code>).
          The first option in each line will be considered the correct answer.
        </p>
      </div>
    </div>
  );
}