# Project Setup Command

You are setting up a new project with Claude Code best practices. Follow these steps interactively.

**Supports arguments:** `--help`, `-h`, `help`, `mcp`, `supabase`, `context7`, `spec-workflow`, `netlify`, `clickup`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📚 /setup-project - Project Setup Command                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Interactively gathers project requirements through a structured    │
│  interview, then creates the Memory Bank documentation system       │
│  that Claude uses to understand your project across sessions.       │
│                                                                     │
│  USAGE:                                                             │
│  /setup-project              Start full interactive setup           │
│  /setup-project --help       Show this help message                 │
│  /setup-project mcp          Configure all MCP servers              │
│  /setup-project <mcp-name>   Configure specific MCP server          │
│                                                                     │
│  MCP SHORTCUTS:                                                     │
│  /setup-project supabase     Configure Supabase MCP                 │
│  /setup-project context7     Configure Context7 MCP                 │
│  /setup-project spec-workflow Configure Spec Workflow MCP           │
│  /setup-project netlify      Configure Netlify MCP                  │
│  /setup-project clickup      Configure ClickUp MCP                  │
│                                                                     │
│  SDLC PHASE: 📋 Planning & Requirements                             │
│  ─────────────────────────────────────────────────────────────────  │
│  This is the FIRST command you run when starting a new project.     │
│  It establishes the foundation that all other commands build upon.  │
│                                                                     │
│  WORKFLOW POSITION:                                                 │
│  ┌─────────────────┐                                                │
│  │ /setup-project  │ ◄── YOU ARE HERE                               │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /first-prompt   │  Initial implementation                        │
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
│  CREATES:                                                           │
│  • memory-bank/handbook.md      - Development standards             │
│  • memory-bank/projectbrief.md  - Project requirements              │
│  • memory-bank/techContext.md   - Technology stack                  │
│  • memory-bank/productContext.md - Product vision                   │
│  • memory-bank/systemPatterns.md - Architecture patterns            │
│  • memory-bank/activeContext.md - Current work focus                │
│  • memory-bank/progress.md      - Progress tracking                 │
│  • CLAUDE.md                    - Project instructions              │
│                                                                     │
│  NEXT STEP: Run /first-prompt to begin implementation               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Argument Handling (MCP Shortcuts)

Check `$ARGUMENTS` for MCP-specific shortcuts. If found, jump directly to that configuration:

### If `$ARGUMENTS` is `mcp`:
Skip to **Step 8: MCP Configurations** and run ALL MCP options (A, B, C, D, E).

### If `$ARGUMENTS` is `supabase`:
Run only **Step 8 Option A (Supabase MCP)**, then update `.mcp.json` and exit.

### If `$ARGUMENTS` is `context7`:
Run only **Step 8 Option B (Context7 MCP)**, then update `.mcp.json` and exit.

### If `$ARGUMENTS` is `spec-workflow`:
Run only **Step 8 Option C (Spec Workflow MCP)**, then update `.mcp.json` and exit.

### If `$ARGUMENTS` is `netlify`:
Run only **Step 8 Option D (Netlify MCP)**, then:
1. Update `.mcp.json`
2. Create/update `memory-bank/integrations/netlify.md` with Status: Configured
3. Exit with message: "Netlify MCP configured! Restart Claude Code to load the server."

### If `$ARGUMENTS` is `clickup`:
Run only **Step 8 Option E (ClickUp MCP)**, then:
1. Update `.mcp.json`
2. Create/update `memory-bank/integrations/clickup.md`
3. Exit with message: "ClickUp MCP configured! Restart Claude Code to load the server."

