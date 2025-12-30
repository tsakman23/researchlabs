import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { extractClaims, extractTextFromFile, generateMockEmbedding } from '@/lib/claims/mock-extractor'

// POST /api/documents/[id]/extract - Extract claims from document
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient()
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const documentId = parseInt(params.id)

  if (isNaN(documentId)) {
    return NextResponse.json({ error: 'Invalid document ID' }, { status: 400 })
  }

  try {
    // Get document details
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.file_url)

    if (downloadError) {
      return NextResponse.json({ error: 'Failed to download document' }, { status: 400 })
    }

    // Extract text from file
    const fileBuffer = await fileData.arrayBuffer()
    const text = await extractTextFromFile(fileBuffer, document.file_type)

    if (!text || text.trim().length === 0) {
      return NextResponse.json({ 
        error: 'Could not extract text from document. Binary files need proper parsing libraries.',
        extracted: 0
      }, { status: 400 })
    }

    // Extract claims
    const extractedClaims = await extractClaims(text, document.file_type)

    if (extractedClaims.length === 0) {
      return NextResponse.json({ 
        message: 'No claims found in document',
        extracted: 0
      })
    }

    // Insert claims into database with embeddings
    const claimsToInsert = extractedClaims.map(claim => ({
      workspace_id: document.workspace_id,
      document_id: documentId,
      extracted_by: user.id,
      claim_text: claim.claim_text,
      source_page_num: claim.source_page_num,
      source_paragraph_num: claim.source_paragraph_num,
      confidence_score: claim.confidence_score,
      embedding: claim.embedding || generateMockEmbedding(claim.claim_text),
      status: 'extracted' as const
    }))

    const { data: insertedClaims, error: insertError } = await supabase
      .from('claims')
      .insert(claimsToInsert)
      .select()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ 
      message: 'Claims extracted successfully',
      extracted: insertedClaims.length,
      claims: insertedClaims
    }, { status: 201 })
  } catch (error) {
    console.error('Extraction error:', error)
    return NextResponse.json({ error: 'Failed to extract claims' }, { status: 500 })
  }
}
