# Two Steps Studio

**Two Steps Studio (TSS)** is a monorepo containing the web, desktop, and community infrastructure used by Two Steps Studio.

The repository currently includes:

* A **Next.js 15** web application
* An **Electron** desktop application
* A **Discord.js** community bot
* **Supabase** authentication and database infrastructure
* RPG, economy, profile, and community features

> **Status:** Active development

---

## Table of Contents

* [Projects](#projects)
* [Tech Stack](#tech-stack)
* [Getting Started](#getting-started)
* [Environment Variables](#environment-variables)
* [Development](#development)
* [Project Structure](#project-structure)
* [Features](#features)
* [Security](#security)
* [Documentation](#documentation)
* [Contributing](#contributing)
* [Support](#support)
* [License](#license)
* [Acknowledgments](#acknowledgments)

---

# Projects

## `tss-website`

The main TSS web and desktop application.

### Built with

* **Next.js 15**
* **React 19**
* **TypeScript**
* **Tailwind CSS v4**
* **Electron**
* **Supabase**
* **Stripe**

The application uses the Next.js App Router and can be deployed as a web application or packaged as a Windows desktop application through Electron.

### Main functionality

* Authentication and user accounts
* User profiles
* Protected routes
* Theme system
* RPG systems
* Mining
* Fishing
* Dungeon crawling
* Equipment and crafting
* Economy
* PWA functionality
* Desktop application

---

## `tss-dc-bot`

The TSS Discord bot responsible for community functionality and interactive systems.

### Built with

* **Discord.js 14**
* **JavaScript**
* **Supabase**
* **@napi-rs/canvas**

### Main functionality

* XP and leveling
* Voice activity rewards
* Automatic roles
* Economy
* Shop and inventory
* Banking
* Fishing
* RPG systems
* E-sport events
* Profile card generation

---

# Tech Stack

## Website

| Technology      | Purpose                   |
| --------------- | ------------------------- |
| Next.js 15      | Web framework             |
| React 19        | UI                        |
| TypeScript      | Application language      |
| Tailwind CSS v4 | Styling                   |
| Supabase        | Database & authentication |
| PostgreSQL      | Database                  |
| Stripe          | Payments                  |
| Electron        | Desktop application       |
| PWA             | Progressive Web App       |

## Discord Bot

| Technology      | Purpose              |
| --------------- | -------------------- |
| Discord.js 14   | Discord API          |
| JavaScript      | Application language |
| Supabase        | Database             |
| @napi-rs/canvas | Image generation     |

---

# Getting Started

## Prerequisites

Install the following before starting development:

* **Node.js 18 or newer**
* **npm or pnpm**
* **Git**
* A configured **Supabase project**
* A **Discord application and bot token** if working on the bot
* A **Stripe account** if working on payment functionality

---

# Installation

## 1. Clone the repository

```bash
git clone https://github.com/Kenikusss/tss.git
cd tss
```

---

## 2. Install the Website

```bash
cd tss-website
npm install
```

Create a `.env.local` file and add the required environment variables.

---

## 3. Install the Discord Bot

From the repository root:

```bash
cd ../tss-dc-bot
npm install
```

Create a `.env` file and configure the required bot variables.

---

# Environment Variables

Environment variables contain secrets and configuration values required by the applications.

**Never commit `.env`, `.env.local`, API keys, tokens, or other secrets to Git.**

---

## Website

Example `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
AUTH_SECRET=your_auth_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

Additional variables may be required depending on the features enabled in the application.

---

## Discord Bot

Example `.env`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_client_id
GUILD_ID=your_guild_id
```

The Supabase service-role key must remain **server-side only** and must never be exposed to browsers or client-side code.

---

# Development

## Website

Navigate to:

```bash
cd tss-website
```

### Development server

```bash
npm run dev
```

The Next.js development server will start using the project's configured development port.

### Production build

```bash
npm run build
```

### Linting

```bash
npm run lint
```

### Electron development

```bash
npm run electron:dev
```

### Windows desktop build

```bash
npm run electron:build:win
```

---

## Discord Bot

Navigate to:

```bash
cd tss-dc-bot
```

Start the bot:

```bash
npm start
```

Alternatively:

```bash
node index.js
```

---

# Project Structure

```text
tss/
│
├── tss-website/
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom React hooks
│   │   └── lib/                 # Shared utilities and services
│   │
│   ├── electron/                # Electron main process
│   ├── public/                  # Static assets
│   ├── next.config.ts           # Next.js configuration
│   └── package.json
│
├── tss-dc-bot/
│   ├── index.js                 # Bot entry point
│   ├── profileGenerator.js      # Profile card generation
│   ├── shop.js                  # Shop and inventory
│   ├── events/                  # Event system
│   ├── fishing/                 # Fishing system
│   ├── rpg/                     # RPG systems
│   └── package.json
│
├── CONTRIBUTING.md
├── SECURITY.md
├── CHANGELOG.md
├── TROUBLESHOOTING.md
├── API.md
├── ROADMAP.md
├── LICENSE
└── README.md
```

The structure may change as the project evolves.

---

# Features

## Web Application

### Authentication

User authentication is handled through **Supabase Auth**.

Protected areas currently include:

```text
/profil
/ustawienia
/powiadomienia
```

Access to protected resources should always be enforced server-side where appropriate.

---

### Theme System

The application includes multiple visual themes for different areas of TSS:

* Ocean
* Games
* Records
* Development
* E-Sport

---

### RPG Systems

The website contains several RPG-style systems, including:

* Mining
* Fishing
* Dungeon crawling
* Equipment
* Crafting
* Progression

---

### Economy

The application includes an in-game economy based around coins and other balance systems.

---

### Profiles

Users can have profiles containing information such as:

* Level
* Progression
* Economy data
* RPG statistics
* Community information

---

### PWA

The website includes Progressive Web App functionality where supported.

---

# Discord Bot Features

## Leveling

Users can gain XP through activity, including:

* Messages
* Voice channel activity

Level progression can unlock additional Discord roles.

---

## Economy

The bot provides an economy system including:

* Coins
* Balances
* Shop
* Inventory
* Banking
* Transactions

---

## Fishing

The Discord bot includes an AFK-oriented fishing system with equipment progression.

---

## Events

The bot supports community events, including functionality for e-sport competitions.

---

## Profile Cards

User profile cards can be generated dynamically using `@napi-rs/canvas`.

---

# Security

Security is a core requirement of the project.

Current security practices include:

* Secure HTTP headers
* Content Security Policy where applicable
* API rate limiting
* Protected file storage
* Environment-based secrets
* Input validation and sanitization
* Secure session handling
* Supabase Row Level Security
* Server-side handling of privileged credentials

### Important

Never expose:

* `SUPABASE_SERVICE_ROLE_KEY`
* Discord bot tokens
* Stripe secret keys
* Stripe webhook secrets
* Authentication secrets
* Private API keys
* Production credentials

If you accidentally expose a secret, revoke and rotate it immediately.

For additional information, see [SECURITY.md](./SECURITY.md).

---

# Documentation

Additional project documentation is available in the repository:

| Document                                   | Description                    |
| ------------------------------------------ | ------------------------------ |
| [CONTRIBUTING.md](./CONTRIBUTING.md)       | Contribution guidelines        |
| [SECURITY.md](./SECURITY.md)               | Security policies              |
| [API.md](./API.md)                         | API documentation              |
| [ROADMAP.md](./ROADMAP.md)                 | Planned features and direction |
| [CHANGELOG.md](./CHANGELOG.md)             | Project changes                |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | Common problems and solutions  |
| [LICENSE](./LICENSE)                       | Project license                |

---

# Contributing

Contributions are welcome.

Before making changes, please read:

[CONTRIBUTING.md](./CONTRIBUTING.md)

It contains information about:

* Development setup
* Branch naming
* Commit conventions
* Code style
* Testing
* Pull requests
* Issue reporting
* Security

---

# Support

If you need help with the project:

### GitHub

Use GitHub Issues for:

* Bug reports
* Feature requests
* Technical problems

### Discord

Join the Two Steps Studio community for:

* General questions
* Development discussions
* Real-time help
* Community discussions

---

# License

This project is licensed under the **MIT License**.

See [LICENSE](./LICENSE) for the complete license text.

---

# Acknowledgments

Two Steps Studio uses and builds upon several open-source technologies.

Special thanks to:

* [Supabase](https://supabase.com/) — database and authentication
* [Discord.js](https://discord.js.org/) — Discord API library
* [Next.js](https://nextjs.org/) — web framework
* [React](https://react.dev/) — UI library
* [Tailwind CSS](https://tailwindcss.com/) — styling framework
* [Electron](https://www.electronjs.org/) — desktop application framework

---

# Troubleshooting

If you encounter a problem:

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
2. Check the terminal output and application logs.
3. Verify your environment variables.
4. Make sure dependencies are installed.
5. Check [API.md](./API.md) if the issue involves an API.
6. Check [ROADMAP.md](./ROADMAP.md) if the functionality is planned but not yet implemented.
7. Search existing GitHub Issues.
8. Ask the community for help if necessary.

For Next.js-related issues, development artifacts may be available in:

```text
tss-website/.next/
```

Bot logs are available through the process running the Discord bot.

---

# Development Status

Two Steps Studio is under active development.

Features, architecture, dependencies, and project structure may change over time.

For the latest changes, see:

[CHANGELOG.md](./CHANGELOG.md)

For planned work, see:

[ROADMAP.md](./ROADMAP.md)

---

**Two Steps Studio - Create. Build. Inspire.**
