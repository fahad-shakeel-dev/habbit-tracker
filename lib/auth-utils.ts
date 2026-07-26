import * as jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'jwt-secret'

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: '7d',
  })
}

export const verifyToken = async (
  token: string
): Promise<{ userId: string } | null> => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
  } catch {
    return null
  }
}
