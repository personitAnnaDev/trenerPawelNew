# Manual Testing Command

A comprehensive manual testing workflow that generates test cases for developers to verify functionality. This command emphasizes that **the developer is ultimately responsible for testing their own code**.

**Usage:**
- `/manual-test` - Test recent changes (staged, unstaged, or last commit)
- `/manual-test full` - Full E2E testing of the entire application
- `/manual-test <feature>` - Test a specific feature or area
- `/manual-test auto` - Run automated browser tests using Claude Chrome integration
- `/manual-test auto full` - Run full automated E2E tests
- `/manual-test --help` - Show help information (also: `-h`, `help`)

**Arguments:** `$ARGUMENTS`

## Arguments Reference

| Argument | Aliases | Description |
|----------|---------|-------------|
| *(empty)* | `recent` | Test recent changes from git (staged, unstaged, or last commit) |
| `full` | `e2e` | Complete E2E testing of the entire application |
| `<feature>` | - | Test a specific feature area (e.g., `login`, `checkout`, `dashboard`) |
| `auto` | - | Automated browser testing using Claude Chrome integration (recent changes) |
| `auto full` | - | Automated full E2E testing in Chrome browser |
| `--help` | `-h`, `help` | Display help information and stop execution |

### Auto Mode Requirements

For `auto` and `auto full` modes:
- Claude in Chrome Extension v1.0.36+
- Claude Code CLI v2.0.73+ (run `claude update` if needed)
- Paid Claude plan (Pro, Team, or Enterprise)
- Chrome browser running and visible (not headless)

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  📚 /manual-test - Manual Testing Command                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Generates comprehensive test cases and checklists for manual       │
│  verification. Emphasizes developer responsibility - automated      │
│  tests catch regressions, but humans verify correctness.            │
│                                                                     │
│  USAGE:                                                             │
│  /manual-test              Test recent changes                      │
│  /manual-test full         Full E2E application testing             │
│  /manual-test <feature>    Test specific feature area               │
│  /manual-test auto         Automated browser testing (recent)       │
│  /manual-test auto full    Automated browser testing (full E2E)     │
│  /manual-test --help       Show this help message                   │
│                                                                     │
│  EXAMPLES:                                                          │
│  /manual-test              After coding, before commit              │
│  /manual-test full         Before major release                     │
│  /manual-test login        Test only authentication flow            │
│  /manual-test auto         Let Claude test in browser               │
│                                                                     │
│  SDLC PHASE: ✅ Testing & QA                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  Quality assurance phase. Run after implementing features and       │
│  before committing code to ensure everything works correctly.       │
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
│  │ /manual-test    │ ◄── YOU ARE HERE                               │
│  └────────┬────────┘                                                │
│           ▼                                                         │
│  ┌─────────────────┐                                                │
│  │ /commit         │  Code review & commit                          │
│  └─────────────────┘                                                │
│                                                                     │
│  WHEN TO USE:                                                       │
│  • After implementing any feature                                   │
│  • Before running /commit                                           │
│  • After fixing bugs                                                │
│  • Before merging PRs                                               │
│  • During code review                                               │
│                                                                     │
│  GENERATES:                                                         │
│  • Test case checklists                                             │
│  • Edge case scenarios                                              │
│  • Bug report templates                                             │
│  • DevTools verification steps                                      │
│                                                                     │
│  NEXT STEP: Run /commit when all tests pass                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Core Philosophy

```
⚠️ ═══════════════════════════════════════════════════════════════════ ⚠️
                    DEVELOPER RESPONSIBILITY NOTICE
⚠️ ═══════════════════════════════════════════════════════════════════ ⚠️

Automated tests catch regressions, but they CANNOT replace human testing.

YOU are responsible for:
✓ Verifying your changes work as intended
✓ Testing edge cases that automated tests might miss
✓ Checking visual appearance and UX
✓ Ensuring the app feels right to a real user

No code should be considered "done" until YOU have manually tested it.
```

---

## Mode Selection

