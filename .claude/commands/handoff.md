# Handoff Command

Prepare a clean, secure project copy for handoff to another developer, team, or client.

**Supports arguments:**
- `--dry-run` (preview mode - show what would be included/excluded)
- `--no-zip` (create folder only, skip compression)
- `--include-tests` (include test files in package)
- `--output <path>` (custom output location)
- `--help`, `-h`, `help` (show usage information)

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📦 /handoff - Handoff Command                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Creates a clean, secure project package for handoff:               │
│  • Copies source code and essential configs only                    │
│  • Removes AI/Claude references and tooling                         │
│  • Excludes secrets, env files, and sensitive data                  │
│  • Generates setup documentation and .env.example                   │
│  • Creates manifest and packages into zip                           │
│                                                                     │
│  USAGE:                                                             │
│  /handoff                 Full handoff with zip archive             │
│  /handoff --dry-run       Preview without creating files            │
│  /handoff --no-zip        Create folder only                        │
│  /handoff --include-tests Include test files                        │
│  /handoff --help          Show this help message                    │
│                                                                     │
│  SDLC PHASE: 📦 Delivery & Handoff                                  │
│  ─────────────────────────────────────────────────────────────────  │
│  Final packaging phase. Creates a clean deliverable for             │
│  external parties without internal tooling or AI artifacts.         │
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
│  │ /setup-tests    │  Test infrastructure                           │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /manual-test    │  QA verification                               │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /commit         │  Code review & commit                          │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /handoff        │ ◄── YOU ARE HERE                               │
│  └─────────────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│      [Delivery] → Package sent to recipient                         │
│                                                                     │
│  EXCLUDES:                                                          │
│  • .claude/           (AI tooling)                                  │
│  • memory-bank/       (AI context)                                  │
│  • .env, .env.*       (secrets)                                     │
│  • node_modules/      (dependencies)                                │
│  • .git/              (history)                                     │
│  • CLAUDE.md          (AI instructions)                             │
│                                                                     │
│  GENERATES:                                                         │
│  • .gitignore         (fresh, clean)                                │
│  • .env.example       (from existing .env files)                    │
│  • SETUP.md           (installation instructions)                   │
│                                                                     │
│  WHEN TO USE:                                                       │
│  • Project delivery to client                                       │
│  • Handoff to another developer/team                                │
│  • Creating a distributable package                                 │
│  • Open-sourcing a project                                          │
│  • Archiving completed work                                         │
│                                                                     │
│  NEXT STEP: Send package to recipient with SETUP.md instructions    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 0: Dry Run Mode Check

If `$ARGUMENTS` contains `--dry-run`:

```
👁️ ═══════════════════════════════════════════════════════════════════ 👁️
                        DRY RUN MODE ACTIVATED
👁️ ═══════════════════════════════════════════════════════════════════ 👁️

Preview mode - no files will be created or modified.
Showing what WOULD happen during handoff.
```

Set `DRY_RUN=true` and continue. All steps will describe actions without executing them.

---

## Step 0.5: Build Application

**IMPORTANT: Run build first to ensure dist folder is fresh.**

```
BUILD APPLICATION
══════════════════════════════════════════════════════════════════════

Running npm run build to create production artifacts...
```

### Execute Build

```bash
npm run build
```

Stream output to user.

### Handle Build Result

**If build succeeds:**
```
✓ Build successful
  Output: dist/

Continuing with handoff...
```

**If build fails:**
```
⚠️ BUILD FAILED
══════════════════════════════════════════════════════════════════════

The build process encountered errors:
[Error output from build]

How would you like to proceed?
```

Options:
- **Continue anyway** - Proceed with handoff without fresh dist (existing dist will be used if present)
- **Abort handoff** - Stop and fix build errors first

If user selects **Continue anyway**, note in manifest that build failed.
If user selects **Abort**, **STOP execution**.

### Preserve dist folder

**IMPORTANT:** The dist folder should be:
1. NOT deleted during cleanup
2. NOT added to git (respect .gitignore)
3. Included in handoff package if it exists

---

## Step 1: Pre-flight Checks

Verify the project is ready for handoff:

