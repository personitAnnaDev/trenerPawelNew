import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'

/**
 * TDD RED Phase - Batch INSERT for restoreDietSnapshot
 *
 * BASELINE MEASUREMENT (2025-11-25):
 * - INSERT data (2 days, 30 meals) - SEQUENTIAL: 18362ms
 * - restoreDietSnapshot TOTAL: 19219ms
 *
 * TARGET AFTER OPTIMIZATION:
 * - INSERT data: ~300-500ms (40x improvement)
 * - restoreDietSnapshot TOTAL: ~1500-2000ms (10x improvement)
 *
 * PROBLEM: Current implementation uses sequential INSERT in nested loops
 * - 1 INSERT per day_plan (2 queries)
 * - 1 INSERT per client_diet_settings (2 queries)
 * - 1 INSERT per meal (30 queries) ⚠️ MAIN BOTTLENECK
 * - 1 INSERT per meal's ingredients (30 queries)
 * TOTAL: 64 queries for 2 days, 30 meals
 *
 * SOLUTION: Batch INSERT with client-side UUID generation
 * - 1 batch INSERT for all day_plans
 * - 1 batch INSERT for all client_diet_settings
 * - 1 batch INSERT for all meals
 * - 1 batch INSERT for all ingredients
 * TOTAL: 4 queries regardless of data size
 */

// Mock snapshot data structure
const createTestSnapshotData = (daysCount: number, mealsPerDay: number) => {
  const dayPlans = [];
  const dayCalories: Record<string, string> = {};
  const dayMacros: Record<string, any> = {};

  for (let d = 0; d < daysCount; d++) {
    const dayId = `day-${d + 1}`;
    const meals = [];

    for (let m = 0; m < mealsPerDay; m++) {
      meals.push({
        id: `meal-${d}-${m}`,
        name: `Posiłek ${m + 1}`,
        dish: `Danie ${m + 1}`,
        instructions: 'Test instructions',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        fiber: 5,
        countTowardsDailyCalories: true,
        order_index: m,
        time: `${8 + m * 3}:00`,
        ingredients: [
          {
            name: 'Składnik 1',
            quantity: 100,
            unit: 'g',
            calories: 200,
            protein: 15,
            carbs: 20,
            fat: 10,
            fiber: 2,
          },
          {
            name: 'Składnik 2',
            quantity: 50,
            unit: 'g',
            calories: 150,
            protein: 10,
            carbs: 15,
            fat: 5,
            fiber: 1,
          },
        ],
      });
    }

    dayPlans.push({
      id: dayId,
      name: `Dzień ${d + 1}`,
      day_number: d + 1,
      meals,
    });

    dayCalories[dayId] = '2000';
    dayMacros[dayId] = {
      proteinGrams: '150',
      proteinPercentage: '30',
      fatGrams: '70',
      fatPercentage: '30',
      carbsGrams: '200',
      carbsPercentage: '40',
      fiberGrams: '30',
    };
  }

  return {
    dayPlans,
    dayCalories,
    dayMacros,
    clientSettings: {
      showMacrosInJadlospis: true,
      obecnyProces: 'redukcja',
      current_weight: 80,
      current_activity_level: 1.5,
      wazneInformacje: 'Test notes',
    },
  };
};

