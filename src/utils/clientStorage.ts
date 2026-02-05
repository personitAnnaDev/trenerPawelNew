import { supabase } from "./supabase";
import type { DayPlan } from "@/types/meal";
import type { MacroPlanning } from "@/types/macro-planning";
import { logger, perfTimer } from "./logger";
import { executeBatchInsertForSnapshot } from "./batchSnapshotRestore";

export interface Client {
  id: string;
  user_id: string;
  imie: string;
  nazwisko: string;
  dataUrodzenia: string;
  plec: string;
  wagaPoczatkowa: string;
  wzrost: string;
  notatkiOgolne: string;
  wazneInformacje: string;
  obecnyProces: string;
  statusWspolpracy: string;
  produktyNielubiane: string;
  alergieZywieniowe: string;
  problemyZdrowotne: string;
  showMacrosInJadlospis: boolean;
  rodzajWspolpracy: string;
  statusPlatnosci: string;
  paymentDate?: string | null;
  paymentExpiresAt?: string | null;
  createdAt: string;
  current_weight?: string;
  assigned_template_id?: string;
  assigned_template_name?: string;
  current_activity_level?: number;
  bmr?: number;
  tdee?: number;
  share_token?: string;
  dietPlanData?: {
    dayPlans: any[];
    dayCalories: { [dayId: string]: string };
    dayMacros: { [dayId: string]: any };
    calculatorResults: { bmr: number; tdee: number } | null;
    currentWeight: string;
    importantNotes: string;
    calculatorState?: {
      activityLevel: number[];
      lastCalculated: string;
      savedInputs?: {
        weight: string;
        activityLevel: number[];
        bmr?: number;
        tdee?: number;
      };
    };
    assignedTemplateId?: string;
    assignedTemplateName?: string;
    assignedAt?: string;
  };
}

// Mapowanie pól między interfejsem a schematem Supabase
const mapClientToSupabase = (client: Omit<Client, "id" | "createdAt">) => ({
  first_name: client.imie,
  last_name: client.nazwisko,
  birth_date: client.dataUrodzenia || null,
  gender: client.plec || null,
  initial_weight: client.wagaPoczatkowa
    ? parseFloat(client.wagaPoczatkowa)
    : null,
  height: client.wzrost ? parseFloat(client.wzrost) : null,
  general_notes: client.notatkiOgolne || null,
  important_notes: client.wazneInformacje || null,
  current_process: client.obecnyProces || null,
  cooperation_status: client.statusWspolpracy || null,
  disliked_products: client.produktyNielubiane || null,
  food_allergies: client.alergieZywieniowe || null,
  health_issues: client.problemyZdrowotne || null,
  show_macros: client.showMacrosInJadlospis || false,
  cooperation_type: client.rodzajWspolpracy || null,
  payment_status: client.statusPlatnosci || null,
  payment_date: client.paymentDate || null,
  payment_expires_at: client.paymentExpiresAt || null,
  current_weight:
    client.current_weight !== undefined
      ? client.current_weight === ""
        ? null
        : parseFloat(client.current_weight)
      : null,
  assigned_template_id: client.assigned_template_id || null,
  assigned_template_name: client.assigned_template_name || null,
  current_activity_level:
    client.current_activity_level !== undefined
      ? client.current_activity_level
      : null,
  bmr: client.bmr !== undefined ? client.bmr : null,
  tdee: client.tdee !== undefined ? client.tdee : null,
});

const mapSupabaseToClient = (supabaseClient: any): Client => {
  // Ujednolicenie count_in_daily_total → countTowardsDailyCalories w meals
  const mapMeal = (meal: any) => ({
    ...meal,
    countTowardsDailyCalories: meal.count_in_daily_total ?? true,
  });

  // Jeśli dietPlanData istnieje, zmapuj posiłki
  let dietPlanData = null;
  if (supabaseClient.dietPlanData) {
    dietPlanData = {
      ...supabaseClient.dietPlanData,
      dayPlans:
        supabaseClient.dietPlanData.dayPlans?.map((dp: any) => ({
          ...dp,
          meals: dp.meals?.map(mapMeal) || [],
        })) || [],
    };
  }

  return {
    id: supabaseClient.id,
    user_id: supabaseClient.user_id,
    imie: supabaseClient.first_name || "",
    nazwisko: supabaseClient.last_name || "",
    dataUrodzenia: supabaseClient.birth_date || "",
    plec: supabaseClient.gender || "",
    wagaPoczatkowa: supabaseClient.initial_weight?.toString() || "",
    wzrost: supabaseClient.height?.toString() || "",
    notatkiOgolne: supabaseClient.general_notes || "",
    wazneInformacje: supabaseClient.important_notes || "",
    obecnyProces: supabaseClient.current_process || "",
    statusWspolpracy: supabaseClient.cooperation_status || "",
    produktyNielubiane: supabaseClient.disliked_products || "",
    alergieZywieniowe: supabaseClient.food_allergies || "",
    problemyZdrowotne: supabaseClient.health_issues || "",
    showMacrosInJadlospis: supabaseClient.show_macros || false,
    rodzajWspolpracy: supabaseClient.cooperation_type || "",
    statusPlatnosci: supabaseClient.payment_status || "",
    paymentDate: supabaseClient.payment_date ?? null,
    paymentExpiresAt: supabaseClient.payment_expires_at ?? null,
    createdAt: supabaseClient.created_at || new Date().toISOString(),
    current_weight: supabaseClient.current_weight?.toString() || "",
    assigned_template_id: supabaseClient.assigned_template_id || null,
    assigned_template_name: supabaseClient.assigned_template_name || null,
    current_activity_level:
      supabaseClient.current_activity_level !== undefined
        ? supabaseClient.current_activity_level
        : undefined,
    bmr: supabaseClient.bmr !== undefined ? supabaseClient.bmr : undefined,
    tdee: supabaseClient.tdee !== undefined ? supabaseClient.tdee : undefined,
    dietPlanData,
  };
};

export const getClients = async (): Promise<Client[]> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Błąd pobierania klientów:", error);
      return [];
    }

    if (!data || !Array.isArray(data)) {
      logger.warn("getClients: Otrzymano nieprawidłowe dane:", data);
      return [];
    }

    return data.map(mapSupabaseToClient);
  } catch (error) {
    logger.error("Błąd podczas pobierania klientów:", error);
    return [];
  }
};

export const saveClient = async (
  client: Omit<Client, "id" | "createdAt">,
): Promise<Client | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error(
        "Błąd pobierania użytkownika lub brak zalogowanego użytkownika:",
        userError,
      );
      return null;
    }

    const clientData = {
      ...mapClientToSupabase(client),
      user_id: user.id,
    };

    const { data, error } = await supabase
      .from("clients")
      .insert([clientData])
      .select()
      .single();

    if (error) {
      logger.error("Błąd zapisywania klienta:", error);
      return null;
    }

    return mapSupabaseToClient(data);
  } catch (error) {
    logger.error("Błąd podczas zapisywania klienta:", error);
    return null;
  }
};

export const updateClient = async (
  id: string,
  updates: Partial<Client>,
): Promise<Client | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return null;
    }

    const updateData: any = {};

    if (updates.imie !== undefined) updateData.first_name = updates.imie;
    if (updates.nazwisko !== undefined) updateData.last_name = updates.nazwisko;
    if (updates.dataUrodzenia !== undefined)
      updateData.birth_date = updates.dataUrodzenia;
    if (updates.plec !== undefined) updateData.gender = updates.plec;
    if (updates.wagaPoczatkowa !== undefined)
      updateData.initial_weight = updates.wagaPoczatkowa
        ? parseFloat(updates.wagaPoczatkowa)
        : null;
    if (updates.wzrost !== undefined)
      updateData.height = updates.wzrost ? parseFloat(updates.wzrost) : null;
    if (updates.notatkiOgolne !== undefined)
      updateData.general_notes = updates.notatkiOgolne;
    if (updates.wazneInformacje !== undefined)
      updateData.important_notes = updates.wazneInformacje;
    if (updates.obecnyProces !== undefined)
      updateData.current_process = updates.obecnyProces;
    if (updates.statusWspolpracy !== undefined)
      updateData.cooperation_status = updates.statusWspolpracy;
    if (updates.produktyNielubiane !== undefined)
      updateData.disliked_products = updates.produktyNielubiane;
    if (updates.alergieZywieniowe !== undefined)
      updateData.food_allergies = updates.alergieZywieniowe;
    if (updates.problemyZdrowotne !== undefined)
      updateData.health_issues = updates.problemyZdrowotne;
    if (updates.showMacrosInJadlospis !== undefined)
      updateData.show_macros = updates.showMacrosInJadlospis;
    if (updates.rodzajWspolpracy !== undefined)
      updateData.cooperation_type = updates.rodzajWspolpracy;
    if (updates.statusPlatnosci !== undefined)
      updateData.payment_status = updates.statusPlatnosci;
    if (updates.paymentDate !== undefined)
      updateData.payment_date =
        updates.paymentDate === "" ? null : updates.paymentDate;
    if (updates.paymentExpiresAt !== undefined)
      updateData.payment_expires_at =
        updates.paymentExpiresAt === "" ? null : updates.paymentExpiresAt;

    if (updates.assigned_template_id !== undefined)
      updateData.assigned_template_id = updates.assigned_template_id;
    if (updates.assigned_template_name !== undefined)
      updateData.assigned_template_name = updates.assigned_template_name;
    if (updates.current_weight !== undefined)
      updateData.current_weight =
        updates.current_weight === ""
          ? null
          : parseFloat(updates.current_weight);
    if (updates.current_activity_level !== undefined)
      updateData.current_activity_level = updates.current_activity_level;
    if (updates.bmr !== undefined) updateData.bmr = updates.bmr;
    if (updates.tdee !== undefined) updateData.tdee = updates.tdee;

    const { data, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (error) {
      logger.error("Błąd aktualizacji klienta:", error);
      return null;
    }

    return mapSupabaseToClient(data);
  } catch (error) {
    logger.error("Błąd podczas aktualizacji klienta:", error);
    return null;
  }
};

export const deleteClient = async (id: string): Promise<boolean> => {
  try {
    // 🎯 FIX: Force session refresh from storage (not memory cache)
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      logger.error("Błąd sesji:", sessionError);
      // Import dynamically to avoid circular dependency
      const { handleSessionExpiredError } =
        await import("@/utils/sessionErrorHandler");
      await handleSessionExpiredError(
        sessionError || new Error("Session not found"),
      );
      return false;
    }

    const user = session.user;

    // Pobierz wszystkie day_plan_id powiązane z klientem
    const { data: settings, error: settingsError } = await supabase
      .from("client_diet_settings")
      .select("day_plan_id")
      .eq("client_id", id);

    if (settingsError) {
      logger.error(
        "Błąd pobierania powiązanych ustawień klienta:",
        settingsError,
      );
      return false;
    }

    const dayPlanIds = (settings || []).map((s: any) => s.day_plan_id);

    // Usuń wszystkie client_diet_settings klienta
    const { error: deleteSettingsError } = await supabase
      .from("client_diet_settings")
      .delete()
      .eq("client_id", id);

    if (deleteSettingsError) {
      logger.error("Błąd usuwania client_diet_settings:", deleteSettingsError);
      return false;
    }

    // Usuń powiązane day_plans
    if (dayPlanIds.length > 0) {
      const { error: deleteDayPlansError } = await supabase
        .from("day_plans")
        .delete()
        .in("id", dayPlanIds);

      if (deleteDayPlansError) {
        logger.error("Błąd usuwania day_plans:", deleteDayPlansError);
        return false;
      }
    }

    // Usuń klienta
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      logger.error("Błąd usuwania klienta:", error);
      // 🎯 FIX: Check for session/RLS errors
      const { handleSessionExpiredError } =
        await import("@/utils/sessionErrorHandler");
      await handleSessionExpiredError(error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas usuwania klienta:", error);
    // 🎯 FIX: Check for session/RLS errors
    const { handleSessionExpiredError } =
      await import("@/utils/sessionErrorHandler");
    await handleSessionExpiredError(error);
    return false;
  }
};

export const getClientById = async (id: string): Promise<Client | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return null;
    }

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      logger.error("Błąd pobierania klienta:", error);
      return null;
    }

    return data ? mapSupabaseToClient(data) : null;
  } catch (error) {
    logger.error("Błąd podczas pobierania klienta:", error);
    return null;
  }
};

