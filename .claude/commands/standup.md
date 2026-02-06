# Standup Command - Daily Standup Generator

Claude generates brief, useful daily standup reports by combining ClickUp activity data with git commits.

**Supports arguments:**
- `today` - Include today's activity (until now)
- `week` - Generate weekly summary
- `--help`, `-h`, `help` - Show usage information

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
+---------------------------------------------------------------------+
|  /standup - Daily Standup Generator                                  |
+---------------------------------------------------------------------+
|                                                                     |
|  WHAT IT DOES:                                                      |
|  Generates brief, useful daily standup reports by combining         |
|  ClickUp activity (time entries, tasks) with git commits.           |
|  Smart "last working day" detection (Friday for Monday, etc.)       |
|                                                                     |
|  USAGE:                                                             |
|  /standup              Generate standup for last working day        |
|  /standup today        Include today's activity (until now)         |
|  /standup week         Generate weekly summary                      |
|  /standup --help       Show this help                               |
|                                                                     |
|  WORKING DAY LOGIC:                                                 |
|  Monday    -> Friday (3 days back)                                  |
|  Tue-Fri   -> Previous day (1 day back)                             |
|  Weekend   -> Friday                                                |
|                                                                     |
|  DATA SOURCES:                                                      |
|  1. ClickUp Time Entries (primary)                                  |
|  2. ClickUp Task Updates                                            |
|  3. Git Commits (supplementary)                                     |
|  4. ClickUp Blockers                                                |
|                                                                     |
|  SDLC PHASE: Daily - Development Workflow                           |
|  -------------------------------------------------------------      |
|  Use at the start of your workday or before standup meetings.       |
|                                                                     |
|  WORKFLOW POSITION:                                                 |
|  +-------------+     +-------------+     +-------------+            |
|  |  /standup   | --> |  Work Day   | --> |  /commit    |            |
|  +-------------+     +-------------+     +-------------+            |
|        ^                                       |                    |
|        +---------------------------------------+                    |
|                   Daily cycle                                       |
|                                                                     |
|  PREREQUISITES:                                                     |
|  * ClickUp configured (run /pm setup first)                         |
|  * Git repository initialized                                       |
|                                                                     |
|  OUTPUT:                                                            |
|  Brief standup with: Yesterday's work, Commits, Today's plan,       |
|  and any Blockers.                                                  |
|                                                                     |
+---------------------------------------------------------------------+
```

**STOP execution after displaying help.**

---

## Step 0: Read Memory Bank and Check Configuration

Before proceeding:

1. **Read memory-bank/handbook.md** for project context
2. **Read memory-bank/integrations/clickup.md** for ClickUp configuration
3. **Check ClickUp is configured**

If ClickUp is not configured (Status: Not Configured):

```
ClickUp integration is not configured.

Run /pm setup to configure ClickUp integration first.
```

**STOP and wait for user to run setup.**

---

## Step 1: Parse Arguments and Determine Mode

Parse `$ARGUMENTS` to determine report mode:

| Argument | Mode | Date Range |
|----------|------|------------|
| (empty) | **Standard** | Last working day only |
| `today` | **Today** | Last working day + today until now |
| `week` | **Weekly** | Last 7 days |

Store mode for later steps.

---

## Step 2: Calculate Date Range

### 2.1 Determine Working Day Logic

Get current day of week and calculate lookback:

```
Today        | Look back to          | Days
-------------|----------------------|------
Monday       | Friday               | 3
Tuesday      | Monday               | 1
Wednesday    | Tuesday              | 1
Thursday     | Wednesday            | 1
Friday       | Thursday             | 1
Saturday     | Friday               | 1
Sunday       | Friday               | 2
```

### 2.2 Calculate Timestamps

For ClickUp API (Unix timestamps in milliseconds):
- **start_date**: Last working day at 00:00:00
- **end_date**: Today at 23:59:59 (or now if `today` mode)

For git log:
- **--since**: "X days ago" based on lookback

If `week` mode:
- **start_date**: 7 days ago at 00:00:00
- **end_date**: Now

Display calculation:
```
Calculating date range...
Mode: [Standard/Today/Weekly]
Period: [Start Date] to [End Date]
```

---

## Step 3: Fetch ClickUp Time Entries

```
Fetching time entries from ClickUp...
```

Use MCP tool: `clickup_get_time_entries`
- **team_id**: From `memory-bank/integrations/clickup.md` (90151054653)
- **start_date**: Calculated start (Unix ms)
- **end_date**: Calculated end (Unix ms)

Parse response to extract:
- Task name (from linked task)
- Duration (formatted as Xh Ym)
- Description (if provided)

If no time entries found:
```
No time entries found for this period.
```

---

## Step 4: Fetch ClickUp Task Updates

```
Checking task activity...
```

Use MCP tool: `clickup_get_tasks`
- **list_id**: From config (901519349700)
- **include_closed**: true

Filter for tasks with recent activity:
- Status changed in date range
- Marked complete in date range
- Started (to "in progress") in date range

Extract:
- Task name
- Status change (e.g., "to do → in progress")
- Completion status

---

## Step 5: Fetch Git Commits

```
Fetching git commits...
```

Run git command:
```bash
git log --since="[X days ago]" --format="%h|%s" --no-merges
```

Parse output to extract:
- Short hash (7 chars)
- Commit message

If no commits found:
```
No commits found for this period.
```

---

## Step 6: Identify Blockers

```
Checking for blockers...
```

Use MCP tool: `clickup_get_tasks`
- Filter for status: "blocked"
- Filter for tags: "help-needed", "blocked"

Extract:
- Task name
- Blocker reason (from comments if available)

---

## Step 7: Format and Display Standup

### Standard Output Format

```
+---------------------------------------------------------------------+
|  STANDUP - [Date Range Display]                                      |
+---------------------------------------------------------------------+

