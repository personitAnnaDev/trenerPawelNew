import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AIOptimizationService,
  AIOptimizationRequest,
  AIOptimizationResponse,
  AIOptimizationErrorCodes,
} from "@/services/aiOptimizationService";

// Mock Supabase
vi.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// SKIPPED: Tests require Supabase mock refactoring for ESM compatibility
describe.skip("AI Optimization Service", () => {
  let service: AIOptimizationService;
  let mockSession: any;
  let mockSupabase: any;

  beforeEach(() => {
    service = new AIOptimizationService();

    // Reset mocks
    vi.clearAllMocks();

    // Mock session
    mockSession = {
      access_token: "mock-token-123",
      user: { id: "user-123" },
    };

    // Get mocked supabase instance
    const { supabase } = require("@/utils/supabase");
    mockSupabase = supabase;

    // Setup Supabase mocks
    mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("UT-20: Request validation", () => {
    const validRequest: AIOptimizationRequest = {
      user_id: "user-123",
      meal_name: "Owsianka proteinowa",
      target_macros: {
        protein: 35,
        fat: 15,
        carbs: 60,
      },
      current_ingredients: [
        {
          id: "ing-1",
          name: "Płatki owsiane",
          quantity: 100,
          unit: "gramy",
          calories: 389,
          protein: 16.9,
          fat: 6.9,
          carbs: 66.3,
          fiber: 10.6,
          original_unit: "gramy",
          original_quantity: 100,
        },
      ],
    };

    it("should accept valid request", async () => {
      // Mock successful response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              optimized_ingredients: [],
              macro_summary: {
                total_calories: 400,
                total_protein: 35,
                total_fat: 15,
                total_carbs: 60,
                total_fiber: 10,
                protein_percentage: 35,
                fat_percentage: 34,
                carbs_percentage: 60,
              },
              comparison: {
                calorie_difference: 11,
                protein_difference: 18.1,
                fat_difference: 8.1,
                carbs_difference: -6.3,
                target_achievement: {
                  protein_achievement: 100,
                  fat_achievement: 100,
                  carbs_achievement: 100,
                },
              },
              ai_comment: "Optymalizacja zakończona sukcesem",
              achievability: {
                overall_score: 85,
                feasibility: "high",
                main_challenges: [],
              },
            },
          }),
      });

      const result = await service.optimize(validRequest);
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should reject request without user_id", async () => {
      const invalidRequest = { ...validRequest, user_id: "" };

      const result = await service.optimize(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AIOptimizationErrorCodes.INVALID_INPUT);
      expect(result.error?.message).toContain("Brak ID użytkownika");
    });

    it("should reject request without meal_name", async () => {
      const invalidRequest = { ...validRequest, meal_name: "" };

      const result = await service.optimize(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AIOptimizationErrorCodes.INVALID_INPUT);
      expect(result.error?.message).toContain("Brak nazwy posiłku");
    });

    it("should validate macro ranges", async () => {
      const testCases = [
        { protein: -1, message: "Nieprawidłowa wartość białka" },
        { protein: 501, message: "Nieprawidłowa wartość białka" },
        { fat: -1, message: "Nieprawidłowa wartość tłuszczu" },
        { fat: 201, message: "Nieprawidłowa wartość tłuszczu" },
        { carbs: -1, message: "Nieprawidłowa wartość węglowodanów" },
        { carbs: 801, message: "Nieprawidłowa wartość węglowodanów" },
      ];

      for (const testCase of testCases) {
        const invalidRequest = {
          ...validRequest,
          target_macros: {
            ...validRequest.target_macros,
            ...testCase,
          },
        };

        const result = await service.optimize(invalidRequest);

        expect(result.success).toBe(false);
        expect(result.error?.message).toContain(testCase.message);
      }
    });

    it("should reject request without ingredients", async () => {
      const invalidRequest = { ...validRequest, current_ingredients: [] };

      const result = await service.optimize(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain(
        "Brak składników do optymalizacji"
      );
    });

    it("should validate ingredient data", async () => {
      const invalidIngredient = {
        id: "",
        name: "Test",
        quantity: 0,
        unit: "g",
        calories: 100,
        protein: 10,
        fat: 5,
        carbs: 20,
        fiber: 2,
      };

      const invalidRequest = {
        ...validRequest,
        current_ingredients: [invalidIngredient],
      };

      const result = await service.optimize(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Nieprawidłowe dane składnika");
    });

    it("should ACCEPT ingredients with 0g quantity (e.g., lemon juice)", async () => {
      const requestWith0gIngredient: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Sałatka z sokiem z cytryny",
        target_macros: {
          protein: 30,
          fat: 15,
          carbs: 40,
        },
        current_ingredients: [
          {
            id: "salad-1",
            name: "Sałata",
            quantity: 100,
            unit: "gramy",
            calories: 15,
            protein: 1.4,
            fat: 0.2,
            carbs: 2.3,
            fiber: 1.3,
          },
          {
            id: "lemon-juice-1",
            name: "Sok z cytryny",
            quantity: 0, // ⚠️ ZERO grams - ornamental/flavor ingredient
            unit: "gramy",
            calories: 0,
            protein: 0,
            fat: 0,
            carbs: 0,
            fiber: 0,
          },
        ],
      };

      // Mock successful AI response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              optimized_ingredients: [
                {
                  id: "salad-1",
                  name: "Sałata",
                  quantity: 150,
                  unit: "gramy",
                  calories: 22.5,
                  protein: 2.1,
                  fat: 0.3,
                  carbs: 3.45,
                  fiber: 1.95,
                },
                {
                  id: "lemon-juice-1",
                  name: "Sok z cytryny",
                  quantity: 0.25, // AI converts to minimum condiment amount
                  unit: "gramy",
                  calories: 0.06,
                  protein: 0,
                  fat: 0,
                  carbs: 0.02,
                  fiber: 0,
                },
              ],
              macro_summary: {
                total_calories: 22.56,
                total_protein: 2.1,
                total_fat: 0.3,
                total_carbs: 3.47,
                total_fiber: 1.95,
                protein_percentage: 36.9,
                fat_percentage: 11.9,
                carbs_percentage: 61.3,
              },
              comparison: {
                calorie_difference: 7.56,
                protein_difference: -27.9,
                fat_difference: -14.7,
                carbs_difference: -36.53,
                target_achievement: {
                  protein_achievement: 7,
                  fat_achievement: 2,
                  carbs_achievement: 9,
                },
              },
              ai_comment: "Dodano minimalną ilość soku z cytryny (0.25g) dla smaku",
              achievability: {
                overall_score: 40,
                feasibility: "low",
                main_challenges: ["Brak wystarczających składników proteinowych"],
              },
            },
          }),
      });

      const result = await service.optimize(requestWith0gIngredient);

      // ✅ Should ACCEPT request with 0g ingredient
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.optimized_ingredients).toHaveLength(2);
    });

    it("should REJECT ingredients with negative quantity", async () => {
      const requestWithNegativeQty: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: {
          protein: 30,
          fat: 15,
          carbs: 40,
        },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test Ingredient",
            quantity: -5, // ❌ NEGATIVE - invalid
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      const result = await service.optimize(requestWithNegativeQty);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("Nieprawidłowa ilość składnika");
    });
  });

  describe("UT-21: Unit conversion handling", () => {
    it("should preserve original units in request", async () => {
      const requestWithMl = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Mleko 2%",
            quantity: 250, // converted to grams for AI
            unit: "gramy", // AI sees grams
            calories: 125,
            protein: 8.25,
            fat: 5,
            carbs: 12,
            fiber: 0,
            original_unit: "ml", // original unit preserved
            original_quantity: 250, // original quantity preserved
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              optimized_ingredients: [
                {
                  id: "ing-1",
                  name: "Mleko 2%",
                  quantity: 200, // AI returns grams
                  unit: "gramy", // AI works in grams
                  calories: 100,
                  protein: 6.6,
                  fat: 4,
                  carbs: 9.6,
                  fiber: 0,
                },
              ],
              macro_summary: {
                total_calories: 100,
                total_protein: 6.6,
                total_fat: 4,
                total_carbs: 9.6,
                total_fiber: 0,
                protein_percentage: 26.4,
                fat_percentage: 36,
                carbs_percentage: 38.4,
              },
              comparison: {
                calorie_difference: -25,
                protein_difference: -1.65,
                fat_difference: -1,
                carbs_difference: -2.4,
                target_achievement: {
                  protein_achievement: 22,
                  fat_achievement: 40,
                  carbs_achievement: 24,
                },
              },
              ai_comment:
                "Zmniejszyłem Mleko 2% do 200g dla lepszych proporcji makro",
              achievability: {
                overall_score: 75,
                feasibility: "medium",
                main_challenges: ["Niskie spożycie białka"],
              },
            },
          }),
      });

      const result = await service.optimize(requestWithMl);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(requestWithMl),
        })
      );

      // Check that AI comment uses grams (since AI only knows grams)
      expect(result.data?.ai_comment).toContain("200g");
    });

    it("should handle mixed units correctly", async () => {
      const mixedUnitsRequest = {
        user_id: "user-123",
        meal_name: "Mixed Units Test",
        target_macros: { protein: 40, fat: 20, carbs: 50 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Płatki owsiane",
            quantity: 80,
            unit: "gramy",
            calories: 311.2,
            protein: 13.52,
            fat: 5.52,
            carbs: 53.04,
            fiber: 8.48,
            original_unit: "gramy",
            original_quantity: 80,
          },
          {
            id: "ing-2",
            name: "Mleko 2%",
            quantity: 200,
            unit: "gramy", // converted for AI
            calories: 100,
            protein: 6.6,
            fat: 4,
            carbs: 9.6,
            fiber: 0,
            original_unit: "ml", // original was ml
            original_quantity: 200,
          },
          {
            id: "ing-3",
            name: "Banan",
            quantity: 120,
            unit: "gramy", // converted for AI
            calories: 107.2,
            protein: 1.32,
            fat: 0.36,
            carbs: 26.04,
            fiber: 3.12,
            original_unit: "sztuka", // original was pieces
            original_quantity: 1,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              optimized_ingredients: [],
              macro_summary: {
                total_calories: 518.4,
                total_protein: 21.44,
                total_fat: 9.88,
                total_carbs: 88.68,
                total_fiber: 11.6,
                protein_percentage: 16.5,
                fat_percentage: 17.1,
                carbs_percentage: 68.4,
              },
              comparison: {
                calorie_difference: 118.4,
                protein_difference: -18.56,
                fat_difference: -10.12,
                carbs_difference: 38.68,
                target_achievement: {
                  protein_achievement: 54,
                  fat_achievement: 49,
                  carbs_achievement: 177,
                },
              },
              ai_comment: "Test optymalizacji z różnymi jednostkami",
              achievability: {
                overall_score: 60,
                feasibility: "medium",
                main_challenges: ["Różne jednostki wymagają uwagi"],
              },
            },
          }),
      });

      const result = await service.optimize(mixedUnitsRequest);
      expect(result.success).toBe(true);
    });
  });

  describe("UT-22: Error handling", () => {
    it("should handle authentication errors", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "No session" },
      });

      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test Ingredient",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AIOptimizationErrorCodes.INTERNAL_ERROR);
    });

    it("should handle network errors", async () => {
      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      mockFetch.mockRejectedValue(new Error("fetch failed"));

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AIOptimizationErrorCodes.NETWORK_ERROR);
      expect(result.error?.message).toContain("sieci");
    });

    it("should handle timeout errors", async () => {
      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      // Mock AbortError
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";
      mockFetch.mockRejectedValue(abortError);

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AIOptimizationErrorCodes.TIMEOUT_ERROR);
      expect(result.error?.message).toContain("limit czasu");
    });

    it("should handle HTTP error responses", async () => {
      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: {
              code: "UNAUTHORIZED",
              message: "Invalid token",
            },
          }),
      });

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("UNAUTHORIZED");
      expect(result.error?.message).toBe("Invalid token");
    });

    it("should handle malformed response", async () => {
      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(AIOptimizationErrorCodes.INTERNAL_ERROR);
    });
  });

  describe("UT-23: Ingredient validation", () => {
    beforeEach(() => {
      // Mock Supabase query
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: [{ id: "valid-ing-1" }, { id: "valid-ing-2" }],
            error: null,
          }),
        }),
      });
    });

    it("should validate existing ingredients", async () => {
      const result = await service.validateIngredients([
        "valid-ing-1",
        "valid-ing-2",
      ]);

      expect(result.valid).toBe(true);
      expect(result.validIds).toEqual(["valid-ing-1", "valid-ing-2"]);
      expect(result.invalidIds).toEqual([]);
    });

    it("should identify invalid ingredients", async () => {
      const result = await service.validateIngredients([
        "valid-ing-1",
        "invalid-ing-1",
        "valid-ing-2",
      ]);

      expect(result.valid).toBe(false);
      expect(result.validIds).toEqual(["valid-ing-1", "valid-ing-2"]);
      expect(result.invalidIds).toEqual(["invalid-ing-1"]);
    });

    it("should handle database errors", async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database error" },
          }),
        }),
      });

      const result = await service.validateIngredients(["test-ing"]);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("bazy danych");
    });

    it("should handle empty ingredient list", async () => {
      const result = await service.validateIngredients([]);

      expect(result.valid).toBe(true);
      expect(result.validIds).toEqual([]);
      expect(result.invalidIds).toEqual([]);
    });
  });

  describe("UT-24: Polish error messages", () => {
    it("should provide Polish error messages for all error codes", () => {
      const errorCodes = Object.values(AIOptimizationErrorCodes);

      errorCodes.forEach((code) => {
        const message = service.getErrorMessage(code);

        // Should return a Polish message (contains Polish characters or words)
        expect(message.length).toBeGreaterThan(10);
        expect(message).toMatch(
          /[ąćęłńóśźż]|Błąd|błąd|Brak|brak|Spróbuj|spróbuj/i
        );
      });
    });

    it("should return fallback message for unknown error codes", () => {
      const message = service.getErrorMessage("UNKNOWN_ERROR_CODE");

      expect(message).toContain("nieoczekiwany błąd");
    });

    it("should handle null/undefined error codes", () => {
      expect(() => service.getErrorMessage(null as any)).not.toThrow();
      expect(() => service.getErrorMessage(undefined as any)).not.toThrow();
    });
  });

  describe("UT-25: Retry mechanism", () => {
    it("should retry on network failures", async () => {
      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                optimized_ingredients: [],
                macro_summary: {
                  total_calories: 100,
                  total_protein: 10,
                  total_fat: 5,
                  total_carbs: 15,
                  total_fiber: 2,
                  protein_percentage: 40,
                  fat_percentage: 45,
                  carbs_percentage: 60,
                },
                comparison: {
                  calorie_difference: 0,
                  protein_difference: -20,
                  fat_difference: -5,
                  carbs_difference: -25,
                  target_achievement: {
                    protein_achievement: 33,
                    fat_achievement: 50,
                    carbs_achievement: 38,
                  },
                },
                ai_comment: "Test successful after retries",
                achievability: {
                  overall_score: 70,
                  feasibility: "medium",
                  main_challenges: [],
                },
              },
            }),
        });

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3); // Original + 2 retries
    });

    it("should not retry on authentication errors", async () => {
      const validRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Test",
        target_macros: { protein: 30, fat: 10, carbs: 40 },
        current_ingredients: [
          {
            id: "ing-1",
            name: "Test",
            quantity: 100,
            unit: "gramy",
            calories: 100,
            protein: 10,
            fat: 5,
            carbs: 15,
            fiber: 2,
          },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () =>
          Promise.resolve({
            error: {
              code: AIOptimizationErrorCodes.UNAUTHORIZED,
              message: "Unauthorized",
            },
          }),
      });

      const result = await service.optimize(validRequest);

      expect(result.success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for auth errors
    });
  });

  describe("Integration test scenarios", () => {
    it("should handle complete oatmeal optimization scenario", async () => {
      const oatmealRequest: AIOptimizationRequest = {
        user_id: "user-123",
        meal_name: "Owsianka proteinowa z malinami",
        target_macros: {
          protein: 35,
          fat: 15,
          carbs: 60,
        },
        current_ingredients: [
          {
            id: "oats-1",
            name: "Płatki owsiane",
            quantity: 100,
            unit: "gramy",
            calories: 389,
            protein: 16.9,
            fat: 6.9,
            carbs: 66.3,
            fiber: 10.6,
            original_unit: "gramy",
            original_quantity: 100,
          },
          {
            id: "protein-1",
            name: "Izolat białka serwatkowego",
            quantity: 30,
            unit: "gramy",
            calories: 113.7,
            protein: 26.1,
            fat: 0.3,
            carbs: 1.2,
            fiber: 0,
            original_unit: "gramy",
            original_quantity: 30,
          },
          {
            id: "milk-1",
            name: "Mleko 2%",
            quantity: 250,
            unit: "gramy",
            calories: 125,
            protein: 8.25,
            fat: 5,
            carbs: 12,
            fiber: 0,
            original_unit: "ml",
            original_quantity: 250,
          },
          {
            id: "raspberries-1",
            name: "Maliny",
            quantity: 100,
            unit: "gramy",
            calories: 52,
            protein: 1.2,
            fat: 0.7,
            carbs: 12,
            fiber: 6.5,
            original_unit: "gramy",
            original_quantity: 100,
          },
          {
            id: "walnuts-1",
            name: "Orzechy włoskie",
            quantity: 20,
            unit: "gramy",
            calories: 131.4,
            protein: 3.1,
            fat: 13.1,
            carbs: 2.7,
            fiber: 1.3,
            original_unit: "gramy",
            original_quantity: 20,
          },
        ],
      };

      // Mock realistic AI response
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            data: {
              optimized_ingredients: [
                {
                  id: "oats-1",
                  name: "Płatki owsiane",
                  quantity: 80,
                  unit: "gramy",
                  calories: 311.2,
                  protein: 13.52,
                  fat: 5.52,
                  carbs: 53.04,
                  fiber: 8.48,
                },
                {
                  id: "protein-1",
                  name: "Izolat białka serwatkowego",
                  quantity: 35,
                  unit: "gramy",
                  calories: 132.65,
                  protein: 30.45,
                  fat: 0.35,
                  carbs: 1.4,
                  fiber: 0,
                },
                {
                  id: "milk-1",
                  name: "Mleko 2%",
                  quantity: 200,
                  unit: "gramy",
                  calories: 100,
                  protein: 6.6,
                  fat: 4,
                  carbs: 9.6,
                  fiber: 0,
                },
                {
                  id: "raspberries-1",
                  name: "Maliny",
                  quantity: 80,
                  unit: "gramy",
                  calories: 41.6,
                  protein: 0.96,
                  fat: 0.56,
                  carbs: 9.6,
                  fiber: 5.2,
                },
                {
                  id: "walnuts-1",
                  name: "Orzechy włoskie",
                  quantity: 15,
                  unit: "gramy",
                  calories: 98.55,
                  protein: 2.33,
                  fat: 9.83,
                  carbs: 2.03,
                  fiber: 0.98,
                },
              ],
              macro_summary: {
                total_calories: 684,
                total_protein: 53.86,
                total_fat: 20.26,
                total_carbs: 75.67,
                total_fiber: 14.66,
                protein_percentage: 31.5,
                fat_percentage: 26.7,
                carbs_percentage: 44.2,
              },
              comparison: {
                calorie_difference: -127.1,
                protein_difference: -1.49,
                fat_difference: 5.26,
                carbs_difference: 15.67,
                target_achievement: {
                  protein_achievement: 154,
                  fat_achievement: 135,
                  carbs_achievement: 126,
                },
              },
              ai_comment:
                "Optymalizacja zakończona sukcesem. Wszystkie makroskładniki zbliżone do celu.",
              achievability: {
                overall_score: 90,
                feasibility: "high",
                main_challenges: [],
              },
            },
          }),
      });

      const result = await service.optimize(oatmealRequest);

      expect(result.success).toBe(true);
      expect(result.data?.optimized_ingredients).toHaveLength(5);
      expect(result.data?.macro_summary.total_protein).toBeCloseTo(53.86, 1);
      expect(result.data?.achievability.feasibility).toBe("high");
    });
  });
});
