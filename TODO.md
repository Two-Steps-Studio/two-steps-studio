# Competitive Teardown: Guidon vs. the Context/Memory PM Landscape (August 2026)

## TL;DR
- **No shipped competitor combines all four of Guidon's pillars** — a cross-domain Context Layer graph, contextual "Why"/decision surfacing next to tasks, a persistent FACT-vs-AI-INSIGHT provenance state, and a provider-neutral "Generic Agent Context" package. Individual pieces exist (Plane's embedded AI, projectmem's issue/attempt/fix log, Align's decision graph), but none integrate them in a mainstream PM product.
- **Guidon's single most defensible whitespace is the persistent AI-provenance/trust state (FACT vs AI INSIGHT with accept/correct/reject) attached to records**, plus a first-class "Decision" entity auto-surfaced next to tasks and a "Previous Attempts" field for agent/human failures — none of which is natively shipped by Plane, Linear, Jira, Notion, GitHub, or GitLab as of August 2026.
- **The biggest risks are Plane.so and the open-source projectmem project.** Plane is executing fast on embedded AI, git-native config (Plane Compose), MCP, and self-hosted/air-gapped parity; projectmem already ships the exact concept of an append-only log of typed "issues, attempts, fixes, decisions, and notes" with a deterministic gate that "warns an agent before it repeats a previously failed fix" (arXiv:2606.12329). Guidon must differentiate on the human-facing graph + provenance UX, not on raw agent-memory plumbing.

## Key Findings

**1. Plane.so is the closest and most dangerous competitor**, but its AI is a retrieval/action assistant, not a provenance system. Plane AI reads the whole workspace (work items, cycles, modules, pages, comments, members), answers in natural language, and can create/update work items with a three-mode safety model (Ask / Build / Autopilot). It shows a "Thinking" panel for transparency and per-block accept/reject in the page editor — but it does **not** persistently label content as FACT vs AI-generated inference. Plane Compose ships git-native "projects-as-code" (YAML schema + work items, PR review, local files as source of truth). Plane has an open-source MCP server and MCP connectors, self-hosted + air-gapped deployments, and per-seat pricing with AI credits.

**2. Linear has strong agent plumbing but no decision/rationale layer.** Linear Agent (public beta, March 2026) drafts issues, triages, and synthesizes context; the official hosted MCP server exposes ~31 tools and is heavily used by coding agents. But Linear has **nothing equivalent to a decision-log/"why" layer** and no persistent provenance state on issues.

**3. Height is dead; Cycle is absorbed.** Height shut down September 24, 2025. Cycle.app was acquired by Atlassian (announced September 3, 2025; standalone product sunset October 31, 2025), with team/tech folded into Jira Product Discovery. Neither is a live competitor.

**4. GitHub is git-native by definition but weak as a general PM tool** with no decision/rationale layer and no provenance state.

**5. ADR tooling is fragmenting into a new "decision graph" category** (Align.tech, Catio) that is moving toward exactly Guidon's space — capturing decisions and serving them to AI agents — but from the code/architecture side, not the PM side.

**6. projectmem (open-source, 2026) is the sharpest single-feature threat** — it already implements typed issue/attempt/fix/decision/note events and a "judgment layer" that warns agents before repeating failed attempts.

**7. Game-dev PM is well served by Codecks and HacknPlan** for lightweight custom entities, but neither has AI/provenance/agent-context features.

## Details

### 1. Plane.so (top priority)

**What ships today (verified from Plane docs/changelog):**
- **Plane AI** is an embedded AI layer, not a bolted-on chatbot. In **Ask** mode it is read-only and retrieves across work items and all properties, projects/cycles/modules/views/teamspaces/initiatives, page content, members, Plane's own docs, and the web (when enabled). **Build** mode plans actions, shows them as action cards, and waits for confirmation before any change. **Autopilot** executes immediately. This three-mode design is an explicit safety model.
- Presentation: a collapsible **"Thinking" panel** exposes the AI's reasoning/tool calls; in **Pages**, AI content appears as **per-block proposals you accept/reject** (Cmd+Opt+Enter/Backspace). Page summaries carry a **stale indicator**. Duplicate detection uses vector search at creation time; label prediction is automatic.
- **Crucially, Plane AI does NOT distinguish sourced FACT from AI-generated inference as a persistent state.** Its accept/reject is a transient editor interaction; once committed, content carries no durable provenance/trust label. It shows a generic consent note ("you consent to sharing the message with a 3rd party service") but no per-claim trust status.
- Models available on Cloud: GPT-5.4 (default), GPT-5.2, Claude Sonnet 4.6, Claude Sonnet 4.5. Embedding model powers semantic search. Web search only on OpenAI/Anthropic models, not self-hosted.
- **Plane Compose** ("projects-as-code"): schema (states, labels, workflows, custom fields) and work items as human-readable YAML, committed to git, reviewed via PRs; **local files are the source of truth** (not bidirectional merge). CLI verbs: `plane schema pull/push`, `plane push/pull`, `plane clone`. This is a direct overlap with Guidon's git-native ambitions.
- **MCP:** open-source MCP server (multi-transport: HTTP+OAuth, PAT, Stdio, SSE) works with Cursor, Claude Code, Claude Desktop, VSCode, Windsurf, Zed. Plus MCP connectors (GitHub, PostHog, Granola) usable inside Build/Autopilot. A dedicated Cursor integration exists.
- **Self-hosted / air-gapped:** Plane AI came to commercial self-hosted on March 3, 2026, reaching cloud/self-hosted parity; supports air-gapped deployments; certified ISO 27001:2022, SOC 2 Type 2, GDPR. Self-hosted allows bring-your-own model key with no credit metering.
- **Pricing:** Free ($0, up to 12 users, 500 AI credits/seat/mo, no rollover), Pro ($6/seat/mo, 1,000 credits, 1-mo rollover), Business ($13/seat/mo, 2,000 credits, 3-mo rollover), Enterprise Grid (custom, air-gapped, up to 12-mo rollover). AGPL-3.0 open-core; founded November 2022 in Hyderabad by brothers Vamsi Kurama (CEO) and Vihar Kurama (COO), with a $4M seed led solely by OSS Capital (announced April 24, 2024); the makeplane/plane repo has 40,000+ GitHub stars.
- **Recent 2026 momentum:** AI Skills (save/reuse instructions), audit logs, shared dashboards, Bitbucket, Mermaid diagrams, PQL live results in AI chat, Confluence import, web search in Plane AI (Feb 2026), Enterprise Grid (June 2026), and an MCP partner program (Evermuse, July 2026).

