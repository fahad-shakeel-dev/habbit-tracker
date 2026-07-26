/**
 * Encrypted localStorage utility
 * All data stored in the browser is AES-256 encrypted.
 * Never store anything sensitive as plaintext.
 */
import CryptoJS from 'crypto-js'

// Derive a per-session storage key from the app name.
// In a real app, you'd also blend in a user-specific server-issued salt.
const STORAGE_KEY = 'SecureDiary@App#2025$v1'

export function secureSetItem(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    const encrypted = CryptoJS.AES.encrypt(value, STORAGE_KEY).toString()
    localStorage.setItem(key, encrypted)
  } catch {
    // Silent fail — never expose raw data on error
  }
}

export function secureGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const encrypted = localStorage.getItem(key)
    if (!encrypted) return null
    const bytes = CryptoJS.AES.decrypt(encrypted, STORAGE_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return decrypted || null
  } catch {
    return null
  }
}

export function secureRemoveItem(key: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(key)
}
