'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface DiaryEntry {
  _id: string
  title: string
  content: string
  createdAt: string
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

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  useEffect(() => {
    if (!token) {
      router.push('/')
      return
    }
    fetchEntries()
  }, [token, router])

  const fetchEntries = async () => {
    try {
      const response = await fetch('/api/diary', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setEntries(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching entries:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/diary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      })

      if (response.ok) {
        const newEntry = await response.json()
        setEntries([newEntry, ...entries])
        setTitle('')
        setContent('')
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error creating entry:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this entry?')) return

    try {
      const response = await fetch(`/api/diary/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setEntries(entries.filter(e => e._id !== id))
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
    }
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">My Diary</h1>
            <p className="text-gray-600">Write your daily activities and thoughts</p>
          </div>

          {/* New Entry Form */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-8 p-6 border-2 border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-blue-600 font-semibold"
            >
              <Plus className="w-6 h-6" />
              Write New Entry
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-blue-500">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Entry title..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your thoughts here..."
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-all"
                  >
                    {submitting ? 'Saving...' : 'Save Entry'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setTitle('')
                      setContent('')
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Entries List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12">
                <p className="text-gray-600">Loading entries...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg">
                <p className="text-gray-600">No diary entries yet. Start writing to create your first entry!</p>
              </div>
            ) : (
              entries.map((entry) => (
                <div key={entry._id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === entry._id ? null : entry._id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50"
                  >
                    <div className="text-left flex-1">
                      <h3 className="text-lg font-bold text-gray-800">{entry.title}</h3>
                      <p className="text-sm text-gray-500">
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(entry._id)
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                      {expandedId === entry._id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>
                  {expandedId === entry._id && (
                    <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                      <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
