import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// AI Macro Optimization Edge Function - PROPER FIX VERSION
// Fixed: Target vs maintenance values logic separation

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

// ------------------------------
// CORS + response helpers
// ------------------------------
const ALLOWED_ORIGINS = [
  "https://app.staniszewskitrener.pl",
  "https://trener-pawel.netlify.app",
  "https://staniszewskitrener.pl",
  "http://localhost:8080",
];

function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  };
}

function json(body: unknown, corsHeaders: Record<string, string>, init: ResponseInit = {}) {
  const headers = new Headers({
    "Content-Type": "application/json",
    ...corsHeaders,
    ...(init.headers || {}),
  });
  return new Response(JSON.stringify(body), { ...init, headers });
}

function errorJson(
  status: number,
  code: string,
  message: string,
  requestId: string,
  corsHeaders: Record<string, string>
) {
  console.error(`[${requestId}] Error ${status}: ${code} - ${message}`);
  return json(
    { success: false, error: { code, message }, request_id: requestId },
    corsHeaders,
    { status }
  );
}

// Enhanced logging function
function logInfo(requestId: string, message: string, data?: any) {
  console.log(
    `[${requestId}] ${message}`,
    data ? JSON.stringify(data, null, 2) : ""
  );
}

// ------------------------------
// Database Error Logging Helper
// ------------------------------
async function logErrorToDb(
  supabase: SupabaseClient,
  params: {
    user_id: string | null;
    error_type: "AI_ERROR" | "VALIDATION_ERROR" | "NETWORK_ERROR" | "DATABASE_ERROR" | "UNKNOWN";
    error_code: string;
    error_message: string;
    component: string;
    context?: Record<string, unknown>;
    severity?: "info" | "warning" | "error" | "critical";
  }
) {
  try {
    const { error } = await supabase.from("error_logs").insert({
      user_id: params.user_id,
      error_type: params.error_type,
      error_code: params.error_code,
      error_message: params.error_message,
      component: params.component,
      context: params.context || {},
      severity: params.severity || "error",
      url: "edge-function://ai-macro-optimization",
    });

    if (error) {
      console.error("Failed to log error to database:", error);
    } else {
      console.log("Error logged to database:", params.error_code);
    }
  } catch (err) {
    console.error("Exception while logging error:", err);
  }
}

// ------------------------------
// Env + Auth helpers
// ------------------------------
function envRequired(key: string): string {
  const val = Deno.env.get(key);
  if (!val) throw new Error(`Missing env: ${key}`);
  return val;
}

function getBearer(req: Request): string | null {
  const h =
    req.headers.get("Authorization") || req.headers.get("authorization");
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1] ?? null;
}

// ------------------------------
// Schemas
// ------------------------------
const IngredientIn = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  unit: z.string().min(1),
  quantity: z.union([z.number(), z.string()]),
  unit_weight: z.number().optional(),
  calories: z.number().optional(),
  protein: z.number().optional(),
  fat: z.number().optional(),
  carbs: z.number().optional(),
  fiber: z.number().optional(),
  original_unit: z.string().optional(),
  original_quantity: z.union([z.number(), z.string()]).optional(),
});

const TargetMacros = z
  .object({
    protein: z.coerce.number().optional(),
    fat: z.coerce.number().optional(),
    carbs: z.coerce.number().optional(),
    calories: z.coerce.number().optional(),
  })
  .transform((m) => ({
    target_protein: m.protein,
    target_fat: m.fat,
    target_carbs: m.carbs,
    target_calories: m.calories,
  }));

const RequestSchema = z.object({
  user_id: z.string().min(1),
  meal_name: z.string().optional(),
  target_macros: TargetMacros,
  current_ingredients: z.array(IngredientIn).min(1),
  context: z
    .union([
      z.enum(["dish", "meal"]),
      z.object({}).transform(() => "meal" as const),
    ])
    .optional(),
  ai_model: z
    .enum(["gpt-4o-mini", "gpt-5", "gpt-5-mini", "gpt-5-nano"])
    .optional()
    .default("gpt-4o-mini"),
});

type RequestDto = z.infer<typeof RequestSchema>;

type DbIngredient = {
  id: string;
  name: string;
  unit: string;
  unit_weight: number | null;
  calories: number | null;
  protein: number | null;
  fat: number | null;
  carbs: number | null;
  fiber: number | null;
};

// ------------------------------
// Unit + math helpers (IMPROVED)
// ------------------------------
function parseQty(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = parseFloat(
    String(v ?? "")
      .replace(",", ".")
      .replace(/[^0-9.\-]/g, "")
  );
  return Number.isFinite(n) ? n : NaN;
}

function safe(n: unknown): number {
  return Number.isFinite(n as number) ? (n as number) : 0;
}

function clampByUnitForInput(q: number, unit: string): number {
  const u = (unit || "").toLowerCase();
  if (u.includes("szt")) return Math.max(0.25, Math.min(20, q));
  if (u.includes("łyżec")) return Math.max(0.25, Math.min(20, q));
  if (u.includes("łyżk")) return Math.max(0.25, Math.min(20, q));
  if (u.includes("ml")) return Math.max(1, Math.min(2000, q));
  return Math.max(1, Math.min(2000, q));
}

