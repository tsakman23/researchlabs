import { test, expect } from '@playwright/test'

test.describe('Workspace Management', () => {
  test.beforeEach(async ({ page }) => {
    // Create and login test user
    const testEmail = `test-${Date.now()}@example.com`
    const testPassword = 'TestPassword123!'

    // First, sign up
    await page.goto('http://localhost:3000/auth/signup')
    await page.fill('input[name="email"]', testEmail)
    await page.fill('input[name="password"]', testPassword)
    await page.fill('input[name="displayName"]', 'Test User')
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('http://localhost:3000/dashboard', { timeout: 10000 })
  })

  test('should navigate to workspaces page', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    await expect(page.locator('h1')).toContainText('Workspaces')
  })

  test('should show create workspace button', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    const createButton = page.getByRole('button', { name: 'Create Workspace' })
    await expect(createButton).toBeVisible()
  })

  test('should show create form when button clicked', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    await page.click('button:has-text("Create Workspace")')
    await expect(page.locator('h2:has-text("Create New Workspace")')).toBeVisible()
    await expect(page.locator('input#name')).toBeVisible()
  })

  test('should create a new workspace', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    
    // Open create form
    await page.click('button:has-text("Create Workspace")')
    
    // Fill form
    const timestamp = Date.now()
    await page.fill('input#name', `Test Workspace ${timestamp}`)
    await page.fill('textarea#description', 'A test workspace for E2E testing')
    await page.selectOption('select#privacy', 'private')
    
    // Submit
    await page.click('button[type="submit"]:has-text("Create Workspace")')
    
    // Wait for workspace to appear
    await page.waitForTimeout(1000)
    
    // Verify workspace appears in list
    await expect(page.locator(`text=Test Workspace ${timestamp}`)).toBeVisible()
  })

  test('should navigate to workspace detail page', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    
    // Create a workspace first
    await page.click('button:has-text("Create Workspace")')
    const timestamp = Date.now()
    await page.fill('input#name', `Detail Test ${timestamp}`)
    await page.click('button[type="submit"]:has-text("Create Workspace")')
    await page.waitForTimeout(1000)
    
    // Click on the workspace
    await page.click(`text=Detail Test ${timestamp}`)
    
    // Verify detail page
    await expect(page.locator('h1')).toContainText(`Detail Test ${timestamp}`)
    await expect(page.locator('h2:has-text("Members")')).toBeVisible()
  })

  test('should show edit form on workspace detail page', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    
    // Create workspace
    await page.click('button:has-text("Create Workspace")')
    const timestamp = Date.now()
    await page.fill('input#name', `Edit Test ${timestamp}`)
    await page.click('button[type="submit"]:has-text("Create Workspace")')
    await page.waitForTimeout(1000)
    
    // Navigate to detail
    await page.click(`text=Edit Test ${timestamp}`)
    
    // Click edit
    await page.click('button:has-text("Edit")')
    
    // Verify edit form
    await expect(page.locator('h2:has-text("Edit Workspace")')).toBeVisible()
    await expect(page.locator('input#name')).toHaveValue(`Edit Test ${timestamp}`)
  })

  test('should update workspace details', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    
    // Create workspace
    await page.click('button:has-text("Create Workspace")')
    const timestamp = Date.now()
    await page.fill('input#name', `Update Test ${timestamp}`)
    await page.click('button[type="submit"]:has-text("Create Workspace")')
    await page.waitForTimeout(1000)
    
    // Navigate to detail and edit
    await page.click(`text=Update Test ${timestamp}`)
    await page.click('button:has-text("Edit")')
    
    // Update name
    await page.fill('input#name', `Updated ${timestamp}`)
    await page.fill('textarea#description', 'Updated description')
    await page.click('button[type="submit"]:has-text("Save Changes")')
    
    // Verify update
    await page.waitForTimeout(500)
    await expect(page.locator('h1')).toContainText(`Updated ${timestamp}`)
    await expect(page.locator('text=Updated description')).toBeVisible()
  })

  test('should delete workspace', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    
    // Create workspace
    await page.click('button:has-text("Create Workspace")')
    const timestamp = Date.now()
    await page.fill('input#name', `Delete Test ${timestamp}`)
    await page.click('button[type="submit"]:has-text("Create Workspace")')
    await page.waitForTimeout(1000)
    
    // Navigate to detail
    await page.click(`text=Delete Test ${timestamp}`)
    
    // Handle confirm dialog
    page.on('dialog', dialog => dialog.accept())
    
    // Delete workspace
    await page.click('button:has-text("Delete")')
    
    // Verify redirect to workspaces list
    await page.waitForURL('http://localhost:3000/workspaces')
  })

  test('should show workspace members', async ({ page }) => {
    await page.goto('http://localhost:3000/workspaces')
    
    // Create workspace
    await page.click('button:has-text("Create Workspace")')
    const timestamp = Date.now()
    await page.fill('input#name', `Members Test ${timestamp}`)
    await page.click('button[type="submit"]:has-text("Create Workspace")')
    await page.waitForTimeout(1000)
    
    // Navigate to detail
    await page.click(`text=Members Test ${timestamp}`)
    
    // Verify members section shows owner
    await expect(page.locator('h2:has-text("Members")')).toBeVisible()
    await expect(page.locator('text=owner')).toBeVisible()
  })
})
