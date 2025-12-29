import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should load home page with sign in and sign up buttons', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Check home page elements
    await expect(page.getByRole('heading', { name: 'ResearchLabs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get Started' })).toBeVisible();
  });

  test('should navigate to signup page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('link', { name: 'Get Started' }).click();
    
    await expect(page).toHaveURL(/.*auth\/signup/);
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.getByRole('link', { name: 'Sign In' }).click();
    
    await expect(page).toHaveURL(/.*auth\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in to ResearchLabs' })).toBeVisible();
  });

  test('should create new account and redirect to dashboard', async ({ page }) => {
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'password123';
    const testName = 'Test User';

    await page.goto('http://localhost:3000/auth/signup');
    
    // Fill signup form
    await page.getByLabel('Display Name').fill(testName);
    await page.getByLabel('Email address').fill(testEmail);
    await page.getByLabel('Password').fill(testPassword);
    
    // Submit form
    await page.getByRole('button', { name: 'Sign up' }).click();
    
    // Wait for redirect to dashboard
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Verify dashboard loaded
    await expect(page.getByText(`Welcome to ResearchLabs!`)).toBeVisible();
    await expect(page.getByText(testEmail)).toBeVisible();
  });

  test('should login with existing account', async ({ page }) => {
    // First create an account
    const timestamp = Date.now();
    const testEmail = `test${timestamp}@example.com`;
    const testPassword = 'password123';

    await page.goto('http://localhost:3000/auth/signup');
    await page.getByLabel('Display Name').fill('Test User');
    await page.getByLabel('Email address').fill(testEmail);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: 'Sign up' }).click();
    await page.waitForURL(/.*dashboard/, { timeout: 10000 });
    
    // Logout
    await page.getByRole('button', { name: 'Sign out' }).click();
    await page.waitForURL(/.*auth\/login/);
    
    // Login again
    await page.getByLabel('Email address').fill(testEmail);
    await page.getByLabel('Password').fill(testPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Verify dashboard
    await page.waitForURL(/.*dashboard/);
    await expect(page.getByText(testEmail)).toBeVisible();
  });

  test('should show error for invalid login credentials', async ({ page }) => {
    await page.goto('http://localhost:3000/auth/login');
    
    await page.getByLabel('Email address').fill('invalid@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign in' }).click();
    
    // Check for error message
    await expect(page.getByText(/Invalid login credentials/i)).toBeVisible();
  });

  test('should protect dashboard route when not authenticated', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Should redirect to login
    await page.waitForURL(/.*auth\/login/);
  });
});