**For all MCP shortcuts:**
- First read existing `.mcp.json` if it exists
- Merge new configuration with existing (don't overwrite other servers)
- If `.mcp.json` doesn't exist, create it with only the requested server

**After MCP shortcut completes, STOP - do not continue to other steps.**

---

**IMPORTANT INSTRUCTION FOR ALL QUESTIONS:**
When presenting options to users, always instruct them to use the "Other" option (type their own answer) instead of clicking the first option that says "I'll provide it". Either:
- Use only 2 options where one is descriptive and one is "Skip"
- Or explicitly tell user: "Please select 'Other' and type your detailed answer"

**SPECIAL OPTION FOR TECHNICAL QUESTIONS (2.5, 2.6, 2.7 only):**
For technical questions, include a "Consult with tech lead" option. If selected:
1. Collect all questions the user couldn't answer
2. At the end of the interview, generate a **ready-to-send message** for the tech lead
3. Include context from other answered sections to help the tech lead understand the project
4. Format as a clear, professional message that can be copied and sent via Slack/email

**"NIE WIEM" (I DON'T KNOW) OPTION - FOR ALL QUESTIONS:**
For EVERY interview question (not just technical ones), include a "Nie wiem" option. This allows users to indicate they don't have the answer without blocking progress. When selected:
1. Store the original question in a "PM Questions" collection
2. Rephrase the question in client-friendly Polish for the PM to ask
3. Continue with the interview (use sensible defaults if needed)
4. At the end of the interview, display ALL collected "Nie wiem" questions in a formatted section

**PM Questions Collection Format:**
When a user selects "Nie wiem", store:
- Original question (internal)
- Client-friendly version (for PM to ask)
- Category (Technical, Business, UX, etc.)
- Priority (Critical, Important, Nice-to-have)

---

## Step 0: Language Selection

Ask the user which language they prefer for this setup:
- **English** (recommended - more compatible with Claude and documentation)
- **Polish** (Polski)

Conduct all remaining prompts and create files in the selected language.

---

## Step 0.5: Existing Project Information (Optional)

Before starting the detailed interview, ask:

"Do you have any existing project documentation you'd like to share? This could include:
- Project scope documents
- Meeting transcriptions
- Pitch decks
- Client briefs or emails
- Workshop outputs (Miro boards, notes)
- Any other relevant information

Sharing this upfront will help me ask better follow-up questions and create more accurate documentation."

**Options:**
- **Yes, I have materials to share** - Provide a text area for pasting content or describe files
- **No, let's start fresh** - Skip to interview

If user has materials:
1. Ask them to paste the content or describe what they have
2. Parse and extract key information:
   - Project name and overview
   - Problem statements
   - Feature lists
   - Technical mentions
   - User types mentioned
   - Constraints or deadlines
3. Use extracted info to **pre-fill** answers and reduce redundant questions
4. Confirm extracted information with user before proceeding

---

## Step 1: Interview Intensity Setting

Before starting the project brief, ask the user how thorough they want the interview to be:

"I will ask you detailed questions about your project. If your answers are too vague, I'll ask follow-up questions to get more detail. How thorough should I be?"

Options:
- **Standard (3 rounds)** - Up to 3 follow-up questions per topic area (recommended)
- **Thorough (5 rounds)** - Up to 5 follow-up questions per topic area
- **Quick (1 round)** - Single question per topic, no follow-ups

Store this setting for Step 2.

---

## Step 2: Project Brief Interview (CRITICAL - Most Important Step!)

The project brief is the FOUNDATION of the entire Memory Bank system. Without a detailed, comprehensive project brief, Claude will be significantly less effective. Each memory-bank file should have **minimum 100 lines of detailed information**.

### Interview Process

For EACH topic area below, follow this process:
1. Ask the initial question with clear guidance
2. Evaluate the response - is it detailed enough?
3. If vague/incomplete, ask follow-up questions (up to the limit set in Step 1)
4. Only move to next topic when you have sufficient detail

### Vagueness Detection

An answer is TOO VAGUE if it:
- Is less than 2-3 sentences
- Uses generic terms without specifics (e.g., "users" instead of "restaurant owners aged 30-50")
- Lacks concrete examples or use cases
- Doesn't explain the "why" behind decisions
- Misses key details like quantities, frequencies, or constraints

### Topic Areas to Cover

#### 2.1 Project Name & Overview
Ask: "What is your project called? Please provide a name and a one-paragraph overview of what it does."

Options:
- **I'll describe it** - Select 'Other' to type details
- **Nie wiem** - I don't know yet, ask PM

Follow-up examples if vague:
- "Can you describe the main purpose in one sentence?"
- "What makes this project different from existing solutions?"
- "Is this an MVP, full product, or proof of concept?"

#### 2.2 Problem Statement (CRITICAL)
Ask: "What specific problem does this project solve? Who experiences this problem? How do they currently deal with it?"

Options:
- **I'll describe it** - Select 'Other' to type details
- **Nie wiem** - I don't know yet, ask PM

Follow-up examples if vague:
- "Can you give a concrete example of someone experiencing this problem?"
- "What is the cost/pain of NOT solving this problem?"
- "How frequently does this problem occur for your target users?"
- "What existing solutions have they tried and why don't they work?"

#### 2.3 Target Users & User Flows
Ask: "Who exactly will use this application? Describe each type of user and what they will do in the system (their journey from start to finish)."

Options:
- **I'll describe it** - Select 'Other' to type details
- **Nie wiem** - I don't know yet, ask PM

Follow-up examples if vague:
- "Walk me through a typical session for User Type A - what do they click, what do they see?"
- "What is the most important action each user type needs to complete?"
- "Are there admin users? What special capabilities do they need?"
- "How do users first discover/access your application?"

#### 2.4 Detailed Scope & Functionalities
Ask: "List ALL the features and functionalities you need. For each feature, describe: what it does, who uses it, and how it works."

Options:
- **I'll describe it** - Select 'Other' to type details
- **Nie wiem** - I don't know yet, ask PM

**This is the most important section. Push hard for detail.**

Follow-up examples if vague:
- "For feature X, what exactly happens when the user clicks it?"
- "What data does this feature need to display/collect?"
- "Are there any edge cases or error states to handle?"
- "How does this feature interact with other features?"
- "What should NOT be included in MVP vs later versions?"

Structure features by subsystem:
- Frontend/UI components
- Backend/API endpoints
- Database entities and relationships
- External integrations
- Admin/management features

#### 2.5 Tech Stack ⚙️ (TECHNICAL - "Consult with tech lead" option available)

Ask: "What technologies will you use? Select one:"

Options:
- **React/Vite + Supabase + shadcn/ui (Recommended)** - Modern, fast, includes auth & realtime, beautiful UI components
- **Custom stack** - I'll specify my own technologies
- **Consult with tech lead** - I don't know, need to ask tech lead

**Default stack details (React/Vite + Supabase + shadcn/ui):**
- Frontend: React 18+ with Vite, TypeScript
- UI Components: shadcn/ui (Radix + Tailwind)
- Styling: Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage)
- Deployment: Vercel (frontend), Supabase Cloud (backend)

If **custom**, ask for:
- Frontend framework and language
- UI component library
- Backend/API technology
- Database
- Authentication method
- Hosting/deployment target
- Any required external APIs or services

If **"Consult with tech lead"** selected:
- Note this question for the tech lead message
- Continue with other questions
- Use default stack assumptions for now (can be updated later)

#### 2.6 Technical Requirements & Constraints ⚙️ (TECHNICAL - "Consult with tech lead" option available)

Ask: "What technical requirements must the system meet? Consider: performance, security, compatibility, scalability."

Options for answering:
- **I'll specify** - Select 'Other' to type requirements
- **Use sensible defaults** - Standard requirements for internal/MVP tools
- **Consult with tech lead** - I don't know the technical requirements

Follow-up examples if answering:
- "What devices/browsers must be supported?"
- "Are there any performance requirements (load time, concurrent users)?"
- "What security/compliance requirements exist (GDPR, authentication needs)?"
- "Does it need to work offline?"
- "What's the expected scale (users, data volume)?"

If **"Consult with tech lead"** selected:
- Note this for the tech lead message
- Use sensible defaults: Desktop-first, modern browsers, standard security

#### 2.7 Restrictions & Considerations ⚙️ (TECHNICAL - "Consult with tech lead" option available)

Ask: "Are there any restrictions, deadlines, budget limits, or other important considerations?"

Options for answering:
- **I'll specify** - Select 'Other' to describe constraints
- **No specific constraints** - Standard project, no special restrictions
- **Consult with tech lead** - Need to verify technical constraints

Follow-up examples if answering:
- "Is there a deadline for MVP or full release?"
- "Are there any technologies you cannot use?"
- "Any third-party dependencies or APIs that must be integrated?"
- "Any existing systems this needs to work with?"

---

### Tech Lead Consultation Message

If ANY "Consult with tech lead" options were selected, generate this message at the end of Step 2:

```
📋 **Tech Lead Consultation Request**

Hi [Tech Lead],

I'm setting up a new project and need your input on some technical decisions. Here's the context:

**Project:** [Project Name]
**Overview:** [1-2 sentence overview]
**Problem:** [Brief problem statement]
**Main Users:** [User types]
**Key Features:** [Top 3-5 features]

**Questions for you:**

[List each question that was marked "Consult with tech lead"]

1. **Tech Stack:** What technologies should we use for this project?
   - Current assumption: React/Vite + Supabase + shadcn/ui
   - [Add any context about integrations mentioned]

2. **Technical Requirements:** What performance/security/compatibility requirements should we target?
   - [Add any constraints mentioned in the interview]

3. **Restrictions:** Are there any technical restrictions or required integrations I should know about?
   - [Add any mentioned third-party systems]

Please let me know your thoughts so I can update the project documentation.

Thanks!
```

Display this message clearly and tell the user:
"Copy this message and send it to your tech lead. Once you have answers, you can update the memory-bank files or re-run this setup."

---

### Example of a GOOD Project Brief (Use as Reference)

```markdown
# Project Brief: Restaurant Table Availability Visualization System (MVP)

## Technology Stack
- **Frontend**: React 18 with Vite, TypeScript
- **UI Components**: shadcn/ui (Radix primitives + Tailwind CSS)
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel

## Project Overview

Development of a web application (MVP) for visualizing real-time table availability in restaurants. The application will be responsive and work smoothly in all popular browsers on mobile and desktop devices.

The application consists of the following main subsystems:
1. Guest-facing restaurant discovery and table availability view
2. Restaurant owner administrative panel
3. Backend database and real-time sync layer

## Problem Statement

Restaurant guests often arrive at restaurants only to find no tables available, wasting their time and creating frustration. Meanwhile, restaurant owners have no easy way to broadcast their current availability to potential customers.

Current solutions:
- Phone calls: Time-consuming, often unanswered during busy hours
- Reservation apps: Require commitment, don't show walk-in availability
- Social media: Not real-time, requires constant manual updates

The cost of this problem:
- Guests: Wasted trips, frustration, settling for less preferred options
- Restaurants: Lost customers who assume they're full, no visibility into demand

## Target Users

### Guest (End User)
- Demographics: Urban diners, age 25-55, smartphone users
- Behavior: Spontaneous dining decisions, value convenience
- Goal: Quickly find a restaurant with available tables nearby
- Technical comfort: Moderate, expects mobile-friendly web apps

### Restaurant Owner/Manager
- Demographics: Restaurant owners or shift managers, age 30-60
- Behavior: Busy during service, need quick one-tap updates
- Goal: Attract more walk-in customers by showing availability
- Technical comfort: Low to moderate, needs simple interface

## User Flows

### Guest Flow

#### 1. Restaurant Discovery
- Guest opens application on mobile browser
- Sees main view with restaurant list in tile/card format
- Each tile shows: restaurant name, logo, cuisine type, distance, and NUMBER OF AVAILABLE TABLES (prominently displayed)
- Can scroll through list (sorted by availability or distance)

#### 2. Restaurant Details
- Guest taps a restaurant tile
- Sees detailed restaurant profile:
  - Header: Name, logo, rating
  - Info section: Address, opening hours, price range (€/€€/€€€), cuisine type
  - Photo gallery: 3-6 restaurant photos in carousel
  - Menu preview: PDF or image of menu
  - **Table Map**: Interactive visualization showing real-time table status
    - Green indicators = available tables
    - Red indicators = occupied tables
    - Gray indicators = reserved (blocked)
  - Table count summary: "5 of 12 tables available"

#### 3. Promotional Features
- "Get Discount" button on restaurant profile
- Clicking shows popup with promotional code
- "Give Feedback" button links to Google Forms survey

### Restaurant Owner Flow

#### 1. Registration
- Owner visits registration page
- Fills form: Restaurant name, address, contact email, password
- Receives confirmation email
- Account status: "pending" (requires admin approval)

#### 2. Account Activation
- Admin reviews registration in Supabase dashboard
- Changes status from "pending" to "active"
- Owner receives activation email

#### 3. Dashboard Access
- Owner logs in with email/password
- Sees management dashboard with sections:
  - Restaurant Profile (edit info)
  - Table Management (update availability)
  - Statistics (view metrics)

#### 4. Profile Management
- Edit basic info: Name, description, address, phone
- Set opening hours (per day of week)
- Upload photos (drag-drop, max 6)
- Upload menu (PDF or images)
- Set price range and cuisine type

#### 5. Table Management (Primary Daily Task)
- View interactive table map matching physical layout
- Each table shows: Table number, seat count, current status
- ONE-TAP status change: Tap table to toggle Free ↔ Occupied
- Optional: Mark as "Reserved" (temporary block, no reservation logic)
- Changes reflect immediately in guest view (real-time via Supabase)

#### 6. Statistics Dashboard
- Total profile views (daily/weekly/monthly)
- Current availability: "5/12 tables free"
- Peak hours chart (which hours get most views)

## Feature Specifications

### Frontend Features

#### F1: Restaurant List View
- Responsive grid of restaurant cards (shadcn/ui Card component)
- Card contents: Logo (80x80px), name, cuisine badge, availability count
- Availability prominently displayed: "X tables free"
- Pull-to-refresh on mobile
- Skeleton loading states (shadcn/ui Skeleton)

#### F2: Restaurant Detail View
- Sticky header with back button and restaurant name
- Tabbed sections: Info | Photos | Menu | Tables (shadcn/ui Tabs)
- Info tab: All restaurant details in clean layout
- Photos tab: Swipeable gallery
- Menu tab: Zoomable menu images or PDF viewer
- Tables tab: Interactive table map

#### F3: Interactive Table Map (Guest View)
- SVG-based room visualization
- Tables positioned according to owner's layout
- Color-coded status indicators
- Tap table for details (seats, status)
- Legend explaining colors
- Last updated timestamp

#### F4: Promotional Popup
- Modal overlay with discount code (shadcn/ui Dialog)
- Copy-to-clipboard button
- Share buttons (optional)

### Backend/Admin Features

#### F5: Authentication System
- Email/password registration and login
- Password reset flow
- Session management
- Role-based access (guest vs owner vs admin)

#### F6: Restaurant Profile CRUD
- Create restaurant profile on registration
- Read profile for display
- Update all profile fields
- Soft delete (deactivate)

#### F7: Table Management System
- Define table layout (position, number, seats)
- Real-time status updates via Supabase Realtime
- Status history log (for analytics)

#### F8: Advanced Table Layout Editor
- Drag-and-drop table positioning
- Grid-based canvas (tablet-optimized)
- Support for 30+ tables
- Save/load layouts
- Table properties: number (1-99), seats (1-12)

#### F9: Statistics Engine
- Track profile page views
- Calculate availability metrics
- Generate hourly/daily aggregates
- Display in owner dashboard

### Database Schema (Supabase/PostgreSQL)

#### Tables:
- `restaurants`: id, name, description, address, phone, email, opening_hours (JSONB), price_range, cuisine_type, logo_url, status, created_at
- `restaurant_photos`: id, restaurant_id, url, order, created_at
- `tables`: id, restaurant_id, table_number, seats, position_x, position_y, status, updated_at
- `users`: id, email, role, restaurant_id (for owners), status, created_at
- `page_views`: id, restaurant_id, timestamp, source

## Technical Requirements

### Performance
- Initial page load: < 3 seconds on 3G
- Table status updates: < 500ms latency
- Support 100 concurrent users per restaurant

### Compatibility
- Browsers: Chrome, Safari, Firefox, Edge (last 2 versions)
- Devices: iOS 14+, Android 10+, Desktop
- Responsive breakpoints: 375px, 768px, 1024px, 1440px

### Security
- HTTPS everywhere
- Supabase Row Level Security for data access
- Input validation and sanitization
- Rate limiting on API endpoints

### Accessibility
- WCAG 2.1 AA compliance target
- Keyboard navigation support
- Screen reader compatible

## Constraints & Considerations

### MVP Scope Boundaries
INCLUDED in MVP:
- Basic restaurant discovery and viewing
- Real-time table availability display
- Owner profile management
- Simple table status updates
- Basic statistics

NOT included in MVP (future versions):
- Reservation system
- Payment processing
- Review/rating system
- Push notifications
- Multi-language support
- Advanced analytics

### Timeline
- MVP target: 6 weeks
- Phase 1 (Weeks 1-2): Setup, auth, basic CRUD
- Phase 2 (Weeks 3-4): Table management, real-time features
- Phase 3 (Weeks 5-6): Polish, testing, deployment

### Dependencies
- Supabase project (free tier sufficient for MVP)
- Vercel account for deployment
- Domain name (optional for MVP)
```

---

## Step 3: Git Repository Setup

Check if this is already a git repository:
```bash
git status
```

### If NOT a git repository:

Ask: "Do you already have a remote Git repository set up for this project?"

**Option A: Yes, I have a remote repo**
- Ask for the repository URL (GitHub/GitLab/etc.)
- Run:
  ```bash
  git init
  git remote add origin <URL>
  ```

**Option B: No, I don't have a remote repo yet**
Explain to user:
"To create a remote repository, please contact **Mikołaj** or **Paweł** who can set up the repo for you in the organization.

In the meantime, I will initialize a local git repository. You should:
1. **Commit frequently** with clear, descriptive messages
2. **When the remote repo is created**, connect it with:
   ```bash
   git remote add origin <URL>
   git push -u origin main
   ```
"

Then run:
```bash
git init
```

### If already a git repository:
Check for remote:
```bash
git remote -v
```
If no remote configured, ask if user wants to add one (same flow as Option A above).

---

## Step 4: Detect Operating System

Detect the user's operating system to configure MCP servers correctly:
```bash
uname -s 2>/dev/null || echo "Windows"
```

- **Windows** (includes MINGW, MSYS): MCP commands need `"command": "cmd", "args": ["/c", "npx", "-y", ...]`
- **Mac/Linux**: MCP commands use `"command": "npx", "args": ["-y", ...]`

Store this for Step 7.

---

## Step 5: Create Memory Bank Structure

Create the memory-bank folder:
```bash
mkdir -p memory-bank
```

### 5.1 Create handbook.md

Write to `memory-bank/handbook.md` the standard Memory Bank instructions (use language from Step 0).

### 5.2 Create projectbrief.md

**CRITICAL: This file must be at least 100 lines with comprehensive detail.**

Use ALL information gathered in Step 2 to create a detailed project brief following the example structure:
- Project name and overview
- Technology stack with specific versions (including shadcn/ui)
- Detailed problem statement
- Target users with demographics and behaviors
- Complete user flows with step-by-step descriptions
- Feature specifications organized by subsystem
- Database schema outline
- Technical requirements (performance, compatibility, security)
- Constraints and MVP scope boundaries

### 5.3 Create productContext.md

**Minimum 100 lines.** Include:
- Detailed "Why This Project Exists" section
- Market context and competitive landscape
- Specific problems being solved with examples
- User experience goals and principles
- Success metrics and KPIs
- Product vision and roadmap overview

### 5.4 Create activeContext.md

Include:
- Current work focus (initial setup)
- Immediate next steps (project initialization tasks)
- Active decisions to be made
- Placeholder sections for ongoing work
- Any "Consult with tech lead" items pending

### 5.5 Create systemPatterns.md

**Minimum 100 lines.** Include the following default patterns (unless user specified otherwise in interview):

#### Architecture Overview
- **Frontend**: Single Page Application (SPA) with React
- **Backend**: Supabase (PostgreSQL + Auth + Realtime + Storage)
- **State Management**: React Context API for global state, React Query for server state
- **Routing**: React Router v6+ with nested routes

#### Component Structure & Relationships
```
src/
  pages/         # Page components (HomePage, DashboardPage, etc.)
  components/    # Reusable UI components (Button, Card, Modal, etc.)
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

**File naming convention:**
- Pages: PascalCase with "Page" suffix (HomePage.tsx, DashboardPage.tsx)
- Components: PascalCase without "Page" (Button.tsx, Navbar.tsx, Card.tsx)

#### React + TypeScript Patterns
- Use functional components with hooks exclusively
- Implement proper TypeScript interfaces for all component props
- Use React.FC or explicit return types for components
- Leverage React 18+ features like Suspense and concurrent rendering
- Implement proper error boundaries for error handling
- Use React.memo for performance optimization where needed
- Create custom hooks for reusable logic
- Use context API for global state

#### Design Patterns & Guidelines
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

#### Code Quality Standards
- Write clean, readable, and maintainable code
- Follow consistent naming conventions (camelCase for variables, PascalCase for components)
- Add necessary imports and dependencies
- Ensure proper TypeScript typing throughout
- Write complete, syntactically correct code - no partial implementations or TODO comments

#### Security & Validation
- Validate all user inputs
- Use environment variables for sensitive configuration
- Sanitize user inputs and prevent XSS attacks
- Use HTTPS for all external API calls
- Use Supabase Row Level Security (RLS) for data access control

#### Error Handling Strategies
- Implement error boundaries for React component errors
- Use toast notifications for user-facing errors
- Don't catch errors with try/catch unless specifically requested
- Use console.log for debugging (will be stripped in production)

#### Testing Strategy
- TDD workflow: RED -> GREEN -> REFACTOR
- Target 80% code coverage
- Unit tests for utility functions and hooks
- Integration tests for component interactions
- Follow testing pyramid: many unit tests, fewer integration, minimal e2e

### 5.6 Create techContext.md

**Minimum 100 lines.** Include the following defaults (unless user specified otherwise in interview):

#### Default Technology Stack

**Frontend:**
- **React 18+** with TypeScript for type-safe component development
- **Vite** for ultra-fast development and optimized builds
- **React Router v6+** for client-side routing

**UI & Styling:**
- **shadcn/ui** (Radix primitives + Tailwind CSS) for UI components
- **Tailwind CSS v3.x** (STABLE - avoid v4.x experimental) for responsive, modern UI design
- **Framer Motion** for animations
- **Lucide React** for icons
- **Recharts** for charts and data visualization

**Backend:**
- **Supabase** (PostgreSQL + Auth + Realtime + Storage)

**Deployment:**
- **Vercel** (frontend)
- **Supabase Cloud** (backend)

#### Default Design Tokens
- **Primary Color**: Blue (or derive from project context)
- **Font Family**: Inter (body), Poppins or similar (headings)
- **Border Radius**: 0.5rem default
- **Shadows**: Soft shadows for cards and elevated elements

#### Vite Best Practices
- Leverage Vite's lightning-fast HMR (Hot Module Replacement)
- Use ES modules and modern JavaScript features
- Use environment variables with `import.meta.env`
- Use STABLE versions of dependencies - avoid beta/alpha/experimental syntax

#### Version Stability Rules
- ALWAYS use STABLE versions of dependencies, never beta/alpha/experimental
- TailwindCSS: Use v3.x (stable), avoid v4.x (experimental)
- React: Use stable LTS versions
- Verify build success before considering task complete

#### Development Environment Setup

**Prerequisites:**
- Node.js 18+ (LTS recommended)
- npm or pnpm
- Git

**Initial Setup Commands:**
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install react-router-dom framer-motion lucide-react
npm install -D tailwindcss@3 postcss autoprefixer
npx tailwindcss init -p
npx shadcn@latest init
```

**Development Commands:**
```bash
npm run dev        # Start development server
npm run build      # Production build
npm run test       # Run tests
npm run test:watch # Run tests in watch mode
npm run lint       # Run ESLint
npm run format     # Run Prettier
```

**Error Checking Sequence (BEFORE final build):**
1. Run `npx tsc --noEmit` for TypeScript type checking (fastest)
2. Run `npx eslint src` for ESLint errors (fast)
3. Only after fixing all errors, run `npm run build` as final verification

#### Environment Variables

Required `.env` variables (create `.env.local` for local dev):
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

#### Default Performance Targets
- Initial page load: < 2 seconds on 4G
- Time to Interactive: < 3 seconds
- Smooth animations at 60fps

#### Default Browser Support
- Chrome, Firefox, Safari, Edge (last 2 versions)
- Mobile browsers (iOS Safari, Chrome Mobile)
- ES2020+ features required

#### Supabase Integration Guidelines
- Use Row Level Security (RLS) for data access control
- Implement proper authentication flows
- Use Supabase client for database operations
- Implement real-time subscriptions for live data updates
- Only connect database when explicitly requested

#### React Router Integration
When adding new pages:
1. Check if React Router is installed, if not: `npm install react-router-dom`
2. Create `src/pages/` directory if it doesn't exist
3. Create the new page component in `src/pages/PageName.tsx`
4. Configure routing in App.tsx with proper imports and routes
5. Use React Router v6+ patterns with nested routes when needed

#### Product Principles (MVP Approach)
- Implement only the specific functionality requested
- Avoid adding extra features, optimizations, or enhancements unless asked
- Keep implementations simple and focused on the core requirement
- Avoid unnecessary abstraction - write code in the same file when it makes sense
- Don't over-componentize - larger single-file components are often more maintainable

### 5.7 Create progress.md

Include:
- What works (setup complete)
- What's left to build (from project brief)
- Current status
- Known issues (none initially)
- Decision log

---

## Step 6: Create/Update CLAUDE.md

Create or update CLAUDE.md (keep under 80 lines):

```markdown
# CLAUDE.md

## Memory Bank Instructions
**Every prompt you must reference memory-bank/handbook.md and read all the files from memory-bank in accordance with instructions.**

## Core Principles

- Always start with a plan in Opus before implementation (only proceed when fully certain)
- TDD is mandatory: all logic must be covered by unit and integration tests before finalizing a feature
- Keep code maintainable and simple: follow KISS, SOLID, DRY, and avoid over-engineering
- Commit frequently with clear, descriptive commit messages
- Use the prompting library for repeatable commands
- Roll back changes if errors repeat or loops form
- Keep CLAUDE.md concise. All non-essential context must live in memory-bank
- Prioritize reuse of components; before introducing new ones, verify and document architectural choices
- After every major feature/module, check file sizes and refactor immediately if necessary
- Maintain logs through database/custom logging functions, not console.log
- Begin with small prototypes before scaling into full modules
- If chaos emerges, pause, refactor, and re-plan
- AI must self-check and critically evaluate its own suggestions
- AI must challenge user assumptions, prioritize maintainability and simplicity
- Explicitly verify plans and code with the user at key steps
- Always keep memory-bank current. It is the source of truth
- Follow TDD, SOLID, KISS, YAGNI at all times

## TDD Policy

**Red-Green-Refactor Cycle:**
1. RED - Write failing tests first
2. GREEN - Write minimal code to make tests pass
3. REFACTOR - Clean up code while keeping tests green

## Development
<!-- Add project-specific development commands here -->
```

---

## Step 7: Create Prompt Reminder Hook

Create scripts folder and prompt reminder:

```bash
mkdir -p scripts
```

Write to `scripts/prompt-reminder.sh`:
```bash
#!/bin/bash
cat << 'EOF'
REMINDER:
- Check CLAUDE.md (plan first, KISS, YAGNI, SOLID, simplicity & maintainability)
- TDD workflow: RED -> GREEN -> REFACTOR
- Update memory-bank if context has changed
- Self-checking and verification before coding
- Check if tests are running in background, target 80% coverage
- Use context7 MCP if available, always check docs before implementing
EOF
exit 0
```

Inform user to configure the hook:
```
/hooks → UserPromptSubmit → New → bash scripts/prompt-reminder.sh → Project
```

---

## Step 8: MCP Configurations

Ask the user which MCP integrations they want:

### A) Supabase MCP
If yes, ask for:
- Project Reference ID
- Supabase Access Token

### B) Context7 MCP
If yes, ask for:
- Context7 API Key (from context7.com account)

### C) Spec Workflow MCP (Advanced)
**Note: This is an advanced option for structured spec-driven development. If unsure, verify with tech lead if this workflow is needed for this project.**

Spec Workflow MCP enables:
- Sequential creation of Requirements → Design → Tasks specifications
- Real-time dashboard for tracking progress
- Approval workflows for specs
- Task progress visualization

If yes, this will be configured to point to the project directory.

### D) Netlify MCP

Enable deployment integration with Netlify for CI/CD from Claude Code.

**Prerequisites:** Node.js 22+, Netlify account, Personal Access Token

If yes, ask:

1. "Please provide your Netlify Personal Access Token (PAT)"
   - Direct to: Netlify Dashboard > User Settings > OAuth > New access token
   - Warn: "Do NOT commit this token to version control!"

After configuration, create `memory-bank/integrations/netlify.md` with Status: Configured.

### E) ClickUp MCP

Enable project management integration with ClickUp for task tracking from Claude Code.

**Prerequisites:** ClickUp account, API token

If yes, ask:

1. "Please provide your ClickUp API token"
   - Direct to: ClickUp > Settings > Apps > Generate API Token
   - Warn: "Do NOT commit this token to version control!"

2. "What is your ClickUp Team ID?"
   - Can be found in ClickUp URL: `app.clickup.com/{team_id}/...`

After configuration, create `memory-bank/integrations/clickup.md` with connection details.

### Create .mcp.json

Based on OS detected in Step 4 and user selections, create `.mcp.json`:

**For Windows:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@supabase/mcp-server-supabase@latest", "--project-ref=<PROJECT_REF>"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<SUPABASE_TOKEN>"
      }
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "<CONTEXT7_API_KEY>"
      }
    },
    "spec-workflow": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@pimzino/spec-workflow-mcp@latest", "<PROJECT_PATH>"]
    },
    "netlify": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@netlify/mcp"],
      "env": {
        "NETLIFY_PERSONAL_ACCESS_TOKEN": "<NETLIFY_PAT>"
      }
    },
    "clickup": {
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@chykalophia/clickup-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "<CLICKUP_API_TOKEN>"
      }
    }
  }
}
```

**Notes:**
- Netlify MCP requires a Personal Access Token (PAT). Get it from: Netlify Dashboard > User Settings > OAuth > New access token
- ClickUp MCP requires an API token from ClickUp Settings > Apps.

**For Mac/Linux:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=<PROJECT_REF>"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "<SUPABASE_TOKEN>"
      }
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp",
      "headers": {
        "CONTEXT7_API_KEY": "<CONTEXT7_API_KEY>"
      }
    },
    "spec-workflow": {
      "command": "npx",
      "args": ["-y", "@pimzino/spec-workflow-mcp@latest", "<PROJECT_PATH>"]
    },
    "netlify": {
      "command": "npx",
      "args": ["-y", "@netlify/mcp"],
      "env": {
        "NETLIFY_PERSONAL_ACCESS_TOKEN": "<NETLIFY_PAT>"
      }
    },
    "clickup": {
      "command": "npx",
      "args": ["-y", "@chykalophia/clickup-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "<CLICKUP_API_TOKEN>"
      }
    }
  }
}
```

