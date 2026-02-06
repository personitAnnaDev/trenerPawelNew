# PM Command - ClickUp Integration

Claude acts as a PM assistant, integrating with ClickUp to manage tasks, bugs, documentation, and project oversight for the development team.

**Supports arguments:**
- `setup` - Run guided setup wizard
- `task [description]` - Create or manage tasks
- `bug [description]` - Create bug report
- `doc [description]` - Create documentation task
- `help-request [description]` - Request tech lead assistance
- `status` - Show project overview
- `sync` - Manual sync with ClickUp
- `resolve` - Pick up and resolve in-progress/done tasks
- `--help`, `-h`, `help` - Show usage information

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
+---------------------------------------------------------------------+
|  /pm - ClickUp Project Management Integration                        |
+---------------------------------------------------------------------+
|                                                                     |
|  WHAT IT DOES:                                                      |
|  Integrates with ClickUp to manage tasks, bugs, and documentation.  |
|  Acts as your PM assistant - tracks progress, syncs status, and     |
|  keeps tech lead informed.                                          |
|                                                                     |
|  USAGE:                                                             |
|  /pm                    Show overview and status summary            |
|  /pm setup              Guided setup wizard                         |
|  /pm task <desc>        Create or manage a task                     |
|  /pm bug <desc>         Create bug report (links to error)          |
|  /pm doc <desc>         Create documentation task                   |
|  /pm help-request <desc> Create task for tech lead                  |
|  /pm status             Big picture view (features as tasks)        |
|  /pm sync               Manual sync/update                          |
|  /pm resolve            Pick up task, implement, close              |
|  /pm --help             Show this help                              |
|                                                                     |
|  SDLC PHASE: All Phases - Project Management                        |
|  -------------------------------------------------------------      |
|  Available throughout development to track and sync progress.       |
|                                                                     |
|  WORKFLOW POSITION:                                                 |
|  +-------------+                                                    |
|  |    /pm     |<--- Available throughout all workflow phases        |
|  +-------------+                                                    |
|       |                                                             |
|       v                                                             |
|  Integrates with /commit for automatic task updates                 |
|                                                                     |
|  PREREQUISITES:                                                     |
|  * ClickUp API token (run /pm setup first)                          |
|  * ClickUp MCP server configured                                    |
|                                                                     |
|  MCP SERVER:                                                        |
|  @chykalophia/clickup-mcp-server (177+ tools)                       |
|                                                                     |
+---------------------------------------------------------------------+
```

**STOP execution after displaying help.**

---

## Step 0: Read Memory Bank and Check Configuration

Before proceeding with any subcommand:

1. **Read memory-bank/handbook.md** for project context
2. **Read memory-bank/integrations/clickup.md** for ClickUp configuration
3. **Check connection status**

If ClickUp is not configured (Status: Not Configured) and subcommand is NOT `setup`:

```
ClickUp integration is not configured.

Run /pm setup to configure ClickUp integration.
```

**STOP and wait for user to run setup.**

---

## Route by Subcommand

Parse `$ARGUMENTS` to determine which subcommand to execute:

| Argument starts with | Go to |
|---------------------|-------|
| `setup` | Step 1: Setup Wizard |
| `task` | Step 2: Task Management |
| `bug` | Step 3: Bug Report |
| `doc` | Step 4: Documentation Task |
| `help-request` | Step 5: Help Request |
| `status` | Step 6: Project Status |
| `sync` | Step 7: Manual Sync |
| `resolve` | Step 8: Resolve Task |
| (empty/none) | Step 6: Project Status |

---

## Step 1: Setup Wizard (`/pm setup`)

Interactive setup to configure ClickUp integration.

### 1.1 Welcome

```
+---------------------------------------------------------------------+
|                    ClickUp Integration Setup                         |
+---------------------------------------------------------------------+

This wizard will configure ClickUp integration for your project.

You will need:
- ClickUp API token (Settings > Apps > API Token)
- Link to your Development list in ClickUp

Expected ClickUp structure:
  Space: Coding → Folder: [Project Name] → List: Development

Ready to begin?
```

Options:
- **Yes, let's go** - Continue setup
- **Cancel** - Exit setup

### 1.2 Development List URL

```
Step 1/4: Development List Configuration

Please provide the URL to your Development list in ClickUp.

