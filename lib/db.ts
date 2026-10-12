import { MongoClient, Db, Collection } from 'mongodb'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null
let connectionPromise: Promise<{ client: MongoClient; db: Db }> | null = null

export class DatabaseUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('Database is unavailable. Check the MongoDB connection URL and network access.', { cause })
    this.name = 'DatabaseUnavailableError'
  }
}

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  if (!connectionPromise) {
    connectionPromise = openConnection().catch((error) => {
      connectionPromise = null
      throw error
    })
  }

  return connectionPromise
}

async function openConnection(): Promise<{ client: MongoClient; db: Db }> {
  const uri = process.env.DATABASE_URL || process.env.DATABASE_URL_2
  if (!uri) {
    throw new DatabaseUnavailableError()
  }

  let client: MongoClient | undefined
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
    await client.connect()
  } catch (error) {
    // Log diagnostic codes without exposing credentials from the connection URL.
    const failure = error as { name?: string; message?: string; code?: string | number; cause?: { name?: string; code?: string | number } }
    const authenticationFailed = /bad auth|authentication failed/i.test(failure.message || '')
    console.error('MongoDB connection failed:', JSON.stringify({
      name: failure.name,
      code: failure.code,
      cause: failure.cause?.name,
      causeCode: failure.cause?.code,
      reason: authenticationFailed ? 'Authentication failed: check the Atlas database username and password.' : undefined,
    }))
    await client?.close().catch(() => {})
    throw new DatabaseUnavailableError(error)
  }

  const db = client.db('diary_app')

  // Create indexes for performance
  try {
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    await db.collection('login_attempts').createIndex({ ip: 1 })
    await db.collection('blocked_ips').createIndex({ ip: 1 }, { unique: true })
    await db.collection('expenses').createIndex({ userId: 1, date: 1 })
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
  if (connectionPromise) {
    await connectionPromise.catch(() => {})
  }
  if (cachedClient) {
    await cachedClient.close()
    cachedClient = null
    cachedDb = null
  }
  connectionPromise = null
}