Based on `$ARGUMENTS`:

### If empty or "recent":
→ Go to **Part A: Recent Changes Testing**

### If "full" or "e2e":
→ Go to **Part B: Full E2E Testing**

### If "auto" or "auto recent":
→ Go to **Part C: Automated Browser Testing** (recent changes)

### If "auto full":
→ Go to **Part C: Automated Browser Testing** (full E2E)

### If specific feature mentioned:
→ Go to **Part A** but focus on the specified feature area

---

# Part A: Recent Changes Testing

Run this after every significant code change, ideally before each commit.

---

## Step 1: Analyze Recent Changes

### 1.1 Check Git Status

```bash
git status --short
git diff --name-only
git diff --cached --name-only
```

### 1.2 If No Changes, Check Last Commit

```bash
git diff HEAD~1 --name-only
git log -1 --pretty=format:"%s"
```

### 1.3 Categorize Changed Files

Group files by type:
- **Pages**: `src/pages/*.tsx` - Need full page testing
- **Components**: `src/components/*.tsx` - Need component-specific testing
- **Hooks**: `src/hooks/*.ts` - Need behavior testing
- **Utils**: `src/utils/*.ts` - Usually covered by unit tests
- **Styles**: `*.css`, `tailwind.config.*` - Need visual testing
- **API/Services**: `src/services/*.ts`, `src/api/*.ts` - Need integration testing
- **Config**: `*.config.*`, `.env*` - Need environment verification

Display summary:
```
📋 Changes Detected

Files changed: [X]

By category:
- Pages: [list]
- Components: [list]
- Hooks: [list]
- Other: [list]

Commit message (if applicable): "[message]"
```

---

## Step 2: Generate Test Cases

Based on the changed files, generate specific test cases.

### 2.1 Read Changed Files

For each changed file, read its content to understand:
- What UI elements are rendered
- What user interactions are possible
- What data is displayed or submitted
- What states exist (loading, error, success, empty)
- What edge cases might occur

### 2.2 Generate Test Cases

Present test cases in this format:

```
🧪 ═══════════════════════════════════════════════════════════════════
                    MANUAL TEST CASES - RECENT CHANGES
═══════════════════════════════════════════════════════════════════════

📁 [FileName.tsx]
────────────────────────────────────────────────────────────────────────

□ TC-001: [Test case name]
  Steps:
    1. [Step 1]
    2. [Step 2]
    3. [Step 3]
  Expected: [What should happen]

□ TC-002: [Test case name]
  Steps:
    1. [Step 1]
    2. [Step 2]
  Expected: [What should happen]

[Continue for each changed file...]
```

### 2.3 Test Case Categories

For each component/page, consider these categories:

**Happy Path:**
- [ ] Normal user flow works as expected
- [ ] Data displays correctly
- [ ] Form submissions succeed
- [ ] Navigation works

**Input Validation:**
- [ ] Required fields show errors when empty
- [ ] Invalid input shows appropriate error messages
- [ ] Valid input is accepted
- [ ] Edge cases (very long text, special characters, etc.)

**States:**
- [ ] Loading state displays correctly
- [ ] Empty state displays correctly
- [ ] Error state displays correctly
- [ ] Success state displays correctly

**Interactions:**
- [ ] All buttons are clickable and respond
- [ ] Hover states work
- [ ] Focus states are visible (keyboard navigation)
- [ ] Disabled states prevent interaction

**Responsive:**
- [ ] Desktop (1920px, 1440px, 1024px)
- [ ] Tablet (768px)
- [ ] Mobile (375px, 320px)

---

## Step 3: Browser DevTools Check

Instruct developer:

```
🔧 DevTools Verification

Before testing, open browser DevTools (F12) and check:

Console Tab:
□ No JavaScript errors (red)
□ No React warnings (yellow)
□ No failed network requests

Network Tab:
□ All API calls return expected status codes
□ No CORS errors
□ No hanging requests

Performance (optional):
□ Page loads in < 3 seconds
□ No layout shifts during load
```

---

