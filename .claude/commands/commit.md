# Commit Command

A comprehensive pre-commit workflow that enforces quality gates, performs self-review, and ensures memory bank stays current.

**Supports arguments:**
- `--fast` (quick mode - essential checks only, tests on changed files)
- `--force` (emergency only, skips all checks with warning)
- `--help`, `-h`, `help` (show usage information)

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📚 /commit - Commit Command                                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Comprehensive pre-commit workflow that ensures code quality:       │
│  • Runs automated checks (lint, types, tests, security)             │
│  • Performs AI self-review against CLAUDE.md principles             │
│  • Updates Memory Bank documentation                                │
│  • Generates descriptive commit messages                            │
│  • Optionally pushes to remote                                      │
│                                                                     │
│  USAGE:                                                             │
│  /commit            Full quality gate workflow                      │
│  /commit --fast     Essential checks only (fast iteration)          │
│  /commit --force    Skip all checks (emergencies only!)             │
│  /commit --help     Show this help message                          │
│                                                                     │
│  SDLC PHASE: 🚀 Review & Deployment                                 │
│  ─────────────────────────────────────────────────────────────────  │
│  Final quality gate before code enters version control.             │
│  Ensures code meets all project standards.                          │
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
│  │ /commit         │ ◄── YOU ARE HERE                               │
│  └─────────────────┘                                                │
│           │                                                         │
│           ▼                                                         │
│      [Next feature] → continue development                          │
│                                                                     │
│  QUALITY CHECKS:                                                    │
│  • Lint          (⚠️ warning)                                       │
│  • npm audit     (❌ blocks on high/critical)                       │
│  • TypeScript    (❌ blocks on errors)                              │
│  • Tests         (❌ blocks on failures)                            │
│  • Coverage      (❌ blocks if <50%)                                │
│  • Secrets scan  (❌ blocks if found)                               │
│                                                                     │
│  FAST MODE (--fast):                                                │
│  Keeps only essential checks for quick iteration:                   │
│  • Secrets scan  (❌ blocks if found)                               │
│  • TypeScript    (❌ blocks on errors)                              │
│  • Tests         (changed files only)                               │
│                                                                     │
│  Skips: lint, npm audit, format, console.log, coverage,             │
│         self-review, memory-bank prompt                             │
│                                                                     │
│  WHEN TO USE:                                                       │
│  • After completing a feature                                       │
│  • After fixing bugs                                                │
│  • After passing /manual-test                                       │
│  • Before ending a coding session                                   │
│                                                                     │
│  NEXT STEP: Continue development or start next feature              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 0: Force Mode Check

If the command was invoked with `--force` argument:

```
⚠️ ═══════════════════════════════════════════════════════════════════ ⚠️
                        FORCE MODE ACTIVATED
⚠️ ═══════════════════════════════════════════════════════════════════ ⚠️

You are about to skip ALL quality checks. This means:
- No linting verification
- No security audit
- No type checking
- No test execution
- No coverage verification
- No self-review

This should ONLY be used in genuine emergencies (e.g., critical hotfix).

Are you absolutely sure?
```

Options:
- **No, run checks** (Recommended) - Cancel force mode, run normal workflow
- **Yes, skip everything** - Proceed without any checks

If "Yes, skip everything":
1. Log that force mode was used
2. Skip to Step 7 (Memory Bank Update)
3. Add `[FORCE COMMIT - checks skipped]` to commit message

---

## Step 0.5: Fast Mode Check

If the command was invoked with `--fast` argument:

```
⚡ ═══════════════════════════════════════════════════════════════════ ⚡
                         FAST MODE ACTIVATED
⚡ ═══════════════════════════════════════════════════════════════════ ⚡

Running essential checks only:
✓ Secrets scan (security)
✓ TypeScript (type safety)
✓ Tests (changed files only)

Skipping: lint, npm audit, format, console.log, coverage, self-review, memory-bank
```

Then proceed with:
1. Continue to Step 1 (Verify Staged Changes)
2. In Step 2, run ONLY: Secrets scan, TypeScript, Tests (with `--findRelatedTests` or `--related`)
3. Skip Steps 6-9.5 (warnings handling, self-review, user approval, memory-bank, ClickUp)
4. Continue from Step 10 (Generate Commit Message)
5. Add `[FAST MODE - limited checks]` to commit message

