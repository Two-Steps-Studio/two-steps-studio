# Roadmap

This document outlines realistic, near-term development priorities for Two Steps Studio (TSS), based on the actual state of the codebase (commit history, migrations, open technical debt) rather than an aspirational wishlist.

> **Note (2026-09-15):** This roadmap replaces an earlier version that was largely a generic template (MFA/WAF/blockchain/mobile-app items with no grounding in current velocity). Ambitious platform-growth items from that draft were kept in the [Someday / Needs Team Sign-off](#someday--needs-team-sign-off) section rather than deleted, since they may still be worth pursuing — they just aren't the current priority.
>
> `TODO.md` in this repo currently contains unrelated pasted content (a Supabase auth-provider screenshot description and a Guidon competitive-landscape report), not a TSS task list — it should be cleaned up or repurposed separately from this roadmap.

## Table of Contents

- [Current Status](#current-status)
- [Now](#now)
- [Next](#next)
- [Later](#later)
- [Someday / Needs Team Sign-off](#someday--needs-team-sign-off)
- [Context: Why This Roadmap Looks Different](#context-why-this-roadmap-looks-different)

## Current Status

**Status**: Production, active community platform (tss-website + tss-dc-bot on a shared Supabase instance).

### What's already working

- Web application (Next.js 15 + Electron desktop wrapper)
- Discord bot: XP/leveling, economy, AFK fishing, events, moderation, tickets, giveaways, reaction roles (~93 slash commands)
- Supabase auth with email verification
- Profile system with levels, PLN balance, VIP/SVIP/MVIP tiers
- Shop, fishing gear economy
- Admin panel for the bot (giveaways, tickets, channels, roles) — a real control surface, not a mockup

## Now

Security and cleanup — directly continuing the most recent commit activity.

- [ ] Finish the RLS hardening sweep. The last 3 commits patched a real leak on `profiles` (anon key could read other users' `pln_balance`/`money`/`bank`). Audit the remaining tables for the same class of issue before considering this closed.
- [ ] Add `.env` template for `tss-dc-bot` — currently blocks local testing/CI.
- [ ] Remove or explain dead weight left over from the `/dev` module split (now spun out as Guidon):
  - Unused dependencies in `tss-website/package.json`: `@react-three/fiber`, `@react-three/drei`, `@dnd-kit/*` (zero usages in `src/`)
  - Orphaned `dev-app/` directory (no `package.json`, not wired into any build)

## Next

Continuing active, in-progress work areas rather than starting new ones.

- [ ] Move rate limiting from in-memory to persistent (Redis) — resets on every restart today
- [ ] Account lockout after repeated failed logins, session expiry
- [ ] Continue the economy/shop/fishing rebalance track (VIP/SVIP/MVIP multipliers, gear tiers) — active area, most recent commits are "Economy rebalance 1-5/5"
- [ ] Round out the bot admin panel — moderation/ticket/giveaway management surfaces that are partially built

## Later

Real gaps, but not urgent given current priorities.

- [ ] Achievement/badge system (no `achievements` table exists yet)
- [ ] Leaderboards
- [ ] Dark mode, mobile responsiveness pass, WCAG 2.1 AA improvements
- [ ] Real-time notifications center

## Someday / Needs Team Sign-off

Carried over from the previous roadmap draft. Not discarded, but not grounded in current commit velocity or team size — needs explicit prioritization before engineering time goes into these.

- Native desktop app store distribution (Windows Store / macOS App Store / Flatpak)
- Mobile app (iOS/Android, React Native)
- MFA, WAF, dedicated DDoS/bot-detection infrastructure
- Forum/wiki/creator program, community platform features beyond Discord
- Blockchain/NFT integration
- Enterprise features (multi-tenant, SSO, SLAs) — not applicable to TSS's current product shape

## Context: Why This Roadmap Looks Different

Two Steps Studio's `/dev` project-management module was recently dropped from this codebase (see `git log` — `drop-project-management` and related cleanup commits). That module became the seed for **Guidon**, which is now developed as a fully separate product (`two-steps-studio/guidon`) with its own roadmap. TSS's roadmap is scoped to the community platform (website + Discord bot) only; Guidon-related planning lives in that repository.
