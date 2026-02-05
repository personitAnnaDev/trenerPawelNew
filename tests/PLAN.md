# Test Plan - TrenerPaweł

## Unit Tests

### 🧮 Calorie Calculation (useNutritionCalculator)

**UT-1: Basic nutrition calculation**
- **Given:** Ingredients with known nutritional values
- **When:** Calculating total nutrition
- **Then:** Should return correct sum of calories, protein, fat, carbs, fiber

**UT-2: Unit conversion accuracy**  
- **Given:** Ingredients in different units (grams, ml, pieces)
- **When:** Converting to gram-based calculations
- **Then:** Should apply correct unit_weight multipliers

**UT-3: Percentage-based macro calculation**
- **Given:** Ingredients with protein/fat/carb percentages  
- **When:** Calculating macros per 100g
- **Then:** Should return accurate macro distribution

**UT-4: Empty ingredients handling**
- **Given:** Empty ingredients array
- **When:** Calculating nutrition
- **Then:** Should return zeros for all values

**UT-5: Missing product data handling**
- **Given:** Ingredient references non-existent product
- **When:** Calculating nutrition  
- **Then:** Should skip missing products, continue with valid ones

### 🔢 BMR/TDEE Calculation (CalorieCalculator)

**UT-6: Male BMR calculation**
- **Given:** Male client: age=30, weight=80kg, height=180cm
- **When:** Calculating BMR using Harris-Benedict formula
- **Then:** Should return BMR = 88.362 + (13.397×80) + (4.799×180) - (5.677×30) = 1896

**UT-7: Female BMR calculation**  
- **Given:** Female client: age=25, weight=60kg, height=165cm
- **When:** Calculating BMR
- **Then:** Should return BMR = 447.593 + (9.247×60) + (3.098×165) - (4.330×25) = 1442

**UT-8: TDEE calculation with activity factors**
- **Given:** BMR=1800, various activity levels (1.2, 1.6, 2.0)  
- **When:** Calculating TDEE
- **Then:** Should return BMR × activity_factor (2160, 2880, 3600)

**UT-9: Edge cases for age/weight/height**
- **Given:** Boundary values (age=0, weight=1000, height=300)
- **When:** Calculating BMR
- **Then:** Should handle edge cases gracefully without errors

### 📏 Unit Formatting and Conversion

**UT-10: Polish unit shortening**
- **Given:** Various unit names ("gramy", "sztuki", "łyżeczka")
- **When:** Applying shortenUnit function  
- **Then:** Should return correct abbreviations ("g", "szt", "łyż.")

**UT-11: Polish number formatting**
- **Given:** Decimal numbers (123.45, 1000.1)
- **When:** Formatting for Polish locale
- **Then:** Should use comma as decimal separator ("123,45", "1000,1")

**UT-12: Ingredient quantity formatting**
- **Given:** Ingredients with various quantities and units
- **When:** Formatting for display
- **Then:** Should combine quantity + shortened unit correctly

### 🔍 Data Validation

**UT-13: Date format validation**
- **Given:** Various date strings ("15.05.1990", "15-05-1990", "invalid")
- **When:** Validating DD.MM.YYYY format
- **Then:** Should accept valid format, reject invalid ones

**UT-14: Required field validation**
- **Given:** Client data with missing required fields
- **When:** Validating client form
- **Then:** Should return appropriate validation errors

**UT-15: Macro percentage validation**  
- **Given:** Macro percentages that don't sum to 100%
- **When:** Validating macro distribution
- **Then:** Should enforce 100% total constraint

## Integration Tests

### 🍽️ IT-1: Complete Meal Creation Workflow
**Scenario:** Create meal with multiple ingredients and calculate nutrition
- **Given:** User starts creating a new meal
- **When:** They add multiple ingredients with different units
- **And:** Set portion sizes and cooking instructions
- **Then:** System should calculate accurate nutritional values
- **And:** Save meal with all ingredient relationships
- **And:** Allow meal to be added to day plans

**Acceptance Criteria:**
- Nutrition calculation matches manual calculation
- All ingredient relationships preserved in database
- Meal appears in available meals list
- Can be successfully added to client day plans

### 👤 IT-2: Client Diet Plan Management
**Scenario:** Create client, calculate calories, assign meals
- **Given:** New client with physical parameters
- **When:** Trainer calculates BMR/TDEE using client data
- **And:** Creates day plans with target calories
- **And:** Assigns meals to each day
- **Then:** System should track nutritional targets vs actual
- **And:** Display macro adherence with color coding
- **And:** Save all changes with version history

