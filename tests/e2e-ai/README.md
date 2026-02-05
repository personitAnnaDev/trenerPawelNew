# 🧪 E2E AI Optimization Tests (GPT-5)

Comprehensive end-to-end tests for AI macro optimization using real OpenAI GPT-5 API and Supabase database.

## 📖 Overview

These tests validate the **complete integration chain**:
1. Frontend `AIOptimizationService` → Supabase Edge Function
2. Edge Function → OpenAI GPT-5 API
3. AI Response → Database validation
4. Macro achievement within ±5% tolerance

**⚠️ Important**: These tests use **real OpenAI API** and incur costs (~$0.022 per test for GPT-5).

## 🚀 Quick Start

### 1. Setup Environment

Create a `.env.e2e-ai` file in the project root with the following variables:

Required variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anon key
- `VITE_TEST_USER_EMAIL` - Test user email (must exist in Auth)
- `VITE_TEST_USER_PASSWORD` - Test user password

### 2. Run Tests

```bash
# Run all E2E AI tests
pnpm test:e2e:ai

# Run specific scenario
pnpm test:e2e:ai:breakfast  # Breakfast optimization (5 tests)
pnpm test:e2e:ai:lunch      # Lunch optimization (5 tests)
pnpm test:e2e:ai:dinner     # Dinner optimization (3 tests)
pnpm test:e2e:ai:edge       # Edge cases (4 tests)

# Watch mode (for development)
pnpm test:e2e:ai:watch
```

### 3. View Reports

Reports are generated automatically after each test run:

```bash
# Latest report
cat tests/e2e-ai/reports/gpt5-optimization-latest.md

# Timestamped reports
ls tests/e2e-ai/reports/
```

## 📊 Test Scenarios

### 🍳 Breakfast Optimization (5 tests)
- **Owsianka proteinowa**: 35g P, 15g F, 60g C
- **Jajecznica z awokado**: 30g P, 25g F, 40g C
- **Smoothie proteinowe**: 25g P, 10g F, 50g C
- **Naleśniki białkowe**: 20g P, 15g F, 45g C
- **Granola bowl**: 15g P, 20g F, 55g C

### 🍽️ Lunch Optimization (5 tests)
- **Kurczak z ryżem**: 50g P, 15g F, 70g C
- **Łosoś z kaszą**: 45g P, 25g F, 60g C
- **Indyk z batatem**: 55g P, 12g F, 65g C
- **Dorsz z ziemniakami**: 40g P, 8g F, 75g C
- **Wołowina z makaronem**: 48g P, 18g F, 68g C

### 🥗 Dinner Optimization (3 tests)
- **Sałatka z tuńczykiem**: 35g P, 20g F, 25g C
- **Cottage cheese bowl**: 30g P, 15g F, 30g C
- **Wrap proteinowy**: 40g P, 18g F, 45g C

### ⚡ Edge Cases (4 tests)
- **Wysokie białko**: 100g P (extreme protein target)
- **Niskie kalorie**: 300 kcal meal
- **Ketogeniczna**: 80g F, 10g C (keto diet)
- **Ekstremalne węgle**: 150g C (pre-workout)

## ✅ Validation Criteria

### Macro Tolerance: ±5%
Tests **PASS** if all macros are within ±5% of target:
- ✅ **Green**: -5% to +5% (matches UI green threshold)
- ❌ **Red**: Outside ±5% range

### Example:
- **Target**: 35g protein
- **Acceptable range**: 33.25g - 36.75g (±5%)
- **Actual**: 34.2g → ✅ **PASS** (97.7% of target)

### Additional Checks:
- ✅ All ingredients preserved (no deletions)
- ✅ AI provides comment
- ✅ Achievability score > 50
- ✅ Response time logged

## 💰 Cost Estimation

