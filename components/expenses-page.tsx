'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays, Loader2, Plus, ReceiptText, Trash2, Wallet } from 'lucide-react'
import Navigation from '@/components/navigation'
import { secureGetItem } from '@/lib/storage'

interface Expense {
  _id: string
  date: string
  place: string
  amount: number
  createdAt: string
}

function getLocalDate() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10)
}

export default function ExpensesPage({ initialDate }: { initialDate?: string }) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate || getLocalDate())
  const [place, setPlace] = useState('')
  const [amount, setAmount] = useState('')
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loadedDate, setLoadedDate] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const token = typeof window !== 'undefined' ? secureGetItem('auth_token') : null

  useEffect(() => {
    if (!token) {
      router.push('/')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`/api/expenses?date=${encodeURIComponent(date)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async response => {
        if (!response.ok) throw new Error('Could not load expenses.')
        return response.json()
      })
      .then(data => {
        if (!cancelled) {
          setExpenses(Array.isArray(data) ? data : [])
          setLoadedDate(date)
        }
      })
      .catch(() => {
        if (!cancelled) setError('Could not load expenses. Please try again.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [date, router, token])

  const addExpense = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const numericAmount = Number(amount)
    if (!place.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Enter a place or item and an amount greater than zero.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date, place: place.trim(), amount: numericAmount }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Could not save expense.')
      setExpenses(current => [data, ...current])
      setPlace('')
      setAmount('')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save expense.')
    } finally {
      setSaving(false)
    }
  }

  const deleteExpense = async (id: string) => {
    setDeletingId(id)
    setError('')
    try {
      const response = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) throw new Error('Could not delete expense.')
      setExpenses(current => current.filter(expense => expense._id !== id))
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not delete expense.')
    } finally {
      setDeletingId(null)
    }
  }

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const dailyTotal = loadedDate === date ? total.toFixed(2) : error ? 'Unavailable' : 'Loading...'

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <Navigation />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <header className="mb-8 flex flex-wrap items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
            <Wallet className="size-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Daily expenses</h1>
            <p className="mt-1 text-sm text-gray-600">Keep a simple record of what you spend.</p>
          </div>
          <Link href="/expenses/all" className="rounded-lg border border-emerald-300 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
            View all
          </Link>
        </header>

        <section aria-label="Daily spending total" className="mb-6 flex items-center gap-4 rounded-xl border border-emerald-200 bg-white p-5 shadow-sm">
          <Wallet className="size-8 shrink-0 text-emerald-700" />
          <div>
            <h2 className="text-sm font-semibold text-gray-600">Total spent for selected date</h2>
            <p aria-live="polite" className="mt-1 text-3xl font-bold tabular-nums text-emerald-800">{dailyTotal}</p>
            <p className="mt-1 text-sm text-gray-500">{date}</p>
          </div>
        </section>

        <section className="border-y border-emerald-200 py-5">
          <label htmlFor="expense-date" className="mb-2 block text-sm font-semibold text-gray-800">
            Select date
          </label>
          <div className="relative max-w-xs">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-emerald-700" />
            <input
              id="expense-date"
              type="date"
              value={date}
              disabled={saving || deletingId !== null}
              onChange={event => {
                if (!event.target.value) return
                if (initialDate) router.push(`/expenses/${event.target.value}`)
                else setDate(event.target.value)
              }}
              className="h-11 w-full rounded-md border border-gray-300 bg-white pl-10 pr-3 text-gray-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </section>

        <form onSubmit={addExpense} className="grid gap-3 border-b border-emerald-200 py-5 sm:grid-cols-[minmax(0,1fr)_10rem_auto] sm:items-end">
          <div>
            <label htmlFor="expense-place" className="mb-2 block text-sm font-semibold text-gray-800">
              Place, shop, or item
            </label>
            <input
              id="expense-place"
              value={place}
              onChange={event => setPlace(event.target.value)}
              placeholder="e.g. Groceries"
              maxLength={120}
              required
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div>
            <label htmlFor="expense-amount" className="mb-2 block text-sm font-semibold text-gray-800">
              Amount
            </label>
            <input
              id="expense-amount"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={event => setAmount(event.target.value)}
              placeholder="0.00"
              required
              className="h-11 w-full rounded-md border border-gray-300 bg-white px-3 text-gray-900 outline-none placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button
            type="submit"
            disabled={saving || loading || loadedDate !== date}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-700 px-4 font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Add
          </button>
        </form>

        {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}

        <section className="pt-5" aria-label="Expenses for selected date">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Entries</h2>
            <p className="text-sm text-gray-600">
              Total <span className="ml-1 font-semibold tabular-nums text-gray-900">{dailyTotal}</span>
            </p>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" /> Loading expenses
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex items-center gap-3 border-t border-gray-200 py-8 text-sm text-gray-500">
              <ReceiptText className="size-5 shrink-0" /> No expenses recorded for this date.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200 border-y border-gray-200">
              {expenses.map(expense => (
                <li key={expense._id} className="flex min-h-14 items-center gap-3 py-3">
                  <span className="min-w-0 flex-1 break-words font-medium text-gray-800">{expense.place}</span>
                  <span className="shrink-0 tabular-nums font-semibold text-gray-900">{expense.amount.toFixed(2)}</span>
                  <button
                    type="button"
                    onClick={() => deleteExpense(expense._id)}
                    disabled={deletingId === expense._id}
                    aria-label={`Delete ${expense.place}`}
                    title="Delete expense"
                    className="flex size-9 shrink-0 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
                  >
                    {deletingId === expense._id
                      ? <Loader2 className="size-4 animate-spin" />
                      : <Trash2 className="size-4" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