## Step 4: Present Testing Checklist

```
📝 YOUR TESTING CHECKLIST

Instructions:
1. Start the dev server: npm run dev
2. Open the app in browser
3. Go through each test case below
4. Mark [x] for pass, [!] for fail with notes

────────────────────────────────────────────────────────────────────────

[Generated test cases from Step 2]

────────────────────────────────────────────────────────────────────────

⏱️ Estimated testing time: [X] minutes

After testing:
- If all passed → Ready for /commit
- If failures → Fix issues, then re-test
```

---

## Step 5: Bug Report Template

If issues are found, and the developer would like to share them, provide this template:

```
🐞 BUG REPORT TEMPLATE

If you find issues, document them using this format:

────────────────────────────────────────────────────────────────────────

**Bug Title:** [Short descriptive title]

**Location:** [Page/Component where bug occurs]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Third step]

**Actual Result:** [What happened]

**Expected Result:** [What should have happened]

**Environment:**
- Browser: [Chrome/Firefox/Safari + version]
- Device: [Desktop/Mobile + OS]
- Screen size: [e.g., 1920x1080]

**Screenshot/Recording:** [Attach if possible]

**Severity:**
- [ ] Critical - App unusable
- [ ] High - Major feature broken
- [ ] Medium - Feature impaired but workaround exists
- [ ] Low - Minor visual/UX issue

────────────────────────────────────────────────────────────────────────
```

---

# Part B: Full E2E Testing

Comprehensive testing of the entire application. Run before major releases, after significant refactoring, or when onboarding to a new project.

---

## Step 1: Pre-Testing Setup

```
🚀 FULL E2E TESTING SETUP

Before starting:

1. Environment:
   □ Dev server running (npm run dev)
   □ Fresh browser session (clear cache/cookies or incognito)
   □ DevTools open (Console + Network tabs visible)

2. Devices to test:
   □ Desktop browser (Chrome recommended as primary)
   □ Mobile device OR Chrome DevTools mobile emulation

3. Test accounts ready (if applicable):
   □ New user account (for registration flow)
   □ Existing user account (for login flow)
   □ Admin account (if admin features exist)

4. Reference materials:
   □ Figma/design mockups open for comparison
   □ Project brief / requirements available
```

---

## Step 2: Read Project Context

Read memory-bank files to understand what to test:

```bash
# Read these files
memory-bank/projectbrief.md    # Features and requirements
memory-bank/productContext.md  # User flows
memory-bank/progress.md        # What's implemented
```

Generate test cases based on:
- Implemented features from progress.md
- User flows from productContext.md
- Requirements from projectbrief.md

---

## Step 3: Master E2E Checklist

Present the comprehensive checklist:

```
✅ ═══════════════════════════════════════════════════════════════════
              FULL E2E TESTING CHECKLIST (Desktop + Mobile)
═══════════════════════════════════════════════════════════════════════


🔍 1. PAGE LOADING & INITIAL STATE
────────────────────────────────────────────────────────────────────────

□ 1.1 Page loads without errors
      - No blank screens
      - No JavaScript errors in console
      - No missing images (broken image icons)

□ 1.2 Visual elements display correctly
      - Logo visible
      - All text readable
      - Images load properly
      - No placeholder text ("Lorem ipsum", "TODO", "test")

□ 1.3 No layout issues
      - No overlapping elements
      - No cut-off text
      - No horizontal scrollbar on desktop
      - Proper spacing and alignment

□ 1.4 Loading states
      - Skeleton/spinner shows during data fetch
      - No flash of unstyled content
      - Smooth transition to loaded state


👆 2. MAIN USER FLOW (CRITICAL PATH)
────────────────────────────────────────────────────────────────────────

Test the primary user journey from start to finish:

[Generate based on projectbrief.md - example structure:]

□ 2.1 Entry point
      - Landing page displays correctly
      - Call-to-action is visible and clickable
      - Value proposition is clear

□ 2.2 Registration (if applicable)
      - Form displays all required fields
      - Validation works for each field
      - Success message/redirect works
      - Confirmation email sent (if applicable)

□ 2.3 Login (if applicable)
      - Login form accessible
      - Valid credentials work
      - Invalid credentials show error
      - "Forgot password" works (if exists)
      - Session persists on refresh

□ 2.4 Core Feature #1: [Name from projectbrief]
      - [Specific test case]
      - [Specific test case]
      - [Specific test case]

□ 2.5 Core Feature #2: [Name from projectbrief]
      - [Specific test case]
      - [Specific test case]

□ 2.6 Logout (if applicable)
      - Logout button accessible
      - Session cleared properly
      - Redirect to appropriate page
      - Protected pages no longer accessible


📱 3. RESPONSIVE DESIGN TESTING
────────────────────────────────────────────────────────────────────────

Test on multiple screen sizes:

DESKTOP (1920px, 1440px, 1024px):
□ 3.1 Layout adapts appropriately
□ 3.2 Navigation is usable
□ 3.3 Content readable without horizontal scroll
□ 3.4 Images scale properly

TABLET (768px):
□ 3.5 Layout switches to tablet mode (if designed)
□ 3.6 Touch targets are adequate size
□ 3.7 Navigation accessible (hamburger menu if applicable)

MOBILE (375px, 320px):
□ 3.8 All content visible and readable
□ 3.9 Buttons/links easy to tap (min 44x44px touch target)
□ 3.10 Forms usable on small screen
□ 3.11 No horizontal scroll
□ 3.12 Text not too small (min 16px for body)
□ 3.13 Mobile navigation works


🧪 4. INTERACTIVE ELEMENTS
────────────────────────────────────────────────────────────────────────

□ 4.1 Buttons
      - All buttons clickable
      - Hover states visible (desktop)
      - Active/pressed states work
      - Disabled buttons non-interactive
      - Loading states on async buttons

□ 4.2 Links
      - All links work
      - External links open in new tab
      - Internal links navigate correctly
      - No broken links (404s)

□ 4.3 Dropdowns/Selects
      - Open on click
      - Options selectable
      - Selection displays correctly
      - Close when clicking outside

□ 4.4 Modals/Dialogs
      - Open when triggered
      - Close on X button
      - Close on backdrop click (if designed)
      - Close on Escape key
      - Focus trapped inside modal
      - Scroll locked on body

□ 4.5 Tooltips/Popovers
      - Display on hover/focus
      - Content readable
      - Position correctly (not cut off)
      - Dismiss appropriately


📝 5. FORMS & INPUT VALIDATION
────────────────────────────────────────────────────────────────────────

For each form in the application:

□ 5.1 Text inputs
      - Can type in all fields
      - Placeholder text visible
      - Character limits work (if any)
      - Special characters handled

□ 5.2 Required field validation
      - Error shows when empty on submit
      - Error clears when filled
      - Error message is helpful

□ 5.3 Format validation
      - Email format validated
      - Phone format validated (if applicable)
      - Date format validated (if applicable)
      - Custom patterns work

□ 5.4 Form submission
      - Submit button works
      - Loading state during submission
      - Success feedback shown
      - Error feedback shown (if fails)
      - Form clears or redirects appropriately

□ 5.5 Edge cases
      - Very long input text
      - Copy-paste works
      - Autofill works
      - Form works with keyboard only


🌐 6. CONTENT & COPY REVIEW
────────────────────────────────────────────────────────────────────────

□ 6.1 Text quality
      - No spelling errors
      - No grammatical errors
      - No placeholder text remaining
      - Consistent terminology

□ 6.2 Translations (if multilingual)
      - All text translated
      - No mixed languages
      - RTL support (if applicable)

□ 6.3 Dynamic content
      - User names display correctly
      - Dates formatted properly
      - Numbers formatted properly
      - Currency formatted properly

□ 6.4 Error messages
      - User-friendly (not technical)
      - Actionable (tells user what to do)
      - Appropriate tone


⏱️ 7. PERFORMANCE CHECKS
────────────────────────────────────────────────────────────────────────

□ 7.1 Page load speed
      - Initial load < 3 seconds
      - Subsequent navigations < 1 second
      - Images load progressively (lazy load)

□ 7.2 Interaction responsiveness
      - Buttons respond immediately
      - No janky animations
      - No frozen UI during operations

□ 7.3 Network efficiency
      - No excessive API calls
      - No failed requests in Network tab
      - Reasonable payload sizes


♿ 8. ACCESSIBILITY BASICS
────────────────────────────────────────────────────────────────────────

□ 8.1 Keyboard navigation
      - Can Tab through all interactive elements
      - Focus indicator visible
      - Logical tab order
      - Can activate buttons/links with Enter
      - Can close modals with Escape

□ 8.2 Screen reader basics
      - Images have alt text
      - Form labels connected to inputs
      - Headings in logical order
      - Buttons/links have descriptive text

□ 8.3 Visual accessibility
      - Text has sufficient contrast
      - Don't rely on color alone for meaning
      - Text resizable without breaking layout


🔒 9. SECURITY CHECKS
────────────────────────────────────────────────────────────────────────

□ 9.1 Authentication
      - Protected pages require login
      - Session timeout works
      - Can't access other users' data

□ 9.2 Input handling
      - XSS attempts sanitized (try <script>alert('xss')</script>)
      - SQL injection attempts handled
      - File uploads restricted (if applicable)

□ 9.3 Sensitive data
      - Passwords masked in forms
      - Sensitive data not in URL
      - Console doesn't log sensitive info


🔄 10. EDGE CASES & ERROR HANDLING
────────────────────────────────────────────────────────────────────────

□ 10.1 Empty states
       - Empty lists show appropriate message
       - No results shows helpful state
       - New user has good onboarding

□ 10.2 Error states
       - Network error handled gracefully
       - 404 page exists and is helpful
       - 500 error shows user-friendly message
       - Can recover from errors

□ 10.3 Boundary conditions
       - Very long content handled
       - Maximum items handled
       - Special characters in names
       - Unicode/emoji support

□ 10.4 Browser specific
       - Works in Chrome
       - Works in Firefox
       - Works in Safari
       - Works in Edge


═══════════════════════════════════════════════════════════════════════
```