**Overlap with Guidon:** Plane already owns the "AI as first-class, context-aware citizen" narrative, git-native config, Wiki+AI, MCP, and self-hosted/air-gapped. This is the most crowded overlap.

**Gap Guidon can exploit:** Plane has (a) **no persistent FACT-vs-AI-INSIGHT provenance state**, (b) **no first-class Decision entity** with rationale auto-surfaced next to a task (it publishes a decision-log blog template but ships no native entity), (c) **no "Previous Attempts" field**, and (d) **no unified cross-domain graph** connecting Work↔Knowledge↔Development↔Decisions as typed relations. Its "Custom Relations" and workspace work-item types are the nearest primitives.

### 2. Linear

**What ships:** Linear Agent (public beta, March 2026) works from a chat panel, comments, Slack, and MS Teams; drafts issues from meeting notes/threads, suggests priorities/project-update text, and runs reusable "Skills"; Automations (Business/Enterprise) run agent workflows when issues enter triage. Triage Intelligence auto-suggests assignees/teams/projects/labels from historical patterns. The **official hosted MCP server** (mcp.linear.app/mcp, launched May 1, 2025, OAuth 2.1, built with Cloudflare/Anthropic) is expanding steadily — third-party catalogs count ~31 tools — covering create/update/search issues, comments, attachments, projects, cycles, and (added February 5, 2026) initiatives, initiative updates, project milestones/updates, and project labels. Issues expose a `branchName` field that Claude Code/Cursor read to auto-checkout. Pricing: Free $0, Basic $10/user/mo, Business $16/user/mo, Enterprise custom (annual).

**Overlap:** Best-in-class agent/MCP plumbing and Slack→issue→coding-agent handoff.

**Gap:** **Linear has no decision/rationale/"why" layer and no persistent provenance state.** The connector is point-in-time (a raw snapshot); decisions that move to Slack/PRs are not reconciled back. No "Previous Attempts." This is a clean, explicit gap.

### 3. Height

**Status: shut down.** Height ceased operations with a final service date of September 24, 2025, after $18.3M raised (including a $14M Series A led by Redpoint Ventures in October 2021; founded 2018 by ex-Stripe engineer Michaël Villar) and a pivot to "autonomous project management" (Height 2.0, Oct 2024). Not a live competitor. Its 2.0 pitch — autonomously grooming backlogs, triaging bugs, updating specs — is a cautionary precedent: autonomy-first PM without a trust/provenance layer.

### 4. GitHub Projects / Copilot

**What ships:** Copilot Workspace's issue-to-PR vision has been folded into the **Copilot Coding Agent** (GA Sept 2025): assign an issue to Copilot, it explores the repo, writes code, runs tests, opens a PR. Mission Control (late 2025) manages concurrent agent tasks. Copilot Spaces (GA Sept 2025) bundle files/issues/PRs/docs as grounding context; repos support `copilot-instructions.md` and `AGENTS.md`. Agentic code review (March 2026) gathers repo context before commenting. Billing moved to usage-based "AI Credits" June 1, 2026.

**Overlap:** Native git-linkage (issues↔PRs↔branches) and repo-grounded context (Spaces, AGENTS.md) is genuinely strong and free-ish inside the ecosystem.

**Gap:** GitHub Projects is a weak general PM tool — no cross-functional structure, no knowledge/wiki graph, no decision layer, no provenance state, no custom entities. Context lives at the repo/PR level, not as a durable project-memory graph. "GitHub Copilot Workspace" as a standalone product is effectively deprecated/absorbed; treat references to "Workspace" as historical.

### 5. Cycle.app

**Status: acquired by Atlassian** (announced September 3, 2025; standalone product sunset October 31, 2025), team/tech folded into Jira Product Discovery to power AI feedback capture. Cycle was founded 2019 by Mehdi Boudoukhane (via the Hexa/eFounders studio) on a ~$6M seed. As an independent product it is effectively gone. Its model (Feedback→Insights→Roadmaps→Release, with Slack/Intercom/Gong/Zendesk capture) was feedback-centric, not a decision/provenance/agent-context system.

### 6. ADR tooling & the emerging "decision graph" category

