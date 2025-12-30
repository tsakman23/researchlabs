'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handleOAuthCallback = async () => {
      const code = searchParams.get('code')
      
      // If there's a code in the URL, exchange it for a session
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
          // Successfully authenticated, redirect to dashboard
          router.push('/dashboard')
          return
        }
      }
      
      // Check if user is already logged in
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      } else {
        setLoading(false)
      }
    }
    
    handleOAuthCallback()
  }, [searchParams, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          ResearchLabs
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Collaborative research platform with AI-powered insights
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/auth/login"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In
          </a>
          <a
            href="/auth/signup"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg hover:bg-gray-50 transition-colors font-medium border border-blue-600"
          >
            Get Started
          </a>
        </div>
        <div className="mt-12 text-sm text-gray-500">
          <a href="/test" className="hover:text-gray-700 underline">
            Database Test Page
          </a>
        </div>
      </div>
    </div>
  );
}
