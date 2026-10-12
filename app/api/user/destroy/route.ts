import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { comparePassword } from '@/lib/encryption'
import { verifyToken } from '@/lib/auth-utils'
import { ObjectId } from 'mongodb'

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const decoded = await verifyToken(token)
  return decoded?.userId || null
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { password } = await request.json()

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    // Verify password before deletion
    const users = await getCollection('users')
    const user = await users.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const passwordMatch = await comparePassword(password, user.password)
    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    // Delete all user data
    const userObjId = new ObjectId(userId)
    
    await Promise.all([
      getCollection('expenses').then(col => col.deleteMany({ userId: userObjId })),
      getCollection('habits').then(col => col.deleteMany({ userId: userObjId })),
      getCollection('users').then(col => col.deleteOne({ _id: userObjId })),
    ])

    return NextResponse.json({
      success: true,
      message: 'All data has been permanently deleted',
    })
  } catch (error) {
    console.error('Error destroying account:', error)
    return NextResponse.json(
      { error: 'Failed to destroy account' },
      { status: 500 }
    )
  }
}
