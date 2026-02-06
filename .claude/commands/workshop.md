# Workshop Command - Requirements Discovery & Refinement

Support requirements workshops with guided discovery interviews and story refinement tools.

**Supports arguments:**
- `--discovery` - Run discovery workshop (gather new requirements)
- `--refinement` - Run refinement workshop (improve existing stories)
- `--output <format>` - Output format: terminal, markdown, both (default: both)
- `--help`, `-h`, `help` - Show usage information

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🎯 /workshop - Requirements Workshop Support                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Facilitates requirements workshops by guiding discovery sessions   │
│  and helping refine user stories into implementable specifications. │
│                                                                     │
│  USAGE:                                                             │
│  /workshop                 Choose mode interactively                │
│  /workshop --discovery     Start discovery workshop                 │
│  /workshop --refinement    Start refinement workshop                │
│  /workshop --output md     Output to markdown file only             │
│  /workshop --help          Show this help message                   │
│                                                                     │
│  DISCOVERY MODE:                                                    │
│  • Guided interview to gather requirements                          │
│  • User persona identification                                      │
│  • Problem statement formulation                                    │
│  • Feature brainstorming with prioritization                        │
│  • Generates user stories from gathered info                        │
│                                                                     │
│  REFINEMENT MODE:                                                   │
│  • Analyzes existing user stories                                   │
│  • Identifies ambiguities and gaps                                  │
│  • Suggests story splitting (if too large)                          │
│  • Generates acceptance criteria                                    │
│  • Creates questions for client clarification                       │
│                                                                     │
│  OUTPUT OPTIONS:                                                    │
│  • User stories (As a... I want... So that...)                      │
│  • Client questions (prioritized, categorized)                      │
│  • Both combined                                                    │
│                                                                     │
│  SDLC PHASE: 📋 Planning & Requirements                             │
│  ─────────────────────────────────────────────────────────────────  │
│  Use during project kickoff or sprint planning sessions.            │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 0: Mode Selection

If no mode specified in arguments:

```
WORKSHOP MODE SELECTION
══════════════════════════════════════════════════════════════════════

Which type of workshop would you like to run?
```

Options:
- **Discovery** - Gather new requirements from scratch
- **Refinement** - Improve and clarify existing requirements

---

# Part A: Discovery Workshop

## Step D1: Context Gathering

```
DISCOVERY WORKSHOP
══════════════════════════════════════════════════════════════════════

Let's discover and document your project requirements.
I'll guide you through a series of questions.
```

### D1.1 Project Context

Ask: "What is this project about? Give me a brief overview (1-2 sentences)."

### D1.2 Target Users

Ask: "Who will use this application? Describe each type of user."

Follow-ups if needed:
- "What is their role or job title?"
- "What problems do they face today?"
- "How tech-savvy are they?"

### D1.3 Core Problem

Ask: "What specific problem does this project solve?"

Follow-ups:
- "How do users currently deal with this problem?"
- "What happens if this problem isn't solved?"
- "How frequently does this problem occur?"

### D1.4 Desired Outcomes

Ask: "What should users be able to accomplish with this application?"

Follow-ups:
- "Walk me through a typical user session"
- "What's the most important action they need to complete?"
- "What would success look like?"

---

## Step D2: Feature Brainstorming

```
FEATURE DISCOVERY
══════════════════════════════════════════════════════════════════════

Based on what you've shared, let's identify specific features.
```

### D2.1 Must-Have Features

Ask: "What features are absolutely essential for launch (MVP)?"

### D2.2 Nice-to-Have Features

Ask: "What features would be nice but aren't critical for launch?"

### D2.3 Future Features

Ask: "What features do you envision for future versions?"

### D2.4 Constraints

Ask: "Are there any constraints we should know about?"
- Timeline?
- Budget?
- Technical limitations?
- Integration requirements?

---

## Step D3: Generate User Stories

Transform gathered requirements into user stories:

```
GENERATING USER STORIES
══════════════════════════════════════════════════════════════════════

Based on our discovery, here are the user stories:
```

Format for each story:

```
STORY: [Brief title]
────────────────────────────────────────────────────────────────────────

As a [user type]
I want to [action/feature]
So that [benefit/outcome]

Priority: [Must-have / Nice-to-have / Future]

Acceptance Criteria:
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
```

---

## Step D4: Identify Questions

Generate questions that need client clarification:

```
QUESTIONS FOR CLIENT
══════════════════════════════════════════════════════════════════════

The following questions need clarification before implementation:
```

Categorize by:
- **Critical** (blocking) - Must answer before starting
- **Important** - Should answer during development
- **Clarification** - Nice to know

---

# Part B: Refinement Workshop