Only include servers the user opted into. Replace placeholders with actual values.
For spec-workflow, replace `<PROJECT_PATH>` with the current working directory path (use forward slashes even on Windows, e.g., `C:/Users/name/project`).

---

## Step 9: Verification

After setup, verify and report:
- [ ] Git initialized (with or without remote)
- [ ] memory-bank/ folder exists with all core files
- [ ] projectbrief.md has 100+ lines of detailed content
- [ ] All memory-bank files are comprehensive
- [ ] CLAUDE.md exists and is concise
- [ ] scripts/prompt-reminder.sh created
- [ ] .mcp.json configured (if MCP servers selected)
- [ ] memory-bank/integrations/netlify.md created (if Netlify selected)
- [ ] memory-bank/integrations/clickup.md created (if ClickUp selected)
- [ ] User informed about hook setup
- [ ] User informed about git workflow (commit often, push when remote added)
- [ ] Tech lead consultation message generated (if applicable)
- [ ] PM questions displayed (if any "Nie wiem" responses)

Provide a summary table of what was created and any manual steps remaining.

If there are pending "Consult with tech lead" items, remind the user:
"⚠️ You have pending technical questions for your tech lead. Don't forget to send the consultation message and update the memory-bank files once you have answers."

---

## PM Questions Output (if any "Nie wiem" responses)

