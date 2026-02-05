# E2E Tests for Issue #4: Meal Day Assignment Race Conditions

## Overview

This test suite is designed to detect and prevent race conditions in the `ClientDietManager` component where meals could be saved to wrong days due to state management issues with `currentDayId`.

## Test Files

### `meal-day-assignment-race-condition.spec.ts`
- **Purpose**: Test race conditions that could cause meals to be saved to wrong days
- **Scenarios Covered**:
  1. **Rapid day switching during meal addition**
  2. **Modal close timing during save operations**
  3. **Edit mode day switching scenarios**
  4. **Multiple rapid modal interactions**
  5. **Debug console monitoring**
  6. **Performance under race conditions**

## Running the Tests

### Prerequisites
1. Install Playwright dependencies:
   ```bash
   pnpm install @playwright/test
   npx playwright install
   ```

2. Ensure the development server is running:
   ```bash
   pnpm dev
   ```

### Test Commands

```bash
# Run all E2E tests
pnpm test:e2e

# Run with UI for debugging
pnpm test:e2e:ui

# Run in headed mode (visible browser)
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug

# Run only Issue #4 race condition tests
pnpm test:e2e:critical

# Run all tests (unit + integration + e2e)
pnpm test:all
```

## Debug Integration

The tests are designed to work with the debug logging added to `ClientDietManager.tsx`:

```typescript
// Debug logs captured in tests
console.log('🔍 [Issue #4 DEBUG] currentDayId changed:', {
  currentDayId,
  timestamp: new Date().toISOString()
});
```

## Test Environment Setup

- **Base URL**: `http://localhost:8080`
- **Test Data**: Uses existing test account (`anna.ojdana@personit.net`)
- **Prerequisites**: At least 2 day plans in client diet for proper race condition testing

## Expected Outcomes

### ✅ Success Criteria
- Meals are saved to the correct day they were initiated from
- No race conditions between `currentDayId` state changes
- Modal state remains consistent during rapid interactions
- Save operations complete successfully even under stress

### ❌ Failure Indicators
- Meals appear in wrong days after save
- Console errors during state transitions
- Modal state inconsistencies
- Save operations timing out or failing

## Debug Console Analysis

The tests automatically capture and analyze debug console output:
```
📊 DEBUG LOG ANALYSIS (X entries):
1. 🔍 [Issue #4 DEBUG] handleAddMeal called: {dayId: "day-1", timestamp: "..."}
2. 🔍 [Issue #4 DEBUG] currentDayId changed: {currentDayId: "day-2", timestamp: "..."}
3. 🔍 [Issue #4 DEBUG] handleSaveMeal START: {currentDayId: "day-2", isEditing: false, ...}
```

## Integration with CI/CD

These tests are designed to be run in CI/CD pipelines:
- **Retry policy**: 2 retries on CI, 0 locally
- **Browser coverage**: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Reporting**: HTML + JSON reports generated
- **Artifacts**: Screenshots and videos on failures

## Manual Testing Scenarios

If automated tests pass but manual testing reveals issues, try these scenarios:
1. Very rapid day switching while modal is opening
2. Network delays during save operations
3. Browser back/forward navigation during meal creation
4. Multiple browser tabs editing same client simultaneously

## Next Steps

After running these tests:
1. **If tests PASS**: Race conditions are handled correctly
2. **If tests FAIL**: Analyze debug logs and implement state management fixes
3. **For new bugs**: Add additional test scenarios to this suite

## Maintenance

- Update test selectors when UI changes
- Expand scenarios based on new race condition discoveries
- Keep test data synchronized with development environment
- Monitor test performance and optimize for CI/CD speed