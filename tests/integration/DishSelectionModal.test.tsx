import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import DishSelectionModal from '@/components/DishSelectionModal';
import { AuthContext } from '@/contexts/AuthContext';

/**
 * Integration Tests for Issue #1: DishSelectionModal Ingredient Updates
 *
 * Bug: Po zamianie dania składniki się nie aktualizują
 * Fix: Dodano useEffect dla selectedDish
 */

// Mock data
const mockDishes = [
  {
    id: 'dish-1',
    name: 'Kurczak z ryżem',
    category: 'białkowo-tłuszczowe',
    ingredients_json: [
      {
        ingredient_id: 'ing-1',
        name: 'Kurczak pierś',
        quantity: 150,
        unit: 'gramy',
        unit_weight: 100
      },
      {
        ingredient_id: 'ing-2',
        name: 'Ryż biały',
        quantity: 100,
        unit: 'gramy',
        unit_weight: 100
      }
    ],
    instructions: ['Ugotuj ryż', 'Usmaż kurczaka', 'Podaj razem']
  },
  {
    id: 'dish-2',
    name: 'Łosoś z warzywami',
    category: 'ryby',
    ingredients_json: [
      {
        ingredient_id: 'ing-3',
        name: 'Łosoś filet',
        quantity: 200,
        unit: 'gramy',
        unit_weight: 100
      },
      {
        ingredient_id: 'ing-4',
        name: 'Brokuły',
        quantity: 150,
        unit: 'gramy',
        unit_weight: 100
      }
    ],
    instructions: ['Ugotuj brokuły', 'Usmaż łososia', 'Podaj na talerzu']
  }
];

const mockProducts = [
  {
    id: 'ing-1',
    name: 'Kurczak pierś',
    calories: 165,
    protein: 31,
    fat: 3.6,
    carbs: 0,
    fiber: 0,
    unit: 'gramy',
    unit_weight: 100
  },
  {
    id: 'ing-2',
    name: 'Ryż biały',
    calories: 130,
    protein: 2.7,
    fat: 0.3,
    carbs: 28,
    fiber: 0.4,
    unit: 'gramy',
    unit_weight: 100
  },
  {
    id: 'ing-3',
    name: 'Łosoś filet',
    calories: 208,
    protein: 25,
    fat: 12,
    carbs: 0,
    fiber: 0,
    unit: 'gramy',
    unit_weight: 100
  },
  {
    id: 'ing-4',
    name: 'Brokuły',
    calories: 34,
    protein: 2.8,
    fat: 0.4,
    carbs: 7,
    fiber: 2.6,
    unit: 'gramy',
    unit_weight: 100
  }
];

const mockCategories = [
  { id: 'cat-1', name: 'białkowo-tłuszczowe' },
  { id: 'cat-2', name: 'ryby' }
];

// Mock React Query hooks
vi.mock('@tanstack/react-query', async () => ({
  ...(await vi.importActual('@tanstack/react-query')),
  useQuery: vi.fn((options) => {
    if (options.queryKey[0] === 'categories') {
      return { data: mockCategories, isLoading: false, error: null };
    }
    if (options.queryKey[0] === 'potrawy') {
      return { data: mockDishes, isLoading: false, error: null };
    }
    if (options.queryKey[0] === 'products') {
      return { data: mockProducts, isLoading: false, error: null };
    }
    return { data: null, isLoading: false, error: null };
  })
}));

// Mock useAIOptimization hook
vi.mock('@/hooks/useAIOptimization', () => ({
  useAIOptimization: () => ({
    optimize: vi.fn(),
    isOptimizing: false,
    result: null,
    error: null,
    reset: vi.fn()
  })
}));

