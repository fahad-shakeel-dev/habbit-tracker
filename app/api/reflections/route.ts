import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encryption'
import { verifyToken } from '@/lib/auth-utils'
import { ObjectId } from 'mongodb'

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const decoded = await verifyToken(token)
  return decoded?.userId || null
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reflections = await getCollection('reflections')
    const entries = await reflections
      .find({ userId: new ObjectId(userId) })
      .sort({ date: -1 })
      .toArray()

    // Decrypt entries before sending
    const decryptedEntries = entries.map(entry => ({
      ...entry,
      _id: entry._id.toString(),
      mistakes: decrypt(entry.mistakes),
      learnings: decrypt(entry.learnings),
      goals: decrypt(entry.goals),
    }))

    return NextResponse.json(decryptedEntries)
  } catch (error) {
    console.error('Error fetching reflections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reflections' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { mistakes, learnings, goals } = await request.json()

    if (!mistakes || !learnings) {
      return NextResponse.json(
        { error: 'Mistakes and learnings are required' },
        { status: 400 }
      )
    }

    const reflections = await getCollection('reflections')
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0]

    // Check if reflection for today already exists
    const existingReflection = await reflections.findOne({
      userId: new ObjectId(userId),
      date: today,
    })

    if (existingReflection) {
      // Update existing reflection
      const result = await reflections.updateOne(
        { _id: existingReflection._id },
        {
          $set: {
            mistakes: encrypt(mistakes),
            learnings: encrypt(learnings),
            goals: encrypt(goals || ''),
            updatedAt: new Date(),
          },
        }
      )

      return NextResponse.json({
        _id: existingReflection._id.toString(),
        mistakes,
        learnings,
        goals: goals || '',
        date: today,
        updatedAt: new Date(),
      })
    }

    // Create new reflection
    const result = await reflections.insertOne({
      userId: new ObjectId(userId),
      mistakes: encrypt(mistakes),
      learnings: encrypt(learnings),
      goals: encrypt(goals || ''),
      date: today,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      _id: result.insertedId.toString(),
      mistakes,
      learnings,
      goals: goals || '',
      date: today,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('Error creating reflection:', error)
    return NextResponse.json(
      { error: 'Failed to create reflection' },
      { status: 500 }
    )
  }
}
