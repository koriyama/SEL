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
    <div ref={setNodeRef} style={style} className="flex items-center group">
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRenameSubmit}
          onKeyDown={(e) => e.key === 'Enter' && handleRenameSubmit()}
          className="flex-1 px-2 py-1 text-xs border border-crest rounded focus:outline-none focus:ring-1 focus:ring-crest"
          autoFocus
        />
      ) : (
        <button
          onClick={() => onSelect(folder.id)}
          className={`flex-1 text-left px-3 py-1.5 rounded-md text-xs transition-colors flex items-center gap-1 ${
            isSelected
              ? 'bg-crestSoft text-crest font-medium'
              : 'text-muted hover:bg-paper'
          }`}
        >
          <span {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mr-1 text-rule hover:text-ink">
            ⋮
          </span>
          <span onDoubleClick={handleDoubleClick}>📁 {folder.name} ({count})</span>
        </button>
      )}
      <button
        onClick={() => onDelete(folder.id)}
        className="text-muted hover:text-red-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
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
      <div className="min-h-screen bg-paper">
        {/* Header – more compact */}
        <header className="bg-surface border-b border-rule sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
            <h1 className="text-xl font-display text-ink">📚 SEL Lesson Repository</h1>
            <Link to="/builder" className="btn-primary text-sm px-4 py-1.5">
              + New Lesson
            </Link>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex gap-5">
            {/* Sidebar – compact */}
            <aside className="w-48 flex-shrink-0">
              <div className="bg-surface rounded-lg border border-rule p-3 sticky top-20">
                <h2 className="text-xs font-medium text-muted uppercase tracking-wider mb-2">
                  Folders
                </h2>

                <SortableContext
                  items={folders.map(f => f.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <nav className="space-y-0.5">
                    <button
                      onClick={() => setSelectedFolderId(null)}
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors ${
                        selectedFolderId === null
                          ? 'bg-crestSoft text-crest font-medium'
                          : 'text-muted hover:bg-paper'
                      }`}
                    >
                      📂 All ({lessons.length})
                    </button>

                    <div
                      className={`w-full text-left px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer ${
                        selectedFolderId === 'uncategorized'
                          ? 'bg-crestSoft text-crest font-medium'
                          : 'text-muted hover:bg-paper'
                      }`}
                      onClick={() => setSelectedFolderId('uncategorized')}
                    >
                      📄 Uncategorized ({lessons.filter(l => l.folder_id === null).length})
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

                <form onSubmit={handleCreateFolder} className="mt-3 pt-3 border-t border-rule">
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="New folder..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1 px-2 py-1 border border-rule rounded text-xs focus:outline-none focus:ring-1 focus:ring-crest"
                      disabled={isCreatingFolder}
                    />
                    <button
                      type="submit"
                      disabled={isCreatingFolder || !newFolderName.trim()}
                      className="px-2.5 py-1 bg-crest text-paper text-xs rounded hover:bg-crest/80 disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </form>
              </div>
            </aside>

            {/* Main content – compact cards */}
            <main className="flex-1 min-w-0">
              {loading ? (
                <div className="text-center py-8 text-muted text-sm">Loading lessons...</div>
              ) : filteredLessons.length === 0 ? (
                <div className="bg-surface rounded-lg border border-rule p-8 text-center">
                  <p className="text-muted text-sm">No lessons in this folder.</p>
                  <Link to="/builder" className="btn-primary mt-3 inline-block text-sm">
                    Create your first lesson
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Selection bar – compact */}
                  {filteredLessons.length > 0 && (
                    <div className="flex items-center gap-2 px-1 py-1.5 bg-surface rounded border border-rule">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 text-crest rounded border-rule focus:ring-crest"
                      />
                      <span className="text-xs text-muted">
                        {selectedLessonIds.length} selected
                      </span>
                      {selectedLessonIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <select
                            onChange={(e) => {
                              const val = e.target.value
                              if (val) handleBulkMove(val === 'null' ? null : val)
                              e.target.value = ''
                            }}
                            className="text-xs border border-rule rounded px-2 py-0.5 bg-surface focus:outline-none focus:ring-1 focus:ring-crest"
                          >
                            <option value="">Move to...</option>
                            <option value="null">📄 Uncategorized</option>
                            {folders.map(f => (
                              <option key={f.id} value={f.id}>📁 {f.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => setSelectedLessonIds([])}
                            className="text-xs text-muted hover:text-ink"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Lesson cards – compact grid */}
                  <div className="grid grid-cols-1 gap-2">
                    {filteredLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className={`bg-surface rounded-lg border p-3 hover:shadow-sm transition-shadow ${
                          selectedLessonIds.includes(lesson.id) ? 'border-crest ring-1 ring-crest' : 'border-rule'
                        }`}
                        data-lesson-id={lesson.id}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedLessonIds.includes(lesson.id)}
                              onChange={() => toggleSelectLesson(lesson.id)}
                              className="mt-1 w-3.5 h-3.5 text-crest rounded border-rule focus:ring-crest"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
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
                                    className="text-sm font-medium text-ink border border-crest rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-crest"
                                    autoFocus
                                  />
                                ) : (
                                  <h3
                                    className="text-sm font-medium text-ink truncate cursor-pointer hover:text-crest"
                                    onDoubleClick={() => {
                                      setEditingLessonId(lesson.id)
                                      setEditLessonTitle(lesson.title)
                                    }}
                                    title="Double‑click to rename"
                                  >
                                    {lesson.title}
                                  </h3>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                  lesson.status === 'published'
                                    ? 'bg-forestSoft text-forest'
                                    : 'bg-amberSoft text-amber'
                                }`}>
                                  {lesson.status}
                                </span>
                                <span className="text-[10px] text-muted font-mono">
                                  {lesson.level}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-3 mt-0.5 text-[10px] text-muted">
                                <span>📝 {lesson.completedCount || 0} completions</span>
                                {lesson.avgPercent !== null && (
                                  <span>📊 Avg: {lesson.avgPercent}%</span>
                                )}
                                <span className="text-rule">
                                  {new Date(lesson.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 flex-wrap">
                            <select
                              value={lesson.folder_id || ''}
                              onChange={(e) => handleMoveLesson(lesson.id, e.target.value || null)}
                              className="text-[10px] border border-rule rounded px-1.5 py-0.5 bg-surface focus:outline-none focus:ring-1 focus:ring-crest"
                            >
                              <option value="">Move</option>
                              <option value="">📄 Uncategorized</option>
                              {folders.map(f => (
                                <option key={f.id} value={f.id}>📁 {f.name}</option>
                              ))}
                            </select>

                            <button
                              onClick={() => handleCopyLink(lesson.share_slug)}
                              className="text-[10px] text-crest hover:underline px-1.5 py-0.5 whitespace-nowrap"
                              title="Copy student URL"
                            >
                              📋 Copy
                            </button>

                            <Link
                              to={`/builder/${lesson.id}`}
                              className="text-[10px] text-crest hover:underline px-1.5 py-0.5 whitespace-nowrap font-medium"
                            >
                              ✏️ Edit
                            </Link>

                            <Link
                              to={`/results/${lesson.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-muted hover:underline px-1.5 py-0.5 whitespace-nowrap"
                            >
                              Results
                            </Link>

                            <button
                              onClick={() => handleDuplicate(lesson.id)}
                              className="text-[10px] text-muted hover:text-ink px-1.5 py-0.5 whitespace-nowrap"
                            >
                              Copy
                            </button>

                            <button
                              onClick={() => handleDeleteLesson(lesson.id, lesson.title)}
                              className="text-[10px] text-red-600 hover:text-red-800 px-1.5 py-0.5 whitespace-nowrap font-medium"
                            >
                              🗑️
                            </button>

                            {lesson.status === 'draft' ? (
                              <button
                                onClick={() => handlePublish(lesson.id)}
                                className="text-[10px] bg-forest text-paper px-2 py-0.5 rounded hover:bg-forest/80 whitespace-nowrap"
                              >
                                Publish
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUnpublish(lesson.id)}
                                className="text-[10px] bg-rule text-ink px-2 py-0.5 rounded hover:bg-rule/80 whitespace-nowrap"
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
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-surface rounded-lg shadow-lg border border-rule px-4 py-2 flex items-center gap-3 z-30">
            <span className="text-xs font-medium text-ink">
              {selectedLessonIds.length} lesson{selectedLessonIds.length > 1 ? 's' : ''} selected
            </span>
            <div className="h-4 w-px bg-rule" />
            <select
              onChange={(e) => {
                const val = e.target.value
                if (val) handleBulkMove(val === 'null' ? null : val)
                e.target.value = ''
              }}
              className="text-xs border border-rule rounded px-2 py-0.5 bg-surface focus:outline-none focus:ring-1 focus:ring-crest"
            >
              <option value="">Move to folder...</option>
              <option value="null">📄 Uncategorized</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>📁 {f.name}</option>
              ))}
            </select>
            <button
              onClick={() => setSelectedLessonIds([])}
              className="text-xs text-muted hover:text-ink"
            >
              × Close
            </button>
          </div>
        )}
      </div>
    </DndContext>
  )
}