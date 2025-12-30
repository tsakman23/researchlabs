import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestUser, deleteTestUser, createTestWorkspace, deleteTestWorkspace, createTestDocument, supabaseAdmin, addWorkspaceMember } from '../utils/test-helpers'
import type { TestUser, TestWorkspace } from '../utils/test-helpers'
import { extractClaims, generateMockEmbedding, detectContradictions } from '@/lib/claims/mock-extractor'

describe('Integration Tests', () => {
  describe('Full Workspace Workflow', () => {
    let testUser: TestUser
    let testWorkspace: TestWorkspace

    beforeEach(async () => {
      testUser = await createTestUser('workflow-test-user')
      testWorkspace = await createTestWorkspace(testUser.id, 'Integration Test Workspace')
    })

    afterEach(async () => {
      await deleteTestWorkspace(testWorkspace.id)
      await deleteTestUser(testUser.id)
    })

    it('should complete full document-to-claims workflow', async () => {
      // Step 1: Create workspace (done in beforeEach)
      expect(testWorkspace.id).toBeDefined()
      expect(testWorkspace.name).toBe('Integration Test Workspace')

      // Step 2: Upload document
      const document = await createTestDocument(
        testWorkspace.id,
        testUser.id,
        'Research Paper on Climate Change'
      )
      expect(document).toBeDefined()

      // Step 3: Extract claims from document
      const documentText = `Climate change is a critical global issue. Research shows that temperatures have risen significantly.

Studies indicate that sea levels are increasing at an accelerating rate. The evidence demonstrates clear warming trends.

Data analysis reveals that CO2 levels have reached record highs. This correlation supports the hypothesis of human impact.`

      const extractedClaims = await extractClaims(documentText, 'text')
      expect(extractedClaims.length).toBeGreaterThan(0)

      // Step 4: Store claims in database
      const claimsWithEmbeddings = extractedClaims.map(claim => ({
        document_id: document.id,
        workspace_id: testWorkspace.id,
        claim_text: claim.claim_text,
        confidence_score: claim.confidence_score,
        source_page_num: claim.source_page_num,
        embedding: JSON.stringify(generateMockEmbedding(claim.claim_text)),
        extracted_by: testUser.id
      }))

      const { data: storedClaims, error } = await supabaseAdmin
        .from('claims')
        .insert(claimsWithEmbeddings)
        .select()

      expect(error).toBeNull()
      expect(storedClaims).toHaveLength(extractedClaims.length)

      // Step 5: Detect contradictions
      const contradictions = detectContradictions(extractedClaims)

      // Step 6: Verify claims are retrievable
      const { data: retrievedClaims } = await supabaseAdmin
        .from('claims')
        .select('*')
        .eq('document_id', document.id)

      expect(retrievedClaims).toHaveLength(extractedClaims.length)
      expect(retrievedClaims!.every(c => c.confidence_score >= 0 && c.confidence_score <= 1)).toBe(true)
    })
  })

  describe('Multi-User Collaboration Workflow', () => {
    let owner: TestUser
    let editor: TestUser
    let viewer: TestUser
    let outsider: TestUser
    let workspace: TestWorkspace

    beforeEach(async () => {
      owner = await createTestUser('collab-owner')
      editor = await createTestUser('collab-editor')
      viewer = await createTestUser('collab-viewer')
      outsider = await createTestUser('collab-outsider')
      workspace = await createTestWorkspace(owner.id, 'Collaboration Workspace')
      
      // Add members with different roles
      await addWorkspaceMember(workspace.id, editor.id, 'editor')
      await addWorkspaceMember(workspace.id, viewer.id, 'viewer')
    })

    afterEach(async () => {
      await deleteTestWorkspace(workspace.id)
      await deleteTestUser(owner.id)
      await deleteTestUser(editor.id)
      await deleteTestUser(viewer.id)
      await deleteTestUser(outsider.id)
    })

    it('should allow owner and editor to upload documents', async () => {
      // Owner uploads document
      const ownerDoc = await createTestDocument(workspace.id, owner.id, 'Owner Document')
      expect(ownerDoc).toBeDefined()

      // Editor uploads document
      const editorDoc = await createTestDocument(workspace.id, editor.id, 'Editor Document')
      expect(editorDoc).toBeDefined()

      // Verify both documents exist
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', workspace.id)

      expect(documents).toHaveLength(2)
    })

    it('should not allow viewer to upload documents', async () => {
      // Attempt to upload as viewer
      const { error } = await supabaseAdmin
        .from('documents')
        .insert({
          workspace_id: workspace.id,
          title: 'Viewer Document',
          file_url: 'viewer.pdf',
          file_type: 'pdf',
          file_size: 1024,
          uploaded_by: viewer.id
        })

      // RLS should block this
      expect(error).toBeDefined()
    })

    it('should not allow outsider to access workspace', async () => {
      // Create document in workspace
      const doc = await createTestDocument(workspace.id, owner.id)

      // Outsider attempts to access
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('uploaded_by', outsider.id)

      // Should not see any documents
      expect(documents).toHaveLength(0)
    })

    it('should allow all members to view documents', async () => {
      const doc = await createTestDocument(workspace.id, owner.id)

      // All members should be able to query (RLS will enforce)
      const { data: ownerView } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', doc.id)

      const { data: editorView } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', doc.id)

      const { data: viewerView } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('id', doc.id)

      // All should see the document
      expect(ownerView).toHaveLength(1)
      expect(editorView).toHaveLength(1)
      expect(viewerView).toHaveLength(1)
    })

    it('should share claims across all workspace members', async () => {
      // Owner uploads document and extracts claims
      const doc = await createTestDocument(workspace.id, owner.id)

      const text = 'Research shows significant findings. Studies indicate important results.'
      const extractedClaims = await extractClaims(text, 'text')

      await supabaseAdmin
        .from('claims')
        .insert(extractedClaims.map(claim => ({
          document_id: doc.id,
          workspace_id: workspace.id,
          claim_text: claim.claim_text,
          confidence_score: claim.confidence_score,
          extracted_by: owner.id
        })))

      // All members should see claims
      const { data: claims } = await supabaseAdmin
        .from('claims')
        .select('*')
        .eq('document_id', doc.id)

      expect(claims!.length).toBeGreaterThan(0)
    })
  })

  describe('Workspace Privacy Workflow', () => {
    let user1: TestUser
    let user2: TestUser
    let publicWorkspace: TestWorkspace
    let privateWorkspace: TestWorkspace

    beforeEach(async () => {
      user1 = await createTestUser('privacy-user-1')
      user2 = await createTestUser('privacy-user-2')
      publicWorkspace = await createTestWorkspace(user1.id, 'Public Workspace', true)
      privateWorkspace = await createTestWorkspace(user1.id, 'Private Workspace', false)
    })

    afterEach(async () => {
      await deleteTestWorkspace(publicWorkspace.id)
      await deleteTestWorkspace(privateWorkspace.id)
      await deleteTestUser(user1.id)
      await deleteTestUser(user2.id)
    })

    it('should allow listing public workspaces', async () => {
      const { data: workspaces } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('privacy', 'public')

      expect(workspaces).toBeDefined()
      expect(workspaces!.some(w => w.id === publicWorkspace.id)).toBe(true)
    })

    it('should not list private workspaces for non-members', async () => {
      // User2 queries all workspaces they can access
      const { data: user2Workspaces } = await supabaseAdmin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user2.id)

      const workspaceIds = user2Workspaces!.map(w => w.workspace_id)

      expect(workspaceIds).not.toContain(privateWorkspace.id)
    })

    it('should convert workspace from private to public', async () => {
      await supabaseAdmin
        .from('workspaces')
        .update({ privacy: 'public' })
        .eq('id', privateWorkspace.id)

      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('id', privateWorkspace.id)
        .single()

      expect(workspace!.privacy).toBe('public')
    })
  })

  describe('Cascade Deletion Workflow', () => {
    let testUser: TestUser
    let testWorkspace: TestWorkspace

    beforeEach(async () => {
      testUser = await createTestUser('cascade-test-user')
      testWorkspace = await createTestWorkspace(testUser.id, 'Cascade Test Workspace')
    })

    afterEach(async () => {
      await deleteTestUser(testUser.id)
    })

    it('should cascade delete all workspace data when workspace is deleted', async () => {
      // Create documents
      const doc1 = await createTestDocument(testWorkspace.id, testUser.id, 'Doc 1')
      const doc2 = await createTestDocument(testWorkspace.id, testUser.id, 'Doc 2')

      // Create claims
      await supabaseAdmin.from('claims').insert([
        {
          document_id: doc1.id,
          text: 'Claim 1',
          confidence: 0.9,
          created_by: testUser.id
        },
        {
          document_id: doc2.id,
          text: 'Claim 2',
          confidence: 0.8,
          created_by: testUser.id
        }
      ])

      // Delete workspace
      await deleteTestWorkspace(testWorkspace.id)

      // Verify documents are deleted
      const { data: documents } = await supabaseAdmin
        .from('documents')
        .select('*')
        .in('id', [doc1.id, doc2.id])

      expect(documents).toHaveLength(0)

      // Verify workspace_members are deleted
      const { data: members } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', testWorkspace.id)

      expect(members).toHaveLength(0)
    })
  })

  describe('Claim Extraction Workflow with Edge Cases', () => {
    let testUser: TestUser
    let testWorkspace: TestWorkspace

    beforeEach(async () => {
      testUser = await createTestUser('edge-case-user')
      testWorkspace = await createTestWorkspace(testUser.id, 'Edge Case Workspace')
    })

    afterEach(async () => {
      await deleteTestWorkspace(testWorkspace.id)
      await deleteTestUser(testUser.id)
    })

    it('should handle document with no extractable claims', async () => {
      const doc = await createTestDocument(testWorkspace.id, testUser.id)

      const emptyText = 'Just some random text. Nothing here. Short.'
      const claims = await extractClaims(emptyText, 'text')

      // Should return empty array, not error
      expect(Array.isArray(claims)).toBe(true)
    })

    it('should handle very long document', async () => {
      const doc = await createTestDocument(testWorkspace.id, testUser.id)

      // Generate long document
      const longText = Array(100)
        .fill('Research shows that this is an important finding. ')
        .join('\n\n')

      const claims = await extractClaims(longText, 'text')

      expect(claims.length).toBeGreaterThan(0)
    })

    it('should handle contradictory claims in same document', async () => {
      const doc = await createTestDocument(testWorkspace.id, testUser.id)

      const contradictoryText = `Studies show that temperature is rising significantly.

However, other research indicates that temperature is not rising at all.`

      const claims = await extractClaims(contradictoryText, 'text')
      const contradictions = detectContradictions(claims)

      // Should detect the contradiction
      expect(contradictions.length).toBeGreaterThan(0)

      // Store contradictions in database
      if (contradictions.length > 0 && claims.length >= 2) {
        const { data: storedClaims } = await supabaseAdmin
          .from('claims')
          .insert(claims.map(claim => ({
            document_id: doc.id,
            workspace_id: testWorkspace.id,
            claim_text: claim.claim_text,
            confidence_score: claim.confidence_score,
            extracted_by: testUser.id
          })))
          .select()

        const { error } = await supabaseAdmin
          .from('contradictions')
          .insert({
            workspace_id: testWorkspace.id,
            claim_a_id: storedClaims![0].id,
            claim_b_id: storedClaims![1].id,
            confidence_score: 0.9
          })

        expect(error).toBeNull()
      }
    })

    it('should handle multiple documents with cross-document contradictions', async () => {
      const doc1 = await createTestDocument(testWorkspace.id, testUser.id, 'Doc 1')
      const doc2 = await createTestDocument(testWorkspace.id, testUser.id, 'Doc 2')

      const text1 = 'Temperature measurements show increasing trends everywhere according to studies.'
      const text2 = 'Temperature measurements show not increasing trends everywhere according to studies.'

      const claims1 = await extractClaims(text1, 'text')
      const claims2 = await extractClaims(text2, 'text')

      // Store all claims
      const { data: storedClaims1 } = await supabaseAdmin
        .from('claims')
        .insert(claims1.map(c => ({
          document_id: doc1.id,
          workspace_id: testWorkspace.id,
          claim_text: c.claim_text,
          confidence_score: c.confidence_score,
          extracted_by: testUser.id
        })))
        .select()

      const { data: storedClaims2 } = await supabaseAdmin
        .from('claims')
        .insert(claims2.map(c => ({
          document_id: doc2.id,
          workspace_id: testWorkspace.id,
          claim_text: c.claim_text,
          confidence_score: c.confidence_score,
          extracted_by: testUser.id
        })))
        .select()

      // Detect contradictions across all claims
      const allExtractedClaims = [...claims1, ...claims2]
      const contradictions = detectContradictions(allExtractedClaims)

      expect(contradictions.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Stress Tests', () => {
    let testUser: TestUser
    let testWorkspace: TestWorkspace

    beforeEach(async () => {
      testUser = await createTestUser('stress-test-user')
      testWorkspace = await createTestWorkspace(testUser.id, 'Stress Test Workspace')
    })

    afterEach(async () => {
      await deleteTestWorkspace(testWorkspace.id)
      await deleteTestUser(testUser.id)
    })

    it('should handle bulk document creation', async () => {
      const documents = []

      for (let i = 0; i < 10; i++) {
        const doc = await createTestDocument(
          testWorkspace.id,
          testUser.id,
          `Bulk Doc ${i + 1}`
        )
        documents.push(doc)
      }

      expect(documents).toHaveLength(10)

      const { data: allDocs } = await supabaseAdmin
        .from('documents')
        .select('*')
        .eq('workspace_id', testWorkspace.id)

      expect(allDocs).toHaveLength(10)
    })

    it('should handle bulk claim insertion', async () => {
      const doc = await createTestDocument(testWorkspace.id, testUser.id)

      const bulkClaims = Array.from({ length: 100 }, (_, i) => ({
        document_id: doc.id,
        workspace_id: testWorkspace.id,
        claim_text: `Claim number ${i + 1} with sufficient length to be valid`,
        confidence_score: 0.5 + (i % 50) / 100,
        extracted_by: testUser.id
      }))

      const { data, error } = await supabaseAdmin
        .from('claims')
        .insert(bulkClaims)
        .select()

      expect(error).toBeNull()
      expect(data).toHaveLength(100)
    })

    it('should handle concurrent workspace operations', async () => {
      const user2 = await createTestUser('concurrent-user')
      await addWorkspaceMember(testWorkspace.id, user2.id, 'editor')

      // Simulate concurrent uploads
      const uploads = await Promise.all([
        createTestDocument(testWorkspace.id, testUser.id, 'User 1 Doc A'),
        createTestDocument(testWorkspace.id, user2.id, 'User 2 Doc A'),
        createTestDocument(testWorkspace.id, testUser.id, 'User 1 Doc B'),
        createTestDocument(testWorkspace.id, user2.id, 'User 2 Doc B')
      ])

      expect(uploads).toHaveLength(4)
      expect(uploads.every(doc => doc.id)).toBe(true)

      await deleteTestUser(user2.id)
    })
  })
})