function repairIncompleteJson(
  text: string,
  expectedCount: number,
  expectedIds: string[]
): string {
  try {
    JSON.parse(text);
    return text;
  } catch (e) {
    logInfo("json-repair", "Attempting to repair incomplete JSON", {
      error: (e as Error).message,
      text_length: text.length,
      text_preview: text.slice(0, 200),
    });

    const ingredientMatches = Array.from(
      text.matchAll(/\{"id":\s*"([^"]+)",\s*"quantity_value":\s*(\d+\.?\d*)\}/g)
    );

    if (ingredientMatches.length === 0) {
      throw new Error("No valid ingredient objects found in incomplete JSON");
    }

    const repairedIngredients = ingredientMatches.map((match) => ({
      id: match[1],
      quantity_value: parseFloat(match[2]),
    }));

    if (repairedIngredients.length < expectedCount) {
      logInfo(
        "json-repair",
        `Padding ${
          expectedCount - repairedIngredients.length
        } missing ingredients with minimums`
      );

      const foundIds = new Set(repairedIngredients.map((x) => x.id));
      for (let i = 0; i < expectedCount; i++) {
        const expectedId = expectedIds[i];
        if (!foundIds.has(expectedId)) {
          repairedIngredients.splice(i, 0, {
            id: expectedId,
            quantity_value: 5,
          });
        }
      }
    }

    const commentMatch = text.match(/"ai_comment":\s*"([^"]*)"/);
    const aiComment =
      commentMatch?.[1] ||
      "Optymalizacja przerwana - odpowiedź naprawiona automatycznie";

    const scoreMatch = text.match(/"achievability_score":\s*(\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

    const repaired = {
      optimized_ingredients: repairedIngredients,
      ai_comment: aiComment,
      achievability_score: score,
    };

    logInfo("json-repair", "JSON repaired successfully", {
      original_length: text.length,
      repaired_ingredients: repairedIngredients.length,
      expected: expectedCount,
    });

    return JSON.stringify(repaired);
  }
}

type IngredientClassification = {
  isSpice: boolean;
  isOil: boolean;
  isMeat: boolean;
  isDairy: boolean;
  isCarb: boolean;
  isFruitVeg: boolean;
  isCondiment: boolean;
};

function classifyName(name: string): IngredientClassification {
  const s = (name || "").toLowerCase();
  const isSpice = [
    "sól",
    "pieprz",
    "czosnek",
    "czosnek granulowany",
    "cynamon",
    "gałka",
    "papryka",
    "kurkuma",
    "bazylia",
    "oregano",
    "tymianek",
    "rozmaryn",
    "imbir",
    "kumin",
    "kolendra",
    "chili",
    "majeranek",
  ].some((k) => s.includes(k));
  const isOil = ["oliwa", "olej", "masło", "smalec", "ghee"].some((k) =>
    s.includes(k)
  );
  const isMeat = [
    "kurczak",
    "indyk",
    "woł",
    "wieprz",
    "łosoś",
    "tuńczyk",
    "dorsz",
    "jaj",
    "szynk",
    "krewet",
  ].some((k) => s.includes(k));
  const isDairy = [
    "ser",
    "twaróg",
    "jogurt",
    "kefir",
    "mleko",
    "skyr",
    "mozz",
    "ricott",
  ].some((k) => s.includes(k));
  const isCarb = [
    "ryż",
    "kasza",
    "makaron",
    "ziemniak",
    "pieczywo",
    "chleb",
    "ows",
    "płatki",
    "bulgur",
    "quinoa",
    "tortilla",
  ].some((k) => s.includes(k));
  const isFruitVeg = [
    "pomarań",
    "banan",
    "jabł",
    "grusz",
    "trusk",
    "borów",
    "malin",
    "winog",
    "marchew",
    "pomidor",
    "papryk",
    "ogórek",
    "sałat",
    "szpinak",
    "brokuł",
    "cukini",
    "cebula",
  ].some((k) => s.includes(k));
  const isCondiment = [
    "sok",
    "ocet",
    "sos",
    "musztarda",
    "ketchup",
    "majonez",
    "tabasco",
    "sriracha",
    "worcester",
    "cytryn",
    "limet",
    "limon",
  ].some((k) => s.includes(k));
  return { isSpice, isOil, isMeat, isDairy, isCarb, isFruitVeg, isCondiment };
}

function minGramsFor(name: string) {
  const c = classifyName(name);
  if (c.isSpice || c.isCondiment) return 0.25;
  if (c.isOil) return 1;
  if (c.isMeat) return 5;
  if (c.isDairy) return 5;
  if (c.isCarb) return 5;
  if (c.isFruitVeg) return 5;
  return 0.5;
}

function toGrams(q: number, unit: string, unit_weight?: number | null): number {
  const u = (unit || "").toLowerCase();
  if (u.includes("g")) return q;
  if (u.includes("ml")) {
    if (Number.isFinite(unit_weight))
      return (q / 100) * (unit_weight as number);
    return q;
  }
  if (Number.isFinite(unit_weight)) return q * (unit_weight as number);
  return q;
}

// ------------------------------
// Macro calc
// ------------------------------

function deriveCaloriesFromMacros(
  protein: number,
  fat: number,
  carbs: number
): number {
  return Math.round(4 * protein + 9 * fat + 4 * carbs);
}

function heuristicOptimize(
  ingredients: Array<{
    id: string;
    name: string;
    grams: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  }>,
  targets: { protein: number | null; fat: number | null; carbs: number | null },
  currentTotals: {
    total_protein: number;
    total_fat: number;
    total_carbs: number;
  },
  minGramsMap: Map<string, number>
): Array<{ id: string; quantity_value: number }> {
  const result = ingredients.map((ing) => ({
    id: ing.id,
    quantity_value: ing.grams,
  }));

  const macroPerGram = (
    ing: (typeof ingredients)[0],
    macro: "protein" | "fat" | "carbs"
  ) => ing[macro] / ing.grams;

  if (targets.protein !== null) {
    const diff = targets.protein - currentTotals.total_protein;
    if (Math.abs(diff) > 3) {
      const sorted = ingredients
        .map((ing, idx) => ({
          ...ing,
          idx,
          density: macroPerGram(ing, "protein"),
        }))
        .filter((x) => x.density > 0.1)
        .sort((a, b) => b.density - a.density);

      if (sorted.length > 0) {
        const best = sorted[0];
        const adjustment = diff / best.density;
        const newGrams = Math.max(
          minGramsMap.get(best.id) ?? 5,
          best.grams + adjustment
        );
        result[best.idx].quantity_value = Math.round(newGrams);
      }
    }
  }

  if (targets.fat !== null) {
    const diff = targets.fat - currentTotals.total_fat;
    if (Math.abs(diff) > 2) {
      const sorted = ingredients
        .map((ing, idx) => ({ ...ing, idx, density: macroPerGram(ing, "fat") }))
        .filter((x) => x.density > 0.1)
        .sort((a, b) => b.density - a.density);

      if (sorted.length > 0) {
        const best = sorted[0];
        const adjustment = diff / best.density;
        const newGrams = Math.max(
          minGramsMap.get(best.id) ?? 1,
          best.grams + adjustment
        );
        result[best.idx].quantity_value = Math.round(newGrams);
      }
    }
  }

  if (targets.carbs !== null) {
    const diff = targets.carbs - currentTotals.total_carbs;
    if (Math.abs(diff) > 5) {
      const sorted = ingredients
        .map((ing, idx) => ({
          ...ing,
          idx,
          density: macroPerGram(ing, "carbs"),
        }))
        .filter((x) => x.density > 0.1)
        .sort((a, b) => b.density - a.density);

      if (sorted.length > 0) {
        const best = sorted[0];
        const adjustment = diff / best.density;
        const newGrams = Math.max(
          minGramsMap.get(best.id) ?? 5,
          best.grams + adjustment
        );
        result[best.idx].quantity_value = Math.round(newGrams);
      }
    }
  }

  return result;
}

function sumMacros(
  items: Array<{
    calories?: number;
    protein?: number;
    fat?: number;
    carbs?: number;
    fiber?: number;
  }>
) {
  return items.reduce(
    (t, i) => ({
      total_calories: t.total_calories + safe(i.calories),
      total_protein: t.total_protein + safe(i.protein),
      total_fat: t.total_fat + safe(i.fat),
      total_carbs: t.total_carbs + safe(i.carbs),
      total_fiber: t.total_fiber + safe(i.fiber),
    }),
    {
      total_calories: 0,
      total_protein: 0,
      total_fat: 0,
      total_carbs: 0,
      total_fiber: 0,
    }
  );
}

// ------------------------------
// JSON Schema builder for strict Responses API format
// ------------------------------
function buildJsonSchema(expectedCount: number) {
  return {
    name: "MacroOptimization",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["optimized_ingredients", "ai_comment", "achievability_score"],
      properties: {
        optimized_ingredients: {
          type: "array",
          minItems: expectedCount,
          maxItems: expectedCount,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["id", "quantity_value"],
            properties: {
              id: { type: "string" },
              quantity_value: { type: "number", minimum: 0.01, maximum: 10000 },
            },
          },
        },
        ai_comment: {
          type: "string",
          maxLength: 300,
        },
        achievability_score: {
          type: "number",
          minimum: 0,
          maximum: 100,
        },
      },
    },
  };
}

