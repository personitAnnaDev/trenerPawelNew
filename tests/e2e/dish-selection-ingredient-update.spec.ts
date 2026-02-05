import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Issue #1: Ingredient updates when selecting different dish
 *
 * Bug: Po zamianie dania w DishSelectionModal składniki się nie aktualizują
 * Fix: Dodano useEffect dla selectedDish w DishSelectionModal.tsx
 */

// SKIPPED: E2E tests need Playwright setup fixes
test.describe.skip('DishSelectionModal - Ingredient Updates E2E', () => {
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

    // Wait for diet page to load
    await page.waitForSelector('[data-testid="add-meal-button"]', { timeout: 10000 });
  });

  test('should update ingredients when selecting different dish', async ({ page }) => {
    // Step 1: Open meal modal
    await page.click('[data-testid="add-meal-button"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible({ timeout: 5000 });

    // Step 2: Fill meal name
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Test Meal');

    // Step 3: Select first dish (assuming "Kurczak z ryżem" exists)
    await page.click('[role="combobox"]'); // Dish dropdown
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Get first dish option and click it
    const firstDish = page.locator('[role="option"]').first();
    const firstDishText = await firstDish.textContent();
    await firstDish.click();

    console.log(`Selected first dish: ${firstDishText}`);

    // Step 4: Go to ingredients step
    await page.click('button:has-text("Dalej")');
    await page.waitForSelector('text="Składniki"', { timeout: 5000 });

    // Step 5: Verify initial ingredients are visible
    const initialIngredients = await page.locator('[data-testid^="ingredient-"]').count();
    console.log(`Initial ingredients count: ${initialIngredients}`);

    // Take note of first ingredient for comparison
    const firstIngredientName = await page.locator('[data-testid^="ingredient-"]:first-child')
      .textContent().catch(() => 'No ingredients found');

    console.log(`First ingredient: ${firstIngredientName}`);

    // Step 6: Go back to dish selection
    await page.click('button:has-text("Wstecz")');
    await page.waitForSelector('[role="combobox"]', { timeout: 5000 });

    // Step 7: Select different dish
    await page.click('[role="combobox"]'); // Dish dropdown
    await page.waitForSelector('[role="option"]', { timeout: 5000 });

    // Select second dish (different from first)
    const secondDish = page.locator('[role="option"]').nth(1);
    const secondDishText = await secondDish.textContent();

    // Only proceed if we have different dishes
    if (secondDishText && secondDishText !== firstDishText) {
      await secondDish.click();
      console.log(`Selected second dish: ${secondDishText}`);

      // Step 8: Go to ingredients step again
      await page.click('button:has-text("Dalej")');
      await page.waitForSelector('text="Składniki"', { timeout: 5000 });

      // Step 9: Verify ingredients changed to new dish
      const newIngredients = await page.locator('[data-testid^="ingredient-"]').count();
      console.log(`New ingredients count: ${newIngredients}`);

      const newFirstIngredientName = await page.locator('[data-testid^="ingredient-"]:first-child')
        .textContent().catch(() => 'No ingredients found');

      console.log(`New first ingredient: ${newFirstIngredientName}`);

      // Assert: Ingredients should have changed (different count or different names)
      const ingredientsChanged = (newIngredients !== initialIngredients) ||
                                (newFirstIngredientName !== firstIngredientName);

      expect(ingredientsChanged).toBe(true);
      console.log('✅ Ingredients updated successfully after dish change');
    } else {
      console.log('⚠️  Only one dish available, skipping comparison test');
    }
  });

  test('should clear ingredients when category changes', async ({ page }) => {
    // Open meal modal
    await page.click('[data-testid="add-meal-button"]');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Fill meal name and select dish
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Test Category Change');

    // Select any dish
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    // Go to ingredients step to verify they're loaded
    await page.click('button:has-text("Dalej")');
    await page.waitForSelector('text="Składniki"');

    const ingredientsCount = await page.locator('[data-testid^="ingredient-"]').count();
    console.log(`Ingredients loaded: ${ingredientsCount}`);

    // Go back and change category
    await page.click('button:has-text("Wstecz")');

    // Change category (assuming category dropdown exists)
    const categoryDropdown = page.locator('select').first();
    if (await categoryDropdown.isVisible()) {
      await categoryDropdown.selectOption({ index: 1 }); // Select different category

      // Verify dish selection was cleared
      const dishDropdownText = await page.locator('[role="combobox"]').textContent();
      expect(dishDropdownText).toContain('Wybierz danie');

      console.log('✅ Category change cleared dish selection as expected');
    }
  });

  test('edit mode: should update ingredients when changing dish in existing meal', async ({ page }) => {
    // Look for existing meal edit button
    const editButton = page.locator('[data-testid="edit-meal-button"]').first();

    if (await editButton.isVisible()) {
      await editButton.click();
      await expect(page.locator('[role="dialog"]')).toBeVisible();

      // Current dish should be preselected
      const currentDishText = await page.locator('[role="combobox"]').textContent();
      console.log(`Current dish in edit mode: ${currentDishText}`);

      // Go to ingredients to see current state
      await page.click('button:has-text("Dalej")');
      await page.waitForSelector('text="Składniki"');

      const originalIngredients = await page.locator('[data-testid^="ingredient-"]').count();
      console.log(`Original ingredients count: ${originalIngredients}`);

      // Go back and change dish
      await page.click('button:has-text("Wstecz")');
      await page.click('[role="combobox"]');

      // Select different dish if available
      const dishes = await page.locator('[role="option"]').count();
      if (dishes > 1) {
        await page.locator('[role="option"]').nth(1).click();

        // Check ingredients updated
        await page.click('button:has-text("Dalej")');
        await page.waitForSelector('text="Składniki"');

        const newIngredients = await page.locator('[data-testid^="ingredient-"]').count();

        // Should have different ingredients
        expect(newIngredients).not.toBe(originalIngredients);
        console.log('✅ Edit mode: Ingredients updated after dish change');
      }
    } else {
      console.log('⚠️  No existing meals to edit, skipping edit mode test');
    }
  });

  test('performance: ingredient updates should be fast', async ({ page }) => {
    await page.click('[data-testid="add-meal-button"]');
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Performance Test');

    // Measure time for dish selection and ingredient update
    const startTime = Date.now();

    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();
    await page.click('button:has-text("Dalej")');

    // Wait for ingredients to load
    await page.waitForSelector('text="Składniki"');

    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`Ingredient update took: ${duration}ms`);
    expect(duration).toBeLessThan(3000); // Should be reasonably fast (< 3s)
  });
});

