import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { verifyToken } from '@/lib/auth-utils'
import { getBlockedIps, unblockIp } from '@/lib/ip-security'
import { ObjectId } from 'mongodb'

async function getUserIdFromRequest(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')
  const decoded = await verifyToken(token)
  return decoded?.userId || null
}

async function isAdmin(userId: string): Promise<boolean> {
  try {
    const users = await getCollection('users')
    const user = await users.findOne({ _id: new ObjectId(userId) })
    return user?.isAdmin || false
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminStatus = await isAdmin(userId)
    if (!adminStatus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const blockedIps = await getBlockedIps()
    return NextResponse.json(blockedIps)
  } catch (error) {
    console.error('Error fetching blocked IPs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch blocked IPs' },
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

    const adminStatus = await isAdmin(userId)
    if (!adminStatus) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { action, ip, password } = await request.json()

    // Verify admin password before allowing unblock
    if (action === 'unblock') {
      const users = await getCollection('users')
      const admin = await users.findOne({ _id: new ObjectId(userId) })
      
      if (!admin) {
        return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
      }

      const { comparePassword } = await import('@/lib/encryption')
      const passwordMatch = await comparePassword(password, admin.password)

      if (!passwordMatch) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        )
      }

      await unblockIp(ip)
      return NextResponse.json({ success: true, message: 'IP unblocked' })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error managing blocked IPs:', error)
    return NextResponse.json(
      { error: 'Failed to manage blocked IPs' },
      { status: 500 }
    )
  }
}
