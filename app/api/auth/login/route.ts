import { NextRequest, NextResponse } from 'next/server'
import { getCollection } from '@/lib/db'
import { comparePassword } from '@/lib/encryption'
import { generateToken } from '@/lib/auth-utils'
import { getClientIp, checkIfIpBlocked, recordLoginAttempt } from '@/lib/ip-security'

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)

    // Check if IP is blocked
    const isBlocked = await checkIfIpBlocked(ip)
    if (isBlocked) {
      return NextResponse.json(
        { error: 'Your IP has been blocked due to multiple failed login attempts' },
        { status: 403 }
      )
    }

    const { email, password } = await request.json()

    if (!email || !password) {
      await recordLoginAttempt(ip, false)
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const users = await getCollection('users')
    const user = await users.findOne({ email })

    if (!user) {
      await recordLoginAttempt(ip, false)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const passwordMatch = await comparePassword(password, user.password)

    if (!passwordMatch) {
      await recordLoginAttempt(ip, false)
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    await recordLoginAttempt(ip, true)
    const token = generateToken(user._id.toString())

    return NextResponse.json({
      success: true,
      token,
      userId: user._id,
      isAdmin: user.isAdmin || false,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
