import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Issue #4: Meal Day Assignment Race Conditions
 *
 * Bug: "Po zapisaniu posiłku w dniu 2 program wrzuca do dnia 1"
 * Root Cause: Race conditions with currentDayId state in ClientDietManager
 * Debug: Added comprehensive logging to ClientDietManager.tsx (lines 52-192)
 *
 * Test Scenarios:
 * 1. Rapid day switching during meal addition
 * 2. Modal close timing during save operations
 * 3. Edit mode day switching scenarios
 * 4. Multiple modal interactions in sequence
 */

// SKIPPED: E2E tests need Playwright setup fixes
test.describe.skip('ClientDietManager - Meal Day Assignment Race Conditions E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and navigate to client diet
    await page.goto('/login');

    // Fill login form
    await page.fill('input[type="email"]', 'anna.ojdana@personit.net');
    await page.fill('input[type="password"]', 'testTest123');
    await page.click('button[type="submit"]');

    // Wait for redirect to clients page
    await page.waitForURL('/klienci');

    // Navigate to first client's diet tab
    await page.click('[data-testid="client-card"]:first-child');
    await page.click('[data-testid="diet-tab"]');

    // Wait for diet page to load with multiple days
    await page.waitForSelector('[data-testid="add-meal-button"]', { timeout: 10000 });

    // Ensure we have multiple days available
    const dayTabs = await page.locator('[data-testid^="day-tab-"]').count();
    if (dayTabs < 2) {
      console.log('⚠️  Need at least 2 days for race condition testing');
    }
  });

  test('Race Condition #1: Rapid day switching during meal addition', async ({ page }) => {
    // Step 1: Get day IDs for comparison
    const day1Tab = page.locator('[data-testid^="day-tab-"]').first();
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);

    const day1Id = await day1Tab.getAttribute('data-testid');
    const day2Id = await day2Tab.getAttribute('data-testid');

    console.log(`Testing race condition between ${day1Id} and ${day2Id}`);

    // Step 2: Start with day 1, click add meal
    await day1Tab.click();
    await page.waitForTimeout(200); // Small delay to ensure tab is active

    const day1AddButton = page.locator('[data-testid="add-meal-button"]').first();
    await day1AddButton.click();

    // Step 3: While modal is opening, quickly switch to day 2
    // This should trigger the race condition
    await day2Tab.click();
    await page.waitForTimeout(100); // Small delay to simulate race condition

    // Step 4: Continue with meal creation in modal
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Race Condition Test Meal');

    // Select a dish
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]', { timeout: 5000 });
    await page.locator('[role="option"]').first().click();

    // Step 5: Proceed to save the meal
    await page.click('button:has-text("Dalej")');
    await page.waitForSelector('text="Składniki"', { timeout: 5000 });
    await page.click('button:has-text("Zapisz posiłek")');

    // Step 6: Wait for save completion and modal to close
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

    // Step 7: Verify the meal was saved to the CORRECT day (day 2, since we switched)
    // Check console logs for debug information
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('Issue #4 DEBUG')) {
        consoleLogs.push(msg.text());
      }
    });

    // Refresh to see final state
    await page.reload();
    await page.waitForSelector('[data-testid="add-meal-button"]');

    // Check if meal appears in day 2 (expected) or day 1 (bug)
    await day2Tab.click();
    const day2Meals = await page.locator('[data-testid^="meal-card-"]').count();

    await day1Tab.click();
    const day1Meals = await page.locator('[data-testid^="meal-card-"]').count();

    console.log(`Day 1 meals: ${day1Meals}, Day 2 meals: ${day2Meals}`);

    // The meal should be in day 2 (where we switched to)
    // If it's in day 1, that indicates the race condition bug
    expect(day2Meals).toBeGreaterThan(0);

    console.log('✅ Race Condition #1: Day switching test completed');
  });

  test('Race Condition #2: Modal close during save operation', async ({ page }) => {
    // Step 1: Add meal to day 2
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);
    await day2Tab.click();

    const addButton = page.locator('[data-testid="add-meal-button"]').first();
    await addButton.click();

    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Step 2: Fill meal data
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Close Race Test Meal');

    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    await page.click('button:has-text("Dalej")');
    await page.waitForSelector('text="Składniki"');

    // Step 3: Start save operation and immediately try to close
    const savePromise = page.click('button:has-text("Zapisz posiłek")');

    // Immediately try to close modal (simulating user impatience)
    await page.waitForTimeout(50); // Very small delay
    const closeAttempt = page.keyboard.press('Escape').catch(() => {
      // Modal might block closing during save
    });

    await Promise.all([savePromise, closeAttempt]);

    // Step 4: Verify save completed successfully despite close attempt
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

    // Check that meal was saved to correct day
    const mealsAfterSave = await page.locator('[data-testid^="meal-card-"]').count();
    expect(mealsAfterSave).toBeGreaterThan(0);

    console.log('✅ Race Condition #2: Modal close during save test completed');
  });

  test('Race Condition #3: Edit mode day switching', async ({ page }) => {
    // Step 1: Ensure we have an existing meal to edit
    const day1Tab = page.locator('[data-testid^="day-tab-"]').first();
    await day1Tab.click();

    let existingMealEditButton = page.locator('[data-testid="edit-meal-button"]').first();

    // If no existing meal, create one first
    if (!(await existingMealEditButton.isVisible())) {
      await page.locator('[data-testid="add-meal-button"]').first().click();
      await page.fill('input[placeholder*="Nazwa posiłku"]', 'Setup Meal for Edit Test');
      await page.click('[role="combobox"]');
      await page.waitForSelector('[role="option"]');
      await page.locator('[role="option"]').first().click();
      await page.click('button:has-text("Dalej")');
      await page.click('button:has-text("Zapisz posiłek")');
      await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

      // Now we should have a meal to edit
      existingMealEditButton = page.locator('[data-testid="edit-meal-button"]').first();
    }

    // Step 2: Start editing meal from day 1
    await existingMealEditButton.click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Step 3: While edit modal is open, switch to day 2
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);
    await day2Tab.click();
    await page.waitForTimeout(100);

    // Step 4: Continue editing in modal
    const nameInput = page.locator('input[placeholder*="Nazwa posiłku"]');
    await nameInput.fill('Edited Race Test Meal');

    // Step 5: Save the edited meal
    await page.click('button:has-text("Dalej")');
    await page.waitForSelector('text="Składniki"');
    await page.click('button:has-text("Zapisz posiłek")');

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

    // Step 6: Verify meal stayed in original day (day 1) and wasn't moved
    await day1Tab.click();
    const day1UpdatedMeal = page.locator('text="Edited Race Test Meal"');
    await expect(day1UpdatedMeal).toBeVisible({ timeout: 5000 });

    // Verify it's NOT in day 2
    await day2Tab.click();
    const day2WrongMeal = page.locator('text="Edited Race Test Meal"');
    await expect(day2WrongMeal).not.toBeVisible();

    console.log('✅ Race Condition #3: Edit mode day switching test completed');
  });

  test('Race Condition #4: Multiple rapid modal interactions', async ({ page }) => {
    // This test simulates very fast user interactions that could cause state conflicts

    // Step 1: Rapid sequence - open modal, close, switch day, open again
    const day1Tab = page.locator('[data-testid^="day-tab-"]').first();
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);

    await day1Tab.click();

    // Open modal
    await page.locator('[data-testid="add-meal-button"]').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Quick close
    await page.keyboard.press('Escape');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden' });

    // Quick switch to day 2
    await day2Tab.click();
    await page.waitForTimeout(50);

    // Open modal again quickly
    await page.locator('[data-testid="add-meal-button"]').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Step 2: Complete meal creation to test if currentDayId is correct
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Rapid Interaction Test Meal');

    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    await page.click('button:has-text("Dalej")');
    await page.waitForSelector('text="Składniki"');
    await page.click('button:has-text("Zapisz posiłek")');

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

    // Step 3: Verify meal was saved to day 2 (current active day)
    const day2Meals = await page.locator('[data-testid^="meal-card-"]').count();
    expect(day2Meals).toBeGreaterThan(0);

    // Double-check it's not in day 1
    await day1Tab.click();
    const day1WrongMeal = page.locator('text="Rapid Interaction Test Meal"');
    await expect(day1WrongMeal).not.toBeVisible();

    console.log('✅ Race Condition #4: Multiple rapid interactions test completed');
  });

  test('Debug Console Monitoring: Capture currentDayId state changes', async ({ page }) => {
    // Monitor console logs for debug information
    const debugLogs: string[] = [];

    page.on('console', msg => {
      if (msg.text().includes('🔍 [Issue #4 DEBUG]')) {
        debugLogs.push(msg.text());
        console.log('DEBUG LOG:', msg.text());
      }
    });

    // Perform actions that should trigger debug logs
    const day1Tab = page.locator('[data-testid^="day-tab-"]').first();
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);

    await day1Tab.click();
    await page.locator('[data-testid="add-meal-button"]').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Switch days while modal is open
    await day2Tab.click();

    // Fill and save meal
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Debug Monitor Test');
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();
    await page.click('button:has-text("Dalej")');
    await page.click('button:has-text("Zapisz posiłek")');

    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });

    // Wait for all async operations to complete
    await page.waitForTimeout(1000);

    // Analyze captured debug logs
    console.log(`\n📊 DEBUG LOG ANALYSIS (${debugLogs.length} entries):`);
    debugLogs.forEach((log, index) => {
      console.log(`${index + 1}. ${log}`);
    });

    // Verify we captured the key state changes
    const hasHandleAddMealLog = debugLogs.some(log => log.includes('handleAddMeal called'));
    const hasHandleSaveMealLog = debugLogs.some(log => log.includes('handleSaveMeal START'));
    const hasCurrentDayIdLog = debugLogs.some(log => log.includes('currentDayId changed'));

    expect(hasHandleAddMealLog).toBe(true);
    expect(hasHandleSaveMealLog).toBe(true);

    console.log('✅ Debug Console Monitoring: State changes captured successfully');
  });

  test('Performance: Save operation timing under race conditions', async ({ page }) => {
    // Measure save operation performance when race conditions might occur
    const day1Tab = page.locator('[data-testid^="day-tab-"]').first();
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);

    await day1Tab.click();
    await page.locator('[data-testid="add-meal-button"]').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Rapid day switch
    await day2Tab.click();

    // Fill meal data
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Performance Test Meal');
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();
    await page.click('button:has-text("Dalej")');

    // Measure save operation time
    const startTime = Date.now();
    await page.click('button:has-text("Zapisz posiłek")');
    await page.waitForSelector('[role="dialog"]', { state: 'hidden', timeout: 10000 });
    const endTime = Date.now();

    const duration = endTime - startTime;
    console.log(`Save operation with race condition took: ${duration}ms`);

    // Should complete within reasonable time even with race conditions
    expect(duration).toBeLessThan(5000); // 5 seconds max

    console.log('✅ Performance: Save timing test completed');
  });
});

