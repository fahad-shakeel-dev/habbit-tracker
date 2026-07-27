'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { secureGetItem } from '@/lib/storage'
import {
  ChevronLeft, ChevronRight, AlertTriangle,
  Lightbulb, Target, CheckCircle, BookOpen, Calendar
} from 'lucide-react'

interface Reflection {
  _id: string
  date: string
  mistakes: string
  learnings: string
  goals: string
  createdAt: string
}

export default function ReflectionsPage() {
  const router = useRouter()
  const [reflections, setReflections] = useState<Reflection[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0])
  const [mistakes, setMistakes] = useState('')
  const [learnings, setLearnings] = useState('')
  const [goals, setGoals] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [error, setError] = useState('')
  const [yesterdayRef, setYesterdayRef] = useState<Reflection | null>(null)
  const [activeTab, setActiveTab] = useState<'write' | 'history'>('write')

  const token = typeof window !== 'undefined' ? secureGetItem('auth_token') : null
  const todayStr = new Date().toISOString().split('T')[0]
  const isToday = currentDate === todayStr

  useEffect(() => {
    if (!token) { router.push('/'); return }
    fetchReflections()
  }, [])

  useEffect(() => {
    const ref = reflections.find(r => r.date === currentDate)
    setMistakes(ref?.mistakes || '')
    setLearnings(ref?.learnings || '')
    setGoals(ref?.goals || '')

    const yd = new Date(currentDate)
    yd.setDate(yd.getDate() - 1)
    setYesterdayRef(reflections.find(r => r.date === yd.toISOString().split('T')[0]) || null)
  }, [currentDate, reflections])

  const fetchReflections = async () => {
    try {
      const res = await fetch('/api/reflections', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setReflections(await res.json())
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!mistakes.trim() || !learnings.trim()) {
      setError('Mistakes and learnings are both required.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mistakes, learnings, goals }),
      })
      if (res.ok) {
        const result = await res.json()
        setReflections(prev => {
          const idx = prev.findIndex(r => r.date === currentDate)
          if (idx >= 0) {
            const u = [...prev]; u[idx] = result; return u
          }
          return [result, ...prev]
        })
        setSaveOk(true)
        setTimeout(() => setSaveOk(false), 3000)
      } else {
        const d = await res.json()
        setError(d.error || 'Failed to save reflection.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const changeDate = (days: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + days)
    const next = d.toISOString().split('T')[0]
    if (next <= todayStr) setCurrentDate(next)
  }

  const fmtDate = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
    })

  const fmtShort = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'short', day: 'numeric',
    })

  const hasToday = reflections.some(r => r.date === todayStr)

  // Streak calculation
  let streak = 0
  const refDates = new Set(reflections.map(r => r.date))
  for (let i = 0; i < 365; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    if (refDates.has(d.toISOString().split('T')[0])) streak++
    else if (i > 0) break
  }

  const currentRef = reflections.find(r => r.date === currentDate)
  const isReadOnly = currentDate < todayStr && !!currentRef

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-amber-100 rounded-lg p-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Daily Reflections</h1>
              </div>
              <p className="text-sm text-gray-400">
                {reflections.length} days reflected
                {streak > 0 && <span className="ml-2 text-orange-500 font-medium">🔥 {streak}d streak</span>}
              </p>
            </div>
            {/* Tab toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('write')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'write' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Write
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'history' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                History
              </button>
            </div>
          </div>

          {activeTab === 'write' && (
            <>
              {/* Date navigator */}
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex items-center justify-between">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div className="text-center">
                  <p className="font-semibold text-gray-800 text-sm sm:text-base">{fmtDate(currentDate)}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    {isToday
                      ? <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">Today</span>
                      : <button onClick={() => setCurrentDate(todayStr)} className="text-xs text-blue-500 hover:underline font-medium">Go to today</button>
                    }
                    {currentRef && (
                      <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Saved
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => changeDate(1)}
                  disabled={isToday}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Yesterday's mistakes alert */}
              {yesterdayRef && isToday && (
                <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">Yesterday's mistakes — don't repeat</p>
                    <p className="text-sm text-orange-800 whitespace-pre-wrap leading-relaxed">{yesterdayRef.mistakes}</p>
                  </div>
                </div>
              )}

              {/* Toast */}
              {saveOk && (
                <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  Reflection saved for {fmtShort(currentDate)}.
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                {/* Mistakes */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-red-50">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <h3 className="text-sm font-semibold text-red-700">Mistakes made today</h3>
                    <span className="text-xs text-red-400 ml-auto">required</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={mistakes}
                      onChange={e => setMistakes(e.target.value)}
                      placeholder="Be honest — what went wrong today? What would you do differently?"
                      rows={4}
                      disabled={isReadOnly}
                      className="w-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Learnings */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-green-50">
                    <BookOpen className="w-4 h-4 text-green-600" />
                    <h3 className="text-sm font-semibold text-green-700">What did you learn?</h3>
                    <span className="text-xs text-green-400 ml-auto">required</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={learnings}
                      onChange={e => setLearnings(e.target.value)}
                      placeholder="Lessons, insights, skills gained — how will you apply them?"
                      rows={4}
                      disabled={isReadOnly}
                      className="w-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {/* Goals */}
                <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-blue-50">
                    <Target className="w-4 h-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-blue-700">Goals for tomorrow</h3>
                    <span className="text-xs text-blue-400 ml-auto">optional</span>
                  </div>
                  <div className="p-4">
                    <textarea
                      value={goals}
                      onChange={e => setGoals(e.target.value)}
                      placeholder="What will you focus on tomorrow based on today's learnings?"
                      rows={3}
                      disabled={isReadOnly}
                      className="w-full text-sm text-gray-700 placeholder-gray-400 focus:outline-none resize-none disabled:text-gray-500 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {isReadOnly ? (
                  <p className="text-center text-sm text-gray-400 py-2">Past reflection — read only</p>
                ) : (
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white font-semibold py-3 rounded-2xl transition-colors text-sm shadow-sm"
                  >
                    {submitting ? 'Saving…' : currentRef ? 'Update Reflection' : 'Save Reflection'}
                  </button>
                )}
              </form>
            </>
          )}

          {activeTab === 'history' && (
            <div>
              {/* Stats strip */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Total Days', value: reflections.length, color: 'text-amber-600' },
                  { label: 'Streak', value: `${streak}d`, color: 'text-orange-500' },
                  { label: 'With Goals', value: reflections.filter(r => r.goals).length, color: 'text-blue-600' },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 text-center">
                    <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Timeline */}
              {loading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading history…</div>
              ) : reflections.length === 0 ? (
                <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl">
                  <Lightbulb className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No reflections yet</p>
                  <p className="text-sm text-gray-400 mt-1">Switch to Write tab to add your first one.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reflections.map(ref => (
                    <div
                      key={ref._id}
                      className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:border-amber-200 transition-colors"
                      onClick={() => { setCurrentDate(ref.date); setActiveTab('write') }}
                    >
                      <div className="px-5 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            <span className="text-sm font-semibold text-gray-700">{fmtDate(ref.date)}</span>
                          </div>
                          {ref.goals && (
                            <span className="text-xs bg-blue-50 text-blue-600 font-medium px-2 py-0.5 rounded-full">
                              Has goals
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="bg-red-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-red-600 mb-1">Mistakes</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{ref.mistakes}</p>
                          </div>
                          <div className="bg-green-50 rounded-xl p-3">
                            <p className="text-xs font-semibold text-green-600 mb-1">Learnings</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{ref.learnings}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