**Acceptance Criteria:**
- BMR calculation accuracy within 1 calorie
- Day plan calories sum correctly
- Macro percentages calculated accurately  
- Undo/redo functionality works for all changes
- Diet snapshots created on significant changes

### 📊 IT-3: Template Application and Customization  
**Scenario:** Apply existing template to new client and customize
- **Given:** Existing diet template with multiple day plans
- **When:** Template is applied to a new client
- **And:** Trainer modifies meals to fit client preferences
- **And:** Adjusts portions to match client calorie targets
- **Then:** All template data should copy correctly
- **And:** Customizations should not affect original template
- **And:** Client diet should maintain nutritional balance

**Acceptance Criteria:**
- Template data copied completely and accurately
- Original template remains unchanged
- Modified portions scale ingredients proportionally
- Nutritional targets maintained after modifications

### 🔐 IT-4: User Access Control and Data Isolation
**Scenario:** Multiple users with separate data access
- **Given:** Two different user accounts in the system
- **When:** Each user creates clients, templates, and meals
- **Then:** Users should only see their own data
- **And:** Products/ingredients should be globally accessible
- **And:** Admin users can manage global ingredients

**Acceptance Criteria:**
- RLS policies prevent cross-user data access
- Public diet sharing works without authentication
- Admin ingredient management restricted to admin users
- User registration creates proper role assignments

### 📄 IT-5: PDF Export with Complete Diet Data
**Scenario:** Generate PDF with full client diet information
- **Given:** Client with complete diet plan across multiple days
- **When:** Generating PDF export
- **Then:** PDF should include client info, all meals, and nutrition summary
- **And:** Formatting should be professional and readable
- **And:** Only days with meals should be included

**Acceptance Criteria:**
- All nutritional data appears correctly in PDF
- Polish formatting (commas, units) maintained
- PDF generates within reasonable time (<5 seconds)
- No missing or corrupted data in export

### 🔄 IT-6: State Persistence and Recovery
**Scenario:** Application state management across page reloads
- **Given:** User is editing complex diet plan
- **When:** Browser is refreshed or application restarted
- **And:** User returns to edit the same diet plan
- **Then:** All unsaved changes should be preserved
- **And:** Undo/redo history should be maintained
- **And:** Auto-save should prevent data loss

**Acceptance Criteria:**
- No data loss on page refresh
- Auto-save triggers after 1.5 second delay
- Undo/redo functionality persists across sessions
- Loading states provide clear feedback to users

## Performance and Edge Case Tests

### 🚀 Performance Tests

**PT-1: Large ingredient list handling**
- **Scenario:** Meal with 50+ ingredients
- **Expected:** Nutrition calculation completes in <100ms

**PT-2: Multiple client diet loading**  
- **Scenario:** Loading 100+ clients with full diet data
- **Expected:** Initial load completes in <2 seconds

**PT-3: PDF generation with complex diet**
- **Scenario:** 7-day diet with 5 meals per day, complex ingredients
- **Expected:** PDF generates in <5 seconds

### 🔍 Edge Cases

**EC-1: Invalid nutritional data**
- **Scenario:** Product with null/negative nutritional values
- **Expected:** Graceful handling, reasonable defaults

**EC-2: Concurrent diet editing**
- **Scenario:** Multiple browser tabs editing same diet
- **Expected:** Last save wins, no data corruption  

**EC-3: Unicode and special characters**
- **Scenario:** Ingredient names with Polish diacritics, emojis
- **Expected:** Proper display and storage in all contexts

## Test Data Requirements

### Fixtures Needed:
- **Users:** Admin user, regular users with different roles  
- **Products:** Comprehensive ingredient database with varied nutritional profiles
- **Clients:** Different ages, genders, activity levels, dietary restrictions
- **Templates:** Various diet templates (cutting, bulking, maintenance)
- **Edge Cases:** Boundary value ingredients, unusual units, extreme nutritional values

### Test Environment:
- **Database:** Fresh Supabase instance for each test suite
- **Authentication:** Mock auth for unit tests, real auth for integration
- **File System:** Temporary directories for PDF generation tests
- **Network:** Mock external API calls, use test-specific endpoints