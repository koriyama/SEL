// src/components/ReferenceDrawer.jsx
import { useState, useRef, useEffect } from 'react';
import AudioPlayer from './AudioPlayer';
import ReadingText from './ReadingText';

export default function ReferenceDrawer({ lesson, audioUrl, imageUrls, vocabulary = [] }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('reading');
  const drawerRef = useRef(null);

  const toggleDrawer = () => setIsOpen(prev => !prev);

  useEffect(() => {
    function handleClickOutside(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target) && isOpen) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const hasContent = {
    reading: !!lesson?.reading_text,
    audio: !!audioUrl,
    images: imageUrls && imageUrls.length > 0,
    vocab: vocabulary && vocabulary.length > 0
  };

  useEffect(() => {
    if (!hasContent[activeTab]) {
      const firstAvailable = Object.keys(hasContent).find(key => hasContent[key]);
      if (firstAvailable) setActiveTab(firstAvailable);
    }
  }, [activeTab, hasContent]);

  if (!hasContent.reading && !hasContent.audio && !hasContent.images && !hasContent.vocab) {
    return null;
  }

  return (
    <div
      ref={drawerRef}
      className={`fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl transition-transform duration-300 ease-in-out max-h-[85vh] flex flex-col
        ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'}`}
      style={{ height: '85vh' }}
    >
      {/* Drawer handle */}
      <div
        className="flex-shrink-0 flex justify-center items-center py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 rounded-t-3xl transition touch-manipulation"
        onClick={toggleDrawer}
        style={{ minHeight: '60px' }}
      >
        <div className="w-16 h-2 bg-gray-400 dark:bg-gray-600 rounded-full"></div>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          {isOpen ? '▼ Tap to hide' : '▲ Tap to show'}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-gray-200 dark:border-gray-700 px-4 gap-1 overflow-x-auto">
        {hasContent.reading && (
          <button
            onClick={() => setActiveTab('reading')}
            className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition ${
              activeTab === 'reading'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            📖 Reading
          </button>
        )}
        {hasContent.audio && (
          <button
            onClick={() => setActiveTab('audio')}
            className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition ${
              activeTab === 'audio'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            🎧 Audio
          </button>
        )}
        {hasContent.images && (
          <button
            onClick={() => setActiveTab('images')}
            className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition ${
              activeTab === 'images'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            🖼️ Images
          </button>
        )}
        {hasContent.vocab && (
          <button
            onClick={() => setActiveTab('vocab')}
            className={`px-4 py-3 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition ${
              activeTab === 'vocab'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            📚 Vocabulary ({vocabulary.length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Reading */}
        {hasContent.reading && (
          <div className={activeTab === 'reading' ? 'block' : 'hidden'}>
            {/* Compact audio player at the top of the reading tab */}
            {hasContent.audio && (
              <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">🎧 Audio</span>
                  <div className="flex-1">
                    <AudioPlayer src={audioUrl} />
                  </div>
                </div>
              </div>
            )}
            <ReadingText text={lesson.reading_text} />
          </div>
        )}

        {/* Audio */}
        {hasContent.audio && (
          <div className={activeTab === 'audio' ? 'block' : 'hidden'}>
            <div className="py-4">
              <AudioPlayer src={audioUrl} />
            </div>
          </div>
        )}

        {/* Images */}
        {hasContent.images && (
          <div className={activeTab === 'images' ? 'block' : 'hidden'}>
            <div className="grid grid-cols-2 gap-3">
              {imageUrls.map((url, idx) => (
                <img key={idx} src={url} alt={`Reference ${idx + 1}`} className="rounded-lg shadow-md w-full object-cover max-h-48" />
              ))}
            </div>
          </div>
        )}

        {/* Vocabulary */}
        {hasContent.vocab && (
          <div className={activeTab === 'vocab' ? 'block' : 'hidden'}>
            <div className="space-y-3">
              {vocabulary.map((item, idx) => (
                <div key={idx} className="border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
                  <div className="font-medium text-gray-900 dark:text-white">{item.term}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">{item.definition}</div>
                  {item.example && (
                    <div className="text-sm text-gray-500 dark:text-gray-500 italic mt-1">"{item.example}"</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}