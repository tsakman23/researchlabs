/**
 * Mock Claim Extraction System
 * 
 * This is a simple mock implementation that extracts claims from text.
 * In production, this would be replaced by Dify workflows with LLM-powered extraction.
 * 
 * The mock extractor:
 * 1. Splits text into sentences
 * 2. Identifies declarative statements
 * 3. Assigns confidence scores
 * 4. Generates embeddings using OpenAI
 */

import { generateEmbeddings } from '@/lib/embeddings'

export interface ExtractedClaim {
  claim_text: string
  source_page_num: number | null
  source_paragraph_num: number | null
  confidence_score: number
  embedding: number[] | null
}

/**
 * Extract claims from document text
 */
export async function extractClaims(text: string, fileType: string): Promise<ExtractedClaim[]> {
  const claims: ExtractedClaim[] = []
  
  // Split text into paragraphs
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  paragraphs.forEach((paragraph, paragraphIndex) => {
    // Split paragraph into sentences
    const sentences = paragraph
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20) // Filter out very short sentences
    
    sentences.forEach(sentence => {
      // Simple heuristics to identify claims:
      // 1. Contains verbs (is, are, was, were, has, have, shows, indicates, suggests)
      // 2. Not a question
      // 3. Not too short
      const isLikelyClaim = (
        /\b(is|are|was|were|has|have|had|shows?|indicates?|suggests?|demonstrates?|proves?|reveals?|confirms?|supports?|argues?|claims?|states?|reports?|finds?|found|shows?|according to)\b/i.test(sentence) &&
        !sentence.endsWith('?') &&
        sentence.length > 30
      )
      
      if (isLikelyClaim) {
        // Assign confidence score based on indicators
        let confidence = 0.5
        
        // Higher confidence for research language
        if (/\b(research|study|data|analysis|results?|findings?|evidence)\b/i.test(sentence)) {
          confidence += 0.2
        }
        
        // Higher confidence for specific claims
        if (/\d+%|\d+ percent|significant|correlation|causation/i.test(sentence)) {
          confidence += 0.15
        }
        
        // Lower confidence for vague language
        if (/\b(might|maybe|perhaps|possibly|could|may)\b/i.test(sentence)) {
          confidence -= 0.2
        }
        
        confidence = Math.max(0.1, Math.min(1.0, confidence))
        
        claims.push({
          claim_text: sentence.trim(),
          source_page_num: null, // Would extract from PDF metadata
          source_paragraph_num: paragraphIndex + 1,
          confidence_score: parseFloat(confidence.toFixed(2)),
          embedding: null // Will be generated after all claims are extracted
        })
      }
    })
  })
  
  // Generate embeddings for all claims in batch
  if (claims.length > 0) {
    try {
      const claimTexts = claims.map(c => c.claim_text)
      const embeddings = await generateEmbeddings(claimTexts)
      claims.forEach((claim, i) => {
        claim.embedding = embeddings[i]
      })
    } catch (error) {
      console.error('Failed to generate embeddings for claims:', error)
      // Continue without embeddings rather than failing completely
    }
  }
  
  return claims
}

/**
 * Extract text from different file types
 * In production, this would use proper libraries (pdf-parse, mammoth, etc.)
 */
export async function extractTextFromFile(file: ArrayBuffer, fileType: string): Promise<string> {
  // For now, just return sample text as this would require file parsing libraries
  // In production:
  // - PDF: use pdf-parse or pdf.js
  // - DOCX: use mammoth
  // - TXT: just decode the buffer
  
  const decoder = new TextDecoder('utf-8')
  const text = decoder.decode(file)
  
  // If it looks like text, return it
  if (text.includes('\n') || text.includes(' ')) {
    return text
  }
  
  // Otherwise return empty (binary file that needs proper parsing)
  return ''
}

/**
 * Generate a simple mock embedding vector for testing
 * Returns 768 dimensions to match all-mpnet-base-v2
 */
export function generateMockEmbedding(text: string): number[] {
  // Generate a 768-dimensional vector (matching all-mpnet-base-v2)
  const dimension = 768
  const embedding: number[] = []
  
  // Use text hash to generate deterministic but pseudo-random vector
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = ((hash << 5) - hash) + text.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  
  // Generate vector components
  for (let i = 0; i < dimension; i++) {
    const seed = hash + i
    const pseudo = Math.sin(seed) * 10000
    embedding.push(pseudo - Math.floor(pseudo))
  }
  
  // Normalize to unit vector
  const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
  return embedding.map(val => val / magnitude)
}

/**
 * Detect contradictions between claims using simple heuristics
 * In production, this would use Dify workflows with Claude
 */
export function detectContradictions(claims: ExtractedClaim[]): Array<{ claim_a_idx: number; claim_b_idx: number; explanation: string }> {
  const contradictions: Array<{ claim_a_idx: number; claim_b_idx: number; explanation: string }> = []
  
  // Simple contradiction patterns
  const negationWords = ['not', 'no', 'never', 'none', 'neither']
  const oppositeWords = [
    ['increase', 'decrease'],
    ['rise', 'fall'],
    ['higher', 'lower'],
    ['more', 'less'],
    ['positive', 'negative'],
    ['effective', 'ineffective'],
    ['successful', 'unsuccessful']
  ]
  
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      const claimA = claims[i].claim_text.toLowerCase()
      const claimB = claims[j].claim_text.toLowerCase()
      
      // Check if both claims discuss similar topics (share key words)
      const wordsA = claimA.split(/\W+/).filter(w => w.length > 4)
      const wordsB = claimB.split(/\W+/).filter(w => w.length > 4)
      const sharedWords = wordsA.filter(w => wordsB.includes(w))
      
      if (sharedWords.length >= 2) {
        // Check for negation patterns
        const hasNegationA = negationWords.some(neg => claimA.includes(neg))
        const hasNegationB = negationWords.some(neg => claimB.includes(neg))
        
        if (hasNegationA !== hasNegationB) {
          contradictions.push({
            claim_a_idx: i,
            claim_b_idx: j,
            explanation: `Claims contradict each other through negation while discussing similar topics: ${sharedWords.slice(0, 3).join(', ')}`
          })
          continue
        }
        
        // Check for opposite terms
        for (const [word1, word2] of oppositeWords) {
          if (
            (claimA.includes(word1) && claimB.includes(word2)) ||
            (claimA.includes(word2) && claimB.includes(word1))
          ) {
            contradictions.push({
              claim_a_idx: i,
              claim_b_idx: j,
              explanation: `Claims contradict each other using opposite terms "${word1}" vs "${word2}"`
            })
            break
          }
        }
      }
    }
  }
  
  return contradictions
}
