# Business Rules Checklist - TrenerPaweł

This document maps business rules and constraints to their implementation in the codebase.

## 🧮 Calorie and Nutrition Calculations

### BR-1: BMR Calculation (Harris-Benedict Formula)
**Rule:** BMR must be calculated using the Harris-Benedict formula with gender-specific coefficients
- **Male:** BMR = 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
- **Female:** BMR = 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
- **Location:** `src/components/CalorieCalculator.tsx:67-71`
- **Constraints:** Age, weight, height must be positive numbers

### BR-2: Activity Factor Validation
**Rule:** Activity factors must be within predefined range (1.2 - 2.4)
- **Valid factors:** 1.2, 1.4, 1.6, 1.75, 2.0, 2.2-2.4
- **Location:** `src/components/CalorieCalculator.tsx:40-47`
- **Constraint:** Only predefined activity levels are allowed

### BR-3: TDEE Calculation
**Rule:** TDEE = BMR × Activity Factor
- **Location:** `src/components/CalorieCalculator.tsx:74`
- **Constraint:** Result must be rounded to nearest integer

### BR-4: Nutrition Calculation per 100g
**Rule:** All nutritional values are calculated per 100g of product
- **Location:** `src/hooks/useNutritionCalculator.ts:55`
- **Constraint:** Multiplier = actualGrams / 100

### BR-5: Unit Weight Conversion
**Rule:** Convert different units to grams for nutrition calculations
- **Grams/ml:** Direct conversion using unit_weight
- **Other units:** quantity × unit_weight
- **Location:** `src/hooks/useNutritionCalculator.ts:37-49`
- **Constraint:** unit_weight defaults to 100 if not provided

### BR-6: Nutrition Value Rounding
**Rule:** Calories rounded to integers, macros to 1 decimal place
- **Location:** `src/hooks/useNutritionCalculator.ts:66-71`
- **Implementation:** Math.round() for calories, Math.round(x * 10) / 10 for macros

## 📊 Diet Management

### BR-7: Client Age Calculation
**Rule:** Age calculated from birth date to current date in years
- **Constraint:** Birth date must be in DD.MM.YYYY format
- **Validation:** Must be realistic age (0-120 years)

### BR-8: Macro Nutrient Conversion
**Rule:** Macro percentages must equal 100%, with calorie equivalents:
- **Protein:** 4 kcal/g
- **Fat:** 9 kcal/g  
- **Carbohydrates:** 4 kcal/g
- **Constraint:** Total percentage = 100%

### BR-9: Diet Template Application
**Rule:** Templates can be applied to clients, copying day plans and meals
- **Location:** Template application logic in various components
- **Constraint:** Must preserve nutritional data and ingredient relationships

### BR-10: Meal Portion Scaling
**Rule:** When editing meals, ingredients scale proportionally with target macros
- **Location:** `src/components/NowaPotrawa.tsx` macro scaling logic
- **Constraint:** All ingredients scale by same factor

## 🔐 Data Access and Security

### BR-11: User Data Isolation (RLS)
**Rule:** Users can only access their own data (clients, templates, dishes)
- **Implementation:** Database RLS policies
- **Exception:** Products/ingredients are globally shared

### BR-12: Admin Product Management
**Rule:** Only admin users can add/edit/delete products
- **Constraint:** Admin role checked via JWT user_metadata

### BR-13: Public Diet Sharing
**Rule:** Diets can be shared via UUID tokens without authentication
- **Constraint:** Token must be valid UUID

## 📝 Data Validation

### BR-14: Required Client Fields
**Rule:** First name, last name, birth date, and gender are mandatory
- **Validation:** Zod schemas in forms
- **Constraint:** Cannot save client without these fields

### BR-15: Date Format Validation  
**Rule:** Dates must be in DD.MM.YYYY format
- **Pattern:** `\\d{2}\\.\\d{2}\\.\\d{4}`
- **Location:** Form validation in client components

### BR-16: Ingredient Quantity Validation
**Rule:** Ingredient quantities must be positive numbers
- **Constraint:** > 0 for all ingredient amounts
- **Location:** Form validation in dish/meal components

## 🔄 State Management

### BR-17: Diet Snapshot Creation
**Rule:** Automatic snapshots created on significant changes (>10% calories)
- **Location:** Diet snapshot utilities
- **Trigger:** Calculator changes, meal modifications

### BR-18: Undo/Redo Operations
**Rule:** All diet modifications support undo/redo
- **Constraint:** Must deep copy complex objects
- **Location:** useUndoRedo hook

### BR-19: Auto-save Debouncing
**Rule:** Changes auto-saved after 1.5 second delay
- **Location:** Debounce utilities
- **Constraint:** Prevents excessive API calls

## 🎯 Business Constraints

### BR-20: Single Trainer System
**Rule:** Application designed for single trainer account
- **Constraint:** No multi-tenancy support in current implementation
- **Note:** Planned for future versions

### BR-21: Polish Number Formatting
**Rule:** Numbers displayed with comma as decimal separator
- **Implementation:** `toLocaleString('pl-PL')`
- **Location:** Various formatting utilities

### BR-22: PDF Export Requirements
**Rule:** Diet PDFs must include client info, meal plans, and nutritional summary
- **Location:** `src/components/DietPDFGenerator.tsx`
- **Constraint:** Only non-empty days included in PDF