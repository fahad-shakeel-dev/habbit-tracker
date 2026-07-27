'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { secureGetItem } from '@/lib/storage'
import { Plus, Trash2, Eye, EyeOff, Lock, X, ShieldCheck, Loader2 } from 'lucide-react'

interface Secret {
  _id: string
  content: string
  createdAt: string
}

function normaliseId(raw: any): string {
  if (!raw) return ''
  if (typeof raw === 'string') return raw
  if (raw.$oid) return raw.$oid
  return String(raw)
}

function normaliseSecret(s: any): Secret {
  return {
    _id: normaliseId(s._id),
    content: s.content ?? '',
    createdAt: s.createdAt ?? new Date().toISOString(),
  }
}

export default function SecretsPage() {
  const router = useRouter()
  const [secrets, setSecrets] = useState<Secret[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const token = typeof window !== 'undefined' ? secureGetItem('auth_token') : null

  useEffect(() => {
    if (!token) { router.push('/'); return }
    fetchSecrets()
  }, [])

  useEffect(() => {
    if (showForm) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [showForm])

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, type })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const fetchSecrets = async () => {
    try {
      const res = await fetch('/api/secrets', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setSecrets(Array.isArray(data) ? data.map(normaliseSecret) : [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!content.trim()) { setError('Please write something first.'); return }

    // Optimistic: add temp entry instantly
    const tempId = `temp_${Date.now()}`
    const savedContent = content.trim()
    const tempSecret: Secret = {
      _id: tempId,
      content: savedContent,
      createdAt: new Date().toISOString(),
    }
    setSecrets(prev => [tempSecret, ...prev])
    setContent('')
    setShowForm(false)
    setSubmitting(true)

    try {
      const res = await fetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: savedContent }),
      })
      if (res.ok) {
        const real = normaliseSecret(await res.json())
        setSecrets(prev => prev.map(s => s._id === tempId ? real : s))
        showToast('Secret saved & encrypted.')
      } else {
        setSecrets(prev => prev.filter(s => s._id !== tempId))
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to save secret.', 'err')
        setContent(savedContent)
        setShowForm(true)
      }
    } catch {
      setSecrets(prev => prev.filter(s => s._id !== tempId))
      showToast('Network error — secret not saved.', 'err')
      setContent(savedContent)
      setShowForm(true)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Permanently delete this secret? This cannot be undone.')) return

    // Optimistic: remove instantly
    const removed = secrets.find(s => s._id === id)
    setSecrets(prev => prev.filter(s => s._id !== id))
    setRevealedIds(prev => { const n = new Set(prev); n.delete(id); return n })
    setDeletingId(id)

    try {
      const res = await fetch(`/api/secrets/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        showToast('Secret deleted.')
      } else {
        if (removed) setSecrets(prev => [removed, ...prev])
        const d = await res.json().catch(() => ({}))
        showToast(d.error || 'Failed to delete secret.', 'err')
      }
    } catch {
      if (removed) setSecrets(prev => [removed, ...prev])
      showToast('Network error — secret not deleted.', 'err')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const fmt = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
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
                <div className="bg-violet-100 rounded-lg p-1.5">
                  <Lock className="w-4 h-4 text-violet-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">My Secrets</h1>
              </div>
              <p className="text-sm text-gray-400">
                {secrets.length} {secrets.length === 1 ? 'secret' : 'secrets'} stored · all encrypted
              </p>
            </div>
            {!showForm && (
              <button
                onClick={() => { setShowForm(true); setError('') }}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                New Secret
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
              {toast.type === 'ok'
                ? <ShieldCheck className="w-4 h-4 shrink-0" />
                : <span className="shrink-0">✕</span>
              }
              {toast.msg}
            </div>
          )}

          {/* Write form */}
          {showForm && (
            <div className="bg-white border border-violet-200 rounded-2xl shadow-sm mb-6 overflow-hidden">
              <div className="bg-violet-600 px-5 py-3 flex items-center justify-between">
                <h2 className="text-white font-semibold text-sm">New Encrypted Secret</h2>
                <button
                  onClick={() => { setShowForm(false); setContent(''); setError('') }}
                  className="text-violet-200 hover:text-white transition-colors"
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
                    Secret
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Write your secret here — it will be AES-256 encrypted before saving…"
                    rows={6}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  Encrypted with AES-256 — only you can read this
                </div>
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {submitting ? 'Encrypting…' : 'Save Secret'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowForm(false); setContent(''); setError('') }}
                    className="px-5 text-sm font-semibold text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-2 text-gray-400 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading your secrets…
            </div>
          ) : secrets.length === 0 ? (
            <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl">
              <Lock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No secrets yet</p>
              <p className="text-sm text-gray-400 mt-1">Everything you store here is fully encrypted.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {secrets.map((secret, i) => {
                const revealed = revealedIds.has(secret._id)
                const isTemp = secret._id.startsWith('temp_')
                const isDeleting = deletingId === secret._id
                return (
                  <div
                    key={secret._id}
                    className={`bg-white border rounded-2xl shadow-sm overflow-hidden transition-all ${
                      isTemp || isDeleting
                        ? 'opacity-60 border-gray-100'
                        : revealed ? 'border-violet-200' : 'border-gray-100'
                    }`}
                  >
                    <div className="px-5 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-bold text-violet-500 bg-violet-50 rounded-lg px-2 py-1 shrink-0">
                          {isTemp
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : `#${secrets.length - i}`
                          }
                        </span>
                        <div>
                          <p className="text-xs text-gray-400">{fmt(secret.createdAt)}</p>
                          <p className="text-sm mt-0.5 text-gray-400 italic">
                            {isTemp ? 'Encrypting…' : revealed ? '' : '🔒 Hidden'}
                          </p>
                        </div>
                      </div>
                      {!isTemp && (
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <button
                            onClick={() => toggleReveal(secret._id)}
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                              revealed
                                ? 'bg-violet-100 text-violet-700 hover:bg-violet-200'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            {revealed ? 'Hide' : 'Reveal'}
                          </button>
                          <button
                            onClick={() => handleDelete(secret._id)}
                            disabled={isDeleting}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                            title="Delete"
                          >
                            {isDeleting
                              ? <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                              : <Trash2 className="w-4 h-4" />
                            }
                          </button>
                        </div>
                      )}
                    </div>
                    {revealed && !isTemp && (
                      <div className="px-5 pb-4 pt-0 border-t border-violet-100">
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed bg-violet-50 rounded-xl p-4">
                          {secret.content}
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