describe('Batch INSERT Optimization for restoreDietSnapshot', () => {
  describe('Data Transformation for Batch Operations', () => {
    it('should transform snapshot data into flat arrays for batch INSERT', () => {
      const snapshotData = createTestSnapshotData(2, 3); // 2 days, 3 meals each

      // This function should be extracted from restoreDietSnapshot
      // For now, we define expected behavior
      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');

      // Should have 2 day_plans
      expect(result.dayPlans).toHaveLength(2);
      expect(result.dayPlans[0]).toMatchObject({
        id: expect.any(String), // New UUID
        name: 'Dzień 1',
        day_number: 1,
        template_id: null,
      });

      // Should have 2 client_diet_settings (one per day)
      expect(result.settings).toHaveLength(2);
      expect(result.settings[0]).toMatchObject({
        client_id: 'client-123',
        day_plan_id: result.dayPlans[0].id, // References new UUID
        target_calories: 2000,
      });

      // Should have 6 meals (2 days × 3 meals)
      expect(result.meals).toHaveLength(6);
      expect(result.meals[0]).toMatchObject({
        id: expect.any(String), // New UUID
        name: 'Posiłek 1',
        day_plan_id: result.dayPlans[0].id, // References new day_plan UUID
      });

      // Should have 12 ingredients (6 meals × 2 ingredients)
      expect(result.ingredients).toHaveLength(12);
      expect(result.ingredients[0]).toMatchObject({
        meal_id: result.meals[0].id, // References new meal UUID
        name: 'Składnik 1',
      });
    });

    it('should generate consistent UUIDs that link day_plans -> meals -> ingredients', () => {
      const snapshotData = createTestSnapshotData(1, 2); // 1 day, 2 meals

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');

      // All meals should reference the day_plan
      const dayPlanId = result.dayPlans[0].id;
      expect(result.meals.every(m => m.day_plan_id === dayPlanId)).toBe(true);

      // Ingredients should reference their respective meals
      const meal1Id = result.meals[0].id;
      const meal2Id = result.meals[1].id;

      const ingredientsForMeal1 = result.ingredients.filter(i => i.meal_id === meal1Id);
      const ingredientsForMeal2 = result.ingredients.filter(i => i.meal_id === meal2Id);

      expect(ingredientsForMeal1).toHaveLength(2);
      expect(ingredientsForMeal2).toHaveLength(2);
    });

    it('should preserve order_index for meals and ingredients', () => {
      const snapshotData = createTestSnapshotData(1, 5); // 1 day, 5 meals

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');

      // Meals should have sequential order_index
      expect(result.meals.map(m => m.order_index)).toEqual([0, 1, 2, 3, 4]);

      // Each meal's ingredients should have order_index 0, 1
      const mealIngredients = result.ingredients.filter(
        i => i.meal_id === result.meals[0].id
      );
      expect(mealIngredients.map(i => i.order_index)).toEqual([0, 1]);
    });

    it('should handle empty meals array gracefully', () => {
      const snapshotData = createTestSnapshotData(1, 0); // 1 day, 0 meals

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');

      expect(result.dayPlans).toHaveLength(1);
      expect(result.settings).toHaveLength(1);
      expect(result.meals).toHaveLength(0);
      expect(result.ingredients).toHaveLength(0);
    });

    it('should handle meals without ingredients', () => {
      const snapshotData = createTestSnapshotData(1, 2);
      // Remove ingredients from meals
      snapshotData.dayPlans[0].meals.forEach(meal => {
        meal.ingredients = [];
      });

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');

      expect(result.meals).toHaveLength(2);
      expect(result.ingredients).toHaveLength(0);
    });
  });

  describe('Batch INSERT Query Count', () => {
    it('should execute exactly 4 INSERT queries for any dataset size', async () => {
      // This test verifies that batch INSERT reduces query count
      const snapshotData = createTestSnapshotData(7, 4); // 7 days, 4 meals each = 28 meals

      const insertCalls: string[] = [];
      const mockSupabase = createMockSupabaseForBatchTest(insertCalls);

      await executeBatchInsert(mockSupabase, snapshotData, 'client-123');

      // Should be exactly 4 INSERT calls
      expect(insertCalls).toHaveLength(4);
      expect(insertCalls).toContain('day_plans');
      expect(insertCalls).toContain('client_diet_settings');
      expect(insertCalls).toContain('meals');
      expect(insertCalls).toContain('meal_ingredients');
    });

    it('should batch all meals into single INSERT regardless of day count', async () => {
      const snapshotData = createTestSnapshotData(14, 4); // 14 days, 4 meals each = 56 meals

      const insertedData: Record<string, any[]> = {};
      const mockSupabase = createMockSupabaseCapture(insertedData);

      await executeBatchInsert(mockSupabase, snapshotData, 'client-123');

      // Single INSERT with all 56 meals
      expect(insertedData.meals).toHaveLength(56);
      // Single INSERT with all 112 ingredients (56 meals × 2 ingredients)
      expect(insertedData.meal_ingredients).toHaveLength(112);
    });
  });

  describe('Data Integrity', () => {
    it('should correctly map macros from snapshot to client_diet_settings', () => {
      const snapshotData = createTestSnapshotData(1, 1);

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');

      expect(result.settings[0]).toMatchObject({
        target_calories: 2000,
        target_protein_grams: 150,
        target_protein_percentage: 30,
        target_fat_grams: 70,
        target_fat_percentage: 30,
        target_carbs_grams: 200,
        target_carbs_percentage: 40,
        target_fiber_grams: 30,
      });
    });

    it('should preserve all meal properties in batch INSERT', () => {
      const snapshotData = createTestSnapshotData(1, 1);
      const originalMeal = snapshotData.dayPlans[0].meals[0];

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');
      const transformedMeal = result.meals[0];

      expect(transformedMeal.name).toBe(originalMeal.name);
      expect(transformedMeal.dish).toBe(originalMeal.dish);
      expect(transformedMeal.instructions).toBe(originalMeal.instructions);
      expect(transformedMeal.calories).toBe(originalMeal.calories);
      expect(transformedMeal.protein).toBe(originalMeal.protein);
      expect(transformedMeal.carbs).toBe(originalMeal.carbs);
      expect(transformedMeal.fat).toBe(originalMeal.fat);
      expect(transformedMeal.fiber).toBe(originalMeal.fiber);
      expect(transformedMeal.count_in_daily_total).toBe(originalMeal.countTowardsDailyCalories);
      expect(transformedMeal.time).toBe(originalMeal.time);
      expect(transformedMeal.order_index).toBe(originalMeal.order_index);
    });

    it('should preserve all ingredient properties in batch INSERT', () => {
      const snapshotData = createTestSnapshotData(1, 1);
      const originalIngredient = snapshotData.dayPlans[0].meals[0].ingredients[0];

      const result = transformSnapshotForBatchInsert(snapshotData, 'client-123');
      const transformedIngredient = result.ingredients[0];

      expect(transformedIngredient.name).toBe(originalIngredient.name);
      expect(transformedIngredient.quantity).toBe(originalIngredient.quantity);
      expect(transformedIngredient.unit).toBe(originalIngredient.unit);
      expect(transformedIngredient.calories).toBe(originalIngredient.calories);
      expect(transformedIngredient.protein).toBe(originalIngredient.protein);
      expect(transformedIngredient.carbs).toBe(originalIngredient.carbs);
      expect(transformedIngredient.fat).toBe(originalIngredient.fat);
      expect(transformedIngredient.fiber).toBe(originalIngredient.fiber);
    });
  });
});

