// src/pages/PublicLessonLibrary.jsx
console.log('✅ PublicLessonLibrary loaded (owner-only edit)');

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useConfirm } from '../context/ConfirmContext'
import { useAuth } from '../context/AuthContext'
import {
  listPublicLessons,
  listFolders,
  copyLessonToFolder,
  toggleLessonPublic,
  deleteLesson
} from '../lib/api'

export default function PublicLessonLibrary() {
  const { user, logout } = useAuth()
  const { confirm } = useConfirm()
  const [lessons, setLessons] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [copyTargetFolder, setCopyTargetFolder] = useState({})
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [lessonsData, foldersData] = await Promise.all([
        listPublicLessons(),
        listFolders(user.id)
      ])
      setLessons(lessonsData)
      setFolders(foldersData)
    } catch (err) {
      console.error('Failed to load public lessons:', err)
      setError('Failed to load shared lessons: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyToFolder(lessonId) {
    const targetFolderId = copyTargetFolder[lessonId]
    if (!targetFolderId) {
      toast.error('Please select a folder first.')
      return
    }
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) return
    const ok = await confirm({
      title: 'Copy Lesson',
      message: `Copy "${lesson.title}" to your folder?`,
      confirmText: 'Copy',
      cancelText: 'Cancel',
      type: 'info'
    })
    if (!ok) return
    try {
      await copyLessonToFolder(lessonId, targetFolderId, user.id)
      toast.success('✅ Lesson copied to your library!')
      await loadData()
    } catch (err) {
      toast.error('Failed to copy: ' + err.message)
    }
  }

  async function handleTogglePublic(lessonId, currentStatus) {
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) {
      toast.error('Lesson not found.')
      return
    }
    if (lesson.user_id !== user.id) {
      toast.error('You are not the owner of this lesson.')
      console.warn('Non-owner attempted to toggle public status of lesson:', lessonId)
      return
    }
    try {
      await toggleLessonPublic(lessonId, !currentStatus)
      await loadData()
      toast.success('Lesson status updated.')
    } catch (err) {
      toast.error('Failed to update: ' + err.message)
    }
  }

  async function handleDelete(lessonId, title) {
    const lesson = lessons.find(l => l.id === lessonId)
    if (!lesson) {
      toast.error('Lesson not found.')
      return
    }
    if (lesson.user_id !== user.id) {
      toast.error('You are not the owner of this lesson.')
      console.warn('Non-owner attempted to delete lesson:', lessonId)
      return
    }
    const ok = await confirm({
      title: 'Delete Lesson',
      message: `Permanently delete "${title}"? This cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    })
    if (!ok) return
    try {
      await deleteLesson(lessonId)
      await loadData()
      toast.success('✅ Lesson deleted.')
    } catch (err) {
      toast.error('Failed to delete: ' + err.message)
    }
  }

  const getFolderName = (folderId) => {
    if (!folderId) return 'Uncategorised'
    const folder = folders.find(f => f.id === folderId)
    return folder ? folder.name : 'Uncategorised'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-warm-50">
        <div className="bg-red-50 border border-red-200 rounded-card p-6 max-w-md text-center">
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => loadData()}
            className="btn-primary mt-4"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-warm-50">
      <header className="bg-white/80 backdrop-blur-md border-b border-warm-200/60 sticky top-0 z-20">
        <div className="container-wide py-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="text-warm-500 hover:text-warm-700 flex items-center gap-1">
              ← Dashboard
            </Link>
            <img src="/sel.png" alt="SEL Logo" className="h-10 w-auto" />
            <h1 className="text-2xl font-display text-warm-900">🌍 Shared Lessons</h1>
            <span className="text-sm text-warm-400">({lessons.length} shared lessons)</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-warm-700">
              {user?.user_metadata?.display_name || user?.email}
            </span>
            <button
              onClick={async () => {
                await logout()
                window.location.href = '/login'
              }}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container-wide py-8">
        {lessons.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-warm-500">No shared lessons available yet.</p>
            <p className="text-sm text-warm-400 mt-2">Share your own lessons by marking them as "Public" in the lesson editor.</p>
            <p className="text-sm text-warm-400 mt-1">🌍 Teachers helping teachers!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson) => {
              const isOwnLesson = lesson.user_id === user.id
              const folderName = getFolderName(lesson.folder_id)
              const level = lesson.level || 'B1'
              const excerpt = lesson.reading_text
                ? lesson.reading_text.substring(0, 120) + '...'
                : 'No description available.'

              return (
                <div key={lesson.id} className="lesson-card">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left side */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-warm-900 truncate">
                        {lesson.title}
                      </h3>
                      <p className="text-sm text-warm-500 mt-1 line-clamp-2">
                        {excerpt}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <span className={`level-badge level-badge-${level.toUpperCase()}`}>
                          {level}
                        </span>
                        <span className="text-xs text-warm-400 flex items-center gap-2">
                          <span>Language: English</span>
                          <span className="w-px h-3 bg-warm-200 inline-block"></span>
                          <span>CEFR Level {level}</span>
                        </span>
                        <span className="text-xs bg-accent-100 text-accent-700 px-2 py-0.5 rounded-full font-medium">
                          🌍 Public
                        </span>
                        {isOwnLesson && (
                          <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
                            Your lesson
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                          lesson.status === 'published'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                          {lesson.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-warm-400">
                        <span>📂 {folderName}</span>
                        <span>{new Date(lesson.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex items-center gap-2 flex-wrap flex-shrink-0 mt-2 md:mt-0">
                      {/* Copy dropdown */}
                      <div className="flex items-center gap-1">
                        <select
                          value={copyTargetFolder[lesson.id] || ''}
                          onChange={(e) => setCopyTargetFolder(prev => ({ ...prev, [lesson.id]: e.target.value }))}
                          className="text-xs border border-warm-200 rounded-full px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary-400/20"
                        >
                          <option value="">Copy to...</option>
                          {folders.map(f => (
                            <option key={f.id} value={f.id}>📁 {f.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleCopyToFolder(lesson.id)}
                          className="btn-primary text-xs py-1.5 px-4"
                        >
                          Copy
                        </button>
                      </div>

                      {/* Owner controls */}
                      {isOwnLesson && (
                        <>
                          <button
                            onClick={() => handleTogglePublic(lesson.id, lesson.is_public)}
                            className="btn-secondary text-xs py-1.5 px-4"
                          >
                            {lesson.is_public ? '🔒 Make Private' : '🌍 Make Public'}
                          </button>
                          <button
                            onClick={() => handleDelete(lesson.id, lesson.title)}
                            className="text-red-400 hover:text-red-600 text-xs py-1 px-2 font-medium"
                          >
                            🗑️
                          </button>
                          <Link
                            to={`/builder/${lesson.id}`}
                            className="btn-ghost text-xs py-1 px-3"
                          >
                            ✏️ Edit
                          </Link>
                        </>
                      )}

                      {!isOwnLesson && (
                        <span className="text-xs text-warm-400 italic" title="Copy this lesson to your folder first to edit">
                          Copy to edit
                        </span>
                      )}

                      <Link
                        to={`/results/${lesson.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-ghost text-xs py-1 px-3"
                      >
                        Results
                      </Link>

                      <Link
                        to={`/lesson/${lesson.share_slug}`}
                        target="_blank"
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        Try It
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}