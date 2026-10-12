import { notFound } from 'next/navigation'
import ExpensesPage from '@/components/expenses-page'

export default async function ExpenseDetails({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    notFound()
  }
  return <ExpensesPage key={date} initialDate={date} />
}
