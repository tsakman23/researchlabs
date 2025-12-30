'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Claim, Document } from '@researchlabs/types'

interface ClaimWithDocument extends Claim {
  documents?: {
    id: number
    title: string
  }
}

type StatusFilter = 'all' | 'extracted' | 'verified' | 'disputed' | 'needs_review'

export default function WorkspaceClaimsPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [claims, setClaims] = useState<ClaimWithDocument[]>([])
  const [filteredClaims, setFilteredClaims] = useState<ClaimWithDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<number>(0)

  useEffect(() => {
    loadClaims()
  }, [workspaceId])

  useEffect(() => {
    filterClaims()
  }, [claims, statusFilter, confidenceFilter])

  async function loadClaims() {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/claims`)
      if (response.ok) {
        const data = await response.json()
        setClaims(data.claims)
      }
    } catch (error) {
      console.error('Failed to load claims:', error)
    } finally {
      setLoading(false)
    }
  }

  function filterClaims() {
    let filtered = claims

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(claim => claim.status === statusFilter)
    }

    // Filter by confidence
    if (confidenceFilter > 0) {
      filtered = filtered.filter(claim => claim.confidence_score >= confidenceFilter)
    }

    setFilteredClaims(filtered)
  }

  async function handleStatusChange(claimId: number, newStatus: string) {
    try {
      const response = await fetch(`/api/claims/${claimId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setClaims(claims.map(claim => 
          claim.id === claimId ? { ...claim, status: newStatus as any } : claim
        ))
      } else {
        alert('Failed to update claim status')
      }
    } catch (error) {
      alert('Failed to update claim status')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p>Loading claims...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Claims</h1>
            <p className="text-gray-600 mt-1">
              {filteredClaims.length} claim{filteredClaims.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/workspaces/${workspaceId}`)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Workspace
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
              >
                <option value="all">All</option>
                <option value="extracted">Extracted</option>
                <option value="verified">Verified</option>
                <option value="disputed">Disputed</option>
                <option value="needs_review">Needs Review</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Confidence: {confidenceFilter.toFixed(1)}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={confidenceFilter}
                onChange={(e) => setConfidenceFilter(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Claims List */}
        {filteredClaims.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600">No claims found matching your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClaims.map((claim) => (
              <div
                key={claim.id}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        claim.status === 'verified' ? 'bg-green-100 text-green-800' :
                        claim.status === 'disputed' ? 'bg-red-100 text-red-800' :
                        claim.status === 'needs_review' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {claim.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        Confidence: {(claim.confidence_score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-gray-900 text-lg mb-2">{claim.claim_text}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {claim.documents && (
                        <span>Source: {claim.documents.title}</span>
                      )}
                      {claim.source_paragraph_num && (
                        <span>Paragraph {claim.source_paragraph_num}</span>
                      )}
                      {claim.source_page_num && (
                        <span>Page {claim.source_page_num}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={claim.status}
                      onChange={(e) => handleStatusChange(claim.id, e.target.value)}
                      className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-900"
                    >
                      <option value="extracted">Extracted</option>
                      <option value="verified">Verified</option>
                      <option value="disputed">Disputed</option>
                      <option value="needs_review">Needs Review</option>
                    </select>
                    <button
                      onClick={() => router.push(`/workspaces/${workspaceId}/claims/${claim.id}`)}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
