// src/components/activity-players/DictationPlayer.jsx
import { useState, useRef, useEffect } from 'react';
import { renderInline } from '../../lib/inlineMarkup';
import AudioPlayer from '../AudioPlayer';

export default function DictationPlayer({ activity, value, onChange, disabled }) {
  const config = activity.config || {};
  const prompt = activity.prompt || '';
  // Check both top-level and config audio_url
  const audioUrl = activity.audio_url || config.audio_url || null;
  const [text, setText] = useState(value || '');
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // Set up speech recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setText(transcript);
        onChange(transcript);
        setIsRecording(false);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onChange]);

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    setIsRecording(true);
    recognitionRef.current.start();
  };

  const handleChange = (e) => {
    setText(e.target.value);
    onChange(e.target.value);
  };

  return (
    <div className="space-y-3">
      {/* Prompt */}
      {prompt && (
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {renderInline(prompt)}
        </div>
      )}

      {/* Audio Player */}
      {audioUrl ? (
        <AudioPlayer src={audioUrl} />
      ) : (
        <div className="text-sm text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-3 py-2">
          ⚠️ No audio provided for this dictation activity.
        </div>
      )}

      {/* Input area with microphone button */}
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <label htmlFor={`dictation-${activity.id}`} className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Your dictation
          </label>
          <textarea
            id={`dictation-${activity.id}`}
            className="field-input w-full"
            rows={4}
            value={text}
            onChange={handleChange}
            placeholder="Type what you hear..."
            disabled={disabled}
          />
        </div>
        {/* Microphone button – visible even when disabled (but greyed out) */}
        <button
          onClick={startRecording}
          disabled={isRecording || disabled}
          className={`mt-6 px-3 py-2 rounded-lg font-medium transition min-h-[44px] ${
            isRecording
              ? 'bg-red-500 text-white animate-pulse'
              : disabled
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          title={disabled ? 'Microphone disabled in preview mode' : 'Speak instead of typing'}
        >
          🎤
        </button>
      </div>

      {/* Recording status */}
      {isRecording && (
        <p className="text-xs text-red-500 animate-pulse">🎙️ Listening… Speak now.</p>
      )}

      {/* Help text */}
      <p className="text-xs text-gray-400">
        Type what you hear, or use the microphone button to speak your answer.
      </p>
    </div>
  );
}