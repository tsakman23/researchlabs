import { createClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createClient()
  
  // Test database connection by querying workspaces
  const { data: workspaces, error } = await supabase
    .from('workspaces')
    .select('*')
    .limit(5)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Database Connection Test</h1>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2 className="font-semibold mb-2">Workspaces Query Result:</h2>
        {error ? (
          <div className="text-red-600">
            <p>Error: {error.message}</p>
          </div>
        ) : (
          <div className="text-green-600">
            <p>✅ Connection successful!</p>
            <p className="mt-2">Found {workspaces?.length || 0} workspaces</p>
            {workspaces && workspaces.length > 0 && (
              <pre className="mt-2 text-xs bg-white p-2 rounded overflow-auto">
                {JSON.stringify(workspaces, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-semibold mb-2">Environment Check:</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}
          </li>
          <li>
            Supabase Anon Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}
          </li>
        </ul>
      </div>
    </div>
  )
}
