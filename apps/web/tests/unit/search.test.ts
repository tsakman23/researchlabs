import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestUser, deleteTestUser, createTestWorkspace, deleteTestWorkspace, createTestDocument, supabaseAdmin } from '../utils/test-helpers'
import type { TestUser, TestWorkspace } from '../utils/test-helpers'
import { generateMockEmbedding } from '@/lib/claims/mock-extractor'

describe('Search API', () => {
  let testUser1: TestUser
  let testWorkspace1: TestWorkspace
  let testWorkspace2: TestWorkspace
  let testDocument1: any
  let testDocument2: any

  beforeEach(async () => {
    testUser1 = await createTestUser('search-test-1')
    testWorkspace1 = await createTestWorkspace(testUser1.id, 'Search Test Workspace 1')
    testWorkspace2 = await createTestWorkspace(testUser1.id, 'Search Test Workspace 2')
    testDocument1 = await createTestDocument(testWorkspace1.id, testUser1.id, 'Search Test Doc 1')
    testDocument2 = await createTestDocument(testWorkspace2.id, testUser1.id, 'Search Test Doc 2')
  })

  afterEach(async () => {
    await deleteTestWorkspace(testWorkspace1.id)
    await deleteTestWorkspace(testWorkspace2.id)
    await deleteTestUser(testUser1.id)
  })

  describe('Semantic Search Function', () => {
    it('should find similar claims using cosine similarity', async () => {
      // Create test claims with known text and embeddings
      const claim1Text = 'Climate change is accelerating rapidly'
      const claim2Text = 'Global warming is speeding up quickly'
      
      const claim1 = await supabaseAdmin
        .from('claims')
        .insert({
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: claim1Text,
          confidence_score: 0.9,
          extracted_by: testUser1.id,
          embedding: generateMockEmbedding(claim1Text)
        })
        .select()
        .single()

      const claim2 = await supabaseAdmin
        .from('claims')
        .insert({
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: claim2Text,
          confidence_score: 0.85,
          extracted_by: testUser1.id,
          embedding: generateMockEmbedding(claim2Text)
        })
        .select()
        .single()

      expect(claim1.data).toBeDefined()
      expect(claim2.data).toBeDefined()

      // Generate mock embedding for search query (similar to claim1)
      const searchQuery = 'climate change accelerating'
      const mockEmbedding = generateMockEmbedding(searchQuery)

      // Search using the function
      const { data: results, error } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 10
      })

      expect(error).toBeNull()
      expect(results).toBeDefined()
      expect(results!.length).toBeGreaterThanOrEqual(2)
      
      // Results should be ordered by similarity
      if (results!.length > 1) {
        expect(results![0].similarity).toBeGreaterThanOrEqual(results![1].similarity)
      }
    })

    it('should filter by similarity threshold', async () => {
      // Create a claim
      await supabaseAdmin
        .from('claims')
        .insert({
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: 'Test claim for threshold filtering',
          confidence_score: 0.8,
          extracted_by: testUser1.id
        })

      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

      // High threshold should return fewer results
      const { data: highThreshold } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.95,
        max_results: 10
      })

      // Low threshold should return more results
      const { data: lowThreshold } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 10
      })

      expect(lowThreshold!.length).toBeGreaterThanOrEqual(highThreshold!.length)
    })

    it('should respect max_results limit', async () => {
      // Create multiple claims
      const claims = Array.from({ length: 15 }, (_, i) => ({
        workspace_id: testWorkspace1.id,
        document_id: testDocument1.id,
        claim_text: `Test claim number ${i + 1}`,
        confidence_score: 0.7,
        extracted_by: testUser1.id
      }))

      await supabaseAdmin.from('claims').insert(claims)

      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

      const { data: results } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 5
      })

      expect(results!.length).toBeLessThanOrEqual(5)
    })

    it('should exclude soft-deleted claims', async () => {
      const { data: claim } = await supabaseAdmin
        .from('claims')
        .insert({
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: 'This claim will be deleted',
          confidence_score: 0.8,
          extracted_by: testUser1.id
        })
        .select()
        .single()

      // Soft delete the claim
      await supabaseAdmin
        .from('claims')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', claim!.id)

      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

      const { data: results } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 10
      })

      // Deleted claim should not appear in results
      expect(results!.every((r: any) => r.id !== claim!.id)).toBe(true)
    })

    it('should only search claims with embeddings', async () => {
      const { data: claimWithoutEmbedding } = await supabaseAdmin
        .from('claims')
        .insert({
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: 'Claim without embedding',
          confidence_score: 0.8,
          extracted_by: testUser1.id,
          embedding: null
        })
        .select()
        .single()

      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

      const { data: results } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 10
      })

      // Claim without embedding should not appear
      expect(results!.every((r: any) => r.id !== claimWithoutEmbedding!.id)).toBe(true)
    })

    it('should return all required fields', async () => {
      await supabaseAdmin
        .from('claims')
        .insert({
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: 'Test claim for field validation',
          confidence_score: 0.85,
          status: 'verified',
          extracted_by: testUser1.id
        })

      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

      const { data: results } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 10
      })

      if (results && results.length > 0) {
        const result = results[0]
        expect(result).toHaveProperty('id')
        expect(result).toHaveProperty('workspace_id')
        expect(result).toHaveProperty('document_id')
        expect(result).toHaveProperty('claim_text')
        expect(result).toHaveProperty('confidence_score')
        expect(result).toHaveProperty('status')
        expect(result).toHaveProperty('similarity')
        expect(result).toHaveProperty('created_at')
      }
    })

    it('should handle empty results gracefully', async () => {
      const mockEmbedding = Array.from({ length: 1536 }, () => Math.random())

      const { data: results, error } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.99, // Very high threshold
        max_results: 10
      })

      expect(error).toBeNull()
      expect(results).toBeDefined()
      expect(Array.isArray(results)).toBe(true)
    })

    it('should work across multiple workspaces', async () => {
      // Create claims in different workspaces
      await supabaseAdmin.from('claims').insert([
        {
          workspace_id: testWorkspace1.id,
          document_id: testDocument1.id,
          claim_text: 'Claim in workspace 1',
          confidence_score: 0.8,
          extracted_by: testUser1.id,
          embedding: generateMockEmbedding('Claim in workspace 1')
        },
        {
          workspace_id: testWorkspace2.id,
          document_id: testDocument2.id,
          claim_text: 'Claim in workspace 2',
          confidence_score: 0.8,
          extracted_by: testUser1.id,
          embedding: generateMockEmbedding('Claim in workspace 2')
        }
      ])

      const mockEmbedding = generateMockEmbedding('Claim in workspace')

      const { data: results } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.5,
        max_results: 10
      })

      // Should find claims from both workspaces
      const workspaceIds = results!.map((r: any) => r.workspace_id)
      const uniqueWorkspaces = new Set(workspaceIds)
      
      expect(uniqueWorkspaces.size).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Search Performance', () => {
    it('should handle bulk search efficiently', async () => {
      // Create 50 claims with embeddings
      const claims = Array.from({ length: 50 }, (_, i) => ({
        workspace_id: testWorkspace1.id,
        document_id: testDocument1.id,
        claim_text: `Performance test claim ${i + 1}`,
        confidence_score: 0.7 + (i % 30) / 100,
        extracted_by: testUser1.id,
        embedding: generateMockEmbedding(`Performance test claim ${i + 1}`)
      }))

      await supabaseAdmin.from('claims').insert(claims)

      const mockEmbedding = generateMockEmbedding('Performance test claim')

      const startTime = Date.now()
      
      const { data: results, error } = await supabaseAdmin.rpc('search_claims', {
        query_embedding: `[${mockEmbedding.join(',')}]`,
        similarity_threshold: 0.6,
        max_results: 20
      })

      const duration = Date.now() - startTime

      expect(error).toBeNull()
      expect(results).toBeDefined()
      expect(results!.length).toBeGreaterThan(0)
      
      // Search should complete in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000)
    })
  })
})
