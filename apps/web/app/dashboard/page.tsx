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
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">ResearchLabs</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {profile?.display_name || user.email}
              </span>
              <form action="/auth/logout" method="post">
                <button
                  type="submit"
                  className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
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
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Welcome to ResearchLabs!
            </h2>
            <p className="text-gray-600 mb-6">
              You're successfully signed in as <strong>{user.email}</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Workspaces</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Create and manage research workspaces
                </p>
                <a
                  href="/workspaces"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View Workspaces
                </a>
              </div>

              <div className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-2">Profile</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Update your account settings
                </p>
                <a
                  href="/profile"
                  className="inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Edit Profile
                </a>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">✅ Authentication Working!</h3>
              <ul className="text-sm text-blue-800 space-y-1">
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
