'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Document } from '@researchlabs/types'

export default function WorkspaceDocumentsPage() {
  const router = useRouter()
  const params = useParams()
  const workspaceId = params.id as string

  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  })
  const [dragActive, setDragActive] = useState(false)

  useEffect(() => {
    loadDocuments()
  }, [workspaceId])

  async function loadDocuments() {
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/documents`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Failed to load documents:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleFileSelect(file: File) {
    setSelectedFile(file)
    if (!formData.title) {
      // Auto-populate title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      setFormData({ ...formData, title: nameWithoutExt })
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const uploadData = new FormData()
      uploadData.append('file', selectedFile)
      uploadData.append('title', formData.title.trim())
      if (formData.description) {
        uploadData.append('description', formData.description.trim())
      }

      // Simulate progress (real progress tracking would require streaming APIs)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch(`/api/workspaces/${workspaceId}/documents`, {
        method: 'POST',
        body: uploadData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (response.ok) {
        const data = await response.json()
        setDocuments([data.document, ...documents])
        setSelectedFile(null)
        setFormData({ title: '', description: '' })
        setShowUploadForm(false)
        setUploadProgress(0)
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to upload document')
        setUploadProgress(0)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload document')
      setUploadProgress(0)
    } finally {
      setUploading(false)
    }
  }

  function formatFileSize(bytes: number | null): string {
    if (!bytes) return 'Unknown size'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function getFileIcon(fileType: string) {
    switch (fileType) {
      case 'pdf':
        return '📄'
      case 'text':
        return '📝'
      default:
        return '📎'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <p>Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push(`/workspaces/${workspaceId}`)}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Workspace
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
            <p className="text-gray-600 mt-1">{documents.length} document{documents.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showUploadForm ? 'Cancel' : 'Upload Document'}
          </button>
        </div>

        {showUploadForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Document</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center ${
                  dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {selectedFile ? (
                  <div>
                    <p className="text-2xl mb-2">{getFileIcon(selectedFile.type === 'application/pdf' ? 'pdf' : 'text')}</p>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="mt-2 text-sm text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">Drag and drop a file here, or</p>
                    <label className="cursor-pointer text-blue-600 hover:text-blue-800">
                      <span>choose a file</span>
                      <input
                        type="file"
                        accept=".pdf,.txt,.docx"
                        onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">PDF, TXT, or DOCX (max 50MB)</p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title *
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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

              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 text-center">Uploading... {uploadProgress}%</p>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {uploading ? 'Uploading...' : 'Upload Document'}
              </button>
            </form>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <p className="text-gray-600 mb-4">No documents yet.</p>
            <button
              onClick={() => setShowUploadForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Upload Your First Document
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="text-4xl">{getFileIcon(doc.file_type)}</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                    {doc.description && (
                      <p className="text-gray-600 text-sm mt-1">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{formatFileSize(doc.file_size)}</span>
                      <span>•</span>
                      <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button
                    className="px-4 py-2 text-blue-600 hover:text-blue-800 font-medium"
                    onClick={() => {
                      // Download functionality will be added later
                      alert('Download functionality coming soon')
                    }}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