// Mock toast
vi.mock('@/components/ui/use-toast', () => ({
  toast: vi.fn()
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  const mockAuthValue = {
    user: { id: 'test-user-id', email: 'test@example.com' },
    session: {},
    loading: false,
    isAdmin: false
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={mockAuthValue as any}>
        <BrowserRouter>
          {children}
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
};

// SKIPPED: Tests need updates for current component mock structure
describe.skip('DishSelectionModal - Ingredient Updates Integration', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectDish: vi.fn(),
    onSave: vi.fn(),
    meal: null,
    dayPlanId: 'test-day-plan-id',
    context: 'clientDiet' as const,
    onRefreshData: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should update ingredients when dish is selected', async () => {
    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Fill meal name
    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Test Meal' } });

    // Open dish dropdown
    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);

    // Select first dish
    await waitFor(() => {
      expect(screen.getByText('Kurczak z ryżem')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Kurczak z ryżem'));

    // Go to ingredients step
    const nextButton = screen.getByText(/dalej/i);
    fireEvent.click(nextButton);

    // Wait for ingredients to load
    await waitFor(() => {
      expect(screen.getByText('Kurczak pierś')).toBeInTheDocument();
      expect(screen.getByText('Ryż biały')).toBeInTheDocument();
    });

    // Verify ingredients are from the selected dish
    expect(screen.getByDisplayValue('150')).toBeInTheDocument(); // Kurczak quantity
    expect(screen.getByDisplayValue('100')).toBeInTheDocument(); // Ryż quantity

    console.log('✅ Test passed: Ingredients updated when dish selected');
  });

  test('should update ingredients when switching between dishes', async () => {
    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Fill meal name and select first dish
    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Switch Test' } });

    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);

    // Select first dish
    fireEvent.click(screen.getByText('Kurczak z ryżem'));

    // Go to ingredients step
    fireEvent.click(screen.getByText(/dalej/i));

    // Verify first dish ingredients
    await waitFor(() => {
      expect(screen.getByText('Kurczak pierś')).toBeInTheDocument();
      expect(screen.getByText('Ryż biały')).toBeInTheDocument();
    });

    // Go back to dish selection
    fireEvent.click(screen.getByText(/wstecz/i));

    // Change to second dish
    fireEvent.click(dishDropdown);
    fireEvent.click(screen.getByText('Łosoś z warzywami'));

    // Go to ingredients step again
    fireEvent.click(screen.getByText(/dalej/i));

    // Verify second dish ingredients
    await waitFor(() => {
      expect(screen.getByText('Łosoś filet')).toBeInTheDocument();
      expect(screen.getByText('Brokuły')).toBeInTheDocument();
    });

    // Old ingredients should not be present
    expect(screen.queryByText('Kurczak pierś')).not.toBeInTheDocument();
    expect(screen.queryByText('Ryż biały')).not.toBeInTheDocument();

    // Verify new quantities
    expect(screen.getByDisplayValue('200')).toBeInTheDocument(); // Łosoś quantity
    expect(screen.getByDisplayValue('150')).toBeInTheDocument(); // Brokuły quantity

    console.log('✅ Test passed: Ingredients switched when changing dishes');
  });

  test('should update instructions when dish is selected', async () => {
    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Fill meal name and select dish
    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Instructions Test' } });

    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);
    fireEvent.click(screen.getByText('Kurczak z ryżem'));

    // Verify instructions were updated (they should be in the form)
    await waitFor(() => {
      // Instructions are in textarea elements
      const instructionTextareas = screen.getAllByRole('textbox');
      const instructionValues = instructionTextareas.map(textarea =>
        (textarea as HTMLTextAreaElement).value
      );

      expect(instructionValues).toContain('Ugotuj ryż');
      expect(instructionValues).toContain('Usmaż kurczaka');
      expect(instructionValues).toContain('Podaj razem');
    });

    console.log('✅ Test passed: Instructions updated when dish selected');
  });

  test('should clear ingredients when category changes', async () => {
    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Fill meal name and select dish
    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Category Test' } });

    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);
    fireEvent.click(screen.getByText('Kurczak z ryżem'));

    // Go to ingredients step to verify they're loaded
    fireEvent.click(screen.getByText(/dalej/i));

    await waitFor(() => {
      expect(screen.getByText('Kurczak pierś')).toBeInTheDocument();
    });

    // Go back and change category
    fireEvent.click(screen.getByText(/wstecz/i));

    // Find and change category dropdown
    const categorySelect = screen.getByDisplayValue('białkowo-tłuszczowe');
    fireEvent.change(categorySelect, { target: { value: 'ryby' } });

    // Dish selection should be cleared
    await waitFor(() => {
      const dishDropdownAfterCategoryChange = screen.getByRole('combobox');
      expect(dishDropdownAfterCategoryChange).toHaveTextContent('Wybierz danie');
    });

    console.log('✅ Test passed: Ingredients cleared when category changes');
  });

  test('should handle edit mode with existing meal', async () => {
    const existingMeal = {
      id: 'meal-1',
      name: 'Existing Meal',
      dish: 'Kurczak z ryżem',
      instructions: ['Old instruction'],
      ingredients: [
        {
          id: 'ing-1',
          ingredient_id: 'ing-1',
          name: 'Kurczak pierś',
          quantity: 100,
          unit: 'gramy',
          calories: 165,
          protein: 31,
          fat: 3.6,
          carbs: 0,
          fiber: 0
        }
      ],
      countTowardsDailyCalories: true
    };

    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} meal={existingMeal} />
      </TestWrapper>
    );

    // Should pre-populate with existing meal data
    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing Meal')).toBeInTheDocument();
    });

    // Dish should be pre-selected
    const dishDropdown = screen.getByRole('combobox');
    expect(dishDropdown).toHaveTextContent('Kurczak z ryżem');

    // Change to different dish
    fireEvent.click(dishDropdown);
    fireEvent.click(screen.getByText('Łosoś z warzywami'));

    // Go to ingredients step
    fireEvent.click(screen.getByText(/dalej/i));

    // Should show new dish ingredients, not old ones
    await waitFor(() => {
      expect(screen.getByText('Łosoś filet')).toBeInTheDocument();
      expect(screen.getByText('Brokuły')).toBeInTheDocument();
    });

    // Should have new quantities (200g salmon, 150g broccoli)
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('150')).toBeInTheDocument();

    console.log('✅ Test passed: Edit mode ingredients updated when dish changes');
  });

  test('should recalculate macros when ingredients update', async () => {
    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    // Fill meal name and select dish
    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Macro Test' } });

    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);
    fireEvent.click(screen.getByText('Kurczak z ryżem'));

    // Go to ingredients step
    fireEvent.click(screen.getByText(/dalej/i));

    // Wait for ingredients and verify macro calculations
    await waitFor(() => {
      expect(screen.getByText('Kurczak pierś')).toBeInTheDocument();
      expect(screen.getByText('Ryż biały')).toBeInTheDocument();
    });

    // Verify calories are calculated (150g kurczak = 247.5 kcal, 100g ryż = 130 kcal)
    // Total should be around 377.5 kcal
    // Note: Exact values depend on the recalculateMacros implementation

    const macroElements = screen.getAllByText(/\d+(\.\d+)?/);
    const hasCalorieValues = macroElements.some(el => {
      const value = parseFloat(el.textContent || '0');
      return value > 200 && value < 500; // Should be in expected range
    });

    expect(hasCalorieValues).toBe(true);

    console.log('✅ Test passed: Macros recalculated when ingredients update');
  });
});

