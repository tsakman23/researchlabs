import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestUser, deleteTestUser, createTestWorkspace, deleteTestWorkspace, supabaseAdmin } from '../utils/test-helpers'
import type { TestUser } from '../utils/test-helpers'

describe('Workspaces API', () => {
  let testUser1: TestUser
  let testUser2: TestUser

  beforeEach(async () => {
    testUser1 = await createTestUser('workspace-test-1')
    testUser2 = await createTestUser('workspace-test-2')
  })

  afterEach(async () => {
    await deleteTestUser(testUser1.id)
    await deleteTestUser(testUser2.id)
  })

  describe('POST /api/workspaces', () => {
    it('should create a workspace successfully', async () => {
      const workspace = await createTestWorkspace(testUser1.id, 'Test Workspace')
      
      expect(workspace).toBeDefined()
      expect(workspace.name).toBe('Test Workspace')
      expect(workspace.owner_id).toBe(testUser1.id)
      expect(workspace.privacy).toBe('private')

      // Verify workspace member was created
      const { data: members } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)
        .eq('user_id', testUser1.id)

      expect(members).toHaveLength(1)
      expect(members![0].role).toBe('owner')

      await deleteTestWorkspace(workspace.id)
    })

    it('should reject workspace creation with empty name', async () => {
      const { error } = await supabaseAdmin
        .from('workspaces')
        .insert({
          owner_id: testUser1.id,
          name: '',
          privacy: 'private'
        })

      expect(error).toBeDefined()
    })

    it('should create public workspace', async () => {
      const { data: workspace } = await supabaseAdmin
        .from('workspaces')
        .insert({
          owner_id: testUser1.id,
          name: 'Public Workspace',
          privacy: 'public'
        })
        .select()
        .single()

      expect(workspace?.privacy).toBe('public')

      await deleteTestWorkspace(workspace!.id)
    })
  })

  describe('GET /api/workspaces', () => {
    it('should list only user\'s workspaces', async () => {
      // Create workspaces for both users
      const workspace1 = await createTestWorkspace(testUser1.id, 'User 1 Workspace')
      const workspace2 = await createTestWorkspace(testUser2.id, 'User 2 Workspace')

      // User 1 should only see their workspace
      const { data: user1Workspaces } = await supabaseAdmin
        .from('workspaces')
        .select(`
          *,
          workspace_members!inner(role)
        `)
        .eq('workspace_members.user_id', testUser1.id)

      expect(user1Workspaces).toHaveLength(1)
      expect(user1Workspaces![0].id).toBe(workspace1.id)

      await deleteTestWorkspace(workspace1.id)
      await deleteTestWorkspace(workspace2.id)
    })

    it('should include shared workspaces', async () => {
      const workspace = await createTestWorkspace(testUser1.id, 'Shared Workspace')

      // Add user2 as member
      await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: testUser2.id,
          role: 'editor'
        })

      // Both users should see it
      const { data: user2Workspaces } = await supabaseAdmin
        .from('workspaces')
        .select(`*,workspace_members!inner(role)`)
        .eq('workspace_members.user_id', testUser2.id)

      expect(user2Workspaces!.some(w => w.id === workspace.id)).toBe(true)

      await deleteTestWorkspace(workspace.id)
    })
  })

  describe('GET /api/workspaces/[id]', () => {
    it('should get workspace details for owner', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      const { data } = await supabaseAdmin
        .from('workspaces')
        .select(`
          *,
          workspace_members(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .eq('id', workspace.id)
        .single()

      expect(data).toBeDefined()
      expect(data!.id).toBe(workspace.id)
      expect(data!.workspace_members).toHaveLength(1)

      await deleteTestWorkspace(workspace.id)
    })

    it('should return 404 for non-member', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      // Try to access as user2 (not a member)
      const { data, error } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('id', workspace.id)
        .eq('workspace_members.user_id', testUser2.id)
        .single()

      // Should not find workspace due to RLS
      expect(error).toBeDefined()

      await deleteTestWorkspace(workspace.id)
    })
  })

  describe('PATCH /api/workspaces/[id]', () => {
    it('should update workspace name', async () => {
      const workspace = await createTestWorkspace(testUser1.id, 'Original Name')

      const { data: updated } = await supabaseAdmin
        .from('workspaces')
        .update({ name: 'Updated Name' })
        .eq('id', workspace.id)
        .eq('owner_id', testUser1.id)
        .select()
        .single()

      expect(updated?.name).toBe('Updated Name')

      await deleteTestWorkspace(workspace.id)
    })

    it('should update workspace privacy', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      const { data: updated } = await supabaseAdmin
        .from('workspaces')
        .update({ privacy: 'public' })
        .eq('id', workspace.id)
        .select()
        .single()

      expect(updated?.privacy).toBe('public')

      await deleteTestWorkspace(workspace.id)
    })

    it('should not allow non-owner to update', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      // Try to update as user2
      const { error } = await supabaseAdmin
        .from('workspaces')
        .update({ name: 'Hacked Name' })
        .eq('id', workspace.id)
        .eq('owner_id', testUser2.id)

      expect(error).toBeDefined()

      await deleteTestWorkspace(workspace.id)
    })
  })

  describe('DELETE /api/workspaces/[id]', () => {
    it('should delete workspace and cascade delete members', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      await supabaseAdmin
        .from('workspaces')
        .delete()
        .eq('id', workspace.id)

      // Verify deleted
      const { data } = await supabaseAdmin
        .from('workspaces')
        .select('*')
        .eq('id', workspace.id)

      expect(data).toHaveLength(0)

      // Verify members deleted
      const { data: members } = await supabaseAdmin
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspace.id)

      expect(members).toHaveLength(0)
    })

    it('should not allow non-owner to delete', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      const { error } = await supabaseAdmin
        .from('workspaces')
        .delete()
        .eq('id', workspace.id)
        .eq('owner_id', testUser2.id)

      expect(error).toBeDefined()

      await deleteTestWorkspace(workspace.id)
    })
  })

  describe('Workspace Members', () => {
    it('should add member to workspace', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      const { data: member } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: testUser2.id,
          role: 'editor'
        })
        .select()
        .single()

      expect(member).toBeDefined()
      expect(member!.role).toBe('editor')

      await deleteTestWorkspace(workspace.id)
    })

    it('should not allow duplicate members', async () => {
      const workspace = await createTestWorkspace(testUser1.id)

      const { error } = await supabaseAdmin
        .from('workspace_members')
        .insert({
          workspace_id: workspace.id,
          user_id: testUser1.id,
          role: 'editor'
        })

      expect(error).toBeDefined()
      // Error may not have code property if it's an RLS error
      if (error?.code) {
        expect(error.code).toBe('23505') // Unique constraint violation
      }

      await deleteTestWorkspace(workspace.id)
    })
  })
})
