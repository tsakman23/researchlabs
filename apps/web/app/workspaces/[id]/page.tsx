'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Workspace, WorkspaceMember } from '@researchlabs/types'

interface WorkspaceWithMembers extends Workspace {
  workspace_members: Array<WorkspaceMember & {
    users: {
      id: string
      email: string
      display_name: string | null
    }
  }>
}

export default function WorkspaceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [workspace, setWorkspace] = useState<WorkspaceWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    privacy: 'private' as 'public' | 'private'
  })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadWorkspace()
  }, [workspaceId])

  async function loadWorkspace() {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`)
      if (response.ok) {
        const data = await response.json()
        setWorkspace(data.workspace)
        setFormData({
          name: data.workspace.name,
          description: data.workspace.description || '',
          privacy: data.workspace.privacy
        })
      } else if (response.status === 404) {
        alert('Workspace not found')
        router.push('/workspaces')
      }
    } catch (error) {
      console.error('Failed to load workspace:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setWorkspace({ ...workspace!, ...data.workspace })
        setEditing(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to update workspace')
      }
    } catch (error) {
      alert('Failed to update workspace')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
      return
    }

    setDeleting(true)

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/workspaces')
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to delete workspace')
      }
    } catch (error) {
      alert('Failed to delete workspace')
    } finally {
      setDeleting(false)
    }
  }

  function cancelEdit() {
    setEditing(false)
    setFormData({
      name: workspace?.name || '',
      description: workspace?.description || '',
      privacy: workspace?.privacy || 'private'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p>Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <p>Workspace not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push('/workspaces')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Workspaces
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {editing ? (
            <form onSubmit={handleUpdate} className="space-y-4">
              <h2 className="text-2xl font-bold mb-4">Edit Workspace</h2>
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="privacy" className="block text-sm font-medium text-gray-700">
                  Privacy
                </label>
                <select
                  id="privacy"
                  value={formData.privacy}
                  onChange={(e) => setFormData({ ...formData, privacy: e.target.value as 'public' | 'private' })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold text-gray-900">{workspace.name}</h1>
                    <span className={`px-2 py-1 text-xs rounded ${
                      workspace.privacy === 'public' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {workspace.privacy}
                    </span>
                  </div>
                  {workspace.description && (
                    <p className="text-gray-600">{workspace.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    Created {new Date(workspace.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300"
                  >
                    {deleting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Members ({workspace.workspace_members.length})</h2>
          <div className="space-y-3">
            {workspace.workspace_members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">
                    {member.users.display_name || member.users.email}
                  </p>
                  <p className="text-sm text-gray-500">{member.users.email}</p>
                </div>
                <span className={`px-3 py-1 text-sm rounded ${
                  member.role === 'owner' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => router.push(`/workspaces/${workspaceId}/documents`)}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="text-2xl mb-2">📄</div>
              <div className="font-semibold text-gray-900">Documents</div>
              <div className="text-sm text-gray-600">View and upload research documents</div>
            </button>
            <button
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left opacity-50 cursor-not-allowed"
              disabled
            >
              <div className="text-2xl mb-2">💬</div>
              <div className="font-semibold text-gray-900">Chat</div>
              <div className="text-sm text-gray-600">Coming soon...</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
