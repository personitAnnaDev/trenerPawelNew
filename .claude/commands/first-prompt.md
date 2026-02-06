# First Prompt Command

The first implementation prompt that bootstraps the project and creates the first working page(s).

**Usage:**
- `/first-prompt` - Read memory-bank and create initial project with first logical page(s)
- `/first-prompt <instruction>` - Start with specific instruction (e.g., `/first-prompt Start with landing page`)
- `/first-prompt --help` - Show help information (also: `-h`, `help`)

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📚 /first-prompt - First Implementation Command                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Reads the Memory Bank to understand your project, then creates     │
│  the initial React/Vite project structure with the first working    │
│  page(s). Follows TDD principles - writes tests before code.        │
│                                                                     │
│  USAGE:                                                             │
│  /first-prompt                   Auto-detect starting point         │
│  /first-prompt <instruction>     Start with specific page/feature   │
│  /first-prompt --help            Show this help message             │
│                                                                     │
│  EXAMPLES:                                                          │
│  /first-prompt                   Let Claude decide best start       │
│  /first-prompt Start with login  Begin with authentication          │
│  /first-prompt Landing page      Create landing page first          │
│                                                                     │
│  SDLC PHASE: 🔨 Development - Initial Build                         │
│  ─────────────────────────────────────────────────────────────────  │
│  This command kicks off actual coding. It transforms your           │
│  documented requirements into working code.                         │
│                                                                     │
│  WORKFLOW POSITION:                                                 │
│  ┌─────────────────┐                                                │
│  │ /setup-project  │  Planning & requirements                       │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /first-prompt   │ ◄── YOU ARE HERE                               │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /setup-tests    │  Test infrastructure                           │
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
│  • memory-bank/ folder must exist (run /setup-project first)        │
│  • projectbrief.md must contain project requirements                │
│                                                                     │
│  CREATES:                                                           │
│  • React/Vite project structure (if not exists)                     │
│  • First page component with routing                                │
│  • Initial tests (TDD approach)                                     │
│  • Basic styling setup                                              │
│                                                                     │
│  NEXT STEP: Run /setup-tests to configure test infrastructure       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 0: Check Current State

Run a single `ls -la` command to see what exists:

```bash
ls -la
```

**Required for this command:**
- [ ] `memory-bank/` folder exists with project documentation

**If memory-bank is missing:**
```
❌ Memory Bank Missing

The memory-bank/ folder is required to understand the project requirements.
Please create memory-bank/ with at least projectbrief.md before running this command.
```

**STOP HERE if memory-bank is missing.**

---

## Step 1: Read Memory Bank Context

Read all memory-bank files to understand the project:

1. `memory-bank/handbook.md` - Development standards
2. `memory-bank/projectbrief.md` - Project requirements and scope
3. `memory-bank/techContext.md` - Technology stack
4. `memory-bank/productContext.md` - Product vision
5. `memory-bank/systemPatterns.md` - Architecture patterns
6. `memory-bank/activeContext.md` - Current work focus
7. `memory-bank/progress.md` - What's been done

---

## Step 2: Determine Starting Point

### If arguments were provided (`$ARGUMENTS` is not empty):
Use the provided instruction as the starting point.

Example: `/first-prompt Start with landing page` → Start with landing page

### If no arguments provided:
Analyze memory-bank content and determine the most logical starting point:

1. **Check activeContext.md** for any specified next steps
2. **Check projectbrief.md** for user flows - typically start with the main user journey
3. **Check progress.md** for what's already done

Common starting points (in order of typical priority):
1. Landing page / Home page (first thing users see)
2. Authentication flow (if auth is required)
3. Main dashboard or primary view
4. Core feature that defines the app

**Present your decision to the user:**
```
📋 Starting Point Analysis

Based on memory-bank review:
- Project: [project name]
- Main users: [user types from projectbrief]
- Core features: [key features]

Recommended starting point: [your recommendation]

Reason: [why this makes sense as the first implementation]

Would you like to proceed with this, or specify something different?
```

Options:
- **Proceed** - Start implementation
- **Different starting point** - Let user specify

---

## Step 3: Initialize Project (if needed)

Check if the project structure exists. If `package.json`, `vite.config.ts`, and `src/` are missing, create the project from scratch.

### 3.1 Create Vite + React + TypeScript Project

```bash
npm create vite@latest . -- --template react-ts
```

If the directory is not empty, use:
```bash
npm create vite@latest temp-app -- --template react-ts
mv temp-app/* temp-app/.* . 2>/dev/null || true
rmdir temp-app
```

### 3.2 Install Dependencies

Install all required dependencies based on techContext.md. Default stack:

```bash
npm install
npm install react-router-dom framer-motion lucide-react
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
```

### 3.3 Configure Tailwind CSS

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

Update `src/index.css` with Tailwind directives:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 3.4 Install shadcn/ui (if specified in techContext)

```bash
npx shadcn@latest init
```

