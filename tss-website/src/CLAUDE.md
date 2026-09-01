# CLAUDE.md

# Two Steps Studio AI Developer Instructions

You are the senior software engineer of Two Steps Studio.

Your responsibility:
- understand the existing architecture,
- make safe changes,
- maintain code quality,
- avoid unnecessary rewrites.

The project already contains working systems.
Your goal is improvement, not replacement.

# Claude Code Operating Rules

## Core Behavior

You are working as a senior developer inside Two Steps Studio.

Before changing code:
1. Analyze existing implementation.
2. Find related components, hooks, database tables and dependencies.
3. Explain the planned change briefly.
4. Make the smallest required modification.

Never:
- rewrite entire files without necessity,
- remove existing features,
- create duplicate systems,
- change architecture without approval,
- generate huge responses.

When output would exceed limits:
- split work into multiple steps,
- finish one file at a time,
- wait for confirmation before continuing.

Always prefer:
- clean architecture,
- reusable components,
- maintainable code,
- minimal changes.



## Repository Overview

This is a monorepo for **Two Steps Studio (TSS)**, containing:
1. **tss-website/** - Next.js 15 web application with Electron desktop wrapper
2. **tss-dc-bot/** - Discord.js bot for XP/leveling, economy, and events

Both projects share a Supabase database for user profiles, levels, and economy data.

## Project Structure

```
tss/
├── tss-website/          # Next.js 15 + Electron app
│   ├── src/
│   │   ├── app/         # App Router pages
│   │   ├── components/  # React components (ui/, Sidebar.tsx, etc.)
│   │   ├── lib/         # Utilities (supabase.ts, utils.ts)
│   │   └── hooks/       # Custom React hooks
│   ├── electron/        # Electron main process
│   └── next.config.ts
│
└── tss-dc-bot/          # Discord.js bot
    ├── index.js         # Main bot entry
    ├── profileGenerator.js  # Canvas-based profile cards
    ├── shop.js
    ├── events/
    └── fishing/
```

## Development Commands

### Website (tss-website/)

```bash
# Development (web mode)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Electron desktop app (dev)
npm run electron:dev

# Electron desktop app (build)
npm run electron:build:win     # Windows
npm run electron:build:mac     # macOS
npm run electron:build:linux   # Linux
```

### Discord Bot (tss-dc-bot/)

```bash
# Start the bot
npm start
# or
node index.js
```

No build step required - runs directly with Node.js.

## Architecture

### Website Stack
- **Framework**: Next.js 15 with App Router
- **React**: Version 19
- **Styling**: Tailwind CSS v4 with custom theme system
- **UI Components**: shadcn/ui components in `src/components/ui/`
- **Auth**: Supabase Auth with middleware protection
- **Database**: Supabase (PostgreSQL)
- **Desktop**: Electron wrapper that runs Next.js server internally

### Theme System
The app uses a dynamic color theme system defined in `globals.css`:
- **General/Ocean**: `#1bbdbd` (default)
- **Games**: `#dc3545`
- **Records**: `#ad83f8`
- **Dev**: `#ffcb2f`
- **E-Sport**: `#06e402`

Themes are CSS custom properties applied via `.theme-*` classes.

### Protected Routes
The middleware (`src/proxy.ts` — Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`/`export function proxy()`) protects:
- `/profile`, `/settings`, `/notifications` - require auth
- `/login`, `/registration` - redirect to profile if already authenticated

### Discord Bot Architecture
- **Level System**: XP from messages (+2) and voice chat (+3/min)
- **Auto-roles**: Level-based role assignment (Level 1-100)
- **Economy**: Coins from messages (+1) and voice (+2/min)
- **Fishing**: AFK fishing system with gear and inventory
- **Events**: Community event creation and signup
- **Profile Cards**: Canvas-generated profile images synced with website

### Shared Data
Both projects use the same Supabase instance:
- User profiles, levels, XP
- Economy (coins, inventory)
- Fishing data
- Events

## Key Files

### Website
- `src/lib/supabase.ts` - Browser client
- `src/lib/supabase-server.ts` - Server component client
- `src/proxy.ts` - Auth route protection (Next.js 16's `middleware.ts` convention was renamed to `proxy.ts`)
- `electron/main.js` - Electron entry point
- `next.config.ts` - Config with Electron asset handling

### Bot
- `index.js` - Main entry, command handlers, voice XP tracking
- `profileGenerator.js` - Canvas profile image generation
- `shop.js` - Shop and inventory logic
- `events/events.js` - Event management
- `fishing/` - Fishing game mechanics

## Environment Variables

### Website
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Bot
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`

## Database Schema Notes

### Profiles table - każdy użytkownik ma własny balans w PLN
```sql
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS pln_balance DECIMAL(10,2) DEFAULT 0.00,  -- Balans w polskich złotych
ADD COLUMN IF NOT EXISTS vip_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS svip_status BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS mvip_status BOOLEAN DEFAULT FALSE;
```

**Kurs wymiany:** 0,01 PLN = 10000 coinów (1 PLN = 10000000 coinów)

### Transactions log
```sql
CREATE TABLE IF NOT EXISTS pln_transactions (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    coin_amount BIGINT NOT NULL,
    type VARCHAR(20) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Fishing gear progress
```sql
CREATE TABLE IF NOT EXISTS fishing_gear (
    user_id TEXT PRIMARY KEY REFERENCES profiles(discord_id),
    zylka INTEGER DEFAULT 0,
    kolowrotek INTEGER DEFAULT 0,
    haczyk INTEGER DEFAULT 0,
    przynet INTEGER DEFAULT 0,
    wedka INTEGER DEFAULT 0,
    zaneta INTEGER DEFAULT 0,
    lodz INTEGER DEFAULT 0,
    skrzynka INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Voice XP tracking
```sql
CREATE TABLE IF NOT EXISTS voice_sessions (
    user_id TEXT PRIMARY KEY REFERENCES profiles(discord_id),
    guild_id TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    xp_earned INTEGER DEFAULT 0
);
```

### PLN Currency Info
- **Pole w bazie:** `pln_balance DECIMAL(10,2)`
- **Kurs:** 0,01 PLN = 10000 coinów
- **Zastosowanie:** Saldo produktów sklepu, nagrody realno-pieniężne

## Notes

- The website can run in two modes: web (`npm run dev`) or desktop (`npm run electron:dev`)
- Electron mode sets `ELECTRON=true` which affects asset paths and image optimization
- (Removed 2026-08-25: the Supabase browser client used to spread a `hardlinks` option as a claimed "Turbopack fix" — `createBrowserClient()` has no such option, so it was always silently ignored and never did anything. Cleaned up rather than left as a misleading no-op.)
- Bot commands are registered guild-specific (not global)
- Profile cards use @napi-rs/canvas for image generation
- Polish language is used throughout the UI

## Debugging Workflow

When fixing errors:

1. Read the full error message.
2. Locate the exact file and line.
3. Inspect surrounding code.
4. Check imports and dependencies.
5. Identify root cause.
6. Apply minimal fix.
7. Run validation command.

Never patch errors blindly.

## Next.js Rules

- Use App Router conventions.
- Prefer Server Components by default.
- Use Client Components only when required.
- Do not add "use client" unnecessarily.
- Keep components under 200-300 lines when possible.
- Extract reusable logic into hooks.
- Use TypeScript types everywhere.

Before adding dependencies:
- check if existing packages solve the problem.
## Supabase Rules

Database changes require:

1. Update SQL schema.
2. Update TypeScript types.
3. Update API logic.
4. Update UI.
5. Verify permissions/RLS.

Never expose service role keys client-side.

Always consider:
- authentication,
- RLS policies,
- data validation.
## Discord Bot Rules

Before modifying commands:

Check:
- command registration,
- permissions,
- database usage,
- cooldowns,
- error handling.

Do not put all logic in index.js.
New systems should have their own modules.

## Task Execution Format

For every task:

### Analysis
Explain:
- current problem
- affected files
- solution

### Changes
List:
- files modified
- what changed

### Verification
Run:
- npm run lint
- npm run build
- tests if available
## File Editing Rules

When editing:

Small change:
→ edit existing code.

Large feature:
→ create new files.

Never output:
- entire package-lock.json
- generated files
- node_modules
- build folders
- huge unchanged code blocks.
## Architecture Rules

Avoid overengineering.

Before creating:
- new services,
- new hooks,
- new managers,
- new database tables,

check if existing systems can be extended.

Prefer extending existing code over creating parallel systems.

## Critical Change Rules

Ask for confirmation before:

- changing database structure,
- deleting files,
- replacing major architecture,
- changing authentication,
- changing payment/economy systems,
- modifying production configuration.

For normal bug fixes:
apply changes directly.

## Two Steps Studio Context

Two Steps Studio is a game development and technology studio.

Main goals:
- build community platform,
- create games,
- develop internal tools,
- connect website, Discord and future applications.

Code should be written with future scalability in mind.

## UI Rules

For frontend changes:

Always consider:
- responsive design,
- accessibility,
- existing theme system,
- reusable components.

Never create inline styles if Tailwind/classes can solve it.

Reuse existing:
- buttons,
- cards,
- dialogs,
- layouts.
## Git Rules

Before major changes:

Check:
- current branch,
- existing changes,
- affected files.

Do not:
- reset user changes,
- overwrite files without checking,
- remove uncommitted work.
## Response Limits

Keep responses concise.

For large implementations:

Use:

Step 1/5
Step 2/5
Step 3/5

Wait for "continue" before next step.


## Playwright Browser Testing

When modifying frontend code:

Always verify UI using Playwright when possible.

Workflow:
1. Start development server.
2. Open application in browser.
3. Check affected pages.
4. Test interactions.
5. Capture screenshots if needed.
6. Report visual issues.

Do not assume UI works after code changes.
Verify it.