To get this URL:
1. Navigate to: Coding > [Your Project Folder] > Development
2. Copy the URL from your browser

Example URL format:
https://app.clickup.com/12345678/v/l/abc123-12345

Paste your Development list URL:
```

**User provides URL as free text input.**

Parse the URL to extract:
- **Team ID**: First number after `app.clickup.com/`
- **List ID**: The ID after `/l/` (format: `abc123-12345` or numeric)

Example parsing:
- URL: `https://app.clickup.com/90151054653/v/l/2kypqv9x-42675`
- Team ID: `90151054653`
- List ID: `2kypqv9x-42675`

If URL parsing fails:
```
Could not parse the ClickUp URL. Please ensure it's a list URL.

Expected format: https://app.clickup.com/{team_id}/v/l/{list_id}

Try again or provide the IDs manually:
```

Options:
- **Try again** - Re-enter URL
- **Enter IDs manually** - Provide Team ID and List ID separately

### 1.3 Tech Lead Configuration

```
Step 2/4: Tech Lead Configuration

Who should receive help requests when you use /pm help-request?
```

Options:
- **I'm the tech lead** - Help requests assigned to self
- **Someone else** - Provide name/email

If "Someone else", prompt for name.

### 1.4 Workflow Preferences

```
Step 3/4: Workflow Preferences

Configure how Claude should interact with ClickUp:
```

**Auto-update on commit?**
When you run /commit, should Claude offer to update related ClickUp tasks?

Options:
- **Yes** (Recommended) - Prompt to update tasks on commit
- **No** - Manual updates only

**Default task priority?**

Options:
- **Normal** (Recommended)
- **High**
- **Low**

### 1.5 Save Configuration

```
Step 4/4: Saving Configuration...
```

Update `memory-bank/integrations/clickup.md` with:
- Team ID (extracted from URL)
- List ID (extracted from URL) - used for ALL task types
- List URL (full URL for reference)
- Tech lead info
- Workflow preferences
- Status: Configured
- Setup timestamp

All task types (tasks, bugs, docs, help requests) use the same Development list.
Tasks are differentiated by tags:
- General tasks: `task`
- Bugs: `bug`, `needs-triage`
- Documentation: `documentation`
- Help requests: `help-needed`, `blocked`

### 1.6 Setup Complete

```
+---------------------------------------------------------------------+
|                    Setup Complete!                                   |
+---------------------------------------------------------------------+

ClickUp integration configured successfully.

Development List: [List URL]
Tech Lead: [Name or "Self"]

All tasks will be created in the Development list with appropriate tags.

Available commands:
/pm task <description>    - Create a task [TASK]
/pm bug <description>     - Report a bug [BUG]
/pm doc <description>     - Documentation task [DOC]
/pm help-request <desc>   - Help request [HELP]
/pm status                - View project status
/pm resolve               - Pick up and close tasks

Ogien Plomien!
```

---

## Step 2: Task Management (`/pm task [description]`)

### 2.1 Parse Mode

If description provided after `task`:
- **Create Mode** - Go to 2.2
-
If no description:
- **List Mode** - Go to 2.3

### 2.2 Create Task

```
Creating task...
```

Read `memory-bank/activeContext.md` for current context.

Use MCP tool: `clickup_create_task`
- **list_id**: Tasks list from config
- **name**: Extracted from description
- **description**: Full description + context from activeContext
- **status**: "to do" (or configured default)
- **priority**: normal (or configured default)

If current git branch contains feature name, add to description.

```
Task created successfully!

Name: [Task Name]
List: [List Name]
Status: To Do
Priority: Normal
URL: [ClickUp URL]

Ogien Plomien!
```

### 2.3 List Tasks

```
Fetching project tasks...
```

Use MCP tool: `clickup_get_tasks`
- Filter by configured space/lists

Display:
```
+---------------------------------------------------------------------+
|                       Project Tasks                                  |
+---------------------------------------------------------------------+

TO DO:
[ ] Task 1 (ID: xxx) - Normal priority
[ ] Task 2 (ID: xxx) - High priority

IN PROGRESS:
[~] Task 3 (ID: xxx) - Currently working

DONE (recent):
[x] Task 4 (ID: xxx) - Completed yesterday

What would you like to do?
```

Options:
- **Create new task** - Prompt for description
- **Update a task** - Select task to update
- **View details** - Select task to view
- **Done** - Exit