// ============================================================================
// IMPLEMENTATION - TDD GREEN Phase
// ============================================================================

interface BatchInsertData {
  dayPlans: Array<{
    id: string;
    name: string;
    day_number: number;
    template_id: null;
  }>;
  settings: Array<{
    client_id: string;
    day_plan_id: string;
    target_calories: number;
    target_protein_grams: number;
    target_protein_percentage: number;
    target_fat_grams: number;
    target_fat_percentage: number;
    target_carbs_grams: number;
    target_carbs_percentage: number;
    target_fiber_grams: number;
  }>;
  meals: Array<{
    id: string;
    name: string;
    dish: string;
    instructions: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    count_in_daily_total: boolean;
    day_plan_id: string;
    order_index: number;
    time: string;
  }>;
  ingredients: Array<{
    meal_id: string;
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    order_index: number;
  }>;
}

/**
 * Transform snapshot data into flat arrays for batch INSERT
 * Uses client-side UUID generation to maintain relationships
 */
function transformSnapshotForBatchInsert(
  snapshotData: ReturnType<typeof createTestSnapshotData>,
  clientId: string
): BatchInsertData {
  const dayPlans: BatchInsertData['dayPlans'] = [];
  const settings: BatchInsertData['settings'] = [];
  const meals: BatchInsertData['meals'] = [];
  const ingredients: BatchInsertData['ingredients'] = [];

  // Map old day IDs to new UUIDs
  const dayIdMap = new Map<string, string>();

  // Process each day plan
  for (const dayPlan of snapshotData.dayPlans) {
    // Generate new UUID for day_plan
    const newDayPlanId = crypto.randomUUID();
    dayIdMap.set(dayPlan.id, newDayPlanId);

    // Add day_plan
    dayPlans.push({
      id: newDayPlanId,
      name: dayPlan.name,
      day_number: dayPlan.day_number,
      template_id: null,
    });

    // Get macros for this day
    const macros = snapshotData.dayMacros[dayPlan.id] || {};
    const calories = snapshotData.dayCalories[dayPlan.id] || '0';

    // Add client_diet_settings
    settings.push({
      client_id: clientId,
      day_plan_id: newDayPlanId,
      target_calories: parseFloat(calories) || 0,
      target_protein_grams: parseFloat(macros.proteinGrams) || 0,
      target_protein_percentage: parseFloat(macros.proteinPercentage) || 0,
      target_fat_grams: parseFloat(macros.fatGrams) || 0,
      target_fat_percentage: parseFloat(macros.fatPercentage) || 0,
      target_carbs_grams: parseFloat(macros.carbsGrams) || 0,
      target_carbs_percentage: parseFloat(macros.carbsPercentage) || 0,
      target_fiber_grams: parseFloat(macros.fiberGrams) || 0,
    });

    // Process meals for this day
    for (const meal of dayPlan.meals || []) {
      // Generate new UUID for meal
      const newMealId = crypto.randomUUID();

      // Add meal
      meals.push({
        id: newMealId,
        name: meal.name,
        dish: meal.dish,
        instructions: meal.instructions,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        count_in_daily_total: meal.countTowardsDailyCalories ?? true,
        day_plan_id: newDayPlanId,
        order_index: meal.order_index || 0,
        time: meal.time || '',
      });

      // Process ingredients for this meal
      for (let i = 0; i < (meal.ingredients || []).length; i++) {
        const ingredient = meal.ingredients[i];

        ingredients.push({
          meal_id: newMealId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          calories: ingredient.calories,
          protein: ingredient.protein,
          carbs: ingredient.carbs,
          fat: ingredient.fat,
          fiber: ingredient.fiber,
          order_index: i,
        });
      }
    }
  }

  return { dayPlans, settings, meals, ingredients };
}