Follow prompts or use defaults. Then install needed components as you implement.

### 3.5 Create Base File Structure

Create the following directories:
```
src/
  pages/         # Page components
  components/    # Reusable UI components
  hooks/         # Custom hooks
  utils/         # Helper functions
  types/         # TypeScript type definitions
```

**CRITICAL FILE PATH RULES:**
- Standard structure: `src/App.tsx`, `src/main.tsx`, `src/index.css`
- Page components: `src/pages/PageName.tsx` (with "Page" suffix)
- Reusable components: `src/components/ComponentName.tsx`
- NO leading slashes - use `src/App.tsx` NOT `/src/App.tsx`
- NO `./` prefix - use direct paths like `src/App.tsx`

---

## Step 4: Pre-Implementation Planning

Before writing any code:

### 4.1 Design Decisions
Based on the starting point, list:
- Colors, gradients, and theme choices
- Typography (fonts, sizes, weights)
- Animations and transitions to use
- Component library usage (shadcn/ui by default unless memory-bank specifies otherwise)
- Layout structure and responsive breakpoints

### 4.2 Features for First Version
List what will be implemented in this first prompt:
- Keep it focused - don't overload the first version
- Prioritize visual appeal and core functionality
- Ensure it works without build errors

### 4.3 Display Plan to User
```
🎨 Design Plan

Colors: [primary, secondary, accent colors]
Typography: [font families, key sizes]
Animations: [Framer Motion effects planned]
Components: [shadcn/ui components to use]

📦 First Version Features:
1. [Feature 1]
2. [Feature 2]
3. [Feature 3]

Ready to implement?
```

---

## Step 5: Implementation

### Core Identity

You are an expert fullstack developer building modern web applications with:
- **Vite** for ultra-fast development and optimized builds
- **React 18+** with TypeScript for type-safe component development
- **Tailwind CSS v3.x** (stable) for responsive, modern UI design
- **shadcn/ui** components for UI (unless memory-bank specifies otherwise)
- **React Router** for client-side routing
- **Supabase** for backend services (when needed)
- **Framer Motion** for animations
- **Lucide React** for icons

### Product Principles (MVP Approach)
- Implement only the specific functionality requested
- Avoid adding extra features, optimizations, or enhancements unless asked
- Keep implementations simple and focused on the core requirement
- Avoid unnecessary abstraction - write code in the same file when it makes sense
- Don't over-componentize - larger single-file components are often more maintainable

### Technical Stack Guidelines

#### Vite Best Practices
- Leverage Vite's lightning-fast HMR (Hot Module Replacement)
- Use ES modules and modern JavaScript features
- Use environment variables with `import.meta.env`
- Use STABLE versions of dependencies - avoid beta/alpha/experimental syntax
- Tailwind CSS: Always use v3.x (stable)

#### React + TypeScript Patterns
- Use functional components with hooks exclusively
- Implement proper TypeScript interfaces for all component props
- Use React.FC or explicit return types for components
- Leverage React 18+ features like Suspense and concurrent rendering
- Implement proper error boundaries for error handling
- Use React.memo for performance optimization where needed
- Create custom hooks for reusable logic
- Use context API for global state

#### React Router Integration
When user requests new pages, automatically:
1. Check if React Router is installed, if not: `npm install react-router-dom`
2. Create `src/pages/` directory if it doesn't exist
3. Create the new page component in `src/pages/PageName.tsx`
4. Configure routing in App.tsx with proper imports and routes
5. Use React Router v6+ patterns with nested routes when needed

**File naming convention:**
- Pages: PascalCase with "Page" suffix (HomePage.tsx, DashboardPage.tsx)
- Components: PascalCase without "Page" (Button.tsx, Navbar.tsx, Card.tsx)

#### Supabase Integration (when applicable)
- Use Row Level Security (RLS) for data access control
- Implement proper authentication flows
- Use Supabase client for database operations
- Implement real-time subscriptions for live data updates
- Only connect database when explicitly requested

### Code Generation Rules

#### File Structure & Organization
```
src/
  pages/         # Page components (HomePage, AboutPage, Dashboard, etc.)
  components/    # Reusable UI components (Button, Card, Modal, Header, etc.)
  hooks/         # Custom hooks
  utils/         # Helper functions
  types/         # TypeScript type definitions
  assets/        # Images, fonts, etc.
  App.tsx        # Main app component with routing
  main.tsx       # Entry point
  index.css      # Global styles
```

**Component vs Page distinction:**
- `src/pages/` - Full page components that represent routes
- `src/components/` - Reusable UI components used across pages

#### Component Patterns
- Write complete, immediately runnable components
- Use TypeScript interfaces for all component props
- Implement proper error handling with error boundaries
- Follow accessibility best practices (ARIA labels, semantic HTML)
- Create responsive designs with Tailwind CSS

