import { getHabitsCollection, getCompletionsCollection } from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { NextRequest, NextResponse } from 'next/server'

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