/**
 * Execute batch INSERT operations
 * Reduces 30+ queries to exactly 4 queries
 */
async function executeBatchInsert(
  supabase: any,
  snapshotData: ReturnType<typeof createTestSnapshotData>,
  clientId: string
): Promise<void> {
  const { dayPlans, settings, meals, ingredients } = transformSnapshotForBatchInsert(
    snapshotData,
    clientId
  );

  // Batch INSERT #1: day_plans
  if (dayPlans.length > 0) {
    await supabase.from('day_plans').insert(dayPlans);
  }

  // Batch INSERT #2: client_diet_settings
  if (settings.length > 0) {
    await supabase.from('client_diet_settings').insert(settings);
  }

  // Batch INSERT #3: meals
  if (meals.length > 0) {
    await supabase.from('meals').insert(meals);
  }

  // Batch INSERT #4: meal_ingredients
  if (ingredients.length > 0) {
    await supabase.from('meal_ingredients').insert(ingredients);
  }
}

/**
 * Helper: Create mock Supabase client that tracks INSERT calls
 */
function createMockSupabaseForBatchTest(insertCalls: string[]) {
  return {
    from: (table: string) => ({
      insert: (data: any[]) => {
        insertCalls.push(table);
        return Promise.resolve({ data, error: null });
      },
    }),
  };
}

/**
 * Helper: Create mock Supabase client that captures inserted data
 */
function createMockSupabaseCapture(insertedData: Record<string, any[]>) {
  return {
    from: (table: string) => ({
      insert: (data: any[]) => {
        insertedData[table] = data;
        return Promise.resolve({ data, error: null });
      },
    }),
  };
}