export const deleteDayPlanAndSettings = async (
  dayPlanId: string,
): Promise<boolean> => {
  try {
    // Usuń client_diet_settings powiązany z day_plan_id
    const { error: settingsError } = await supabase
      .from("client_diet_settings")
      .delete()
      .eq("day_plan_id", dayPlanId);

    if (settingsError) {
      logger.error("Błąd usuwania client_diet_settings:", settingsError);
      return false;
    }

    // Usuń day_plan
    const { error: dayPlanError } = await supabase
      .from("day_plans")
      .delete()
      .eq("id", dayPlanId);

    if (dayPlanError) {
      logger.error("Błąd usuwania day_plan:", dayPlanError);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas usuwania dnia i ustawień:", error);
    return false;
  }
};

export const updateClientDietSettings = async (
  dayPlanId: string,
  updates: {
    target_calories?: number;
    target_protein_grams?: number;
    target_protein_percentage?: number;
    target_fat_grams?: number;
    target_fat_percentage?: number;
    target_carbs_grams?: number;
    target_carbs_percentage?: number;
    target_fiber_grams?: number;
  },
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("client_diet_settings")
      .update(updates)
      .eq("day_plan_id", dayPlanId);

    if (error) {
      logger.error("Błąd aktualizacji client_diet_settings:", error);
      return false;
    }
    return true;
  } catch (error) {
    logger.error("Błąd podczas aktualizacji client_diet_settings:", error);
    return false;
  }
};

export const addDayPlanAndSettings = async (
  clientId: string,
  dayName: string,
): Promise<{ dayPlanId: string; clientDietSettingsId: string } | null> => {
  try {
    // 🎯 Issue #10 FIX: Znajdź następny sekwencyjny day_number dla klienta
    // Lepsze podejście: zapytaj bezpośrednio do day_plans z join przez settings
    const { data: existingDays, error: queryError } = await supabase
      .from("day_plans")
      .select(
        `
        day_number,
        client_diet_settings!inner(client_id)
      `,
      )
      .eq("client_diet_settings.client_id", clientId)
      .is("template_id", null);

    if (queryError) {
      logger.error("Błąd pobierania istniejących dni:", queryError);
    }

    // Znajdź maksymalny day_number dla tego klienta (domyślnie 0 jeśli brak dni)
    const maxDayNumber =
      existingDays && existingDays.length > 0
        ? Math.max(...existingDays.map((item: any) => item.day_number || 0))
        : 0;

    const nextDayNumber = maxDayNumber + 1;

    // Dodaj day_plan z poprawnym sekwencyjnym day_number
    const { data: dayPlan, error: dayPlanError } = await supabase
      .from("day_plans")
      .insert([{ name: dayName, template_id: null, day_number: nextDayNumber }])
      .select()
      .single();

    if (dayPlanError || !dayPlan) {
      logger.error("Błąd dodawania day_plan:", dayPlanError);
      return null;
    }

    // Dodaj client_diet_settings
    const { data: clientSettings, error: settingsError } = await supabase
      .from("client_diet_settings")
      .insert([
        {
          client_id: clientId,
          day_plan_id: dayPlan.id,
          target_calories: 0,
          target_protein_grams: 0,
          target_protein_percentage: 0,
          target_fat_grams: 0,
          target_fat_percentage: 0,
          target_carbs_grams: 0,
          target_carbs_percentage: 0,
          target_fiber_grams: 0,
        },
      ])
      .select()
      .single();

    if (settingsError || !clientSettings) {
      logger.error("Błąd dodawania client_diet_settings:", settingsError);
      return null;
    }

    return { dayPlanId: dayPlan.id, clientDietSettingsId: clientSettings.id };
  } catch (error) {
    logger.error(
      "Błąd podczas dodawania day_plan i client_diet_settings:",
      error,
    );
    return null;
  }
};

/**
 * Batch copy entire day plan with all meals and ingredients.
 *
 * This function:
 * 1. Creates new day_plan with new UUID and specified name
 * 2. Batch inserts all meals with new UUIDs
 * 3. Batch inserts all meal_ingredients with new UUIDs
 * 4. Creates client_diet_settings and copies macro targets from source
 *
 * @param clientId - Target client ID
 * @param sourceDayPlan - Source day plan with meals and ingredients
 * @param newDayName - Name for the new day
 * @param sourceDietSettings - Optional source diet settings to copy macro targets
 * @returns Object with new dayPlanId and clientDietSettingsId, or null on error
 */
export const copyDayPlan = async (
  clientId: string,
  sourceDayPlan: { id: string; name: string; meals: any[] },
  newDayName: string,
  sourceDietSettings?: any,
): Promise<{ dayPlanId: string; clientDietSettingsId: string } | null> => {
  try {
    // Step 1: Find next sequential day_number for client
    const { data: existingDays, error: queryError } = await supabase
      .from("day_plans")
      .select(
        `
        day_number,
        client_diet_settings!inner(client_id)
      `,
      )
      .eq("client_diet_settings.client_id", clientId)
      .is("template_id", null);

    if (queryError) {
      logger.error("Error fetching existing days:", queryError);
    }

    const maxDayNumber =
      existingDays && existingDays.length > 0
        ? Math.max(...existingDays.map((item: any) => item.day_number || 0))
        : 0;

    const nextDayNumber = maxDayNumber + 1;

    // Step 2: Create new day_plan with new UUID (already done by useCopyPasteDay hook)
    const newDayPlanId = crypto.randomUUID();
    const { data: dayPlan, error: dayPlanError } = await supabase
      .from("day_plans")
      .insert([
        {
          id: newDayPlanId,
          name: newDayName,
          template_id: null,
          day_number: nextDayNumber,
        },
      ])
      .select()
      .single();

    if (dayPlanError || !dayPlan) {
      logger.error("Error creating day_plan:", dayPlanError);
      return null;
    }

    // Step 3: Batch insert meals with new UUIDs
    if (sourceDayPlan.meals && sourceDayPlan.meals.length > 0) {
      // Build mapping of original meal ID to array index (for ingredient mapping later)
      const mealIndexMap = new Map<string, number>();

      const mealsToInsert = sourceDayPlan.meals.map(
        (meal: any, index: number) => {
          mealIndexMap.set(meal.id, index); // Track original ID → index

          return {
            id: crypto.randomUUID(),
            day_plan_id: dayPlan.id, // Link to new day
            name: meal.name,
            dish: meal.dish,
            time: meal.time,
            order_index: meal.order_index,
            instructions: meal.instructions,
            calories: meal.calories,
            protein: meal.protein,
            fat: meal.fat,
            carbs: meal.carbs,
            fiber: meal.fiber,
            count_in_daily_total: meal.countTowardsDailyCalories ?? true, // DB column name
            // Note: Do NOT include _originalMealId - it doesn't exist in DB schema
          };
        },
      );

      const { data: insertedMeals, error: mealsError } = await supabase
        .from("meals")
        .insert(mealsToInsert)
        .select();

      if (mealsError || !insertedMeals) {
        logger.error("Error inserting meals:", mealsError);
        // Cleanup: delete day_plan if meals insert failed
        await supabase.from("day_plans").delete().eq("id", dayPlan.id);
        return null;
      }

      // Step 4: Batch insert meal_ingredients with new UUIDs
      // Map original meal IDs to new meal IDs using index tracking
      const mealIdMap = new Map<string, string>();
      sourceDayPlan.meals.forEach((originalMeal: any) => {
        const index = mealIndexMap.get(originalMeal.id);
        if (index !== undefined && insertedMeals[index]) {
          mealIdMap.set(originalMeal.id, insertedMeals[index].id);
        }
      });

      const allIngredientsToInsert: any[] = [];
      sourceDayPlan.meals.forEach((originalMeal: any) => {
        if (originalMeal.ingredients && originalMeal.ingredients.length > 0) {
          const newMealId = mealIdMap.get(originalMeal.id);
          if (newMealId) {
            originalMeal.ingredients.forEach((ingredient: any) => {
              allIngredientsToInsert.push({
                id: crypto.randomUUID(),
                meal_id: newMealId, // Link to new meal
                ingredient_id: ingredient.ingredient_id,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                unit_weight: ingredient.unit_weight,
                calories: ingredient.calories,
                protein: ingredient.protein,
                fat: ingredient.fat,
                carbs: ingredient.carbs,
                fiber: ingredient.fiber,
              });
            });
          }
        }
      });

      if (allIngredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(allIngredientsToInsert);

        if (ingredientsError) {
          logger.error("Error inserting meal_ingredients:", ingredientsError);
          // Cleanup: delete meals and day_plan
          await supabase
            .from("meals")
            .delete()
            .in(
              "id",
              insertedMeals.map((m: any) => m.id),
            );
          await supabase.from("day_plans").delete().eq("id", dayPlan.id);
          return null;
        }
      }
    }

    // Step 5: Create client_diet_settings with macro targets (copy from source or default to 0)
    const { data: clientSettings, error: settingsError } = await supabase
      .from("client_diet_settings")
      .insert([
        {
          client_id: clientId,
          day_plan_id: dayPlan.id,
          target_calories: sourceDietSettings?.target_calories ?? 0,
          target_protein_grams: sourceDietSettings?.target_protein_grams ?? 0,
          target_protein_percentage:
            sourceDietSettings?.target_protein_percentage ?? 0,
          target_fat_grams: sourceDietSettings?.target_fat_grams ?? 0,
          target_fat_percentage: sourceDietSettings?.target_fat_percentage ?? 0,
          target_carbs_grams: sourceDietSettings?.target_carbs_grams ?? 0,
          target_carbs_percentage:
            sourceDietSettings?.target_carbs_percentage ?? 0,
          target_fiber_grams: sourceDietSettings?.target_fiber_grams ?? 0,
        },
      ])
      .select()
      .single();

    if (settingsError || !clientSettings) {
      logger.error("Error creating client_diet_settings:", settingsError);
      // Cleanup on failure
      await supabase.from("day_plans").delete().eq("id", dayPlan.id);
      return null;
    }

    return { dayPlanId: dayPlan.id, clientDietSettingsId: clientSettings.id };
  } catch (error) {
    logger.error("Error during copyDayPlan:", error);
    return null;
  }
};

// 🎯 GREEN PHASE: Copy day plan for templates (no client_diet_settings)
export const copyDayPlanTemplate = async (
  templateId: string,
  sourceDayPlan: { id: string; name: string; meals: any[] },
  newDayName: string,
): Promise<{ dayPlanId: string } | null> => {
  try {
    // Step 1: Find next sequential day_number for template
    const { data: existingDays, error: queryError } = await supabase
      .from("day_plans")
      .select("day_number")
      .eq("template_id", templateId);

    if (queryError) {
      logger.error("Error fetching existing template days:", queryError);
    }

    const maxDayNumber =
      existingDays && existingDays.length > 0
        ? Math.max(...existingDays.map((item: any) => item.day_number || 0))
        : 0;

    const nextDayNumber = maxDayNumber + 1;

    // Step 2: Create new day_plan with new UUID
    const newDayPlanId = crypto.randomUUID();
    const { data: dayPlan, error: dayPlanError } = await supabase
      .from("day_plans")
      .insert([
        {
          id: newDayPlanId,
          name: newDayName,
          template_id: templateId,
          day_number: nextDayNumber,
        },
      ])
      .select()
      .single();

    if (dayPlanError || !dayPlan) {
      logger.error("Error creating template day_plan:", dayPlanError);
      return null;
    }

    // Step 3: Batch insert meals with new UUIDs
    if (sourceDayPlan.meals && sourceDayPlan.meals.length > 0) {
      // Build mapping of original meal ID to array index (for ingredient mapping later)
      const mealIndexMap = new Map<string, number>();

      const mealsToInsert = sourceDayPlan.meals.map(
        (meal: any, index: number) => {
          mealIndexMap.set(meal.id, index); // Track original ID → index

          return {
            id: crypto.randomUUID(),
            day_plan_id: dayPlan.id, // Link to new day
            name: meal.name,
            dish: meal.dish,
            time: meal.time,
            order_index: meal.order_index,
            instructions: meal.instructions,
            calories: meal.calories,
            protein: meal.protein,
            fat: meal.fat,
            carbs: meal.carbs,
            fiber: meal.fiber,
            count_in_daily_total: meal.countTowardsDailyCalories ?? true, // DB column name
          };
        },
      );

      const { data: insertedMeals, error: mealsError } = await supabase
        .from("meals")
        .insert(mealsToInsert)
        .select();

      if (mealsError || !insertedMeals) {
        logger.error("Error inserting template meals:", mealsError);
        // Cleanup: delete day_plan if meals insert failed
        await supabase.from("day_plans").delete().eq("id", dayPlan.id);
        return null;
      }

      // Step 4: Batch insert meal_ingredients with new UUIDs
      // Map original meal IDs to new meal IDs using index tracking
      const mealIdMap = new Map<string, string>();
      sourceDayPlan.meals.forEach((originalMeal: any) => {
        const index = mealIndexMap.get(originalMeal.id);
        if (index !== undefined && insertedMeals[index]) {
          mealIdMap.set(originalMeal.id, insertedMeals[index].id);
        }
      });

      const allIngredientsToInsert: any[] = [];
      sourceDayPlan.meals.forEach((originalMeal: any) => {
        if (originalMeal.ingredients && originalMeal.ingredients.length > 0) {
          const newMealId = mealIdMap.get(originalMeal.id);
          if (newMealId) {
            originalMeal.ingredients.forEach((ingredient: any) => {
              allIngredientsToInsert.push({
                id: crypto.randomUUID(),
                meal_id: newMealId, // Link to new meal
                ingredient_id: ingredient.ingredient_id,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                unit_weight: ingredient.unit_weight,
                calories: ingredient.calories,
                protein: ingredient.protein,
                fat: ingredient.fat,
                carbs: ingredient.carbs,
                fiber: ingredient.fiber,
              });
            });
          }
        }
      });

      if (allIngredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(allIngredientsToInsert);

        if (ingredientsError) {
          logger.error(
            "Error inserting template meal_ingredients:",
            ingredientsError,
          );
          // Cleanup: delete meals and day_plan
          await supabase
            .from("meals")
            .delete()
            .in(
              "id",
              insertedMeals.map((m: any) => m.id),
            );
          await supabase.from("day_plans").delete().eq("id", dayPlan.id);
          return null;
        }
      }
    }

    return { dayPlanId: dayPlan.id };
  } catch (error) {
    logger.error("Error during copyDayPlanTemplate:", error);
    return null;
  }
};