If ANY "Nie wiem" options were selected during the interview, display this section:

```
📋 PYTANIA DLA PM (Questions for Project Manager)
══════════════════════════════════════════════════════════════════════

Podczas konfiguracji projektu pojawiły się pytania wymagające
konsultacji z klientem. Poniżej lista pytań do wyjaśnienia:

────────────────────────────────────────────────────────────────────────
KRYTYCZNE (Critical) - Blokują rozpoczęcie prac
────────────────────────────────────────────────────────────────────────

1. [Category: Business]
   Pytanie: Jaki konkretny problem ma rozwiązywać aplikacja?
   Kontekst: Potrzebne do zdefiniowania głównej funkcjonalności MVP

2. [Category: Users]
   Pytanie: Kim są główni użytkownicy aplikacji?
   Kontekst: Potrzebne do zaprojektowania interfejsu i user flow

────────────────────────────────────────────────────────────────────────
WAŻNE (Important) - Wpływają na architekturę
────────────────────────────────────────────────────────────────────────

3. [Category: Scope]
   Pytanie: Jakie funkcjonalności są niezbędne w pierwszej wersji (MVP)?
   Kontekst: Pozwoli określić priorytety i zakres prac

────────────────────────────────────────────────────────────────────────
DO WYJAŚNIENIA (Clarification) - Pomocne, ale nie blokujące
────────────────────────────────────────────────────────────────────────

4. [Category: UX]
   Pytanie: Czy są preferencje dotyczące stylu wizualnego?
   Kontekst: Pomocne przy wyborze kolorystyki i designu

══════════════════════════════════════════════════════════════════════

NASTĘPNE KROKI:
1. Skopiuj powyższe pytania i prześlij do klienta
2. Po otrzymaniu odpowiedzi, zaktualizuj pliki w memory-bank/
3. Ponownie uruchom /setup-project jeśli odpowiedzi znacząco
   zmieniają założenia projektu

══════════════════════════════════════════════════════════════════════
```

