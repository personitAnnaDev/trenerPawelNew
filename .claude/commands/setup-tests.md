# Setup Tests Command

Set up testing infrastructure for a freshly generated React/Vite + Supabase app:
- **Vitest** for React components (100% coverage target)
- **Deno** for Supabase Edge Functions

**Supports argument:** `--help`, `-h`, `help`

**Note:** This command is designed for fresh React/Vite apps immediately after scaffolding. Not for complex existing apps.

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📚 /setup-tests - Test Infrastructure Command                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Configures comprehensive testing infrastructure for your project:  │
│  • Vitest for React component testing                               │
│  • Testing Library for DOM queries                                  │
│  • Coverage reporting with 100% target                              │
│  • Deno testing for Supabase Edge Functions (if applicable)         │
│                                                                     │
│  USAGE:                                                             │
│  /setup-tests          Set up test infrastructure                   │
│  /setup-tests --help   Show this help message                       │
│                                                                     │
│  SDLC PHASE: 🧪 Development - Testing Setup                         │
│  ─────────────────────────────────────────────────────────────────  │
│  Establishes the testing foundation. Should be run early in         │
│  development to enable TDD (Test-Driven Development).               │
│                                                                     │
│  WORKFLOW POSITION:                                                 │
│  ┌─────────────────┐                                                │
│  │ /setup-project  │  Planning & requirements                       │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /first-prompt   │  Initial implementation                        │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /setup-tests    │ ◄── YOU ARE HERE                               │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /manual-test    │  QA verification                               │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /commit         │  Code review & commit                          │
│  └─────────────────┘                                                │
│                                                                     │
│  PREREQUISITES:                                                     │
│  • React/Vite project must exist (package.json with vite, react)    │
│  • src/App.tsx or src/App.jsx must exist                            │
│                                                                     │
│  CREATES:                                                           │
│  • vitest.config.ts       - Vitest configuration                    │
│  • src/test/setup.ts      - Test setup file                         │
│  • src/App.test.tsx       - Initial test file                       │
│  • package.json scripts   - test, test:watch, test:coverage         │
│                                                                     │
│  NEXT STEP: Run /manual-test to verify functionality                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 1: Validate Environment

### 1.1 Check for React/Vite App

Verify these files exist:
```bash
# Check package.json has vite and react
cat package.json | grep -E '"(vite|react)"'

# Check entry files exist
ls src/main.tsx src/main.jsx src/App.tsx src/App.jsx 2>/dev/null
```

**If package.json missing or no vite/react:**
```
❌ No React/Vite App Found

This command requires a React/Vite project. Expected:
- package.json with 'vite' and 'react' dependencies
- src/main.tsx (or .jsx)
- src/App.tsx (or .jsx)

Run 'npm create vite@latest . -- --template react-ts' first.
```
STOP execution.

### 1.2 Check for Existing Test Setup

```bash
ls vitest.config.ts vitest.config.js jest.config.ts jest.config.js 2>/dev/null
```

**If test config exists:**
```
⚠️ Existing Test Configuration Found

Found: [vitest.config.ts / jest.config.js]

Options:
- **Overwrite** - Replace existing config (backup will be created)
- **Cancel** - Abort and keep existing setup
```

### 1.3 Check App Complexity

Count source files in src/ (excluding tests):
```bash
find src -name "*.tsx" -o -name "*.ts" | grep -v ".test." | grep -v ".spec." | wc -l
```

**If more than 5 source files:**
```
⚠️ This command is designed for fresh React/Vite apps.

Your project has [X] source files, which suggests it may be more complex.
100% coverage may require manual test writing.

Options:
- **Continue anyway** - Proceed with setup (tests generated for App.tsx only)
- **Cancel** - Abort and set up tests manually
```

---

## Step 2: Install Vitest Dependencies

```bash
npm install -D vitest @vitest/coverage-v8 @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

Display progress:
```
Installing testing dependencies...
✓ vitest
✓ @vitest/coverage-v8
✓ @vitest/ui
✓ jsdom
✓ @testing-library/react
✓ @testing-library/jest-dom
✓ @testing-library/user-event
```

---

## Step 3: Create vitest.config.ts

Create `vitest.config.ts` in project root:

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.d.ts',
        'src/test/**',
        'src/main.tsx',
        'src/main.jsx',
        'src/vite-env.d.ts',
      ],
      thresholds: {
        global: {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
    },
  },
})
```

---

## Step 4: Create Test Setup File

Create directory and setup file:

```bash
mkdir -p src/test
```

Create `src/test/setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

---

## Step 5: Update package.json Scripts

Add/update these scripts in package.json (merge with existing, preserve dev/build/lint/preview):

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:coverage:watch": "vitest --coverage"
  }
}
```