LAST WORKING DAY ([Day, Date]):
────────────────────────────────────────────────────────────────────────
[If time entries exist:]
• [Task Name] - [Xh Ym] - [status]
• [Task Name] - [Xh Ym] - [status]

[If task updates exist:]
• [Task Name] - [status change]

[If neither:]
• No tracked activity

COMMITS:
────────────────────────────────────────────────────────────────────────
[If commits exist:]
• [abc1234] [commit message]
• [def5678] [commit message]

[If no commits:]
• No commits

[If 'today' mode - show this section:]
TODAY (so far):
────────────────────────────────────────────────────────────────────────
• [Current task in progress from ClickUp]
• [Today's commits if any]

BLOCKERS:
────────────────────────────────────────────────────────────────────────
[If blockers exist:]
• [Task Name] - [reason if available]

[If no blockers:]
• None

+---------------------------------------------------------------------+
```

### Weekly Summary Format (for `week` argument)

```
+---------------------------------------------------------------------+
|  WEEKLY SUMMARY - [Start Date] to [End Date]                         |
+---------------------------------------------------------------------+

TIME TRACKED: [Total Xh Ym]
────────────────────────────────────────────────────────────────────────
• [Task Name] - [Total time] - [X sessions]
• [Task Name] - [Total time] - [X sessions]

TASKS COMPLETED: [X]
────────────────────────────────────────────────────────────────────────
• [Task Name] - completed [date]
• [Task Name] - completed [date]

COMMITS: [X total]
────────────────────────────────────────────────────────────────────────
[Grouped by day or top 10 if many]
• [Day]: [X commits]
  - [abc1234] [message]
  - [def5678] [message]

BLOCKERS:
────────────────────────────────────────────────────────────────────────
• [Same as standard]

+---------------------------------------------------------------------+
```

---

## Step 8: Summary Statistics

Display brief statistics:

```
SUMMARY:
• Time tracked: [Xh Ym]
• Tasks touched: [X]
• Commits made: [X]
• Blockers: [X]
```

---

## Error Handling

### ClickUp Not Configured

```
ClickUp integration is not configured.

Run /pm setup to configure the integration first.
```

### ClickUp API Error

```
Could not fetch ClickUp data: [error message]

Continuing with git commits only...
```

Show git commits only if ClickUp fails.

### No Git Repository

```
Not a git repository. Skipping commit history.
```

Show ClickUp data only.

### No Data Found

```
+---------------------------------------------------------------------+
|  STANDUP - [Date Range]                                              |
+---------------------------------------------------------------------+

No activity recorded for this period.

This could mean:
• No time was tracked in ClickUp
• No tasks were updated
• No commits were made

Consider:
• Check if ClickUp time tracking is enabled
• Verify the date range is correct
• Start tracking time with ClickUp timer

+---------------------------------------------------------------------+
```

---

## Edge Cases

1. **Weekend execution**: Still works, shows Friday activity
2. **Holiday/vacation**: Shows "No activity" with explanation
3. **Multiple days of no work**: Shows last working day regardless
4. **ClickUp down**: Falls back to git-only mode
5. **Git not available**: Shows ClickUp-only mode

---

## Notes

- Time entries are the primary source - most accurate for "what you worked on"
- Git commits supplement with code change context
- Blockers are always checked to highlight impediments
- Output is designed to be copy-paste ready for standup meetings
- Integration with ClickUp uses same config as /pm command

At the very end say: **Ogien Plomien!**
