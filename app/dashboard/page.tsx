'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { secureGetItem } from '@/lib/storage'
import {
  BookOpen, Lock, Lightbulb, CheckSquare,
  TrendingUp, Calendar, ArrowUpRight, Shield,
  Flame, Star
} from 'lucide-react'

interface Stats {
  diaryEntries: number
  secrets: number
  reflections: number
  habits: number
  streak: number
  todayHabits: number
  totalHabits: number
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    diaryEntries: 0,
    secrets: 0,
    reflections: 0,
    habits: 0,
    streak: 0,
    todayHabits: 0,
    totalHabits: 0,
  })
  const [loading, setLoading] = useState(true)
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    const h = new Date().getHours()
    if (h < 12) setGreeting('Good morning')
    else if (h < 17) setGreeting('Good afternoon')
    else setGreeting('Good evening')
  }, [])

  useEffect(() => {
    const token = secureGetItem('auth_token')
    if (!token) { router.push('/'); return }

    const fetchStats = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const now = new Date()
        const y = now.getFullYear()
        const m = now.getMonth() + 1

        const [diary, secrets, reflections, completions] = await Promise.all([
          fetch('/api/diary', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/secrets', { headers }).then(r => r.ok ? r.json() : []),
          fetch('/api/reflections', { headers }).then(r => r.ok ? r.json() : []),
          fetch(`/api/completions?year=${y}&month=${m}`, { headers }).then(r => r.ok ? r.json() : {}),
        ])

        // Calculate streak from reflections
        const today = now.toISOString().split('T')[0]
        const refDates = new Set((Array.isArray(reflections) ? reflections : []).map((r: any) => r.date))
        let streak = 0
        for (let i = 0; i < 365; i++) {
          const d = new Date(now)
          d.setDate(d.getDate() - i)
          const ds = d.toISOString().split('T')[0]
          if (refDates.has(ds)) streak++
          else if (i > 0) break
        }

        // Habits today
        const todayNum = now.getDate()
        const compObj = completions && typeof completions === 'object' ? completions : {}
        const habitKeys = Object.keys(compObj)
        const todayDone = habitKeys.filter(k => Array.isArray(compObj[k]) && compObj[k].includes(todayNum)).length

        setStats({
          diaryEntries: Array.isArray(diary) ? diary.length : 0,
          secrets: Array.isArray(secrets) ? secrets.length : 0,
          reflections: Array.isArray(reflections) ? reflections.length : 0,
          habits: habitKeys.length,
          streak,
          todayHabits: todayDone,
          totalHabits: habitKeys.length,
        })
      } catch (e) {
        console.error('Stats fetch error:', e)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const cards = [
    {
      title: 'Diary',
      subtitle: 'Daily journal entries',
      count: stats.diaryEntries,
      label: 'entries',
      icon: BookOpen,
      href: '/diary',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      countColor: 'text-blue-700',
      border: 'border-blue-200',
      badge: stats.diaryEntries > 0 ? `${stats.diaryEntries} total` : 'Start writing',
    },
    {
      title: 'Secrets',
      subtitle: 'Encrypted private notes',
      count: stats.secrets,
      label: 'secrets',
      icon: Lock,
      href: '/secrets',
      bg: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      countColor: 'text-violet-700',
      border: 'border-violet-200',
      badge: 'AES-256 encrypted',
    },
    {
      title: 'Reflections',
      subtitle: 'Mistakes & learnings',
      count: stats.reflections,
      label: 'days',
      icon: Lightbulb,
      href: '/reflections',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      countColor: 'text-amber-700',
      border: 'border-amber-200',
      badge: stats.streak > 0 ? `🔥 ${stats.streak}d streak` : 'Build a streak',
    },
    {
      title: 'Habits',
      subtitle: "Today's progress",
      count: stats.todayHabits,
      label: `/ ${stats.totalHabits} today`,
      icon: CheckSquare,
      href: '/',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      countColor: 'text-emerald-700',
      border: 'border-emerald-200',
      badge: stats.totalHabits > 0 ? `${stats.totalHabits} habits tracked` : 'Add habits',
    },
  ]

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-medium text-gray-400 mb-1">{today}</p>
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {greeting} 👋
            </h1>
            <p className="text-gray-500 mt-1">Here's a summary of your personal space.</p>
          </div>

          {/* Quick stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              { label: 'Journal Days', value: stats.diaryEntries, icon: Calendar, color: 'text-blue-600' },
              { label: 'Reflection Streak', value: `${stats.streak}d`, icon: Flame, color: 'text-orange-500' },
              { label: 'Habits Today', value: `${stats.todayHabits}/${stats.totalHabits}`, icon: Star, color: 'text-emerald-600' },
              { label: 'Secrets Kept', value: stats.secrets, icon: Shield, color: 'text-violet-600' },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className="shrink-0">
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold text-gray-800 leading-none">
                      {loading ? '—' : s.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{s.label}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Main feature cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {cards.map(card => {
              const Icon = card.icon
              return (
                <button
                  key={card.title}
                  onClick={() => router.push(card.href)}
                  className={`text-left w-full bg-white border ${card.border} rounded-2xl shadow-sm hover:shadow-md transition-all group p-5 flex items-start gap-4`}
                >
                  <div className={`${card.iconBg} rounded-xl p-3 shrink-0`}>
                    <Icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">{card.title}</h3>
                        <p className="text-sm text-gray-400 mt-0.5">{card.subtitle}</p>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5 shrink-0" />
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div>
                        <span className={`text-3xl font-bold ${card.countColor}`}>
                          {loading ? '—' : card.count}
                        </span>
                        <span className="text-sm text-gray-400 ml-1.5">{card.label}</span>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${card.bg} ${card.iconColor}`}>
                        {card.badge}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          {/* Security footer */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-emerald-100 rounded-lg p-2">
                <Shield className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="font-semibold text-gray-800">Your data is private & secure</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                'AES-256 encryption on all entries',
                'End-to-end — only you can decrypt',
                'Passwords hashed with bcrypt',
                'IP-based brute-force protection',
              ].map(item => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
