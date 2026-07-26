import { MongoClient, Db, Collection } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

interface MongoConnection {
  client: MongoClient
  db: Db
}

export async function connectToDatabase(): Promise<MongoConnection> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const uri = process.env.DATABASE_URL_2

  if (!uri) {
    throw new Error('DATABASE_URL_2 environment variable is not set')
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db('habit-tracker')

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getHabitsCollection(): Promise<Collection> {
  const { db } = await connectToDatabase()
  return db.collection('habits')
}

export async function getCompletionsCollection(): Promise<Collection> {
  const { db } = await connectToDatabase()
  return db.collection('completions')
}
