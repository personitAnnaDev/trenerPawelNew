// src/utils/supabaseTemplates.ts

import { supabase } from "./supabase";
import { logger } from "./logger";

/**
 * Pobiera listę szablonów jadłospisu z bazy Supabase.
 * @returns {Promise<Array<{ id: string, title: string, description?: string }>>}
 */
export async function fetchTemplatesFromSupabase(): Promise<Array<{
  id: string;
  title: string;
  description?: string;
  created_at?: string;
  daysCount: number;
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
  avgFiber: number;
}>> {
  const { data, error } = await supabase.rpc("get_templates_with_stats");

  if (error || !data) {
    logger.error("❌ Error fetching templates:", error);
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    created_at: row.created_at,
    daysCount: Number(row.days_count) || 0,
    avgCalories: Number(row.avg_calories) || 0,
    avgProtein: Number(row.avg_protein) || 0,
    avgCarbs: Number(row.avg_carbs) || 0,
    avgFat: Number(row.avg_fat) || 0,
    avgFiber: Number(row.avg_fiber) || 0,
  }));
}

/**
 * Dodaje pojedynczy posiłek do day_planu wraz ze składnikami.
 * @param {object} mealData - Dane posiłku.
 * @param {string} dayPlanId - ID planu dnia, do którego przypisać posiłek.
 * @returns {Promise<{ success: boolean, mealId?: string, error?: any }>}
 */
/**
 * Aktualizuje istniejący posiłek i jego składniki w bazie.
 * @param {object} mealData - Dane posiłku (musi zawierać id).
 * @param {string} dayPlanId - ID planu dnia.
 * @returns {Promise<{ success: boolean, mealId?: string, error?: any }>}
 */