// Pobierz wszystkie day_plans i client_diet_settings dla klienta
/**
 * Transform nested Supabase JOIN response to flat structure
 * Used by getClientDietPlansAndSettings for backward compatibility
 */
function transformNestedToFlat(nestedData: any[]): {
  settings: any[];
  dayPlans: any[];
} {
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
              (a: any, b: any) => (a.order_index || 0) - (b.order_index || 0),
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
 * 🚀 OPTIMIZED: Parallel queries for client diet plans
 *
 * Strategy: 4 queries run in PARALLEL via Promise.all
 * (Supabase nested SELECT was 10x slower due to missing FK indexes)
 *
 * BEFORE: 4 sequential queries (~2500ms total)
 * AFTER: 4 parallel queries (~max of single query time, ~300-500ms expected)
 */
export const getClientDietPlansAndSettings = async (clientId: string) => {
  const timer = perfTimer("getClientDietPlansAndSettings");

  try {
    // Step 1: Get settings first (we need day_plan_ids for next queries)
    const { data: settings, error: settingsError } = await supabase
      .from("client_diet_settings")
      .select("*")
      .eq("client_id", clientId);

    timer.checkpoint("SELECT client_diet_settings");

    if (settingsError) {
      logger.error("Błąd pobierania client_diet_settings:", settingsError);
      timer.end();
      return null;
    }

    if (!settings || settings.length === 0) {
      timer.end();
      return { settings: [], dayPlans: [] };
    }

    const dayPlanIds = settings.map((s: any) => s.day_plan_id);

    // Step 2: Run day_plans and meals queries in PARALLEL
    const [dayPlansResult, mealsResult] = await Promise.all([
      supabase
        .from("day_plans")
        .select("*")
        .in("id", dayPlanIds)
        .order("day_number", { ascending: true }),
      supabase
        .from("meals")
        .select("*")
        .in("day_plan_id", dayPlanIds)
        .order("order_index", { ascending: true }),
    ]);

    timer.checkpoint("PARALLEL: day_plans + meals");

    if (dayPlansResult.error) {
      logger.error("Błąd pobierania day_plans:", dayPlansResult.error);
      timer.end();
      return null;
    }

    if (mealsResult.error) {
      logger.error("Błąd pobierania meals:", mealsResult.error);
      timer.end();
      return null;
    }

    const dayPlans = dayPlansResult.data || [];
    const allMeals = mealsResult.data || [];

    // Step 3: Get ingredients (depends on meals)
    let ingredientsByMealId: { [mealId: string]: any[] } = {};
    if (allMeals.length > 0) {
      const allMealIds = allMeals.map((m) => m.id);
      const { data: allIngredients, error: ingredientsError } = await supabase
        .from("meal_ingredients")
        .select("*")
        .in("meal_id", allMealIds)
        .order("order_index", { ascending: true });

      timer.checkpoint("SELECT meal_ingredients");

      if (ingredientsError) {
        logger.error("Błąd pobierania meal_ingredients:", ingredientsError);
        timer.end();
        return null;
      }

      // Group ingredients by meal_id
      for (const ingredient of allIngredients || []) {
        if (!ingredientsByMealId[ingredient.meal_id]) {
          ingredientsByMealId[ingredient.meal_id] = [];
        }
        ingredientsByMealId[ingredient.meal_id].push(ingredient);
      }
    }

    // Step 4: Assemble final structure
    // Group meals by day_plan_id
    const mealsByDayPlan: { [dayPlanId: string]: any[] } = {};
    for (const meal of allMeals) {
      if (!mealsByDayPlan[meal.day_plan_id]) {
        mealsByDayPlan[meal.day_plan_id] = [];
      }
      // Attach ingredients to meal
      meal.ingredients = ingredientsByMealId[meal.id] || [];
      mealsByDayPlan[meal.day_plan_id].push(meal);
    }

    // Add meals to dayPlans
    const dayPlansWithMeals = dayPlans.map((dp: any) => ({
      ...dp,
      meals: (mealsByDayPlan[dp.id] || []).sort(
        (a, b) => (a.order_index || 0) - (b.order_index || 0),
      ),
    }));

    timer.end();
    return { settings, dayPlans: dayPlansWithMeals };
  } catch (error) {
    logger.error("Błąd podczas pobierania diet plans/settings:", error);
    timer.end();
    return null;
  }
};

// Diet plan data będzie przechowywane w osobnej tabeli lub jako JSON
export const saveDietPlanData = async (
  clientId: string,
  dietPlanData: Client["dietPlanData"],
): Promise<void> => {};

export const saveCalculatorState = async (
  clientId: string,
  calculatorState: any,
): Promise<void> => {};

export const getCalculatorState = async (clientId: string): Promise<any> => {
  return null;
};

export const assignTemplateToClient = async (
  clientId: string,
  templateId: string,
  templateName: string,
): Promise<Client | null> => {
  return null;
};

export const getClientsAssignedToTemplate = async (
  templateId: string,
): Promise<Client[]> => {
  return [];
};

export const unassignTemplateFromClient = async (
  clientId: string,
): Promise<Client | null> => {
  return null;
};

// ===== DIET SNAPSHOTS FUNCTIONALITY =====

// 🎯 TYPE SAFETY: Strongly-typed client settings interface
export interface SnapshotClientSettings {
  showMacrosInJadlospis: boolean;
  obecnyProces: string;
  current_weight?: number | null;
  current_activity_level?: number | null;
  wazneInformacje?: string | null;
}

// 🎯 TYPE SAFETY: Strongly-typed snapshot data interface
export interface SnapshotData {
  dayPlans: DayPlan[];
  dayCalories: Record<string, number>; // ✅ Changed from string to number
  dayMacros: Record<string, MacroPlanning>; // ✅ Changed from any
  clientSettings: SnapshotClientSettings;
}

// 🎯 TYPE SAFETY: Snapshot trigger types
export type SnapshotTriggerType =
  | "calculator"
  | "meal_added"
  | "meal_deleted"
  | "meal_edited"
  | "manual"
  | "important_notes_updated"
  | "template_applied"
  | "client_created"
  | "meal_reorder";

export interface DietSnapshot {
  id: string;
  client_id: string;
  snapshot_data: SnapshotData; // ✅ Strongly typed
  created_at: string;
  trigger_type: SnapshotTriggerType;
  trigger_description?: string | null;
  total_calories?: number | null;
  total_protein?: number | null;
  total_fat?: number | null;
  total_carbs?: number | null;
  version_name?: string | null;
  user_id: string;
  is_current: boolean;
}

export interface SnapshotStack {
  past: DietSnapshot[];
  current: DietSnapshot;
  future: DietSnapshot[];
}

export const buildSnapshotStack = (
  snapshots: DietSnapshot[],
): SnapshotStack | null => {
  if (snapshots.length === 0) {
    return null;
  }

  // Find current snapshot (marked with is_current: true)
  const currentIndex = snapshots.findIndex((s) => s.is_current);

  if (currentIndex === -1) {
    // Fallback: use newest snapshot as current
    logger.log("⚠️ NO CURRENT SNAPSHOT FOUND - using newest as fallback");
    return {
      past: snapshots.slice(1), // All older snapshots
      current: snapshots[0], // Newest as current
      future: [], // No future snapshots
    };
  }

  // Build stack structure:
  // snapshots are sorted DESC by created_at (newest first)
  // past = snapshots after current (older snapshots - for undo)
  // current = snapshot at currentIndex
  // future = snapshots before current (newer snapshots - for redo)
  return {
    past: snapshots.slice(currentIndex + 1), // Older snapshots (for undo)
    current: snapshots[currentIndex], // Current snapshot
    future: snapshots.slice(0, currentIndex), // Newer snapshots (for redo)
  };
};

export const createDietSnapshot = async (
  clientId: string,
  options: {
    trigger_type: DietSnapshot["trigger_type"];
    trigger_description?: string;
    version_name?: string;
    skipThrottling?: boolean;
    // 🚀 OPTIMIZATION: Opcjonalnie przekaż już pobrane dane aby uniknąć duplikacji zapytań
    cachedDietData?: { dayPlans: any[]; settings: any[] };
    cachedClientData?: Client;
  },
): Promise<DietSnapshot | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return null;
    }

    // Throttling usunięty - snapshoty tworzone zawsze

    // 🚀 OPTIMIZATION: Użyj cached data jeśli dostępne, w przeciwnym razie pobierz z DB
    let dayPlans: any[];
    let settings: any[];

    if (options.cachedDietData) {
      dayPlans = options.cachedDietData.dayPlans;
      settings = options.cachedDietData.settings;
    } else {
      const result = await getClientDietPlansAndSettings(clientId);
      if (!result) {
        logger.error("Nie udało się pobrać danych jadłospisu dla snapshotu");
        return null;
      }
      dayPlans = result.dayPlans;
      settings = result.settings;
    }

    // Przygotuj dane do snapshotu
    const dayCalories: { [dayId: string]: string } = {};
    const dayMacros: { [dayId: string]: any } = {};

    settings.forEach((s: any) => {
      dayCalories[s.day_plan_id] = s.target_calories?.toString() || "";
      dayMacros[s.day_plan_id] = {
        proteinGrams: s.target_protein_grams?.toString() || "",
        proteinPercentage: s.target_protein_percentage?.toString() || "",
        fatGrams: s.target_fat_grams?.toString() || "",
        fatPercentage: s.target_fat_percentage?.toString() || "",
        carbsGrams: s.target_carbs_grams?.toString() || "",
        carbsPercentage: s.target_carbs_percentage?.toString() || "",
        fiberGrams: s.target_fiber_grams?.toString() || "",
      };
    });

    // 🚀 OPTIMIZATION: Użyj cached client data jeśli dostępne
    let client: Client | null;
    if (options.cachedClientData) {
      client = options.cachedClientData;
    } else {
      client = await getClientById(clientId);
      if (!client) {
        logger.error("Nie udało się pobrać danych klienta dla snapshotu");
        return null;
      }
    }

    // Oblicz łączne wartości odżywcze
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    dayPlans.forEach((dayPlan) => {
      dayPlan.meals?.forEach((meal: any) => {
        if (meal.count_in_daily_total !== false) {
          totalCalories += meal.calories || 0;
          totalProtein += meal.protein || 0;
          totalFat += meal.fat || 0;
          totalCarbs += meal.carbs || 0;
        }
      });
    });

    const snapshotData = {
      dayPlans: dayPlans.map((dp: any) => ({
        id: dp.id,
        name: dp.name,
        day_number: dp.day_number, // 🎯 FIX: Save day_number to preserve order during undo/redo
        meals: (dp.meals || []).map((meal: any) => ({
          ...meal,
          countTowardsDailyCalories: meal.count_in_daily_total ?? true,
        })),
      })),
      dayCalories,
      dayMacros,
      clientSettings: {
        showMacrosInJadlospis: client.showMacrosInJadlospis,
        obecnyProces: client.obecnyProces,
        current_weight: client.current_weight, // 🎯 FIX: Include weight for calculator snapshots
        current_activity_level: client.current_activity_level, // 🎯 FIX: Include activity level
        wazneInformacje: client.wazneInformacje, // 🎯 FIX: Include important notes for complete restoration
      },
    };

    // Stack-based history: New snapshots automatically become current
    // 🎯 FIX: Manual snapshots should also be marked as current (they represent a savepoint)

    // Mark only the current snapshot as not current (optimization: 1 update instead of N)
    await supabase
      .from("diet_snapshots")
      .update({ is_current: false })
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .eq("is_current", true);

    // Zapisz snapshot do bazy danych
    const { data, error } = await supabase
      .from("diet_snapshots")
      .insert([
        {
          client_id: clientId,
          snapshot_data: snapshotData,
          trigger_type: options.trigger_type,
          trigger_description: options.trigger_description,
          version_name: options.version_name,
          total_calories: Math.round(totalCalories),
          total_protein: Math.round(totalProtein * 100) / 100,
          total_fat: Math.round(totalFat * 100) / 100,
          total_carbs: Math.round(totalCarbs * 100) / 100,
          user_id: user.id,
          is_current: true, // All new snapshots (including manual) become current
        },
      ])
      .select()
      .single();

    if (error) {
      logger.error("Błąd tworzenia snapshotu:", error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Błąd podczas tworzenia snapshotu:", error);
    return null;
  }
};

