import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/workspaces/[id] - Get workspace details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const workspaceId = id // UUID string

  console.log('=== GET /api/workspaces/[id] ===')
  console.log('Workspace ID:', workspaceId)
  console.log('User ID:', user.id)

  // First, check if workspace exists at all (without RLS)
  const { data: rawWorkspace, error: rawError } = await supabase
    .from('workspaces')
    .select('id, name, owner_id')
    .eq('id', workspaceId)
    .maybeSingle()

  console.log('Raw workspace query result:', rawWorkspace)
  console.log('Raw workspace query error:', rawError)

  // Check if user is a member
  const { data: membership, error: memberError } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .maybeSingle()

  console.log('Membership query result:', membership)
  console.log('Membership query error:', memberError)

  // Get workspace with members
  const { data: workspace, error } = await supabase
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
    .eq('id', workspaceId)
    .single()

  if (error) {
    console.error('Error fetching workspace:', error)
    console.error('Workspace ID:', workspaceId)
    console.error('User ID:', user.id)
    return NextResponse.json({ error: 'Workspace not found', details: error.message }, { status: 404 })
  }

  // Fetch user details separately for each member
  if (workspace.workspace_members && workspace.workspace_members.length > 0) {
    const memberUserIds = workspace.workspace_members.map((m: any) => m.user_id)
    const { data: users } = await supabase
      .from('users')
      .select('id, email, display_name')
      .in('id', memberUserIds)
    
    // Attach user data to members
    workspace.workspace_members = workspace.workspace_members.map((member: any) => ({
      ...member,
      users: users?.find(u => u.id === member.user_id) || null
    }))
  }

  return NextResponse.json({ workspace })
}

// PATCH /api/workspaces/[id] - Update workspace
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const workspaceId = id // UUID string

  try {
    const body = await request.json()
    const { name, description, privacy } = body

    const updates: any = {}
    if (name !== undefined) updates.name = name.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (privacy !== undefined) updates.privacy = privacy

    // Update workspace (RLS ensures only owner can update)
    const { data: workspace, error } = await supabase
      .from('workspaces')
      .update(updates)
      .eq('id', workspaceId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ workspace })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// DELETE /api/workspaces/[id] - Delete workspace
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const workspaceId = id // UUID string

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('workspaces')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', workspaceId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