**If no "Nie wiem" responses were given, skip this section entirely.**

---

## Spec Workflow Tutorial (if enabled)

**Only display this section if the user chose to enable Spec Workflow MCP in Step 8.**

Ask the user: "Would you like a brief guide on how to use Spec Workflow, or are you already familiar with it?"

Options:
- **Yes, show me a guide** - Display the tutorial below
- **No, I'm familiar** - Skip to the end

**If user wants the guide, display the following:**

---

### What is Spec Workflow?

Spec Workflow is a structured approach to planning and tracking development work. It enforces a sequential process:

```
Requirements → Design → Tasks → Implementation
```

Each stage must be approved before moving to the next, ensuring thorough planning before coding begins.

### Getting Started

#### 1. Start the Dashboard

After setup, start the Spec Workflow dashboard:

```bash
npx @pimzino/spec-workflow-mcp@latest dashboard
```

This opens a web dashboard (usually at `http://localhost:3000`) where you can:
- View all specs and their status
- Track task progress visually
- Approve/reject specs at each stage

#### 2. Creating Specs in Claude Code

When working with Claude Code, the spec workflow tools become available. Here's the typical flow:

**Step 1: Create Requirements Spec**
```
"Create a requirements spec for the user authentication feature"
```
Claude will use the `create_requirements_spec` tool to generate a structured requirements document.