- **adr-tools / Log4brains / dotnet-adr / MADR:** docs-as-code Markdown ADRs in-repo, static-site generation, supersession tracking. The field is young and fragmented; none has meaningfully added AI or issue-tracker integration. Their universal weakness: **decisions don't stay in the file** — they change in Slack/GitHub/Jira and go stale.
- **Align.tech (UK, design-partner phase 2026):** an explicit **"decision graph"** that auto-captures engineering decisions from Slack/Jira/GitHub/Teams, links them into a queryable graph, catches cross-team conflicts before they ship, and serves the same source of truth to agents and engineers. MIT-licensed CLI/connector SDK; self-hostable/air-gapped. This is the **closest philosophical competitor to Guidon's Context Layer**, but comes from the SDLC/architecture side and is not a PM tool.
- **Catio:** treats decisions as a queryable corpus tied to live system (architecture) state.

**Overlap:** Align in particular targets the same "agents and humans share one decision source of truth" thesis and explicitly ties ADRs to the AI-agent-refactoring problem.

**Gap Guidon can exploit:** These are code/architecture-decision tools, not task-native. None surfaces decisions **contextually next to a task/kanban card**, none has a FACT-vs-INSIGHT trust state, and none packages agent context (acceptance criteria + related PRs + previous attempts). Guidon's opportunity is to be the **PM-native** decision graph.

### 7. Emerging "context layer / project memory / agent-ready" startups

- **projectmem (open-source, MIT, 2026)** is the most direct conceptual overlap and the sharpest threat to Guidon's agent-context story. Per its arXiv paper (Malo & Qiu, arXiv:2606.12329), it records development as "an append-only, plain-text event log of typed events — issues, attempts, fixes, decisions, and notes" and projects them into compact AI-readable summaries over a native MCP server. The paper frames the core problem Guidon also targets: "Reconstructing this context can consume an estimated 5,000–20,000 tokens per session; the bottleneck is often not model capability but missing project memory." Its differentiator is a **"judgment layer": a deterministic pre-action gate that warns an agent before it repeats a previously failed fix or edits a known-fragile file** — which the authors name "Memory-as-Governance." It ships as a three-dependency Python package with **14 MCP tools, 19 CLI commands, and 37 automated tests**, validated through a two-month self-study across 10 projects comprising 207 logged events. This is essentially Guidon's "Previous Attempts" + Generic Agent Context concept, already shipped for coding agents — but it is local-first, with no cloud, no graph UI, and no human-facing PM product.
- **Notion** has become a serious AI-PM contender: Custom Agents (autonomous, scheduled/triggered), AI Connectors, an MCP server + custom MCP servers (Business/Enterprise), Research Mode, Enterprise Search, AI Meeting Notes, native Sprints. It labels AI authorship and cites source pages but has **no persistent FACT-vs-inference trust state**.
- Broader "context management" infrastructure (DataHub, Cognee, Letta/MemGPT, Mem0) is real but operates at the data/agent-memory layer, not PM.

**Gap Guidon can exploit:** No startup combines projectmem's typed memory/judgment layer with a **human-facing project graph, decision entities, and a persistent provenance UX** in a PM product. Guidon can be the "projectmem for teams, with a trust layer."

### 8. Structured agent-context tooling

The ecosystem is converging on `AGENTS.md`/`CLAUDE.md`/`copilot-instructions.md` (repo-level, static, progressive-disclosure context) and on LLM-generated GitHub-issue-style task specs (problem statement + expected behavior + constraints + acceptance criteria). GitHub Copilot Spaces bundle files/issues/PRs/docs. **projectmem is the only tool found that tracks "Previous Attempts" (failed attempts) as first-class, queryable records.** No mainstream PM tool packages "acceptance criteria + related decisions + relevant files + related PRs + project constraints + previous attempts" as a provider-neutral agent context bundle.

**Gap:** Guidon's "Generic Agent Context" (provider-neutral, PM-native, includes Previous Attempts) is genuine whitespace at the PM layer — but Guidon must assume projectmem-style agent-memory becomes commoditized plumbing, so the defensibility is in the human graph + provenance, not the MCP export itself.

### 9. Game-dev PM (for the Custom Entity System)

- **Codecks:** game-dev-specific, card/deck ("collectible card game") UX, tracks effort per discipline (art/code/audio), infinite-canvas big-picture map linked to cards, dependencies, milestones/Runs. Praised as "just the right amount of complexity" — the anti-ClickUp.
- **HacknPlan:** game-dev-specific, discipline-based Kanban, and a standout **integrated Game Design Document (GDD)** system that links specific design-doc sections to tasks — conceptually similar to Guidon linking Knowledge↔Work. Customizable categories/stages/tags, milestones, metrics.

**Overlap:** Both already do **lightweight, game-shaped structure without enterprise bloat** — HacknPlan's GDD-to-task linking is the nearest analog to Guidon's Quest/Level/Asset/Character templates.

**Gap:** Neither has AI, provenance, decision logging, MCP, or agent context. Neither generalizes its game structure into a **user-definable custom-entity system** for other domains. Guidon's dogfood-via-gamedev custom entities are defensible **only if** they generalize beyond gamedev and connect to the Context Layer/agent context — otherwise Codecks/HacknPlan already win on pure gamedev PM.

### Cross-cutting finding: the Decision entity and the provenance state are the two real gaps

