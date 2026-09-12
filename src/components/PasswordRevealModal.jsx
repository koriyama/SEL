// src/components/PasswordRevealModal.jsx
import React, { useEffect, useRef, useState } from 'react';

const PasswordRevealModal = ({ open, studentName, password, onClose }) => {
  const inputRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    if (!open) setCopied(false);
  }, [open]);

  if (!open) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers or restricted clipboard access.
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.select();
        try {
          document.execCommand('copy');
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (_) {
          // If copy really fails, the text is still selectable in the input.
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Temporary password
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Give this to <span className="font-medium">{studentName}</span>.
          They will be required to change it on next login.
        </p>

        <div className="flex gap-2 mb-4">
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={password}
            onFocus={(e) => e.target.select()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-2 text-sm font-medium rounded-md border border-gray-300 bg-gray-100 hover:bg-gray-200"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PasswordRevealModal;