---

## Step 1: Verify Staged Changes

Check if there are staged changes:
```bash
git diff --cached --name-only
```

If no staged changes:
```
"No changes staged for commit. Would you like to:"
```

Options:
- **Stage all changes** - Run `git add -A`
- **Select files to stage** - Show list of modified files for selection
- **Cancel** - Abort commit workflow

---

## Step 2: Run Automated Checks

Run these checks, displaying progress. Run independent checks in parallel where possible.

### Check Availability First

Before running each check, verify the command exists. If not available, display:
```
⚠️ [check-name] skipped - command not available
```

### Checks to Run

| # | Check | Command | Blocking |
|---|-------|---------|----------|
| 1 | Lint | `npm run lint` | ⚠️ Warning |
| 2 | npm audit | `npm audit --json` | ⚠️/❌ See below |
| 3 | TypeScript | `npm run tsc` or `npx tsc --noEmit` | ❌ Blocking |
| 4 | Tests | `npm test` | ❌ Blocking |
| 5 | Coverage | Parse from test output | ⚠️/❌ See below |
| 6 | Format | `npm run format:check` or `npx prettier --check .` | ⚠️ Warning |
| 7 | console.log | Grep staged files | ⚠️ Warning |
| 8 | Secrets | Grep staged files for patterns | ❌ Blocking |

### Fast Mode Checks (--fast)

If `--fast` flag is active, run ONLY these checks:

| # | Check | Command | Blocking |
|---|-------|---------|----------|
| 1 | TypeScript | `npm run tsc` or `npx tsc --noEmit` | ❌ Blocking |
| 2 | Tests | `npm test -- --findRelatedTests <staged-files>` | ❌ Blocking |
| 3 | Secrets | Grep staged files for patterns | ❌ Blocking |

**Getting staged files for related tests:**
```bash
git diff --cached --name-only --diff-filter=ACMR | grep -E '\.(ts|tsx|js|jsx)$'
```

**Test commands by framework:**
- **Jest:** `npm test -- --findRelatedTests file1.ts file2.ts`
- **Vitest:** `npm test -- --related file1.ts file2.ts`

If no test files are related to staged changes, skip the test step with:
```
ℹ️ Tests skipped - no related test files for staged changes
```

---

## Step 3: Check Result Details

### 3.1 Lint Results

If lint fails:
```
⚠️ Lint Issues Found

[Show lint output summary]

These are warnings only. You may continue, but consider fixing them.
```

### 3.2 npm audit Results

Parse `npm audit --json` output for severity levels.

**If high or critical vulnerabilities found:**
```
❌ Security Vulnerabilities Detected

Found [X] high/critical severity vulnerabilities:
[List vulnerability names and affected packages]

Suggested actions:
1. Run: npm audit fix
2. If that doesn't work: npm audit fix --force (may have breaking changes)
3. If still unresolved: Contact tech lead for guidance

Cannot proceed until resolved.
```
BLOCK the commit.

**If only low/moderate:**
```
⚠️ Security Advisory

Found [X] low/moderate severity vulnerabilities.
Consider running 'npm audit fix' when convenient.
```
Warning only, allow continue.

### 3.3 TypeScript Results

If TypeScript compilation fails:
```
❌ TypeScript Errors

[Show tsc error output]

Cannot proceed until type errors are fixed.

⚠️ Important: Do NOT fix type errors by adding 'any'.
Using 'any' defeats the purpose of TypeScript and hides potential bugs.
Instead:
- Define proper interfaces/types
- Use unknown + type guards if type is truly unknown
- Use generics for flexible typing
```
BLOCK the commit.

### 3.4 Test Results

If tests fail:
```
❌ Test Failures

[Show failed test summary]

Cannot proceed until tests pass.
```
BLOCK the commit.

### 3.5 Coverage Results

Parse coverage from test output (look for "Coverage" or similar).

**Coverage >= 80%:**
```
✅ Coverage: [X]%
```

