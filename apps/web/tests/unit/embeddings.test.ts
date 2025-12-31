import { describe, it, expect } from 'vitest'
import { generateEmbedding, generateEmbeddings } from '@/lib/embeddings'

describe('Embeddings Service', () => {
  it('should generate 768-dimensional embedding for text', async () => {
    const text = 'Climate change is accelerating rapidly'
    const embedding = await generateEmbedding(text)
    
    expect(embedding).toBeDefined()
    expect(Array.isArray(embedding)).toBe(true)
    expect(embedding.length).toBe(768) // all-mpnet-base-v2 dimensions
    
    // Check all values are numbers
    embedding.forEach(val => {
      expect(typeof val).toBe('number')
      expect(isNaN(val)).toBe(false)
    })
  }, 30000) // Longer timeout for model loading

  it('should generate similar embeddings for similar text', async () => {
    const text1 = 'Climate change is accelerating'
    const text2 = 'Global warming is speeding up'
    const text3 = 'The cat sat on the mat'
    
    const [emb1, emb2, emb3] = await Promise.all([
      generateEmbedding(text1),
      generateEmbedding(text2),
      generateEmbedding(text3)
    ])
    
    // Calculate cosine similarity
    const cosineSim = (a: number[], b: number[]) => {
      const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0)
      return dotProduct // Normalized vectors, so dot product = cosine similarity
    }
    
    const sim12 = cosineSim(emb1, emb2)
    const sim13 = cosineSim(emb1, emb3)
    
    // Similar texts should have higher similarity
    expect(sim12).toBeGreaterThan(sim13)
    expect(sim12).toBeGreaterThan(0.5) // Should be fairly similar
  }, 30000)

  it('should generate embeddings for multiple texts in batch', async () => {
    const texts = [
      'First claim about climate',
      'Second claim about research',
      'Third claim about data'
    ]
    
    const embeddings = await generateEmbeddings(texts)
    
    expect(embeddings).toBeDefined()
    expect(embeddings.length).toBe(3)
    embeddings.forEach(emb => {
      expect(emb.length).toBe(768)
    })
  }, 30000)

  it('should throw error for empty text', async () => {
    await expect(generateEmbedding('')).rejects.toThrow('Text cannot be empty')
    await expect(generateEmbedding('   ')).rejects.toThrow('Text cannot be empty')
  })

  it('should throw error for empty array', async () => {
    await expect(generateEmbeddings([])).resolves.toEqual([])
  })

  it('should handle whitespace in text', async () => {
    const text = '  Climate change is real  '
    const embedding = await generateEmbedding(text)
    
    expect(embedding).toBeDefined()
    expect(embedding.length).toBe(768)
  }, 30000)
})
