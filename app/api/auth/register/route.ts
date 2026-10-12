import { NextRequest, NextResponse } from 'next/server'
import { DatabaseUnavailableError, getCollection } from '@/lib/db'
import { hashPassword } from '@/lib/encryption'
import { generateToken } from '@/lib/auth-utils'
import { getClientIp, checkIfIpBlocked } from '@/lib/ip-security'

// v2 - fixed auth utils
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
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const users = await getCollection('users')

    // Check if user already exists
    const existingUser = await users.findOne({ email })
    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await hashPassword(password)

    // Create user
    const result = await users.insertOne({
      email,
      password: hashedPassword,
      createdAt: new Date(),
      isAdmin: false,
    })

    const token = generateToken(result.insertedId.toString())

    return NextResponse.json({
      success: true,
      token,
      userId: result.insertedId,
    })
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return NextResponse.json(
        { error: 'Registration is temporarily unavailable. Please try again later.' },
        { status: 503 }
      )
    }
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}
