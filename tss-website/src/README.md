# Two Steps Studio (TSS)

Monorepo containing a Next.js 15 web application with Electron desktop wrapper and a Discord.js bot for community engagement.

## Projects Overview

### tss-website
A modern web application with:
- **Next.js 15** with App Router
- **React 19** with Tailwind CSS v4
- **Electron** desktop wrapper
- **Supabase** authentication and database
- **RPG game features** (mining, fishing, dungeon crawling)

### tss-dc-bot
A Discord.js bot providing:
- **XP/Leveling system** (messages +2 XP, voice chat +3 XP/min)
- **Economy system** with coins and PLN balance
- **Auto-roles** based on user level
- **Fishing game** with gear upgrades
- **Events management** for e-sport competitions
- **Profile cards** generated with Canvas

## Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- Git
- Discord Bot token (for bot project)
- Supabase project setup

### Installation

#### 1. Clone the repository
```bash
git clone https://github.com/Kenikusss/tss
cd tss
```

#### 2. Setup Website (tss-website)
```bash
cd tss-website
npm install

# Create .env file
echo "NEXT_PUBLIC_SUPABASE_URL=your_supabase_url" > .env
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key" >> .env
```

#### 3. Setup Discord Bot (tss-dc-bot)
```bash
cd ../tss-dc-bot
npm install

# Create .env file
echo "SUPABASE_URL=your_supabase_url" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your_service_role_key" >> .env
echo "DISCORD_TOKEN=your_discord_bot_token" >> .env
echo "CLIENT_ID=your_discord_client_id" >> .env
echo "GUILD_ID=your_guild_id" >> .env
```

### Development Commands

#### Website
```bash
# Web development
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Desktop app development
npm run electron:dev

# Build desktop app for Windows
npm run electron:build:win
```

#### Discord Bot
```bash
# Start the bot
npm start
# or
node index.js
```

## Features

### Website Features
- **Authentication**: Supabase Auth with secure session management
- **Protected Routes**: `/profile`, `/ustawienia`, `/notifications` require authentication
- **Theme System**: 5 color themes (Ocean, Games, Records, Dev, E-Sport)
- **RPG Mini-game**: Mining, fishing, dungeon crawling, equipment crafting
- **Economy System**: Coin-based economy with PLN conversion
- **Profile System**: User profiles with level progression
- **PWA Support**: Progressive Web Application capabilities

### Discord Bot Features
- **Level System**: XP tracking with level-based role assignment
- **Voice Rewards**: Automatic XP and coin accumulation in voice channels
- **Shop System**: Buy decorative items and special roles
- **Bank System**: Deposit/withdraw coins with transaction logging
- **Event System**: Create and join e-sport events
- **Profile Cards**: Beautiful canvas-generated profile images
- **Fishing Game**: AFK fishing with gear progression

## Project Structure

```
tss/
├── tss-website/          # Next.js 15 + Electron app
│   ├── src/
│   │   ├── app/         # Next.js App Router pages
│   │   ├── components/  # React components
│   │   ├── lib/         # Utilities (Supabase client, hooks)
│   │   └── hooks/       # Custom React hooks
│   ├── electron/        # Electron main process
│   └── next.config.ts   # Next.js config
│
└── tss-dc-bot/          # Discord.js bot
    ├── index.js         # Main bot entry
    ├── profileGenerator.js  # Canvas profile cards
    ├── shop.js          # Shop and inventory logic
    ├── events/          # Event management
    ├── fishing/         # Fishing game
    └── rpg/             # RPG mechanics
```

## Configuration

### Environment Variables

#### Website (.env)
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Authentication
AUTH_SECRET=your_auth_secret

# Stripe (for payments)
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
```

#### Discord Bot (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

## Security

The project follows security best practices:

- **Secure headers** with proper CSP
- **Rate limiting** on API endpoints
- **Secure file uploads** (private buckets)
- **Environment variables** with proper prefixes
- **Input sanitization** on user inputs
- **Session management** with secure cookies

See [SECURITY.md](./SECURITY.md) for more details.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on:

- Code style and standards
- Pull request process
- Testing requirements
- Issue reporting

## Tech Stack

### Website
- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: React Context + Server State
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Desktop**: Electron

### Bot
- **Library**: Discord.js 14
- **Language**: JavaScript
- **Image Processing**: @napi-rs/canvas
- **Database**: Supabase

## License

MIT License - see [LICENSE](./LICENSE) file for details.

## Support

- **Discord Server**: Join our community for support
- **GitHub Issues**: Report bugs and feature requests

## Acknowledgments

- [Supabase](https://supabase.com/) for database and auth
- [Discord.js](https://discord.js.org/) for bot library
- [Next.js](https://nextjs.org/) for framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Electron](https://www.electronjs.org/) for desktop wrapper

---

**Note**: This project is in active development. For the latest updates, see the [CHANGELOG.md](./CHANGELOG.md) file.

## Troubleshooting

Common issues and solutions are documented in [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

For additional help:
- Check the logs in `tss-website/.next/` and `tss-dc-bot/` directories
- Review the API documentation in [API.md](./API.md)
- See the roadmap in [ROADMAP.md](./ROADMAP.md) for upcoming features
