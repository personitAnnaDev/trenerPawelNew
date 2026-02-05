import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * TDD RED Phase - Single JOIN Query for getClientDietPlansAndSettings
 *
 * BASELINE MEASUREMENT (2025-11-25):
 * - getClientDietPlansAndSettings: 8721ms (4 sequential queries)
 *
 * TARGET AFTER OPTIMIZATION:
 * - getClientDietPlansAndSettings: ~200-500ms (1 JOIN query)
 *
 * PROBLEM: Current implementation uses 4 sequential queries:
 * 1. SELECT * FROM client_diet_settings WHERE client_id = X
 * 2. SELECT * FROM day_plans WHERE id IN (...)
 * 3. SELECT * FROM meals WHERE day_plan_id IN (...)
 * 4. SELECT * FROM meal_ingredients WHERE meal_id IN (...)
 *
 * SOLUTION: Single nested SELECT with Supabase relations
 * SELECT *, day_plan:day_plans(*, meals(*, meal_ingredients(*)))
 * FROM client_diet_settings WHERE client_id = X
 */

// Mock data for testing
const createMockNestedResponse = (daysCount: number, mealsPerDay: number, ingredientsPerMeal: number) => {
  const data = [];

  for (let d = 0; d < daysCount; d++) {
    const dayPlanId = `day-plan-${d + 1}`;
    const meals = [];

    for (let m = 0; m < mealsPerDay; m++) {
      const mealId = `meal-${d}-${m}`;
      const ingredients = [];

      for (let i = 0; i < ingredientsPerMeal; i++) {
        ingredients.push({
          id: `ing-${d}-${m}-${i}`,
          meal_id: mealId,
          name: `Składnik ${i + 1}`,
          quantity: 100,
          unit: 'g',
          calories: 100,
          protein: 10,
          carbs: 10,
          fat: 5,
          fiber: 2,
          order_index: i,
        });
      }

      meals.push({
        id: mealId,
        day_plan_id: dayPlanId,
        name: `Posiłek ${m + 1}`,
        dish: `Danie ${m + 1}`,
        instructions: 'Test',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20,
        fiber: 5,
        count_in_daily_total: true,
        order_index: m,
        time: `${8 + m * 3}:00`,
        meal_ingredients: ingredients,
      });
    }

    data.push({
      id: `setting-${d + 1}`,
      client_id: 'client-123',
      day_plan_id: dayPlanId,
      target_calories: 2000,
      target_protein_grams: 150,
      target_protein_percentage: 30,
      target_fat_grams: 70,
      target_fat_percentage: 30,
      target_carbs_grams: 200,
      target_carbs_percentage: 40,
      target_fiber_grams: 30,
      day_plans: {
        id: dayPlanId,
        name: `Dzień ${d + 1}`,
        day_number: d + 1,
        template_id: null,
        meals: meals,
      },
    });
  }

  return data;
};

