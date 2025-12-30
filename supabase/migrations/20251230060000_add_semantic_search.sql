-- Add semantic search function using pgvector
-- This function performs cosine similarity search on claim embeddings

CREATE OR REPLACE FUNCTION search_claims(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.7,
  max_results int DEFAULT 20
)
RETURNS TABLE (
  id bigint,
  workspace_id uuid,
  document_id bigint,
  claim_text text,
  confidence_score float,
  status text,
  similarity float,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.workspace_id,
    c.document_id,
    c.claim_text,
    c.confidence_score,
    c.status,
    1 - (c.embedding <=> query_embedding) as similarity,
    c.created_at
  FROM claims c
  WHERE 
    c.embedding IS NOT NULL
    AND c.deleted_at IS NULL
    AND 1 - (c.embedding <=> query_embedding) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql STABLE;

-- Create index for faster similarity search if not exists
CREATE INDEX IF NOT EXISTS idx_claims_embedding ON claims USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_claims TO authenticated;