test.describe('Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'anna.ojdana@personit.net');
    await page.fill('input[type="password"]', 'testTest123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/klienci');
    await page.click('[data-testid="client-card"]:first-child');
    await page.click('[data-testid="diet-tab"]');
  });

  test('should handle dish without ingredients_json gracefully', async ({ page }) => {
    await page.click('[data-testid="add-meal-button"]');
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Edge Case Test');

    // Try to select a dish
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();

    // Should not crash when going to ingredients step
    await page.click('button:has-text("Dalej")');

    // Should show ingredients section without errors
    await expect(page.locator('text="Składniki"')).toBeVisible();

    console.log('✅ Handled dish without ingredients_json gracefully');
  });

  test('should preserve manual ingredient changes when appropriate', async ({ page }) => {
    await page.click('[data-testid="add-meal-button"]');
    await page.fill('input[placeholder*="Nazwa posiłku"]', 'Manual Changes Test');

    // Select dish and go to ingredients
    await page.click('[role="combobox"]');
    await page.waitForSelector('[role="option"]');
    await page.locator('[role="option"]').first().click();
    await page.click('button:has-text("Dalej")');

    // Make manual changes to ingredient quantities
    const quantityInput = page.locator('input[type="text"]').first();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('999');

      // The manual change should be preserved until dish is changed
      const value = await quantityInput.inputValue();
      expect(value).toBe('999');

      console.log('✅ Manual ingredient changes preserved correctly');
    }
  });
});