Dedicated research confirms:
- **No mainstream PM/dev tool ships a first-class, persistent "Decision" entity that auto-links rationale to specific tasks and surfaces it contextually beside the task.** Closest natives are Confluence's Decisions blueprint (structured pages + a decision register, but no automatic task-side surfacing) and Azure DevOps's "Decision" work item (only in the specialized Dynamics 365 business-process-catalog template, links to change requests but not auto-surfaced). Jira requires a DIY custom issue type or marketplace add-ons; Jira Product Discovery's "Insights" capture evidence for *ideas*, not a formal decision log. Linear, Notion, Plane, GitLab, Shortcut have no native Decision entity.
- **No mainstream PM/issue tracker ships a persistent FACT-vs-AI-INSIGHT trust state with accept/correct/reject that stays attached to the record.** What exists is limited to AI-authorship labels/disclaimers (Atlassian Rovo AI generation component + AI footer), transient editor accept/reject (Plane, GitLab Duo, all copilots), internal-only confidence scores not surfaced persistently (GitLab Duo label suggestions return a numeric confidence used internally), and source citations (Notion Q&A). The durable per-record FACT-vs-INSIGHT distinction is a market gap.

## Recommendations

**Stage 1 — Build the two true differentiators first (V0.1–V0.3):**
1. **Persistent FACT vs AI INSIGHT provenance state.** Make every AI-generated field/claim a first-class record with a durable status (FACT-from-source / AI-INSIGHT pending / accepted / corrected / rejected), attribution to source, and an audit trail. This is the single most defensible, currently-unshipped concept. Benchmark to change course: if Atlassian Rovo, Plane, or Linear ship a *persistent* per-record trust badge (not just an "AI-generated" disclaimer), accelerate and go deeper on correction workflows and source binding.
2. **First-class Decision entity auto-surfaced next to tasks.** Not a wiki page — a typed node in the graph with rationale, alternatives considered, sources, supersession links, and automatic contextual surfacing on related kanban cards. Benchmark: if Linear or Plane ship a native decision/rationale object, differentiate on auto-surfacing and graph relations.

**Stage 2 — Ship the graph and agent context (V0.4–V0.7):**
3. **The Context Layer graph** connecting Work↔Knowledge↔Development↔Decisions↔Sources as typed relations — this is the moat that makes 1 and 2 more than features. Assume Plane's "Custom Relations" and Notion's connectors are the fast-followers.
4. **"Previous Attempts" as a first-class field** on tasks (failed human + agent attempts, what was tried, why it failed). This directly counters projectmem but at the team/PM layer. Benchmark: projectmem or Linear/GitHub adding a queryable failed-attempts record raises urgency.
5. **Generic Agent Context package** (provider-neutral, over MCP): description + acceptance criteria + related decisions + relevant files + related PRs + constraints + previous attempts. Treat the MCP export as commoditizing; the value is the *curated, provenance-tagged* payload the graph produces.

**Stage 3 — Match table stakes without over-investing (V0.8–V1.0):**
6. **Git-native config + self-hosted/air-gapped** are now table stakes (Plane Compose, Align). Match, don't out-build — a lean YAML/PR config and a self-host path are enough for V1.
7. **Custom Entity System dogfooded via gamedev** — build it as a *general* user-definable entity system (Quest/Level/Asset/Character as templates, not hardcoded), explicitly wired into the Context Layer and agent context, so it beats Codecks/HacknPlan on integration rather than competing on pure gamedev UX.

**De-prioritize / avoid re-building:** generic AI chat assistant, NL issue creation, AI charts/summaries, duplicate detection, auto-triage — all commoditized (Plane, Linear, Notion all ship these). Do not lead with these.

## Whitespace Summary — "Already Exists" vs. "Genuine Whitespace"

**Already shipped elsewhere (do not claim as differentiators):**
- Embedded, workspace-aware AI assistant with read/act modes and reasoning transparency → **Plane** (Ask/Build/Autopilot + Thinking panel)
- Git-native / projects-as-code configuration → **Plane Compose**, and philosophically **Align**
- Provider-neutral MCP server for coding agents → **Plane, Linear, Notion, GitHub** (all ship official/robust MCP)
- Self-hosted + air-gapped deployment → **Plane, Align**
- Slack→issue→coding-agent handoff and auto-triage → **Linear, GitHub, Codex/Copilot**
- Repo-level agent context files (AGENTS.md/Spaces) → **GitHub, the broader ecosystem**
- Typed agent memory with failed-attempt avoidance for *coding agents* → **projectmem**
- Lightweight game-shaped custom structure + GDD-to-task linking → **Codecks, HacknPlan**

**Genuine whitespace (ranked by defensibility):**
1. **Persistent FACT vs AI INSIGHT provenance/trust state on records** (accept/correct/reject that stays attached). Not shipped anywhere in PM/issue tracking. Hard to copy because it requires a product-data-model commitment, not just an LLM call — competitors currently treat AI output as either a disclaimer-labeled blob or a transient editor suggestion.
2. **First-class Decision entity auto-surfaced contextually next to tasks.** No mainstream tool does this natively; the closest (Confluence blueprint, Azure DevOps Dynamics template) are structured pages/records that do not auto-surface beside a task. Defensible because it demands tight graph integration between Knowledge, Work, and Decisions.
3. **Unified Context Layer graph (Work↔Knowledge↔Development↔Decisions↔Sources) inside a PM product.** Align and Catio build decision graphs from the code side; no PM product unifies all four domains as typed relations. Defensible as the connective tissue that makes 1 and 2 more than isolated features.
4. **Team-level "Previous Attempts" (human + agent failures) as queryable first-class records.** Only projectmem does this, and only local-first for coding agents. Defensible at the PM/team layer where cross-session, cross-person institutional memory matters.
5. **PM-native, provenance-tagged Generic Agent Context bundle** (acceptance criteria + decisions + files + PRs + constraints + previous attempts, provider-neutral). Whitespace at the PM layer, but treat the MCP export itself as commoditizing — the moat is the *curated, provenance-tagged* payload the graph produces, not the transport.