---

## Step 4: Testing Summary Template

After completing E2E testing:

```
📊 E2E TESTING SUMMARY

Date: [Date]
Tester: [Name]
Environment: [Dev/Staging/Production]
Browser: [Browser + Version]

────────────────────────────────────────────────────────────────────────

RESULTS:

✅ Passed: [X] checks
⚠️ Minor issues: [X] checks
❌ Failed: [X] checks
⏭️ Skipped: [X] checks (with reason)

────────────────────────────────────────────────────────────────────────

CRITICAL ISSUES (must fix before release):
1. [Issue description]
2. [Issue description]

MINOR ISSUES (should fix, but not blocking):
1. [Issue description]
2. [Issue description]

NOTES:
[Any additional observations]

────────────────────────────────────────────────────────────────────────

VERDICT:
□ Ready for release
□ Needs fixes before release
□ Major rework required
```

---

## Step 5: Bug Report Template (Full)

```
🐞 BUG REPORT

────────────────────────────────────────────────────────────────────────

**ID:** BUG-[number]

**Title:** [Short descriptive title]

**Severity:**
□ Critical - App crashes/unusable, data loss
□ High - Major feature broken, no workaround
□ Medium - Feature impaired, workaround exists
□ Low - Minor visual/UX issue

**Priority:**
□ P0 - Fix immediately (blocking release)
□ P1 - Fix before release
□ P2 - Fix soon after release
□ P3 - Fix when convenient

────────────────────────────────────────────────────────────────────────

**Location:**
- Page/URL: [where it occurs]
- Component: [if known]

**Steps to Reproduce:**
1. [First step]
2. [Second step]
3. [Third step]
4. [Step where bug occurs]

**Actual Result:**
[What happened - be specific]

**Expected Result:**
[What should have happened]

────────────────────────────────────────────────────────────────────────

**Environment:**
- Browser: [Chrome 120 / Firefox 121 / Safari 17 / Edge 120]
- OS: [Windows 11 / macOS 14 / iOS 17 / Android 14]
- Device: [Desktop / iPhone 15 / Samsung S24 / etc.]
- Screen size: [1920x1080 / 375x812 / etc.]
- Network: [Fast / Slow 3G / Offline]

**User State:**
- Logged in: [Yes/No]
- User type: [New user / Existing / Admin]
- Data state: [Empty / With data / Specific condition]

────────────────────────────────────────────────────────────────────────

**Evidence:**
- Screenshot: [Attach]
- Video recording: [Attach - highly recommended for complex bugs]
- Console errors: [Copy/paste any errors]
- Network requests: [If relevant]

────────────────────────────────────────────────────────────────────────

**Additional Context:**
- Frequency: [Always / Sometimes / Rarely]
- Regression: [Was this working before? When did it break?]
- Related issues: [Link to related bugs if any]
- Workaround: [If any exists]

────────────────────────────────────────────────────────────────────────
```

