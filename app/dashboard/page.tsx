'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Calendar, BookOpen, Lock, BarChart3, ArrowRight } from 'lucide-react'

interface Stats {
  diaryEntries: number
  secrets: number
  reflections: number
  habits: number
}

export default function Dashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats>({
    diaryEntries: 0,
    secrets: 0,
    reflections: 0,
    habits: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      router.push('/')
      return
    }

    const fetchStats = async () => {
      try {
        const [diary, secrets, reflections] = await Promise.all([
          fetch('/api/diary', {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch('/api/secrets', {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch('/api/reflections', {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
        ])

        setStats({
          diaryEntries: Array.isArray(diary) ? diary.length : 0,
          secrets: Array.isArray(secrets) ? secrets.length : 0,
          reflections: Array.isArray(reflections) ? reflections.length : 0,
          habits: 0,
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [router])

  const cards = [
    {
      title: 'Diary Entries',
      count: stats.diaryEntries,
      icon: Calendar,
      href: '/diary',
      color: 'from-blue-500 to-blue-600',
      desc: 'Write your daily activities',
    },
    {
      title: 'Secrets',
      count: stats.secrets,
      icon: Lock,
      href: '/secrets',
      color: 'from-purple-500 to-purple-600',
      desc: 'Keep your secrets safe',
    },
    {
      title: 'Reflections',
      count: stats.reflections,
      icon: BookOpen,
      href: '/reflections',
      color: 'from-green-500 to-green-600',
      desc: 'Learn from your mistakes',
    },
  ]

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-blue-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 mb-4">
              Welcome to SecureDiary
            </h1>
            <p className="text-lg text-gray-600">
              Your encrypted personal journal with military-grade security
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {cards.map((card) => {
              const Icon = card.icon
              return (
                <div
                  key={card.title}
                  onClick={() => router.push(card.href)}
                  className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all cursor-pointer group overflow-hidden"
                >
                  <div className={`h-32 bg-gradient-to-r ${card.color} flex items-center justify-center text-white group-hover:scale-105 transition-transform`}>
                    <Icon className="w-16 h-16 opacity-80" />
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-1">{card.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{card.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-4xl font-bold bg-gradient-to-r ${card.color} bg-clip-text text-transparent`}>
                        {loading ? '-' : stats[card.title.toLowerCase().replace(' ', '') as keyof Stats]}
                      </span>
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Security Info */}
          <div className="bg-gradient-to-r from-green-100 to-emerald-100 rounded-xl p-8 border-2 border-green-300">
            <div className="flex items-start gap-4">
              <BarChart3 className="w-8 h-8 text-green-600 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">Your Data is Secured</h2>
                <ul className="space-y-2 text-green-700">
                  <li>✓ All data encrypted with AES-256 encryption</li>
                  <li>✓ End-to-end encryption - only you can decrypt</li>
                  <li>✓ Password protected with bcrypt hashing</li>
                  <li>✓ IP-based security with automatic blocking</li>
                  <li>✓ Auto-destruction feature available</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