**Note:** Preserve any existing scripts (dev, build, lint, preview) and only add/update test-related scripts.

---

## Step 6: Update tsconfig.json

Add to `compilerOptions.types` array in tsconfig.json:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

If `types` array doesn't exist, create it.

---

## Step 7: Analyze Source Files

Scan `src/` directory for files that need tests:

```bash
find src -name "*.tsx" -o -name "*.ts" | grep -v ".test." | grep -v ".spec." | grep -v ".d.ts" | grep -v "main.tsx" | grep -v "vite-env"
```

Expected for fresh app:
- `src/App.tsx` - Main component

List found files:
```
Found source files to test:
- src/App.tsx
[- src/components/Button.tsx (if any)]
```

---

## Step 8: Generate Tests for App.tsx

### 8.1 Read App.tsx Content

Read and analyze `src/App.tsx` to understand:
- What elements are rendered (headings, buttons, links, images)
- Any state or interactions (useState, onClick handlers)
- Conditional rendering (if/else, ternary)
- Any props or context usage

### 8.2 Generate Comprehensive Tests

Create `src/App.test.tsx`:

**For standard Vite template (with counter):**
```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the Vite + React heading', () => {
    render(<App />)
    expect(screen.getByText(/Vite \+ React/i)).toBeInTheDocument()
  })

  it('renders the Vite logo with correct link', () => {
    render(<App />)
    const viteLogo = screen.getByAltText('Vite logo')
    expect(viteLogo).toBeInTheDocument()
    expect(viteLogo.closest('a')).toHaveAttribute('href', 'https://vite.dev')
  })

  it('renders the React logo with correct link', () => {
    render(<App />)
    const reactLogo = screen.getByAltText('React logo')
    expect(reactLogo).toBeInTheDocument()
    expect(reactLogo.closest('a')).toHaveAttribute('href', 'https://react.dev')
  })

  it('renders the counter button with initial count of 0', () => {
    render(<App />)
    expect(screen.getByRole('button', { name: /count is 0/i })).toBeInTheDocument()
  })

  it('increments counter when button is clicked', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /count is 1/i })).toBeInTheDocument()
  })

  it('increments counter multiple times', () => {
    render(<App />)
    const button = screen.getByRole('button', { name: /count is 0/i })
    fireEvent.click(button)
    fireEvent.click(button)
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /count is 3/i })).toBeInTheDocument()
  })

  it('renders the edit instruction text', () => {
    render(<App />)
    expect(screen.getByText(/Edit/i)).toBeInTheDocument()
    expect(screen.getByText(/src\/App\.tsx/i)).toBeInTheDocument()
  })

  it('renders the documentation link text', () => {
    render(<App />)
    expect(screen.getByText(/Click on the Vite and React logos to learn more/i)).toBeInTheDocument()
  })
})
```

**Dynamic generation rules:**
- For each visible text → add `getByText` test
- For each link → verify `href` attribute
- For each button → test click interaction
- For each image → verify `alt` text
- For useState → test state changes
- For conditional rendering → test both branches

---

## Step 9: Run Tests & Verify Coverage

### 9.1 Run Initial Test

```bash
npm run test:coverage
```

### 9.2 Check Coverage Results

Parse the coverage output:
```
-----------------------|---------|----------|---------|---------|
File                   | % Stmts | % Branch | % Funcs | % Lines |
-----------------------|---------|----------|---------|---------|
All files              |   100   |   100    |   100   |   100   |
 src/App.tsx           |   100   |   100    |   100   |   100   |
-----------------------|---------|----------|---------|---------|
```

### 9.3 If Coverage < 100%

```
⚠️ Coverage at [X]% - Target is 100%

Uncovered code:
[Show specific uncovered lines from coverage report]

Options:
- **Generate more tests** - I'll analyze uncovered code and add tests
- **Accept current coverage** - Proceed with [X]%
- **Show uncovered code** - Display the uncovered sections
```

If "Generate more tests":
1. Read the coverage JSON report
2. Identify uncovered lines/branches
3. Generate additional tests targeting those specific lines
4. Re-run coverage
5. Repeat until 100% or user accepts

---

## Part B: Deno Tests for Supabase Edge Functions

---

## Step 10: Check for Edge Functions

```bash
ls -d supabase/functions 2>/dev/null
```

**If directory doesn't exist:**
```
ℹ️ No Supabase Edge Functions Found

Skipping Deno test setup.
When you create Edge Functions, run this command again or manually set up Deno tests.

To create an Edge Function:
  supabase functions new <function-name>
```
Skip to Step 16 (Summary).