---

## Step 3: Bug Report (`/pm bug [description]`)

### 3.1 Gather Context

```
Creating bug report...
```

Gather context automatically:
1. Parse description for error details
2. Read recent terminal output (if error visible)
3. Check `git diff` for recently changed files
4. Read `memory-bank/activeContext.md` for current work context

### 3.2 Create Bug Task

Use MCP tool: `clickup_create_task`
- **list_id**: Bugs list from config
- **name**: "BUG: " + brief description
- **description**: Formatted bug report:
  ```
  ## Description
  [User's description]

  ## Context
  - Current work: [from activeContext.md]
  - Branch: [current git branch]
  - Recent files: [recently modified files]

  ## Error Details
  [If error detected in terminal]

  ## Affected Files
  [List of potentially affected files]
  ```
- **priority**: high (bugs default to high)
- **tags**: ["bug", "needs-triage"]

Use MCP tool: `clickup_add_tag_to_task` to add "bug" tag

```
Bug report created!

Name: BUG: [Description]
List: [Bugs List Name]
Priority: High
Tags: bug, needs-triage
URL: [ClickUp URL]

Context captured:
- Branch: [branch name]
- Files: [X] files identified
- Error: [Yes/No error context captured]

Ogien Plomien!
```

---

## Step 4: Documentation Task (`/pm doc [description]`)

### 4.1 Create Documentation Task

```
Creating documentation task...
```

Use MCP tool: `clickup_create_task`
- **list_id**: Documentation list from config
- **name**: "DOC: " + description
- **description**:
  ```
  ## Documentation Required
  [User's description]

  ## Context
  [from activeContext.md]

  ## Related Files
  [relevant files if identifiable]
  ```
- **priority**: low
- **tags**: ["documentation"]

```
Documentation task created!

Name: DOC: [Description]
List: [Docs List Name]
Priority: Low
Tags: documentation
URL: [ClickUp URL]

Ogien Plomien!
```

---

## Step 5: Help Request (`/pm help-request [description]`)

### 5.1 Gather Full Context

```
Creating help request for tech lead...
```

Gather comprehensive context:
1. Read `memory-bank/activeContext.md`
2. Run `git status` for current state
3. Run `git diff` for recent changes
4. Read recent error output if available
5. Check current todos/blockers

### 5.2 Create Help Request Task

Use MCP tool: `clickup_create_task`
- **list_id**: Help Requests list from config
- **name**: "HELP: " + description
- **description**:
  ```
  ## Help Needed
  [User's description]

  ## Current Context
  [Full activeContext.md content]

  ## Git Status
  [git status output]

  ## Recent Changes
  [Summary of git diff]

  ## What Was Tried
  [If mentioned in description]

  ## Blockers
  [Current blockers if any]
  ```
- **assignees**: [tech_lead_id from config]
- **priority**: urgent
- **tags**: ["help-needed", "blocked"]

Use MCP tool: `clickup_create_task_comment` to add mention:
```
@[Tech Lead Name] - Help requested by developer. Please review when available.
```

```
Help request created and assigned!

Name: HELP: [Description]
Assigned to: [Tech Lead Name]
List: [Help Requests List Name]
Priority: Urgent
Tags: help-needed, blocked
URL: [ClickUp URL]

Full context has been attached to the task.
Your tech lead will be notified.

Ogien Plomien!
```

---

## Step 6: Project Status (`/pm status` or `/pm`)

### 6.1 Fetch All Tasks

```
Fetching project status...
```

Use MCP tool: `clickup_get_tasks` for all configured lists

### 6.2 Display Overview

```
+---------------------------------------------------------------------+
|                    PROJECT STATUS - [Project Name]                   |
+---------------------------------------------------------------------+

FEATURES (Major Tasks):
[x] Feature 1                                              COMPLETE
[~] Feature 2                                           IN PROGRESS
[ ] Feature 3                                                  TODO
[ ] Feature 4                                                  TODO

RECENT ACTIVITY:
- [timestamp] Task "X" marked complete
- [timestamp] Bug "Y" created
- [timestamp] Help request assigned to [Tech Lead]

BLOCKERS:
[!] HELP: [Help request title] - Assigned to [Tech Lead]

STATISTICS:
+------------------+-------+
| Status           | Count |
+------------------+-------+
| To Do            |   5   |
| In Progress      |   2   |
| In Review        |   1   |
| Complete         |   8   |
+------------------+-------+
| Total            |  16   |
+------------------+-------+

BUGS:
- [X] open bugs requiring attention
- [X] bugs resolved this week

+---------------------------------------------------------------------+
```

