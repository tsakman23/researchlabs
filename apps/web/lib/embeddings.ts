import { pipeline } from '@xenova/transformers'

// Lazy load the model
let embedder: any = null

async function getEmbedder() {
  if (!embedder) {
    // Use Xenova's all-mpnet-base-v2 model (768 dimensions)
    // Better quality than all-MiniLM-L6-v2
    embedder = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2')
  }
  return embedder
}

/**
 * Generate embeddings for text using Sentence Transformers
 * Returns a 768-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty')
  }

  try {
    const model = await getEmbedder()
    const output = await model(text.trim(), { pooling: 'mean', normalize: true })
    
    // Convert to regular array
    return Array.from(output.data)
  } catch (error) {
    console.error('Failed to generate embedding:', error)
    throw new Error('Failed to generate embedding')
  }
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return []
  }

  const validTexts = texts.filter(t => t && t.trim().length > 0)
  if (validTexts.length === 0) {
    throw new Error('All texts are empty')
  }

  try {
    const model = await getEmbedder()
    const embeddings: number[][] = []
    
    // Process in batches to avoid memory issues
    for (const text of validTexts) {
      const output = await model(text.trim(), { pooling: 'mean', normalize: true })
      embeddings.push(Array.from(output.data))
    }
    
    return embeddings
  } catch (error) {
    console.error('Failed to generate embeddings:', error)
    throw new Error('Failed to generate embeddings')
  }
}
