import { MongoClient, Db, Collection } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const uri = process.env.DATABASE_URL || process.env.DATABASE_URL_2 || ''
  const client = new MongoClient(uri)
  await client.connect()

  const db = client.db('diary_app')

  // Create indexes for performance
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('login_attempts').createIndex({ ip: 1 })
    await db.collection('blocked_ips').createIndex({ ip: 1 }, { unique: true })
    await db.collection('diary_entries').createIndex({ userId: 1, createdAt: -1 })
    await db.collection('secrets').createIndex({ userId: 1, createdAt: -1 })
    await db.collection('reflections').createIndex({ userId: 1, date: 1 })
  } catch (error) {
    console.error('Index creation error:', error)
  }

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getCollection(collectionName: string): Promise<Collection> {
  const { db } = await connectToDatabase()
  return db.collection(collectionName)
}

export async function disconnectFromDatabase(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
  }
}