export const getDietSnapshots = async (
  clientId: string,
  options: {
    limit?: number;
    excludeManual?: boolean;
  } = {},
): Promise<DietSnapshot[]> => {
  const { limit = 50, excludeManual = false } = options; // Zwiększony domyślny limit

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return [];
    }

    let query = supabase
      .from("diet_snapshots")
      .select("*")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (excludeManual) {
      query = query.neq("trigger_type", "manual");
    }

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Błąd pobierania snapshoty:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Błąd podczas pobierania snapshoty:", error);
    return [];
  }
};

export const restoreDietSnapshot = async (
  snapshotId: string,
  options?: {
    skipCurrentUpdate?: boolean; // DEPRECATED: Use for backward compatibility only
    skipRefresh?: boolean; // NEW: Update is_current but don't trigger external refresh
  },
): Promise<boolean> => {
  const timer = perfTimer("restoreDietSnapshot");
  logger.info("🔄 RESTORE SNAPSHOT START:", snapshotId, options);

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("❌ Błąd pobierania użytkownika:", userError);
      timer.end();
      return false;
    }

    // Pobierz snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("diet_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .eq("user_id", user.id)
      .single();

    timer.checkpoint("SELECT snapshot");

    if (snapshotError || !snapshot) {
      logger.error("Błąd pobierania snapshotu:", snapshotError);
      timer.end();
      return false;
    }

    const { snapshot_data, client_id, trigger_type } = snapshot;

    // 🎯 ENHANCED: Special handling for calculator snapshots
    if (trigger_type === "calculator") {
      timer.checkpoint("calculator snapshot - delegating");
      return await restoreCalculatorSnapshot(
        snapshot_data,
        client_id,
        snapshotId,
        user.id,
      );
    }

    // ❌ REMOVED: No backup snapshots needed - user can navigate between existing versions

    // Usuń obecne day_plans i client_diet_settings klienta
    const currentResult = await getClientDietPlansAndSettings(client_id);
    timer.checkpoint("getClientDietPlansAndSettings (fetch current)");

    if (currentResult && currentResult.settings) {
      const currentDayPlanIds = currentResult.settings.map(
        (s: any) => s.day_plan_id,
      );

      // Usuń client_diet_settings
      if (currentDayPlanIds.length > 0) {
        await supabase
          .from("client_diet_settings")
          .delete()
          .eq("client_id", client_id);

        // Usuń day_plans
        await supabase.from("day_plans").delete().in("id", currentDayPlanIds);

        timer.checkpoint("DELETE current data (cascade)");
      }
    }

    // 🚀 OPTIMIZED: Batch INSERT instead of sequential
    // BEFORE: 30+ sequential INSERT queries (~18 seconds for 30 meals)
    // AFTER: 4 batch INSERT queries (~300-500ms)
    const dayPlansCount = snapshot_data.dayPlans?.length || 0;
    const mealsCount =
      snapshot_data.dayPlans?.reduce(
        (acc: number, dp: any) => acc + (dp.meals?.length || 0),
        0,
      ) || 0;

    const batchSuccess = await executeBatchInsertForSnapshot(
      snapshot_data,
      client_id,
    );

    if (!batchSuccess) {
      logger.error("Batch INSERT failed for snapshot restoration");
      timer.end();
      return false;
    }

    timer.checkpoint(
      `INSERT data (${dayPlansCount} days, ${mealsCount} meals) - BATCH`,
    );

    // 🎯 FIX: Restore client data (weight, activity level, important notes) from snapshot if available
    if (snapshot_data.clientSettings) {
      const clientUpdates: any = {};

      // Validate numeric fields - only update if valid number or null
      if (snapshot_data.clientSettings.current_weight !== undefined) {
        const weight = snapshot_data.clientSettings.current_weight;
        if (weight === null || weight === "" || weight === 0) {
          clientUpdates.current_weight = null; // Store as NULL in DB for empty values
        } else if (!isNaN(Number(weight))) {
          clientUpdates.current_weight = Number(weight);
        }
      }

      if (snapshot_data.clientSettings.current_activity_level !== undefined) {
        const activityLevel =
          snapshot_data.clientSettings.current_activity_level;
        if (
          activityLevel === null ||
          activityLevel === "" ||
          activityLevel === 0
        ) {
          clientUpdates.current_activity_level = null; // Store as NULL in DB for empty values
        } else if (!isNaN(Number(activityLevel))) {
          clientUpdates.current_activity_level = Number(activityLevel);
        }
      }

      // 🎯 FIX: Always restore important_notes for complete state restoration
      if (snapshot_data.clientSettings.wazneInformacje !== undefined) {
        clientUpdates.important_notes =
          snapshot_data.clientSettings.wazneInformacje;
      }

      if (Object.keys(clientUpdates).length > 0) {
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update(clientUpdates)
          .eq("id", client_id)
          .eq("user_id", user.id);

        if (clientUpdateError) {
          logger.error(
            "❌ Error updating client data from snapshot:",
            clientUpdateError,
          );
          return false; // Don't proceed if client update fails
        }
      }
    }

    // Update is_current flags - mark restored snapshot as current
    // 🎯 NEW: Always update for DB consistency (unless using deprecated skipCurrentUpdate)
    if (!options?.skipCurrentUpdate) {
      // First, set only the current snapshot as not current (optimization: 1 update instead of N)
      await supabase
        .from("diet_snapshots")
        .update({ is_current: false })
        .eq("client_id", client_id)
        .eq("user_id", user.id)
        .eq("is_current", true);

      // Then set the restored snapshot as current
      logger.info("🎯 SETTING SNAPSHOT AS CURRENT:", snapshotId);
      const { error: currentError } = await supabase
        .from("diet_snapshots")
        .update({ is_current: true })
        .eq("id", snapshotId)
        .eq("user_id", user.id);

      timer.checkpoint("UPDATE is_current flags");

      if (currentError) {
        logger.error("❌ Error setting snapshot as current:", currentError);
        timer.end();
        return false;
      }

      if (options?.skipRefresh) {
        logger.info(
          "✅ is_current UPDATED (skipRefresh mode - stack managed externally)",
        );
      } else {
        logger.info("✅ SNAPSHOT RESTORED AND SET AS CURRENT");
      }
    } else {
      logger.info(
        "⏭️ SKIPPING is_current UPDATE (deprecated skipCurrentUpdate mode)",
      );
    }

    // 🎯 FIX: Normalize day_number sequence after restore to prevent order changes
    logger.info("🔄 CALLING normalizeDayNumberSequence for client:", client_id);
    await normalizeDayNumberSequence(client_id, user.id);
    timer.checkpoint("normalizeDayNumberSequence");
    logger.info("✅ NORMALIZATION COMPLETED for client:", client_id);

    timer.end();
    return true;
  } catch (error) {
    logger.error("Błąd podczas przywracania snapshotu:", error);
    timer.end();
    return false;
  }
};

// 🎯 NEW: Normalize day_number sequence to prevent order changes after undo/redo
const normalizeDayNumberSequence = async (
  client_id: string,
  user_id: string,
) => {
  const timer = perfTimer("normalizeDayNumberSequence");

  try {
    logger.debug("🎯 NORMALIZE START:", { client_id, user_id });

    // Get all day plans for this client through client_diet_settings, ordered by current day_number
    const { data: dayPlans, error } = await supabase
      .from("day_plans")
      .select(
        `
        id,
        day_number,
        client_diet_settings!inner(
          client_id,
          clients!inner(user_id)
        )
      `,
      )
      .eq("client_diet_settings.client_id", client_id)
      .eq("client_diet_settings.clients.user_id", user_id)
      .is("template_id", null)
      .order("day_number", { ascending: true });

    timer.checkpoint("SELECT day_plans");

    if (error) {
      logger.error("Error fetching day plans for normalization:", error);
      timer.end();
      return;
    }

    if (!dayPlans || dayPlans.length === 0) {
      logger.debug("🔄 No day plans to normalize");
      timer.end();
      return;
    }

    // Update each day plan with sequential day_number (1, 2, 3, 4...)
    let updatesCount = 0;
    for (let i = 0; i < dayPlans.length; i++) {
      const expectedDayNumber = i + 1;
      const dayPlan = dayPlans[i];

      if (dayPlan.day_number !== expectedDayNumber) {
        logger.debug(
          `🔄 Updating day_number: ${dayPlan.id} from ${dayPlan.day_number} to ${expectedDayNumber}`,
        );

        const { error: updateError } = await supabase
          .from("day_plans")
          .update({ day_number: expectedDayNumber })
          .eq("id", dayPlan.id);

        if (updateError) {
          logger.error(
            `Error updating day_number for ${dayPlan.id}:`,
            updateError,
          );
        }
        updatesCount++;
      }
    }

    timer.checkpoint(
      `UPDATE day_numbers (${updatesCount} of ${dayPlans.length} days) - SEQUENTIAL`,
    );
    logger.debug("🔄 Day number normalization completed");
    timer.end();
  } catch (error) {
    logger.error("Error in normalizeDayNumberSequence:", error);
    timer.end();
  }
};