**Coverage 50-79%:**
```
⚠️ Coverage: [X]% (below 80% target)

Consider adding more tests to improve coverage.
```
Warning, allow continue.

**Coverage < 50%:**
```
❌ Coverage: [X]% (critically low)

Coverage is below 50% minimum threshold.
Add tests before committing.
```
BLOCK the commit.

### 3.6 Format Check Results

If formatting issues found:
```
⚠️ Formatting Issues

The following files have formatting issues:
[List files]

Run 'npm run format' to fix automatically.
```
Warning only.

### 3.7 console.log Detection

Search staged files (excluding tests and configs) for:
- `console.log`
- `console.warn`
- `console.error`
- `console.debug`

If found:
```
⚠️ Console Statements Found

Found console statements in:
- src/components/Button.tsx:42 - console.log
- src/utils/api.ts:15 - console.error

Suggestion: Use a custom logger instead of console statements.
```
Warning only.

**Exclude patterns:**
- `*.test.*`
- `*.spec.*`
- `*.config.*`
- `vite.config.*`
- `jest.config.*`

### 3.8 Secrets Scan

Search staged diff for potential secrets:
- API keys: `/['"](sk-|pk-|api[_-]?key)[a-zA-Z0-9]{20,}['"]/i`
- Passwords: `/password\s*[:=]\s*['"][^'"]+['"]/i`
- Tokens: `/token\s*[:=]\s*['"][^'"]+['"]/i`
- Private keys: `/-----BEGIN.*PRIVATE KEY-----/`

If found:
```
❌ Potential Secrets Detected

WARNING: Possible sensitive data in staged files:
- src/config.ts:12 - Looks like an API key
- .env.local:3 - Password value

NEVER commit secrets to version control.
Move sensitive values to environment variables.
```
BLOCK the commit.

---

## Step 4: Display Results Summary

Show a summary table:

```
┌─────────────────┬────────┬─────────────────────────────┐
│ Check           │ Status │ Details                     │
├─────────────────┼────────┼─────────────────────────────┤
│ Lint            │ ⚠️     │ 3 warnings                  │
│ npm audit       │ ✅     │ No vulnerabilities          │
│ TypeScript      │ ✅     │ No errors                   │
│ Tests           │ ✅     │ 42 passed                   │
│ Coverage        │ ⚠️     │ 72% (target: 80%)           │
│ Format          │ ✅     │ All files formatted         │
│ console.log     │ ⚠️     │ 2 occurrences               │
│ Secrets         │ ✅     │ None detected               │
└─────────────────┴────────┴─────────────────────────────┘
```

---

## Step 5: Handle Blocking Issues

If ANY blocking checks failed (❌), stop here:

```
❌ Cannot proceed with commit

The following blocking issues must be resolved:
- [List failed blocking checks]

Please fix these issues and run /commit again.
```

Do NOT continue to the next step.

---

### Fast Mode Skip (--fast)

If `--fast` flag is active and no blocking issues:
- Skip Step 6 (Handle Warnings) - no warning checks ran
- Skip Step 7 (Pętla Zwrotna / Self-Review)
- Skip Step 8 (User Approval)
- Skip Step 9 (Memory Bank Update)
- Skip Step 9.5 (ClickUp Task Update)
- **Continue directly to Step 10 (Generate Commit Message)**

---

## Step 6: Handle Warnings

If there are warnings but no blocking issues:

```
⚠️ Warnings Found

There are [X] warnings that should be addressed:
- [List warnings]

How would you like to proceed?
```

Options:
- **Fix warnings first** - Stop to address issues
- **Continue with warnings** - Proceed despite warnings

If "Continue with warnings": Note this in the commit message footer.

---

## Step 7: Pętla Zwrotna (Claude Self-Review)

Perform a self-review of the staged changes by analyzing `git diff --cached`.

### Review Checklist

**Read CLAUDE.md first** to understand project-specific principles, then evaluate the diff against these dimensions:

---

#### 1. Planning & Process (CLAUDE.md: "Always start with a plan")
- [ ] Was this change planned before implementation?
- [ ] If major feature: Was it prototyped first before scaling?
- [ ] If errors/loops occurred: Were changes rolled back and re-planned?

