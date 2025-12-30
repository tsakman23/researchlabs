import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-900">
      <nav className="bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <h1 className="text-xl font-bold text-white">ResearchLabs</h1>
              <div className="flex space-x-4">
                <a href="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">
                  Dashboard
                </a>
                <a href="/workspaces" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">
                  Workspaces
                </a>
                <a href="/search" className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium">
                  🔍 Search
                </a>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">
                {profile?.display_name || user.email}
              </span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">
              Welcome to ResearchLabs!
            </h2>
            <p className="text-gray-300 mb-6">
              You're successfully signed in as <strong>{user.email}</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border border-gray-700 rounded-lg p-6 bg-gray-700/50">
                <h3 className="text-lg font-semibold mb-2 text-white">Workspaces</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Create and manage research workspaces
                </p>
                <a
                  href="/workspaces"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                >
                  View Workspaces
                </a>
              </div>

              <div className="border border-gray-700 rounded-lg p-6 bg-gray-700/50">
                <h3 className="text-lg font-semibold mb-2 text-white">Search Claims</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Find similar claims using semantic search
                </p>
                <a
                  href="/search"
                  className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 cursor-pointer"
                >
                  Search Claims
                </a>
              </div>

              <div className="border border-gray-700 rounded-lg p-6 bg-gray-700/50">
                <h3 className="text-lg font-semibold mb-2 text-white">Profile</h3>
                <p className="text-gray-300 text-sm mb-4">
                  Update your account settings
                </p>
                <a
                  href="/profile"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 cursor-pointer"
                >
                  Edit Profile
                </a>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
              <h3 className="font-semibold text-blue-300 mb-2">✅ Authentication Working!</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• User ID: {user.id}</li>
                <li>• Email: {user.email}</li>
                <li>• Display Name: {profile?.display_name || 'Not set'}</li>
                <li>• Account Created: {new Date(user.created_at || '').toLocaleDateString()}</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
