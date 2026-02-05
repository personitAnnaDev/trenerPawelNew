# Test Suite - TrenerPaweł

This directory contains comprehensive unit and integration tests for the TrenerPaweł diet management application.

## Quick Start

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode (for development)
npm run test:watch

# Run tests with UI dashboard
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

```
tests/
├── setup.ts                 # Global test configuration and mocks
├── utils/
│   ├── testUtils.tsx        # React Testing Library setup and utilities
│   └── fixtures.ts          # Test data factories and fixtures
├── unit/
│   ├── nutrition.test.ts    # Nutrition calculation logic tests
│   ├── calorieCalculation.test.ts # BMR/TDEE calculation tests
│   └── formatting.test.ts   # Polish formatting and unit conversion tests
├── integration/
│   ├── mealCreation.test.tsx         # Complete meal creation workflow
│   └── clientDietManagement.test.tsx # Client diet management workflow
├── BUSINESS_RULES.md        # Business rules mapped to code
├── PLAN.md                  # Complete test scenarios and acceptance criteria
└── README.md               # This file
```

## Test Framework and Tools

- **Vitest**: Modern test runner built on Vite
- **React Testing Library**: Component testing utilities
- **@faker-js/faker**: Test data generation
- **jsdom**: Browser environment simulation

### Why Vitest?

Vitest was chosen because:
- Native TypeScript support with zero configuration
- Built on Vite for fast execution and hot reload
- Jest-compatible API for easy migration
- Excellent ES module support
- Built-in coverage reporting with v8

## Business Logic Coverage

### Core Domains Tested:

1. **Nutrition Calculations** (`useNutritionCalculator`)
   - Multi-ingredient meal calculations
   - Unit conversion accuracy (grams, pieces, tablespoons)
   - Edge cases (missing products, zero quantities)
   - Polish formatting and rounding rules

2. **Calorie Calculations** (Harris-Benedict BMR/TDEE)
   - Gender-specific BMR formulas
   - Activity factor multipliers
   - Age calculation from DD.MM.YYYY format
   - Edge cases (extreme parameters, invalid data)

3. **Formatting Utilities**
   - Polish unit abbreviations
   - Comma decimal separators
   - Number grouping with spaces
   - Unicode and diacritic handling

4. **Integration Workflows**
   - Complete meal creation with multiple ingredients
   - Client diet management and macro tracking
   - Template application and customization
   - State persistence and concurrent operations

## Test Data and Fixtures

### Realistic Test Products:
- **Chicken Breast**: 165 kcal, 31g protein, 3.6g fat per 100g
- **Brown Rice**: 363 kcal, 7.2g protein, 2.9g fat, 72.9g carbs per 100g
- **Olive Oil**: 884 kcal, 100g fat per 100g (14g per tablespoon)
- **Banana**: 89 kcal, 1.1g protein, 22.8g carbs per piece (120g average)

### Client Profiles:
- **Average Male**: 30 years, 80kg, 180cm, activity level 1.6
- **Average Female**: 25 years, 60kg, 165cm, activity level 1.4
- **Edge Cases**: Elderly, young adult, extreme body compositions

## Environment Setup

### Required Environment Variables:
```bash
# These are mocked in tests, but may be needed for integration tests
VITE_SUPABASE_URL=https://test.supabase.co
VITE_SUPABASE_ANON_KEY=test-anon-key
```

### Mocked Dependencies:
- Supabase client and auth methods
- UUID generation (uses deterministic test IDs)
- Browser APIs (ResizeObserver, IntersectionObserver)
- Import.meta.env for environment variables

## Coverage Targets

Current coverage thresholds (see `vitest.config.ts`):
- **Branches**: 60%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Excluded from Coverage:
- UI library components (`src/components/ui/`)
- Configuration files (`*.config.*`)
- Type definitions (`*.d.ts`)
- Entry points (`main.tsx`, `App.tsx`)

## Running Tests Locally

### Prerequisites:
1. Node.js 18+ and npm installed
2. All dependencies installed (`npm install`)
3. No additional containers or services required

### Development Workflow:
```bash
# Start test watcher for TDD
npm run test:watch

# Run specific test file
npm run test:unit nutrition.test.ts

# Run tests with coverage
npm run test:coverage

# Open coverage report
open coverage/index.html
```

### Debugging Tests:
```bash
# Run single test with detailed output
npm run test:unit -- --reporter=verbose nutrition.test.ts

# Run with UI for interactive debugging
npm run test:ui
```

## Continuous Integration

Tests are designed to run in CI environments with:
- **Unit Tests**: < 30 seconds execution time
- **Integration Tests**: < 2 minutes execution time
- **No external dependencies**: All services mocked
- **Deterministic**: No flaky tests or random failures

### CI Configuration Example:
```yaml
- name: Run Tests
  run: |
    npm ci
    npm run test:coverage
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/coverage-final.json
```

## Test Patterns and Best Practices

### Unit Test Patterns:
```typescript
// Use descriptive test names matching business rules
it('should calculate correct BMR for average male (BR-1)', () => {
  // Given: Clear test setup
  const client = TEST_CLIENTS.AVERAGE_MALE
  
  // When: Single action under test
  const bmr = calculateBMR(weight, height, age, gender)
  
  // Then: Specific assertions with tolerance
  expect(bmr).toBeCloseTo(1896, 0) // Within 1 calorie
})
```

### Integration Test Patterns:
```typescript
// Test complete workflows, not individual functions
it('should create meal with multiple ingredients and calculate nutrition', () => {
  // Given: Complex meal setup
  const ingredients = [/* multiple ingredients */]
  
  // When: Complete workflow execution
  const result = useNutritionCalculator(ingredients, products)
  
  // Then: End-to-end verification
  expect(result.kcal).toBeCloseTo(expectedTotal, 0)
  // Verify side effects, state changes, etc.
})
```

### Fixture Usage:
```typescript
import { TEST_PRODUCTS, createTestClient } from '../utils/fixtures'

// Use predefined fixtures for consistency
const chicken = TEST_PRODUCTS.CHICKEN_BREAST

// Create custom fixtures for specific tests
const customClient = createTestClient({ 
  gender: 'mężczyzna', 
  current_weight: '90.0' 
})
```

## Troubleshooting

### Common Issues:

1. **Mock Errors**: Ensure all external dependencies are mocked in `setup.ts`
2. **Type Errors**: Check that test utilities properly extend global types
3. **Flaky Tests**: Use deterministic test data and avoid time-sensitive logic
4. **Coverage Issues**: Verify files are included in coverage configuration

### Getting Help:

- Check `tests/BUSINESS_RULES.md` for domain-specific requirements
- Review `tests/PLAN.md` for test scenario details
- Examine existing test files for patterns and examples
- Run tests with `--reporter=verbose` for detailed output