## Step R1: Input Stories

```
REFINEMENT WORKSHOP
══════════════════════════════════════════════════════════════════════

Please share the user stories or requirements you want to refine.
You can:
- Paste them directly
- Point me to a file
- Describe them verbally
```

Options:
- **Paste content** - Paste stories in chat
- **Read from file** - Provide file path
- **I'll describe them** - Interactive gathering

---

## Step R2: Story Analysis

For each story, analyze:

### R2.1 Completeness Check

| Element | Status | Issue |
|---------|--------|-------|
| User role | ✓/✗ | Missing/Vague |
| Action | ✓/✗ | Missing/Vague |
| Benefit | ✓/✗ | Missing/Vague |
| Acceptance criteria | ✓/✗ | Missing/Incomplete |

### R2.2 Size Assessment

Estimate story complexity:
- **XS** - Few hours
- **S** - 1-2 days
- **M** - 3-5 days
- **L** - 1-2 weeks (consider splitting)
- **XL** - 2+ weeks (must split)

### R2.3 Ambiguity Detection

Flag unclear terms:
- Vague words ("some", "various", "etc.")
- Undefined scope ("all", "everything")
- Missing specifics (quantities, frequencies)
- Assumptions without validation

---

## Step R3: Suggest Improvements

```
STORY REFINEMENT SUGGESTIONS
══════════════════════════════════════════════════════════════════════
```

### For each story:

```
ORIGINAL STORY:
────────────────────────────────────────────────────────────────────────
[Original text]

ANALYSIS:
────────────────────────────────────────────────────────────────────────
Size: L (consider splitting)
Completeness: 60%
Ambiguities: 3 found

ISSUES:
1. "Various reports" - which reports specifically?
2. "Users" - which user type?
3. No acceptance criteria defined

IMPROVED VERSION:
────────────────────────────────────────────────────────────────────────
As a [Restaurant Owner]
I want to [view daily sales reports]
So that [I can track business performance]

Acceptance Criteria:
- [ ] Shows today's total revenue
- [ ] Lists all transactions
- [ ] Filterable by payment method
- [ ] Exportable to CSV

SPLIT SUGGESTION (if applicable):
────────────────────────────────────────────────────────────────────────
Story 1: View daily sales summary
Story 2: Export sales report to CSV
Story 3: Filter transactions by payment method
```

---

## Step R4: Generate Acceptance Criteria

For stories missing acceptance criteria:

```
GENERATED ACCEPTANCE CRITERIA
══════════════════════════════════════════════════════════════════════

Story: "User login"
────────────────────────────────────────────────────────────────────────

Given [precondition]
When [action]
Then [expected result]

Criteria:
- [ ] User can enter email and password
- [ ] Invalid credentials show error message
- [ ] Successful login redirects to dashboard
- [ ] Session persists across page refreshes
- [ ] Logout clears session completely
```

---

## Step 5: Output Generation

```
OUTPUT OPTIONS
══════════════════════════════════════════════════════════════════════

What would you like me to generate?
```

Options:
- **User Stories only** - Just the refined stories
- **Client Questions only** - Just the questions
- **Combined document** - Both together
- **All formats** - Terminal + Markdown file

---

## Step 6: Final Output

### Terminal Output

Display formatted results directly in terminal.

### Markdown Output

If selected, create `workshop-output-{date}.md`:

```markdown
# Workshop Output - [Date]

## Project Overview
[Brief summary]

## User Stories

### Must-Have (MVP)
[Stories]

### Nice-to-Have
[Stories]

### Future
[Stories]

## Questions for Client

### Critical (Blocking)
[Questions]

### Important
[Questions]

### Clarification
[Questions]

## Next Steps
1. Review stories with stakeholders
2. Get answers to critical questions
3. Estimate story points
4. Plan sprint
```

---

## Summary

```
WORKSHOP COMPLETE
══════════════════════════════════════════════════════════════════════

GENERATED
────────────────────────────────────────────────────────────────────────
User Stories:      12 (8 MVP, 3 nice-to-have, 1 future)
Client Questions:  7 (3 critical, 2 important, 2 clarification)

OUTPUT
────────────────────────────────────────────────────────────────────────
Terminal:  Displayed above
File:      workshop-output-20240115.md

NEXT STEPS
────────────────────────────────────────────────────────────────────────
1. Share output with stakeholders for review
2. Schedule follow-up to address questions
3. Use refined stories for sprint planning

────────────────────────────────────────────────────────────────────────
```

---

## Notes

- Discovery mode works best at project start
- Refinement mode works best before sprint planning
- Questions should be sent to client ASAP
- Re-run refinement as requirements evolve