```bash
# Check for uncommitted changes
git status --porcelain

# Verify build passes
npm run build

# Check for secrets in code
grep -r "sk-\|api_key\|password\s*=" src/ --include="*.ts" --include="*.tsx"
```

Display pre-flight results:

```
HANDOFF PRE-FLIGHT CHECKS
══════════════════════════════════════════════════════════════════════

[ ] Git status clean (no uncommitted changes)
[ ] Build passes (npm run build)
[ ] No hardcoded secrets detected
[ ] README.md exists

Issues found: [X]
```

### If issues found:

```
⚠️ Pre-flight issues detected:

1. [Issue description]
2. [Issue description]

How would you like to proceed?
```

Options:
- **Fix issues first** (Recommended) - Stop and address problems
- **Continue anyway** - Proceed with warnings noted in manifest
- **Cancel handoff** - Abort the process

---

## Step 2: Analyze Project Structure

Scan the project to identify files:

```bash
# Get project name from package.json
cat package.json | grep '"name"'

# List all files (excluding node_modules, .git)
find . -type f -not -path "./node_modules/*" -not -path "./.git/*"

# Find .env files
find . -name ".env*" -type f

# Count source files
find src -type f | wc -l
```

Display analysis:

```
PROJECT ANALYSIS
────────────────────────────────────────────────────────────────────────

Project: [name from package.json]
Total files: [X] (excluding node_modules)
Source files: [X] in src/

Files to include:
├── src/                    [X files, X KB]
├── public/                 [X files, X KB]
├── package.json            [X KB]
├── tsconfig.json           [X KB]
├── vite.config.ts          [X KB]
└── [other configs...]

Files to exclude:
├── .claude/                [X files] (AI tooling)
├── memory-bank/            [X files] (AI context)
├── .env                    [secrets]
├── node_modules/           [X MB] (dependencies)
└── .git/                   [X MB] (history)
```

---

## Step 3: Create Handoff Directory

Create the output folder:

```
Output: {project-name}-handoff-{YYYYMMDD}/
```

**If `--output <path>` specified, use custom location.**

### Files to INCLUDE:

```
src/                        # Source code
public/                     # Static assets
package.json                # Dependencies (will be sanitized)
package-lock.json           # Lock file
tsconfig.json               # TypeScript config
tsconfig.node.json          # Node TypeScript config (if exists)
vite.config.ts              # Bundler config (or webpack.config.js, etc.)
tailwind.config.js          # Tailwind config (if exists)
postcss.config.js           # PostCSS config (if exists)
eslint.config.js            # ESLint config (if exists)
.eslintrc.*                 # ESLint config (legacy format)
.prettierrc*                # Prettier config
index.html                  # Entry HTML
README.md                   # Documentation (will be sanitized)
LICENSE                     # License file (if exists)
docs/                       # Documentation folder (sanitized)
dist/                       # Build output (if exists from Step 0.5)
```

**If `--include-tests` specified, also include:**
```
tests/                      # Test files
__tests__/                  # Jest test files
*.test.ts                   # Test files
*.spec.ts                   # Spec files
vitest.config.ts            # Vitest config
jest.config.js              # Jest config
```

### Files to EXCLUDE:

```
.claude/                    # Claude configuration
.spec-workflow/             # Spec workflow files
memory-bank/                # AI context files
.env                        # Environment files
.env.*                      # All env variants
.git/                       # Git history
node_modules/               # Dependencies
build/                      # Build output (use dist/ instead)
coverage/                   # Test coverage
*.log                       # Log files
.DS_Store                   # macOS files
Thumbs.db                   # Windows files
*.local                     # Local config files
.vscode/                    # IDE settings
.idea/                      # IDE settings
CLAUDE.md                   # Claude instructions
*.secret                    # Secret files
credentials.*               # Credential files
.mcp.json                   # MCP config
```

---

## Step 4: Sanitize Content

Remove AI/Claude references from all copied files.

### Patterns to Remove:

```
# Direct mentions
"Claude Code"
"Claude"
"Anthropic"
"AI-generated"
"AI-assisted"
"Generated with Claude"
"Co-Authored-By: Claude"

# Comments mentioning AI
// Claude:
// AI:
/* Generated by Claude */
<!-- Claude -->

# Memory bank references
memory-bank/
```