#### 2. TDD Compliance (CLAUDE.md: "TDD is mandatory")
- [ ] **RED**: Were failing tests written first?
- [ ] **GREEN**: Is code minimal to make tests pass?
- [ ] **REFACTOR**: Was code cleaned up while keeping tests green?
- [ ] All new logic covered by unit tests?
- [ ] Integration tests added where needed?
- [ ] Edge cases considered and tested?
- [ ] Tests are meaningful (not just for coverage)?

#### 3. Code Quality Principles (CLAUDE.md: "KISS, SOLID, DRY, YAGNI")
- [ ] **KISS**: Is the solution as simple as possible?
- [ ] **SOLID**: Single responsibility, open/closed, etc.?
- [ ] **DRY**: No code duplication?
- [ ] **YAGNI**: No unnecessary features or abstractions?
- [ ] **No over-engineering**: Solving the problem, not hypothetical future problems?
- [ ] **Readability**: Clear naming, logical structure?
- [ ] **No `any` types**: Using proper TypeScript types?

#### 4. Component Reuse (CLAUDE.md: "Prioritize reuse of components")
- [ ] Checked for existing components before creating new ones?
- [ ] If new component: Is it justified and documented?
- [ ] Architectural choices verified against memory-bank/systemPatterns.md?

#### 5. File Size & Refactoring (CLAUDE.md: "Check file sizes and refactor")
- [ ] No files becoming too large (>300 lines)?
- [ ] If major feature: Immediate refactoring done if needed?
- [ ] Code organized into appropriate modules?

#### 6. Logging (CLAUDE.md: "Use custom logging, not console.log")
- [ ] No console.log/warn/error in production code?
- [ ] Using proper logging functions (database/custom logger)?
- [ ] Debug statements removed?

#### 7. Security
- [ ] No hardcoded secrets or credentials?
- [ ] Input validation where needed?
- [ ] No SQL injection / XSS vulnerabilities?
- [ ] Sensitive data handled appropriately?

#### 8. Maintainability (CLAUDE.md: "Prioritize maintainability and simplicity")
- [ ] Code is easy to understand for future developers?
- [ ] Comments only where logic isn't self-evident?
- [ ] No clever tricks that sacrifice readability?
- [ ] Changes don't introduce technical debt?

#### 9. Memory Bank Alignment (CLAUDE.md: "Keep memory-bank current")
- [ ] Changes align with memory-bank/projectbrief.md scope?
- [ ] Follows patterns in memory-bank/systemPatterns.md?
- [ ] memory-bank needs updating after this commit?

#### 10. Todo Alignment
- [ ] Changes correspond to tracked todo items?
- [ ] No unrelated changes mixed in?
- [ ] All committed todos can be marked complete?

#### 11. Self-Critical Evaluation (CLAUDE.md: "Self-check and critically evaluate")
- [ ] Have I challenged my own assumptions?
- [ ] Is this the best approach, or just the first one I thought of?
- [ ] Would I approve this in a code review from someone else?

### Categorize and Present Findings

After review, categorize findings:

```
## Self-Review Results

### Critical Issues (must fix)
- [Security/breaking/logic issues if any]

### Important Issues (should fix)
- [Code quality, missing tests if any]

### Suggestions (nice to have)
- [Minor improvements if any]

### Positive Observations
- [What was done well]

---
Summary: [X] critical, [Y] important, [Z] suggestions
```

---

## Step 8: User Approval (CRITICAL - Always Ask)

After presenting self-review results, ALWAYS ask:

```
How would you like to proceed?
```

Options:
- **Fix issues first** (Recommended) - Stop and address findings before committing
- **Continue anyway** - Proceed despite issues

**If user selects "Continue anyway":**
1. Acknowledge that issues were reviewed but deferred
2. Add to commit message footer: `[Self-review: X issues acknowledged but deferred]`
3. Proceed to next step

**Never auto-proceed past this step.**

---

## Step 9: Memory Bank Update

Check if memory-bank files might need updating based on the changes:

```
The following memory-bank files may need updating based on your changes:

- activeContext.md - Update current work status
- progress.md - Mark completed items, note any blockers
- systemPatterns.md - (if architecture changed)

Would you like to update memory-bank before committing?
```

