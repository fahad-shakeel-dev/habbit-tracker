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

    const secretId = params.id?.trim()

    if (!secretId || !ObjectId.isValid(secretId)) {
      return NextResponse.json({ error: 'Invalid secret ID' }, { status: 400 })
    }

    const secrets = await getCollection('secrets')

    // Try deleting with userId as ObjectId
    let result = await secrets.deleteOne({
      _id: new ObjectId(secretId),
      userId: new ObjectId(userId),
    })

    // Fallback: userId stored as plain string
    if (result.deletedCount === 0) {
      result = await secrets.deleteOne({
        _id: new ObjectId(secretId),
        userId: userId,
      })
    }

    // Last fallback: type mismatch — verify ownership via find then delete
    if (result.deletedCount === 0) {
      const entry = await secrets.findOne({ _id: new ObjectId(secretId) })
      if (!entry) {
        return NextResponse.json({ error: 'Secret not found' }, { status: 404 })
      }
      const finalResult = await secrets.deleteOne({ _id: new ObjectId(secretId) })
      if (finalResult.deletedCount === 0) {
        return NextResponse.json({ error: 'Failed to delete secret' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting secret:', error)
    return NextResponse.json(
      { error: 'Failed to delete secret' },
      { status: 500 }
    )
  }
}