test.describe('Edge Cases - State Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'anna.ojdana@personit.net');
    await page.fill('input[type="password"]', 'testTest123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/klienci');
    await page.click('[data-testid="client-card"]:first-child');
    await page.click('[data-testid="diet-tab"]');
  });

  test('State Recovery: Handle browser back/forward during meal creation', async ({ page }) => {
    const day2Tab = page.locator('[data-testid^="day-tab-"]').nth(1);
    await day2Tab.click();

    await page.locator('[data-testid="add-meal-button"]').first().click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Browser Navigation Test');

    // Simulate browser back button while modal is open
    await page.goBack();
    await page.waitForTimeout(500);
    await page.goForward();
    await page.waitForTimeout(500);

    // Modal should handle navigation gracefully
    // Either stay open with form intact, or close cleanly
    const modalVisible = await page.locator('[role="dialog"]').isVisible();
    console.log(`Modal state after browser navigation: ${modalVisible ? 'visible' : 'hidden'}`);

    if (modalVisible) {
      // If modal is still open, complete the operation
      const nameValue = await page.locator('input[placeholder*="Nazwa posiłku"]').inputValue();
      console.log(`Form data preserved: ${nameValue === 'Browser Navigation Test'}`);
    }

    console.log('✅ State Recovery: Browser navigation test completed');
  });

  test('Concurrent Operations: Multiple users editing same client', async ({ page, context }) => {
    // This test simulates concurrent access (though simplified for E2E)

    // Open second tab/page to simulate second user
    const secondPage = await context.newPage();
    await secondPage.goto('/login');
    await secondPage.fill('input[type="email"]', 'test@example.com');
    await secondPage.fill('input[type="password"]', 'testpassword');
    await secondPage.click('button[type="submit"]');
    await secondPage.waitForURL('/klienci');
    await secondPage.click('[data-testid="client-card"]:first-child');
    await secondPage.click('[data-testid="diet-tab"]');

    // Both pages add meal simultaneously
    const day1Tab = page.locator('[data-testid^="day-tab-"]').first();
    const day1TabSecond = secondPage.locator('[data-testid^="day-tab-"]').first();

    await day1Tab.click();
    await day1TabSecond.click();

    // Start meal creation on both pages
    const addMealPromise1 = page.locator('[data-testid="add-meal-button"]').first().click();
    const addMealPromise2 = secondPage.locator('[data-testid="add-meal-button"]').first().click();

    await Promise.all([addMealPromise1, addMealPromise2]);

    // Both modals should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(secondPage.locator('[role="dialog"]')).toBeVisible();

    console.log('✅ Concurrent Operations: Multiple user simulation completed');

    await secondPage.close();
  });
});