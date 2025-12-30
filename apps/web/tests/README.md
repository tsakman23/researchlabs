# Test Suite Documentation

This document explains the comprehensive test suite for the ResearchLabs application.

## Overview

The test suite includes:
- **Unit Tests**: Test individual API endpoints, functions, and components
- **Integration Tests**: Test complete workflows and multi-user scenarios  
- **E2E Tests**: Test full application flows using Playwright

## Running Tests

### Unit Tests (Vitest)

```bash
# Run all unit tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm test --coverage

# Run specific test file
pnpm test workspaces.test.ts

# Run tests matching pattern
pnpm test --grep "workspace"
```

### E2E Tests (Playwright)

```bash
# Run E2E tests
pnpm test:e2e

# Run E2E tests with UI
pnpm test:e2e:ui
```

## Test Structure

```
tests/
├── setup.ts                    # Global test setup and Supabase config
├── utils/
│   └── test-helpers.ts         # Reusable test utilities
└── unit/
    ├── workspaces.test.ts      # Workspace CRUD tests
    ├── documents.test.ts       # Document upload and management tests
    ├── claims.test.ts          # Claim extraction and contradiction tests
    ├── mock-extractor.test.ts  # Mock extractor function tests
    └── integration.test.ts     # End-to-end workflow tests
```

## Test Coverage

### Workspaces API (`workspaces.test.ts`)
- ✅ Create workspace with validation
- ✅ List user's workspaces
- ✅ List shared workspaces
- ✅ Get workspace details (owner and non-member access)
- ✅ Update workspace name and privacy
- ✅ Delete workspace with cascade
- ✅ Add workspace members
- ✅ Prevent duplicate members

### Documents API (`documents.test.ts`)
- ✅ Upload documents with various file types
- ✅ Validate file types and sizes
- ✅ List workspace documents
- ✅ Soft delete documents
- ✅ RLS enforcement for non-members
- ✅ Multiple document uploads
- ✅ Cascade deletion with workspace

### Claims API (`claims.test.ts`)
- ✅ Create claims with confidence scores
- ✅ Validate confidence range (0-1)
- ✅ Filter claims by status
- ✅ Update claim status
- ✅ Store embeddings as vectors
- ✅ Link contradictory claims
- ✅ Prevent duplicate contradictions
- ✅ Bulk claim insertion
- ✅ Cascade deletion with documents

### Mock Extractor (`mock-extractor.test.ts`)
- ✅ Extract claims from text
- ✅ Filter out questions and short sentences
- ✅ Assign confidence scores based on language
- ✅ Handle multiple paragraphs
- ✅ Extract text from buffers
- ✅ Generate 1536-dimensional embeddings
- ✅ Generate deterministic embeddings
- ✅ Detect contradictions with negation
- ✅ Detect contradictions with opposite terms
- ✅ Full document processing pipeline

### Integration Tests (`integration.test.ts`)
- ✅ Full document-to-claims workflow
- ✅ Multi-user collaboration (owner/editor/viewer roles)
- ✅ Workspace privacy (public vs private)
- ✅ Cascade deletion of all workspace data
- ✅ Handle edge cases (no claims, very long documents)
- ✅ Cross-document contradiction detection
- ✅ Bulk operations and stress testing
- ✅ Concurrent operations

## Test Utilities

The `test-helpers.ts` file provides utilities for test setup:

### Supabase Admin Client
```typescript
const supabaseAdmin = createClient(url, serviceRoleKey)
```
Uses service role key to bypass RLS for test setup/teardown.

### User Management
```typescript
// Create test user with auth + profile
const user = await createTestUser('username')

// Clean up user and all data
await deleteTestUser(userId)
```

### Workspace Management
```typescript
// Create workspace with owner
const workspace = await createTestWorkspace(ownerId, 'Workspace Name', isPublic)

// Add member with role
await addWorkspaceMember(workspaceId, userId, 'editor')

// Clean up workspace and cascade data
await deleteTestWorkspace(workspaceId)
```

### Document Management
```typescript
// Create test document
const doc = await createTestDocument(workspaceId, userId, 'Title')
```

### Authentication
```typescript
// Get user session for API calls
const session = await getTestUserSession(email, password)
```

## Environment Setup

Tests require Supabase local instance:

```bash
# Start Supabase locally
supabase start

# The test setup uses these values:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<from supabase start output>
```

## Writing New Tests

### Basic Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createTestUser, deleteTestUser } from '../utils/test-helpers'

describe('Feature Name', () => {
  let testUser

  beforeEach(async () => {
    testUser = await createTestUser('test-user')
  })

  afterEach(async () => {
    await deleteTestUser(testUser.id)
  })

  it('should do something', async () => {
    // Test implementation
    expect(result).toBe(expected)
  })
})
```

### Testing RLS Policies

Use the admin client for setup, then test with regular user clients:

```typescript
// Setup with admin (bypasses RLS)
const doc = await createTestDocument(workspaceId, userId)

// Test with regular client (enforces RLS)
const { data, error } = await supabase
  .from('documents')
  .select('*')
  .eq('id', doc.id)

expect(error).toBeDefined() // Non-member should be blocked
```

## Edge Cases Covered

- ✅ Empty inputs (empty text, empty arrays)
- ✅ Very long inputs (10,000+ character documents)
- ✅ Special characters and Unicode
- ✅ Concurrent operations (multiple users uploading simultaneously)
- ✅ Bulk operations (100+ claims at once)
- ✅ Invalid inputs (wrong file types, out-of-range values)
- ✅ Unauthorized access attempts
- ✅ Cascade deletions
- ✅ Duplicate prevention (unique constraints)

## Performance Considerations

- Tests use admin client for setup/teardown to maximize speed
- Parallel test execution is disabled for database-dependent tests
- Each test cleans up its own data to prevent interference
- Use `beforeEach`/`afterEach` for isolation
- Mock external dependencies when possible

## Continuous Integration

Tests can be run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    supabase start
    pnpm test --run
    pnpm test:e2e
```

## Debugging Tests

```bash
# Run tests with debug output
DEBUG=* pnpm test

# Run single test with verbose output
pnpm test --reporter=verbose workspaces.test.ts

# Open Playwright test UI for debugging E2E tests
pnpm test:e2e:ui
```

## Known Limitations

- Mock extractor uses simple heuristics, not actual LLM extraction
- Embeddings are deterministic pseudo-random, not real semantic vectors
- File parsing is limited (no PDF/DOCX parsing libraries installed)
- Storage operations test metadata only, not actual file uploads

## Future Improvements

- [ ] Add tests for Dify workflow integration
- [ ] Add tests for real LLM claim extraction
- [ ] Add tests for actual file uploads to Supabase Storage
- [ ] Add performance benchmarks
- [ ] Add load testing for concurrent users
- [ ] Add tests for real-time subscriptions
- [ ] Add visual regression tests
