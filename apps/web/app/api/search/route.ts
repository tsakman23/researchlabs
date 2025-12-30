import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { generateMockEmbedding } from '@/lib/claims/mock-extractor'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')
  const workspaceId = searchParams.get('workspace_id')
  const threshold = parseFloat(searchParams.get('threshold') || '0.7')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Generate embedding for the search query
    const queryEmbedding = generateMockEmbedding(query)
    const embeddingString = `[${queryEmbedding.join(',')}]`

    // Build the query with optional workspace filter
    let queryBuilder = supabase.rpc('search_claims', {
      query_embedding: embeddingString,
      similarity_threshold: threshold,
      max_results: limit
    })

    if (workspaceId) {
      queryBuilder = queryBuilder.eq('workspace_id', workspaceId)
    }

    const { data: claims, error } = await queryBuilder

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json(
        { error: 'Failed to search claims' },
        { status: 500 }
      )
    }

    // Fetch related contradictions for the found claims
    const claimIds = claims?.map((c: any) => c.id) || []
    let contradictions = []

    if (claimIds.length > 0) {
      const { data: contradictionsData } = await supabase
        .from('contradictions')
        .select(`
          *,
          claim_a:claims!contradictions_claim_a_id_fkey(id, claim_text, confidence_score),
          claim_b:claims!contradictions_claim_b_id_fkey(id, claim_text, confidence_score)
        `)
        .or(`claim_a_id.in.(${claimIds.join(',')}),claim_b_id.in.(${claimIds.join(',')})`)

      contradictions = contradictionsData || []
    }

    return NextResponse.json({
      claims: claims || [],
      contradictions,
      query,
      threshold,
      count: claims?.length || 0
    })
  } catch (err) {
    console.error('Unexpected search error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
