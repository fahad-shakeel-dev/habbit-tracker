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

    const secrets = await getCollection('secrets')
    const entries = await secrets
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray()

    // Decrypt entries before sending
    const decryptedEntries = entries.map(entry => ({
      ...entry,
      content: decrypt(entry.content),
    }))

    return NextResponse.json(decryptedEntries)
  } catch (error) {
    console.error('Error fetching secrets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch secrets' },
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

    const { content } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const secrets = await getCollection('secrets')
    const result = await secrets.insertOne({
      userId: new ObjectId(userId),
      content: encrypt(content),
      createdAt: new Date(),
    })

    return NextResponse.json({
      _id: result.insertedId,
      content,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('Error creating secret:', error)
    return NextResponse.json(
      { error: 'Failed to create secret' },
      { status: 500 }
    )
  }
}