### 6.3 Sync Check

Compare ClickUp state with `memory-bank/progress.md`:

If discrepancies found:
```
Note: Some tasks may be out of sync with memory-bank.
Run /pm sync to reconcile.
```

```
Ogien Plomien!
```

---

## Step 7: Manual Sync (`/pm sync`)

### 7.1 Compare States

```
Comparing ClickUp and local state...
```

1. Read `memory-bank/progress.md`
2. Read `memory-bank/activeContext.md`
3. Fetch tasks from ClickUp via `clickup_get_tasks`
4. Compare and identify differences

### 7.2 Display Differences

```
+---------------------------------------------------------------------+
|                         Sync Status                                  |
+---------------------------------------------------------------------+

DIFFERENCES FOUND:

ClickUp has updates not in memory-bank:
- Task "X" status changed to "Complete"
- Task "Y" assigned to [Name]

Memory-bank has updates not in ClickUp:
- Feature "Z" marked as in progress locally

How would you like to reconcile?
```

Options:
- **Pull from ClickUp** - Update memory-bank with ClickUp state
- **Push to ClickUp** - Update ClickUp with memory-bank state
- **Manual selection** - Choose for each item
- **Skip** - Don't sync now

### 7.3 Apply Changes

Based on selection, update:
- `memory-bank/progress.md` with task status
- `memory-bank/activeContext.md` with current work
- ClickUp tasks via `clickup_update_task`

```
Sync complete!

- [X] items updated in ClickUp
- [X] items updated in memory-bank

Last sync: [timestamp]

Ogien Plomien!
```

---

## Step 8: Resolve Task (`/pm resolve`)

Pick up a task that's in progress or done, review its details, implement any required work, and close it.

### 8.1 Fetch Resolvable Tasks

```
Fetching tasks ready for resolution...
```

Use MCP tool: `clickup_get_tasks`
- **list_id**: Development list from config
- Filter for statuses: `in progress`, `done`, `testing`

### 8.2 Display Task List

```
+---------------------------------------------------------------------+
|                    Tasks Ready for Resolution                        |
+---------------------------------------------------------------------+

IN PROGRESS:
[1] Phase 2: Authentication [PHASE]           blocked
[2] Phase 3: Dashboard [PHASE]                in progress

DONE (pending close):
[3] Phase 1: Project Setup [PHASE]            done

TESTING:
[4] Feature X [TASK]                          testing

Enter task number to resolve (or 'q' to quit):
```

**User selects a task number.**

### 8.3 Load Task Details

```
Loading task details...
```

Use MCP tools:
- `clickup_get_task_details` - Get full task info
- `clickup_get_task_comments` - Get all comments
- `clickup_get_attachments` - Get any attachments

Display:
```
+---------------------------------------------------------------------+
|  TASK: [Task Name]                                                   |
+---------------------------------------------------------------------+

STATUS: [current status]
PRIORITY: [priority]
CREATED: [date]

DESCRIPTION:
[Full task description]

COMMENTS ([X] total):
─────────────────────────────────────────
[Author] - [timestamp]:
[Comment text]
─────────────────────────────────────────
[Author] - [timestamp]:
[Comment text]
─────────────────────────────────────────

ATTACHMENTS:
- [filename] ([size])
- [filename] ([size])

CHECKLIST (if any):
[ ] Item 1
[x] Item 2

+---------------------------------------------------------------------+
```

### 8.4 Evaluate & Plan

Based on task type (from name suffix):

**[TASK] / [PHASE] / [DOC]:**
```
Analyzing task requirements...
```

Read related files mentioned in description/comments.
Identify what work needs to be done.

**[BUG]:**
```
Analyzing bug report...
```

Look for error details, affected files, reproduction steps.

**[HELP]:**
```
Reviewing help request...
```

Understand the blocker and what's needed.

Present action plan:
```
+---------------------------------------------------------------------+
|                         Resolution Plan                              |
+---------------------------------------------------------------------+

Based on the task details, here's what needs to be done:

1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

Affected files:
- src/path/to/file.ts
- src/path/to/another.ts

Proceed with implementation?
```