// 🎯 NEW: Dedicated calculator snapshot restore function
const restoreCalculatorSnapshot = async (
  snapshot_data: any,
  client_id: string,
  snapshotId: string,
  user_id: string,
): Promise<boolean> => {
  try {
    // Get current state for comparison
    const currentResult = await getClientDietPlansAndSettings(client_id);
    const currentDayPlans = currentResult?.dayPlans || [];
    const targetDayPlans = snapshot_data.dayPlans || [];

    // 🔍 Compare current vs target to determine what changed
    const currentDayNames = currentDayPlans.map((d: any) => d.name);
    const targetDayNames = targetDayPlans.map((d: any) => d.name);

    // Find days to remove (exist in current but not in target)
    const daysToRemove = currentDayPlans.filter(
      (day: any) => !targetDayNames.includes(day.name),
    );

    // Find days to add (exist in target but not in current)
    const daysToAdd = targetDayPlans.filter(
      (day: any) => !currentDayNames.includes(day.name),
    );

    // Find days to update (exist in both but may have different settings)
    const daysToUpdate = targetDayPlans.filter((day: any) =>
      currentDayNames.includes(day.name),
    );

    logger.log("Calculator restore analysis:", {
      daysToRemove: daysToRemove.length,
      daysToAdd: daysToAdd.length,
      daysToUpdate: daysToUpdate.length,
    });

    // 🗑️ Remove days that don't exist in target
    for (const dayToRemove of daysToRemove) {
      // Delete client_diet_settings first
      await supabase
        .from("client_diet_settings")
        .delete()
        .eq("client_id", client_id)
        .eq("day_plan_id", dayToRemove.id);

      // Delete day_plan
      await supabase.from("day_plans").delete().eq("id", dayToRemove.id);
    }

    // ➕ Add new days from target
    for (const dayToAdd of daysToAdd) {
      // Create day_plan
      const { data: newDayPlan, error: dayPlanError } = await supabase
        .from("day_plans")
        .insert([
          {
            name: dayToAdd.name,
            template_id: null,
            day_number: dayToAdd.day_number || 1,
          },
        ])
        .select()
        .single();

      if (dayPlanError || !newDayPlan) {
        logger.error("Error creating day_plan:", dayPlanError);
        continue;
      }

      // Create client_diet_settings
      const macros = snapshot_data.dayMacros?.[dayToAdd.id] || {};
      const calories = snapshot_data.dayCalories?.[dayToAdd.id] || "0";

      await supabase.from("client_diet_settings").insert([
        {
          client_id: client_id,
          day_plan_id: newDayPlan.id,
          target_calories: parseFloat(calories) || 0,
          target_protein_grams: parseFloat(macros.proteinGrams) || 0,
          target_protein_percentage: parseFloat(macros.proteinPercentage) || 0,
          target_fat_grams: parseFloat(macros.fatGrams) || 0,
          target_fat_percentage: parseFloat(macros.fatPercentage) || 0,
          target_carbs_grams: parseFloat(macros.carbsGrams) || 0,
          target_carbs_percentage: parseFloat(macros.carbsPercentage) || 0,
          target_fiber_grams: parseFloat(macros.fiberGrams) || 0,
        },
      ]);
    }

    // 🔄 Update existing days with new settings
    for (const dayToUpdate of daysToUpdate) {
      const currentDay = currentDayPlans.find(
        (d: any) => d.name === dayToUpdate.name,
      );
      if (!currentDay) continue;

      const macros = snapshot_data.dayMacros?.[dayToUpdate.id] || {};
      const calories = snapshot_data.dayCalories?.[dayToUpdate.id] || "0";

      // Update client_diet_settings
      await supabase
        .from("client_diet_settings")
        .update({
          target_calories: parseFloat(calories) || 0,
          target_protein_grams: parseFloat(macros.proteinGrams) || 0,
          target_protein_percentage: parseFloat(macros.proteinPercentage) || 0,
          target_fat_grams: parseFloat(macros.fatGrams) || 0,
          target_fat_percentage: parseFloat(macros.fatPercentage) || 0,
          target_carbs_grams: parseFloat(macros.carbsGrams) || 0,
          target_carbs_percentage: parseFloat(macros.carbsPercentage) || 0,
          target_fiber_grams: parseFloat(macros.fiberGrams) || 0,
        })
        .eq("client_id", client_id)
        .eq("day_plan_id", currentDay.id);
    }

    // 🎯 FIX: Restore client data (weight, activity level, important notes) from snapshot
    if (snapshot_data.clientSettings) {
      const clientUpdates: any = {};

      if (snapshot_data.clientSettings.current_weight !== undefined) {
        clientUpdates.current_weight =
          snapshot_data.clientSettings.current_weight;
      }

      if (snapshot_data.clientSettings.current_activity_level !== undefined) {
        clientUpdates.current_activity_level =
          snapshot_data.clientSettings.current_activity_level;
      }

      if (snapshot_data.clientSettings.wazneInformacje !== undefined) {
        clientUpdates.important_notes =
          snapshot_data.clientSettings.wazneInformacje;
      }

      if (Object.keys(clientUpdates).length > 0) {
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update(clientUpdates)
          .eq("id", client_id)
          .eq("user_id", user_id);

        if (clientUpdateError) {
          logger.error(
            "Error updating client data from snapshot:",
            clientUpdateError,
          );
        }
      }
    }

    // Update is_current flags - mark only the current snapshot as not current (optimization: 1 update instead of N)
    await supabase
      .from("diet_snapshots")
      .update({ is_current: false })
      .eq("client_id", client_id)
      .eq("user_id", user_id)
      .eq("is_current", true);

    await supabase
      .from("diet_snapshots")
      .update({ is_current: true })
      .eq("id", snapshotId)
      .eq("user_id", user_id);

    return true;
  } catch (error) {
    logger.error("Error in restoreCalculatorSnapshot:", error);
    return false;
  }
};

export const compareDietSnapshots = (
  snapshot1: DietSnapshot,
  snapshot2: DietSnapshot,
) => {
  const caloriesDiff =
    (snapshot2.total_calories || 0) - (snapshot1.total_calories || 0);
  const proteinDiff =
    (snapshot2.total_protein || 0) - (snapshot1.total_protein || 0);
  const fatDiff = (snapshot2.total_fat || 0) - (snapshot1.total_fat || 0);
  const carbsDiff = (snapshot2.total_carbs || 0) - (snapshot1.total_carbs || 0);

  // Znajdź dodane i usunięte posiłki
  const meals1 = snapshot1.snapshot_data.dayPlans.flatMap(
    (dp) => dp.meals || [],
  );
  const meals2 = snapshot2.snapshot_data.dayPlans.flatMap(
    (dp) => dp.meals || [],
  );

  const mealsAdded = meals2.filter(
    (m2) => !meals1.some((m1) => m1.name === m2.name && m1.dish === m2.dish),
  );
  const mealsRemoved = meals1.filter(
    (m1) => !meals2.some((m2) => m2.name === m1.name && m2.dish === m1.dish),
  );

  return {
    caloriesDiff,
    proteinDiff,
    fatDiff,
    carbsDiff,
    mealsAdded,
    mealsRemoved,
    changePercentage: snapshot1.total_calories
      ? Math.abs(caloriesDiff / snapshot1.total_calories) * 100
      : 0,
  };
};

export const deleteOldSnapshots = async (
  clientId: string,
  keepCount: number = 50,
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    // Pobierz wszystkie snapshoty klienta, posortowane od najnowszego
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("diet_snapshots")
      .select("id, created_at")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (snapshotsError || !snapshots || snapshots.length <= keepCount) {
      return true; // Brak błędu lub nie ma co usuwać
    }

    // Usuń stare snapshoty (zostaw tylko keepCount najnowszych)
    const snapshotsToDelete = snapshots.slice(keepCount);
    const idsToDelete = snapshotsToDelete.map((s) => s.id);

    const { error: deleteError } = await supabase
      .from("diet_snapshots")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      logger.error("Błąd usuwania starych snapshoty:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas usuwania starych snapshoty:", error);
    return false;
  }
};

// 🧹 NEW: Cleanup old snapshots (>X days) while preserving manual saves and current versions
export const cleanupOldSnapshots = async (
  clientId?: string,
  daysToKeep: number = 60,
  minimumToKeep: number = 5,
): Promise<{ deleted: number; preserved: number; details: string }> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return {
        deleted: 0,
        preserved: 0,
        details: "User authentication failed",
      };
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISOString = cutoffDate.toISOString();

    logger.log(
      `🧹 CLEANUP: Starting cleanup for snapshots older than ${daysToKeep} days (${cutoffISOString})`,
    );

    // Build query - either for specific client or all user's clients
    let query = supabase
      .from("diet_snapshots")
      .select(
        "id, client_id, created_at, trigger_type, is_current, trigger_description",
      )
      .eq("user_id", user.id)
      .lt("created_at", cutoffISOString) // Only snapshots older than cutoff
      .order("created_at", { ascending: false });

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data: oldSnapshots, error: snapshotsError } = await query;

    if (snapshotsError) {
      logger.error("Błąd pobierania starych snapshots:", snapshotsError);
      return {
        deleted: 0,
        preserved: 0,
        details: `Query error: ${snapshotsError.message}`,
      };
    }

    if (!oldSnapshots || oldSnapshots.length === 0) {
      logger.log("🧹 CLEANUP: No old snapshots to clean up");
      return { deleted: 0, preserved: 0, details: "No old snapshots found" };
    }

    // Separate snapshots into deletable and preserved
    const preservedSnapshots: any[] = [];
    const deletableSnapshots: any[] = [];

    for (const snapshot of oldSnapshots) {
      const shouldPreserve =
        snapshot.is_current === true || // Always keep current snapshots
        snapshot.trigger_type === "manual"; // Always keep manual snapshots

      if (shouldPreserve) {
        preservedSnapshots.push(snapshot);
      } else {
        deletableSnapshots.push(snapshot);
      }
    }

    // 🛡️ SAFETY: For each client, always keep minimum N snapshots regardless of age
    const clientGroups = new Map<string, any[]>();

    // Group all snapshots by client_id to check minimum counts
    if (clientId) {
      // For specific client, get all their snapshots
      const { data: allClientSnapshots } = await supabase
        .from("diet_snapshots")
        .select("id, created_at, trigger_type, is_current")
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (allClientSnapshots) {
        clientGroups.set(clientId, allClientSnapshots);
      }
    } else {
      // For all clients, group snapshots
      deletableSnapshots.forEach((s) => {
        if (!clientGroups.has(s.client_id)) {
          clientGroups.set(s.client_id, []);
        }
        clientGroups.get(s.client_id)!.push(s);
      });
    }

    // Filter out snapshots that would leave a client with fewer than minimumToKeep
    const finalDeletableSnapshots: any[] = [];

    for (const snapshot of deletableSnapshots) {
      const clientSnapshots = clientGroups.get(snapshot.client_id) || [];
      const totalClientSnapshots = clientSnapshots.length;

      // Count how many of this client's snapshots are in the deletable list
      const clientDeletableCount = deletableSnapshots.filter(
        (s) => s.client_id === snapshot.client_id,
      ).length;

      // If deleting this snapshot would leave the client with < minimumToKeep, preserve it
      if (totalClientSnapshots - clientDeletableCount >= minimumToKeep) {
        finalDeletableSnapshots.push(snapshot);
      } else {
        preservedSnapshots.push(snapshot);
        logger.log(
          `🛡️ SAFETY: Preserving snapshot ${snapshot.id} to maintain minimum ${minimumToKeep} for client ${snapshot.client_id}`,
        );
      }
    }

    // Perform deletion
    const deletedCount = finalDeletableSnapshots.length;
    const preservedCount = preservedSnapshots.length;

    if (deletedCount === 0) {
      logger.log("🧹 CLEANUP: No snapshots to delete after safety checks");
      return {
        deleted: 0,
        preserved: preservedCount,
        details: `All ${preservedCount} old snapshots preserved (manual saves, current versions, or minimum safety limit)`,
      };
    }

    // Delete the snapshots
    const idsToDelete = finalDeletableSnapshots.map((s) => s.id);
    const { error: deleteError } = await supabase
      .from("diet_snapshots")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      logger.error("Błąd usuwania snapshots podczas cleanup:", deleteError);
      return {
        deleted: 0,
        preserved: preservedCount,
        details: `Delete error: ${deleteError.message}`,
      };
    }

    // Log results
    const manualPreserved = preservedSnapshots.filter(
      (s) => s.trigger_type === "manual",
    ).length;
    const currentPreserved = preservedSnapshots.filter(
      (s) => s.is_current === true,
    ).length;
    const safetyPreserved = preservedCount - manualPreserved - currentPreserved;

    const details = [
      `Deleted: ${deletedCount} old snapshots`,
      `Preserved: ${preservedCount} total`,
      `- Manual saves: ${manualPreserved}`,
      `- Current versions: ${currentPreserved}`,
      `- Safety minimum: ${safetyPreserved}`,
      `Cutoff date: ${cutoffDate.toLocaleDateString("pl-PL")}`,
    ].join(", ");

    logger.log(`🧹 CLEANUP COMPLETED: ${details}`);

    return {
      deleted: deletedCount,
      preserved: preservedCount,
      details,
    };
  } catch (error) {
    logger.error("Błąd podczas cleanup snapshots:", error);
    return {
      deleted: 0,
      preserved: 0,
      details: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

// Delete single snapshot
export const deleteDietSnapshot = async (
  snapshotId: string,
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    const { error: deleteError } = await supabase
      .from("diet_snapshots")
      .delete()
      .eq("id", snapshotId)
      .eq("user_id", user.id);

    if (deleteError) {
      logger.error("Błąd usuwania snapshotu:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas usuwania snapshotu:", error);
    return false;
  }
};

// Restore important notes from snapshot (lightweight restore)
export const restoreImportantNotesSnapshot = async (
  snapshotId: string,
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    // Pobierz snapshot
    const { data: snapshot, error: snapshotError } = await supabase
      .from("diet_snapshots")
      .select("*")
      .eq("id", snapshotId)
      .eq("user_id", user.id)
      .single();

    if (snapshotError || !snapshot) {
      logger.error("Błąd pobierania snapshotu:", snapshotError);
      return false;
    }

    const { snapshot_data, client_id } = snapshot;

    // Sprawdź czy snapshot zawiera clientSettings z ważnymi informacjami
    if (!snapshot_data?.clientSettings?.hasOwnProperty("wazneInformacje")) {
      logger.error("Snapshot nie zawiera ważnych informacji");
      return false;
    }

    // Zaktualizuj ważne informacje klienta
    const { error: updateError } = await supabase
      .from("clients")
      .update({
        important_notes: snapshot_data.clientSettings.wazneInformacje,
      })
      .eq("id", client_id)
      .eq("user_id", user.id);

    if (updateError) {
      logger.error("Błąd aktualizacji ważnych informacji:", updateError);
      return false;
    }

    // Update is_current flags - mark only the current snapshot as not current (optimization: 1 update instead of N)
    await supabase
      .from("diet_snapshots")
      .update({ is_current: false })
      .eq("client_id", client_id)
      .eq("user_id", user.id)
      .eq("is_current", true);

    // Then set the restored snapshot as current
    await supabase
      .from("diet_snapshots")
      .update({ is_current: true })
      .eq("id", snapshotId)
      .eq("user_id", user.id);

    return true;
  } catch (error) {
    logger.error("Błąd podczas przywracania ważnych informacji:", error);
    return false;
  }
};

// Delete multiple snapshots
export const deleteDietSnapshots = async (
  snapshotIds: string[],
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    // 🛡️ PROTECTION: Check if any of the snapshots to be deleted are current versions
    const { data: currentSnapshots, error: checkError } = await supabase
      .from("diet_snapshots")
      .select("id, is_current")
      .in("id", snapshotIds)
      .eq("user_id", user.id)
      .eq("is_current", true);

    if (checkError) {
      logger.error("Błąd sprawdzania aktualnych snapshoty:", checkError);
      return false;
    }

    // If any current snapshots are found, prevent deletion
    if (currentSnapshots && currentSnapshots.length > 0) {
      logger.error(
        "❌ Cannot delete current snapshots:",
        currentSnapshots.map((s) => s.id),
      );
      throw new Error(
        "Nie można usunąć aktualnej wersji. Wybierz inną wersję jako aktualną przed usunięciem.",
      );
    }

    // 🎯 SAFE DELETION: Only delete non-current snapshots
    const { error: deleteError } = await supabase
      .from("diet_snapshots")
      .delete()
      .in("id", snapshotIds)
      .eq("user_id", user.id)
      .eq("is_current", false); // Extra safety: only delete non-current

    if (deleteError) {
      logger.error("Błąd usuwania snapshoty:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas usuwania snapshoty:", error);
    return false;
  }
};

// 🛡️ AUTO-FIX: Mark first snapshot as current if none are marked
export const ensureCurrentSnapshot = async (
  clientId: string,
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    // Check if any snapshot is marked as current
    const { data: currentSnapshots, error: checkError } = await supabase
      .from("diet_snapshots")
      .select("id")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .eq("is_current", true);

    if (checkError) {
      logger.error("Błąd sprawdzania aktualnych snapshoty:", checkError);
      return false;
    }

    // If no current snapshot exists, mark the newest (first) one as current
    if (!currentSnapshots || currentSnapshots.length === 0) {
      const { data: newestSnapshot, error: newestError } = await supabase
        .from("diet_snapshots")
        .select("id")
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (newestError || !newestSnapshot) {
        logger.error("Błąd pobierania najnowszego snapshotu:", newestError);
        return false;
      }

      // Mark the newest snapshot as current
      const { error: updateError } = await supabase
        .from("diet_snapshots")
        .update({ is_current: true })
        .eq("id", newestSnapshot.id)
        .eq("user_id", user.id);

      if (updateError) {
        logger.error("Błąd oznaczania snapshotu jako aktualny:", updateError);
        return false;
      }

      logger.log(
        "🎯 AUTO-FIX: Marked newest snapshot as current:",
        newestSnapshot.id,
      );
      return true;
    }

    return true; // Already has current snapshot
  } catch (error) {
    logger.error("Błąd podczas sprawdzania aktualnego snapshotu:", error);
    return false;
  }
};

