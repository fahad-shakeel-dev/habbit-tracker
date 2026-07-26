'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, LogOut, Lock, Trash2, Calendar, BookOpen, Lock as LockIcon, BarChart3, Shield } from 'lucide-react'

interface DestructionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void
  loading: boolean
}

function DestructionModal({ isOpen, onClose, onConfirm, loading }: DestructionModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = () => {
    if (password) {
      onConfirm(password)
      setPassword('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-sm w-full p-6">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Auto Destruction</h2>
        <p className="text-gray-700 mb-4">
          This action will permanently delete all your data including diary entries, secrets, and reflections. This cannot be undone.
        </p>
        <p className="text-sm text-red-600 font-semibold mb-6">
          Enter your password to confirm permanent deletion:
        </p>

        <div className="relative mb-4">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2 text-gray-400"
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !password}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Deleting...' : 'Delete All'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [destructionModalOpen, setDestructionModalOpen] = useState(false)
  const [destructionLoading, setDestructionLoading] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('is_admin') === 'true' : false
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/diary', label: 'Diary', icon: Calendar },
    { href: '/secrets', label: 'Secrets', icon: LockIcon },
    { href: '/reflections', label: 'Reflections', icon: BookOpen },
    ...(isAdmin ? [{ href: '/admin', label: 'Admin Panel', icon: Shield }] : []),
  ]

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user_id')
    localStorage.removeItem('is_admin')
    router.push('/')
  }

  const handleDestruction = async (password: string) => {
    setDestructionLoading(true)
    try {
      const response = await fetch('/api/user/destroy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        alert('All data has been permanently deleted. Redirecting...')
        handleLogout()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete data')
      }
    } catch (error) {
      alert('An error occurred')
    } finally {
      setDestructionLoading(false)
      setDestructionModalOpen(false)
    }
  }

  if (!token) return null

  return (
    <>
      <nav className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link href="/dashboard" className="font-bold text-xl flex items-center gap-2">
              <Lock className="w-6 h-6" />
              <span className="hidden sm:inline">SecureDiary</span>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-white/20 backdrop-blur'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setDestructionModalOpen(true)}
                className="p-2 hover:bg-red-600 rounded-lg transition-all hidden sm:block" title="Auto destruction"
              >
                <Trash2 className="w-5 h-5 text-red-200 hover:text-red-100" />
              </button>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-green-700 rounded-lg transition-all hidden sm:block"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-all"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`block px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                      isActive
                        ? 'bg-white/20 backdrop-blur'
                        : 'hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
              <button
                onClick={() => {
                  setDestructionModalOpen(true)
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 rounded-lg hover:bg-red-600 transition-all flex items-center gap-2 text-red-200"
              >
                <Trash2 className="w-4 h-4" />
                Auto Destruction
              </button>
              <button
                onClick={() => {
                  handleLogout()
                  setMobileMenuOpen(false)
                }}
                className="block w-full text-left px-4 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>

      <DestructionModal
        isOpen={destructionModalOpen}
        onClose={() => setDestructionModalOpen(false)}
        onConfirm={handleDestruction}
        loading={destructionLoading}
      />
    </>
  )
}
