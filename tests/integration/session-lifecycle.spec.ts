import { test, expect } from '@playwright/test';

test.describe('Session Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should create a new session and navigate to interview room', async ({ page }) => {
    // Click create session button
    await page.click('button:has-text("Create New Session")');

    // Wait for navigation to interview room
    await page.waitForURL(/\/session\/[a-f0-9-]+/, { timeout: 10000 });

    // Verify we're in the interview room
    await expect(page.locator('h2:has-text("Interview Session")')).toBeVisible();
    await expect(page.locator('.connection-status')).toBeVisible();
  });

  test('should display session ID in the header', async ({ page }) => {
    await page.click('button:has-text("Create New Session")');
    await page.waitForURL(/\/session\/[a-f0-9-]+/);

    // Extract session ID from URL
    const url = page.url();
    const sessionIdMatch = url.match(/\/session\/([a-f0-9-]+)/);
    expect(sessionIdMatch).not.toBeNull();

    const sessionId = sessionIdMatch![1];
    
    // Verify session ID is displayed (first 8 characters)
    const sessionIdDisplay = sessionId.substring(0, 8);
    await expect(page.locator(`text=Session: ${sessionIdDisplay}...`)).toBeVisible();
  });

  test('should show connection status', async ({ page }) => {
    await page.click('button:has-text("Create New Session")');
    await page.waitForURL(/\/session\/[a-f0-9-]+/);

    // Wait for WebSocket connection
    await page.waitForTimeout(2000);

    // Check connection status (should be connected)
    const statusIndicator = page.locator('.status-indicator');
    await expect(statusIndicator).toContainText('Connected');
  });

  test('should allow copying session link', async ({ page, context }) => {
    await page.click('button:has-text("Create New Session")');
    await page.waitForURL(/\/session\/[a-f0-9-]+/);

    const sessionUrl = page.url();

    // Mock clipboard
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy link button
    await page.click('button:has-text("Copy Link")');

    // Verify clipboard contains the URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(sessionUrl);
  });
});