/**
 * Mapuje istniejące ustawienia kalkulatora day-by-day dla dokładnego zachowania
 * @param settings - Array of client_diet_settings
 * @returns Array - ustawienia per dzień z dokładnymi wartościami
 */
const mapExistingDaySettings = (settings: any[]) => {
  return settings.map((setting, index) => ({
    dayNumber: index + 1, // day_number or sequence
    targetCalories: parseFloat(setting.target_calories) || 0,
    proteinGrams: parseFloat(setting.target_protein_grams) || 0,
    proteinPercentage: parseFloat(setting.target_protein_percentage) || 0,
    fatGrams: parseFloat(setting.target_fat_grams) || 0,
    fatPercentage: parseFloat(setting.target_fat_percentage) || 0,
    carbsGrams: parseFloat(setting.target_carbs_grams) || 0,
    carbsPercentage: parseFloat(setting.target_carbs_percentage) || 0,
    fiberGrams: parseFloat(setting.target_fiber_grams) || 0,
  }));
};

/**
 * Stosuje szablon jadłospisu do klienta - usuwa stare day_plans i tworzy nowe na podstawie szablonu
 * Zachowuje ustawienia kalkulatora (day-by-day mapping)
 * @param clientId - ID klienta
 * @param templateId - ID szablonu do zastosowania
 * @returns Promise<boolean> - true jeśli operacja się powiodła
 */
export const applyTemplateToClient = async (
  clientId: string,
  templateId: string,
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    // 1. Backup nie jest potrzebny - aktualny stan jest chroniony jako is_current

    // 2. Pobierz dane szablonu
    const { getTemplateById } = await import("@/utils/supabaseTemplates");
    const template = await getTemplateById(templateId);

    if (!template || !template.day_plans) {
      logger.error("Nie udało się pobrać danych szablonu");
      return false;
    }

    // 2.5. Zachowaj dane kalkulatora day-by-day
    let savedCalculatorData = null;
    // Pobierz aktualne client_diet_settings
    const currentResult = await getClientDietPlansAndSettings(clientId);
    if (currentResult?.settings?.length > 0) {
      savedCalculatorData = {
        daySettings: mapExistingDaySettings(currentResult.settings),
      };
    }

    // Pobierz dane z clients table (bmr, tdee, activity level) - zawsze zachowujemy
    const { data: clientData } = await supabase
      .from("clients")
      .select("bmr, tdee, current_activity_level, current_weight")
      .eq("id", clientId)
      .single();

    if (clientData) {
      savedCalculatorData = {
        ...savedCalculatorData,
        bmr: clientData.bmr,
        tdee: clientData.tdee,
        currentActivityLevel: clientData.current_activity_level,
        currentWeight: clientData.current_weight,
      };
    }

    // 3. Usuń stare dane klienta (używaj już pobranych danych)
    if (currentResult && currentResult.settings) {
      const currentDayPlanIds = currentResult.settings.map(
        (s: any) => s.day_plan_id,
      );

      // Usuń client_diet_settings
      if (currentDayPlanIds.length > 0) {
        await supabase
          .from("client_diet_settings")
          .delete()
          .eq("client_id", clientId);

        // Usuń day_plans (cascade delete usunie meals i ingredients)
        await supabase.from("day_plans").delete().in("id", currentDayPlanIds);
      }
    }

    // 4. Stwórz nowe day_plans na podstawie szablonu
    // ZABEZPIECZENIE: Sortuj day_plans po day_number przed przetwarzaniem (dodatkowa ochrona)
    const sortedDayPlans = template.day_plans.sort(
      (a: any, b: any) => (a.day_number ?? 0) - (b.day_number ?? 0),
    );

    for (const templateDayPlan of sortedDayPlans) {
      // Utwórz nowy day_plan
      const { data: newDayPlan, error: dayPlanError } = await supabase
        .from("day_plans")
        .insert([
          {
            name: templateDayPlan.name,
            template_id: null, // Nie linkujemy bezpośrednio do szablonu
            day_number: templateDayPlan.day_number || 1,
          },
        ])
        .select()
        .single();

      if (dayPlanError || !newDayPlan) {
        logger.error("Błąd tworzenia day_plan:", dayPlanError);
        return false;
      }

      // Utwórz client_diet_settings dla tego dnia - day-by-day mapping
      const dayNumber = templateDayPlan.day_number || 1;
      const existingDaySettings = savedCalculatorData?.daySettings?.find(
        (day: any) => day.dayNumber === dayNumber,
      );

      const settingsToInsert = {
        client_id: clientId,
        day_plan_id: newDayPlan.id,
        target_calories: existingDaySettings?.targetCalories || 0,
        target_protein_grams: existingDaySettings?.proteinGrams || 0,
        target_protein_percentage: existingDaySettings?.proteinPercentage || 0,
        target_fat_grams: existingDaySettings?.fatGrams || 0,
        target_fat_percentage: existingDaySettings?.fatPercentage || 0,
        target_carbs_grams: existingDaySettings?.carbsGrams || 0,
        target_carbs_percentage: existingDaySettings?.carbsPercentage || 0,
        target_fiber_grams: existingDaySettings?.fiberGrams || 0,
      };

      await supabase.from("client_diet_settings").insert([settingsToInsert]);

      // 5. Skopiuj posiłki z szablonu
      if (templateDayPlan.meals && templateDayPlan.meals.length > 0) {
        for (const templateMeal of templateDayPlan.meals) {
          const { data: newMeal, error: mealError } = await supabase
            .from("meals")
            .insert([
              {
                name: templateMeal.name,
                dish: templateMeal.dish,
                instructions: templateMeal.instructions || [],
                calories: templateMeal.calories || 0,
                protein: templateMeal.protein || 0,
                carbs: templateMeal.carbs || 0,
                fat: templateMeal.fat || 0,
                fiber: templateMeal.fiber || 0,
                count_in_daily_total: templateMeal.count_in_daily_total ?? true,
                day_plan_id: newDayPlan.id,
                order_index: templateMeal.order_index || 0,
                time: templateMeal.time || "",
              },
            ])
            .select()
            .single();

          if (mealError || !newMeal) {
            logger.error("Błąd tworzenia posiłku:", mealError);
            continue; // Kontynuuj z następnym posiłkiem
          }

          // 6. Skopiuj składniki posiłku (z zachowaniem kolejności)
          if (templateMeal.ingredients && templateMeal.ingredients.length > 0) {
            const ingredientsToInsert = templateMeal.ingredients.map(
              (ingredient: any, index: number) => ({
                meal_id: newMeal.id,
                name: ingredient.name,
                quantity: ingredient.quantity || 0,
                unit: ingredient.unit || "",
                calories: ingredient.calories || 0,
                protein: ingredient.protein || 0,
                carbs: ingredient.carbs || 0,
                fat: ingredient.fat || 0,
                fiber: ingredient.fiber || 0,
                order_index: index, // Zachowanie kolejności składników
              }),
            );

            await supabase.from("meal_ingredients").insert(ingredientsToInsert);
          }
        }
      }
    }

    // 7. Stwórz snapshot po zastosowaniu
    await createDietSnapshot(clientId, {
      trigger_type: "template_applied",
      trigger_description: `Zastosowano szablon: ${template.title || template.name || "Nieznany szablon"}`,
      version_name: `Szablon: ${template.title || template.name || "Nieznany szablon"}`,
    });

    if (savedCalculatorData) {
    }
    return true;
  } catch (error) {
    logger.error("Błąd podczas stosowania szablonu:", error);
    return false;
  }
};

// Clear all snapshots for a specific client (for testing)
export const clearAllSnapshots = async (
  clientId?: string,
): Promise<boolean> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return false;
    }

    let query = supabase.from("diet_snapshots").delete().eq("user_id", user.id);

    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { error: deleteError } = await query;

    if (deleteError) {
      logger.error("Błąd czyszczenia snapshoty:", deleteError);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas czyszczenia snapshoty:", error);
    return false;
  }
};