export async function updateMealWithIngredients(mealData: {
  id: string;
  name: string;
  dish: string;
  instructions: string[] | any;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  countTowardsDailyCalories: boolean;
  time?: string;
  order_index?: number;
  ingredients: Array<{
    id?: string;
    name: string;
    quantity: number;
    unit: string;
    unit_weight?: number;
    ingredient_id?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
}, dayPlanId: string) {
  // 1. Aktualizuj posiłek
  const { ingredients, id, countTowardsDailyCalories, ...mealUpdate } = mealData;
  const { error: mealError } = await supabase
    .from("meals")
    .update({
      ...mealUpdate,
      instructions: Array.isArray(mealData.instructions)
        ? mealData.instructions
        : typeof mealData.instructions === "string" && mealData.instructions
        ? [mealData.instructions]
        : [],
      count_in_daily_total: countTowardsDailyCalories ?? true,
      time: mealData.time ?? "",
      day_plan_id: dayPlanId,
    })
    .eq("id", mealData.id);

  if (mealError) {
    return { success: false, error: mealError };
  }

  // 2. Usuń stare składniki i dodaj nowe
  await supabase
    .from("meal_ingredients")
    .delete()
    .eq("meal_id", mealData.id);

  // 🚀 OPTIMIZATION: Batch insert - wszystkie składniki w jednym zapytaniu
  if (mealData.ingredients.length > 0) {
    const ingredientsToInsert = mealData.ingredients.map((ingredient, i) => ({
      meal_id: mealData.id,
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unit_weight: ingredient.unit_weight || 100,
      ingredient_id: ingredient.ingredient_id, // 🔧 FIX: Save ingredient_id to enable direct lookups
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbs: ingredient.carbs,
      fat: ingredient.fat,
      fiber: ingredient.fiber,
      order_index: i, // Zachowanie kolejności składników
    }));

    const { error: ingredientError } = await supabase
      .from("meal_ingredients")
      .insert(ingredientsToInsert);

    if (ingredientError) {
      return { success: false, error: ingredientError };
    }
  }

  return { success: true, mealId: mealData.id };
}

export async function saveMealWithIngredients(mealData: {
  name: string;
  dish: string;
  instructions: string[] | any;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  countTowardsDailyCalories: boolean;
  time?: string;
  order_index?: number;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    unit_weight?: number;
    ingredient_id?: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }>;
}, dayPlanId: string) {
  // Ustal order_index na podstawie liczby istniejących posiłków w dayPlanId
  const { data: existingMeals, error: existingMealsError } = await supabase
    .from("meals")
    .select("id, order_index")
    .eq("day_plan_id", dayPlanId);

  let orderIndex: number;

  // Jeśli order_index jest podany, zachowaj go i przesuń istniejące posiłki
  if (mealData.order_index !== undefined) {
    orderIndex = mealData.order_index;

    // Przesuń wszystkie posiłki >= target order_index o +1
    if (existingMeals && existingMeals.length > 0) {
      // Filter meals that need to be shifted
      const mealsToShift = existingMeals.filter(m => m.order_index >= orderIndex);

      if (mealsToShift.length > 0) {
        // Update each meal's order_index manually
        const updates = mealsToShift.map(meal => ({
          id: meal.id,
          order_index: meal.order_index + 1
        }));

        // Batch update using upsert
        const { error: shiftError } = await supabase
          .from("meals")
          .upsert(updates, { onConflict: 'id' });

        if (shiftError) {
          return { success: false, error: shiftError };
        }
      }
    }
  } else {
    // Jeśli order_index nie jest podany, oblicz jako kolejny na końcu
    orderIndex = existingMeals ? existingMeals.length : 0;
  }

  // 1. Dodaj posiłek do tabeli meals
  const { data: meal, error: mealError } = await supabase
    .from("meals")
    .insert({
      name: mealData.name,
      dish: mealData.dish,
      instructions: mealData.instructions,
      calories: mealData.calories,
      protein: mealData.protein,
      carbs: mealData.carbs,
      fat: mealData.fat,
      fiber: mealData.fiber,
      count_in_daily_total: mealData.countTowardsDailyCalories ?? true,
      time: mealData.time ?? "",
      order_index: orderIndex,
      day_plan_id: dayPlanId,
    })
    .select("id")
    .single();

  if (mealError || !meal) {
    return { success: false, error: mealError };
  }

  const mealId = meal.id;

  // 2. Dodaj składniki do meal_ingredients (z zachowaniem kolejności)
  // 🚀 OPTIMIZATION: Batch insert - wszystkie składniki w jednym zapytaniu
  if (mealData.ingredients.length > 0) {
    const ingredientsToInsert = mealData.ingredients.map((ingredient, i) => ({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit,
      unit_weight: ingredient.unit_weight || 100,
      ingredient_id: ingredient.ingredient_id, // 🔧 FIX: Save ingredient_id to enable direct lookups
      calories: ingredient.calories,
      protein: ingredient.protein,
      carbs: ingredient.carbs,
      fat: ingredient.fat,
      fiber: ingredient.fiber,
      meal_id: mealId,
      order_index: i, // Zachowanie kolejności składników
    }));

    const { error: ingredientError } = await supabase
      .from("meal_ingredients")
      .insert(ingredientsToInsert);

    if (ingredientError) {
      return { success: false, error: ingredientError };
    }
  }

  return { success: true, mealId };
}

/**
 * Znajdź lub utwórz szablon i plan dnia dla użytkownika.
 * @param {string} userId - ID użytkownika.
 * @param {string} [templateTitle] - Opcjonalna nazwa szablonu.
 * @returns {Promise<{ templateId: string, dayPlanId: string }>}
 */
export async function findOrCreateTemplateAndDayPlan(userId: string, templateTitle?: string) {
  // Zawsze twórz nowy szablon z unikalną nazwą
  const title = templateTitle || `Nowy szablon ${new Date().toLocaleString('pl-PL')}`;
  const { data: newTemplate, error: newTemplateError } = await supabase
    .from("templates")
    .insert({
      title,
      user_id: userId,
      description: "Automatycznie utworzony szablon"
    })
    .select("id")
    .single();
  if (newTemplateError || !newTemplate) throw new Error("Nie można utworzyć szablonu");
  const templateId = newTemplate.id;

  // Zawsze twórz nowy day_plan
  const { data: newDayPlan, error: newDayPlanError } = await supabase
    .from("day_plans")
    .insert({
      template_id: templateId,
      day_number: 1,
      name: "Dzień 1"
    })
    .select("id")
    .single();
  if (newDayPlanError || !newDayPlan) throw new Error("Nie można utworzyć day_plan");
  const dayPlanId = newDayPlan.id;

  return { templateId, dayPlanId };
}

/**
 * Aktualizuje tytuł i opis istniejącego szablonu.
 * @param {string} templateId - ID szablonu.
 * @param {string} title - Nowy tytuł.
 * @param {string} description - Nowy opis.
 * @returns {Promise<{ success: boolean }>}
 */