// ------------------------------
// OpenAI call - HYBRID: Chat Completions primary, Responses fallback
// ------------------------------
async function callOpenAI(
  apiKey: string,
  prompt: string,
  requestId: string,
  model: string = "gpt-4o-mini",
  expectedCount: number,
  ingredientIds: string[] = [],
  optimizationTargets?: {
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    calories: number | null;
  }
) {
  const isGPT5 = model.startsWith("gpt-5");
  const isO1Model = model.startsWith("o1-");
  const is4oModel = model.startsWith("gpt-4o");
  const supportsSamplingParams = !(isGPT5 || isO1Model);

  const systemMessage = `Zwracaj WYŁĄCZNIE JSON z polami:
optimized_ingredients (lista długości ${expectedCount}; ID w kolejności z promptu),
ai_comment (≤300 znaków, bez liczb), achievability_score (0–100).
quantity_value w gramach.`;

  const messages = [
    {
      role: "system",
      content:
        systemMessage + " Nie dołączaj uzasadnień ani analiz. TYLKO JSON.",
    },
    { role: "user", content: prompt },
  ];

  const wantsChat = is4oModel && !isGPT5;
  if (wantsChat && !isO1Model) {
    const chatBody: any = {
      model,
      messages,
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0,
    };

    logInfo(requestId, "Calling Chat Completions", {
      model,
      max_tokens: chatBody.max_tokens,
      temperature: chatBody.temperature,
    });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(chatBody),
    });

    const txt = await res.text();

    if (res.ok) {
      let data: any;
      try {
        data = JSON.parse(txt);
      } catch {
        data = {};
      }

      let msg =
        data?.choices?.[0]?.message?.content ??
        (Array.isArray(data?.choices?.[0]?.message?.content)
          ? data.choices[0].message.content
              .map((c: any) => c?.text || c)
              .join("")
          : null);

      if (!msg) {
        logInfo(requestId, "Chat payload (truncated)", txt.slice(0, 1500));
        throw new Error("OpenAI: empty content");
      }

      msg = String(msg)
        .replace(/^\uFEFF/, "")
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "")
        .trim();

      const firstBrace = msg.indexOf("{");
      const lastBrace = msg.lastIndexOf("}");
      const jsonStr =
        firstBrace !== -1 && lastBrace > firstBrace
          ? msg.slice(firstBrace, lastBrace + 1)
          : msg;

      const repairedJson = repairIncompleteJson(
        jsonStr,
        expectedCount,
        ingredientIds
      );
      const parsed = JSON.parse(repairedJson);
      logInfo(requestId, "OpenAI response received (chat)", {
        ingredients_count: parsed.optimized_ingredients?.length || 0,
        has_comment: !!parsed.ai_comment,
        score: parsed.achievability_score,
      });
      return parsed;
    } else {
      logInfo(requestId, `OpenAI Chat Error ${res.status}`, txt);
      if (
        txt.includes("Unsupported parameter") ||
        txt.includes("not supported with this model") ||
        txt.includes("Use 'max_completion_tokens'")
      ) {
        logInfo(requestId, "Falling back to Responses API for this model");
      } else {
        throw new Error(`OpenAI HTTP ${res.status}: ${txt}`);
      }
    }
  }

  const uuidList =
    ingredientIds.length > 0
      ? `\n\nKRYTYCZNE - UŻYJ DOKŁADNIE TYCH UUID:\n${ingredientIds
          .map((id: string, idx: number) => `${idx + 1}. "${id}"`)
          .join("\n")}\n`
      : "";

  const jsonSchema = buildJsonSchema(expectedCount);

  const baseRespBody: Record<string, any> = {
    model,
    input: [
      { role: "system", content: systemMessage + uuidList },
      { role: "user", content: prompt },
    ],
    max_output_tokens: isGPT5
      ? 6000
      : Math.min(2500, Math.max(2000, 80 * expectedCount + 300)),
    reasoning: isGPT5
      ? {
          effort: "low",
        }
      : undefined,
    text: {
      verbosity: "low",
      format: {
        type: "json_schema",
        name: jsonSchema.name,
        schema: jsonSchema.schema,
        strict: jsonSchema.strict,
      },
    },
  };

  const respBody = supportsSamplingParams
    ? { ...baseRespBody, temperature: 0 }
    : baseRespBody;

  logInfo(requestId, "Calling Responses API", {
    model,
    max_output_tokens: respBody.max_output_tokens,
    ...(supportsSamplingParams && { temperature: 0 }),
  });

  const res2 = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(respBody),
  });

  const txt2 = await res2.text();
  if (!res2.ok) {
    logInfo(requestId, `OpenAI Responses Error ${res2.status}`, txt2);
    throw new Error(`OpenAI HTTP ${res2.status}: ${txt2}`);
  }

  let data2: any;
  try {
    data2 = JSON.parse(txt2);
  } catch {
    data2 = {};
  }

  function pickStructured(
    d: Record<string, unknown>
  ): Record<string, unknown> | null {
    if (!d) return null;
    if (d.output_parsed) return d.output_parsed as Record<string, unknown>;
    const output = d.output as unknown[];
    const content =
      output?.flatMap?.((o: unknown) => {
        const obj = o as Record<string, unknown>;
        return Array.isArray(obj?.content) ? obj.content : [];
      }) || [];
    for (const c of content) {
      if (c?.parsed !== undefined) return c.parsed as Record<string, unknown>;
      if (c?.json !== undefined) return c.json as Record<string, unknown>;
    }
    return null;
  }

  function extractText(d: any): string {
    const out: string[] = [];
    if (typeof d?.output_text === "string") out.push(d.output_text);
    if (d?.output_parsed) {
      try {
        out.push(JSON.stringify(d.output_parsed));
      } catch {
        // Ignore stringify errors
      }
    }
    if (Array.isArray(d?.output)) {
      for (const o of d.output) {
        if (Array.isArray(o?.content)) {
          for (const c of o.content) {
            if (typeof c?.text === "string") out.push(c.text);
            else if (c?.text?.value) out.push(String(c.text.value));
            else if (c?.json !== undefined) out.push(JSON.stringify(c.json));
            else if (c?.parsed !== undefined)
              out.push(JSON.stringify(c.parsed));
          }
        }
      }
    }
    return out.join("").trim();
  }

  const structured = pickStructured(data2);
  if (structured) {
    logInfo(requestId, "Using structured (parsed/json) output");
    return structured;
  }

  if (data2?.status === "incomplete") {
    const reason = data2?.incomplete_details?.reason;

    if (reason === "max_output_tokens" || reason === "content_filter") {
      logInfo(
        requestId,
        `Responses incomplete due to ${reason} — compact retry`
      );

      const compactPrompt = `ZADANIE: Optymalizuj składniki do celów makro.

CELE MAKRO: białko ${optimizationTargets?.protein || "brak"}g, tłuszcz ${
        optimizationTargets?.fat || "brak"
      }g, węgle ${optimizationTargets?.carbs || "brak"}g

COUNT: ${expectedCount}
IDS: [${ingredientIds.map((id: string) => `"${id}"`).join(", ")}]

PRZYKŁADY REALISTYCZNYCH PORCJI:
- Kurczak/mięso: 80-250g (nie 5g!)
- Warzywa/owoce: 50-250g
- Kasze/ryż: 40-80g (suchy)
- Oliwa: 5-15g (nie 0.5g!)
- Przyprawy: 0.25-3g

Zwróć JSON: {"optimized_ingredients":[{"id":string,"quantity_value":number}],"ai_comment":"krótko","achievability_score":number}

PAMIĘTAJ: quantity_value w gramach, używaj PRAKTYCZNYCH porcji!`;

      const baseCompact: Record<string, unknown> = {
        model,
        input: [
          {
            role: "system",
            content:
              "Zwracaj WYŁĄCZNIE JSON. Używaj praktycznych, realistycznych porcji składników.",
          },
          { role: "user", content: compactPrompt },
        ],
        max_output_tokens: isGPT5 ? 6000 : 2000,
        reasoning: isGPT5
          ? {
              effort: "low",
            }
          : undefined,
        text: {
          verbosity: "low",
          format: {
            type: "json_schema",
            name: jsonSchema.name,
            schema: jsonSchema.schema,
            strict: jsonSchema.strict,
          },
        },
      };

      const compact = supportsSamplingParams
        ? { ...baseCompact, temperature: 0 }
        : baseCompact;

      const res3 = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(compact),
      });

      const txt3 = await res3.text();
      if (!res3.ok) {
        logInfo(requestId, `OpenAI Responses Retry Error ${res3.status}`, txt3);
        throw new Error(`OpenAI HTTP ${res3.status}: ${txt3}`);
      }

      let d3: any;
      try {
        d3 = JSON.parse(txt3);
      } catch {
        d3 = {};
      }

      const structured3 = pickStructured(d3);
      if (structured3) {
        logInfo(
          requestId,
          "Using structured (parsed/json) output from compact retry"
        );
        return structured3;
      }

      const raw3 = extractText(d3)
        .replace(/^\uFEFF/, "")
        .replace(/^```(?:json)?/i, "")
        .replace(/```$/i, "");

      if (!raw3) {
        logInfo(
          requestId,
          "Responses retry payload (truncated)",
          txt3.slice(0, 1500)
        );
        logInfo(requestId, "Responses retry shape debug", {
          status: d3?.status,
          output_len: Array.isArray(d3?.output) ? d3.output.length : null,
          content_types: Array.isArray(d3?.output)
            ? d3.output.flatMap((o: Record<string, unknown>) =>
                ((o?.content as unknown[]) || []).map((c: unknown) => {
                  const obj = c as Record<string, unknown>;
                  return obj?.type ?? typeof c;
                })
              )
            : null,
        });

        logInfo(
          requestId,
          "Responses still incomplete → falling back to Chat Completions"
        );
        if (isGPT5) {
          throw new Error(
            `GPT-5 Responses API incomplete after retry. Increase max_output_tokens or simplify prompt. Model: ${model}`
          );
        }
        const chatBody = {
          model,
          messages: [
            { role: "system", content: systemMessage + " TYLKO JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { ...jsonSchema },
          },
          temperature: 0,
          max_tokens: 2000,
        };
        const chatRes = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(chatBody),
          }
        );
        const chatTxt = await chatRes.text();
        if (!chatRes.ok)
          throw new Error(`OpenAI Chat HTTP ${chatRes.status}: ${chatTxt}`);
        const chatJson = JSON.parse(chatTxt);
        const msg = chatJson?.choices?.[0]?.message?.content || "";
        const first = msg.indexOf("{"),
          last = msg.lastIndexOf("}");
        const chatJsonStr =
          first !== -1 && last > first ? msg.slice(first, last + 1) : msg;
        logInfo(requestId, "Chat Completions fallback succeeded");
        const repairedChatJson = repairIncompleteJson(
          chatJsonStr,
          expectedCount,
          ingredientIds
        );
        return JSON.parse(repairedChatJson);
      }

      const fbFirst = raw3.indexOf("{");
      const fbLast = raw3.lastIndexOf("}");
      const jsonStr =
        fbFirst !== -1 && fbLast > fbFirst
          ? raw3.slice(fbFirst, fbLast + 1)
          : raw3;

      const repairedJson = repairIncompleteJson(
        jsonStr,
        expectedCount,
        ingredientIds
      );
      const parsed = JSON.parse(repairedJson);
      logInfo(requestId, "OpenAI response received (responses/compact)", {
        ingredients_count: parsed.optimized_ingredients?.length || 0,
        has_comment: !!parsed.ai_comment,
        score: parsed.achievability_score,
      });
      return parsed;
    } else {
      throw new Error(`OpenAI incomplete: ${reason || "unknown_reason"}`);
    }
  }

  const raw = extractText(data2)
    .replace(/^\uFEFF/, "")
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "");

  if (!raw) {
    logInfo(requestId, "Responses payload (truncated)", txt2.slice(0, 1500));
    logInfo(requestId, "Responses shape debug", {
      status: data2?.status,
      output_len: Array.isArray(data2?.output) ? data2.output.length : null,
      content_types: Array.isArray(data2?.output)
        ? data2.output.flatMap((o: Record<string, unknown>) =>
            ((o?.content as unknown[]) || []).map((c: unknown) => {
              const obj = c as Record<string, unknown>;
              return obj?.type ?? typeof c;
            })
          )
        : null,
    });
    throw new Error("OpenAI: empty content");
  }

  const b1 = raw.indexOf("{");
  const b2 = raw.lastIndexOf("}");
  const jsonStr2 = b1 !== -1 && b2 > b1 ? raw.slice(b1, b2 + 1) : raw;

  const repairedJson2 = repairIncompleteJson(
    jsonStr2,
    expectedCount,
    ingredientIds
  );
  const parsed2 = JSON.parse(repairedJson2);
  logInfo(requestId, "OpenAI response received (responses)", {
    ingredients_count: parsed2.optimized_ingredients?.length || 0,
    has_comment: !!parsed2.ai_comment,
    score: parsed2.achievability_score,
  });
  return parsed2;
}