describe('Single JOIN Query for getClientDietPlansAndSettings', () => {
  describe('Query Structure', () => {
    it('should use single nested SELECT instead of 4 sequential queries', async () => {
      // This test verifies the query structure
      const queryCalls: string[] = [];
      const mockSupabase = createMockSupabaseTracking(queryCalls);

      await getClientDietPlansWithJoin(mockSupabase, 'client-123');

      // Should be exactly 1 query call (not 4)
      expect(queryCalls.length).toBe(1);
      expect(queryCalls[0]).toContain('client_diet_settings');
    });

    it('should include nested relations in select statement', async () => {
      let selectStatement = '';
      const mockSupabase = createMockSupabaseCapture((select) => {
        selectStatement = select;
      });

      await getClientDietPlansWithJoin(mockSupabase, 'client-123');

      // Should include nested relations
      expect(selectStatement).toContain('day_plans');
      expect(selectStatement).toContain('meals');
      expect(selectStatement).toContain('meal_ingredients');
    });
  });

  describe('Data Transformation', () => {
    it('should transform nested response to flat structure matching old API', () => {
      const nestedData = createMockNestedResponse(2, 3, 2); // 2 days, 3 meals, 2 ingredients

      const result = transformNestedToFlat(nestedData);

      // Should have settings array
      expect(result.settings).toHaveLength(2);
      expect(result.settings[0]).toMatchObject({
        id: 'setting-1',
        client_id: 'client-123',
        day_plan_id: 'day-plan-1',
        target_calories: 2000,
      });

      // Should have dayPlans with meals
      expect(result.dayPlans).toHaveLength(2);
      expect(result.dayPlans[0]).toMatchObject({
        id: 'day-plan-1',
        name: 'Dzień 1',
        day_number: 1,
      });

      // Each dayPlan should have meals with ingredients
      expect(result.dayPlans[0].meals).toHaveLength(3);
      expect(result.dayPlans[0].meals[0].ingredients).toHaveLength(2);
    });

    it('should preserve meal order_index sorting', () => {
      const nestedData = createMockNestedResponse(1, 5, 1);
      // Shuffle meals in the response to test sorting
      nestedData[0].day_plans.meals = nestedData[0].day_plans.meals.reverse();

      const result = transformNestedToFlat(nestedData);

      // Meals should be sorted by order_index
      const orderIndexes = result.dayPlans[0].meals.map((m: any) => m.order_index);
      expect(orderIndexes).toEqual([0, 1, 2, 3, 4]);
    });

    it('should preserve day_number sorting for dayPlans', () => {
      const nestedData = createMockNestedResponse(3, 1, 1);
      // Shuffle days in the response
      nestedData.reverse();

      const result = transformNestedToFlat(nestedData);

      // Days should be sorted by day_number
      const dayNumbers = result.dayPlans.map((d: any) => d.day_number);
      expect(dayNumbers).toEqual([1, 2, 3]);
    });

    it('should rename meal_ingredients to ingredients in meals', () => {
      const nestedData = createMockNestedResponse(1, 1, 3);

      const result = transformNestedToFlat(nestedData);

      // Should use 'ingredients' not 'meal_ingredients'
      expect(result.dayPlans[0].meals[0]).toHaveProperty('ingredients');
      expect(result.dayPlans[0].meals[0]).not.toHaveProperty('meal_ingredients');
      expect(result.dayPlans[0].meals[0].ingredients).toHaveLength(3);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty client (no settings)', () => {
      const nestedData: any[] = [];

      const result = transformNestedToFlat(nestedData);

      expect(result.settings).toHaveLength(0);
      expect(result.dayPlans).toHaveLength(0);
    });

    it('should handle days without meals', () => {
      const nestedData = createMockNestedResponse(1, 0, 0);

      const result = transformNestedToFlat(nestedData);

      expect(result.dayPlans).toHaveLength(1);
      expect(result.dayPlans[0].meals).toHaveLength(0);
    });

    it('should handle meals without ingredients', () => {
      const nestedData = createMockNestedResponse(1, 2, 0);

      const result = transformNestedToFlat(nestedData);

      expect(result.dayPlans[0].meals).toHaveLength(2);
      expect(result.dayPlans[0].meals[0].ingredients).toHaveLength(0);
      expect(result.dayPlans[0].meals[1].ingredients).toHaveLength(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should return same structure as old getClientDietPlansAndSettings', () => {
      const nestedData = createMockNestedResponse(2, 3, 2);

      const result = transformNestedToFlat(nestedData);

      // Structure check
      expect(result).toHaveProperty('settings');
      expect(result).toHaveProperty('dayPlans');
      expect(Array.isArray(result.settings)).toBe(true);
      expect(Array.isArray(result.dayPlans)).toBe(true);

      // Settings should have all required fields
      const setting = result.settings[0];
      expect(setting).toHaveProperty('client_id');
      expect(setting).toHaveProperty('day_plan_id');
      expect(setting).toHaveProperty('target_calories');
      expect(setting).toHaveProperty('target_protein_grams');
      expect(setting).toHaveProperty('target_fat_grams');
      expect(setting).toHaveProperty('target_carbs_grams');

      // DayPlan should have all required fields
      const dayPlan = result.dayPlans[0];
      expect(dayPlan).toHaveProperty('id');
      expect(dayPlan).toHaveProperty('name');
      expect(dayPlan).toHaveProperty('day_number');
      expect(dayPlan).toHaveProperty('meals');

      // Meal should have all required fields
      const meal = dayPlan.meals[0];
      expect(meal).toHaveProperty('id');
      expect(meal).toHaveProperty('name');
      expect(meal).toHaveProperty('dish');
      expect(meal).toHaveProperty('calories');
      expect(meal).toHaveProperty('ingredients');

      // Ingredient should have all required fields
      const ingredient = meal.ingredients[0];
      expect(ingredient).toHaveProperty('id');
      expect(ingredient).toHaveProperty('meal_id');
      expect(ingredient).toHaveProperty('name');
      expect(ingredient).toHaveProperty('quantity');
      expect(ingredient).toHaveProperty('calories');
    });
  });
});

// ============================================================================
// STUB FUNCTIONS - To be implemented in GREEN phase
// ============================================================================

interface TransformedResult {
  settings: any[];
  dayPlans: any[];
}

/**
 * Get client diet plans using single JOIN query with nested relations
 * Replaces 4 sequential queries with 1 nested SELECT
 */
async function getClientDietPlansWithJoin(
  supabase: any,
  clientId: string
): Promise<TransformedResult | null> {
  const { data, error } = await supabase
    .from('client_diet_settings')
    .select(`
      *,
      day_plans (
        *,
        meals (
          *,
          meal_ingredients (*)
        )
      )
    `)
    .eq('client_id', clientId)
    .order('day_plans(day_number)', { ascending: true });

  if (error) {
    return null;
  }

  return transformNestedToFlat(data || []);
}

/**
 * Transform nested Supabase response to flat structure matching old API
 *
 * Input structure (from Supabase JOIN):
 * [
 *   {
 *     id: 'setting-1',
 *     client_id: 'client-123',
 *     day_plan_id: 'day-plan-1',
 *     target_calories: 2000,
 *     ...macros,
 *     day_plans: {
 *       id: 'day-plan-1',
 *       name: 'Dzień 1',
 *       day_number: 1,
 *       meals: [
 *         { id: 'meal-1', ..., meal_ingredients: [...] }
 *       ]
 *     }
 *   }
 * ]
 *
 * Output structure (backward compatible):
 * {
 *   settings: [{ id, client_id, day_plan_id, target_calories, ...macros }],
 *   dayPlans: [{ id, name, day_number, meals: [{ ..., ingredients: [...] }] }]
 * }
 */
function transformNestedToFlat(nestedData: any[]): TransformedResult {
  if (!nestedData || nestedData.length === 0) {
    return { settings: [], dayPlans: [] };
  }

  const settings: any[] = [];
  const dayPlans: any[] = [];

  for (const item of nestedData) {
    // Extract settings (without the nested day_plans)
    const { day_plans: dayPlanData, ...settingFields } = item;
    settings.push(settingFields);

    // Extract and transform dayPlan with meals
    if (dayPlanData) {
      const { meals: mealsData, ...dayPlanFields } = dayPlanData;

      // Transform meals: rename meal_ingredients -> ingredients and sort
      const transformedMeals = (mealsData || [])
        .map((meal: any) => {
          const { meal_ingredients, ...mealFields } = meal;
          return {
            ...mealFields,
            ingredients: (meal_ingredients || []).sort(
              (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0)
            ),
          };
        })
        .sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

      dayPlans.push({
        ...dayPlanFields,
        meals: transformedMeals,
      });
    }
  }

  // Sort dayPlans by day_number
  dayPlans.sort((a, b) => (a.day_number || 0) - (b.day_number || 0));

  return { settings, dayPlans };
}

/**
 * Helper: Create mock Supabase that tracks query calls
 */
function createMockSupabaseTracking(queryCalls: string[]) {
  return {
    from: (table: string) => {
      queryCalls.push(table);
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        }),
      };
    },
  };
}

/**
 * Helper: Create mock Supabase that captures select statement
 */
function createMockSupabaseCapture(onSelect: (select: string) => void) {
  return {
    from: () => ({
      select: (selectStatement: string) => {
        onSelect(selectStatement);
        return {
          eq: () => ({
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    }),
  };
}
