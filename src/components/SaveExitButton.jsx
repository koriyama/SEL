// src/components/SaveExitButton.jsx
import { useState } from 'react'
import toast from 'react-hot-toast'

export default function SaveExitButton({ onSave, isLoading, slug }) {
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (saving || isLoading) return
    setSaving(true)
    try {
      await onSave()
    } catch (err) {
      toast.error('Failed to save. Please try again.')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <button
      onClick={handleSave}
      disabled={saving || isLoading}
      className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg shadow-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1 min-h-[44px] whitespace-nowrap"
    >
      {saving ? 'Saving...' : '💾 Save & Exit'}
    </button>
  )
}