// ------------------------------
// PROPER FIX: Prompt builder with target vs maintain separation
// ------------------------------
function buildPrompt(
  req: RequestDto,
  currentTotals: ReturnType<typeof sumMacros>,
  optimizationTargets: {
    protein: number | null;
    fat: number | null;
    carbs: number | null;
    calories: number | null;
  },
  maintenanceValues: {
    protein: number;
    fat: number;
    carbs: number;
    calories: number;
  },
  expandedIngredients: any[],
  ingredientsMap: Map<string, DbIngredient>
) {
  const items = req.current_ingredients
    .map((i, idx) => {
      const expanded = expandedIngredients[idx];
      const ref = ingredientsMap.get(i.id);

      const unitInfo =
        expanded.original_unit && expanded.original_unit !== i.unit
          ? ` (oryginalnie: ${expanded.original_quantity}${expanded.original_unit})`
          : "";

      const unitWeightInfo = ref?.unit_weight
        ? ` [1${expanded.original_unit || ref.unit}=${ref.unit_weight}g]`
        : "";

      return `- [${i.id}] ${i.name} (${i.quantity}${
        i.unit
      }${unitInfo}${unitWeightInfo}): ${safe(i.calories)}kcal, ${safe(
        i.protein
      )}g białka, ${safe(i.fat)}g tł., ${safe(i.carbs)}g węgli`;
    })
    .join("\n");

  const contextText = req.context === "meal" ? "posiłku" : "potrawy";
  const contextInstructions =
    req.context === "meal"
      ? "Optymalizujesz składniki pojedynczego posiłku w diecie klienta."
      : "Optymalizujesz przepis na potrawę do późniejszego użycia.";

  const optimizeRequirements: string[] = [];
  const maintainRequirements: string[] = [];

  if (optimizationTargets.protein !== null) {
    const diff = Math.abs(
      currentTotals.total_protein - optimizationTargets.protein
    );
    if (diff > 5) {
      const direction =
        currentTotals.total_protein > optimizationTargets.protein
          ? "ZMNIEJSZ"
          : "ZWIĘKSZ";
      optimizeRequirements.push(
        `BIAŁKO: ${direction} z ${
          Math.round(currentTotals.total_protein * 10) / 10
        }g do ${Math.round(optimizationTargets.protein * 10) / 10}g (różnica: ${
          Math.round(diff * 10) / 10
        }g)`
      );
    }
  } else {
    maintainRequirements.push(
      `białko: ~${
        Math.round(maintenanceValues.protein * 10) / 10
      }g (zachowaj obecne)`
    );
  }

  if (optimizationTargets.fat !== null) {
    const diff = Math.abs(currentTotals.total_fat - optimizationTargets.fat);
    if (diff > 3) {
      const direction =
        currentTotals.total_fat > optimizationTargets.fat
          ? "ZMNIEJSZ"
          : "ZWIĘKSZ";
      optimizeRequirements.push(
        `TŁUSZCZ: ${direction} z ${
          Math.round(currentTotals.total_fat * 10) / 10
        }g do ${Math.round(optimizationTargets.fat * 10) / 10}g (różnica: ${
          Math.round(diff * 10) / 10
        }g)`
      );
    }
  } else {
    maintainRequirements.push(
      `tłuszcz: ~${
        Math.round(maintenanceValues.fat * 10) / 10
      }g (zachowaj obecne)`
    );
  }

  if (optimizationTargets.carbs !== null) {
    const diff = Math.abs(
      currentTotals.total_carbs - optimizationTargets.carbs
    );
    if (diff > 10) {
      const direction =
        currentTotals.total_carbs > optimizationTargets.carbs
          ? "ZMNIEJSZ"
          : "ZWIĘKSZ";
      optimizeRequirements.push(
        `WĘGLOWODANY: ${direction} z ${
          Math.round(currentTotals.total_carbs * 10) / 10
        }g do ${Math.round(optimizationTargets.carbs * 10) / 10}g (różnica: ${
          Math.round(diff * 10) / 10
        }g)`
      );
    }
  } else {
    maintainRequirements.push(
      `węglowodany: ~${
        Math.round(maintenanceValues.carbs * 10) / 10
      }g (zachowaj obecne)`
    );
  }

  const calculationExamples: string[] = [];

  if (optimizationTargets.protein !== null) {
    const diff = optimizationTargets.protein - currentTotals.total_protein;
    if (Math.abs(diff) > 5) {
      const bestProtein = req.current_ingredients
        .map((i: z.infer<typeof IngredientIn>, idx: number) => ({
          name: i.name,
          proteinPer100g:
            expandedIngredients[idx].protein /
            (expandedIngredients[idx].grams / 100),
          id: i.id,
        }))
        .filter(
          (x: { name: string; proteinPer100g: number; id: string }) =>
            x.proteinPer100g > 5
        )
        .sort(
          (a: { proteinPer100g: number }, b: { proteinPer100g: number }) =>
            b.proteinPer100g - a.proteinPer100g
        )[0];

      if (bestProtein) {
        const gramsNeeded = Math.abs(diff / (bestProtein.proteinPer100g / 100));
        const action = diff > 0 ? "zwiększ" : "zmniejsz";
        calculationExamples.push(
          `PRZYKŁAD: ${bestProtein.name} ma ~${Math.round(
            bestProtein.proteinPer100g
          )}g białka/100g. ` +
            `Żeby ${action} białko o ${Math.abs(
              Math.round(diff)
            )}g, ${action} ${bestProtein.name} o ~${Math.round(gramsNeeded)}g.`
        );
      }
    }
  }

  let changeRequirements = "";
  if (optimizeRequirements.length > 0) {
    changeRequirements = `
OPTYMALIZUJ TE MAKROSKŁADNIKI (dietetyk określił cele):
${optimizeRequirements.join("\n")}

MUSISZ wprowadzić znaczące zmiany dla określonych celów!
${calculationExamples.length > 0 ? "\n" + calculationExamples.join("\n") : ""}
`;
  } else {
    changeRequirements = `
BRAK KONKRETNYCH CELÓW OPTYMALIZACJI - wszystkie makra są do zachowania w obecnych wartościach.
`;
  }

  const ingredientIds = req.current_ingredients.map((i: any) => i.id);
  const count = ingredientIds.length;

  return `ZADANIE: Optymalizuj makro ${contextText}. ${contextInstructions}

Zwróć JSON: {"optimized_ingredients": [{"id": string, "quantity_value": number, "change_reason": string}], "ai_comment": string, "achievability_score": number}

COUNT: ${count}
IDS_IN_ORDER: [${ingredientIds.map((id: string) => `"${id}"`).join(", ")}]

SKŁADNIKI:
${items}

MAKRA AKTUALNE: ${Math.round(currentTotals.total_protein * 10) / 10}g białka, ${
    Math.round(currentTotals.total_fat * 10) / 10
  }g tł., ${Math.round(currentTotals.total_carbs * 10) / 10}g węgli

CELE:
${
  Object.entries(optimizationTargets)
    .filter(([_, value]) => value !== null)
    .map(([key, value]) => {
      const unit = key === "calories" ? "kcal" : "g";
      const label =
        key === "protein"
          ? "białko"
          : key === "fat"
          ? "tłuszcz"
          : key === "carbs"
          ? "węglowodany"
          : "kalorie";
      return `${label}: ${Math.round(value! * 10) / 10}${unit}`;
    })
    .join(", ") || "BRAK"
}

${changeRequirements}

SKŁADNIKI WYSOKOTŁUSZCZOWE (>50g tłuszczu/100g):
Orzechy, wiórki kokosowe, nasiona, masło orzechowe:
- To DODATKI SMAKOWE, nie baza posiłku
- Można znacząco redukować (nawet do 10-30g) przy celu zmniejszenia tłuszczu
- Priorytetyzuj ich modyfikację przed oliwą/olejem (te są dla przygotowania)

ZASADY:
1. NIE usuwaj składników (każdy musi mieć quantity_value > 0)
2. TŁUSZCZE (oliwa, olej, masło) są KLUCZOWE dla smaku i przygotowania - używaj MINIMUM 2.5g (absolutne minimum dla sensu kulinego)
3. Używaj praktycznych, realistycznych porcji - myśl jak doświadczony dietetyk:

   SZTUKI - NIEPODZIELNE (tylko całe liczby):
   - Jajka: 1, 2, 3, 4 (NIE 1.5, NIE 2.3, NIE 1.25)
   - Ziemniaki (małe): 1, 2, 3 (NIE 1.5, NIE 2.7)

   SZTUKI - PODZIELNE (dopuszczalne połówki):
   - Owoce duże (banan, jabłko, gruszka): 0.5, 1, 1.5, 2 (dopuszczalne połówki)
   - Warzywa duże (papryka, ogórek): 0.5, 1, 1.5, 2 (dopuszczalne połówki)

   ŁYŻKI I ŁYŻECZKI:
   - Płyny: 1, 2, 3 (tylko całe)
   - Stałe: 1, 2, 3 (tylko całe)

   PRZYPRAWY: minimum 0.25g (szczypta)

4. Używaj wartości łatwych do zważenia:
   - Mięso/nabiał/węgle >20g: wielokrotności 5g (25g, 30g, 35g...)
   - Dodatki (orzechy/wiórki/nasiona) >20g: wielokrotności 5g lub 10g (30g, 40g, 50g...)
   - Warzywa/owoce >20g: wielokrotności 5g (25g, 30g, 35g...)
   - Małe ilości <20g: wielokrotności 1g (5g, 6g, 7g...)
   - Przyprawy: wielokrotności 0.25g (0.25g, 0.5g, 0.75g, 1g...)
   - Tłuszcze (oliwa/olej) do przygotowania: wielokrotności 1g (3g, 4g, 5g...)
5. quantity_value ZAWSZE w gramach, frontend przelicza na oryginalne jednostki
6. ai_comment: max 300 znaków, bez liczb/jednostek - opisz strategię

Achievability_score: 90-100=łatwe, 70-89=średnie, 50-69=trudne, <50=bardzo trudne`;
}

