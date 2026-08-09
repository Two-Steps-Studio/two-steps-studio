# Changelog

All notable changes to Two Steps Studio will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] - 2026-03-16

### Added
- Initial release with website and Discord bot
- Next.js 15 with App Router
- Discord.js 14 integration
- Supabase authentication
- User profile system with levels
- Economy system with coins and PLN
- Fishing game with gear upgrades
- Events management system
- Admin dashboard
- Shop system
- **Security**: Private avatar storage with signed URL generation
- **Security**: Environment variable templates for secure deployment

### Changed
- Upgraded from Next.js 14 to 15
- Upgraded from Tailwind CSS 3 to 4
- Upgraded React from 18 to 19
- Bot configuration updates
- Avatar storage: public → private with signed URLs

### Fixed
- Initial bug fixes and improvements
- Authentication flow improvements
- Profile card generation issues
- **Security**: Avatar bucket changed from public to private with signed URL retrieval (2026-03-16)
- **Security**: OrganizationTree component useMemo hook error fixed
- **Security**: Discord bot .env.example template added for secure deployment

## [1.0.1] - 2026-03-16

### Security Fixes

#### Critical
- **Fixed**: Changed avatar bucket from public to private with public URL retrieval
- **Fixed**: Added rate limiting to prevent brute force attacks
- **Fixed**: Added suspicious user agent detection (bot, curl, python)
- **Added**: Protected routes enforcement with middleware

#### High
- **Fixed**: Added basic auth to admin endpoints
- **Fixed**: Input validation with Zod schemas
- **Added**: CSRF token generation for forms
- **Fixed**: Email verification flow (auto-confirm implemented)

#### Medium
- **Added**: Secure headers (CSP, HSTS, X-Content-Type-Options)
- **Fixed**: Debug mode check for production
- **Added**: Session expiry configuration (30 days)
- **Added**: Bot detection to API

#### Low
- **Added**: Basic security logging
- **Added**: Error handling for API endpoints

### Features

#### Website (tss-website)
- Added Next.js 15 App Router
- Added 5 color themes (General/Ocean, Games, Records, Dev, E-Sport)
- Added protected routes (`/profile`, `/ustawienia`, `/notifications`)
- Added shop system with categories
- Added news feed
- Added profile customization
- Added PWA capabilities
- Added Stripe integration for payments

#### Discord Bot (tss-dc-bot)
- Added XP/Leveling system (messages +2, voice +3/min)
- Added auto-roles based on level
- Added economy system with bank/deposit/withdraw
- Added fishing game with AFK mode
- Added events management
- Added profile cards with Canvas
- Added shop with decorations and roles
- Added inventory system
- Added gear upgrade system
- Added RPG minigame (mining, dungeon, city)
- Added welcome messages for new members

### API

#### Added Endpoints
- `GET /api/shop` - Shop inventory
- `GET /api/news` - News feed
- `GET /api/profilee/:userId` - User profile
- `POST /api/shop/buy` - Purchase item
- `POST /api/admin/exec` - Admin command
- `GET /api/admin/stats` - Server statistics
- `POST /api/avatars/upload` - Avatar upload

#### Security Improvements
- Added authentication to protected endpoints
- Added rate limiting (100 req/min per IP)
- Added input validation
- Added error handling

### Database

#### Schemas
- Added `profiles` table
- Added `discord_stats` table
- Added `fishing_gear` table
- Added `pln_transactions` table

#### Features
- Row-level security (RLS) enabled
- Indexes on frequently queried columns
- Database migration system

### Documentation

- Added README.md
- Added ARCHITECTURE.md
- Added CONTRIBUTING.md
- Added SECURITY.md
- Added API.md
- Added DEVELOPMENT_GUIDE.md
- Added TROUBLESHOOTING.md
- Added CHANGELOG.md
- Added ROADMAP.md

### Performance

- Optimized image loading with Next.js Image
- Implemented code splitting
- Added caching strategy
- Database connection pooling

### Known Issues

- In-memory rate limiter resets on server restart (planned: Redis)
- Some Supabase realtime features may have order issues
- Email verification is auto-confirm (planned: manual confirmation)

### Deprecation Notices

None at this time.

## [0.1.0] - 2026-01-01

### Added
- Initial project structure
- Basic authentication
- Simple profile system

### Changed
- Project initialization
- First release

---

## Version History

| Version | Date | Changes | Type |
|---------|------|---------|------|
| 1.0.1 | 2026-03-16 | Avatar storage private, OrganizationTree fix, bot env template | Security |
| Unreleased | TBD | In progress | - |
| 1.0.0 | 2026-03-13 | Security fixes, features, API | Initial |
| 0.1.0 | 2026-01-01 | Project start | Alpha |

## Breaking Changes

None in version 1.0.0.

## Migration Guide

No migration required for initial release.

## Rollforward

No special steps required.

---

## Future Plans

- [ ] Implement Redis for persistent rate limiting
- [ ] Add more Discord bot commands
- [ ] Enhance RPG features
- [ ] Add more shop categories
- [ ] Improve documentation
- [ ] Add accessibility features
- [ ] Mobile app development

---

**Last Updated**: 2026-03-13  
**Version**: 1.0.0  
