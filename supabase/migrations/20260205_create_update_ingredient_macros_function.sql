-- Migration: Create update_ingredient_cached_macros function
-- Purpose: Atomic update of all cached macros when an ingredient is edited
-- Replaces N+1 frontend queries with single RPC call

CREATE OR REPLACE FUNCTION update_ingredient_cached_macros(
  p_ingredient_id UUID,
  p_user_id UUID,
  p_name TEXT,
  p_calories NUMERIC,
  p_protein NUMERIC,
  p_fat NUMERIC,
  p_carbs NUMERIC,
  p_fiber NUMERIC,
  p_unit TEXT,
  p_unit_weight NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dish RECORD;
  v_dishes_updated INT := 0;
  v_meal_ingredients_updated INT := 0;
  v_updated_json JSONB;
  v_new_description TEXT;
BEGIN
  -- 1. Update dishes that contain this ingredient
  FOR v_dish IN
    SELECT id, ingredients_json
    FROM dishes
    WHERE user_id = p_user_id
      AND ingredients_json IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(ingredients_json) AS ing
        WHERE (ing->>'ingredient_id') = p_ingredient_id::TEXT
      )
  LOOP
    -- Build updated ingredients_json with recalculated macros
    SELECT jsonb_agg(
      CASE
        WHEN (ing->>'ingredient_id') = p_ingredient_id::TEXT THEN
          jsonb_build_object(
            'ingredient_id', ing->>'ingredient_id',
            'name', p_name,
            'quantity', (ing->>'quantity')::NUMERIC,
            'unit', COALESCE(ing->>'unit', p_unit),
            'unit_weight', COALESCE((ing->>'unit_weight')::NUMERIC, p_unit_weight),
            'calories', ROUND(
              p_calories * (
                (ing->>'quantity')::NUMERIC *
                CASE
                  WHEN ing->>'unit' IN ('gramy', 'g') THEN 1
                  ELSE COALESCE((ing->>'unit_weight')::NUMERIC, p_unit_weight)
                END
              ) / 100, 2
            ),
            'protein', ROUND(
              p_protein * (
                (ing->>'quantity')::NUMERIC *
                CASE
                  WHEN ing->>'unit' IN ('gramy', 'g') THEN 1
                  ELSE COALESCE((ing->>'unit_weight')::NUMERIC, p_unit_weight)
                END
              ) / 100, 2
            ),
            'fat', ROUND(
              p_fat * (
                (ing->>'quantity')::NUMERIC *
                CASE
                  WHEN ing->>'unit' IN ('gramy', 'g') THEN 1
                  ELSE COALESCE((ing->>'unit_weight')::NUMERIC, p_unit_weight)
                END
              ) / 100, 2
            ),
            'carbs', ROUND(
              p_carbs * (
                (ing->>'quantity')::NUMERIC *
                CASE
                  WHEN ing->>'unit' IN ('gramy', 'g') THEN 1
                  ELSE COALESCE((ing->>'unit_weight')::NUMERIC, p_unit_weight)
                END
              ) / 100, 2
            ),
            'fiber', ROUND(
              p_fiber * (
                (ing->>'quantity')::NUMERIC *
                CASE
                  WHEN ing->>'unit' IN ('gramy', 'g') THEN 1
                  ELSE COALESCE((ing->>'unit_weight')::NUMERIC, p_unit_weight)
                END
              ) / 100, 2
            )
          )
        ELSE ing
      END
    )
    INTO v_updated_json
    FROM jsonb_array_elements(v_dish.ingredients_json) AS ing;

    -- Build new ingredients_description
    SELECT string_agg(
      (ing->>'name') || ' - ' || (ing->>'quantity')::TEXT || ' ' || COALESCE(ing->>'unit', 'g'),
      ', '
    )
    INTO v_new_description
    FROM jsonb_array_elements(v_updated_json) AS ing;

    -- Update the dish
    UPDATE dishes
    SET
      ingredients_json = v_updated_json,
      ingredients_description = v_new_description
    WHERE id = v_dish.id;

    v_dishes_updated := v_dishes_updated + 1;
  END LOOP;

  -- 2. Update meal_ingredients - single bulk update
  UPDATE meal_ingredients
  SET
    name = p_name,
    calories = ROUND(
      p_calories * (
        CASE
          WHEN unit IN ('mililitry', 'ml') THEN (quantity / 100.0) * COALESCE(unit_weight, 100)
          WHEN unit IN ('gramy', 'g') THEN quantity
          ELSE quantity * COALESCE(unit_weight, 100)
        END
      ) / 100, 2
    ),
    protein = ROUND(
      p_protein * (
        CASE
          WHEN unit IN ('mililitry', 'ml') THEN (quantity / 100.0) * COALESCE(unit_weight, 100)
          WHEN unit IN ('gramy', 'g') THEN quantity
          ELSE quantity * COALESCE(unit_weight, 100)
        END
      ) / 100, 2
    ),
    fat = ROUND(
      p_fat * (
        CASE
          WHEN unit IN ('mililitry', 'ml') THEN (quantity / 100.0) * COALESCE(unit_weight, 100)
          WHEN unit IN ('gramy', 'g') THEN quantity
          ELSE quantity * COALESCE(unit_weight, 100)
        END
      ) / 100, 2
    ),
    carbs = ROUND(
      p_carbs * (
        CASE
          WHEN unit IN ('mililitry', 'ml') THEN (quantity / 100.0) * COALESCE(unit_weight, 100)
          WHEN unit IN ('gramy', 'g') THEN quantity
          ELSE quantity * COALESCE(unit_weight, 100)
        END
      ) / 100, 2
    ),
    fiber = ROUND(
      p_fiber * (
        CASE
          WHEN unit IN ('mililitry', 'ml') THEN (quantity / 100.0) * COALESCE(unit_weight, 100)
          WHEN unit IN ('gramy', 'g') THEN quantity
          ELSE quantity * COALESCE(unit_weight, 100)
        END
      ) / 100, 2
    )
  WHERE ingredient_id = p_ingredient_id;

  GET DIAGNOSTICS v_meal_ingredients_updated = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'dishes_updated', v_dishes_updated,
    'meal_ingredients_updated', v_meal_ingredients_updated
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_ingredient_cached_macros TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION update_ingredient_cached_macros IS
'Atomically updates all cached macros in dishes and meal_ingredients when an ingredient is edited.
Replaces N+1 frontend queries with single database call.
Parameters:
  p_ingredient_id - UUID of the ingredient being updated
  p_user_id - UUID of the user (for RLS on dishes)
  p_name - New ingredient name
  p_calories, p_protein, p_fat, p_carbs, p_fiber - New nutritional values per 100g
  p_unit - New default unit
  p_unit_weight - New unit weight in grams
Returns JSONB with dishes_updated and meal_ingredients_updated counts.';