// ===== SHARE TOKEN FUNCTIONALITY =====

/**
 * Generuje i zapisuje token do publicznego udostępniania jadłospisu
 * @param clientId - ID klienta
 * @returns Promise<string | null> - wygenerowany token lub null w przypadku błędu
 */
export const generateShareToken = async (
  clientId: string,
): Promise<string | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return null;
    }

    // Sprawdź czy klient już ma token
    const { data: existingClient, error: existingError } = await supabase
      .from("clients")
      .select("share_token")
      .eq("id", clientId)
      .eq("user_id", user.id)
      .single();

    if (existingError) {
      logger.error("Błąd sprawdzania istniejącego tokenu:", existingError);
      return null;
    }

    // Jeśli token już istnieje, zwróć go
    if (existingClient?.share_token) {
      return existingClient.share_token;
    }

    // Generuj nowy token (UUID) po stronie klienta z fallback
    const generateUUID = () => {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
      // Fallback - manual UUID v4 generation dla starszych przeglądarek
      return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
          const r = (Math.random() * 16) | 0;
          const v = c == "x" ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        },
      );
    };

    const newToken = generateUUID();

    // Zapisz token w bazie
    const { data, error } = await supabase
      .from("clients")
      .update({ share_token: newToken })
      .eq("id", clientId)
      .eq("user_id", user.id)
      .select("share_token")
      .single();

    if (error) {
      logger.error("Błąd zapisywania tokenu:", error);
      return null;
    }

    return data.share_token;
  } catch (error) {
    logger.error("Błąd podczas generowania tokenu:", error);
    return null;
  }
};

/**
 * Pobiera dane klienta po tokenie współdzielenia (publiczny dostęp)
 * Uses a single SECURITY DEFINER RPC function to bypass RLS and fetch all data.
 * @param token - token współdzielenia (UUID)
 * @returns Promise<Client | null> - dane klienta z jadłospisem lub null
 */
export const getClientByShareToken = async (
  token: string,
): Promise<Client | null> => {
  try {
    // Use the comprehensive RPC function that returns all diet data in one call
    // This bypasses RLS issues with cascade policies
    const { data, error } = await supabase
      .rpc("get_public_diet_data", { p_token: token })
      .single();

    if (error) {
      logger.error("Błąd pobierania danych publicznych po tokenie:", error);
      return null;
    }

    // Type assertion for RPC response
    const rpcData = data as { client: any; settings: any[]; dayPlans: any[] } | null;

    if (!rpcData || !rpcData.client) {
      return null;
    }

    const { client, settings, dayPlans } = rpcData;

    // Build client object (map DB column names to frontend names)
    // Note: Public view only needs subset of Client fields
    const clientData = {
      id: client.id,
      imie: client.first_name || "",
      nazwisko: client.last_name || "",
      wazneInformacje: client.important_notes || "",
      showMacrosInJadlospis: client.show_macros ?? true,
      bmr: client.bmr,
      tdee: client.tdee,
      current_weight: client.current_weight,
      share_token: client.share_token,
    } as Client;

    // Build day calories and macros from settings
    const dayCalories: { [dayId: string]: string } = {};
    const dayMacros: { [dayId: string]: any } = {};

    if (settings && Array.isArray(settings)) {
      settings.forEach((s: any) => {
        dayCalories[s.day_plan_id] = s.target_calories?.toString() || "";
        dayMacros[s.day_plan_id] = {
          proteinGrams: s.target_protein_grams?.toString() || "",
          proteinPercentage: s.target_protein_percentage?.toString() || "",
          fatGrams: s.target_fat_grams?.toString() || "",
          fatPercentage: s.target_fat_percentage?.toString() || "",
          carbsGrams: s.target_carbs_grams?.toString() || "",
          carbsPercentage: s.target_carbs_percentage?.toString() || "",
          fiberGrams: s.target_fiber_grams?.toString() || "",
        };
      });
    }

    // Build diet plan data from dayPlans (already includes meals and ingredients)
    clientData.dietPlanData = {
      dayPlans: (dayPlans || []).map((dp: any) => ({
        id: dp.id,
        name: dp.name,
        meals: (dp.meals || []).map((meal: any) => ({
          id: meal.id,
          day_plan_id: meal.day_plan_id,
          name: meal.name,
          dish: meal.dish || "",
          instructions: meal.instructions || [],
          time: meal.time || "",
          calories: meal.calories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          fiber: meal.fiber || 0,
          order_index: meal.order_index,
          countTowardsDailyCalories: meal.count_in_daily_total ?? true,
          ingredients: meal.ingredients || [],
        })),
      })),
      dayCalories,
      dayMacros,
      calculatorResults:
        clientData.bmr && clientData.tdee
          ? {
              bmr: clientData.bmr,
              tdee: clientData.tdee,
            }
          : null,
      currentWeight: clientData.current_weight || "",
      importantNotes: clientData.wazneInformacje || "",
    };

    return clientData;
  } catch (error) {
    logger.error("Błąd podczas pobierania klienta po tokenie:", error);
    return null;
  }
};

// ===== DAY PLAN NAME AND DUPLICATION FUNCTIONALITY =====

/**
 * Aktualizuje nazwę day_plan
 * @param dayPlanId - ID day_plan do aktualizacji
 * @param newName - nowa nazwa
 * @returns Promise<boolean> - true jeśli operacja się powiodła
 */
export const updateDayPlanName = async (
  dayPlanId: string,
  newName: string,
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("day_plans")
      .update({ name: newName })
      .eq("id", dayPlanId);

    if (error) {
      logger.error("Błąd aktualizacji nazwy day_plan:", error);
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Błąd podczas aktualizacji nazwy day_plan:", error);
    return false;
  }
};

// ===== IMPORTANT NOTES SNAPSHOT FUNCTIONALITY =====

/**
 * Tworzy lightweight snapshot dla ważnych informacji - bez danych diety
 * @param clientId - ID klienta
 * @param importantNotes - treść ważnych informacji
 * @returns Promise<DietSnapshot | null>
 */
export const createImportantNotesSnapshot = async (
  clientId: string,
  importantNotes: string,
  options: {} = {},
): Promise<DietSnapshot | null> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error("Błąd pobierania użytkownika:", userError);
      return null;
    }

    // 🎯 FIX: Always create FULL snapshots for proper undo/redo functionality
    // Get complete client diet data for snapshot
    const result = await getClientDietPlansAndSettings(clientId);
    if (!result) {
      logger.error(
        "Nie udało się pobrać pełnych danych diety dla snapshotu ważnych informacji",
      );
      return null;
    }

    const client = await getClientById(clientId);
    if (!client) {
      logger.error(
        "Nie udało się pobrać danych klienta dla snapshotu ważnych informacji",
      );
      return null;
    }

    // Get current macro data from settings (same logic as createDietSnapshot)
    const { dayPlans, settings } = result;

    const dayCalories: { [dayId: string]: string } = {};
    const dayMacros: { [dayId: string]: any } = {};

    settings.forEach((s: any) => {
      dayCalories[s.day_plan_id] = s.target_calories?.toString() || "";
      dayMacros[s.day_plan_id] = {
        proteinGrams: s.target_protein_grams?.toString() || "",
        proteinPercentage: s.target_protein_percentage?.toString() || "",
        fatGrams: s.target_fat_grams?.toString() || "",
        fatPercentage: s.target_fat_percentage?.toString() || "",
        carbsGrams: s.target_carbs_grams?.toString() || "",
        carbsPercentage: s.target_carbs_percentage?.toString() || "",
        fiberGrams: s.target_fiber_grams?.toString() || "",
      };
    });

    // Prepare FULL snapshot with complete diet data + updated important notes
    const snapshotData = {
      dayPlans: dayPlans.map((dp: any) => ({
        id: dp.id,
        name: dp.name,
        day_number: dp.day_number, // Preserve order during undo/redo
        meals: (dp.meals || []).map((meal: any) => ({
          ...meal,
          countTowardsDailyCalories: meal.count_in_daily_total ?? true,
        })),
      })),
      dayCalories,
      dayMacros,
      clientSettings: {
        showMacrosInJadlospis: client.showMacrosInJadlospis ?? true,
        obecnyProces: client.obecnyProces || "",
        wazneInformacje: importantNotes, // Updated important notes
        current_weight: client.current_weight, // Include all client data
        current_activity_level: client.current_activity_level,
      },
    };

    // Przygotuj opis snapshotu z fragmentem tekstu
    const previewText =
      importantNotes.length > 50
        ? `${importantNotes.substring(0, 50)}...`
        : importantNotes;

    const trigger_description = importantNotes.trim()
      ? `Zaktualizowano ważne informacje: "${previewText}"`
      : "Wyczyszczono ważne informacje";

    // 🎯 STACK-BASED HISTORY: Clear future snapshots if needed (same logic as createDietSnapshot)
    // Stack-based history: New snapshots automatically become current
    if (options.clearFutureSnapshots !== false) {
      // Get current snapshot to determine what is "future"
      const { data: currentSnapshot } = await supabase
        .from("diet_snapshots")
        .select("id, created_at")
        .eq("client_id", clientId)
        .eq("user_id", user.id)
        .eq("is_current", true)
        .single();

      if (currentSnapshot) {
        // Delete all snapshots newer than current (future snapshots)
        await supabase
          .from("diet_snapshots")
          .delete()
          .eq("client_id", clientId)
          .eq("user_id", user.id)
          .gt("created_at", currentSnapshot.created_at);

        logger.log(
          "🗑️ STACK-BASED (Important Notes): Cleared future snapshots after:",
          currentSnapshot.created_at,
        );
      }
    }

    // First, mark only the current snapshot as not current (optimization: 1 update instead of N)
    await supabase
      .from("diet_snapshots")
      .update({ is_current: false })
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .eq("is_current", true);

    // Zapisz snapshot
    const { data, error } = await supabase
      .from("diet_snapshots")
      .insert({
        client_id: clientId,
        user_id: user.id,
        snapshot_data: snapshotData,
        trigger_type: "important_notes_updated",
        trigger_description,
        total_calories: 0, // Brak kalorii dla tego typu snapshotu
        total_protein: 0,
        total_fat: 0,
        total_carbs: 0,
      })
      .select()
      .single();

    if (error) {
      logger.error("Błąd tworzenia snapshotu ważnych informacji:", error);
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Błąd podczas tworzenia snapshotu ważnych informacji:", error);
    return null;
  }
};

// ===== GLOBAL CLEANUP FUNCTIONALITY =====

/**
 * 🌍 Global cleanup function - cleans up old snapshots for all user's clients
 * Useful for scheduled jobs or admin cleanup operations
 * @param daysToKeep - Number of days to keep snapshots (default: 60)
 * @param minimumToKeep - Minimum snapshots to keep per client regardless of age (default: 5)
 * @returns Promise with aggregated cleanup results
 */
