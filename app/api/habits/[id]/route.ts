import { getHabitsCollection, getCompletionsCollection } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 })
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (typeof body?.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Habit name is required' }, { status: 400 })
  }

  try {
    const collection = await getHabitsCollection()
    const name = body.name.trim()
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { name } })
    if (!result.matchedCount) {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 })
    }
    return NextResponse.json({ id, name })
  } catch (error) {
    console.error('Error updating habit:', error)
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid habit ID' }, { status: 400 })
    }

    const habitId = new ObjectId(id)
    const habitsCollection = await getHabitsCollection()
    const completionsCollection = await getCompletionsCollection()

    // Delete habit
    await habitsCollection.deleteOne({ _id: habitId })

    // Delete all completion records for this habit across all months
    await completionsCollection.deleteMany({ habitId })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting habit:', error)
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 })
  }
}

