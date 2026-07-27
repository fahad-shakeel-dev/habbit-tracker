'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/navigation'
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { secureGetItem } from '@/lib/storage'

interface BlockedIP {
  _id: string
  ip: string
  blockedAt: string
  reason: string
}

export default function AdminPanel() {
  const router = useRouter()
  const [blockedIps, setBlockedIps] = useState<BlockedIP[]>([])
  const [loading, setLoading] = useState(true)
  const [unblockingId, setUnblockingId] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const isAdmin = typeof window !== 'undefined' ? localStorage.getItem('is_admin') === 'true' : false

  useEffect(() => {
    if (!token) {
      router.push('/')
      return
    }
    if (!isAdmin) {
      router.push('/dashboard')
      return
    }
    fetchBlockedIps()
  }, [token, isAdmin, router])

  const fetchBlockedIps = async () => {
    try {
      const response = await fetch('/api/admin/blocked-ips', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setBlockedIps(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching blocked IPs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async (ip: string) => {
    if (!password.trim()) {
      setError('Please enter your password')
      return
    }

    setUnblockingId(ip)
    setError('')

    try {
      const response = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'unblock', ip, password }),
      })

      if (response.ok) {
        setBlockedIps(blockedIps.filter(item => item.ip !== ip))
        setPassword('')
        alert(`IP ${ip} has been unblocked`)
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to unblock IP')
      }
    } catch (error) {
      setError('An error occurred')
    } finally {
      setUnblockingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-2">Access Denied</h1>
            <p className="text-gray-600">You do not have admin privileges.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Admin Panel</h1>
            <p className="text-gray-600">Manage blocked IP addresses</p>
          </div>

          {/* Blocked IPs Table */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-gray-600">Loading blocked IPs...</p>
              </div>
            ) : blockedIps.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-gray-600 text-lg">No blocked IPs at the moment</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                      <th className="px-6 py-4 text-left font-semibold">IP Address</th>
                      <th className="px-6 py-4 text-left font-semibold">Reason</th>
                      <th className="px-6 py-4 text-left font-semibold">Blocked At</th>
                      <th className="px-6 py-4 text-center font-semibold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {blockedIps.map((item, index) => (
                      <tr
                        key={item._id}
                        className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      >
                        <td className="px-6 py-4 font-mono text-gray-800">{item.ip}</td>
                        <td className="px-6 py-4 text-gray-700">{item.reason}</td>
                        <td className="px-6 py-4 text-gray-600">
                          {new Date(item.blockedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            onClick={() => handleUnblock(item.ip)}
                            disabled={unblockingId === item.ip}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg transition-all flex items-center justify-center gap-2 mx-auto"
                          >
                            <span className="text-sm font-semibold">
                              {unblockingId === item.ip ? 'Unblocking...' : 'Unblock'}
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6 border-l-4 border-red-500">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Unblock IP Address</h2>
            <p className="text-gray-600 mb-4">
              Enter your admin password to unblock an IP address
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400"
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                disabled={!password || unblockingId !== null}
                className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-all"
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