export const cleanupAllUsersOldSnapshots = async (
  daysToKeep: number = 60,
  minimumToKeep: number = 5,
): Promise<{
  totalDeleted: number;
  totalPreserved: number;
  clientsProcessed: number;
  details: string[];
  errors: string[];
}> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      logger.error(
        "Błąd pobierania użytkownika dla global cleanup:",
        userError,
      );
      return {
        totalDeleted: 0,
        totalPreserved: 0,
        clientsProcessed: 0,
        details: ["User authentication failed"],
        errors: ["User authentication failed"],
      };
    }

    // Get all unique client IDs for this user that have snapshots
    const { data: clientSnapshots, error: clientsError } = await supabase
      .from("diet_snapshots")
      .select("client_id")
      .eq("user_id", user.id);

    if (clientsError) {
      logger.error("Błąd pobierania klientów z snapshots:", clientsError);
      return {
        totalDeleted: 0,
        totalPreserved: 0,
        clientsProcessed: 0,
        details: ["Failed to query clients"],
        errors: [`Query error: ${clientsError.message}`],
      };
    }

    // Get unique client IDs
    const uniqueClientIds = [
      ...new Set(clientSnapshots?.map((s) => s.client_id) || []),
    ];

    if (uniqueClientIds.length === 0) {
      logger.log("🌍 GLOBAL CLEANUP: No clients with snapshots found");
      return {
        totalDeleted: 0,
        totalPreserved: 0,
        clientsProcessed: 0,
        details: ["No clients with snapshots found"],
        errors: [],
      };
    }

    logger.log(
      `🌍 GLOBAL CLEANUP: Starting cleanup for ${uniqueClientIds.length} clients`,
    );

    // Process each client individually
    let totalDeleted = 0;
    let totalPreserved = 0;
    let clientsProcessed = 0;
    const details: string[] = [];
    const errors: string[] = [];

    for (const clientId of uniqueClientIds) {
      try {
        logger.log(`🧹 Processing client: ${clientId}`);

        const result = await cleanupOldSnapshots(
          clientId,
          daysToKeep,
          minimumToKeep,
        );

        totalDeleted += result.deleted;
        totalPreserved += result.preserved;
        clientsProcessed++;

        if (result.deleted > 0 || result.preserved > 0) {
          details.push(`Client ${clientId}: ${result.details}`);
        }

        // Small delay to avoid overwhelming the database
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (clientError) {
        const errorMsg = `Client ${clientId}: ${clientError instanceof Error ? clientError.message : "Unknown error"}`;
        logger.error(
          "Error processing client during global cleanup:",
          errorMsg,
        );
        errors.push(errorMsg);
      }
    }

    const summary = `Processed ${clientsProcessed}/${uniqueClientIds.length} clients, deleted ${totalDeleted} snapshots, preserved ${totalPreserved} snapshots`;
    logger.log(`🌍 GLOBAL CLEANUP COMPLETED: ${summary}`);

    return {
      totalDeleted,
      totalPreserved,
      clientsProcessed,
      details: [summary, ...details],
      errors,
    };
  } catch (error) {
    logger.error("Błąd podczas global cleanup snapshots:", error);
    return {
      totalDeleted: 0,
      totalPreserved: 0,
      clientsProcessed: 0,
      details: ["Global cleanup failed"],
      errors: [
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
    };
  }
};

/**
 * 📊 Get cleanup statistics - shows what would be cleaned without actually deleting
 * @param clientId - Optional specific client ID, or undefined for all clients
 * @param daysToKeep - Number of days to keep snapshots (default: 60)
 * @returns Promise with statistics about what would be cleaned
 */
export const getCleanupStats = async (
  clientId?: string,
  daysToKeep: number = 60,
): Promise<{
  totalSnapshots: number;
  oldSnapshots: number;
  manualSnapshots: number;
  currentSnapshots: number;
  wouldDelete: number;
  wouldPreserve: number;
  cutoffDate: string;
}> => {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        totalSnapshots: 0,
        oldSnapshots: 0,
        manualSnapshots: 0,
        currentSnapshots: 0,
        wouldDelete: 0,
        wouldPreserve: 0,
        cutoffDate: "Authentication failed",
      };
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffISOString = cutoffDate.toISOString();

    // Build query for all snapshots
    let totalQuery = supabase
      .from("diet_snapshots")
      .select("id, created_at, trigger_type, is_current")
      .eq("user_id", user.id);

    if (clientId) {
      totalQuery = totalQuery.eq("client_id", clientId);
    }

    const { data: allSnapshots } = await totalQuery;

    if (!allSnapshots) {
      return {
        totalSnapshots: 0,
        oldSnapshots: 0,
        manualSnapshots: 0,
        currentSnapshots: 0,
        wouldDelete: 0,
        wouldPreserve: 0,
        cutoffDate: cutoffDate.toLocaleDateString("pl-PL"),
      };
    }

    const totalSnapshots = allSnapshots.length;
    const oldSnapshots = allSnapshots.filter(
      (s) => s.created_at < cutoffISOString,
    ).length;
    const manualSnapshots = allSnapshots.filter(
      (s) => s.trigger_type === "manual",
    ).length;
    const currentSnapshots = allSnapshots.filter(
      (s) => s.is_current === true,
    ).length;

    // Calculate what would be preserved
    const oldManualSnapshots = allSnapshots.filter(
      (s) => s.created_at < cutoffISOString && s.trigger_type === "manual",
    ).length;

    const oldCurrentSnapshots = allSnapshots.filter(
      (s) => s.created_at < cutoffISOString && s.is_current === true,
    ).length;

    const wouldPreserve = oldManualSnapshots + oldCurrentSnapshots;
    const wouldDelete = oldSnapshots - wouldPreserve;

    return {
      totalSnapshots,
      oldSnapshots,
      manualSnapshots,
      currentSnapshots,
      wouldDelete: Math.max(0, wouldDelete),
      wouldPreserve,
      cutoffDate: cutoffDate.toLocaleDateString("pl-PL"),
    };
  } catch (error) {
    logger.error("Error getting cleanup stats:", error);
    return {
      totalSnapshots: 0,
      oldSnapshots: 0,
      manualSnapshots: 0,
      currentSnapshots: 0,
      wouldDelete: 0,
      wouldPreserve: 0,
      cutoffDate: "Error",
    };
  }
};

// ========================================
// COPY TO EXISTING DAY - NEW FUNCTIONS
// ========================================

/**
 * Replace all meals in an existing day with new meals
 * @param targetDayId - ID of the day to replace meals in
 * @param newMeals - Array of meals to insert (will get new UUIDs)
 * @returns Success status
 */
export const replaceExistingDayMeals = async (
  targetDayId: string,
  newMeals: any[],
): Promise<boolean> => {
  try {
    // Step 1: Delete all existing meals (CASCADE removes ingredients)
    const { error: deleteMealsError } = await supabase
      .from("meals")
      .delete()
      .eq("day_plan_id", targetDayId);

    if (deleteMealsError) {
      logger.error("Error deleting existing meals:", deleteMealsError);
      return false;
    }

    // Step 2: Insert new meals with new UUIDs
    if (newMeals && newMeals.length > 0) {
      const mealsToInsert = newMeals.map((meal: any) => ({
        id: crypto.randomUUID(),
        day_plan_id: targetDayId,
        name: meal.name,
        dish: meal.dish,
        time: meal.time,
        order_index: meal.order_index,
        instructions: meal.instructions,
        calories: meal.calories,
        protein: meal.protein,
        fat: meal.fat,
        carbs: meal.carbs,
        fiber: meal.fiber,
        count_in_daily_total: meal.countTowardsDailyCalories ?? true,
      }));

      const { data: insertedMeals, error: mealsError } = await supabase
        .from("meals")
        .insert(mealsToInsert)
        .select();

      if (mealsError || !insertedMeals) {
        logger.error("Error inserting new meals:", mealsError);
        return false;
      }

      // Step 3: Insert ingredients for new meals
      const allIngredientsToInsert: any[] = [];
      newMeals.forEach((originalMeal: any, index: number) => {
        if (originalMeal.ingredients && originalMeal.ingredients.length > 0) {
          const newMealId = insertedMeals[index]?.id;
          if (newMealId) {
            originalMeal.ingredients.forEach((ingredient: any) => {
              allIngredientsToInsert.push({
                id: crypto.randomUUID(),
                meal_id: newMealId,
                ingredient_id: ingredient.ingredient_id,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                unit_weight: ingredient.unit_weight,
                calories: ingredient.calories,
                protein: ingredient.protein,
                fat: ingredient.fat,
                carbs: ingredient.carbs,
                fiber: ingredient.fiber,
              });
            });
          }
        }
      });

      if (allIngredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(allIngredientsToInsert);

        if (ingredientsError) {
          logger.error("Error inserting meal_ingredients:", ingredientsError);
          // Rollback: delete inserted meals
          await supabase.from("meals").delete().eq("day_plan_id", targetDayId);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error("Error during replaceExistingDayMeals:", error);
    return false;
  }
};

/**
 * Append new meals to the end of an existing day
 * @param targetDayId - ID of the day to append meals to
 * @param newMeals - Array of meals to append (will get new UUIDs + adjusted order_index)
 * @returns Success status
 */
export const appendMealsToExistingDay = async (
  targetDayId: string,
  newMeals: any[],
): Promise<boolean> => {
  try {
    // Step 1: Get max order_index from existing meals
    const { data: existingMeals, error: queryError } = await supabase
      .from("meals")
      .select("order_index")
      .eq("day_plan_id", targetDayId);

    if (queryError) {
      logger.error("Error fetching existing meals:", queryError);
      return false;
    }

    const maxOrderIndex =
      existingMeals && existingMeals.length > 0
        ? Math.max(...existingMeals.map((m: any) => m.order_index || 0))
        : 0;

    // Step 2: Insert new meals with adjusted order_index
    if (newMeals && newMeals.length > 0) {
      const mealsToInsert = newMeals.map((meal: any, index: number) => ({
        id: crypto.randomUUID(),
        day_plan_id: targetDayId,
        name: meal.name,
        dish: meal.dish,
        time: meal.time,
        order_index: maxOrderIndex + index + 1, // Append to end
        instructions: meal.instructions,
        calories: meal.calories,
        protein: meal.protein,
        fat: meal.fat,
        carbs: meal.carbs,
        fiber: meal.fiber,
        count_in_daily_total: meal.countTowardsDailyCalories ?? true,
      }));

      const { data: insertedMeals, error: mealsError } = await supabase
        .from("meals")
        .insert(mealsToInsert)
        .select();

      if (mealsError || !insertedMeals) {
        logger.error("Error inserting appended meals:", mealsError);
        return false;
      }

      // Step 3: Insert ingredients for new meals
      const allIngredientsToInsert: any[] = [];
      newMeals.forEach((originalMeal: any, index: number) => {
        if (originalMeal.ingredients && originalMeal.ingredients.length > 0) {
          const newMealId = insertedMeals[index]?.id;
          if (newMealId) {
            originalMeal.ingredients.forEach((ingredient: any) => {
              allIngredientsToInsert.push({
                id: crypto.randomUUID(),
                meal_id: newMealId,
                ingredient_id: ingredient.ingredient_id,
                name: ingredient.name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                unit_weight: ingredient.unit_weight,
                calories: ingredient.calories,
                protein: ingredient.protein,
                fat: ingredient.fat,
                carbs: ingredient.carbs,
                fiber: ingredient.fiber,
              });
            });
          }
        }
      });

      if (allIngredientsToInsert.length > 0) {
        const { error: ingredientsError } = await supabase
          .from("meal_ingredients")
          .insert(allIngredientsToInsert);

        if (ingredientsError) {
          logger.error(
            "Error inserting meal_ingredients for appended meals:",
            ingredientsError,
          );
          // Note: Rollback would require deleting only newly inserted meals
          // For simplicity, we return false but meals remain (partial insert)
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    logger.error("Error during appendMealsToExistingDay:", error);
    return false;
  }
};

/**
 * Update or insert diet settings (macro targets) for a day
 * @param dayPlanId - ID of the day plan
 * @param clientId - ID of the client
 * @param settings - Macro targets to set
 * @returns Success status
 */
export const updateDietSettings = async (
  dayPlanId: string,
  clientId: string,
  settings: {
    target_calories?: number;
    target_protein_grams?: number;
    target_protein_percentage?: number;
    target_fat_grams?: number;
    target_fat_percentage?: number;
    target_carbs_grams?: number;
    target_carbs_percentage?: number;
    target_fiber_grams?: number;
  },
): Promise<boolean> => {
  try {
    // Check if settings already exist for this day_plan
    const { data: existingSettings, error: queryError } = await supabase
      .from("client_diet_settings")
      .select("id")
      .eq("day_plan_id", dayPlanId)
      .eq("client_id", clientId)
      .maybeSingle();

    if (queryError) {
      logger.error("Error checking existing diet settings:", queryError);
      return false;
    }

    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await supabase
        .from("client_diet_settings")
        .update(settings)
        .eq("id", existingSettings.id);

      if (updateError) {
        logger.error("Error updating diet settings:", updateError);
        return false;
      }
    } else {
      // Insert new settings
      const { error: insertError } = await supabase
        .from("client_diet_settings")
        .insert({
          client_id: clientId,
          day_plan_id: dayPlanId,
          ...settings,
        });

      if (insertError) {
        logger.error("Error inserting diet settings:", insertError);
        return false;
      }
    }

    return true;
  } catch (error) {
    logger.error("Error during updateDietSettings:", error);
    return false;
  }
};

/**
 * Update day name
 * @param dayPlanId - ID of the day plan
 * @param newName - New name for the day
 * @returns Success status
 */
export const updateDayName = async (
  dayPlanId: string,
  newName: string,
): Promise<boolean> => {
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
    logger.error("Error during updateDayName:", error);
    return false;
  }
};