export async function updateTemplateDetails(templateId: string, title: string, description: string) {
  
  if (!templateId) {
    logger.error("updateTemplateDetails - Brak templateId!");
    return { success: false, error: "Brak ID szablonu" };
  }
  
  const { data, error } = await supabase
    .from("templates")
    .update({
      title,
      description,
    })
    .eq("id", templateId);

  
  if (error) {
    logger.error("updateTemplateDetails - ERROR:", error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Usuwa szablon z bazy (wraz z powiązanymi dniami i posiłkami).
 * @param {string} templateId - ID szablonu.
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteTemplate(templateId: string) {
  const { error } = await supabase
    .from("templates")
    .delete()
    .eq("id", templateId);

  return { success: !error };
}

/**
 * Usuwa dzień z szablonu.
 * @param {string} dayPlanId - ID dnia.
 * @returns {Promise<{ success: boolean }>}
 */
export async function deleteDayPlan(dayPlanId: string) {
  const { error } = await supabase
    .from("day_plans")
    .delete()
    .eq("id", dayPlanId);

  return { success: !error };
}

/**
 * Dodaje nowy dzień do szablonu.
 * @param {string} templateId - ID szablonu.
 * @param {string} name - Nazwa dnia.
 * @param {number} day_number - Numer dnia.
 * @returns {Promise<{ success: boolean, dayPlan?: { id: string, name: string, day_number: number } }>}
 */
export async function addDayPlan(templateId: string, name: string, day_number: number) {
  const { data, error } = await supabase
    .from("day_plans")
    .insert({
      template_id: templateId,
      name,
      day_number,
    })
    .select("id, name, day_number")
    .single();

  if (error || !data) {
    return { success: false };
  }

  return { success: true, dayPlan: data };
}

/**
 * Aktualizuje nazwę dnia w day_plans.
 * @param {string} dayPlanId - ID dnia.
 * @param {string} name - Nowa nazwa dnia.
 * @returns {Promise<{ success: boolean }>}
 */
export async function updateDayPlan(dayPlanId: string, name: string) {
  const { error } = await supabase
    .from("day_plans")
    .update({ name })
    .eq("id", dayPlanId);

  return { success: !error };
}

/**
 * Dodaje szablon wraz z dniami i posiłkami do Supabase.
 * @param {object} templateData - Dane szablonu i powiązanych dni/posiłków.
 * @returns {Promise<{ success: boolean }>}
 */
export async function addTemplateWithRelations(templateData: {
  title: string;
  description?: string;
  user_id: string;
  dayPlans: Array<{
    name: string;
    day_number: number;
    meals: Array<{
      name: string;
      time: string;
      dish: string;
      instructions: string[];
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
      fiber: number;
      count_in_daily_total: boolean;
      order_index?: number;
      ingredients: Array<{
        name: string;
        quantity: number;
        unit: string;
        unit_weight?: number;
        calories: number;
        protein: number;
        carbs: number;
        fat: number;
        fiber: number;
      }>;
    }>;
  }>;
}) {
  // 1. Dodaj szablon (1 query)
  const { data: template, error: templateError } = await supabase
    .from("templates")
    .insert({
      title: templateData.title,
      description: templateData.description,
      user_id: templateData.user_id,
    })
    .select("id")
    .single();

  if (templateError || !template) {
    return { success: false };
  }

  const templateId = template.id;

  // === BATCH INSERT OPTIMIZATION ===
  // Zamiast N + N*M + N*M*I sekwencyjnych insertów, robimy 3 batch inserty

  // 2. Przygotuj day_plans z pre-generowanymi UUID
  const dayPlansToInsert: Array<{
    id: string;
    template_id: string;
    name: string;
    day_number: number;
    created_by: string;
  }> = [];

  // Mapa: index dnia → nowe day_plan_id
  const dayPlanIds: string[] = [];

  for (const day of templateData.dayPlans) {
    const newDayPlanId = crypto.randomUUID();
    dayPlanIds.push(newDayPlanId);
    dayPlansToInsert.push({
      id: newDayPlanId,
      template_id: templateId,
      name: day.name,
      day_number: day.day_number,
      created_by: templateData.user_id,
    });
  }

  // 3. Batch insert day_plans (1 query)
  if (dayPlansToInsert.length > 0) {
    const { error: dayPlansError } = await supabase
      .from("day_plans")
      .insert(dayPlansToInsert);

    if (dayPlansError) {
      logger.error("❌ Batch insert day_plans failed:", dayPlansError);
      // Cleanup: usuń szablon
      await supabase.from("templates").delete().eq("id", templateId);
      return { success: false };
    }
  }

  // 4. Przygotuj meals z pre-generowanymi UUID i mapowaniem day_plan_id
  const mealsToInsert: Array<{
    id: string;
    day_plan_id: string;
    name: string;
    time: string;
    dish: string;
    instructions: string[];
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    count_in_daily_total: boolean;
    order_index: number;
  }> = [];

  // Mapa: [dayIndex][mealIndex] → nowe meal_id
  const mealIdsByDay: string[][] = [];

  for (let dayIndex = 0; dayIndex < templateData.dayPlans.length; dayIndex++) {
    const day = templateData.dayPlans[dayIndex];
    const dayPlanId = dayPlanIds[dayIndex];
    const mealIdsForDay: string[] = [];

    for (let mealIndex = 0; mealIndex < day.meals.length; mealIndex++) {
      const meal = day.meals[mealIndex];
      const newMealId = crypto.randomUUID();
      mealIdsForDay.push(newMealId);

      mealsToInsert.push({
        id: newMealId,
        day_plan_id: dayPlanId,
        name: meal.name,
        time: meal.time,
        dish: meal.dish,
        instructions: meal.instructions,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        count_in_daily_total: meal.count_in_daily_total ?? true,
        order_index: meal.order_index ?? mealIndex,
      });
    }
    mealIdsByDay.push(mealIdsForDay);
  }

  // 5. Batch insert meals (1 query)
  if (mealsToInsert.length > 0) {
    const { error: mealsError } = await supabase
      .from("meals")
      .insert(mealsToInsert);

    if (mealsError) {
      logger.error("❌ Batch insert meals failed:", mealsError);
      // Cleanup: usuń day_plans i szablon
      await supabase.from("day_plans").delete().eq("template_id", templateId);
      await supabase.from("templates").delete().eq("id", templateId);
      return { success: false };
    }
  }

  // 6. Przygotuj meal_ingredients z mapowaniem meal_id
  const ingredientsToInsert: Array<{
    meal_id: string;
    name: string;
    quantity: number;
    unit: string;
    unit_weight: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    order_index: number;
  }> = [];

  for (let dayIndex = 0; dayIndex < templateData.dayPlans.length; dayIndex++) {
    const day = templateData.dayPlans[dayIndex];

    for (let mealIndex = 0; mealIndex < day.meals.length; mealIndex++) {
      const meal = day.meals[mealIndex];
      const mealId = mealIdsByDay[dayIndex][mealIndex];

      for (let ingredientIndex = 0; ingredientIndex < meal.ingredients.length; ingredientIndex++) {
        const ingredient = meal.ingredients[ingredientIndex];
        ingredientsToInsert.push({
          meal_id: mealId,
          name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          unit_weight: ingredient.unit_weight || 100,
          calories: ingredient.calories,
          protein: ingredient.protein,
          carbs: ingredient.carbs,
          fat: ingredient.fat,
          fiber: ingredient.fiber,
          order_index: ingredientIndex,
        });
      }
    }
  }

  // 7. Batch insert meal_ingredients (1 query)
  if (ingredientsToInsert.length > 0) {
    const { error: ingredientsError } = await supabase
      .from("meal_ingredients")
      .insert(ingredientsToInsert);

    if (ingredientsError) {
      logger.error("❌ Batch insert ingredients failed:", ingredientsError);
      // Cleanup: usuń meals, day_plans i szablon
      const mealIds = mealsToInsert.map(m => m.id);
      await supabase.from("meal_ingredients").delete().in("meal_id", mealIds);
      await supabase.from("meals").delete().eq("day_plan_id", dayPlanIds[0]); // Simplify - cascade should handle
      await supabase.from("day_plans").delete().eq("template_id", templateId);
      await supabase.from("templates").delete().eq("id", templateId);
      return { success: false };
    }
  }

  // === END BATCH INSERT OPTIMIZATION ===
  // Było: 1 + N + N*M + N*M*I queries (np. 217 dla typowego szablonu)
  // Teraz: 4 queries (template + day_plans + meals + ingredients)

  return { success: true };
}

/**
 * Aktualizuje kolejność posiłków (order_index) w bazie dla podanego dnia.
 * @param {Array<{ id: string, order_index: number }>} meals - Lista posiłków z nowymi indeksami.
 * @returns {Promise<boolean>} - true jeśli sukces.
 */
export async function updateMealsOrder(meals: Array<{ id: string, order_index: number }>) {
  for (const meal of meals) {
    const { error } = await supabase
      .from("meals")
      .update({ order_index: meal.order_index })
      .eq("id", meal.id);
    if (error) return false;
  }
  return true;
}

/**
 * Usuwa posiłek (i powiązane składniki) z bazy po id.
 * @param {string} mealId - ID posiłku do usunięcia.
 * @returns {Promise<boolean>} - true jeśli sukces.
 */
export async function deleteMeal(mealId: string): Promise<boolean> {
  // Usuń składniki powiązane z posiłkiem
  await supabase
    .from("meal_ingredients")
    .delete()
    .eq("meal_id", mealId);

  // Usuń posiłek
  const { error } = await supabase
    .from("meals")
    .delete()
    .eq("id", mealId);

  return !error;
}

/**
 * Pobiera szczegółowe dane jednego szablonu wraz z jego dniami, posiłkami i składnikami.
 * @param {string} templateId - ID szablonu do pobrania.
 * @returns {Promise<any>} - Obiekt z danymi szablonu lub null.
 */
export async function getTemplateById(templateId: string) {
  const { data: template, error } = await supabase
    .from("templates")
    .select(
      `
      id,
      name: title,
      description,
      day_plans: day_plans (
        id,
        name,
        day_number,
        meals: meals (
          id,
          name,
          dish,
          instructions,
          calories,
          protein,
          carbs,
          fat,
          fiber,
          time,
          order_index,
          count_in_daily_total,
          ingredients: meal_ingredients (
            id,
            name,
            quantity,
            unit,
            unit_weight,
            calories,
            protein,
            carbs,
            fat,
            fiber
          )
        )
      )
    `
    )
    .eq("id", templateId)
    .single();

  if (error) {
    logger.error("Error fetching template by ID:", error);
    return null;
  }

  // Sortowanie day_plans po day_number i posiłków w każdym dniu po order_index
  if (template && template.day_plans) {
    // NAPRAWA: Sortowanie day_plans po day_number (główna przyczyna problemu z odwrotną kolejnością)
    template.day_plans.sort((a: any, b: any) => (a.day_number ?? 0) - (b.day_number ?? 0));
    
    template.day_plans.forEach((day: any) => {
      if (day.meals) {
        day.meals.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
      }
    });
  }

  return template;
}

/**
 * Zastępuje wszystkie posiłki w danym dniu szablonu nowymi posiłkami.
 * Usuwa wszystkie istniejące posiłki, potem dodaje nowe z przekazanej listy.
 * @param {string} dayPlanId - ID dnia w szablonie
 * @param {Array} newMeals - Tablica nowych posiłków do dodania
 * @returns {Promise<boolean>} - true jeśli sukces
 */
export async function replaceExistingTemplateDayMeals(
  dayPlanId: string,
  newMeals: any[]
): Promise<boolean> {
  try {
    // 1. Pobierz wszystkie istniejące posiłki dla tego dnia
    const { data: existingMeals, error: fetchError } = await supabase
      .from("meals")
      .select("id")
      .eq("day_plan_id", dayPlanId);

    if (fetchError) {
      logger.error("Error fetching existing meals:", fetchError);
      return false;
    }

    // 2. Usuń wszystkie istniejące posiłki (wraz ze składnikami przez CASCADE)
    if (existingMeals && existingMeals.length > 0) {
      const mealIds = existingMeals.map((m) => m.id);

      // Usuń składniki
      await supabase.from("meal_ingredients").delete().in("meal_id", mealIds);

      // Usuń posiłki
      const { error: deleteError } = await supabase
        .from("meals")
        .delete()
        .in("id", mealIds);

      if (deleteError) {
        logger.error("Error deleting existing meals:", deleteError);
        return false;
      }
    }

    // 3. Dodaj nowe posiłki
    for (let i = 0; i < newMeals.length; i++) {
      const meal = newMeals[i];
      const mealId = crypto.randomUUID();

      // Wstaw posiłek
      const { error: mealError } = await supabase.from("meals").insert({
        id: mealId,
        day_plan_id: dayPlanId,
        name: meal.name,
        dish: meal.dish,
        time: meal.time,
        order_index: i,
        instructions: meal.instructions,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        fiber: meal.fiber || 0,
        count_in_daily_total: meal.countTowardsDailyCalories ?? true,
      });

      if (mealError) {
        logger.error("Error inserting meal:", mealError);
        return false;
      }

      // Wstaw składniki
      if (meal.ingredients && meal.ingredients.length > 0) {
        const ingredientsToInsert = meal.ingredients.map((ing: any, idx: number) => ({
          id: crypto.randomUUID(),
          meal_id: mealId,
          ingredient_id: ing.ingredient_id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          unit_weight: ing.unit_weight,
          calories: ing.calories,
          protein: ing.protein,
          fat: ing.fat,
          carbs: ing.carbs,
          fiber: ing.fiber,
          order_index: idx,
        }));

        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          logger.error("Error inserting ingredients:", ingredientsError);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error("Error in replaceExistingTemplateDayMeals:", error);
    return false;
  }
}

/**
 * Dodaje posiłki na końcu listy posiłków w danym dniu szablonu.
 * @param {string} dayPlanId - ID dnia w szablonie
 * @param {Array} newMeals - Tablica nowych posiłków do dodania
 * @returns {Promise<boolean>} - true jeśli sukces
 */
export async function appendMealsToExistingTemplateDay(
  dayPlanId: string,
  newMeals: any[]
): Promise<boolean> {
  try {
    // 1. Pobierz maksymalny order_index dla tego dnia
    const { data: existingMeals, error: fetchError } = await supabase
      .from("meals")
      .select("order_index")
      .eq("day_plan_id", dayPlanId)
      .order("order_index", { ascending: false })
      .limit(1);

    if (fetchError) {
      logger.error("Error fetching max order_index:", fetchError);
      return false;
    }

    const maxOrderIndex = existingMeals && existingMeals.length > 0
      ? existingMeals[0].order_index
      : -1;

    // 2. Dodaj nowe posiłki z order_index zaczynając od maxOrderIndex + 1
    for (let i = 0; i < newMeals.length; i++) {
      const meal = newMeals[i];
      const mealId = crypto.randomUUID();
      const orderIndex = maxOrderIndex + 1 + i;

      // Wstaw posiłek
      const { error: mealError } = await supabase.from("meals").insert({
        id: mealId,
        day_plan_id: dayPlanId,
        name: meal.name,
        dish: meal.dish,
        time: meal.time,
        order_index: orderIndex,
        instructions: meal.instructions,
        calories: meal.calories || 0,
        protein: meal.protein || 0,
        carbs: meal.carbs || 0,
        fat: meal.fat || 0,
        fiber: meal.fiber || 0,
        count_in_daily_total: meal.countTowardsDailyCalories ?? true,
      });

      if (mealError) {
        logger.error("Error inserting meal:", mealError);
        return false;
      }

      // Wstaw składniki
      if (meal.ingredients && meal.ingredients.length > 0) {
        const ingredientsToInsert = meal.ingredients.map((ing: any, idx: number) => ({
          id: crypto.randomUUID(),
          meal_id: mealId,
          ingredient_id: ing.ingredient_id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          unit_weight: ing.unit_weight,
          calories: ing.calories,
          protein: ing.protein,
          fat: ing.fat,
          carbs: ing.carbs,
          fiber: ing.fiber,
          order_index: idx,
        }));

        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(ingredientsToInsert);

        if (ingredientsError) {
          logger.error("Error inserting ingredients:", ingredientsError);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error("Error in appendMealsToExistingTemplateDay:", error);
    return false;
  }
}

/**
 * Aktualizuje nazwę dnia w szablonie.
 * @param {string} dayPlanId - ID dnia w szablonie
 * @param {string} newName - Nowa nazwa dnia
 * @returns {Promise<boolean>} - true jeśli sukces
 */
export async function updateTemplateDayName(
  dayPlanId: string,
  newName: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("day_plans")
      .update({ name: newName })
      .eq("id", dayPlanId);

    if (error) {
      logger.error("Error updating day name:", error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Error in updateTemplateDayName:", error);
    return false;
  }
}