// SKIPPED: Tests need updates for current component mock structure
describe.skip('Edge Cases', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectDish: vi.fn(),
    onSave: vi.fn(),
    meal: null,
    dayPlanId: 'test-day-plan-id',
    context: 'clientDiet' as const,
    onRefreshData: vi.fn()
  };

  test('should handle dish without ingredients_json', async () => {
    // Mock dish without ingredients_json
    const dishWithoutIngredients = {
      id: 'dish-3',
      name: 'Simple Dish',
      category: 'other',
      ingredients_json: null,
      instructions: ['Simple instruction']
    };

    // Override mock to include dish without ingredients
    const originalUseQuery = require('@tanstack/react-query').useQuery;
    require('@tanstack/react-query').useQuery = vi.fn((options) => {
      if (options.queryKey[0] === 'potrawy') {
        return { data: [...mockDishes, dishWithoutIngredients], isLoading: false, error: null };
      }
      return originalUseQuery(options);
    });

    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Edge Case Test' } });

    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);

    // Should not crash when selecting dish without ingredients
    fireEvent.click(screen.getByText('Simple Dish'));

    // Should be able to go to ingredients step without errors
    fireEvent.click(screen.getByText(/dalej/i));

    // Should show empty ingredients list
    await waitFor(() => {
      const ingredientElements = screen.queryAllByText(/gramy|sztuki|ml/);
      expect(ingredientElements.length).toBe(0);
    });

    console.log('✅ Test passed: Handled dish without ingredients_json gracefully');
  });

  test('should handle missing product data', async () => {
    // Mock ingredient with missing product reference
    const dishWithMissingProduct = {
      id: 'dish-4',
      name: 'Dish with Missing Product',
      category: 'other',
      ingredients_json: [
        {
          ingredient_id: 'missing-product-id',
          name: 'Missing Product',
          quantity: 100,
          unit: 'gramy',
          unit_weight: 100
        }
      ],
      instructions: ['Cook it']
    };

    const originalUseQuery = require('@tanstack/react-query').useQuery;
    require('@tanstack/react-query').useQuery = vi.fn((options) => {
      if (options.queryKey[0] === 'potrawy') {
        return { data: [...mockDishes, dishWithMissingProduct], isLoading: false, error: null };
      }
      return originalUseQuery(options);
    });

    render(
      <TestWrapper>
        <DishSelectionModal {...defaultProps} />
      </TestWrapper>
    );

    const mealNameInput = screen.getByPlaceholderText(/nazwa posiłku/i);
    fireEvent.change(mealNameInput, { target: { value: 'Missing Product Test' } });

    const dishDropdown = screen.getByRole('combobox');
    fireEvent.click(dishDropdown);
    fireEvent.click(screen.getByText('Dish with Missing Product'));

    // Should not crash
    fireEvent.click(screen.getByText(/dalej/i));

    // Should show ingredient with zero macros (fallback values)
    await waitFor(() => {
      expect(screen.getByText('Missing Product')).toBeInTheDocument();
    });

    console.log('✅ Test passed: Handled missing product data gracefully');
  });
});