### Files to Sanitize:

- All `.ts`, `.tsx`, `.js`, `.jsx` files
- All `.md` files
- `package.json` (remove claude-related scripts)
- Any config files with comments

### Sanitization Rules:

1. Remove entire lines that only contain AI mentions
2. Remove AI attribution from commit-style comments
3. Preserve technical content - only remove AI references
4. Update internal links pointing to removed files

Display progress:

```
SANITIZING FILES
────────────────────────────────────────────────────────────────────────

Scanning [X] files for AI references...

Found [X] references in [Y] files:
├── src/App.tsx:45           "// Generated with Claude"
├── README.md:3              "Built with Claude Code"
├── package.json             script "claude:*"
└── src/utils/api.ts:12      "// AI-assisted"

Removed: [X] references
Files modified: [Y]
```

---

## Step 5: Generate Fresh .gitignore

Create a clean `.gitignore` for the recipient:

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment
.env
.env.*
*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Testing
coverage/

# Cache
.cache/
.parcel-cache/
```

---

## Step 6: Generate .env.example

Extract environment variables from existing `.env*` files:

```bash
# Find all .env files
find . -name ".env*" -type f -not -name ".env.example"
```

For each variable found, create placeholder:

```env
# ===========================================
# Environment Configuration
# ===========================================
# Copy this file to .env and fill in values
# ===========================================

# Database
DATABASE_URL=your_database_url_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# API Keys
VITE_API_KEY=your_api_key_here

# Feature Flags
VITE_ENABLE_ANALYTICS=true
```

**Rules:**
- Extract all variable names from existing .env files
- Replace values with placeholder descriptions
- Group by category where possible
- Add comments explaining each variable
- **NEVER include actual secret values**

---

## Step 7: Generate SETUP.md

Create setup instructions for the recipient:

```markdown
# Project Setup

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## Installation

1. Clone or extract this repository

2. Copy environment configuration:
   ```bash
   cp .env.example .env
   ```

3. Fill in environment variables in `.env`

4. Install dependencies:
   ```bash
   npm install
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run linter |
| `npm run test` | Run tests |

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components
├── hooks/          # Custom React hooks
├── utils/          # Utility functions
├── services/       # API services
└── types/          # TypeScript types
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
[Auto-generated from .env.example]

## Tech Stack

[Auto-detected from package.json dependencies]

## Notes

[Any special setup requirements or gotchas]
```

---

## Step 8: Update/Sanitize README.md

If README.md exists:
1. Remove any Claude/AI references
2. Ensure project description is accurate
3. Add link to SETUP.md
4. Verify tech stack info is current

If README.md doesn't exist, create a basic one:

```markdown
# [Project Name]

[Brief description from package.json or memory-bank]

## Getting Started

See [SETUP.md](./SETUP.md) for installation instructions.

## License

[License from LICENSE file or package.json]
```

---

## Step 9: Security Scan

Final security verification before packaging:

```
SECURITY SCAN
══════════════════════════════════════════════════════════════════════

Scanning handoff package for sensitive data...

[ ] No .env files included
[ ] No API keys in source code
[ ] No private keys or certificates
[ ] No hardcoded credentials
[ ] No internal URLs or IPs
[ ] No personal data or PII
[ ] No proprietary algorithms exposed
[ ] License file included

Result: [CLEAN / X issues found]
```

### If issues found:

```
⚠️ Security issues detected in handoff package:

1. [File: path] - [Issue description]
2. [File: path] - [Issue description]

These MUST be resolved before sharing the package.

Options:
```

Options:
- **Fix and re-scan** - Address issues and verify
- **Remove problematic files** - Exclude from package
- **Cancel handoff** - Abort the process

**Do NOT allow proceeding with security issues unless explicitly confirmed.**

---

## Step 10: Create Archive

**Skip if `--no-zip` specified.**

Create the zip archive:

```bash
# Navigate to parent of handoff folder
cd ..

# Create zip with best compression
zip -r -9 {project-name}-handoff-{YYYYMMDD}.zip {project-name}-handoff-{YYYYMMDD}/
```

**Naming convention:** `{project-name}-handoff-{YYYYMMDD}.zip`

