import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/workspaces/[id]/members - Invite collaborator to workspace
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const workspaceId = parseInt(params.id)

  if (isNaN(workspaceId)) {
    return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { user_id, role = 'member' } = body

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 })
    }

    if (!['owner', 'member'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Create workspace member (RLS ensures only owner can invite)
    const { data: member, error } = await supabase
      .from('workspace_members')
      .insert({
        workspace_id: workspaceId,
        user_id,
        role
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Fetch user details separately
    const { data: userData } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('id', user_id)
      .single()

    return NextResponse.json({ 
      member: {
        ...member,
        users: userData
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

// GET /api/workspaces/[id]/members - List workspace members
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

  // Get all members of the workspace
  const { data: members, error } = await supabase
    .from('workspace_members')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('joined_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Fetch user details separately
  if (members && members.length > 0) {
    const userIds = members.map(m => m.user_id)
    const { data: users } = await supabase
      .from('users')
      .select('id, email, display_name')
      .in('id', userIds)
    
    // Attach user data
    const membersWithUsers = members.map(member => ({
      ...member,
      users: users?.find(u => u.id === member.user_id) || null
    }))
    
    return NextResponse.json({ members: membersWithUsers })
  }

  return NextResponse.json({ members })
}
