import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { getCollection } from '@/lib/db'
import { verifyToken } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const user = authHeader ? await verifyToken(authHeader.replace('Bearer ', '')) : null
  if (!user?.userId || !ObjectId.isValid(user.userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const collection = await getCollection('expenses')
    const days = await collection.aggregate([
      { $match: { userId: new ObjectId(user.userId) } },
      { $group: { _id: '$date', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $project: { _id: 0, date: '$_id', total: { $round: ['$total', 2] }, count: 1 } },
    ]).toArray()
    return NextResponse.json(days)
  } catch (error) {
    console.error('Error fetching daily expense totals:', error)
    return NextResponse.json({ error: 'Failed to load daily expense totals' }, { status: 500 })
  }
}
