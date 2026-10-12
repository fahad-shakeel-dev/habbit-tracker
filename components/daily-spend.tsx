'use client'

import { useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'

export default function DailySpend({ token }: { token: string }) {
  const [total, setTotal] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const loadTotal = async () => {
      const now = new Date()
      const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
      setError(false)
      setTotal(null)
      try {
        const response = await fetch(`/api/expenses?date=${date}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Could not load daily spending')
        const expenses: { amount: number }[] = await response.json()
        if (!Array.isArray(expenses)) throw new Error('Invalid expenses')
        if (!controller.signal.aborted) {
          setTotal(expenses.reduce((sum, expense) => sum + expense.amount, 0))
        }
      } catch {
        if (!controller.signal.aborted) setError(true)
      }
    }
    void loadTotal()
    window.addEventListener('focus', loadTotal)
    return () => {
      controller.abort()
      window.removeEventListener('focus', loadTotal)
    }
  }, [token])

  return (
    <section aria-label="Today's spending" className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-white p-4 shadow-sm">
      <Wallet className="size-6 shrink-0 text-emerald-700" />
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600">Today's spending</p>
        <p aria-live="polite" className="text-2xl font-bold tabular-nums text-emerald-800">
          {error ? 'Unavailable' : total === null ? 'Loading...' : total.toFixed(2)}
        </p>
      </div>
    </section>
  )
}
