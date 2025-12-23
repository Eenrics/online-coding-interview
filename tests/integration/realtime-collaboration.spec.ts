import { test, expect } from '@playwright/test';

test.describe('Real-Time Collaboration', () => {
  test('should synchronize code changes between multiple browsers', async ({ browser }) => {
    // Create two browser contexts (simulating two users)
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1: Create session
      await page1.goto('/');
      await page1.click('button:has-text("Create New Session")');
      await page1.waitForURL(/\/session\/[a-f0-9-]+/);
      const sessionUrl = page1.url();

      // Wait for connection
      await page1.waitForTimeout(2000);
      await expect(page1.locator('.status-indicator:has-text("Connected")')).toBeVisible();

      // User 2: Join session via URL
      await page2.goto(sessionUrl);
      await page2.waitForTimeout(2000);
      await expect(page2.locator('.status-indicator:has-text("Connected")')).toBeVisible();

      // User 1: Type code in editor
      const editor1 = page1.locator('.monaco-editor');
      // Monaco editor needs special handling - use fill or evaluate
      await editor1.click();
      await page1.waitForTimeout(200); // Wait for editor to be ready
      
      // Clear and type new code using keyboard
      await page1.keyboard.press('Control+A');
      await page1.waitForTimeout(100);
      await page1.keyboard.press('Delete');
      await page1.waitForTimeout(100);
      await page1.keyboard.type('const test = "Hello from User 1";');

      // Wait for code to sync (longer wait for WebSocket)
      await page1.waitForTimeout(1500);

      // User 2: Verify code appears
      const editor2 = page2.locator('.monaco-editor');
      await expect(editor2).toContainText('Hello from User 1', { timeout: 10000 });

      // User 2: Make a change
      await editor2.click();
      await page2.waitForTimeout(200);
      await page2.keyboard.press('Control+A');
      await page2.waitForTimeout(100);
      await page2.keyboard.press('Delete');
      await page2.waitForTimeout(100);
      await page2.keyboard.type('const test = "Hello from User 2";');

      // Wait for sync
      await page2.waitForTimeout(1500);

      // User 1: Verify change appears
      await expect(editor1).toContainText('Hello from User 2', { timeout: 10000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should update user count when multiple users join', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session
      await page1.goto('/');
      await page1.click('button:has-text("Create New Session")');
      await page1.waitForURL(/\/session\/[a-f0-9-]+/);
      const sessionUrl = page1.url();

      await page1.waitForTimeout(2000);

      // Verify initial user count (1 user)
      await expect(page1.locator('.users-count')).toContainText('1 user');

      // User 2 joins
      await page2.goto(sessionUrl);
      await page2.waitForTimeout(3000); // Wait for connection

      // Wait for both pages to be connected
      await expect(page1.locator('.status-indicator:has-text("Connected")')).toBeVisible();
      await expect(page2.locator('.status-indicator:has-text("Connected")')).toBeVisible();
      
      // Wait for presence updates - this might take time for WebSocket to propagate
      // Check that user count increases (might be 1 or 2 depending on timing)
      const userCount1 = await page1.locator('.users-count').textContent();
      const userCount2 = await page2.locator('.users-count').textContent();
      
      // At least one should show 2 users after waiting
      await page1.waitForTimeout(5000); // Wait for presence update
      await page2.waitForTimeout(5000);
      
      // Both should eventually see 2 users (format: "2 users online")
      await expect(page1.locator('.users-count')).toContainText('2 users', { timeout: 15000 });
      await expect(page2.locator('.users-count')).toContainText('2 users', { timeout: 15000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });

  test('should synchronize language changes', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      // User 1 creates session
      await page1.goto('/');
      await page1.click('button:has-text("Create New Session")');
      await page1.waitForURL(/\/session\/[a-f0-9-]+/);
      const sessionUrl = page1.url();

      await page1.waitForTimeout(2000);

      // User 2 joins
      await page2.goto(sessionUrl);
      await page2.waitForTimeout(2000);

      // User 1 changes language
      await page1.selectOption('select', 'typescript');
      await page1.waitForTimeout(500);

      // User 2 should see language change
      await expect(page2.locator('select')).toHaveValue('typescript', { timeout: 5000 });
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});

