import { getHabitsCollection } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const collection = await getHabitsCollection()
    const habits = await collection.find({}).toArray()
    return NextResponse.json(habits)
  } catch (error) {
    console.error('Error fetching habits:', error)
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid habit name' }, { status: 400 })
    }

    const collection = await getHabitsCollection()
    const result = await collection.insertOne({
      name: name.trim(),
      createdAt: new Date(),
    })

    return NextResponse.json({
      id: result.insertedId.toString(),
      name: name.trim(),
    })
  } catch (error) {
    console.error('Error creating habit:', error)
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 })
  }
}