Options:
- **Yes, update now** - Open relevant files for updates
- **No, commit as-is** - Skip memory-bank update

If "Yes": Guide through updating each relevant file, then return to commit flow.

If "No" but significant changes detected:
```
⚠️ Reminder: Keeping memory-bank current helps maintain context across sessions.
Consider updating after this commit.
```

---

## Step 9.5: ClickUp Task Update (Conditional)

Check if ClickUp integration is configured by reading `memory-bank/integrations/clickup.md`.

**If Status is "Not Configured"**: Skip this step entirely.

**If ClickUp is configured**:

### 9.5.1 Detect Related Tasks

Look for task references in:
1. **Branch name**: Parse for task IDs (e.g., `feature/TASK-123-login`, `bugfix/CU-abc123`)
2. **Staged changes**: Check for #TASK-ID or CU-xxx references in code comments
3. **activeContext.md**: Check for current task being worked on

```
Checking for related ClickUp tasks...
```

### 9.5.2 Task Found

If related task detected:

```
ClickUp Task Detected

Task: [Task Name] (ID: [task_id])
Current Status: [status]

This commit appears related to this task.
How would you like to update it?
```

Options:
- **Mark as Done** - Set task status to complete
- **Add Comment** - Add commit info as comment only
- **Update to In Review** - Change status to "in review"
- **Skip** - Don't update ClickUp

### 9.5.3 No Task Found

If no task reference found but ClickUp is configured:

```
No ClickUp task detected for this commit.

Would you like to:
```

Options:
- **Link to existing task** - Search and select a task
- **Create new task** - Create task from commit
- **Skip** - Continue without ClickUp update

### 9.5.4 Apply Update

Based on selection:

**If "Mark as Done"**:
Use MCP tool: `clickup_update_task`
- Set status to "complete"

**If "Add Comment"**:
Use MCP tool: `clickup_create_task_comment`
```
Commit: [short hash]
Message: [commit message]
Files changed: [count]
Branch: [branch name]
```

**If "Update to In Review"**:
Use MCP tool: `clickup_update_task`
- Set status to "in review"

**If "Link to existing task"**:
Use MCP tool: `clickup_get_tasks` to search
Display list for selection, then add comment

**If "Create new task"**:
Use MCP tool: `clickup_create_task`
- Name from commit message
- Description from changed files

Display confirmation:
```
ClickUp updated successfully!
Task: [Task Name]
Action: [what was done]
URL: [ClickUp URL]
```

---

## Step 10: Generate Commit Message

Analyze the staged diff and recent commits to generate a commit message.

```bash
# Get recent commit style
git log --oneline -5

# Get staged changes
git diff --cached --stat
```

Present generated message:

```
Suggested commit message:

───────────────────────────────────────
feat: add user authentication flow

- Implement login form with email/password
- Add AuthContext provider
- Create protected route wrapper
- Add logout functionality

[Any warnings or self-review notes added here]
───────────────────────────────────────

Options:
```

**Fast Mode Footer:**
If `--fast` flag was used, add to commit message footer:
```
[FAST MODE - limited checks]
```

Options:
- **Use this message** - Proceed with suggested message
- **Edit message** - Modify before committing

---

## Step 11: Execute Commit

```bash
git commit -m "<message>"
```

Confirm success:
```
✅ Commit created successfully

Commit: [short hash]
Message: [first line of message]
Files: [X] files changed, [Y] insertions(+), [Z] deletions(-)
```

---

## Step 12: Push to Remote

Check if remote is configured:
```bash
git remote -v
```

If remote exists:
```
Ready to push to remote?
```

Options:
- **Push now** (Recommended) - Push immediately
- **Skip push** - Don't push yet

**If "Skip push" selected:**
```
⚠️ Warning: Unpushed commits can lead to:
- Lost work if local issues occur
- Merge conflicts accumulating
- Team not seeing your progress

Are you sure you want to skip pushing?
```

Options:
- **Push anyway** - Changed my mind, push now
- **I'll push later** - Skip (with reminder logged)

If pushing:
```bash
git push
```

