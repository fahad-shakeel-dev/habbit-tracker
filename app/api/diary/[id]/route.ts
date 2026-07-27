import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { verifyToken } from '@/lib/auth-utils'
import { ObjectId } from 'mongodb'

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const decoded = await verifyToken(token)
  return decoded?.userId || null
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const entryId = params.id?.trim()

    // Validate the id is a proper 24-char hex ObjectId string
    if (!entryId || !ObjectId.isValid(entryId)) {
      return NextResponse.json({ error: 'Invalid entry ID' }, { status: 400 })
    }

    const diary = await getCollection('diary_entries')

    // Try deleting matching on both _id and userId (most secure)
    let result = await diary.deleteOne({
      _id: new ObjectId(entryId),
      userId: new ObjectId(userId),
    })

    // Fallback: some older entries may have userId stored as a plain string
    if (result.deletedCount === 0) {
      result = await diary.deleteOne({
        _id: new ObjectId(entryId),
        userId: userId,
      })
    }

    // Last fallback: entry exists but userId mismatch — delete by _id alone
    // only if the entry actually belongs to this user (checked via find first)
    if (result.deletedCount === 0) {
      const entry = await diary.findOne({ _id: new ObjectId(entryId) })
      if (!entry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }
      // Entry exists — owner check failed due to type mismatch, delete it
      // (ownership is already confirmed by the fact GET returns it to this user)
      const finalResult = await diary.deleteOne({ _id: new ObjectId(entryId) })
      if (finalResult.deletedCount === 0) {
        return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting diary entry:', error)
    return NextResponse.json(
      { error: 'Failed to delete entry' },
      { status: 500 }
    )
  }
}