Example: `wyceniator-handoff-20240115.zip`

---

## Step 11: Final Report

Display completion summary:

```
HANDOFF COMPLETE
══════════════════════════════════════════════════════════════════════

📦 Package: wyceniator-handoff-20240115.zip
📂 Folder:  ../wyceniator-handoff-20240115/
📊 Size:    2.4 MB (compressed)
📁 Files:   156 files included

────────────────────────────────────────────────────────────────────────

SANITIZATION SUMMARY
────────────────────────────────────────────────────────────────────────
Files scanned:        89
AI references removed: 12
Files cleaned:        8

────────────────────────────────────────────────────────────────────────

GENERATED FILES
────────────────────────────────────────────────────────────────────────
✓ .gitignore          Fresh gitignore
✓ .env.example        12 variables templated
✓ SETUP.md            Setup instructions

────────────────────────────────────────────────────────────────────────

EXCLUDED (saved space)
────────────────────────────────────────────────────────────────────────
✗ .claude/            24 files (156 KB)
✗ memory-bank/        8 files (45 KB)
✗ node_modules/       12,456 files (156 MB)
✗ .env                1 file (secrets)
✗ .git/               X MB (history)

────────────────────────────────────────────────────────────────────────

NEXT STEPS
────────────────────────────────────────────────────────────────────────
1. Verify .env.example has all required variables
2. Test: extract → npm install → npm run build
3. Send package to recipient with SETUP.md link

────────────────────────────────────────────────────────────────────────

Location: ../wyceniator-handoff-20240115.zip
```

---

## Dry Run Output

If `--dry-run` was specified, show preview instead of final report:

```
HANDOFF DRY RUN COMPLETE
══════════════════════════════════════════════════════════════════════

WOULD CREATE:
├── wyceniator-handoff-20240115/
│   ├── src/                    (45 files, 125 KB)
│   ├── public/                 (8 files, 24 KB)
│   ├── package.json            (sanitized)
│   ├── .gitignore              (generated)
│   ├── .env.example            (12 variables)
│   ├── SETUP.md                (generated)
│   ├── MANIFEST.md             (generated)
│   └── ...
└── wyceniator-handoff-20240115.zip (estimated ~2.4 MB)

WOULD EXCLUDE:
├── .claude/                    (24 files)
├── memory-bank/                (8 files)
├── node_modules/               (12,456 files, 156 MB)
├── .env                        (secrets)
└── .git/                       (history)

WOULD SANITIZE:
├── src/App.tsx:45              Remove "// Generated with Claude"
├── README.md:3                 Remove AI mention
├── package.json                Remove claude scripts
└── ...                         (12 references total)

WOULD GENERATE:
├── .gitignore                  Standard Node gitignore
├── .env.example                12 variables from .env
├── SETUP.md                    Setup documentation
└── MANIFEST.md                 Package manifest

────────────────────────────────────────────────────────────────────────

Run without --dry-run to execute.
```

---

## Error Handling

### If copy fails:

```
❌ Error copying files

[Error details]

Options:
- Retry - Try again
- Skip file - Continue without this file
- Abort - Cancel handoff
```

### If zip fails:

```
❌ Error creating archive

[Error details]

The handoff folder was created successfully at:
../wyceniator-handoff-20240115/

You can manually zip this folder or run /handoff --no-zip
```

---

## Customization

To customize handoff behavior, create `.claude/handoff.config.json`:

```json
{
  "include": [
    "custom-folder/",
    "special-config.json"
  ],
  "exclude": [
    "internal-docs/",
    "experiments/",
    "*.draft.*"
  ],
  "sanitize": {
    "patterns": [
      "INTERNAL:",
      "TODO(team):",
      "FIXME(internal)"
    ],
    "skipFiles": [
      "src/internal/**"
    ]
  },
  "generateDocs": true,
  "compressLevel": 9,
  "outputPath": "../handoffs/"
}
```

---

## Notes

- Always verify the package by extracting and building before sending
- Consider including a brief video walkthrough for complex projects
- For client handoffs, schedule a call to walk through the setup
- Keep a copy of the handoff package for your records
- If recipient reports issues, check MANIFEST.md for what was included