---

## Step 12.5: Netlify Deployment (Conditional)

Check if Netlify is configured by reading `memory-bank/integrations/netlify.md`.

**If not configured (file missing or Status: "Not Configured"):**

```
Netlify deployment is not configured.

Would you like to set it up now?
```

Options:
- **Yes, configure Netlify** - Go to 12.5.1
- **No, skip** - Continue to Step 13

### 12.5.1 Netlify Setup Flow

1. Add Netlify MCP to `.mcp.json`:

   **Windows:**
   ```json
   "netlify": {
     "command": "cmd",
     "args": ["/c", "npx", "-y", "@netlify/mcp"]
   }
   ```

   **Mac/Linux:**
   ```json
   "netlify": {
     "command": "npx",
     "args": ["-y", "@netlify/mcp"]
   }
   ```

2. Update `memory-bank/integrations/netlify.md` with Status: Configured

3. Display:
   ```
   Netlify MCP configured!

   Please restart Claude Code to load the MCP server.
   Deployment will be available on your next commit.
   ```

4. Continue to Step 13

### 12.5.2 Deploy Offer (if configured)

```
Netlify Deployment

Would you like to deploy to Netlify?
```

Options:
- **Deploy to Production** - Publish to live site
- **Deploy Draft (Preview)** - Create preview URL only
- **Skip deployment** - Continue to Step 13

### 12.5.3 Execute Deployment

**If Production selected:**
```
Deploying to PRODUCTION

This will update your live site. Are you sure?
```

Options:
- **Yes, deploy** - Proceed with production deploy
- **Make it a draft instead** - Switch to draft deploy
- **Cancel** - Skip deployment

Use Netlify MCP to deploy with appropriate `production: true/false` flag.

Display progress:
```
Deploying to Netlify...
```

### 12.5.4 Deployment Result

**Success:**
```
Netlify Deployment Successful

Type: [Production / Draft]
URL: [deploy_url]
Deploy ID: [deploy_id]
```

**Failure:**
```
Netlify Deployment Failed

Error: [error_message]

Would you like to:
```

Options:
- **View logs** - Show detailed error logs
- **Retry** - Try deployment again
- **Skip** - Continue to Step 13

---

## Step 13: Summary

Display final summary:

```
✅ Commit Workflow Complete

┌─────────────────────────────────────────────────────────┐
│ Commit: abc1234                                         │
│ Message: feat: add user authentication flow             │
│ Branch: feature/auth                                    │
│ Files: 5 changed                                        │
│ Pushed: ✅ Yes                                          │
│ Mode: ⚡ Fast | 🔒 Full | ⚠️ Force                       │
│                                                         │
│ Checks: 6 passed, 2 warnings                            │
│ Self-review: 0 critical, 1 important, 2 suggestions     │
│ Memory-bank: Updated                                    │
│ Netlify: ✅ Deployed (production) | ⏭️ Skipped | ⚪ N/A  │
└─────────────────────────────────────────────────────────┘

[If any deferred items]
📝 Remember to address deferred items:
- [List of deferred warnings/issues]
```

**Mode indicators:**
- `⚡ Fast` - Fast mode (--fast), essential checks only
- `🔒 Full` - Normal mode, all checks ran
- `⚠️ Force` - Force mode (--force), checks skipped

---

## Error Handling

### If any step fails unexpectedly:

```
❌ Error during [step name]

[Error details]

Options:
- **Retry** - Try this step again
- **Skip** - Continue to next step (if possible)
- **Abort** - Cancel commit workflow
```

### If git operations fail:

```
❌ Git Error

[Git error message]

Common solutions:
- If merge conflict: resolve conflicts first
- If detached HEAD: checkout a branch
- If push rejected: pull and merge first

Would you like to abort the commit workflow?
```

---

## Notes

- All checks require the project to have npm/node installed
- TypeScript check requires tsconfig.json in project
- Coverage parsing depends on test framework output format
- Secrets scan uses pattern matching - may have false positives
- Always manually review AI-generated commit messages before accepting
- Netlify MCP requires Node.js 22+ for best results
- Netlify deployment requires @netlify/mcp server to be configured in .mcp.json