**If directory exists:**
```
Found Supabase Edge Functions directory.
Setting up Deno tests...
```
Continue to Step 11.

---

## Step 11: Create Deno Configuration

Check if `supabase/functions/deno.json` exists. If not, create it:

```json
{
  "compilerOptions": {
    "strict": true,
    "lib": ["deno.window"]
  },
  "lint": {
    "include": ["**/*.ts"],
    "exclude": ["**/*_test.ts"]
  },
  "fmt": {
    "include": ["**/*.ts"]
  },
  "test": {
    "include": ["**/*_test.ts", "**/*.test.ts"]
  },
  "imports": {
    "@supabase/supabase-js": "https://esm.sh/@supabase/supabase-js@2",
    "std/": "https://deno.land/std@0.208.0/",
    "@std/assert": "jsr:@std/assert"
  }
}
```

---

## Step 12: Create Test Utilities

Create `supabase/functions/_shared/test-utils.ts`:

```typescript
import { assertEquals, assertExists, assertRejects } from "jsr:@std/assert";

/**
 * Create a mock Supabase client for testing Edge Functions
 */
export function createMockSupabaseClient(overrides?: {
  data?: unknown;
  error?: { message: string } | null;
}) {
  const defaultResponse = { data: overrides?.data ?? [], error: overrides?.error ?? null };

  return {
    from: (_table: string) => ({
      select: () => Promise.resolve(defaultResponse),
      insert: () => Promise.resolve(defaultResponse),
      update: () => Promise.resolve(defaultResponse),
      delete: () => Promise.resolve(defaultResponse),
      eq: () => ({ select: () => Promise.resolve(defaultResponse) }),
    }),
    auth: {
      getUser: () => Promise.resolve({
        data: { user: null },
        error: null
      }),
    },
    storage: {
      from: (_bucket: string) => ({
        upload: () => Promise.resolve({ data: null, error: null }),
        download: () => Promise.resolve({ data: null, error: null }),
      }),
    },
  };
}

/**
 * Create a mock Request for testing Edge Functions
 */
export function createMockRequest(
  method: string,
  body?: unknown,
  headers?: Record<string, string>
): Request {
  const init: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET" && method !== "HEAD") {
    init.body = JSON.stringify(body);
  }

  return new Request("http://localhost:54321/functions/v1/test", init);
}

/**
 * Create a mock Request with authorization header
 */
export function createAuthorizedRequest(
  method: string,
  body?: unknown,
  token = "test-jwt-token"
): Request {
  return createMockRequest(method, body, {
    "Authorization": `Bearer ${token}`,
  });
}

/**
 * Assert response status and optionally body
 */
export async function assertResponse(
  response: Response,
  expectedStatus: number,
  expectedBody?: unknown
): Promise<void> {
  assertEquals(response.status, expectedStatus);

  if (expectedBody !== undefined) {
    const body = await response.json();
    assertEquals(body, expectedBody);
  }
}

export { assertEquals, assertExists, assertRejects };
```

---

## Step 13: Scan and Generate Function Tests

### 13.1 List Edge Functions

```bash
ls -d supabase/functions/*/
```

For each function directory (excluding `_shared`), generate tests.

### 13.2 Generate Test File

For each function at `supabase/functions/<name>/index.ts`, create `supabase/functions/<name>/index_test.ts`:

```typescript
import { assertEquals } from "jsr:@std/assert";
import {
  createMockRequest,
  createAuthorizedRequest,
  assertResponse
} from "../_shared/test-utils.ts";

// Note: Import and test the actual handler based on function structure
// Adjust imports based on how the function exports its handler

Deno.test("<function-name>: returns 405 for unsupported methods", async () => {
  const req = createMockRequest("DELETE");
  // const response = await handler(req);
  // assertEquals(response.status, 405);
});

Deno.test("<function-name>: handles GET request", async () => {
  const req = createMockRequest("GET");
  // const response = await handler(req);
  // assertEquals(response.status, 200);
});

Deno.test("<function-name>: handles POST request with valid body", async () => {
  const req = createMockRequest("POST", {
    // Add expected request body based on function
  });
  // const response = await handler(req);
  // assertEquals(response.status, 200);
});

Deno.test("<function-name>: returns 400 for invalid request body", async () => {
  const req = createMockRequest("POST", {});
  // const response = await handler(req);
  // assertEquals(response.status, 400);
});

Deno.test("<function-name>: requires authorization", async () => {
  const req = createMockRequest("POST", { data: "test" });
  // No auth header
  // const response = await handler(req);
  // assertEquals(response.status, 401);
});

Deno.test("<function-name>: accepts valid authorization", async () => {
  const req = createAuthorizedRequest("POST", { data: "test" });
  // const response = await handler(req);
  // assertEquals(response.status, 200);
});
```

