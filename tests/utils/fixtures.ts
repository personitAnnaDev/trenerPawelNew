import { faker } from '@faker-js/faker'
import { SelectedIngredient } from '@/components/IngredientSelector'
import { Product } from '@/utils/supabasePotrawy'
import { NutritionValues } from '@/hooks/useNutritionCalculator'

// Set locale for consistent test data
faker.locale = 'pl'

export interface TestClient {
  id: string
  first_name: string
  last_name: string
  birth_date: string
  gender: string
  height: string
  current_weight: string
  activity_level: number
}

export interface TestProduct extends Product {
  id: string
  name: string
  unit: string
  unit_weight: number
  calories: number
  protein: number
  fat: number
  carbs: number
  fiber: number
}

// Factory functions for test data
export const createTestProduct = (overrides: Partial<TestProduct> = {}): TestProduct => ({
  id: faker.string.uuid(),
  name: faker.food.ingredient(),
  unit: faker.helpers.arrayElement(['gramy', 'sztuki', 'łyżeczka', 'szklanka']),
  unit_weight: faker.number.int({ min: 1, max: 200 }),
  calories: faker.number.int({ min: 50, max: 500 }),
  protein: faker.number.float({ min: 0, max: 30, fractionDigits: 1 }),
  fat: faker.number.float({ min: 0, max: 20, fractionDigits: 1 }),
  carbs: faker.number.float({ min: 0, max: 80, fractionDigits: 1 }),
  fiber: faker.number.float({ min: 0, max: 10, fractionDigits: 1 }),
  ...overrides,
})

export const createTestIngredient = (
  productId?: string,
  overrides: Partial<SelectedIngredient> = {}
): SelectedIngredient => ({
  id: faker.string.uuid(),
  productId: productId || faker.string.uuid(),
  productName: faker.food.ingredient(),
  quantity: faker.number.float({ min: 10, max: 500, fractionDigits: 1 }),
  unit: faker.helpers.arrayElement(['gramy', 'sztuki', 'łyżeczka']),
  unit_weight: faker.number.int({ min: 1, max: 200 }),
  ...overrides,
})

export const createTestClient = (overrides: Partial<TestClient> = {}): TestClient => ({
  id: faker.string.uuid(),
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  birth_date: faker.date.birthdate({ min: 18, max: 70, mode: 'age' }).toLocaleDateString('pl-PL'),
  gender: faker.helpers.arrayElement(['mężczyzna', 'kobieta']),
  height: faker.number.int({ min: 150, max: 200 }).toString(),
  current_weight: faker.number.float({ min: 50, max: 120, fractionDigits: 1 }).toString(),
  activity_level: faker.number.float({ min: 1.2, max: 2.4, fractionDigits: 1 }),
  ...overrides,
})

// Specific product fixtures for consistent testing
export const TEST_PRODUCTS = {
  CHICKEN_BREAST: createTestProduct({
    id: 'chicken-breast-id',
    name: 'Pierś z kurczaka',
    unit: 'gramy',
    unit_weight: 100,
    calories: 165,
    protein: 31.0,
    fat: 3.6,
    carbs: 0.0,
    fiber: 0.0,
  }),
  
  BROWN_RICE: createTestProduct({
    id: 'brown-rice-id', 
    name: 'Ryż brązowy',
    unit: 'gramy',
    unit_weight: 100,
    calories: 363,
    protein: 7.2,
    fat: 2.9,
    carbs: 72.9,
    fiber: 3.4,
  }),

  OLIVE_OIL: createTestProduct({
    id: 'olive-oil-id',
    name: 'Oliwa z oliwek',
    unit: 'łyżka',
    unit_weight: 14, // 1 tablespoon = ~14g
    calories: 884,
    protein: 0.0,
    fat: 100.0,
    carbs: 0.0,
    fiber: 0.0,
  }),

  BANANA: createTestProduct({
    id: 'banana-id',
    name: 'Banan',
    unit: 'sztuki',
    unit_weight: 120, // average banana weight
    calories: 89,
    protein: 1.1,
    fat: 0.3,
    carbs: 22.8,
    fiber: 2.6,
  }),
}

// Client test fixtures
export const TEST_CLIENTS = {
  AVERAGE_MALE: createTestClient({
    id: 'male-client-id',
    first_name: 'Jan',
    last_name: 'Kowalski', 
    birth_date: '15.05.1990',
    gender: 'mężczyzna',
    height: '180',
    current_weight: '80.0',
    activity_level: 1.6,
  }),

  AVERAGE_FEMALE: createTestClient({
    id: 'female-client-id',
    first_name: 'Anna',
    last_name: 'Nowak',
    birth_date: '22.03.1995',
    gender: 'kobieta',
    height: '165',
    current_weight: '60.0', 
    activity_level: 1.4,
  }),
}

// Expected calculation results for testing (updated based on actual ages)
export const EXPECTED_BMR = {
  MALE_34_80KG_180CM: 1825, // Harris-Benedict for TEST_CLIENTS.AVERAGE_MALE (age ~34 in 2025)
  FEMALE_29_60KG_165CM: 1384, // Harris-Benedict for TEST_CLIENTS.AVERAGE_FEMALE (age ~29 in 2025)
}

export const EXPECTED_NUTRITION = {
  CHICKEN_RICE_MEAL: {
    // 200g chicken + 100g rice + 1 tbsp olive oil
    kcal: 165*2 + 363 + 884*(14/100), // 330 + 363 + 124 = 817
    białko: 31*2 + 7.2 + 0, // 62 + 7.2 = 69.2
    tłuszcz: 3.6*2 + 2.9 + 100*(14/100), // 7.2 + 2.9 + 14 = 24.1
    węglowodany: 0 + 72.9 + 0, // 72.9
    błonnik: 0 + 3.4 + 0, // 3.4
  } as NutritionValues,
}

// Factory for creating multiple test items
export const createTestProducts = (count: number): TestProduct[] =>
  Array.from({ length: count }, () => createTestProduct())

export const createTestIngredients = (count: number, productIds?: string[]): SelectedIngredient[] =>
  Array.from({ length: count }, (_, i) => 
    createTestIngredient(productIds?.[i % productIds.length])
  )

export const createTestClients = (count: number): TestClient[] =>
  Array.from({ length: count }, () => createTestClient())

// Edge case test data
export const EDGE_CASE_DATA = {
  EXTREME_NUTRITION: createTestProduct({
    id: 'extreme-product',
    name: 'Extreme Product',
    calories: 9999,
    protein: 999.9,
    fat: 999.9,
    carbs: 999.9,
    fiber: 999.9,
  }),

  ZERO_NUTRITION: createTestProduct({
    id: 'zero-product',
    name: 'Water',
    calories: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    fiber: 0,
  }),

  ELDERLY_CLIENT: createTestClient({
    birth_date: '01.01.1940', // 84 years old
    gender: 'mężczyzna',
    height: '170',
    current_weight: '70.0',
  }),

  YOUNG_CLIENT: createTestClient({
    birth_date: '01.01.2005', // 19 years old  
    gender: 'kobieta',
    height: '160',
    current_weight: '55.0',
  }),
}