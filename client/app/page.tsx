'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function HomePage() {
  const [mounted, setMounted] = useState(false)
  const { user, isLoading } = useAuth()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="text-xl font-bold text-indigo-600">
                Hi-CFO
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <span className="text-gray-700">
                  Hello, {user.first_name}!
                </span>
              ) : (
                <>
                  <Link 
                    href="/auth/login"
                    className="text-indigo-600 hover:text-indigo-800"
                  >
                    Login
                  </Link>
                  <Link 
                    href="/auth/register"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            {user ? (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome back, {user.first_name}!
                </h1>
                <p className="text-gray-600">
                  You are successfully logged in to Hi-CFO.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Welcome to Hi-CFO
                </h1>
                <p className="text-gray-600 mb-6">
                  Please log in or register to get started.
                </p>
                <div className="space-x-4">
                  <Link
                    href="/auth/login"
                    className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-md hover:bg-indigo-700"
                  >
                    Login
                  </Link>
                  <Link
                    href="/auth/register"
                    className="inline-block bg-gray-600 text-white px-6 py-3 rounded-md hover:bg-gray-700"
                  >
                    Register
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}