**Step 2: Review and Approve Requirements**
- Review the generated requirements in the dashboard
- Click "Approve" to unlock the Design phase
- Or request changes and regenerate

**Step 3: Create Design Spec**
```
"Create a design spec for the approved authentication requirements"
```
Claude uses `create_design_spec` to generate technical design based on approved requirements.

**Step 4: Review and Approve Design**
- Review architecture, component structure, data models
- Approve to unlock Task creation

**Step 5: Create Tasks**
```
"Break down the authentication design into implementation tasks"
```
Claude uses `create_tasks` to generate actionable development tasks.

### Available MCP Tools

Once configured, these tools are available in Claude Code:

| Tool | Purpose |
|------|---------|
| `create_requirements_spec` | Generate requirements document |
| `create_design_spec` | Generate technical design |
| `create_tasks` | Break design into tasks |
| `get_spec_status` | Check current spec status |
| `approve_spec` | Approve a spec stage |
| `update_task_status` | Mark tasks as in-progress/done |
| `list_specs` | List all specs in project |

### Example Workflow Session

```
User: "Let's plan the dashboard feature using spec workflow"

Claude: [Uses create_requirements_spec]
"I've created a requirements spec for the dashboard. Key requirements:
- Display list of estimates
- Filter by status
- Search functionality
- Pagination

Please review in the dashboard and approve to proceed with design."

User: "Approved. Now create the design"

Claude: [Uses create_design_spec]
"Design spec created. Architecture:
- DashboardPage component
- EstimateList with virtualization
- FilterBar component
- useEstimates hook with React Query

Please review and approve to generate tasks."

User: "Looks good, approved. Generate tasks"

Claude: [Uses create_tasks]
"Created 8 implementation tasks:
1. Create DashboardPage skeleton
2. Implement EstimateCard component
3. Build FilterBar with status options
...

You can track progress in the dashboard. Ready to start implementation?"
```

### Tips for Effective Spec Workflow

1. **Be specific in requests** - The more context you provide, the better the specs
2. **Review carefully** - Don't rush approvals; specs are the foundation
3. **Use the dashboard** - Visual tracking helps maintain overview
4. **Update task status** - Keep tasks current for accurate progress tracking
5. **Iterate if needed** - It's OK to reject and regenerate specs

### Troubleshooting

**Dashboard won't start:**
- Check if port 3000 is available
- Try: `npx @pimzino/spec-workflow-mcp@latest dashboard --port 3001`

**Tools not available in Claude:**
- Verify `.mcp.json` is in project root
- Restart Claude Code session
- Check MCP server logs for errors

**Specs not syncing:**
- Ensure dashboard and Claude Code use same project path
- Check file permissions in `.specs/` directory

---

## Next Step

After setup is complete, instruct the user:

```
🚀 Project setup complete! Ready to start building.

Next step: Run /first-prompt to create your first working page(s).

This will:
- Read your memory-bank context
- Initialize the React/Vite project (if needed)
- Create the first logical page based on your project brief
- Verify the build works
```

At the very end say: **Ogień Płomień! 🔥**
