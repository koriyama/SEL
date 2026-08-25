// src/components/AudioPlayer.jsx
import { useState } from 'react';

export default function AudioPlayer({ src }) {
  const [hasError, setHasError] = useState(false);

  if (!src) return null;

  const handleError = () => {
    setHasError(true);
    console.error('🔊 Audio failed to load:', src);
  };

  return (
    <div className="w-full">
      {hasError ? (
        <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200">
          ⚠️ Audio could not be loaded. Please check the URL or upload again.
        </div>
      ) : (
        <audio
          controls
          className="w-full"
          src={src}
          onError={handleError}
          preload="metadata"
        >
          Your browser does not support the audio element.
        </audio>
      )}
    </div>
  );
}