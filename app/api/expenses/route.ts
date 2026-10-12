import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { verifyToken } from '@/lib/auth-utils'
import { ObjectId } from 'mongodb'

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const decoded = await verifyToken(authHeader.replace('Bearer ', ''))
  return decoded?.userId || null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const date = request.nextUrl.searchParams.get('date')
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A valid date is required' }, { status: 400 })
    }

    const expenses = await getCollection('expenses')
    const entries = await expenses
      .find({ userId: new ObjectId(userId), date })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json(entries.map(entry => ({
      ...entry,
      _id: entry._id.toString(),
    })))
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { date, place, amount } = await request.json()
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'A valid date is required' }, { status: 400 })
    }
    if (typeof place !== 'string' || !place.trim()) {
      return NextResponse.json({ error: 'Place or item is required' }, { status: 400 })
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than zero' }, { status: 400 })
    }

    const createdAt = new Date()
    const expenses = await getCollection('expenses')
    const result = await expenses.insertOne({
      userId: new ObjectId(userId),
      date,
      place: place.trim(),
      amount,
      createdAt,
    })

    return NextResponse.json({
      _id: result.insertedId.toString(),
      date,
      place: place.trim(),
      amount,
      createdAt,
    })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}