## Caveats
- Several 2026 figures (Plane models/credits, Linear/GitHub pricing, GitHub usage stats) come from vendor changelogs/docs and secondary review sites; verify current pricing and AI-credit allocations directly before publishing externally, as these change frequently.
- Plane, Notion, GitHub, and Linear are all shipping AI features on roughly monthly cadences; the "gaps" identified are accurate as of August 2026 but are the most likely areas for fast-following. The provenance/trust state is the least likely to be copied quickly because it requires product-model commitment, not just an LLM call.
- Align.tech is in a pre-GA design-partner phase; its shipped capabilities may be narrower than its marketing. Treat it as a directional signal, not a fully validated product.
- projectmem is an open-source research project (arXiv:2606.12329 + GitHub), not a funded commercial competitor; its threat is conceptual/commoditizing rather than market-share-based.
- The Height and Cycle statuses are confirmed (shutdown / acquisition); their prior features are included only for cautionary context.
- The "Decision entity" and "provenance state" gap findings are based on vendor docs (Atlassian, Microsoft Learn, GitLab, Linear) plus targeted secondary confirmation; some competitor roadmap items (e.g., GitLab Duo Code Review override proposals, Azure DevOps "future AI decision-impact" notes) are explicitly speculative/not shipped and should be monitored as leading indicators.

# GUIDON — SELF-HOSTED FIRST-CLASS ARCHITECTURE

You are working on **Guidon**, a project and work management application by **Two Steps Studio (TSS)**.

Guidon is not supposed to be just another Linear/Plane/Notion clone.

Its core differentiators are:

* Context Layer / Project Graph
* Project Memory
* First-class Decision entities
* Persistent FACT vs AI INSIGHT provenance
* Previous Attempts
* Generic Agent Context
* Git-native development context
* Custom Entity System
* Developer-first and game-development-friendly workflows

A recent competitive audit confirms that the strongest whitespace is the combination of persistent provenance, Decision entities, Context Graph and project/team memory. Plane, Linear, GitHub and other competitors already provide many generic AI/PM capabilities, so do NOT turn Guidon into a generic AI project manager.

## PRIMARY REQUIREMENT

### Guidon MUST be fully self-hostable.

Self-hosting is a **first-class product mode**, not an afterthought.

A user should be able to deploy Guidon on their own infrastructure and have a complete working application without depending on Two Steps Studio's infrastructure.

The architecture must therefore support:

```text
Guidon Cloud
        │
        ├── managed infrastructure
        └── managed services

Guidon Self-Hosted
        │
        ├── user's server
        ├── user's database
        ├── user's storage
        ├── user's AI provider
        └── user's integrations
```

Both modes must use the same core application architecture wherever possible.

---

# 1. SELF-HOSTED PRINCIPLES

Design Guidon according to these principles:

### Data ownership

In self-hosted mode:

* project data belongs to the customer
* database belongs to the customer
* files belong to the customer
* project memory belongs to the customer
* decisions belong to the customer
* context graph belongs to the customer
* AI-generated data belongs to the customer
* integrations belong to the customer

Two Steps Studio must NOT require access to customer data.

### No mandatory TSS cloud dependency

Self-hosted Guidon must continue working if:

* Two Steps Studio servers are unavailable
* TSS API is unavailable
* the user has no TSS account
* the user has no internet connection
* the user does not configure a cloud AI provider

Do not introduce hidden dependencies on TSS infrastructure.

---

# 2. DEPLOYMENT MODEL

Create a production-ready Docker-based deployment.

The preferred deployment should be:

```text
Docker Compose
```

A user should ideally be able to do:

```bash
git clone <guidon-repository>
cd guidon
cp .env.example .env
docker compose up -d
```

and access:

```text
http://localhost
```

The exact commands may differ depending on the existing project architecture, but the experience should remain this simple.

---

# 3. CONTAINER ARCHITECTURE

Design the stack so individual services are replaceable.

A reasonable baseline:

```text
                    ┌─────────────────┐
                    │     Reverse     │
                    │      Proxy      │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │    Guidon Web   │
                    │   / Application │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
       ┌──────▼─────┐ ┌──────▼──────┐ ┌─────▼──────┐
       │ PostgreSQL │ │   Storage   │ │   Worker   │
       │             │ │             │ │ / Jobs     │
       └─────────────┘ └─────────────┘ └────────────┘
              │
       ┌──────▼─────────────────────────────┐
       │       Context / Memory Layer       │
       └────────────────────────────────────┘
```

Do NOT blindly implement this diagram if the existing application architecture suggests a better design.

First inspect the repository.

---

# 4. DATABASE

Self-hosted installations must support their own PostgreSQL instance.

Do not hardcode a managed Supabase dependency into the core architecture.

