# Development Agents

These agents can be invoked via the Task tool to perform specialized development tasks automatically.

---

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| [code-reviewer](./code-reviewer.md) | CLAUDE.md principles check | After significant code changes |
| [test-case-generator](./test-case-generator.md) | Generate test checklists | After feature implementation |
| [memory-bank-sync](./memory-bank-sync.md) | Keep docs in sync | After commits |
| [quick-lint](./quick-lint.md) | TypeScript + secrets scan | During development |
| [dep-analyzer](./dep-analyzer.md) | Security + bundle size | After npm install |
| [adr-generator](./adr-generator.md) | Architecture Decision Records | After major decisions |
| [sample-template-agent](./sample-template-agent.md) | Example agent template | When creating new agents |

---

## Agent Format

All agents use YAML frontmatter format:

```yaml
---
name: agent-name
description: Description with examples showing when to invoke the agent.\n\nExamples:\n\n<example>\nContext: [situation]\nuser: "[user message]"\nassistant: "[assistant response]"\n<Task tool call to agent-name>\n</example>
model: inherit
---

[Agent prompt/instructions body]
```

### Key Fields

| Field | Purpose |
|-------|---------|
| `name` | Agent identifier (used in Task tool calls) |
| `description` | When/why to use, with XML examples |
| `model` | Model to use (inherit, sonnet, opus, haiku) |
| Body | Full agent instructions and persona |

---

## How to Invoke Agents

Use the Task tool with the agent's subagent_type:

```
Task tool call:
  subagent_type: "code-reviewer"
  prompt: "Review my recent code changes"
  description: "Review code changes"
```

---

## Quick Reference

### Code Quality
```
# Code Review - Check KISS, SOLID, DRY, YAGNI compliance
subagent_type: "code-reviewer"
prompt: "Review the code changes I just made"

# Quick Lint - Fast TypeScript + secrets check
subagent_type: "quick-lint"
prompt: "Quick check my changes"
```

### Testing
```
# Generate Test Cases
subagent_type: "test-case-generator"
prompt: "Generate test cases for the login feature"
```

### Dependencies
```
# Analyze Dependencies
subagent_type: "dep-analyzer"
prompt: "Analyze lodash for security and bundle size"
```

### Documentation
```
# Sync Memory Bank
subagent_type: "memory-bank-sync"
prompt: "Check if memory-bank is up to date"

# Generate ADR
subagent_type: "adr-generator"
prompt: "Generate an ADR for choosing Supabase as backend"
```

---

## Development Flow

```
npm install ──► dep-analyzer ──► Safe? ──► Continue
     │               │              │
     │               ▼              ▼
     │          Fix/Remove      Write Code
     │                              │
     │                              ▼
     │         quick-lint ◄──► More Code ──► code-reviewer
     │              │                             │
     │              ▼                             ▼
     │         Fix Issues                    Fix Issues
     │                                            │
     ▼                                            ▼
Major Decision ──► adr-generator         Feature Done
     │                                            │
     ▼                                            ▼
docs/adr/XXXX.md                  test-case-generator
                                                  │
                                                  ▼
                                              Commit
                                                  │
                                                  ▼
                                        memory-bank-sync
```

---

## Adding New Agents

1. Create a new `.md` file in this directory
2. Use the YAML frontmatter format (see sample-template-agent.md)
3. Include:
   - Clear `name` identifier
   - `description` with `<example>` blocks showing usage
   - `model: inherit` (or specify sonnet/opus/haiku)
   - Agent prompt body with identity, responsibilities, and output format
4. Update this README with the new agent
