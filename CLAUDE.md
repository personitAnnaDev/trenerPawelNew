# CLAUDE.md

## Memory Bank Instructions
**Every prompt you must reference memory-bank/handbook.md and read all the files from memory-bank in accordance with instructions.**

## Core Principles

- Always start with a plan before implementation (only proceed when fully certain)
- TDD is mandatory: all logic must be covered by unit and integration tests before finalizing a feature
- Keep code maintainable and simple: follow KISS, SOLID, DRY, and avoid over-engineering
- Commit frequently with clear, descriptive commit messages
- Roll back changes if errors repeat or loops form
- Keep CLAUDE.md concise. All non-essential context must live in memory-bank
- Prioritize reuse of components; verify architectural choices before introducing new ones
- After every major feature/module, check file sizes and refactor if necessary
- Begin with small prototypes before scaling into full modules
- If chaos emerges, pause, refactor, and re-plan
- AI must self-check and critically evaluate its own suggestions
- AI must challenge user assumptions, prioritize maintainability and simplicity
- Always keep memory-bank current. It is the source of truth
- Follow TDD, SOLID, KISS, YAGNI at all times

## TDD Policy

**Red-Green-Refactor Cycle:**
1. RED - Write failing tests first
2. GREEN - Write minimal code to make tests pass
3. REFACTOR - Clean up code while keeping tests green

## Development

```bash
npm run dev           # Start dev server (port 8080)
npm run build         # Production build
npm run test          # Run all tests
npm run test:watch    # Tests in watch mode
npm run test:coverage # Tests with coverage
npm run test:e2e      # Playwright E2E tests
npm run lint          # ESLint
```

## Error Checking Sequence (before build)
1. `npx tsc --noEmit` - TypeScript checking
2. `npx eslint src` - ESLint
3. `npm run build` - final verification

## Tech Stack
- React 18 + TypeScript + Vite 5
- Supabase (PostgreSQL + Auth + Realtime + Storage + Edge Functions)
- shadcn/ui + Tailwind CSS 3.x + Lucide React
- TanStack Query + React Hook Form + Zod
- Vitest + Playwright

## Key Conventions
- Polish UI language, Polish variable naming in user-facing content
- Components: PascalCase, hooks: camelCase with `use` prefix
- Pages in src/pages/, components in src/components/
- RPC functions for complex database operations
- Controlled components (value, not defaultValue)
- Debounced auto-save (1.5s) for client profiles
