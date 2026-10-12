'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Task {
  id: string
  name: string
}

interface CompletionData {
  [taskId: string]: Set<number>
}

export default function HabitTracker() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [completions, setCompletions] = useState<CompletionData>({})
  const [newTaskName, setNewTaskName] = useState('')
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [editName, setEditName] = useState('')
  const [editBusy, setEditBusy] = useState(false)
  const [editError, setEditError] = useState('')
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date())
  const [isLoading, setIsLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const todayColRef = useRef<HTMLTableCellElement>(null)

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1 // 1-indexed

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Load habits once on mount
  useEffect(() => {
    const loadHabits = async () => {
      try {
        const res = await fetch('/api/habits')
        if (res.ok) {
          const data = await res.json()
          const tasksList = data.map((doc: any) => ({
            id: doc._id,
            name: doc.name,
          }))
          setTasks(tasksList)
        }
      } catch (error) {
        console.error('Error loading habits:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadHabits()
  }, [])

  // Reload completions every time the month changes
  useEffect(() => {
    const loadCompletions = async () => {
      try {
        const res = await fetch(`/api/completions?year=${year}&month=${month}`)
        if (res.ok) {
          const data = await res.json()
          const converted: CompletionData = {}
          for (const [taskId, days] of Object.entries(data)) {
            converted[taskId] = new Set(days as number[])
          }
          setCompletions(converted)
        }
      } catch (error) {
        console.error('Error loading completions:', error)
      }
    }
    loadCompletions()
  }, [year, month])

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskName.trim()) return

    try {
      const response = await fetch('/api/habits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTaskName }),
      })

      if (response.ok) {
        const newTask = await response.json()
        setTasks([newTask, ...tasks])
        setCompletions({ ...completions, [newTask.id]: new Set() })
        setNewTaskName('')
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const startEditing = (task: Task) => {
    setEditingTask(task)
    setEditName(task.name)
    setEditError('')
  }

  const saveTask = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingTask || editBusy) return
    const name = editName.trim()
    if (!name) {
      setEditError('Enter a habit name.')
      return
    }
    setEditBusy(true)
    setEditError('')
    try {
      const response = await fetch(`/api/habits/${editingTask.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save habit.')
      setTasks(current => current.map(task => task.id === editingTask.id ? { ...task, name: data.name } : task))
      setEditingTask(null)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not save habit.')
    } finally {
      setEditBusy(false)
    }
  }

  const removeTask = async (taskId: string) => {
    if (editBusy) return
    setEditBusy(true)
    setEditError('')
    try {
      const response = await fetch(`/api/habits/${taskId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Could not delete habit.')
      }
      setTasks(current => current.filter(t => t.id !== taskId))
      setCompletions(current => {
        const next = { ...current }
        delete next[taskId]
        return next
      })
      setEditingTask(null)
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Could not delete habit.')
    } finally {
      setEditBusy(false)
    }
  }

  const toggleDay = async (taskId: string, day: number) => {
    const taskCompletions = completions[taskId] || new Set()
    const isCurrentlyChecked = taskCompletions.has(day)
    const completed = !isCurrentlyChecked

    // Optimistic update — reflect instantly in UI before API responds
    const optimisticSet = new Set(taskCompletions)
    if (completed) optimisticSet.add(day)
    else optimisticSet.delete(day)
    setCompletions(prev => ({ ...prev, [taskId]: optimisticSet }))

    try {
      const response = await fetch('/api/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ habitId: taskId, day, completed, year, month }),
      })

      if (!response.ok) {
        // Revert on failure
        setCompletions(prev => ({ ...prev, [taskId]: new Set(taskCompletions) }))
      }
    } catch (error) {
      console.error('Error toggling day:', error)
      // Revert on error
      setCompletions(prev => ({ ...prev, [taskId]: new Set(taskCompletions) }))
    }
  }

  // Scroll to today's column when month changes or on initial load
  useEffect(() => {
    if (!isCurrentMonth()) return
    // Small delay so the table has rendered
    const timer = setTimeout(() => {
      if (todayColRef.current && tableScrollRef.current) {
        const container = tableScrollRef.current
        const cell = todayColRef.current
        // Scroll so today's column is roughly centered
        const offset = cell.offsetLeft - container.clientWidth / 2 + cell.offsetWidth / 2
        container.scrollLeft = Math.max(0, offset)
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [currentMonth, isLoading])

  const goToPrevMonth = () =>
    setCurrentMonth(new Date(year, month - 2))

  const goToNextMonth = () =>
    setCurrentMonth(new Date(year, month))

  const goToToday = () => setCurrentMonth(new Date())

  const getDaysInMonth = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()

  const getDayHeaderLabel = (dayNum: number) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)
    return `${dayName}${dayNum}`
  }

  const isCurrentMonth = () => {
    const now = new Date()
    return year === now.getFullYear() && month === now.getMonth() + 1
  }

  const today = new Date().getDate()

  const getCompletionPercentage = (taskId: string) => {
    const daysInMonth = getDaysInMonth(currentMonth)
    const completedDays = completions[taskId]?.size || 0
    return Math.round((completedDays / daysInMonth) * 100)
  }

  const getStreak = (taskId: string) => {
    const completedDays = Array.from(completions[taskId] || new Set()).sort((a, b) => b - a)
    let streak = 0
    for (let i = 0; i < completedDays.length; i++) {
      if (i === 0 && completedDays[i] === today) {
        streak = 1
      } else if (i > 0 && completedDays[i] === completedDays[i - 1] - 1) {
        streak++
      } else if (i > 0) {
        break
      }
    }
    return streak
  }

  const monthName = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const daysInMonth = getDaysInMonth(currentMonth)
  const viewingCurrent = isCurrentMonth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-700">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 p-2 sm:p-4 md:p-6">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-green-800 mb-1">Daily Habit Tracker</h1>
            <p className="text-green-700 text-xs sm:text-sm">
              {viewingCurrent
                ? '📅 Showing current month — mark your daily habits'
                : '📂 Viewing historical data — read-only past completions shown'}
            </p>
          </div>
          {!viewingCurrent && (
            <button
              onClick={goToToday}
              className="self-start sm:self-auto px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold rounded-lg transition-all"
            >
              Go to Today →
            </button>
          )}
        </div>

        {/* Add Task Form — only shown for current month */}
        {viewingCurrent && (
          <div className="bg-white rounded-lg shadow p-2 sm:p-3 mb-3 sm:mb-4 border-l-4 border-green-500">
            <form onSubmit={addTask} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Add new habit..."
                className="flex-1 px-2 sm:px-3 py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
              />
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg font-semibold flex items-center justify-center gap-1 text-xs sm:text-sm whitespace-nowrap"
              >
                <Plus size={16} />
                <span>Add</span>
              </Button>
            </form>
          </div>
        )}

        {editingTask && (
          <section aria-label="Edit habit" className="mb-4 rounded-lg border border-green-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 font-semibold text-green-800">Edit habit</h2>
            <form onSubmit={saveTask} className="flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-1 basis-48">
                <label htmlFor="edit-habit-name" className="mb-1 block text-sm font-medium text-gray-700">Habit name</label>
                <input id="edit-habit-name" autoFocus value={editName} onChange={event => setEditName(event.target.value)} disabled={editBusy} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
              <button type="submit" disabled={editBusy} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">{editBusy ? 'Processing...' : 'Save'}</button>
              <button type="button" disabled={editBusy} onClick={() => removeTask(editingTask.id)} className="flex items-center gap-1 rounded-lg bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"><Trash2 size={16} /> Delete</button>
              <button type="button" disabled={editBusy} onClick={() => setEditingTask(null)} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50">Cancel</button>
            </form>
            <p className="mt-2 text-xs text-gray-500">Deleting a habit also removes its completion history.</p>
            {editError && <p role="alert" className="mt-2 text-sm text-red-700">{editError}</p>}
          </section>
        )}

        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <button
            onClick={goToPrevMonth}
            className="p-1 hover:bg-green-200 rounded transition-colors"
          >
            <ChevronLeft size={18} className="text-green-700" />
          </button>
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-bold text-green-800">{monthName}</h2>
            {!viewingCurrent && (
              <span className="text-xs text-amber-600 font-medium">Historical View</span>
            )}
          </div>
          <button
            onClick={goToNextMonth}
            className="p-1 hover:bg-green-200 rounded transition-colors"
          >
            <ChevronRight size={18} className="text-green-700" />
          </button>
        </div>

        {/* Habit Table */}
        {tasks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 sm:p-8 text-center">
            <p className="text-gray-500 text-sm sm:text-base">Add your first habit to get started!</p>
          </div>
        ) : (
          <div className="rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto bg-white" ref={tableScrollRef}>
            <table className="w-full border-collapse text-xs sm:text-sm">
              {/* Header Row */}
              <thead>
                <tr className="bg-gradient-to-r from-green-500 to-emerald-600 text-white sticky top-0">
                  <th className="px-2 sm:px-3 py-1 sm:py-2 text-left font-semibold border-r border-emerald-700 whitespace-nowrap sticky left-0 z-20 bg-emerald-600" style={{ minWidth: '80px' }}>
                    Activities
                  </th>
                  {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                    const dayNum = dayIndex + 1
                    const isToday = viewingCurrent && dayNum === today
                    return (
                      <th
                        key={`day-${dayNum}`}
                        ref={isToday ? todayColRef : undefined}
                        className={`px-0.5 sm:px-1 py-1 sm:py-2 text-center font-semibold border-r border-emerald-700 ${
                          isToday ? 'bg-yellow-400 text-green-900' : 'bg-emerald-700'
                        }`}
                        style={{ minWidth: '24px' }}
                      >
                        <span className="text-xs sm:text-sm block">{getDayHeaderLabel(dayNum)}</span>
                      </th>
                    )
                  })}
                  <th className="px-2 py-1 sm:py-2 text-center font-semibold bg-emerald-700 whitespace-nowrap">
                    %
                  </th>
                </tr>
              </thead>
              {/* Task Rows */}
              <tbody>
                {tasks.map((task, taskIndex) => {
                  const completionPercent = getCompletionPercentage(task.id)
                  const streak = getStreak(task.id)
                  return (
                    <tr
                      key={task.id}
                      className={taskIndex % 2 === 0 ? 'bg-gray-50 hover:bg-gray-100' : 'bg-white hover:bg-gray-50'}
                    >
                      {/* Task Name */}
                      <td className={`px-2 sm:px-3 py-1 sm:py-2 font-semibold text-gray-700 border-r border-gray-200 sticky left-0 z-10 ${taskIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}>
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex flex-col min-w-0">
                            <span className="truncate flex-1 text-xs sm:text-sm">{task.name}</span>
                            {streak > 0 && viewingCurrent && (
                              <span className="text-xs text-orange-500 font-bold">🔥 {streak}d</span>
                            )}
                          </div>
                          {viewingCurrent && (
                            <button
                              onClick={() => startEditing(task)}
                              disabled={editBusy}
                              className="flex items-center gap-1 text-green-700 hover:text-green-900 hover:bg-green-100 p-1 rounded flex-shrink-0 disabled:opacity-50"
                              title={`Edit ${task.name}`}
                              aria-label={`Edit ${task.name}`}
                            >
                              <Pencil size={14} />
                              <span className="text-xs">Edit</span>
                            </button>
                          )}
                        </div>
                      </td>
                      {/* Days of Month Cells */}
                      {Array.from({ length: daysInMonth }).map((_, dayIndex) => {
                        const dayNum = dayIndex + 1
                        const isChecked = completions[task.id]?.has(dayNum)
                        const isToday = viewingCurrent && dayNum === today
                        const isFuture = viewingCurrent && dayNum > today
                        const isPast = viewingCurrent && dayNum < today
                        const isMissed = isPast && !isChecked   // past + not done = missed
                        // Only today is interactive; past and future are locked
                        const isLocked = !viewingCurrent || isFuture || isPast
                        return (
                          <td
                            key={`day-${dayNum}`}
                            className={`px-0.5 sm:px-1 py-1 sm:py-2 text-center border-r border-gray-200 ${
                              isToday ? 'bg-yellow-50' : isMissed ? 'bg-red-50/40' : isPast ? 'bg-gray-50/60' : ''
                            }`}
                          >
                            <button
                              onClick={() => !isLocked ? toggleDay(task.id, dayNum) : undefined}
                              disabled={isLocked}
                              className={`w-5 h-5 sm:w-6 sm:h-6 rounded mx-auto text-xs sm:text-sm font-bold transition-all flex items-center justify-center ${
                                isChecked && isPast
                                  ? 'bg-green-300 border-2 border-green-400 text-white cursor-not-allowed opacity-80'
                                  : isChecked && isToday
                                  ? 'bg-green-400 border-2 border-green-500 text-white shadow-md hover:bg-green-500'
                                  : isChecked
                                  ? 'bg-green-300 border-2 border-green-400 text-white cursor-not-allowed opacity-80'
                                  : isMissed
                                  ? 'bg-red-100 border border-red-300 text-red-400 cursor-not-allowed'
                                  : isFuture || !viewingCurrent
                                  ? 'bg-gray-100 border border-gray-200 text-gray-200 cursor-not-allowed'
                                  : 'bg-white border border-gray-300 text-gray-300 hover:bg-gray-100 hover:border-gray-400'
                              }`}
                              title={`${task.name} - ${getDayHeaderLabel(dayNum)}${isFuture ? ' (future)' : isMissed ? ' (missed)' : isPast ? ' (done)' : ''}`}
                            >
                              {isChecked ? '✓' : isMissed ? '✕' : ''}
                            </button>
                          </td>
                        )
                      })}
                      {/* Completion % */}
                      <td className="px-2 py-1 text-center">
                        <span
                          className={`text-xs font-bold ${
                            completionPercent >= 80
                              ? 'text-green-600'
                              : completionPercent >= 50
                              ? 'text-yellow-600'
                              : 'text-red-400'
                          }`}
                        >
                          {completionPercent}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

            {/* Progress Footer — fixed at bottom */}
            {tasks.length > 0 && (
              <div className="bg-green-500 text-white px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t-2 border-green-600 flex-wrap sticky bottom-0">
                <span className="whitespace-nowrap">
                  {viewingCurrent ? 'Monthly Progress:' : `${monthName} History:`}
                </span>
                <div className="flex gap-1 sm:gap-2 flex-wrap">
                  {tasks.map((task) => (
                    <span key={task.id} className="bg-green-600 px-2 py-1 rounded whitespace-nowrap text-xs">
                      {task.name}: {getCompletionPercentage(task.id)}%
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
