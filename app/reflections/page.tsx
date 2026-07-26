'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'

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
  const [currentDate, setCurrentDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [mistakes, setMistakes] = useState('')
  const [learnings, setLearnings] = useState('')
  const [goals, setGoals] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [yesterdayReflection, setYesterdayReflection] = useState<Reflection | null>(null)

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  useEffect(() => {
    if (!token) {
      router.push('/')
      return
    }
    fetchReflections()
  }, [token, router])

  useEffect(() => {
    loadReflectionForDate(currentDate)
  }, [currentDate, reflections])

  const fetchReflections = async () => {
    try {
      const response = await fetch('/api/reflections', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setReflections(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching reflections:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadReflectionForDate = (date: string) => {
    const reflection = reflections.find(r => r.date === date)
    if (reflection) {
      setMistakes(reflection.mistakes)
      setLearnings(reflection.learnings)
      setGoals(reflection.goals)
    } else {
      setMistakes('')
      setLearnings('')
      setGoals('')
    }

    // Load yesterday's reflection to show what mistakes were made
    const yesterday = new Date(date)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    const yesterday_ref = reflections.find(r => r.date === yesterdayStr)
    setYesterdayReflection(yesterday_ref || null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mistakes.trim() || !learnings.trim()) {
      alert('Please fill in mistakes and learnings')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/reflections', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ mistakes, learnings, goals }),
      })

      if (response.ok) {
        const result = await response.json()
        setReflections(prev => {
          const existing = prev.findIndex(r => r.date === currentDate)
          if (existing >= 0) {
            const updated = [...prev]
            updated[existing] = result
            return updated
          }
          return [result, ...prev]
        })
        alert('Reflection saved!')
      }
    } catch (error) {
      console.error('Error saving reflection:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + days)
    setCurrentDate(newDate.toISOString().split('T')[0])
  }

  const goToToday = () => {
    setCurrentDate(new Date().toISOString().split('T')[0])
  }

  const isToday = currentDate === new Date().toISOString().split('T')[0]

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 p-4 sm:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Daily Reflections</h1>
            <p className="text-gray-600">Learn from your mistakes and celebrate your learnings</p>
          </div>

          {/* Date Navigation */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => changeDate(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all"
              >
                <ChevronLeft className="w-6 h-6 text-gray-600" />
              </button>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800">
                  {new Date(currentDate + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </h2>
                {!isToday && (
                  <button
                    onClick={goToToday}
                    className="text-sm text-blue-500 hover:text-blue-700 font-semibold mt-2"
                  >
                    Go to Today
                  </button>
                )}
              </div>

              <button
                onClick={() => changeDate(1)}
                disabled={currentDate === new Date().toISOString().split('T')[0]}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-6 h-6 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Yesterday's Mistakes Alert */}
          {yesterdayReflection && isToday && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8 rounded-lg">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-lg font-bold text-yellow-800 mb-2">Yesterday&apos;s Mistakes (Don&apos;t Repeat!)</h3>
                  <p className="text-yellow-700 whitespace-pre-wrap">{yesterdayReflection.mistakes}</p>
                </div>
              </div>
            </div>
          )}

          {/* Reflection Form */}
          <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-500">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Mistakes Section */}
              <div>
                <label className="block text-lg font-bold text-gray-800 mb-2">
                  What mistakes did you make today?
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Be honest and detailed about what went wrong. This helps you improve.
                </p>
                <textarea
                  value={mistakes}
                  onChange={(e) => setMistakes(e.target.value)}
                  placeholder="Write your mistakes here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 resize-none"
                  required
                />
              </div>

              {/* Learnings Section */}
              <div>
                <label className="block text-lg font-bold text-gray-800 mb-2">
                  What did you learn today?
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  What lessons or insights did you gain? How will you apply them?
                </p>
                <textarea
                  value={learnings}
                  onChange={(e) => setLearnings(e.target.value)}
                  placeholder="Write your learnings here..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200 resize-none"
                  required
                />
              </div>

              {/* Goals Section */}
              <div>
                <label className="block text-lg font-bold text-gray-800 mb-2">
                  What are your goals for tomorrow? (Optional)
                </label>
                <p className="text-sm text-gray-600 mb-3">
                  Set intentions for the next day based on today's learnings.
                </p>
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  placeholder="Write your goals for tomorrow..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 disabled:scale-100"
              >
                {submitting ? 'Saving Reflection...' : 'Save Today\'s Reflection'}
              </button>
            </form>
          </div>

          {/* Statistics */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{reflections.length}</p>
              <p className="text-gray-600 text-sm">Total Reflections</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {reflections.filter(r => r.goals).length}
              </p>
              <p className="text-gray-600 text-sm">Days with Goals</p>
            </div>
            <div className="bg-white rounded-lg shadow p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">
                {reflections.length > 0
                  ? Math.round((reflections.length / (Math.max(...reflections.map(r => new Date(r.date).getTime()), new Date().getTime()) - Math.min(...reflections.map(r => new Date(r.date).getTime()), new Date().getTime())) + 1) * 100)
                  : 0}
                %
              </p>
              <p className="text-gray-600 text-sm">Consistency</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