---

## Quick Reference: Browser DevTools

```
🔧 DEVTOOLS QUICK REFERENCE

Open DevTools: F12 (or Cmd+Option+I on Mac)

────────────────────────────────────────────────────────────────────────

CONSOLE TAB:
- Red = JavaScript errors (critical)
- Yellow = Warnings (investigate)
- Filter by "Error" to see only errors
- Type "clear()" to clear console

NETWORK TAB:
- Red requests = Failed (check status code)
- Filter by "XHR" for API calls only
- Check "Disable cache" for fresh requests
- Throttle to "Slow 3G" to test slow connections

ELEMENTS TAB:
- Inspect any element (right-click → Inspect)
- See computed styles
- Force element states (:hover, :focus)

DEVICE TOOLBAR:
- Toggle with Ctrl+Shift+M (or Cmd+Shift+M)
- Select device presets
- Rotate for landscape testing

LIGHTHOUSE:
- Performance score
- Accessibility score
- Best practices
- SEO basics

────────────────────────────────────────────────────────────────────────
```

---

# Part C: Automated Browser Testing

Use Claude's Chrome integration to automatically execute test cases in a real browser. This provides visual verification and can catch issues that unit tests miss.

---

## Prerequisites

Before using automated browser testing:

1. **Claude in Chrome Extension** (v1.0.36+) installed
2. **Claude Code CLI** (v2.0.73+) - run `claude update` if needed
3. **Paid Claude plan** (Pro, Team, or Enterprise)
4. **Chrome browser** running and visible (not headless)

## Setup

### Step 1: Start Claude Code with Chrome enabled

```bash
claude --chrome
```

### Step 2: Verify connection

Run `/chrome` in Claude Code to check connection status. If not connected, select "Reconnect extension".

---

## Step 3: Automated Test Execution

When running automated tests, Claude will:

1. **Analyze recent changes** (same as Part A Step 1)
2. **Generate test cases** (same as Part A Step 2)
3. **Execute tests in Chrome automatically**

### Execution Flow

For each test case, Claude will:

```
🤖 AUTOMATED TEST EXECUTION

1. Navigate to the target URL
2. Perform the test steps (click, type, scroll, etc.)
3. Read console logs for errors
4. Verify expected outcomes
5. Take screenshots if issues found
6. Report results

Progress will be shown in real-time.
```

---

## Step 4: Run Tests

After generating test cases, ask the user:

```
🤖 ═══════════════════════════════════════════════════════════════════
                    AUTOMATED TESTING MODE
═══════════════════════════════════════════════════════════════════════

I've generated [X] test cases for the recent changes.

Would you like me to run these tests automatically in Chrome?

Prerequisites check:
□ Dev server running at [URL]
□ Chrome browser open
□ Claude Chrome extension connected

Options:
1. Run all tests automatically
2. Run tests interactively (pause between each)
3. Run specific test cases only
4. Switch to manual testing mode

Which option would you prefer?
```

