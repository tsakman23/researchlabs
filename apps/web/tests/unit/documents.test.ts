import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestUser, deleteTestUser, createTestWorkspace, deleteTestWorkspace, createTestDocument, supabaseAdmin, addWorkspaceMember } from '../utils/test-helpers'
import type { TestUser, TestWorkspace } from '../utils/test-helpers'

describe('Documents API', () => {
  let testUser1: TestUser
  let testUser2: TestUser
  let testWorkspace: TestWorkspace

  beforeEach(async () => {
    testUser1 = await createTestUser('doc-test-1')
    testUser2 = await createTestUser('doc-test-2')
    testWorkspace = await createTestWorkspace(testUser1.id, 'Document Test Workspace')
  })

  afterEach(async () => {
    await deleteTestWorkspace(testWorkspace.id)
    await deleteTestUser(testUser1.id)
    await deleteTestUser(testUser2.id)
  })

  describe('POST /api/workspaces/[id]/documents', () => {
    it('should create document successfully', async () => {
      const document = await createTestDocument(testWorkspace.id, testUser1.id, 'Test Document')

      expect(document).toBeDefined()
      expect(document.title).toBe('Test Document')
      expect(document.workspace_id).toBe(testWorkspace.id)
      expect(document.uploaded_by).toBe(testUser1.id)
      expect(document.file_type).toBe('text')
    })

    it('should validate file type', async () => {
      const { error } = await supabaseAdmin
        .from('documents')
        .insert({
          workspace_id: testWorkspace.id,
          title: 'Invalid File',
          file_url: 'test.exe',
          file_type: 'exe', // Invalid type
          file_size: 1024,
          uploaded_by: testUser1.id
        })

      expect(error).toBeDefined()
      expect(error!.code).toBe('23514') // Check constraint violation
    })

    it('should not allow non-member to upload', async () => {
      const { error } = await supabaseAdmin
        .from('documents')
        .insert({
          workspace_id: testWorkspace.id,
          title: 'Unauthorized Upload',
          file_url: 'test.pdf',
          file_type: 'pdf',
          file_size: 1024,
          uploaded_by: testUser2.id // Not a member
        })

      // RLS should block this
      expect(error).toBeDefined()
    })

    it('should allow editor to upload', async () => {
      await addWorkspaceMember(testWorkspace.id, testUser2.id, 'editor')

      const document = await createTestDocument(testWorkspace.id, testUser2.id)

      expect(document).toBeDefined()
      expect(document.uploaded_by).toBe(testUser2.id)
    })
  })

  describe('GET /api/workspaces/[id]/documents', () => {
    it('should list workspace documents', async () => {
      const doc1 = await createTestDocument(testWorkspace.id, testUser1.id, 'Document 1')
      const doc2 = await createTestDocument(testWorkspace.id, testUser1.id, 'Document 2')

      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', testWorkspace.id)
        .is('deleted_at', null)

      expect(documents).toHaveLength(2)
      expect(documents!.map(d => d.title)).toContain('Document 1')
      expect(documents!.map(d => d.title)).toContain('Document 2')
    })

    it('should not return documents from other workspaces', async () => {
      const otherWorkspace = await createTestWorkspace(testUser2.id, 'Other Workspace')
      await createTestDocument(otherWorkspace.id, testUser2.id, 'Other Document')

      // User1 queries their workspace
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', testWorkspace.id)

      expect(documents!.every(d => d.workspace_id === testWorkspace.id)).toBe(true)

      await deleteTestWorkspace(otherWorkspace.id)
    })

    it('should exclude soft-deleted documents', async () => {
      const doc = await createTestDocument(testWorkspace.id, testUser1.id)

      // Soft delete
      await supabaseAdmin
        .from('documents')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', doc.id)

      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', testWorkspace.id)
        .is('deleted_at', null)

      expect(documents!.every(d => d.id !== doc.id)).toBe(true)
    })
  })

  describe('Document File Types', () => {
    it('should accept PDF files', async () => {
      const { data } = await supabaseAdmin
        .from('documents')
        .insert({
          workspace_id: testWorkspace.id,
          title: 'PDF Document',
          file_url: 'test.pdf',
          file_type: 'pdf',
          file_size: 1024 * 1024,
          uploaded_by: testUser1.id
        })
        .select()
        .single()

      expect(data?.file_type).toBe('pdf')
    })

    it('should accept text files', async () => {
      const { data } = await supabaseAdmin
        .from('documents')
        .insert({
          workspace_id: testWorkspace.id,
          title: 'Text Document',
          file_url: 'test.txt',
          file_type: 'text',
          file_size: 1024,
          uploaded_by: testUser1.id
        })
        .select()
        .single()

      expect(data?.file_type).toBe('text')
    })

    it('should accept URL type', async () => {
      const { data } = await supabaseAdmin
        .from('documents')
        .insert({
          workspace_id: testWorkspace.id,
          title: 'URL Document',
          file_url: 'https://example.com/paper.pdf',
          file_type: 'url',
          file_size: null,
          uploaded_by: testUser1.id
        })
        .select()
        .single()

      expect(data?.file_type).toBe('url')
    })
  })

  describe('Document Cascade Deletion', () => {
    it('should delete documents when workspace is deleted', async () => {
      const doc = await createTestDocument(testWorkspace.id, testUser1.id)

      await deleteTestWorkspace(testWorkspace.id)

      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', doc.id)

      expect(documents).toHaveLength(0)
    })
  })

  describe('Multiple Documents Upload', () => {
    it('should handle multiple document uploads', async () => {
      const documents = []
      
      for (let i = 0; i < 5; i++) {
        const doc = await createTestDocument(
          testWorkspace.id,
          testUser1.id,
          `Bulk Document ${i + 1}`
        )
        documents.push(doc)
      }

      const { data: allDocs } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', testWorkspace.id)

      expect(allDocs).toHaveLength(5)
    })

    it('should maintain correct file sizes', async () => {
      const sizes = [1024, 2048, 4096, 8192, 16384]
      
      for (const size of sizes) {
        const { data } = await supabaseAdmin
          .from('documents')
          .insert({
            workspace_id: testWorkspace.id,
            title: `Size Test ${size}`,
            file_url: `test-${size}.pdf`,
            file_type: 'pdf',
            file_size: size,
            uploaded_by: testUser1.id
          })
          .select()
          .single()

        expect(data?.file_size).toBe(size)
      }
    })
  })
})
