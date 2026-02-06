# Scope Command - Project Scope Generator

Analyze codebase and generate a scope document (DOCX) suitable for client presentations and Google Docs import.

**Supports arguments:**
- `--quick` - Fast analysis, minimal interview
- `--detailed` - Thorough analysis with full interview
- `--output <path>` - Custom output path for DOCX
- `--help`, `-h`, `help` - Show usage information

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📋 /scope - Project Scope Generator                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Analyzes your codebase to detect features, routes, and components, │
│  then generates a professional scope document in DOCX format        │
│  suitable for client presentations and Google Docs import.          │
│                                                                     │
│  USAGE:                                                             │
│  /scope                 Interactive mode with interview             │
│  /scope --quick         Fast analysis, skip interview               │
│  /scope --detailed      Thorough analysis with full interview       │
│  /scope --output ./docs Generate in custom location                 │
│  /scope --help          Show this help message                      │
│                                                                     │
│  ANALYSIS CAPABILITIES:                                             │
│  • React components and pages detection                             │
│  • Route structure extraction                                       │
│  • API endpoint discovery                                           │
│  • Database schema analysis (if Supabase/Prisma)                    │
│  • Feature grouping and categorization                              │
│                                                                     │
│  OUTPUT:                                                            │
│  • Professional DOCX document                                       │
│  • Feature list with descriptions                                   │
│  • Route/page inventory                                             │
│  • Tech stack summary                                               │
│  • Importable to Google Docs                                        │
│                                                                     │
│  SDLC PHASE: 📋 Documentation                                       │
│  ─────────────────────────────────────────────────────────────────  │
│  Use when you need to document project scope for clients,           │
│  stakeholders, or team handoffs.                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 1: Project Detection

### 1.1 Detect Project Type

```bash
# Check package.json for framework
cat package.json
```

Detect:
| Check | Framework |
|-------|-----------|
| `react` in dependencies | React |
| `vue` in dependencies | Vue |
| `@angular/core` in dependencies | Angular |
| `svelte` in dependencies | Svelte |
| `next` in dependencies | Next.js |
| No frontend framework | Node.js Backend |

### 1.2 Detect Additional Technologies

| File/Pattern | Technology |
|--------------|------------|
| `supabase` in dependencies | Supabase |
| `prisma` folder or dependency | Prisma |
| `tailwind.config.*` | Tailwind CSS |
| `tsconfig.json` | TypeScript |
| `.env` with `SUPABASE_*` | Supabase |

Display detection results:

```
PROJECT DETECTION
══════════════════════════════════════════════════════════════════════

Detected: React + TypeScript + Supabase
├── Framework: React 18
├── Language: TypeScript
├── Styling: Tailwind CSS
├── Backend: Supabase
├── UI Library: shadcn/ui
└── Build Tool: Vite
```

---

## Step 2: Feature Analysis

### 2.1 React Analysis

Scan for pages and components:

```bash
# Find page components
find src/pages -name "*.tsx" 2>/dev/null || find src/app -name "page.tsx" 2>/dev/null

# Find main components
find src/components -name "*.tsx"

# Find routes
grep -r "Route\|path=" src/ --include="*.tsx"
```

### 2.2 API Analysis

```bash
# Find API endpoints (if backend)
find src/api -name "*.ts" 2>/dev/null
grep -r "app.get\|app.post\|router." src/ --include="*.ts"

# Find Supabase queries
grep -r "supabase.from\|\.select(\|\.insert(\|\.update(" src/ --include="*.ts" --include="*.tsx"
```

### 2.3 Database Analysis

If Prisma:
```bash
cat prisma/schema.prisma
```

If Supabase types exist:
```bash
cat src/types/supabase.ts 2>/dev/null || cat src/lib/database.types.ts 2>/dev/null
```

### 2.4 Extract Features

Build feature list:

```
DETECTED FEATURES
══════════════════════════════════════════════════════════════════════

PAGES (6 detected)
────────────────────────────────────────────────────────────────────────
1. HomePage (src/pages/HomePage.tsx)
   Route: /
   Components: Hero, FeatureGrid, CTASection

2. DashboardPage (src/pages/DashboardPage.tsx)
   Route: /dashboard
   Components: StatsCards, RecentActivity, Charts

3. SettingsPage (src/pages/SettingsPage.tsx)
   Route: /settings
   Components: ProfileForm, PreferencesForm

[...]

COMPONENTS (24 detected)
────────────────────────────────────────────────────────────────────────
UI Components: Button, Card, Modal, Input, Select...
Feature Components: UserCard, EstimateRow, FilterBar...
Layout Components: Navbar, Sidebar, Footer...

DATA MODELS (5 detected)
────────────────────────────────────────────────────────────────────────
1. users - User accounts and profiles
2. estimates - Project estimates
3. clients - Client information
4. items - Estimate line items
5. settings - User preferences
```

---

## Step 3: Interview (Optional Enrichment)

**Skip if `--quick` flag.**

```
SCOPE ENRICHMENT INTERVIEW
══════════════════════════════════════════════════════════════════════

I've detected the features above. Would you like to add descriptions
or context for the scope document?
```

Options:
- **Yes, let's add context** - Interactive interview
- **Skip, use auto-generated descriptions** - Use detected info only

### If interview selected:

For each major feature/page:

```
PAGE: DashboardPage
────────────────────────────────────────────────────────────────────────

Auto-detected purpose: Main dashboard with stats and activity

Would you like to:
```

Options:
- **Keep auto-description** - Use detected description
- **Add custom description** - Provide your own (use "Other")
- **Skip this feature** - Exclude from scope document

---

## Step 4: Generate DOCX

### 4.1 Document Structure

```
PROJECT SCOPE DOCUMENT
══════════════════════════════════════════════════════════════════════

Generating scope document...

Document structure:
├── Title Page
│   ├── Project Name
│   ├── Date
│   └── Version
├── Executive Summary
├── Technology Stack
├── Features Overview
│   ├── Feature 1
│   │   ├── Description
│   │   ├── User Story
│   │   └── Route/Location
│   └── [...]
├── Pages Inventory
├── Data Models
└── Technical Notes
```

### 4.2 Create DOCX Content

Generate professional document with:

**Title Page:**
- Project name (from package.json)
- "Scope Document"
- Generation date
- Version 1.0

**Executive Summary:**
- Brief project description
- Key technologies
- Feature count summary

**Features Table:**

| Feature | Description | Route | Status |
|---------|-------------|-------|--------|
| Dashboard | Main user dashboard with statistics | /dashboard | Implemented |
| Settings | User preferences and profile | /settings | Implemented |
| ... | ... | ... | ... |

**Technical Stack:**
- Frontend framework and version
- Backend/API technology
- Database
- Key libraries

### 4.3 Save DOCX

Default path: `./docs/scope-{project-name}-{date}.docx`

If `--output` specified, use custom path.

```bash
# Ensure docs folder exists
mkdir -p docs
```

---

## Step 5: Output Summary

```
SCOPE DOCUMENT GENERATED
══════════════════════════════════════════════════════════════════════

📄 Document: docs/scope-wyceniator-20240115.docx

CONTENTS
────────────────────────────────────────────────────────────────────────
Pages documented:     6
Components listed:    24
Data models:          5
Total features:       35

DOCUMENT SECTIONS
────────────────────────────────────────────────────────────────────────
✓ Title Page
✓ Executive Summary
✓ Technology Stack
✓ Features Overview (35 items)
✓ Pages Inventory (6 pages)
✓ Data Models (5 tables)
✓ Technical Notes

NEXT STEPS
────────────────────────────────────────────────────────────────────────
1. Open in Microsoft Word or Google Docs
2. Review and adjust descriptions
3. Add any missing features manually
4. Share with stakeholders

────────────────────────────────────────────────────────────────────────

Location: docs/scope-wyceniator-20240115.docx
```

---

## Supported Frameworks

| Framework | Detection | Analysis Level |
|-----------|-----------|----------------|
| React | Full | Pages, components, routes |
| Next.js | Full | App/pages router, API routes |
| Vue | Basic | Components, router |
| Angular | Basic | Modules, components |
| Node.js | Basic | API endpoints |

---

## Notes

- DOCX format chosen for Google Docs compatibility
- Auto-detection may miss dynamically loaded features
- Use `--detailed` for client-facing documents
- Run after major features are complete
