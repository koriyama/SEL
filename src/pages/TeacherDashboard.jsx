// src/pages/TeacherDashboard.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'react-qr-code';
import {
  listLessonsWithStats,
  listFolders,
  createFolder,
  updateLessonFolder,
  deleteFolder,
  renameFolder,
  bulkMoveLessons,
  reorderFolders,
  setLessonStatus,
  duplicateLesson,
  renameLesson,
  deleteLesson
} from '../lib/api'

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ---------- Sortable Folder Item ----------
function SortableFolderItem({ folder, count, isSelected, onSelect, onDelete, onRename }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(folder.name)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const handleDoubleClick = () => {
    setIsEditing(true)
    setEditName(folder.name)
  }

  const handleRenameSubmit = async () => {
    if (editName.trim() && editName.trim() !== folder.name) {
      try {
        await onRename(folder.id, editName.trim())
      } catch (err) {
        alert('Failed to rename: ' + err.message)
      }
    }
    setIsEditing(false)
  }

  return (
    <div ref={setNodeRef} style={style} className="flex items-center group py-1">
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-crest"
          autoFocus
        />
      ) : (
        <button
          onClick={() => onSelect(folder.id)}
          className={`flex-1 text-left px-3 py-1.5 rounded-md text-sm transition-colors flex items-center gap-2 ${
            isSelected
              ? 'bg-crestSoft text-crest font-medium'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600">
            ⋮
          </span>
          <span className="truncate" onDoubleClick={handleDoubleClick}>
            📁 {folder.name} <span className="text-xs text-gray-400">({count})</span>
          </span>
        </button>
      )}
      <button
        onClick={() => onDelete(folder.id)}
        className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
        title="Delete folder"
      >
        ×
      </button>
    </div>
  )
}

// ---------- Main Dashboard ----------
export default function TeacherDashboard() {
  const [lessons, setLessons] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedFolderId, setSelectedFolderId] = useState(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)

  const [selectedLessonIds, setSelectedLessonIds] = useState([])
  const [isBulkMoving, setIsBulkMoving] = useState(false)
  const [editingLessonId, setEditingLessonId] = useState(null)
  const [editLessonTitle, setEditLessonTitle] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [lessonsData, foldersData] = await Promise.all([
        listLessonsWithStats(),
        listFolders()
      ])
      setLessons(lessonsData)
      setFolders(foldersData)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
      alert('Could not load lessons. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  // ---------- Folder CRUD ----------
  async function handleCreateFolder(e) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setIsCreatingFolder(true)
    try {
      await createFolder(newFolderName.trim())
      setNewFolderName('')
      await loadData()
    } catch (err) {
      alert('Failed to create folder: ' + err.message)
    } finally {
      setIsCreatingFolder(false)
    }
  }

  async function handleRenameFolder(folderId, newName) {
    await renameFolder(folderId, newName)
    await loadData()
  }

  async function handleDeleteFolder(folderId) {
    if (!confirm('Delete this folder? Lessons will be moved to "Uncategorized".')) return
    try {
      await deleteFolder(folderId)
      if (selectedFolderId === folderId) setSelectedFolderId(null)
      await loadData()
    } catch (err) {
      alert('Failed to delete folder: ' + err.message)
    }
  }

  // ---------- Lesson rename ----------
  async function handleRenameLesson(lessonId, newTitle) {
    try {
      await renameLesson(lessonId, newTitle)
      setEditingLessonId(null)
      await loadData()
    } catch (err) {
      alert('Failed to rename lesson: ' + err.message)
    }
  }

  // ---------- Lesson movement ----------
  async function handleMoveLesson(lessonId, folderId) {
    try {
      await updateLessonFolder(lessonId, folderId)
      setLessons(prev => prev.map(l =>
        l.id === lessonId ? { ...l, folder_id: folderId } : l
      ))
    } catch (err) {
      alert('Failed to move lesson: ' + err.message)
      loadData()
    }
  }

  async function handleBulkMove(folderId) {
    if (selectedLessonIds.length === 0) return
    setIsBulkMoving(true)
    try {
      await bulkMoveLessons(selectedLessonIds, folderId)
      setSelectedLessonIds([])
      await loadData()
    } catch (err) {
      alert('Failed to move lessons: ' + err.message)
    } finally {
      setIsBulkMoving(false)
    }
  }

  // ---------- Drag & Drop ----------
  function handleDragEnd(event) {
    const { active, over } = event

    if (active && over && active.id !== over.id) {
      const oldIndex = folders.findIndex(f => f.id === active.id)
      const newIndex = folders.findIndex(f => f.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newFolders = arrayMove(folders, oldIndex, newIndex)
        setFolders(newFolders)
        reorderFolders(newFolders.map(f => f.id)).catch(() => loadData())
        return
      }
    }

    if (active && over && active.data?.current?.type === 'lesson') {
      const lessonId = active.id
      let targetFolderId = null
      if (over.id === 'uncategorized') {
        targetFolderId = null
      } else {
        const folderExists = folders.some(f => f.id === over.id)
        if (folderExists) targetFolderId = over.id
        else return
      }
      handleMoveLesson(lessonId, targetFolderId)
      setSelectedLessonIds(prev => prev.filter(id => id !== lessonId))
    }
  }

  // ---------- Lesson actions ----------
  async function handleDuplicate(lessonId) {
    if (!confirm('Create a copy of this lesson?')) return
    try {
      await duplicateLesson(lessonId)
      await loadData()
    } catch (err) {
      alert('Failed to duplicate: ' + err.message)
    }
  }

  async function handlePublish(id) {
    await setLessonStatus(id, 'published')
    await loadData()
  }

  async function handleUnpublish(id) {
    await setLessonStatus(id, 'draft')
    await loadData()
  }

  async function handleDeleteLesson(lessonId, lessonTitle) {
    if (!confirm(`Permanently delete "${lessonTitle}"? This cannot be undone.`)) return
    try {
      await deleteLesson(lessonId)
      await loadData()
    } catch (err) {
      alert('Failed to delete lesson: ' + err.message)
    }
  }

  // ---------- Copy Link ----------
  function handleCopyLink(slug) {
    const baseUrl = window.location.origin
    const url = `${baseUrl}/lesson/${slug}`
    navigator.clipboard.writeText(url).then(() => {
      alert('✅ Student lesson link copied to clipboard!')
    }).catch(() => {
      const textarea = document.createElement('textarea')
      textarea.value = url
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      alert('✅ Student lesson link copied to clipboard!')
    })
  }

  // ---------- Selection ----------
  function toggleSelectAll() {
    const visibleIds = filteredLessons.map(l => l.id)
    const allSelected = visibleIds.every(id => selectedLessonIds.includes(id))
    if (allSelected) {
      setSelectedLessonIds(prev => prev.filter(id => !visibleIds.includes(id)))
    } else {
      setSelectedLessonIds(prev => [...new Set([...prev, ...visibleIds])])
    }
  }

  function toggleSelectLesson(id) {
    setSelectedLessonIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const filteredLessons = lessons.filter(lesson => {
    if (selectedFolderId === null) return true
    if (selectedFolderId === 'uncategorized') return lesson.folder_id === null
    return lesson.folder_id === selectedFolderId
  })

  const isAllSelected = filteredLessons.length > 0 && filteredLessons.every(l => selectedLessonIds.includes(l.id))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-gray-50">
        {/* Header – refined */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-display text-gray-800 tracking-tight">
              📚 SEL Lesson Repository
            </h1>
            <Link to="/builder" className="btn-primary px-4 py-2 text-sm font-medium rounded-md shadow-sm hover:shadow transition">
              + New Lesson
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex gap-8">
            {/* Sidebar – clean, spacious */}
            <aside className="w-56 flex-shrink-0">
              <div className="bg-white rounded-lg border border-gray-200 p-4 sticky top-24 shadow-sm">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Folders
                </h2>

                <SortableContext
                  items={folders.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <nav className="space-y-0.5">
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedFolderId === null
                          ? 'bg-crestSoft text-crest font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      📂 All <span className="text-xs text-gray-400">({lessons.length})</span>
                    </button>

                    <div
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors cursor-pointer ${
                        selectedFolderId === 'uncategorized'
                          ? 'bg-crestSoft text-crest font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      onClick={() => setSelectedFolderId('uncategorized')}
                    >
                      📄 Uncategorized <span className="text-xs text-gray-400">({lessons.filter(l => l.folder_id === null).length})</span>
                    </div>

                    {folders.map(folder => {
                      const count = lessons.filter(l => l.folder_id === folder.id).length
                      return (
                        <SortableFolderItem
                          key={folder.id}
                          folder={folder}
                          count={count}
                          isSelected={selectedFolderId === folder.id}
                          onSelect={setSelectedFolderId}
                          onDelete={handleDeleteFolder}
                          onRename={handleRenameFolder}
                        />
                      )
                    })}
                  </nav>
                </SortableContext>

                <form onSubmit={handleCreateFolder} className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="New folder..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-crest"
                      disabled={isCreatingFolder}
                    />
                    <button
                      type="submit"
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      className="px-3 py-1.5 bg-crest text-white text-sm rounded-md hover:bg-crest hover:shadow transition disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </form>
              </div>
            </aside>

            {/* Main content – spacious cards */}
            <main className="flex-1 min-w-0">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading lessons...</div>
              ) : filteredLessons.length === 0 ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center shadow-sm">
                  <p className="text-gray-500 mb-4">No lessons in this folder.</p>
                  <Link to="/builder" className="btn-primary inline-block">
                    Create your first lesson
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Selection bar – refined */}
                  <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-crest rounded border-gray-300 focus:ring-crest"
                    />
                    <span className="text-sm text-gray-600">
                      {selectedLessonIds.length} selected
                    </span>
                    {selectedLessonIds.length > 0 && (
                      <>
                        <div className="h-6 w-px bg-gray-300" />
                        <select
                          onChange={(e) => {
                            const val = e.target.value
                            if (val) handleBulkMove(val === 'null' ? null : val)
                            e.target.value = ''
                          }}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-crest"
                        >
                          <option value="">Move to...</option>
                          <option value="null">📄 Uncategorized</option>
                          {folders.map(f => (
                            <option key={f.id} value={f.id}>📁 {f.name}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => setSelectedLessonIds([])}
                          className="text-sm text-gray-400 hover:text-gray-600"
                        >
                          Clear
                        </button>
                      </>
                    )}
                  </div>

                  {/* Lesson cards – spacious */}
                  <div className="space-y-3">
                    {filteredLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`bg-white rounded-lg border p-5 shadow-sm hover:shadow-md transition-shadow ${
                          selectedLessonIds.includes(lesson.id) ? 'border-crest ring-1 ring-crest' : 'border-gray-200'
                        }`}
                        data-lesson-id={lesson.id}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedLessonIds.includes(lesson.id)}
                              onChange={() => toggleSelectLesson(lesson.id)}
                              className="mt-1 w-4 h-4 text-crest rounded border-gray-300 focus:ring-crest"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                {editingLessonId === lesson.id ? (
                                  <input
                                    type="text"
                                    value={editLessonTitle}
                                    onChange={(e) => setEditLessonTitle(e.target.value)}
                                    onBlur={() => {
                                      if (editLessonTitle.trim() && editLessonTitle.trim() !== lesson.title) {
                                        handleRenameLesson(lesson.id, editLessonTitle.trim())
                                      } else {
                                        setEditingLessonId(null)
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        if (editLessonTitle.trim() && editLessonTitle.trim() !== lesson.title) {
                                          handleRenameLesson(lesson.id, editLessonTitle.trim())
                                        } else {
                                          setEditingLessonId(null)
                                        }
                                      }
                                      if (e.key === 'Escape') setEditingLessonId(null)
                                    }}
                                    className="text-base font-medium text-gray-800 border border-crest rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-crest"
                                    autoFocus
                                  />
                                ) : (
                                  <h3
                                    className="text-base font-medium text-gray-800 truncate cursor-pointer hover:text-crest"
                                    onDoubleClick={() => {
                                      setEditingLessonId(lesson.id)
                                      setEditLessonTitle(lesson.title)
                                    }}
                                    title="Double‑click to rename"
                                  >
                                    {lesson.title}
                                  </h3>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  lesson.status === 'published'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {lesson.status}
                                </span>
                                <span className="text-xs text-gray-400 font-mono">
                                  {lesson.level}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-4 mt-1 text-sm text-gray-500">
                                <span>📝 {lesson.completedCount || 0} completions</span>
                                {lesson.avgPercent !== null && (
                                  <span>📊 Avg: {lesson.avgPercent}%</span>
                                )}
                                <span className="text-gray-400">
                                  {new Date(lesson.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <select
                              value={lesson.folder_id || ''}
                              onChange={(e) => handleMoveLesson(lesson.id, e.target.value || null)}
                              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-crest"
                            >
                              <option value="">Move</option>
                              <option value="">📄 Uncategorized</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>📁 {f.name}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleCopyLink(lesson.share_slug)}
                              className="text-sm text-crest hover:underline px-2 py-1 whitespace-nowrap"
                              title="Copy student URL"
                            >
                              📋 Copy
                            </button>

                            <Link
                              to={`/builder/${lesson.id}`}
                              className="text-sm text-crest hover:underline px-2 py-1 whitespace-nowrap font-medium"
                            >
                              ✏️ Edit
                            </Link>

                            <Link
                              to={`/results/${lesson.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-gray-500 hover:underline px-2 py-1 whitespace-nowrap"
                            >
                              Results
                            </Link>

                            <button
                              onClick={() => handleDuplicate(lesson.id)}
                              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 whitespace-nowrap"
                            >
                              Copy
                            </button>

                            <button
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                              className="text-sm text-red-500 hover:text-red-700 px-2 py-1 whitespace-nowrap font-medium"
                            >
                              🗑️
                            </button>

                            {lesson.status === 'draft' ? (
                              <button
                                onClick={() => handlePublish(lesson.id)}
                                className="text-sm bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition whitespace-nowrap"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnpublish(lesson.id)}
                                className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-300 transition whitespace-nowrap"
                              >
                                Unpublish
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </main>
          </div>
        </div>

        {/* Bottom selection bar – floating */}
        {selectedLessonIds.length > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 px-5 py-3 flex items-center gap-4 z-30">
            <span className="text-sm font-medium text-gray-700">
              {selectedLessonIds.length} lesson{selectedLessonIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="h-6 w-px bg-gray-300" />
            <select
              onChange={(e) => {
                const val = e.target.value
                if (val) handleBulkMove(val === 'null' ? null : val)
                e.target.value = ''
              }}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-crest"
            >
              <option value="">Move to folder...</option>
              <option value="null">📄 Uncategorized</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>📁 {f.name}</option>
              ))}
            </select>
            <button
              onClick={() => setSelectedLessonIds([])}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              × Close
            </button>
          </div>
        )}
      </div>
    </DndContext>
  )
}