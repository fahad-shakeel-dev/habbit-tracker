'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { secureGetItem } from '@/lib/storage'
import {
  Plus, Trash2, ChevronDown, ChevronUp,
  BookOpen, Search, X, Calendar, Loader2
} from 'lucide-react'

interface DiaryEntry {
  _id: string
  title: string
  content: string
  createdAt: string
}

// MongoDB returns _id as ObjectId object or string — normalise to string always
function normaliseId(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (raw.$oid) return raw.$oid
  return String(raw)
}

function normaliseEntry(e: any): DiaryEntry {
  return {
    _id: normaliseId(e._id),
    title: e.title ?? '',
    content: e.content ?? '',
    createdAt: e.createdAt ?? new Date().toISOString(),
  }
}

export default function DiaryPage() {
  const router = useRouter()
  const [entries, setEntries] = useState<DiaryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const token = typeof window !== 'undefined' ? secureGetItem('auth_token') : null

  useEffect(() => {
    if (!token) { router.push('/'); return }
    fetchEntries()
  }, [])

  useEffect(() => {
    if (showForm) setTimeout(() => titleRef.current?.focus(), 50)
  }, [showForm])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const fetchEntries = async () => {
    try {
      const res = await fetch('/api/diary', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setEntries(Array.isArray(data) ? data.map(normaliseEntry) : [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required.')
      return
    }

    // Optimistic: add a temp entry instantly
    const tempId = `temp_${Date.now()}`
    const tempEntry: DiaryEntry = {
      _id: tempId,
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }
    setEntries(prev => [tempEntry, ...prev])
    const savedTitle = title.trim()
    const savedContent = content.trim()
    setTitle('')
    setContent('')
    setShowForm(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/diary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: savedTitle, content: savedContent }),
      })
      if (res.ok) {
        const real = normaliseEntry(await res.json())
        // Replace temp entry with real one (with server _id)
        setEntries(prev => prev.map(e => e._id === tempId ? real : e))
        showToast('Entry saved.')
      } else {
        // Revert
        setEntries(prev => prev.filter(e => e._id !== tempId))
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to save entry.', 'err')
        setTitle(savedTitle)
        setContent(savedContent)
        setShowForm(true)
      }
    } catch {
      setEntries(prev => prev.filter(e => e._id !== tempId))
      showToast('Network error — entry not saved.', 'err')
      setTitle(savedTitle)
      setContent(savedContent)
      setShowForm(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this diary entry? This cannot be undone.')) return

    // Optimistic: remove instantly
    const removed = entries.find(e => e._id === id)
    setEntries(prev => prev.filter(e => e._id !== id))
    if (expandedId === id) setExpandedId(null)
    setDeletingId(id)

    try {
      const res = await fetch(`/api/diary/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        showToast('Entry deleted.')
      } else {
        // Revert
        if (removed) setEntries(prev => [removed, ...prev])
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to delete entry.', 'err')
      }
    } catch {
      if (removed) setEntries(prev => [removed, ...prev])
      showToast('Network error — entry not deleted.', 'err')
    } finally {
      setDeletingId(null)
    }
  }

  const filtered = entries.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.content.toLowerCase().includes(search.toLowerCase())
  )

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      })
    } catch { return iso }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-blue-100 rounded-lg p-1.5">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">My Diary</h1>
              </div>
              <p className="text-sm text-gray-400">
                {entries.length} {entries.length === 1 ? 'entry' : 'entries'} recorded
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setError('') }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Entry
              </button>
            )}
          </div>

          {/* Toast */}
          {toast && (
            <div className={`mb-4 px-4 py-3 text-sm rounded-xl flex items-center gap-2 border ${
              toast.type === 'ok'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              <span>{toast.type === 'ok' ? '✓' : '✕'}</span>
              {toast.msg}
            </div>
          )}

          {/* Write form */}
          {showForm && (
            <div className="bg-white border border-blue-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
              <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">New Diary Entry</h2>
                <button
                  onClick={() => { setShowForm(false); setTitle(''); setContent(''); setError('') }}
                  className="text-blue-200 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Title
                  </label>
                  <input
                    ref={titleRef}
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="What's on your mind today?"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write freely — this is your private space..."
                    rows={7}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {submitting ? 'Saving…' : 'Save Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setTitle(''); setContent(''); setError('') }}
                    className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Search */}
          {entries.length > 0 && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entries…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Entries */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your entries…
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
              <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No entries yet</p>
              <p className="text-sm text-gray-400 mt-1">Click "New Entry" to start your journal.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No entries match your search.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((entry, i) => {
                const isTemp = entry._id.startsWith('temp_')
                const isDeleting = deletingId === entry._id
                return (
                  <div
                    key={entry._id}
                    className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${
                      isTemp || isDeleting
                        ? 'border-gray-100 opacity-60'
                        : 'border-gray-100 hover:border-blue-200'
                    }`}
                  >
                    <button
                      onClick={() => !isTemp && setExpandedId(expandedId === entry._id ? null : entry._id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                      disabled={isTemp}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-blue-500 bg-blue-50 rounded-lg px-2 py-1 shrink-0">
                          {isTemp ? <Loader2 className="w-3 h-3 animate-spin" /> : `#${entries.length - i}`}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-800 truncate">{entry.title}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-gray-400" />
                            <p className="text-xs text-gray-400">{fmt(entry.createdAt)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        {!isTemp && (
                          <button
                            onClick={e => { e.stopPropagation(); handleDelete(entry._id) }}
                            disabled={isDeleting}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            {isDeleting
                              ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        )}
                        {!isTemp && (
                          expandedId === entry._id
                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                            : <ChevronDown className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {expandedId === entry._id && !isTemp && (
                      <div className="px-5 pb-5 pt-1 border-t border-gray-100">
                        <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">
                          {entry.content}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
