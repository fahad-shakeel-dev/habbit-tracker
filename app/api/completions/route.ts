import { getCompletionsCollection } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/completions?year=2025&month=7
// Returns { habitId: number[] } for the requested month only
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const collection = await getCompletionsCollection()

    // Filter to the specific year-month if provided
    const query: Record<string, unknown> = {}
    if (year && month) {
      const mm = String(month).padStart(2, '0')
      query.yearMonth = `${year}-${mm}`
    }

    const completions = await collection.find(query).toArray()

    // Return { habitId: day[] } map
    const result: { [key: string]: number[] } = {}
    for (const doc of completions) {
      result[doc.habitId.toString()] = doc.days || []
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching completions:', error)
    return NextResponse.json({ error: 'Failed to fetch completions' }, { status: 500 })
  }
}

// POST /api/completions
// Body: { habitId, day, completed, year, month }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { habitId, day, completed, year, month } = body

    if (!habitId || typeof day !== 'number' || !year || !month) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    if (!ObjectId.isValid(habitId)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 })
    }

    const mm = String(month).padStart(2, '0')
    const yearMonth = `${year}-${mm}`
    const habitIdObj = new ObjectId(habitId)
    const collection = await getCompletionsCollection()

    // One document per habit per yearMonth
    const existing = await collection.findOne({ habitId: habitIdObj, yearMonth })

    if (!existing) {
      await collection.insertOne({
        habitId: habitIdObj,
        yearMonth,
        days: completed ? [day] : [],
        updatedAt: new Date(),
      })
    } else {
      const days: number[] = existing.days || []
      if (completed) {
        if (!days.includes(day)) days.push(day)
      } else {
        const idx = days.indexOf(day)
        if (idx > -1) days.splice(idx, 1)
      }

      await collection.updateOne(
        { habitId: habitIdObj, yearMonth },
        { $set: { days, updatedAt: new Date() } }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating completion:', error)
    return NextResponse.json({ error: 'Failed to update completion' }, { status: 500 })
  }
}
