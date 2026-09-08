// src/components/TextToSpeechGenerator.jsx
import { useState, useEffect } from 'react';
import { generateTts, deleteAudioFile } from '../lib/api';
import AudioPlayer from './AudioPlayer';
import toast from 'react-hot-toast';

const VOICE_OPTIONS = [
  { label: 'English (UK) - Female', languageCode: 'en-GB', voiceName: 'en-GB-Neural2-F' },
  { label: 'English (UK) - Male', languageCode: 'en-GB', voiceName: 'en-GB-Neural2-A' },
  { label: 'English (US) - Female', languageCode: 'en-US', voiceName: 'en-US-Neural2-F' },
  { label: 'English (US) - Male', languageCode: 'en-US', voiceName: 'en-US-Neural2-J' },
  { label: 'English (Australia) - Female', languageCode: 'en-AU', voiceName: 'en-AU-Neural2-F' },
  { label: 'Japanese - Female', languageCode: 'ja-JP', voiceName: 'ja-JP-Neural2-B' },
  { label: 'Japanese - Male', languageCode: 'ja-JP', voiceName: 'ja-JP-Neural2-D' },
  { label: 'Spanish (Spain) - Female', languageCode: 'es-ES', voiceName: 'es-ES-Neural2-F' },
  { label: 'French (France) - Female', languageCode: 'fr-FR', voiceName: 'fr-FR-Neural2-F' },
  { label: 'Mandarin Chinese - Female', languageCode: 'cmn-CN', voiceName: 'cmn-CN-Neural2-F' },
  { label: 'Mandarin Chinese - Male', languageCode: 'cmn-CN', voiceName: 'cmn-CN-Neural2-D' },
];

// Google Cloud TTS limit is 5000 characters (including spaces)
const MAX_CHARS = 5000;

export default function TextToSpeechGenerator({
  defaultText = '',
  onGenerated,
  onDeleted,
  buttonLabel = 'Generate & Upload Audio',
  clearButtonLabel = '🗑️ Remove Audio',
  showClearButton = true,
}) {
  const [text, setText] = useState(defaultText);
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0]);
  const [speakingRate, setSpeakingRate] = useState(1.0);
  const [pitch, setPitch] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  // Character count
  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const remainingChars = MAX_CHARS - charCount;

  // Update text when defaultText prop changes
  useEffect(() => {
    setText(defaultText);
  }, [defaultText]);

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error('Please enter some text to convert.');
      return;
    }

    if (isOverLimit) {
      toast.error(`Text exceeds ${MAX_CHARS} characters. Please shorten it.`);
      return;
    }

    setIsGenerating(true);
    try {
      const url = await generateTts(
        text,
        selectedVoice.languageCode,
        selectedVoice.voiceName,
        speakingRate,
        pitch
      );
      setAudioUrl(url);
      if (onGenerated) {
        onGenerated(url);
      }
      toast.success('Audio generated and uploaded!');
    } catch (err) {
      console.error('TTS generation error:', err);
      toast.error('Failed to generate audio: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (!audioUrl) return;

    const confirmDelete = window.confirm('Delete this audio file? This cannot be undone.');
    if (!confirmDelete) return;

    setIsDeleting(true);
    try {
      await deleteAudioFile(audioUrl);
      setAudioUrl(null);
      if (onDeleted) {
        onDeleted();
      }
      toast.success('Audio deleted successfully!');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete audio: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Get character limit status color
  const getCharColor = () => {
    if (isOverLimit) return 'text-red-600';
    if (remainingChars < 500) return 'text-yellow-600';
    return 'text-warm-500';
  };

  return (
    <div className="space-y-4 p-4 border border-warm-200 rounded-card bg-warm-50">
      {/* Text input with character counter */}
      <div>
        <label className="label">Text to speak</label>
        <textarea
          className="input-field"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type the text you want to convert to speech..."
          maxLength={MAX_CHARS}
        />
        <div className="flex justify-between text-xs mt-1">
          <span className={getCharColor()}>
            {charCount} / {MAX_CHARS} characters
            {isOverLimit && (
              <span className="text-red-600 font-medium block">
                ⚠️ Exceeds limit by {Math.abs(remainingChars)} characters
              </span>
            )}
            {!isOverLimit && remainingChars < 500 && (
              <span className="text-yellow-600 block">
                ⚠️ {remainingChars} characters remaining
              </span>
            )}
          </span>
          <span className="text-warm-400">
            ~{Math.round(charCount / 5)} words
          </span>
        </div>
        <p className="text-xs text-warm-400 mt-1">
          Google Cloud TTS limit: {MAX_CHARS.toLocaleString()} characters per request.
          {charCount > 0 && !isOverLimit && ` You have ${remainingChars} characters remaining.`}
        </p>
      </div>

      {/* Voice & settings */}
      <div className="bg-white p-3 rounded-card border border-warm-200 space-y-3">
        <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider">⚙️ Voice Settings</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Voice</label>
            <select
              className="input-field"
              value={selectedVoice.voiceName}
              onChange={(e) => {
                const chosen = VOICE_OPTIONS.find(v => v.voiceName === e.target.value);
                if (chosen) setSelectedVoice(chosen);
              }}
            >
              {VOICE_OPTIONS.map((v) => (
                <option key={v.voiceName} value={v.voiceName}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Speed ({speakingRate.toFixed(1)})</label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speakingRate}
              onChange={(e) => setSpeakingRate(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-warm-500">
              <span>Slow</span>
              <span>Normal</span>
              <span>Fast</span>
            </div>
          </div>
          <div>
            <label className="label">Pitch ({pitch.toFixed(1)})</label>
            <input
              type="range"
              min="-5.0"
              max="5.0"
              step="0.1"
              value={pitch}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-warm-500">
              <span>Low</span>
              <span>Normal</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !text.trim() || isOverLimit}
          className="btn-primary flex-1 min-w-[150px]"
        >
          {isGenerating ? '⏳ Generating...' : buttonLabel}
        </button>

        {showClearButton && audioUrl && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="btn-secondary text-red-600 hover:text-red-800 border-red-200 hover:border-red-400"
          >
            {isDeleting ? '🗑️ Deleting...' : clearButtonLabel}
          </button>
        )}
      </div>

      {/* Audio Preview */}
      {audioUrl && (
        <div className="mt-2 pt-3 border-t border-warm-200">
          <p className="text-xs font-semibold text-warm-500 uppercase tracking-wider mb-2">▶️ Preview</p>
          <AudioPlayer src={audioUrl} />
        </div>
      )}
    </div>
  );
}