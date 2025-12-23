import { test, expect } from '@playwright/test';

test.describe('Code Execution', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('button:has-text("Create New Session")');
    await page.waitForURL(/\/session\/[a-f0-9-]+/);
    await page.waitForTimeout(2000); // Wait for connection
  });

  test('should execute JavaScript code and display output', async ({ page }) => {
    // Type code in editor
    const editor = page.locator('.monaco-editor');
    await editor.click();
    // Select all using keyboard shortcut (Playwright handles platform differences)
    await page.keyboard.press('Control+A');
    await page.keyboard.type('console.log("Hello, World!");');

    // Click run button
    await page.click('button:has-text("Run Code")');

    // Wait for execution
    await page.waitForTimeout(1000);

    // Verify output appears
    const outputConsole = page.locator('.output-console-content');
    await expect(outputConsole).toContainText('Hello, World!', { timeout: 5000 });
  });

  test('should display error for invalid code', async ({ page }) => {
    // Type invalid code that will cause a runtime error
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('throw new Error("Test error");');

    // Run code
    await page.click('button:has-text("Run Code")');
    await page.waitForTimeout(2000);

    // Verify error is displayed - check for error text in output
    const outputConsole = page.locator('.output-console-content');
    // Error might be in .output-result.output-error or just contain error text
    await expect(outputConsole).toContainText('Error', { timeout: 5000 });
  });

  test('should show execution time', async ({ page }) => {
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('console.log("test");');

    await page.click('button:has-text("Run Code")');
    await page.waitForTimeout(1000);

    // Check for execution time display
    const executionTime = page.locator('.execution-time');
    await expect(executionTime).toBeVisible({ timeout: 5000 });
    await expect(executionTime).toContainText('ms');
  });

  test('should disable run button while executing', async ({ page }) => {
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');
    // Use code that takes longer to execute
    await page.keyboard.type('for(let i=0; i<1000000; i++) {}; console.log("done");');

    const runButton = page.locator('button:has-text("Run Code")');
    
    // Click run and check button state immediately
    const clickPromise = runButton.click();
    
    // Check if button text changes to "Running..." or button becomes disabled
    // The button might be too fast, so we check for either condition
    try {
      await expect(runButton.locator('text=Running...')).toBeVisible({ timeout: 500 });
    } catch {
      // If "Running..." doesn't appear, check if button is disabled
      await expect(runButton).toBeDisabled({ timeout: 500 });
    }
    
    await clickPromise;
    
    // Wait for execution to complete
    await page.waitForTimeout(3000);
    
    // Button should be enabled again with original text
    await expect(runButton).toContainText('Run Code', { timeout: 5000 });
  });
});

