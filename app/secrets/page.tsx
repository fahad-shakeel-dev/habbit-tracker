'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react'

interface Secret {
  _id: string
  content: string
  createdAt: string
}

export default function SecretsPage() {
  const router = useRouter()
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  useEffect(() => {
    if (!token) {
      router.push('/')
      return
    }
    fetchSecrets()
  }, [token, router])

  const fetchSecrets = async () => {
    try {
      const response = await fetch('/api/secrets', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setSecrets(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching secrets:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    try {
      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        const newSecret = await response.json()
        setSecrets([newSecret, ...secrets])
        setContent('')
        setShowForm(false)
      }
    } catch (error) {
      console.error('Error creating secret:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this secret?')) return

    try {
      const response = await fetch(`/api/secrets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setSecrets(secrets.filter(s => s._id !== id))
      }
    } catch (error) {
      console.error('Error deleting secret:', error)
    }
  }

  const toggleReveal = (id: string) => {
    const newRevealed = new Set(revealedIds)
    if (newRevealed.has(id)) {
      newRevealed.delete(id)
    } else {
      newRevealed.add(id)
    }
    setRevealedIds(newRevealed)
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">My Secrets</h1>
            <p className="text-gray-600">Keep your deepest secrets safe and encrypted</p>
          </div>

          {/* New Secret Form */}
          {!showForm ? (
            <button
              onClick={() => setShowForm(true)}
              className="w-full mb-8 p-6 border-2 border-dashed border-purple-300 rounded-lg hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-purple-600 font-semibold"
            >
              <Plus className="w-6 h-6" />
              Add New Secret
            </button>
          ) : (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8 border-l-4 border-purple-500">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secret</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your secret here... (encrypted and private)"
                    rows={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 resize-none"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white font-bold py-2 px-4 rounded-lg transition-all"
                  >
                    {submitting ? 'Saving...' : 'Save Secret'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
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

          {/* Secrets List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="text-center py-12 col-span-full">
                <p className="text-gray-600">Loading secrets...</p>
              </div>
            ) : secrets.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg col-span-full">
                <p className="text-gray-600">No secrets yet. Add your first secret to keep it safe!</p>
              </div>
            ) : (
              secrets.map((secret) => (
                <div
                  key={secret._id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all overflow-hidden border-l-4 border-purple-500 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <p className="text-xs text-gray-500">
                      {new Date(secret.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <button
                      onClick={() => handleDelete(secret._id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => toggleReveal(secret._id)}
                    className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all flex items-center justify-between"
                  >
                    <p className={revealedIds.has(secret._id) ? 'text-gray-700 text-sm' : 'text-gray-400 italic'}>
                      {revealedIds.has(secret._id)
                        ? secret.content
                        : '🔒 Click to reveal secret'}
                    </p>
                    {revealedIds.has(secret._id) ? (
                      <EyeOff className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                    ) : (
                      <Eye className="w-4 h-4 text-gray-400 ml-2 flex-shrink-0" />
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