// ------------------------------
// Main handler
// ------------------------------
Deno.serve(async (req) => {
  const requestId = crypto.randomUUID();
  logInfo(requestId, "Request started", { method: req.method, url: req.url });

  // Get dynamic CORS headers based on request origin
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

  // CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Healthcheck
  if (req.method === "GET") {
    const status = {
      ok: true,
      version: "1.7.0",
      request_id: requestId,
    };
    logInfo(requestId, "Healthcheck", status);
    return json(status, corsHeaders);
  }

  // Guard: content-type
  const ct = req.headers.get("content-type") || "";
  if (!ct.includes("application/json"))
    return errorJson(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Wymagany application/json",
      requestId,
      corsHeaders
    );

  // Parse JSON safely
  let body: unknown;
  try {
    body = await req.json();
  } catch (error) {
    return errorJson(
      400,
      "BAD_JSON",
      `Nieprawidłowy JSON w body: ${error.message}`,
      requestId,
      corsHeaders
    );
  }

  // Validate body
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    logInfo(requestId, "Validation error", {
      errors: parsed.error.flatten(),
      rawBody: body,
    });
    return json(
      {
        success: false,
        error: { code: "INVALID_REQUEST", message: parsed.error.flatten() },
        request_id: requestId,
      },
      corsHeaders,
      { status: 422 }
    );
  }
  const input = parsed.data;

  // Validate no duplicate ingredient IDs
  const ingredientIds = input.current_ingredients.map((ing: { id: string }) => ing.id);
  const uniqueIds = new Set(ingredientIds);
  if (ingredientIds.length !== uniqueIds.size) {
    const duplicates = ingredientIds.filter(
      (id: string, idx: number) => ingredientIds.indexOf(id) !== idx
    );
    const uniqueDuplicates = [...new Set(duplicates)];

    logInfo(requestId, "Duplicate ingredients detected", {
      total_ingredients: ingredientIds.length,
      unique_ingredients: uniqueIds.size,
      duplicate_ids: uniqueDuplicates,
    });

    return errorJson(
      400,
      "DUPLICATE_INGREDIENTS",
      `Wykryto duplikaty składników (${uniqueDuplicates.length} ID). Połącz je w jeden wpis - zwiększ ilość zamiast dodawać ten sam produkt wielokrotnie.`,
      requestId,
      corsHeaders
    );
  }


  logInfo(requestId, "Request validated", {
    context: input.context,
    ingredients_count: input.current_ingredients.length,
    target_macros: input.target_macros,
  });

  // Supabase client
  let supabase: SupabaseClient;
  try {
    const url = envRequired("SUPABASE_URL");
    const key = envRequired("SUPABASE_SERVICE_ROLE_KEY");
    supabase = createClient(url, key);
    logInfo(requestId, "Supabase client created");
  } catch (e) {
    return errorJson(
      500,
      "CONFIGURATION_ERROR",
      (e as Error).message,
      requestId,
      corsHeaders
    );
  }

  // Auth
  const token = getBearer(req);
  if (!token) {
    logErrorToDb(supabase, {
      user_id: null,
      error_type: "VALIDATION_ERROR",
      error_code: "UNAUTHORIZED",
      error_message: "Brak tokenu Bearer",
      component: "ai-macro-optimization/auth",
      severity: "warning",
      context: { request_id: requestId },
    });
    return errorJson(401, "UNAUTHORIZED", "Brak tokenu Bearer", requestId, corsHeaders);
  }

  const { data: userData, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userData?.user) {
    logInfo(requestId, "Auth failed", { error: authErr?.message });
    logErrorToDb(supabase, {
      user_id: null,
      error_type: "VALIDATION_ERROR",
      error_code: "INVALID_TOKEN",
      error_message: "Nieprawidłowy token",
      component: "ai-macro-optimization/auth",
      severity: "warning",
      context: { request_id: requestId, auth_error: authErr?.message },
    });
    return errorJson(401, "INVALID_TOKEN", "Nieprawidłowy token", requestId, corsHeaders);
  }

  if (input.user_id !== userData.user.id) {
    logInfo(requestId, "User ID mismatch", {
      requestUserId: input.user_id,
      tokenUserId: userData.user.id,
    });
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "VALIDATION_ERROR",
      error_code: "FORBIDDEN",
      error_message: "Brak uprawnień - user_id mismatch",
      component: "ai-macro-optimization/auth",
      severity: "error",
      context: {
        request_id: requestId,
        request_user_id: input.user_id,
        token_user_id: userData.user.id,
      },
    });
    return errorJson(403, "FORBIDDEN", "Brak uprawnień", requestId, corsHeaders);
  }

  logInfo(requestId, "Authentication successful", { userId: userData.user.id });


  // Ingredients from DB
  const { data: dbIngs, error: dbErr } = await supabase
    .from("ingredients")
    .select("id, name, unit, unit_weight, calories, protein, fat, carbs, fiber")
    .or(`user_id.is.null,user_id.eq.${userData.user.id}`)
    .order("name");

  if (dbErr) {
    logInfo(requestId, "Database error", dbErr);
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "DATABASE_ERROR",
      error_code: "DATABASE_ERROR",
      error_message: "Błąd zapytania do bazy danych (ingredients)",
      component: "ai-macro-optimization/db-query",
      severity: "critical",
      context: {
        request_id: requestId,
        table: "ingredients",
        error: dbErr,
      },
    });
    return errorJson(500, "DATABASE_ERROR", "Błąd bazy danych", requestId, corsHeaders);
  }

  const byId = new Map<string, DbIngredient>(
    (dbIngs || []).map((i) => [i.id, i as DbIngredient])
  );
  logInfo(requestId, "Ingredients loaded", { count: byId.size });


  // Validate current_ingredients exist in DB
  const missing = input.current_ingredients
    .map((i) => i.id)
    .filter((id) => !byId.has(id));
  if (missing.length) {
    logInfo(requestId, "Missing ingredients", { missing });
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "VALIDATION_ERROR",
      error_code: "INVALID_INGREDIENTS",
      error_message: `Składniki nie istnieją w bazie: ${missing.join(", ")}`,
      component: "ai-macro-optimization/validation",
      severity: "error",
      context: {
        request_id: requestId,
        missing_ids: missing,
        total_ingredients: input.current_ingredients.length,
      },
    });
    return errorJson(
      422,
      "INVALID_INGREDIENTS",
      `Brak w bazie: ${missing.join(", ")}`,
      requestId,
      corsHeaders
    );
  }

  const currentExpanded = input.current_ingredients.map((i) => {
    const ref = byId.get(i.id)!;

    const unitWeight = i.unit_weight ?? ref.unit_weight;

    const originalUnit = i.original_unit || i.unit;
    const originalQuantity = parseQty(i.original_quantity || i.quantity);

    let q, g;

    if (i.unit === "g" || i.unit === "gramy") {
      g = parseQty(i.quantity);
      q = g;

      logInfo(requestId, `Processing ingredient in grams: ${ref.name}`, {
        received_quantity: i.quantity,
        received_unit: i.unit,
        original_unit: originalUnit,
        original_quantity: originalQuantity,
        unit_weight_from_request: i.unit_weight,
        unit_weight_from_db: ref.unit_weight,
        unit_weight_used: unitWeight,
        grams_used: g,
      });
    } else {
      q = clampByUnitForInput(parseQty(i.quantity), ref.unit || originalUnit);
      g = toGrams(q, ref.unit || originalUnit, unitWeight);

      logInfo(requestId, `Processing ingredient with conversion: ${ref.name}`, {
        received_quantity: i.quantity,
        received_unit: i.unit,
        clamped_quantity: q,
        unit_weight_from_request: i.unit_weight,
        unit_weight_from_db: ref.unit_weight,
        unit_weight_used: unitWeight,
        grams_converted: g,
      });
    }

    let calories, protein, fat, carbs, fiber;

    if (i.calories !== undefined && i.protein !== undefined) {
      calories = i.calories;
      protein = i.protein;
      fat = i.fat ?? 0;
      carbs = i.carbs ?? 0;
      fiber = i.fiber ?? 0;
    } else {
      const m = safe(g) / 100;
      calories = Math.round(safe(ref.calories ?? 0) * m * 100) / 100;
      protein = Math.round(safe(ref.protein ?? 0) * m * 100) / 100;
      fat = Math.round(safe(ref.fat ?? 0) * m * 100) / 100;
      carbs = Math.round(safe(ref.carbs ?? 0) * m * 100) / 100;
      fiber = Math.round(safe(ref.fiber ?? 0) * m * 100) / 100;
    }

    return {
      id: i.id,
      name: i.name || ref.name,
      unit: ref.unit,
      quantity: q,
      grams: g,
      original_unit: originalUnit,
      original_quantity: originalQuantity,
      unit_weight: unitWeight,
      calories: Math.round(calories * 100) / 100,
      protein: Math.round(protein * 100) / 100,
      fat: Math.round(fat * 100) / 100,
      carbs: Math.round(carbs * 100) / 100,
      fiber: Math.round(fiber * 100) / 100,
    };
  });

  const currentTotals = sumMacros(currentExpanded);
  logInfo(requestId, "Current totals calculated", currentTotals);

  const MIN_BY_ID = new Map<string, number>(
    input.current_ingredients.map((i: any) => {
      const ref = byId.get(i.id)!;
      const minG = minGramsFor(ref.name);
      return [i.id, minG];
    })
  );
  logInfo(requestId, "Minimum grams map built", { count: MIN_BY_ID.size });

  function asTarget(value: any): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    if (Math.abs(num) < 1e-9) return null;
    return num;
  }

  const optimizationTargets = {
    protein: asTarget(input.target_macros.target_protein),
    fat: asTarget(input.target_macros.target_fat),
    carbs: asTarget(input.target_macros.target_carbs),
    calories: null,
  };

  const maintenanceValues = {
    protein: currentTotals.total_protein,
    fat: currentTotals.total_fat,
    carbs: currentTotals.total_carbs,
    calories: currentTotals.total_calories,
  };

  logInfo(requestId, "Targets debug", {
    raw_target_macros: (body as any)?.target_macros,
    parsed_target_macros: input.target_macros,
    optimizationTargets,
  });

  logInfo(requestId, "Optimization targets", optimizationTargets);
  logInfo(requestId, "Maintenance values", maintenanceValues);

  function withinTolerance(
    current: number,
    target: number | null,
    tolerance: number
  ): boolean {
    return target === null || Math.abs(current - target) <= tolerance;
  }

  const tolerances = { protein: 3, fat: 2, carbs: 8 };
  const alreadyOptimized =
    withinTolerance(
      currentTotals.total_protein,
      optimizationTargets.protein,
      tolerances.protein
    ) &&
    withinTolerance(
      currentTotals.total_fat,
      optimizationTargets.fat,
      tolerances.fat
    ) &&
    withinTolerance(
      currentTotals.total_carbs,
      optimizationTargets.carbs,
      tolerances.carbs
    );

  if (alreadyOptimized) {
    logInfo(
      requestId,
      "Early-exit: Already within tolerance - skipping AI call"
    );

    const response = {
      success: true,
      data: {
        optimized_ingredients: currentExpanded.map((exp: any) => ({
          id: exp.id,
          name: exp.name,
          unit: exp.unit,
          quantity: exp.quantity,
          calories: exp.calories,
          protein: exp.protein,
          fat: exp.fat,
          carbs: exp.carbs,
          fiber: exp.fiber,
          change_reason: "Już w tolerancji - brak zmian",
        })),
        macro_summary: currentTotals,
        comparison: {
          calorie_difference: 0,
          protein_difference: 0,
          fat_difference: 0,
          carbs_difference: 0,
          target_achievement: {
            protein_achievement: optimizationTargets.protein
              ? Math.round(
                  (currentTotals.total_protein / optimizationTargets.protein) *
                    10000
                ) / 100
              : null,
            fat_achievement: optimizationTargets.fat
              ? Math.round(
                  (currentTotals.total_fat / optimizationTargets.fat) * 10000
                ) / 100
              : null,
            carbs_achievement: optimizationTargets.carbs
              ? Math.round(
                  (currentTotals.total_carbs / optimizationTargets.carbs) *
                    10000
                ) / 100
              : null,
          },
        },
        ai_comment:
          "Makroskładniki już w tolerancji - nie wymagają optymalizacji.",
        optional_suggestions: [],
        achievability: {
          overall_score: 100,
          feasibility: "high",
          main_challenges: [],
        },
      },
      request_id: requestId,
    } as const;

    return json(response, corsHeaders);
  }

  logInfo(requestId, "Outside tolerance - proceeding with AI optimization");

  if (
    optimizationTargets.protein === null &&
    optimizationTargets.fat === null &&
    optimizationTargets.carbs === null
  ) {
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "VALIDATION_ERROR",
      error_code: "NO_TARGETS",
      error_message: "Nie podano żadnych celów makro",
      component: "ai-macro-optimization/validation",
      severity: "warning",
      context: {
        request_id: requestId,
        raw_target_macros: input.target_macros,
        optimization_targets: optimizationTargets,
      },
    });
    return errorJson(
      422,
      "NO_TARGETS",
      "Nie podano żadnych celów makro – AI nie ma czego optymalizować.",
      requestId,
      corsHeaders
    );
  }

  const prompt = buildPrompt(
    input,
    currentTotals,
    optimizationTargets,
    maintenanceValues,
    currentExpanded,
    byId
  );
  logInfo(requestId, "Prompt built", { length: prompt.length });
  logInfo(requestId, "Full prompt sent to AI", prompt);

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    logInfo(requestId, "OpenAI disabled - returning passthrough");
    const response = {
      success: true,
      data: {
        optimized_ingredients: currentExpanded,
        macro_summary: currentTotals,
        comparison: {
          calorie_difference: 0,
          protein_difference: 0,
          fat_difference: 0,
          carbs_difference: 0,
          target_achievement: {
            protein_achievement: null,
            fat_achievement: null,
            carbs_achievement: null,
          },
        },
        ai_comment:
          "Tryb awaryjny: AI wyłączone (brak klucza OPENAI_API_KEY). Składniki bez zmian.",
        optional_suggestions: [],
        achievability: {
          overall_score: 0,
          feasibility: "n/a",
          main_challenges: ["OPENAI_API_KEY missing"],
        },
        ai_disabled: true,
      },
      request_id: requestId,
    } as const;
    return json(response, corsHeaders);
  }

  let ai;
  const expectedIds = input.current_ingredients.map(
    (i: z.infer<typeof IngredientIn>) => i.id
  );
  try {
    const expectedCount = input.current_ingredients.length;

    ai = await callOpenAI(
      openaiKey,
      prompt,
      requestId,
      input.ai_model || "gpt-4o-mini",
      expectedCount,
      expectedIds,
      optimizationTargets
    );
  } catch (e) {
    logInfo(requestId, "AI call failed", { error: (e as Error).message });
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "AI_ERROR",
      error_code: "AI_ERROR",
      error_message: `OpenAI API błąd: ${(e as Error).message}`,
      component: "ai-macro-optimization/openai",
      severity: "critical",
      context: {
        request_id: requestId,
        model: input.ai_model || "gpt-4o-mini",
        ingredients_count: input.current_ingredients.length,
        error_stack: (e as Error).stack,
        optimization_targets: optimizationTargets,
      },
    });
    return errorJson(502, "AI_ERROR", (e as Error).message, requestId, corsHeaders);
  }

  const aiItems: Array<{
    id: string;
    quantity_value: number;
    change_reason?: string;
  }> = Array.isArray(ai?.optimized_ingredients) ? ai.optimized_ingredients : [];

  logInfo(requestId, "AI normalized items", {
    expected: expectedIds,
    aiIds: aiItems.map((x) => x?.id),
    sample: aiItems[0],
  });

  if (aiItems.length !== expectedIds.length) {
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "AI_ERROR",
      error_code: "AI_BAD_LENGTH",
      error_message: `AI zwróciła złą liczbę składników: ${aiItems.length} zamiast ${expectedIds.length}`,
      component: "ai-macro-optimization/ai-validation",
      severity: "error",
      context: {
        request_id: requestId,
        model: input.ai_model,
        expected_count: expectedIds.length,
        received_count: aiItems.length,
        ai_response: ai,
      },
    });
    return errorJson(
      502,
      "AI_BAD_LENGTH",
      `AI zwróciła ${aiItems.length} pozycji zamiast ${expectedIds.length}`,
      requestId,
      corsHeaders
    );
  }

  for (let i = 0; i < expectedIds.length; i++) {
    const aiId = aiItems[i]?.id;
    if (aiId !== expectedIds[i]) {
      logErrorToDb(supabase, {
        user_id: userData.user.id,
        error_type: "AI_ERROR",
        error_code: "AI_BAD_IDS",
        error_message: `AI zwróciła błędne ID w pozycji ${i}`,
        component: "ai-macro-optimization/ai-validation",
        severity: "error",
        context: {
          request_id: requestId,
          model: input.ai_model,
          position: i,
          expected_id: expectedIds[i],
          received_id: aiId,
          ai_response: ai,
        },
      });
      return errorJson(
        502,
        "AI_BAD_IDS",
        `AI zwróciła błędne ID w pozycji ${i}: "${aiId}", oczekiwano "${expectedIds[i]}"`,
        requestId,
        corsHeaders
      );
    }
    if (
      typeof aiItems[i].quantity_value !== "number" ||
      !Number.isFinite(aiItems[i].quantity_value)
    ) {
      logErrorToDb(supabase, {
        user_id: userData.user.id,
        error_type: "AI_ERROR",
        error_code: "AI_BAD_PAYLOAD",
        error_message: `AI zwróciła nieprawidłowe quantity_value w pozycji ${i}`,
        component: "ai-macro-optimization/ai-validation",
        severity: "error",
        context: {
          request_id: requestId,
          model: input.ai_model,
          position: i,
          received_quantity: aiItems[i].quantity_value,
          ai_response: ai,
        },
      });
      return errorJson(
        502,
        "AI_BAD_PAYLOAD",
        `AI: nieprawidłowe quantity_value w pozycji ${i}`,
        requestId,
        corsHeaders
      );
    }
  }

  logInfo(requestId, "Processing AI response", {
    expected_ingredients: expectedIds.length,
    ai_ingredients: aiItems.length,
    validation_passed: true,
  });

  const aiGramsArray = aiItems.map((item) => {
    const aiGrams = parseQty(item.quantity_value);
    return aiGrams;
  });

  const totalGrams = aiGramsArray.reduce((sum, g) => sum + g, 0);
  const avgGrams = totalGrams / aiGramsArray.length;

  if (avgGrams < 5) {
    logInfo(
      requestId,
      "AI response rejected: unreasonably small quantities",
      {
        total_grams: totalGrams,
        avg_grams: avgGrams,
        sample_raw_quantities: aiItems.slice(0, 3).map((x) => x.quantity_value),
        sample_actual_grams: aiGramsArray.slice(0, 3),
      }
    );
    logErrorToDb(supabase, {
      user_id: userData.user.id,
      error_type: "AI_ERROR",
      error_code: "AI_UNREASONABLE_RESPONSE",
      error_message: `AI zwróciła nieprawdopodobnie małe ilości (średnia: ${Math.round(avgGrams)}g)`,
      component: "ai-macro-optimization/ai-quality",
      severity: "error",
      context: {
        request_id: requestId,
        model: input.ai_model,
        total_grams: totalGrams,
        avg_grams: avgGrams,
        sample_raw_quantities: aiItems.slice(0, 3).map((x) => x.quantity_value),
        sample_actual_grams: aiGramsArray.slice(0, 3),
        ai_response: ai,
      },
    });
    return errorJson(
      502,
      "AI_UNREASONABLE_RESPONSE",
      `AI zwróciła nieprawdopodobnie małe ilości (średnia: ${Math.round(
        avgGrams
      )}g). Spróbuj ponownie z innym modelem.`,
      requestId,
      corsHeaders
    );
  }

  for (let i = 0; i < aiItems.length; i++) {
    const id = expectedIds[i];
    const minG = MIN_BY_ID.get(id) ?? 0.1;
    const q = Number(aiItems[i].quantity_value);
    if (!Number.isFinite(q) || q < minG) {
      const prev = aiItems[i].quantity_value;
      aiItems[i].quantity_value = minG;
      aiItems[i].change_reason = (
        ((aiItems[i].change_reason || "AI optimization") +
        " (naprawiono błędną wartość)")
      ).slice(0, 70);
      logInfo(requestId, "Auto-bumped invalid value to safety minimum", {
        id,
        prev,
        minG,
      });
    }
  }
  logInfo(requestId, "Safety guard applied; continuing");

  function smartRound(
    quantity: number,
    unit: string,
    ingredientName?: string
  ): number {
    const u = (unit || "").toLowerCase();

    if (u.includes("szt") || u.includes("sztuk")) {
      const name = (ingredientName || "").toLowerCase();
      const classify: IngredientClassification = ingredientName
        ? classifyName(ingredientName)
        : {
            isSpice: false,
            isOil: false,
            isMeat: false,
            isDairy: false,
            isCarb: false,
            isFruitVeg: false,
            isCondiment: false,
          };

      if (name.includes("jaj") || name.includes("ziemniak")) {
        if (quantity <= 0) return 1;
        return Math.max(1, Math.round(quantity));
      }

      if (classify.isFruitVeg) {
        if (quantity <= 0) return 0.5;
        return Math.max(0.5, Math.round(quantity * 2) / 2);
      }

      if (quantity <= 0) return 1;
      return Math.max(1, Math.round(quantity));
    }

    if (u.includes("łyż")) {
      if (quantity <= 0) return 1;
      return Math.max(1, Math.ceil(quantity));
    }

    if (u.includes("g") || u.includes("ml")) {
      const isSpice = ingredientName
        ? classifyName(ingredientName).isSpice
        : false;

      if (isSpice) {
        if (quantity < 1) {
          return Math.max(0.25, Math.round(quantity * 4) / 4);
        }
        return Math.round(quantity * 2) / 2;
      }

      if (quantity >= 100) return Math.round(quantity / 10) * 10;
      if (quantity >= 20) return Math.round(quantity / 5) * 5;
      return Math.round(quantity * 10) / 10;
    }

    return Math.round(quantity * 10) / 10;
  }

  const optimized = expectedIds.map((id, idx) => {
    const fromAi =
      aiItems[idx] && aiItems[idx].id === id
        ? aiItems[idx]
        : aiItems.find((x) => x.id === id);

    const ref = byId.get(id)!;
    const orig = input.current_ingredients[idx];
    const expanded = currentExpanded[idx];

    const unitWeight = expanded.unit_weight ?? ref.unit_weight ?? 100;

    const aiGrams = parseQty(fromAi?.quantity_value ?? expanded.grams);
    const validatedGrams = Number.isFinite(aiGrams)
      ? Math.max(0.01, Math.min(10000, aiGrams))
      : expanded.grams;

    let finalQuantity = validatedGrams;
    let finalUnit = expanded.original_unit || "g";

    if (
      expanded.original_unit &&
      expanded.original_unit !== "g" &&
      expanded.original_unit !== "gramy"
    ) {
      if (!unitWeight || unitWeight === 0) {
        logInfo(
          requestId,
          `Missing unit_weight for ${ref.name} - returning in grams`,
          {
            original_unit: expanded.original_unit,
            grams: validatedGrams,
          }
        );
        finalQuantity = validatedGrams;
        finalUnit = "g";
      } else {
        if (
          expanded.original_unit === "sztuka" ||
          expanded.original_unit.includes("szt")
        ) {
          finalQuantity = smartRound(
            validatedGrams / unitWeight,
            expanded.original_unit,
            ref.name
          );
          finalUnit = expanded.original_unit;
        } else if (
          expanded.original_unit === "mililitry" ||
          expanded.original_unit === "ml"
        ) {
          finalQuantity = smartRound(
            (validatedGrams * 100) / unitWeight,
            expanded.original_unit,
            ref.name
          );
          finalUnit = expanded.original_unit;
        } else if (expanded.original_unit.includes("łyż")) {
          finalQuantity = smartRound(
            validatedGrams / unitWeight,
            expanded.original_unit,
            ref.name
          );
          finalUnit = expanded.original_unit;
        } else {
          finalQuantity = smartRound(
            validatedGrams / unitWeight,
            expanded.original_unit,
            ref.name
          );
          finalUnit = expanded.original_unit;
        }
      }
    } else {
      finalQuantity = smartRound(validatedGrams, finalUnit, ref.name);
    }

    let finalGramsForMacros = validatedGrams;

    if (finalUnit === "sztuka" || finalUnit.includes("szt")) {
      finalGramsForMacros = finalQuantity * unitWeight;
    } else if (finalUnit === "mililitry" || finalUnit === "ml") {
      finalGramsForMacros = (finalQuantity / 100) * unitWeight;
    } else if (finalUnit.includes("łyż")) {
      finalGramsForMacros = finalQuantity * unitWeight;
    } else if (finalUnit === "g" || finalUnit === "gramy") {
      finalGramsForMacros = finalQuantity;
    }

    const originalGrams = expanded.grams;
    const scaleFactor = safe(finalGramsForMacros) / safe(originalGrams);

    const hasExpandedMacros =
      expanded.calories !== undefined && expanded.protein !== undefined;

    const protein = hasExpandedMacros
      ? Math.round(safe(expanded.protein) * scaleFactor * 100) / 100
      : Math.round(safe(ref.protein ?? 0) * (finalGramsForMacros / 100) * 100) /
        100;

    const fat = hasExpandedMacros
      ? Math.round(safe(expanded.fat) * scaleFactor * 100) / 100
      : Math.round(safe(ref.fat ?? 0) * (finalGramsForMacros / 100) * 100) /
        100;

    const carbs = hasExpandedMacros
      ? Math.round(safe(expanded.carbs) * scaleFactor * 100) / 100
      : Math.round(safe(ref.carbs ?? 0) * (finalGramsForMacros / 100) * 100) /
        100;

    const fiber = hasExpandedMacros
      ? Math.round(safe(expanded.fiber) * scaleFactor * 100) / 100
      : Math.round(safe(ref.fiber ?? 0) * (finalGramsForMacros / 100) * 100) /
        100;

    const calories = hasExpandedMacros ? Math.round(safe(expanded.calories) * scaleFactor * 100) / 100 : Math.round(safe(ref.calories ?? 0) * (finalGramsForMacros / 100) * 100) / 100;

    const result = {
      id,
      name: expanded.name || ref.name,
      unit: finalUnit,
      quantity: Math.round(finalQuantity * 100) / 100,
      calories,
      protein,
      fat,
      carbs,
      fiber,
      change_reason:
        fromAi?.change_reason || (fromAi ? "AI optimization" : "unchanged"),
    };

    const gramsChange = Math.abs(validatedGrams - expanded.grams);
    if (gramsChange > 0.5) {
      logInfo(requestId, `AI ingredient change: ${ref.name}`, {
        original_grams: expanded.grams,
        ai_suggested_grams: aiGrams,
        final_grams: validatedGrams,
        converted_to: `${finalQuantity} ${finalUnit}`,
        macros_source: hasExpandedMacros
          ? "expanded (frontend)"
          : "ref (database)",
        expanded_macros: {
          calories: expanded.calories,
          protein: expanded.protein,
        },
        ref_macros: { calories: ref.calories, protein: ref.protein },
        final_macros: { calories: result.calories, protein: result.protein },
        change_reason: fromAi?.change_reason,
      });
    }

    return result;
  });

  optimized.forEach((item: any, idx: number) => {
    if (item.calories === 0 && item.protein === 0) {
      logInfo(
        requestId,
        `Brak makr dla ${item.name} - sprawdź dane w bazie`,
        {
          id: item.id,
          expanded_had_macros: currentExpanded[idx].calories > 0,
          ref_has_macros: (byId.get(item.id)?.calories ?? 0) > 0,
          ref_protein: byId.get(item.id)?.protein ?? 0,
          final_grams: item.quantity,
        }
      );
    }
  });

  const macro_summary = sumMacros(optimized);
  const current = currentTotals;

  logInfo(requestId, "Optimization completed", {
    original_macros: current,
    optimized_macros: macro_summary,
  });

  const enhancedSuggestions = [...(ai.optional_suggestions || [])];

  const proteinDeficit =
    optimizationTargets.protein != null
      ? optimizationTargets.protein - macro_summary.total_protein
      : 0;

  if (proteinDeficit > 10 && enhancedSuggestions.length < 3) {
    enhancedSuggestions.push({
      type: "add",
      name: "Chude mięso (kurczak/indyk)",
      example_quantity: `${Math.ceil(proteinDeficit * 4.5)}g`,
      reason: `Dodanie chudego mięsa zwiększy białko o ~${Math.round(
        proteinDeficit
      )}g do celu`,
    });
  }

  if (macro_summary.total_fiber < 5 && enhancedSuggestions.length < 4) {
    enhancedSuggestions.push({
      type: "add",
      name: "Warzywa liściaste lub brokuły",
      example_quantity: "100g",
      reason: "Zwiększenie błonnika poprawi trawienie i sytość",
    });
  }

  let normalizedScore = ai?.achievability_score || 75;
  if (
    Number.isFinite(normalizedScore) &&
    normalizedScore > 0 &&
    normalizedScore <= 20
  ) {
    const originalScore = normalizedScore;
    normalizedScore = normalizedScore * 5;
    logInfo(requestId, "Normalized GPT-5 achievability_score", {
      original: originalScore,
      normalized: normalizedScore,
      model: input.ai_model,
    });
  }

  const response = {
    success: true,
    data: {
      optimized_ingredients: optimized,
      macro_summary: {
        ...macro_summary,
        protein_percentage: macro_summary.total_calories
          ? Math.round(
              ((macro_summary.total_protein * 4) /
                macro_summary.total_calories) *
                100 *
                100
            ) / 100
          : 0,
        fat_percentage: macro_summary.total_calories
          ? Math.round(
              ((macro_summary.total_fat * 9) / macro_summary.total_calories) *
                100 *
                100
            ) / 100
          : 0,
        carbs_percentage: macro_summary.total_calories
          ? Math.round(
              ((macro_summary.total_carbs * 4) / macro_summary.total_calories) *
                100 *
                100
            ) / 100
          : 0,
      },
      comparison: {
        calorie_difference:
          Math.round(
            (macro_summary.total_calories - current.total_calories) * 100
          ) / 100,
        protein_difference:
          Math.round(
            (macro_summary.total_protein - current.total_protein) * 100
          ) / 100,
        fat_difference:
          Math.round((macro_summary.total_fat - current.total_fat) * 100) / 100,
        carbs_difference:
          Math.round((macro_summary.total_carbs - current.total_carbs) * 100) /
          100,
        target_achievement: {
          protein_achievement:
            optimizationTargets.protein !== null &&
            Number.isFinite(optimizationTargets.protein) &&
            optimizationTargets.protein > 0
              ? Math.round(
                  (macro_summary.total_protein / optimizationTargets.protein) *
                    10000
                ) / 100
              : null,
          fat_achievement:
            optimizationTargets.fat !== null &&
            Number.isFinite(optimizationTargets.fat) &&
            optimizationTargets.fat > 0
              ? Math.round(
                  (macro_summary.total_fat / optimizationTargets.fat) * 10000
                ) / 100
              : null,
          carbs_achievement:
            optimizationTargets.carbs !== null &&
            Number.isFinite(optimizationTargets.carbs) &&
            optimizationTargets.carbs > 0
              ? Math.round(
                  (macro_summary.total_carbs / optimizationTargets.carbs) *
                    10000
                ) / 100
              : null,
        },
      },
      ai_comment:
        typeof ai?.ai_comment === "string"
          ? String(ai.ai_comment).replace(/\d+/g, "").slice(0, 300)
          : "",
      optional_suggestions: enhancedSuggestions.slice(0, 5),
      achievability: {
        overall_score: Math.max(0, Math.min(100, Math.round(normalizedScore))),
        feasibility:
          normalizedScore > 80
            ? "high"
            : normalizedScore > 60
            ? "medium"
            : "low",
        main_challenges: [],
      },
    },
    request_id: requestId,
  } as const;

  logInfo(requestId, "Request completed successfully");

  return json(response, corsHeaders);
});