| Model | Cost per Test | Full Suite (17 tests) |
|-------|---------------|----------------------|
| **GPT-5** | ~$0.022 | ~$0.374 |
| GPT-5-mini | ~$0.006 | ~$0.102 |
| GPT-5-nano | ~$0.003 | ~$0.051 |

**Recommendation**: Run E2E AI tests **before deployment**, not in CI/CD.

## 📋 Report Format

Generated Markdown reports include:

```markdown
# 🧪 GPT-5 AI Optimization Test Report

**Summary**:
- Success Rate: 88.2%
- Avg Response Time: 16.2s
- Avg Macro Achievement: 94.7%

## 🍳 Breakfast Optimization (5/5 passed)

### ✅ Test: Owsianka proteinowa
- Protein: 34.2g (-2.3%) ✅
- Fat: 15.8g (+5.3%) ✅
- Carbs: 58.9g (-1.8%) ✅
- Response time: 14.3s
- AI Comment: "Zwiększono białko izolat..."

[... details for each test ...]
```

## 🔧 Troubleshooting

### Error: "Missing Supabase credentials"
→ Create `.env.e2e-ai` file with valid credentials

### Error: "Failed to authenticate test user"
→ Ensure test user exists in Supabase Auth with correct password

### Error: "No ingredients found for names"
→ Verify ingredients exist in `ingredients` table with exact names

### Test timeout (>5 min)
→ Normal for GPT-5. Increase timeout in `vitest.e2e-ai.config.ts` if needed

### Rate limit errors
→ Tests run sequentially to avoid rate limits. Wait a few minutes and retry.

## 📁 File Structure

```
tests/e2e-ai/
├── config/
│   ├── e2e-ai.config.ts       # Vitest configuration
│   └── setup.ts               # Environment setup
├── helpers/
│   ├── supabase-client.ts     # Real Supabase client
│   ├── ai-assertions.ts       # ±5% validation logic
│   └── report-generator.ts    # Markdown reports
├── scenarios/
│   ├── breakfast-optimization.e2e.test.ts
│   ├── lunch-optimization.e2e.test.ts
│   ├── dinner-optimization.e2e.test.ts
│   └── edge-cases.e2e.test.ts
├── reports/
│   └── gpt5-optimization-*.md  # Generated reports
└── README.md                   # This file
```

## 🎯 Success Metrics

### Expected Results:
- ✅ **>80% pass rate** for realistic scenarios (breakfast, lunch, dinner)
- ⚠️ **50-80% pass rate** for edge cases (expected to be challenging)
- ⏱️ **15-25s avg response time** for GPT-5
- 🎯 **>90% avg macro achievement** across all tests

### When to Re-run:
- ✅ Before major deployments
- ✅ After OpenAI model updates
- ✅ After edge function changes
- ✅ When investigating AI quality issues

### When NOT to Run:
- ❌ In CI/CD pipeline (costs!)
- ❌ During active development (use mocked unit tests)
- ❌ Multiple times per day (unnecessary expense)

## 🔍 Debugging

### Enable verbose logging:
```bash
DEBUG=* pnpm test:e2e:ai
```

### Check individual test:
```typescript
// In test file, add console.log
console.log('AI Response:', JSON.stringify(response, null, 2))
```

### Verify Edge Function:
```bash
# Test Edge Function directly
curl -X POST https://your-project.supabase.co/functions/v1/ai-macro-optimization \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"...","meal_name":"Test","target_macros":{...},...}'
```

## 🤝 Contributing

When adding new test scenarios:

1. Add test case to appropriate scenario file
2. Use realistic macro targets (avoid extremes)
3. Fetch real ingredients from Supabase
4. Include descriptive test names
5. Update this README if adding new categories

## 📞 Support

For issues or questions:
- Check [Troubleshooting](#-troubleshooting) section
- Review test reports in `reports/` directory
- Check Edge Function logs: `npx supabase functions logs ai-macro-optimization`

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Maintainer**: TrenerPaweł Dev Team