Options:
- **Yes, implement** - Claude implements the fix/feature
- **Show more details** - Read specific files or comments
- **Skip this task** - Return to task list
- **Close without changes** - Mark as closed (already done)

### 8.5 Implement Changes

If user selects "Yes, implement":

```
Implementing changes...
```

1. Read relevant source files
2. Make necessary code changes using Edit tool
3. Run tests if applicable (`npm test`)
4. Show summary of changes made

```
Changes implemented:

Files modified:
- src/path/to/file.ts (added X, modified Y)
- src/path/to/another.ts (fixed Z)

Tests: [PASS/FAIL]

Ready to close this task?
```

Options:
- **Yes, close task** - Go to 8.6
- **Run more tests** - Execute additional verification
- **Review changes** - Show git diff
- **Revert** - Undo changes, keep task open

### 8.6 Close Task

```
Closing task...
```

Use MCP tool: `clickup_update_task`
- **task_id**: Selected task ID
- **status**: "Closed"

Add completion comment via `clickup_create_task_comment`:
```
✅ Task resolved by Claude Code

Changes made:
- [Summary of changes]

Files modified:
- [List of files]

Closed: [timestamp]
```

Update `memory-bank/progress.md` if task was a phase.

```
+---------------------------------------------------------------------+
|                       Task Resolved!                                 |
+---------------------------------------------------------------------+

Task: [Task Name]
Status: Closed
Resolution: [Implemented/No changes needed/Deferred]

Changes committed: [Yes/No]
Files modified: [X] files

Would you like to:
```

Options:
- **Resolve another task** - Return to 8.1
- **Commit changes** - Run /commit
- **Done** - Exit

```
Ogien Plomien!
```

---

## Error Handling

### Configuration Not Found

```
ClickUp is not configured.

Run /pm setup to configure the integration.

Need help? Check: memory-bank/integrations/clickup.md
```

### API Token Invalid

```
ClickUp API Error: 401 Unauthorized

Your API token appears to be invalid or expired.

To fix:
1. Go to ClickUp Settings > Apps > API Token
2. Generate a new token
3. Update CLICKUP_API_TOKEN in your .env file
4. Restart Claude Code
5. Run /pm setup to reconfigure
```

### Network Error

```
Unable to connect to ClickUp API.

This might be temporary. Please check:
1. Your internet connection
2. ClickUp service status: status.clickup.com

Would you like to:
```

Options:
- **Retry** - Try again
- **Continue offline** - Skip ClickUp for now
- **Cancel** - Stop current operation

### Permission Error

```
ClickUp Permission Error

Cannot perform [action] on [resource].

Your API token may not have sufficient permissions.
Contact your ClickUp workspace admin for access.

Required permissions:
- workspace:read
- task:write
- comment:write
```

---

## MCP Server Setup

If ClickUp MCP server is not available, display these setup instructions:

```
+---------------------------------------------------------------------+
|              ClickUp MCP Server Setup Instructions                   |
+---------------------------------------------------------------------+

STEP 1: Get your API Token
--------------------------
1. Go to ClickUp > Settings (gear icon, bottom left)
2. Click "Apps" in the sidebar
3. Under "API Token", click "Generate"
4. Copy the token (starts with 'pk_')

STEP 2: Configure MCP Server
----------------------------
Create or edit .mcp.json in your project root:

{
  "mcpServers": {
    "clickup": {
      "command": "npx",
      "args": ["-y", "@chykalophia/clickup-mcp-server"],
      "env": {
        "CLICKUP_API_TOKEN": "pk_YOUR_TOKEN_HERE"
      }
    }
  }
}

STEP 3: Restart Claude Code
---------------------------
Completely close and reopen Claude Code to load the MCP server.

STEP 4: Verify
--------------
Run /pm sync to test the connection.

+---------------------------------------------------------------------+
```

---

## Notes

- API token is NEVER stored in plain text - use .mcp.json with env vars
- All task descriptions are sanitized to remove potential secrets
- Help requests should include as much context as possible
- Status view shows major features as individual trackable tasks
- Sync should be run periodically to keep ClickUp and memory-bank aligned
- Integration with /commit is handled in commit.md Step 9.5
- MCP server config goes in `.mcp.json` in project root (NOT claude_desktop_config.json)

At the very end say: **Ogien Plomien!**