If the existing project uses Supabase:

* preserve compatibility where practical
* identify which parts depend on Supabase-specific APIs
* separate application logic from Supabase-specific infrastructure
* make PostgreSQL compatibility a strategic goal

The long-term architecture should allow:

```text
Guidon
  │
  └── PostgreSQL
       ├── Self-hosted PostgreSQL
       └── Supabase PostgreSQL
```

Avoid unnecessary vendor lock-in.

If Supabase Auth is currently deeply integrated, document the dependency and isolate it behind an authentication abstraction where practical.

Do not rewrite working systems unnecessarily.

---

# 5. STORAGE

Self-hosted Guidon must support local filesystem/object storage.

The application should not assume that project files live in a TSS-managed cloud bucket.

Design a storage abstraction supporting at minimum:

```text
StorageProvider
├── LocalFilesystem
├── S3-compatible
└── Supabase Storage
```

For self-hosted installations, local storage should be possible.

S3-compatible storage should also be supported so users can use:

* MinIO
* Cloudflare R2
* AWS S3
* Backblaze B2
* other S3-compatible services

Do not make any provider mandatory unless technically unavoidable.

---

# 6. AI PROVIDER ABSTRACTION

AI is important to Guidon, but Guidon must NOT be locked to one AI vendor.

Create an AI provider abstraction.

Conceptually:

```text
AIProvider
├── OpenAI
├── Anthropic
├── OpenRouter
├── Ollama
├── Azure OpenAI
└── Custom/OpenAI-compatible endpoint
```

The exact implementation should match the existing codebase.

Self-hosted users must be able to use local AI.

For example:

```text
Guidon
   │
   └── Ollama
        │
        ├── Qwen
        ├── Llama
        └── other compatible models
```

A user should be able to run Guidon without sending project data to an external AI provider.

This is especially important for:

* proprietary code
* private company documentation
* internal decisions
* project memory
* customer data

---

# 7. AI CONFIGURATION

Create a clear configuration system.

Example conceptual configuration:

```env
AI_PROVIDER=ollama
AI_BASE_URL=http://ollama:11434
AI_MODEL=qwen3
```

or:

```env
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=...
AI_MODEL=...
```

or:

```env
AI_PROVIDER=openai
OPENAI_API_KEY=...
AI_MODEL=...
```

Do not hardcode provider-specific logic throughout the application.

Use a centralized provider abstraction.

---

# 8. AUTHENTICATION

Self-hosted Guidon needs a practical authentication system.

Support the architecture for:

* email/password
* secure sessions
* password reset
* email verification where enabled
* organization membership
* project permissions
* roles

The architecture should leave room for:

* OIDC
* OAuth
* LDAP/enterprise authentication

Do not implement every enterprise authentication system immediately unless the repository already contains the required infrastructure.

Design for extensibility instead.

---

# 9. MULTI-TENANCY

Guidon should support organizations/workspaces.

Self-hosted installations may be:

### Single organization

One company/team runs one Guidon instance.

### Multiple organizations

A single Guidon deployment can contain multiple isolated organizations.

Ensure:

```text
Organization
    │
    ├── Members
    ├── Projects
    ├── Files
    ├── Context
    ├── Decisions
    └── Memory
```

Tenant isolation must be enforced at the database/application authorization layer.

Do not rely only on frontend filtering.

---

# 10. SECURITY

Treat self-hosting as a security-sensitive deployment.

Review:

* authentication
* authorization
* RLS / database policies
* organization isolation
* project isolation
* file access
* API routes
* server actions
* SSR
* CSRF where applicable
* XSS
* SQL injection
* command injection
* secret handling
* upload validation
* file path traversal
* rate limiting
* session security
* password storage
* logging

Never expose:

```text
DATABASE_URL
API_KEYS
JWT_SECRET
ENCRYPTION_KEYS
```

to the browser.

Provide a secure `.env.example`.

Never commit secrets.

---

# 11. CONFIGURATION

Create a clear configuration strategy.

At minimum document:

```env
DATABASE_URL=
AUTH_SECRET=
APP_URL=

STORAGE_PROVIDER=
STORAGE_PATH=

AI_PROVIDER=
AI_MODEL=
AI_BASE_URL=

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OPENROUTER_API_KEY=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Only required variables should be mandatory.

Do not force users to configure every provider.

---

# 12. HEALTH CHECKS

Every production container should have appropriate health checks.

The deployment should make it possible to determine:

```text
Web       ✓
Database  ✓
Storage   ✓
Worker    ✓
AI        ✓ / not configured
```

Create an application health endpoint if one does not exist.

For example:

```text
/api/health
```

It should return useful status information without exposing secrets.

---

# 13. DATABASE MIGRATIONS

Self-hosting requires deterministic migrations.

Do NOT depend on developers manually executing random SQL scripts.

Create a proper migration workflow.

A fresh deployment should be able to:

```text
start
↓
connect database
↓
run migrations
↓
create required structures
↓
start application
```

Document how to upgrade between Guidon versions.

Never silently destroy existing data during migrations.

---

# 14. BACKUPS

Provide clear documentation for backups.

At minimum explain how to back up:

```text
PostgreSQL
+
Uploaded files
+
Configuration/secrets
```

The documentation should explain restoration.

A self-hosted product without a realistic restore path is incomplete.

---

# 15. UPDATES

Design for safe updates.

Ideally:

```text
docker compose pull
docker compose up -d
```

should update the installation.

Database migrations must run safely during updates.

Do not require users to manually modify application source code for normal upgrades.

---

# 16. OBSERVABILITY

Provide useful logs.

Do not log:

* passwords
* API keys
* session tokens
* sensitive project content unnecessarily

Use structured server logs where practical.

Make debugging a self-hosted installation possible without TSS support.

---

# 17. OFFLINE / AIR-GAPPED MODE

Guidon should be designed with air-gapped/self-hosted deployment in mind.

The core application should work without external network access after installation.

External services should be optional:

```text
GitHub        optional
OpenAI        optional
Anthropic     optional
OpenRouter    optional
Ollama        optional
S3            optional
TSS Cloud     NOT REQUIRED
```

Do not introduce telemetry that requires internet connectivity.

If telemetry is ever added, it must be:

* opt-in
* documented
* disabled by default in self-hosted mode

---

# 18. GENERIC AGENT CONTEXT

This is one of Guidon's major differentiators.

Self-hosted Guidon must be able to generate a provider-neutral context package.

Conceptually:

```text
Task
+
Acceptance Criteria
+
Project Constraints
+
Verified Facts
+
AI Insights
+
Related Decisions
+
Relevant Files
+
Related PRs
+
Previous Attempts
+
Project Memory
+
Relevant Sources
```

Output should be usable by:

* Claude Code
* Codex
* Cursor
* Windsurf
* OpenAI-compatible agents
* custom agents

MCP support should be designed as an interface, not as the core data model.

The Context Layer is the source of truth.

MCP is only one transport/interface.

---

# 19. CONTEXT LAYER

Do not treat the Context Layer as a simple collection of documents.

It should model typed relationships.

Conceptually:

```text
WORK
  │
  ├── related_to
  ├── caused_by
  ├── blocked_by
  ├── implemented_by
  └── informed_by

KNOWLEDGE
  │
  ├── sourced_from
  ├── supports
  └── contradicts

DECISION
  │
  ├── affects
  ├── supersedes
  ├── based_on
  └── alternatives

DEVELOPMENT
  │
  ├── PR
  ├── commit
  ├── branch
  └── file

MEMORY
  │
  ├── fact
  ├── constraint
  ├── observation
  ├── preference
  ├── decision_summary
  └── ai_insight
```

The graph must work identically in self-hosted and cloud deployments.

---

# 20. FACT VS AI INSIGHT

Implement this as a core data model concept.

AI-generated information should NOT automatically become trusted project truth.

Conceptually:

```text
AI INSIGHT
    ↓
Pending
    │
    ├── Accept
    ├── Correct
    └── Reject
```

After acceptance:

```text
FACT
verified_by = user
source = ...
verification_timestamp = ...
```

Maintain provenance.

A record should be able to answer:

```text
Where did this information come from?
Who created it?
Was AI involved?
Which model generated it?
Has a human verified it?
What source supports it?
When was it changed?
```

This must work in self-hosted mode without sending provenance data to TSS.

---

# 21. DECISION ENTITY

Decision must be a first-class entity.

It should support:

```text
Title
Context
Why
Decision
Alternatives
Consequences
Sources
Related Tasks
Related Projects
Related PRs
Status
Author
Created At
Updated At
Supersedes
Superseded By
```

Decisions should automatically surface in relevant project context.

Example:

```text
Task:
Implement multiplayer authentication

Related Decision:
Decision #32
Use Supabase Auth

Why:
Existing project infrastructure already uses Supabase.
```

---

# 22. PREVIOUS ATTEMPTS

Make Previous Attempts first-class project memory.

A task should be able to record:

```text
Attempt
Problem
Approach
Result
Failure reason
Files changed
Related PR
Author
Agent
Timestamp
```

AI agents should receive relevant previous failed attempts before proposing another solution.

This is important for preventing repeated failures.

---

# 23. CUSTOM ENTITIES

Guidon should eventually support custom entities.

Examples:

```text
Game Development

Quest
Character
Level
Weapon
Asset
Enemy
Mechanic
```

But do NOT hardcode Guidon around gamedev.

These should be user-definable entities.

The architecture must support:

```text
Entity Type
    ↓
Fields
    ↓
Relations
    ↓
Views
    ↓
Context Graph
```

Gamedev is the first strong use case, not the limitation of the product.

---

# 24. CLOUD VS SELF-HOSTED

Avoid creating two completely different products.

Prefer:

```text
Same Core
   │
   ├── Self-Hosted Adapter
   └── Cloud Adapter
```

Cloud-specific functionality should live behind adapters/interfaces.

Examples:

```text
StorageAdapter
DatabaseAdapter
AIProvider
EmailProvider
AuthProvider
TelemetryProvider
```

Do not scatter:

```text
if (selfHosted)
```

throughout the entire application.

Use proper abstractions.

---

# 25. ADMIN PANEL

Self-hosted installations should have an administration area.

At minimum:

```text
System Status
Database
Storage
AI Provider
Authentication
Organizations
Users
Integrations
Environment
Logs
```

Do not expose secrets.

Show configuration status rather than secret values.

Example:

```text
OpenAI
✓ Configured

API key:
••••••••••••

