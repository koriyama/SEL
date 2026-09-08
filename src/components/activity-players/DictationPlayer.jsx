// src/components/activity-players/DictationPlayer.jsx
import React, { useState, useEffect } from 'react';
import MicrophoneButton from '../MicrophoneButton';

export default function DictationPlayer({ activity, value, onChange, disabled, language }) {
  const config = activity.config || {};
  const expected = config.expected_text || '';
  const prompt = activity.prompt || '';

  const [text, setText] = useState(value || '');
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (value !== text) {
      setText(value || '');
    }
  }, [value]);

  const handleChange = (e) => {
    const val = e.target.value;
    setText(val);
    onChange(val);
    setShowFeedback(false);
  };

  const handleTranscript = (transcript) => {
    setText(transcript);
    onChange(transcript);
    setShowFeedback(false);
  };

  const checkAnswer = () => {
    if (!expected) {
      setFeedback('No expected text provided for grading.');
      setShowFeedback(true);
      return;
    }
    const user = text.trim().toLowerCase();
    const expectedLower = expected.trim().toLowerCase();
    const isCorrect = user === expectedLower;
    setFeedback({
      correct: isCorrect,
      message: isCorrect
        ? '✅ Correct!'
        : `❌ Incorrect. Expected: "${expected}"`
    });
    setShowFeedback(true);
  };

  return (
    <div className="space-y-3">
      {prompt && <div className="text-sm font-medium">{prompt}</div>}
      <div className="relative">
        <textarea
          value={text}
          onChange={handleChange}
          disabled={disabled}
          className="w-full px-4 py-3 rounded-input border border-warm-200 focus:border-primary-400 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200 resize-y min-h-[80px] disabled:opacity-60"
          placeholder="Type what you hear..."
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
      {!disabled && expected && (
        <div className="flex justify-end">
          <button
            onClick={checkAnswer}
            className="btn-secondary text-sm"
          >
            Check Answer
          </button>
        </div>
      )}
      {showFeedback && feedback && (
        <div className={`p-3 rounded-input text-sm ${feedback.correct ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {feedback.message}
        </div>
      )}
    </div>
  );
}