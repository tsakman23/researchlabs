'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

interface SearchResult {
  id: number
  workspace_id: string
  document_id: number
  claim_text: string
  confidence_score: number
  status: string
  similarity: number
  created_at: string
}

interface Contradiction {
  id: number
  claim_a_id: number
  claim_b_id: number
  confidence_score: number
  explanation: string
  claim_a: {
    id: number
    claim_text: string
    confidence_score: number
  }
  claim_b: {
    id: number
    claim_text: string
    confidence_score: number
  }
}

interface SearchResponse {
  claims: SearchResult[]
  contradictions: Contradiction[]
  query: string
  count: number
}

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspaces, setWorkspaces] = useState<any[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadWorkspaces()
  }, [])

  async function loadWorkspaces() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(id, name)')
      .eq('user_id', user.id)

    if (data) {
      setWorkspaces(data.map(d => d.workspace).filter(Boolean))
    }
  }

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    
    if (!query.trim()) {
      setError('Please enter a search query')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        q: query,
        limit: '50'
      })
      
      if (workspaceId) {
        params.append('workspace_id', workspaceId)
      }

      const response = await fetch(`/api/search?${params}`)
      
      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data: SearchResponse = await response.json()
      setResults(data)
    } catch (err) {
      setError('Failed to perform search. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-50'
      case 'disputed': return 'text-red-600 bg-red-50'
      case 'needs_review': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Search Claims
          </h1>
          <p className="text-gray-600">
            Use semantic search to find similar claims and contradictions
          </p>
        </div>

        <form onSubmit={handleSearch} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="query" className="block text-sm font-medium text-gray-700 mb-2">
                Search Query
              </label>
              <input
                id="query"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter claim text to search for similar claims..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label htmlFor="workspace" className="block text-sm font-medium text-gray-700 mb-2">
                Workspace (Optional)
              </label>
              <select
                id="workspace"
                value={workspaceId}
                onChange={(e) => setWorkspaceId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">All Workspaces</option>
                {workspaces.map((ws) => (
                  <option key={ws.id} value={ws.id}>
                    {ws.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Search Results
              </h2>
              <p className="text-sm text-gray-600">
                Found {results.count} claim{results.count !== 1 ? 's' : ''} similar to "{results.query}"
                {results.contradictions.length > 0 && ` with ${results.contradictions.length} contradiction${results.contradictions.length !== 1 ? 's' : ''}`}
              </p>
            </div>

            {results.claims.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <p className="text-gray-600">
                  No claims found matching your search. Try a different query or select a different workspace.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {results.count} {results.count === 1 ? 'result' : 'results'} for "{results.query}"
                  </h3>
                  {results.claims.map((claim, index) => (
                    <div
                      key={claim.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900">
                            #{index + 1}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(claim.status)}`}>
                            {claim.status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(claim.similarity * 100).toFixed(0)}% match
                          </span>
                        </div>
                        <Link
                          href={`/workspaces/${claim.workspace_id}/claims`}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          View in workspace →
                        </Link>
                      </div>
                      <p className="text-gray-900 text-base leading-relaxed">
                        {claim.claim_text}
                      </p>
                      <p className="text-xs text-gray-500 mt-3">
                        {new Date(claim.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>

                {results.contradictions.length > 0 && (
                  <div className="space-y-4 mt-8">
                    <h3 className="text-xl font-semibold text-gray-900">Contradictions</h3>
                    {results.contradictions.map((contradiction) => (
                      <div
                        key={contradiction.id}
                        className="bg-red-50 rounded-lg border border-red-200 p-6"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-red-600 font-semibold">⚠️ Contradiction Detected</span>
                          <span className="text-sm text-gray-600">
                            Confidence: {(contradiction.confidence_score * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="space-y-3">
                          <div className="bg-white rounded p-4">
                            <p className="text-sm text-gray-600 mb-1">Claim A:</p>
                            <p className="text-gray-900">{contradiction.claim_a.claim_text}</p>
                          </div>
                          <div className="bg-white rounded p-4">
                            <p className="text-sm text-gray-600 mb-1">Claim B:</p>
                            <p className="text-gray-900">{contradiction.claim_b.claim_text}</p>
                          </div>
                          {contradiction.explanation && (
                            <div className="bg-white rounded p-4">
                              <p className="text-sm text-gray-600 mb-1">Explanation:</p>
                              <p className="text-gray-700">{contradiction.explanation}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