Model:
gpt-5.x
```

---

# 26. DOCUMENTATION

Create/update:

```text
README.md
docs/self-hosting.md
docs/configuration.md
docs/upgrading.md
docs/backups.md
docs/architecture.md
.env.example
docker-compose.yml
```

The README should clearly explain:

```text
Cloud
Self-hosted
Development
```

Do not make self-hosting documentation an afterthought.

---

# 27. LICENSING / DISTRIBUTION

Before introducing dependencies or architecture that could prevent self-hosting, inspect their licenses.

Avoid unnecessary vendor lock-in.

Do not assume that an external managed service is acceptable simply because it is convenient.

Document any unavoidable external dependency.

Do NOT invent licensing decisions for Guidon.

If the repository already contains a license, respect it.

If licensing is unclear, flag it instead of silently choosing one.

---

# 28. DO NOT OVERENGINEER

Important:

Do NOT rewrite the entire project just to make the architecture theoretically perfect.

First inspect the repository.

Identify:

1. Current architecture
2. Current database
3. Current auth
4. Current storage
5. Current API layer
6. Current deployment
7. Current environment variables
8. Current Supabase dependencies
9. Current AI integrations
10. Existing RLS/security model

Then create a migration plan.

Preserve working functionality.

Refactor only where it materially improves:

* self-hosting
* security
* maintainability
* provider abstraction
* deployment reliability

---

# 29. EXECUTION PLAN

Work in this order.

## Phase 1 — Audit

Inspect the entire repository.

Do not start modifying code immediately.

Produce a concise architecture assessment:

```text
Current architecture
Self-hosting blockers
Supabase coupling
Storage coupling
Auth coupling
AI coupling
Deployment problems
Security problems
Migration risks
```

## Phase 2 — Architecture

Design the minimum changes required for:

```text
Cloud
+
Self-hosted
```

without breaking the existing product.

## Phase 3 — Infrastructure

Implement:

```text
Docker
Docker Compose
PostgreSQL
Storage abstraction
Environment configuration
Health checks
Migrations
```

## Phase 4 — Provider abstraction

Implement/prepare:

```text
AIProvider
StorageProvider
Auth abstraction where practical
```

## Phase 5 — Core Guidon differentiators

Ensure the architecture properly supports:

```text
Context Layer
Decision Entity
FACT / AI INSIGHT
Previous Attempts
Project Memory
Generic Agent Context
```

## Phase 6 — Security

Audit:

```text
RLS
authorization
tenant isolation
file access
API routes
secrets
sessions
uploads
```

## Phase 7 — Documentation

Create a complete self-hosting guide.

## Phase 8 — Validation

Actually test the deployment from a clean environment.

Do not assume Docker Compose works.

Test:

```text
Fresh install
↓
Create account
↓
Create organization
↓
Create project
↓
Create task
↓
Upload file
↓
Create decision
↓
Create project memory
↓
Generate AI insight
↓
Accept/correct/reject insight
↓
Generate agent context
↓
Restart containers
↓
Verify data persists
↓
Upgrade
↓
Verify migrations
```

Also test with external AI disabled.

Then test with Ollama/local AI.

---

# 30. DEFINITION OF DONE

Do not consider the work complete until:

### Self-hosting

* [ ] Docker Compose deployment works
* [ ] Fresh installation works
* [ ] PostgreSQL is supported
* [ ] Persistent volumes are configured
* [ ] Files persist after restart
* [ ] Database persists after restart
* [ ] Environment variables are documented
* [ ] Health checks work
* [ ] Migrations work
* [ ] Upgrade path is documented
* [ ] Backup/restore is documented

### Independence

* [ ] TSS cloud is not required
* [ ] External AI is not required
* [ ] External storage is not required
* [ ] Internet is not required for core functionality
* [ ] Self-hosted installation does not leak project data to TSS

### AI

* [ ] AI provider abstraction exists
* [ ] Local Ollama usage is possible
* [ ] OpenAI-compatible endpoints can be supported
* [ ] AI-generated information has provenance
* [ ] FACT / AI INSIGHT state is persistent

### Guidon Core

* [ ] Context Layer remains the source of truth
* [ ] Decision is a first-class entity
* [ ] Previous Attempts are supported
* [ ] Project Memory is persistent
* [ ] Generic Agent Context can be generated
* [ ] MCP can expose the Context Layer
* [ ] Custom Entities remain compatible with the graph

### Security

* [ ] No secrets exposed client-side
* [ ] Tenant isolation verified
* [ ] Authorization verified server-side
* [ ] File access is protected
* [ ] Upload validation exists
* [ ] Production secrets are not committed
* [ ] Logs do not leak sensitive information

---

# FINAL INSTRUCTION

Start by **inspecting the entire existing Guidon repository**.

Do not blindly implement the architecture above.

Use the current codebase as the source of truth.

Identify what already works, what must change, and what should remain untouched.

Then:

1. Produce the architecture audit.
2. Produce the implementation plan.
3. Begin implementation.
4. Test every major change.
5. Fix errors instead of working around them.
6. Keep the existing Guidon product functionality intact.
7. Do not remove existing features unless there is a strong technical reason.
8. Prefer small, verifiable changes over a giant rewrite.
9. At the end, verify the complete application from a clean Docker Compose installation.
10. Clearly report what was implemented, what was tested, and what remains.

The final goal is:

> **Guidon should be a serious self-hostable project context platform, not merely a cloud PM application that happens to have a Docker file.**

The architecture must make self-hosting a first-class capability from the foundation.
