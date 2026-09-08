// src/components/activity-players/ShortAnswerPlayer.jsx
import React, { useState, useEffect } from 'react';
import MicrophoneButton from '../MicrophoneButton';

export default function ShortAnswerPlayer({ activity, value, onChange, disabled, language }) {
  const prompt = activity.prompt || '';

  const [text, setText] = useState(value || '');

  useEffect(() => {
    if (value !== text) {
      setText(value || '');
    }
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    onChange(val);
  };

  const handleTranscript = (transcript) => {
    setText(transcript);
    onChange(transcript);
  };

  return (
    <div className="space-y-3">
      {prompt && <div className="text-sm font-medium">{prompt}</div>}
      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-input border border-warm-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200 resize-y min-h-[100px] disabled:opacity-60"
          placeholder="Write your answer..."
        />
        {!disabled && (
          <div className="absolute bottom-2 right-2">
            <MicrophoneButton
              onTranscript={handleTranscript}
              disabled={disabled}
              language={language === 'ja' ? 'ja-JP' : 'en-US'}
            />
          </div>
        )}
      </div>
    </div>
  );
}