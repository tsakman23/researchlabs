import { describe, it, expect } from 'vitest'
import { extractClaims, extractTextFromFile, generateMockEmbedding, detectContradictions } from '@/lib/claims/mock-extractor'
import type { ExtractedClaim } from '@/lib/claims/mock-extractor'

describe('Mock Claim Extractor', () => {
  describe('extractClaims', () => {
    it('should extract claims from simple text', async () => {
      const text = 'Climate change is a serious issue. Research shows that temperatures are rising. The data indicates significant warming trends.'

      const claims = await extractClaims(text, 'text')

      expect(claims.length).toBeGreaterThan(0)
      expect(claims.some(c => c.claim_text.includes('temperatures are rising'))).toBe(true)
    })

    it('should filter out questions', async () => {
      const text = 'Is climate change real? Studies show that it is.'

      const claims = await extractClaims(text, 'text')

      expect(claims.every(c => !c.claim_text.endsWith('?'))).toBe(true)
    })

    it('should filter out very short sentences', async () => {
      const text = 'Hi. Climate change is accelerating rapidly according to recent studies.'

      const claims = await extractClaims(text, 'text')

      expect(claims.every(c => c.claim_text.length > 20)).toBe(true)
    })

    it('should assign higher confidence to research language', async () => {
      const researchText = 'Research shows that the results indicate a significant correlation between variables.'
      const vagueText = 'It might be that things could possibly happen.'

      const researchClaims = await extractClaims(researchText, 'text')
      const vagueClaims = await extractClaims(vagueText, 'text')

      if (researchClaims.length > 0 && vagueClaims.length > 0) {
        expect(researchClaims[0].confidence_score).toBeGreaterThan(vagueClaims[0].confidence_score)
      }
    })

    it('should lower confidence for uncertain language', async () => {
      const certainText = 'The data shows a clear correlation.'
      const uncertainText = 'The data might possibly show a correlation.'

      const certainClaims = await extractClaims(certainText, 'text')
      const uncertainClaims = await extractClaims(uncertainText, 'text')

      if (certainClaims.length > 0 && uncertainClaims.length > 0) {
        expect(certainClaims[0].confidence_score).toBeGreaterThan(uncertainClaims[0].confidence_score)
      }
    })

    it('should handle multiple paragraphs', async () => {
      const text = `First paragraph has a claim. Research shows important findings.

Second paragraph also contains claims. The study demonstrates significant results.

Third paragraph with more claims. Evidence supports the hypothesis.`

      const claims = await extractClaims(text, 'text')

      expect(claims.length).toBeGreaterThan(2)
      expect(claims.some(c => c.source_paragraph_num === 1)).toBe(true)
      expect(claims.some(c => c.source_paragraph_num === 2)).toBe(true)
      expect(claims.some(c => c.source_paragraph_num === 3)).toBe(true)
    })

    it('should not extract claims from empty text', async () => {
      const claims = await extractClaims('', 'text')
      expect(claims).toHaveLength(0)
    })

    it('should handle special characters', async () => {
      const text = 'The study (2023) shows that CO₂ levels are rising at 2.5% per year.'

      const claims = await extractClaims(text, 'text')

      expect(claims.length).toBeGreaterThan(0)
    })

    it('should identify claims with numbers and percentages', async () => {
      const text = 'Research shows that 75% of participants experienced improvement. Temperature increased by 1.5 degrees.'

      const claims = await extractClaims(text, 'text')

      expect(claims.length).toBeGreaterThan(0)
      // Claims with percentages/numbers should have higher confidence
      expect(claims.some(c => c.confidence_score > 0.6)).toBe(true)
    })
  })

  describe('extractTextFromFile', () => {
    it('should extract text from text buffer', async () => {
      const text = 'This is a test document with some content.'
      const buffer = new TextEncoder().encode(text).buffer

      const extracted = await extractTextFromFile(buffer, 'text')

      expect(extracted).toBe(text)
    })

    it('should handle UTF-8 text', async () => {
      const text = 'Text with unicode: café, naïve, 日本語'
      const buffer = new TextEncoder().encode(text).buffer

      const extracted = await extractTextFromFile(buffer, 'text')

      expect(extracted).toContain('café')
      expect(extracted).toContain('naïve')
    })

    it('should return empty for binary files', async () => {
      // Simulate a binary file (non-text)
      const binaryData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG header
      const buffer = binaryData.buffer

      const extracted = await extractTextFromFile(buffer, 'pdf')

      expect(extracted).toBe('')
    })

    it('should handle empty buffer', async () => {
      const buffer = new ArrayBuffer(0)

      const extracted = await extractTextFromFile(buffer, 'text')

      expect(extracted).toBe('')
    })
  })

  describe('generateMockEmbedding', () => {
    it('should generate 1536-dimensional vector', () => {
      const embedding = generateMockEmbedding('test text')

      expect(embedding).toHaveLength(1536)
    })

    it('should generate unit vector (magnitude ≈ 1)', () => {
      const embedding = generateMockEmbedding('test text')

      const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))

      expect(magnitude).toBeCloseTo(1.0, 5)
    })

    it('should generate deterministic embeddings for same text', () => {
      const text = 'deterministic test'
      
      const embedding1 = generateMockEmbedding(text)
      const embedding2 = generateMockEmbedding(text)

      expect(embedding1).toEqual(embedding2)
    })

    it('should generate different embeddings for different text', () => {
      const embedding1 = generateMockEmbedding('text one')
      const embedding2 = generateMockEmbedding('text two')

      // Embeddings should be different
      const areDifferent = embedding1.some((val, idx) => Math.abs(val - embedding2[idx]) > 0.001)
      expect(areDifferent).toBe(true)
    })

    it('should generate all values in [-1, 1] range', () => {
      const embedding = generateMockEmbedding('range test')

      expect(embedding.every(val => val >= -1 && val <= 1)).toBe(true)
    })

    it('should handle empty string', () => {
      const embedding = generateMockEmbedding('')

      expect(embedding).toHaveLength(1536)
      expect(embedding.every(val => !isNaN(val))).toBe(true)
    })

    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000)

      const embedding = generateMockEmbedding(longText)

      expect(embedding).toHaveLength(1536)
    })
  })

  describe('detectContradictions', () => {
    it('should detect contradictions with negation', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'Temperature is increasing rapidly',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        },
        {
          claim_text: 'Temperature is not increasing at all',
          source_page_num: null,
          source_paragraph_num: 2,
          confidence_score: 0.8,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      expect(contradictions.length).toBeGreaterThan(0)
      expect(contradictions[0].explanation).toContain('negation')
    })

    it('should detect contradictions with opposite terms', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'The study shows a significant increase in test scores',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        },
        {
          claim_text: 'The study shows a significant decrease in test scores',
          source_page_num: null,
          source_paragraph_num: 2,
          confidence_score: 0.8,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      expect(contradictions.length).toBeGreaterThan(0)
      expect(contradictions[0].explanation).toContain('opposite terms')
    })

    it('should not detect contradictions in unrelated claims', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'The temperature is rising in the Arctic',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        },
        {
          claim_text: 'The economy is growing steadily',
          source_page_num: null,
          source_paragraph_num: 2,
          confidence_score: 0.8,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      expect(contradictions).toHaveLength(0)
    })

    it('should require shared words for contradiction detection', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'Cats are friendly',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        },
        {
          claim_text: 'Dogs are not friendly',
          source_page_num: null,
          source_paragraph_num: 2,
          confidence_score: 0.8,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      // Should not detect contradiction (different subjects: cats vs dogs)
      expect(contradictions).toHaveLength(0)
    })

    it('should handle empty claims array', () => {
      const contradictions = detectContradictions([])

      expect(contradictions).toHaveLength(0)
    })

    it('should handle single claim', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'Temperature is rising',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      expect(contradictions).toHaveLength(0)
    })

    it('should detect rise vs fall contradiction', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'Stock prices are on the rise according to market analysis',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        },
        {
          claim_text: 'Stock prices continue to fall based on market analysis',
          source_page_num: null,
          source_paragraph_num: 2,
          confidence_score: 0.8,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      expect(contradictions.length).toBeGreaterThan(0)
      expect(contradictions[0].explanation).toContain('rise')
      expect(contradictions[0].explanation).toContain('fall')
    })

    it('should detect positive vs negative contradiction', () => {
      const claims: ExtractedClaim[] = [
        {
          claim_text: 'The treatment has positive effects on patient recovery rates',
          source_page_num: null,
          source_paragraph_num: 1,
          confidence_score: 0.9,
          embedding: null
        },
        {
          claim_text: 'The treatment has negative effects on patient recovery rates',
          source_page_num: null,
          source_paragraph_num: 2,
          confidence_score: 0.8,
          embedding: null
        }
      ]

      const contradictions = detectContradictions(claims)

      expect(contradictions.length).toBeGreaterThan(0)
      expect(contradictions[0].explanation).toContain('positive')
      expect(contradictions[0].explanation).toContain('negative')
    })
  })

  describe('Integration Tests', () => {
    it('should extract claims and generate embeddings', async () => {
      const text = 'Research shows that climate change is accelerating. Studies indicate rising temperatures.'

      const claims = await extractClaims(text, 'text')

      expect(claims.length).toBeGreaterThan(0)

      // Generate embeddings for claims
      const claimsWithEmbeddings = claims.map(claim => ({
        ...claim,
        embedding: generateMockEmbedding(claim.claim_text)
      }))

      expect(claimsWithEmbeddings.every(c => c.embedding !== null)).toBe(true)
      expect(claimsWithEmbeddings.every(c => c.embedding!.length === 1536)).toBe(true)
    })

    it('should extract claims and detect contradictions', async () => {
      const text = `Temperature measurements show rapid rising trends across global regions.

Studies indicate that temperature measurements show no rising trends at all.`

      const claims = await extractClaims(text, 'text')

      expect(claims.length).toBeGreaterThan(0)

      const contradictions = detectContradictions(claims)

      // Should detect the contradiction (shared words: temperature, measurements, rising, trends)
      expect(contradictions.length).toBeGreaterThan(0)
    })

    it('should handle full document processing pipeline', async () => {
      const documentText = `Climate change is a significant global challenge. Research indicates that temperatures have risen by 1.5 degrees.

The evidence shows increasing sea levels. Studies demonstrate accelerating ice melt in polar regions.

However, some reports suggest that temperature increases are not uniform across all regions.`

      // Step 1: Extract text (simulated)
      const buffer = new TextEncoder().encode(documentText).buffer
      const text = await extractTextFromFile(buffer, 'text')

      // Step 2: Extract claims
      const claims = await extractClaims(text, 'text')
      expect(claims.length).toBeGreaterThan(0)

      // Step 3: Generate embeddings
      const claimsWithEmbeddings = claims.map(claim => ({
        ...claim,
        embedding: generateMockEmbedding(claim.claim_text)
      }))
      expect(claimsWithEmbeddings.length).toBe(claims.length)

      // Step 4: Detect contradictions
      const contradictions = detectContradictions(claimsWithEmbeddings)
      
      // Verify structure
      expect(claims.every(c => c.claim_text.length > 0)).toBe(true)
      expect(claims.every(c => c.confidence_score >= 0 && c.confidence_score <= 1)).toBe(true)
      expect(claimsWithEmbeddings.every(c => c.embedding!.length === 1536)).toBe(true)
    })
  })
})
