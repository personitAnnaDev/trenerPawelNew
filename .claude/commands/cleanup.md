# Cleanup Command - Codebase Dead Code Removal

Analyze and safely remove dead code from the codebase with triple verification and user approval.

**Supports arguments:**
- `--dry-run` - Analyze only, no removals (default)
- `--execute` - Actually remove approved code
- `--scope <path>` - Limit analysis to specific path
- `--help`, `-h`, `help` - Show usage information

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🧹 /cleanup - Codebase Cleanup Command                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ⚠️  SAFETY FIRST - This command is CONSERVATIVE by default         │
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Analyzes codebase for potentially dead code and helps you safely   │
│  remove it with triple verification and explicit user approval.     │
│                                                                     │
│  USAGE:                                                             │
│  /cleanup              Analyze only (dry-run, safe)                 │
│  /cleanup --execute    Remove approved items (requires confirmation)│
│  /cleanup --scope src/utils  Limit to specific directory            │
│  /cleanup --help       Show this help message                       │
│                                                                     │
│  ANALYSIS TYPES:                                                    │
│  • Unused exports (functions, classes, constants not imported)      │
│  • Unreachable code paths                                           │
│  • Orphaned files (no imports pointing to them)                     │
│  • Deprecated features (code for removed requirements)              │
│                                                                     │
│  SAFETY FEATURES:                                                   │
│  • Triple verification before ANY recommendation                    │
│  • Confidence scores (0-1) for each finding                         │
│  • Per-item user approval required                                  │
│  • Git backup created before removal                                │
│  • Conservative - prefers false negatives over false positives      │
│                                                                     │
│  SDLC PHASE: 🔧 Maintenance                                         │
│  ─────────────────────────────────────────────────────────────────  │
│  Use periodically to keep codebase clean. Never use on             │
│  production-critical code without thorough review.                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 0: Safety Warning

```
⚠️ ══════════════════════════════════════════════════════════════════ ⚠️
                    CODEBASE CLEANUP - SAFETY NOTICE
⚠️ ══════════════════════════════════════════════════════════════════ ⚠️

This command will analyze your codebase for potentially dead code.

IMPORTANT:
• Default mode is DRY-RUN (analysis only, no changes)
• All findings require YOUR explicit approval before removal
• When in doubt, code is marked as SAFE (not recommended for removal)
• A git backup is created before any removal

Continue with analysis?
```

Options:
- **Yes, analyze my codebase** - Proceed with analysis
- **Cancel** - Stop execution

---

## Step 1: Scope Selection

Ask user to define analysis scope:

```
ANALYSIS SCOPE
══════════════════════════════════════════════════════════════════════

Which parts of the codebase should I analyze?
```

Options:
- **src/ only (Recommended)** - Analyze source code only
- **Entire project** - Analyze everything except node_modules
- **Custom path** - Specify directories to include

If custom, ask for paths.

### Exclusions

Always exclude:
- `node_modules/`
- `.git/`
- `dist/` and `build/`
- `coverage/`
- Test files (unless explicitly included)

Ask about additional exclusions:
- **Skip test files** (default: yes)
- **Skip config files** (default: yes)
- **Custom patterns to exclude**

---

## Step 2: Dead Code Analysis

```
ANALYZING CODEBASE
══════════════════════════════════════════════════════════════════════

Scanning for potentially dead code...
```

### 2.1 Find Unused Exports

```bash
# List all exports
grep -r "export " src/ --include="*.ts" --include="*.tsx"

# For each export, check if it's imported anywhere
grep -r "import.*{.*ExportName.*}" src/ --include="*.ts" --include="*.tsx"
```

### 2.2 Find Orphaned Files

```bash
# List all files
find src -type f -name "*.ts" -o -name "*.tsx"

# Check if each file is imported anywhere
grep -r "from.*filename" src/ --include="*.ts" --include="*.tsx"
```

### 2.3 Compare with Documentation

If `memory-bank/` or `.spec-workflow/specs/` exists:
- Read feature lists from documentation
- Compare with actual code
- Flag code for features not in current requirements

---

## Step 3: Triple Verification (CRITICAL)

For EACH potential dead code item, perform ALL THREE checks:

### Check 1: Static Import Analysis
```
Is this imported/used anywhere in the codebase?
- Direct imports
- Re-exports
- Index files
```

### Check 2: Runtime Reference Analysis
```
Could this be used at runtime without static imports?
- Dynamic imports: import()
- String references: require(variable)
- Reflection patterns
- Config-driven loading
```

### Check 3: Dynamic Usage Analysis
```
Could this be used dynamically?
- Event handlers attached by string
- Plugin systems
- External API consumers
- Test utilities
```

### Confidence Scoring

| Confidence | Meaning | Action |
|------------|---------|--------|
| 0.9-1.0 | Very likely dead | Recommend removal |
| 0.7-0.9 | Probably dead | Suggest review |
| 0.5-0.7 | Uncertain | Flag for manual check |
| 0.0-0.5 | Likely used | Do NOT recommend |