**Note to Claude:** When generating tests, read the actual function code to:
- Understand what HTTP methods are supported
- Know the expected request/response format
- Identify authentication requirements
- Find edge cases and error conditions

---

## Step 14: Add Deno Scripts to package.json

Add these scripts (append to existing test scripts):

```json
{
  "scripts": {
    "test:functions": "cd supabase/functions && deno test --allow-net --allow-read --allow-env",
    "test:functions:watch": "cd supabase/functions && deno test --allow-net --allow-read --allow-env --watch",
    "test:functions:coverage": "cd supabase/functions && deno test --allow-net --allow-read --allow-env --coverage=coverage",
    "test:all": "npm run test && npm run test:functions"
  }
}
```

---

## Step 15: Run Deno Tests

```bash
npm run test:functions
```

Display results:
```
running X tests from ./supabase/functions/<name>/index_test.ts
<function-name>: returns 405 for unsupported methods ... ok (Xms)
<function-name>: handles GET request ... ok (Xms)
...

ok | X passed | 0 failed
```

---

## Step 16: Summary

Display final summary:

```
✅ Test Setup Complete

┌─────────────────────────────────────────────────────────────────┐
│                     REACT (VITEST)                              │
├─────────────────────────────────────────────────────────────────┤
│ Packages installed:                                             │
│   vitest, @vitest/coverage-v8, @vitest/ui                       │
│   @testing-library/react, @testing-library/jest-dom             │
│                                                                 │
│ Files created:                                                  │
│   - vitest.config.ts                                            │
│   - src/test/setup.ts                                           │
│   - src/App.test.tsx                                            │
│                                                                 │
│ Coverage: 100% ✅                                                │
├─────────────────────────────────────────────────────────────────┤
│                 SUPABASE EDGE FUNCTIONS (DENO)                  │
├─────────────────────────────────────────────────────────────────┤
│ Files created:                                                  │
│   - supabase/functions/deno.json                                │
│   - supabase/functions/_shared/test-utils.ts                    │
│   - supabase/functions/<name>/index_test.ts                     │
│                                                                 │
│ Status: [Tests generated / Skipped - no functions]              │
├─────────────────────────────────────────────────────────────────┤
│                        COMMANDS                                 │
├─────────────────────────────────────────────────────────────────┤
│ React tests:                                                    │
│   npm test                    # Run tests once                  │
│   npm run test:watch          # Watch mode                      │
│   npm run test:ui             # Vitest UI                       │
│   npm run test:coverage       # With coverage report            │
│   npm run test:coverage:watch # Coverage in watch mode          │
│                                                                 │
│ Edge Function tests:                                            │
│   npm run test:functions         # Run Deno tests               │
│   npm run test:functions:watch   # Watch mode                   │
│   npm run test:functions:coverage # With coverage               │
│                                                                 │
│ All tests:                                                      │
│   npm run test:all      # Run React + Deno tests                │
└─────────────────────────────────────────────────────────────────┘

Next step: Run /commit to commit your changes with quality checks.
```

---

## Next Step

After test setup is complete, instruct the user:

```
✅ Testing infrastructure ready!

Next step: Run /commit to commit your changes.

This will:
- Run all quality checks (lint, types, tests, coverage)
- Perform self-review of changes
- Update memory-bank if needed
- Create a proper commit with all checks passed
```

---

## Error Handling

### npm install fails:
```
❌ Failed to install dependencies

Error: [npm error message]

Try:
1. Delete node_modules and package-lock.json
2. Run 'npm install' manually
3. Then re-run /setup-tests
```

### Deno not installed:
```
⚠️ Deno Not Found

Deno is required for testing Supabase Edge Functions.

Install Deno:
  curl -fsSL https://deno.land/install.sh | sh

Or skip Edge Function tests and set them up later.

Options:
- **Skip Deno setup** - Continue without Edge Function tests
- **Cancel** - Abort and install Deno first
```

### Tests fail to run:
```
❌ Tests Failed to Run

Error: [error message]

Common fixes:
- Check tsconfig.json includes vitest types
- Ensure src/test/setup.ts exists
- Verify App.tsx exports default component
```

### Coverage can't reach 100%:
```
⚠️ Unable to Reach 100% Coverage

Current coverage: [X]%

Uncovered code:
[List specific files and lines]

This may be due to:
- Conditional logic that's hard to trigger
- Error handling code
- Complex component interactions

Options:
- **Accept [X]%** - Lower threshold and continue
- **Show uncovered code** - I'll display what's not covered
- **Help me write tests** - I'll generate tests for uncovered code
```
