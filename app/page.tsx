'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AuthPage from '@/components/auth-page'
import HabitTracker from '@/components/habit-tracker'

export default function Home() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    setToken(storedToken)
    setLoading(false)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-700">Loading...</div>
        </div>
      </div>
    )
  }

  if (!token) return <AuthPage />

  return (
    <div className="relative">
      {/* Subtle star link to dashboard — top-right corner */}
      <Link
        href="/dashboard"
        title="Go to Dashboard"
        className="fixed top-3 right-3 z-50 text-yellow-400 hover:text-yellow-500 transition-colors leading-none"
        style={{ fontSize: '18px', lineHeight: 1 }}
      >
        ★
      </Link>
      <HabitTracker />
    </div>
  )
}