**RULE: If ANY check is uncertain, confidence = 0.5 (not recommended)**

---

## Step 4: Present Findings

Display all findings grouped by confidence:

```
ANALYSIS RESULTS
══════════════════════════════════════════════════════════════════════

HIGH CONFIDENCE (0.9+) - Likely safe to remove
────────────────────────────────────────────────────────────────────────

1. [0.95] src/utils/oldHelper.ts
   Function: formatDateOld()
   Reason: No imports found, no runtime references, no dynamic usage
   Lines: 45-67 (22 lines)

2. [0.92] src/components/DeprecatedButton.tsx
   Component: DeprecatedButton
   Reason: Not imported anywhere, not in any route
   Lines: 1-89 (entire file)

MEDIUM CONFIDENCE (0.7-0.9) - Review recommended
────────────────────────────────────────────────────────────────────────

3. [0.78] src/services/legacyApi.ts
   Function: fetchOldEndpoint()
   Reason: No direct imports, but similar function name in configs
   Lines: 23-45

LOW CONFIDENCE (0.5-0.7) - Manual verification needed
────────────────────────────────────────────────────────────────────────

4. [0.55] src/hooks/useOldState.ts
   Hook: useOldState
   Reason: Not imported, but hook naming suggests possible dynamic use
   Lines: 1-34

NOT RECOMMENDED (<0.5) - Likely still in use
────────────────────────────────────────────────────────────────────────
[Items here are shown for transparency but NOT suggested for removal]

────────────────────────────────────────────────────────────────────────

SUMMARY
────────────────────────────────────────────────────────────────────────
High confidence:   2 items (111 lines)
Medium confidence: 1 item (22 lines)
Low confidence:    1 item (34 lines)
Not recommended:   5 items (preserved)

Total removable:   ~167 lines (if all approved)
```

---

## Step 5: User Approval

**If `--dry-run` or no `--execute` flag:**

```
DRY RUN COMPLETE
══════════════════════════════════════════════════════════════════════

Analysis complete. No changes made.

To remove approved items, run:
/cleanup --execute

Or manually review and remove items from the list above.
```

**STOP here for dry-run.**

---

**If `--execute` flag:**

For EACH high/medium confidence item, ask individually:

```
ITEM 1 of 3
────────────────────────────────────────────────────────────────────────

File: src/utils/oldHelper.ts
Item: formatDateOld()
Confidence: 0.95
Lines: 45-67

Verification:
✓ No static imports
✓ No runtime references
✓ No dynamic usage patterns

Remove this code?
```

Options:
- **Yes, remove** - Add to removal list
- **No, keep** - Preserve this code
- **Show code** - Display the actual code before deciding

---

## Step 6: Execute Removal

### 6.1 Create Backup

```bash
git stash push -m "cleanup-backup-$(date +%Y%m%d-%H%M%S)"
```

```
BACKUP CREATED
══════════════════════════════════════════════════════════════════════

Backup: cleanup-backup-20240115-143052
Restore with: git stash pop
```

### 6.2 Remove Approved Items

For each approved item:
1. Read the file
2. Remove the specified lines/function/component
3. If entire file is empty, delete file
4. Verify file still compiles

### 6.3 Verify Build

```bash
npm run build
```

If build fails:
```
⚠️ BUILD FAILED AFTER REMOVAL
══════════════════════════════════════════════════════════════════════

The build failed after removing code. This suggests the removed code
was actually in use.

Restoring backup...
git stash pop

Please review the findings manually.
```

---

## Step 7: Summary Report

```
CLEANUP COMPLETE
══════════════════════════════════════════════════════════════════════

REMOVED
────────────────────────────────────────────────────────────────────────
✓ src/utils/oldHelper.ts:formatDateOld() (22 lines)
✓ src/components/DeprecatedButton.tsx (entire file, 89 lines)

PRESERVED (user decision)
────────────────────────────────────────────────────────────────────────
○ src/services/legacyApi.ts:fetchOldEndpoint()

STATISTICS
────────────────────────────────────────────────────────────────────────
Lines removed:    111
Files modified:   1
Files deleted:    1
Build status:     ✓ Passing

BACKUP
────────────────────────────────────────────────────────────────────────
Backup available: git stash pop
Remove backup:    git stash drop

────────────────────────────────────────────────────────────────────────

Codebase cleanup complete!
```

---

## Safety Rules

1. **NEVER remove code automatically** - Always require explicit user approval
2. **NEVER recommend removal if uncertain** - False negatives are better than false positives
3. **ALWAYS create backup** - Before any removal
4. **ALWAYS verify build** - After removals
5. **ALWAYS restore on failure** - If build breaks

---

## Notes

- Run periodically (monthly) to keep codebase clean
- Review low-confidence items manually
- Consider running after major refactors
- Keep backup for 1-2 weeks before discarding
