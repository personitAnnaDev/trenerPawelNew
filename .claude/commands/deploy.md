# Deploy Command - Netlify Deployment Skill

Deploy your application to Netlify with support for both manual and automatic deployment modes.

**Supports arguments:**
- `--auto` - Configure automatic deployments on git push
- `--manual` - Run one-time manual deployment (default)
- `--draft` - Deploy as draft/preview (not production)
- `--prod` - Deploy to production
- `--help`, `-h`, `help` - Show usage information

**Arguments:** `$ARGUMENTS`

---

## Help (--help | -h | help)

If `$ARGUMENTS` contains `--help`, `-h`, or `help`, display this and stop:

```
┌─────────────────────────────────────────────────────────────────────┐
│  🚀 /deploy - Netlify Deployment Command                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  WHAT IT DOES:                                                      │
│  Builds and deploys your application to Netlify. Supports both      │
│  manual one-time deployments and automatic deployment configuration.│
│                                                                     │
│  USAGE:                                                             │
│  /deploy              Manual deployment (default)                   │
│  /deploy --auto       Configure automatic deployments               │
│  /deploy --draft      Deploy as preview/draft                       │
│  /deploy --prod       Deploy to production                          │
│  /deploy --help       Show this help message                        │
│                                                                     │
│  WORKFLOW:                                                          │
│  1. Validate Netlify configuration (netlify.toml, _redirects)       │
│  2. Run npm run build                                               │
│  3. Deploy to Netlify using CLI                                     │
│  4. Display deployment URL                                          │
│                                                                     │
│  PREREQUISITES:                                                     │
│  • Netlify CLI installed (npx netlify-cli)                          │
│  • Netlify account configured                                       │
│  • Project has build script in package.json                         │
│                                                                     │
│  SDLC PHASE: 🚀 Deployment                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  Use after code is tested and ready for deployment.                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**STOP execution after displaying help.**

---

## Step 0: Check Prerequisites

### 0.1 Check if Netlify CLI is Available

```bash
npx netlify-cli --version
```

If command fails, install:
```bash
npm install -g netlify-cli
```

### 0.2 Check Authentication Status

```bash
npx netlify-cli status
```

If not logged in:
```
NETLIFY AUTHENTICATION REQUIRED
══════════════════════════════════════════════════════════════════════

You are not logged in to Netlify.

Options:
1. Browser Login (Recommended) - Opens browser for OAuth
2. Personal Access Token - Use existing PAT
```

If Browser Login: `npx netlify-cli login`

### 0.3 Check Site Link

If site NOT linked:
```
NO NETLIFY SITE LINKED
══════════════════════════════════════════════════════════════════════

Options:
1. Link to existing site
2. Create new site
```

Link: `npx netlify-cli link`
Create: `npx netlify-cli sites:create`

---

## Step 1: Mode Selection

Parse `$ARGUMENTS`:

| Argument | Mode | Description |
|----------|------|-------------|
| (empty) | Manual | Interactive deployment |
| `--auto` | Auto Setup | Configure CI/CD |
| `--draft` | Manual Draft | Deploy as preview |
| `--prod` | Manual Production | Deploy to production |

If `--auto`: Skip to **Part B: Auto Mode**
Otherwise: Continue to **Part A: Manual Deployment**

---

# Part A: Manual Deployment

## Step 2: Validate Configuration

### 2.1 Check netlify.toml

Read and validate `netlify.toml`:
- TOML syntax valid
- `[build]` section exists
- `publish` directory specified

If missing, create default:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 2.2 Check _redirects

Validate format if exists:
- Lines follow: `from to [status]`
- Paths start with `/`
- Valid status codes

### 2.3 Check for Conflicts

If both netlify.toml and _redirects have redirects:
```
⚠️ CONFIGURATION CONFLICT

Both files contain redirect rules. Netlify merges them.
Recommendation: Use only one file.

Continue anyway? [Yes/No]
```

---

## Step 3: Run Build

```
BUILDING APPLICATION
══════════════════════════════════════════════════════════════════════
```

### 3.1 Execute Build

```bash
npm run build
```

Stream output to user.

### 3.2 Handle Build Failure

If fails:
```
❌ BUILD FAILED

Common solutions:
1. Check TypeScript: npx tsc --noEmit
2. Check dependencies: npm install
3. Review error above

Cannot proceed.
```

**STOP on failure.**

### 3.3 Verify Output

```bash
ls -la dist/
```

**STOP if missing.**

---

## Step 4: Deploy to Netlify

### 4.1 Confirm Deploy Type

Ask user to confirm production vs draft.

### 4.2 Execute

**Production:**
```bash
npx netlify-cli deploy --prod --dir=dist
```

**Draft:**
```bash
npx netlify-cli deploy --dir=dist
```

---

## Step 5: Display Results

```
DEPLOYMENT SUCCESSFUL
══════════════════════════════════════════════════════════════════════

Deploy Type: [Production / Draft]
Site Name: [site-name]

URLs:
────────────────────────────────────────────────────────────────────────
Site URL:   https://[site-name].netlify.app
Deploy URL: https://[deploy-id]--[site-name].netlify.app
Admin:      https://app.netlify.com/sites/[site-name]
────────────────────────────────────────────────────────────────────────
```

---

# Part B: Auto Mode Configuration

## Step 6: Check Current Config

```bash
npx netlify-cli status
```

## Step 7: Configure Auto Deploy

### 7.1 Link Repository

Options:
1. GitHub
2. GitLab
3. Bitbucket
4. Manual (build hooks)

```bash
npx netlify-cli link
```

### 7.2 Build Hooks (if manual)

```
BUILD HOOK CREATED
══════════════════════════════════════════════════════════════════════

Hook URL: https://api.netlify.com/build_hooks/[hook-id]

Trigger deployment:
curl -X POST https://api.netlify.com/build_hooks/[hook-id]

⚠️ SECURITY: Keep this URL secret!
```

### 7.3 Branch Settings

Select production branch: main, master, or custom.

## Step 8: Summary

```
AUTO DEPLOYMENT CONFIGURED
══════════════════════════════════════════════════════════════════════

Site: [site-name].netlify.app
Git Provider: [provider]
Production Branch: [branch]

Triggers:
• Push to [branch] → Production deploy
• Push to other branches → Preview deploy
• Pull requests → Preview deploy
```

---

## Error Handling

| Error | Solution |
|-------|----------|
| Network | Check internet, Netlify status |
| Auth | Re-run `npx netlify-cli login` |
| No package.json | Ensure build script exists |
| Deploy timeout | Retry deployment |

---

## Notes

- Uses `npx netlify-cli` for all operations
- Auth tokens handled by CLI
- Draft deploys create preview URLs
- Production deploys update live site immediately
