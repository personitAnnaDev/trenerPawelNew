# TrenerPawel - Project Setup

A comprehensive diet and nutrition management system for fitness trainers.

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0 (recommended) or npm >= 9.0.0
- Supabase account

## Installation

1. **Clone or extract this repository**

2. **Copy environment configuration:**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables in `.env`:**
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

   Get these from your Supabase dashboard: **Settings > API**

4. **Install dependencies:**
   ```bash
   pnpm install
   # or
   npm install
   ```

5. **Start development server:**
   ```bash
   pnpm dev
   # or
   npm run dev
   ```

6. **Open browser at:** http://localhost:8080

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm preview` | Preview production build |
| `pnpm lint` | Run ESLint |
| `pnpm test` | Run all tests |
| `pnpm test:unit` | Run unit tests only |
| `pnpm test:integration` | Run integration tests only |
| `pnpm test:e2e` | Run Playwright E2E tests |

## Project Structure

```
src/
├── components/     # Reusable UI components (shadcn/ui)
├── pages/          # Route page components
├── hooks/          # Custom React hooks
├── contexts/       # React context providers
├── utils/          # Utility functions and Supabase client
├── services/       # API services
└── types/          # TypeScript type definitions

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── e2e/            # End-to-end tests (Playwright)
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key | Yes |

### Edge Functions (AI Features)

For AI macro optimization features, configure in Supabase dashboard:
- **Settings > Edge Functions > Secrets**
- Add `OPENAI_API_KEY` with your OpenAI API key

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Styling:** Tailwind CSS, shadcn/ui components
- **State:** React Context, TanStack Query
- **Forms:** React Hook Form, Zod validation
- **Testing:** Vitest, Playwright

## Production Deployment

1. Build the project:
   ```bash
   pnpm build
   ```

2. Deploy `dist/` folder to your hosting provider (Netlify, Vercel, etc.)

3. Configure environment variables in your hosting platform

## Support

For questions or issues, contact the development team.
