import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/claims/[id]/status - Update claim status
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const claimId = parseInt(params.id)

  if (isNaN(claimId)) {
    return NextResponse.json({ error: 'Invalid claim ID' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const { status } = body

    if (!status || !['extracted', 'verified', 'disputed', 'needs_review'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update claim status (RLS ensures user has access to workspace)
    const { data: claim, error } = await supabase
      .from('claims')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', claimId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ claim })
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}
