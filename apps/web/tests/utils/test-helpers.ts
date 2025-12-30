import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create admin client that bypasses RLS
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export interface TestUser {
  id: string
  email: string
  password: string
  display_name: string
}

export interface TestWorkspace {
  id: string
  name: string
  owner_id: string
  privacy: 'public' | 'private'
}

/**
 * Create a test user
 */
export async function createTestUser(suffix: string = Date.now().toString()): Promise<TestUser> {
  // Add random string to ensure uniqueness across parallel test runs
  const random = Math.random().toString(36).substring(7)
  const email = `test-${suffix}-${random}@example.com`
  const password = 'Test123!@#'
  const display_name = `Test User ${suffix}-${random}`

  // Create auth user (trigger will auto-create profile in public.users)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name }
  })

  if (authError || !authData.user) {
    throw new Error(`Failed to create test user: ${authError?.message}`)
  }

  // Wait a bit for trigger to complete
  await new Promise(resolve => setTimeout(resolve, 100))

  return {
    id: authData.user.id,
    email,
    password,
    display_name
  }
}

/**
 * Delete a test user and all related data
 */
export async function deleteTestUser(userId: string): Promise<void> {
  // Delete from auth
  await supabaseAdmin.auth.admin.deleteUser(userId)
  
  // Profile and related data will be cascade deleted by foreign keys
}

/**
 * Create a test workspace
 */
export async function createTestWorkspace(ownerId: string, name?: string, isPublic?: boolean): Promise<TestWorkspace> {
  const workspaceName = name || `Test Workspace ${Date.now()}`

  const { data, error } = await supabaseAdmin
    .from('workspaces')
    .insert({
      owner_id: ownerId,
      name: workspaceName,
      privacy: isPublic ? 'public' : 'private'
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test workspace: ${error?.message}`)
  }

  return data as TestWorkspace
}

/**
 * Delete a test workspace
 */
export async function deleteTestWorkspace(workspaceId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('workspaces')
    .delete()
    .eq('id', workspaceId)

  if (error) {
    throw new Error(`Failed to delete test workspace: ${error.message}`)
  }
}

/**
 * Create a test document
 */
export async function createTestDocument(workspaceId: string, uploadedBy: string, title?: string) {
  const documentTitle = title || `Test Document ${Date.now()}`

  const { data, error } = await supabaseAdmin
    .from('documents')
    .insert({
      workspace_id: workspaceId,
      title: documentTitle,
      description: 'Test document for unit tests',
      file_url: `${workspaceId}/test-${Date.now()}.txt`,
      file_type: 'text',
      file_size: 1024,
      uploaded_by: uploadedBy
    })
    .select()
    .single()

  if (error || !data) {
    throw new Error(`Failed to create test document: ${error?.message}`)
  }

  return data
}

/**
 * Add a user to a workspace
 */
export async function addWorkspaceMember(workspaceId: string, userId: string, role: 'owner' | 'editor' | 'viewer' = 'editor') {
  const { data, error } = await supabaseAdmin
    .from('workspace_members')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      role
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to add workspace member: ${error.message}`)
  }

  return data
}

/**
 * Get auth session for a test user
 */
export async function getTestUserSession(email: string, password: string) {
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  })

  if (error || !data.session) {
    throw new Error(`Failed to get test user session: ${error?.message}`)
  }

  return data.session
}

/**
 * Clean up all test data
 */
export async function cleanupTestData() {
  // Delete test users (cascade will handle related data)
  await supabaseAdmin
    .from('users')
    .delete()
    .like('email', 'test-%@example.com')
}
