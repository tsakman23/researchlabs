'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Workspace } from '@researchlabs/types'

export default function WorkspacesPage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'private' as 'public' | 'private'
  })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadWorkspaces()
  }, [])

  async function loadWorkspaces() {
    try {
      const response = await fetch('/api/workspaces')
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data.workspaces)
      }
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateWorkspace(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspaces([data.workspace, ...workspaces])
        setFormData({ name: '', description: '', privacy: 'private' })
        setShowCreateForm(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create workspace')
      }
    } catch (error) {
      alert('Failed to create workspace')
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          <p className="text-gray-300">Loading workspaces...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Workspaces</h1>
            <p className="text-gray-300 mt-1">Manage your research workspaces</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-gray-300 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700"
            >
              Dashboard
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showCreateForm ? 'Cancel' : 'Create Workspace'}
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4 text-white">Create New Workspace</h2>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white placeholder:text-gray-400"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white placeholder:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="privacy" className="block text-sm font-medium text-gray-300">
                  Privacy
                </label>
                <select
                  id="privacy"
                  value={formData.privacy}
                  onChange={(e) => setFormData({ ...formData, privacy: e.target.value as 'public' | 'private' })}
                  className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-white"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={creating}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
              >
                {creating ? 'Creating...' : 'Create Workspace'}
              </button>
            </form>
          </div>
        )}

        {workspaces.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-300 mb-4">You don't have any workspaces yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Your First Workspace
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => router.push(`/workspaces/${workspace.id}`)}
                className="bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg cursor-pointer transition-shadow border border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">{workspace.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded ${
                    workspace.privacy === 'public' 
                      ? 'bg-green-900 text-green-300' 
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {workspace.privacy}
                  </span>
                </div>
                {workspace.description && (
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">
                    {workspace.description}
                  </p>
                )}
                <p className="text-xs text-gray-400">
                  Created {new Date(workspace.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
