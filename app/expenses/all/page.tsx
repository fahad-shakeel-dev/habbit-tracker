'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Loader2, ReceiptText, Wallet } from 'lucide-react'
import Navigation from '@/components/navigation'
import { secureGetItem } from '@/lib/storage'

interface ExpenseDay {
  date: string
  total: number
  count: number
}

export default function AllExpenses() {
  const router = useRouter()
  const [days, setDays] = useState<ExpenseDay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const token = secureGetItem('auth_token')
    if (!token) { router.replace('/'); return }
    const controller = new AbortController()
    setLoading(true)
    setError('')
    fetch('/api/expenses/summary', {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
      cache: 'no-store',
    })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load expenses.')
        return response.json()
      })
      .then(data => {
        if (!Array.isArray(data)) throw new Error('Invalid expense summary')
        if (!controller.signal.aborted) setDays(data)
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Could not load expenses. Please try again.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [router, retry])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800"><Wallet className="size-6" /></div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">All expenses</h1>
            <p className="mt-1 text-sm text-gray-600">Spending by day. Select a day to view its entries.</p>
          </div>
          <Link href="/expenses" className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">Add expense</Link>
        </header>

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-gray-500"><Loader2 className="size-4 animate-spin" /> Loading expenses</p>
        ) : error ? (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>{error}</p>
            <button onClick={() => setRetry(current => current + 1)} className="mt-2 font-semibold underline">Try again</button>
          </div>
        ) : days.length === 0 ? (
          <p className="flex items-center gap-3 border-t border-gray-200 py-8 text-sm text-gray-500"><ReceiptText className="size-5" /> No expenses recorded yet.</p>
        ) : (
          <section aria-label="Daily expense totals" className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
            <div className="flex justify-between bg-emerald-50 px-4 py-3 text-sm font-semibold text-gray-700"><span>Date</span><span className="mr-7">Total spent</span></div>
            <ul className="divide-y divide-gray-200">
              {days.map(day => (
                <li key={day.date}>
                  <Link href={`/expenses/${day.date}`} className="flex items-center gap-3 px-4 py-4 hover:bg-emerald-50 focus-visible:outline-2 focus-visible:outline-emerald-700">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="mt-1 text-xs text-gray-500">{day.count} {day.count === 1 ? 'expense' : 'expenses'}</p>
                    </div>
                    <span className="font-bold tabular-nums text-emerald-800">{day.total.toFixed(2)}</span>
                    <ChevronRight className="size-4 text-emerald-700" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  )
}
