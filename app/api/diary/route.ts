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

    const diary = await getCollection('diary_entries')
    const entries = await diary
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()

    // Decrypt entries before sending
    const decryptedEntries = entries.map(entry => ({
      ...entry,
      content: decrypt(entry.content),
      title: decrypt(entry.title),
    }))

    return NextResponse.json(decryptedEntries)
  } catch (error) {
    console.error('Error fetching diary entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch entries' },
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

    const { title, content } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      )
    }

    const diary = await getCollection('diary_entries')
    const result = await diary.insertOne({
      userId: new ObjectId(userId),
      title: encrypt(title),
      content: encrypt(content),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    return NextResponse.json({
      _id: result.insertedId,
      title,
      content,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('Error creating diary entry:', error)
    return NextResponse.json(
      { error: 'Failed to create entry' },
      { status: 500 }
    )
  }
}