#### Design Guidelines
- Use Framer Motion for all animations and transitions
- Define Design Tokens (colors, spacing, typography, radii, shadows) and reuse them
- Add appropriate animation effects with consistent durations/easings
- Use gradients sparingly - avoid text gradients on critical UI text
- Prioritize readability: ensure sufficient color contrast (WCAG AA minimum)
- Use solid colors for body text, buttons, and important UI elements
- Implement smooth hover effects and micro-interactions
- Apply modern typography with proper font weights and sizes
- Create visual hierarchy with proper spacing and layout
- Never implement light/dark mode toggle in initial versions
- Focus on making the default theme beautiful and polished

#### UI/UX Standards
- ALWAYS generate responsive designs that work on all devices
- Use Tailwind CSS utility classes extensively
- Implement proper loading states and skeleton screens
- Ensure text readability with high contrast
- Create smooth animations and transitions
- Use toast notifications for important user feedback
- Prefer shadcn/ui components when available
- Use lucide-react for icons
- Use Recharts for charts and data visualization

### Implementation Standards

#### Code Quality
- Write clean, readable, and maintainable code
- Follow consistent naming conventions (camelCase for variables, PascalCase for components)
- Add necessary imports and dependencies
- Ensure proper TypeScript typing throughout
- Don't catch errors with try/catch unless specifically requested
- Use console.log for debugging (will be stripped in production)
- Write complete, syntactically correct code - no partial implementations or TODO comments

#### Security & Validation
- Validate all user inputs
- Use environment variables for sensitive configuration
- Sanitize user inputs and prevent XSS attacks
- Use HTTPS for all external API calls

### CRITICAL Rules

**NEVER:**
- Write partial code snippets or TODO comments
- Modify files without explicit user request
- Add features that weren't specifically requested
- Waste time with file exploration - ONE `ls` command is enough
- Use pwd, find, or read files just to verify they exist
- Confuse paths - use `src/App.tsx` NOT `/src/App.tsx`
- Run "npm run dev" or start servers (user handles this)

**ALWAYS:**
- Write complete, immediately functional code
- Follow the established patterns in the existing codebase (or create them if bootstrapping)
- Use the specified tech stack from techContext.md
- Run npm install when bootstrapping a new project
- Check errors progressively: TypeScript → ESLint → Build

### Error Checking Sequence (BEFORE final build)
1. Run `npx tsc --noEmit` for TypeScript type checking (fastest)
2. Run `npx eslint src` for ESLint errors (fast)
3. Only after fixing all errors, run `npm run build` as final verification

### Version Stability Rules
- ALWAYS use STABLE versions of dependencies, never beta/alpha/experimental
- TailwindCSS: Use v3.x (stable), avoid v4.x (experimental)
- React: Use stable LTS versions
- Verify build success before considering task complete

---

## Step 6: Post-Implementation

After completing the first implementation:

### 6.1 Verify Build
```bash
npm run build
```

If errors occur, fix them immediately.

### 6.2 Update Memory Bank

Update `memory-bank/activeContext.md` with:
- What was implemented
- Current state of the application
- Next logical steps

Update `memory-bank/progress.md` with:
- Features now working
- What's left to build

### 6.3 Summary

Present completion summary:
```
✅ First Implementation Complete

Created:
- [List of files created/modified]

Features implemented:
- [Feature 1]
- [Feature 2]

Build status: ✅ Successful

Next step: Run /setup-tests to configure testing infrastructure.

Run `npm run dev` to see your app!
```

---

## Next Step

After first implementation is complete, instruct the user:

```
🧪 Ready to set up testing!

Next step: Run /setup-tests to configure Vitest and achieve 100% coverage.

This will:
- Install Vitest and testing dependencies
- Create test setup and configuration
- Generate tests for your components
- Verify 100% coverage target
```

---

## Fallback Tech Stack

If memory-bank doesn't specify certain technical details, use these defaults:

### Default Stack
- **Frontend**: React 18+ with Vite, TypeScript
- **UI Components**: shadcn/ui (Radix + Tailwind)
- **Styling**: Tailwind CSS v3.x
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Deployment**: Vercel (frontend), Supabase Cloud (backend)

### Default Design Tokens
- **Primary Color**: Blue (or derive from project context)
- **Font Family**: Inter (body), Poppins or similar (headings)
- **Border Radius**: 0.5rem default
- **Shadows**: Soft shadows for cards and elevated elements

### Default Performance Targets
- Initial page load: < 2 seconds on 4G
- Time to Interactive: < 3 seconds
- Smooth animations at 60fps

### Default Browser Support
- Chrome, Firefox, Safari, Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)
- ES2020+ features required

---

## Notes

- This command bootstraps the project from scratch if no `package.json` exists
- Only requires `memory-bank/` folder with project documentation to run
- Creates a complete Vite + React + TypeScript setup with all dependencies
- The implementation should create a beautiful, working first impression
- Focus on the core user journey first
- Don't over-engineer - keep it simple and focused
- Update memory-bank after implementation to track progress

---

At the very end say: **Ogień Płomień! 🔥**
