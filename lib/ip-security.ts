import { NextRequest } from 'next/server'
import { getCollection } from './db'

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown'
  return ip
}

export async function checkIfIpBlocked(ip: string): Promise<boolean> {
  const blockedIps = await getCollection('blocked_ips')
  const blocked = await blockedIps.findOne({ ip })
  return !!blocked
}

export async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  try {
    const attempts = await getCollection('login_attempts')
    await attempts.insertOne({
      ip,
      success,
      timestamp: new Date(),
    })

    if (!success) {
      // Count failed attempts in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
      const failedCount = await attempts.countDocuments({
        ip,
        success: false,
        timestamp: { $gte: oneHourAgo },
      })

      // Block IP after 5 failed attempts
      if (failedCount >= 5) {
        const blockedIps = await getCollection('blocked_ips')
        await blockedIps.updateOne(
          { ip },
          {
            $set: {
              ip,
              blockedAt: new Date(),
              reason: 'Too many failed login attempts',
            },
          },
          { upsert: true }
        )
      }
    }
  } catch (error) {
    console.error('Error recording login attempt:', error)
  }
}

export async function unblockIp(ip: string): Promise<void> {
  try {
    const blockedIps = await getCollection('blocked_ips')
    await blockedIps.deleteOne({ ip })
  } catch (error) {
    console.error('Error unblocking IP:', error)
  }
}

export async function getBlockedIps(): Promise<any[]> {
  try {
    const blockedIps = await getCollection('blocked_ips')
    return await blockedIps.find({}).toArray()
  } catch (error) {
    console.error('Error getting blocked IPs:', error)
    return []
  }
}