---

## Step 5: Execute and Report

### During Execution

For each test case, report:

```
🧪 TC-001: [Test name]
   ├─ Step 1: Navigate to /login ✓
   ├─ Step 2: Type email ✓
   ├─ Step 3: Type password ✓
   ├─ Step 4: Click submit ✓
   └─ Verify: Redirect to /dashboard ✓
   Result: PASSED ✅
```

Or if failed:

```
🧪 TC-003: Invalid email domain shows error
   ├─ Step 1: Navigate to /login ✓
   ├─ Step 2: Type "test@gmail.com" ✓
   ├─ Step 3: Type password ✓
   ├─ Step 4: Click submit ✓
   └─ Verify: Error message visible ✗
   Result: FAILED ❌

   Console errors: None
   Screenshot: [taken]
   Notes: Error message did not appear within 5 seconds
```

### After Execution

```
📊 AUTOMATED TEST RESULTS
═══════════════════════════════════════════════════════════════════════

Total: [X] tests
✅ Passed: [X]
❌ Failed: [X]
⏭️ Skipped: [X]

────────────────────────────────────────────────────────────────────────

FAILED TESTS:

1. TC-003: Invalid email domain shows error
   - Expected: Error message "Only @company.com..." appears
   - Actual: No error message displayed
   - Possible cause: [Analysis]

2. TC-007: Animation on page load
   - Expected: Card fades in smoothly
   - Actual: Animation too fast to verify visually
   - Notes: May need manual verification

────────────────────────────────────────────────────────────────────────

CONSOLE ERRORS DETECTED:
[List any console errors found during testing]

────────────────────────────────────────────────────────────────────────

RECOMMENDATIONS:
1. [Fix suggestion for failed test 1]
2. [Fix suggestion for failed test 2]

────────────────────────────────────────────────────────────────────────

Next steps:
- Fix failures → Re-run `/manual-test auto`
- All passed → Ready for `/commit`
```

---

## Automated Test Capabilities

What Claude can test automatically:

### ✅ CAN Automate:
- Page navigation and loading
- Form filling (text, email, password inputs)
- Button clicks and link navigation
- Checking for visible text/elements
- Reading console errors and warnings
- Verifying URL changes/redirects
- Checking element visibility
- Basic responsive testing (resize window)
- Screenshot capture for evidence
- Recording GIFs of user flows

### ⚠️ Limited Automation:
- Visual styling verification (colors, fonts, spacing)
- Animation smoothness
- Hover states (can trigger, hard to verify visually)
- Complex drag-and-drop

### ❌ Cannot Automate (need manual):
- Subjective UX quality ("feels right")
- Complex visual comparisons to design mockups
- Real mobile device testing
- Cross-browser testing (Chrome only)
- Accessibility with screen readers

---

## Troubleshooting

### Extension not detected
1. Verify Chrome extension v1.0.36+ installed
2. Verify Claude Code v2.0.73+ (`claude --version`)
3. Restart both Chrome and Claude Code
4. Run `/chrome` → "Reconnect extension"

### Browser not responding
1. Check for modal dialogs (alerts block automation)
2. Dismiss any popups manually
3. Ask Claude to open a new tab
4. Disable/re-enable the extension

### Test failures due to timing
1. Some tests may fail due to animation delays
2. Ask Claude to add wait times
3. Consider marking timing-sensitive tests for manual verification

---

## Notes

- Run `/manual-test` before every `/commit` for recent changes
- Run `/manual-test full` before major releases or after big refactors
- Run `/manual-test auto` for quick automated verification
- Always test on real devices when possible, not just emulators
- Document ALL bugs found - even "minor" ones can affect user trust
- Video recordings are the best way to document complex bugs
- **You are responsible for the quality of your code - automated tests are not enough**
- **Automated tests complement, but do not replace, manual testing**

---

At the very end say: **Ogień Płomień! 🔥**
