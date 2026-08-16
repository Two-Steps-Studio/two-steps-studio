# Contributing to Two Steps Studio

Thank you for your interest in contributing to **Two Steps Studio (TSS)**.

We welcome contributions that improve our projects, tools, documentation, infrastructure, and community. This guide explains how to set up the project, work on changes, and submit contributions.

---

## Table of Contents

* [Code of Conduct](#code-of-conduct)
* [Getting Started](#getting-started)
* [Development Workflow](#development-workflow)
* [Code Style](#code-style)
* [Testing](#testing)
* [Pull Requests](#pull-requests)
* [Issue Reporting](#issue-reporting)
* [Security](#security)
* [Areas for Contribution](#areas-for-contribution)
* [Community](#community)
* [License](#license)

---

## Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

By participating in the Two Steps Studio community, you agree to follow the standards described in that document.

---

# Getting Started

## Prerequisites

Before contributing, make sure you have:

* **Node.js 18+**
* **npm or pnpm**
* **Git**
* A GitHub account
* A basic understanding of the project's structure
* The required development tools for the specific project you are working on

For project-specific requirements, check the [README](./README.md).

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Two-Steps-Studio/tss.git
cd tss
```

### 2. Install Dependencies

The repository contains multiple projects. Install dependencies for the project you want to work on.

#### Website

```bash
cd tss-website
npm install
```

#### Discord Bot

```bash
cd tss-dc-bot
npm install
```

---

## 3. Configure Environment Variables

Some parts of the project require environment variables.

Create the required `.env` files locally and configure them according to the project's documentation.

**Never commit secrets or `.env` files to the repository.**

Do not expose:

* API keys
* Database credentials
* Authentication secrets
* Discord tokens
* Service credentials
* Private keys
* Production environment variables

If you are unsure whether a value is sensitive, treat it as sensitive.

---

## 4. Start Development

### Website

From the `tss-website` directory:

```bash
npm run dev
```

### Discord Bot

From the `tss-dc-bot` directory:

```bash
npm start
```

Refer to the project's README for additional commands and configuration.

---

# Development Workflow

## Branch Naming

Create a separate branch for each change.

Use the following format:

```text
<type>/<short-description>
```

Examples:

```text
feature/user-profile
feature/project-dashboard
fix/login-error
fix/mobile-navigation
docs/update-contributing-guide
refactor/project-service
perf/optimize-api
```

Recommended branch types:

| Type       | Purpose                  |
| ---------- | ------------------------ |
| `feature`  | New functionality        |
| `fix`      | Bug fixes                |
| `docs`     | Documentation            |
| `refactor` | Code restructuring       |
| `perf`     | Performance improvements |
| `test`     | Tests                    |
| `chore`    | Maintenance              |
| `ci`       | CI/CD changes            |

Keep branch names short and descriptive.

---

# Commit Messages

Two Steps Studio follows the **Conventional Commits** format.

```text
<type>(<scope>): <description>
```

Examples:

```text
feat(auth): add GitHub authentication
fix(projects): prevent duplicate project creation
docs(readme): update development setup
refactor(api): simplify project service
perf(dashboard): reduce unnecessary database requests
test(auth): add login integration tests
chore(deps): update dependencies
ci(build): improve production build workflow
```

Common commit types:

* `feat` — new functionality
* `fix` — bug fix
* `docs` — documentation
* `style` — formatting or non-functional style changes
* `refactor` — code restructuring
* `test` — tests
* `chore` — maintenance
* `perf` — performance improvements
* `ci` — CI/CD changes

Keep commits focused. Avoid combining unrelated changes into a single commit.

---

# Code Style

## TypeScript / JavaScript

For new application code:

* Prefer **TypeScript**
* Follow the existing project architecture
* Use the project's ESLint configuration
* Keep functions and components focused
* Prefer readable code over clever code
* Avoid unnecessary abstractions
* Use meaningful names
* Remove unused code and imports
* Avoid `any` unless there is a specific reason to use it
* Add comments when the reasoning behind code is not obvious

Follow the conventions already used in the surrounding code.

Do not introduce a completely different coding style into an existing module.

---

## React

When working with React:

* Prefer functional components
* Use React hooks where appropriate
* Keep components focused on a single responsibility
* Extract reusable components when necessary
* Avoid unnecessary global state
* Prefer existing shared components over duplicating UI
* Keep business logic out of presentation components when practical

Before creating a new component, check whether an existing component can be reused.

---

## Tailwind CSS

When using Tailwind CSS:

* Prefer utility classes
* Follow the project's existing design system
* Reuse existing components and styles
* Avoid unnecessary custom CSS
* Keep class lists readable
* Use existing `shadcn/ui` components where appropriate

Do not introduce a second UI system without a clear reason.

---

# Database

The project uses **Supabase** for database functionality.

When modifying the database:

* Use migrations for schema changes
* Do not manually modify production databases
* Use Row Level Security (RLS) where required
* Verify policies for every affected table
* Add indexes where they provide meaningful query improvements
* Avoid exposing sensitive data through API routes
* Test migrations before submitting a pull request
* Document significant schema changes

Pay particular attention to authentication and authorization when working with RLS.

A feature is not considered complete if it works only because security policies have been disabled.

---

# Git Hooks

The project may use **Husky** for Git hooks.

If the repository contains the required setup, initialize the hooks with:

```bash
npm run setup:husky
```

Before committing, make sure the project passes its available checks:

```bash
npm run lint
```

Additional checks may be required depending on the project.

---

# Testing

Testing requirements depend on the project and the type of change.

## General Principles

New functionality should include appropriate tests whenever practical.

Tests are especially important for:

* Authentication
* Authorization
* Database operations
* API routes
* Core business logic
* Payment-related functionality
* Data processing
* Critical user flows

Do not add tests purely to increase a coverage number. Tests should verify meaningful behavior.

---

## Testing Tools

Depending on the project, TSS may use:

* **Vitest** — unit and integration testing
* **Playwright** — end-to-end testing
* **React Testing Library** — React component testing

Check the project's configuration before introducing a new testing framework.

---

## Example Unit Test

```typescript
import { describe, expect, it } from 'vitest';
import { calculateStats } from '@/lib/stats';

describe('calculateStats', () => {
  it('calculates the correct stats', () => {
    const stats = calculateStats({
      atk: 10,
      helmet: 5,
      chest: 10,
    });

    expect(stats.atk).toBe(15);
    expect(stats.def).toBe(15);
  });
});
```

---

## E2E Testing

Use Playwright for important browser-based user flows where appropriate.

Examples include:

* Registration
* Login
* Project creation
* Project management
* Critical navigation
* Permission checks
* Important user workflows

Test realistic user behavior rather than implementation details.

---

# Pull Requests

## 1. Create a Branch

```bash
git checkout -b feature/amazing-feature
```

## 2. Make Your Changes

While working:

* Keep changes focused
* Follow the existing architecture
* Add or update tests where appropriate
* Update documentation when necessary
* Do not commit secrets
* Do not modify unrelated files without a reason

---

## 3. Run Checks

Before opening a pull request, run the checks available for the project.

For example:

```bash
npm run lint
npm test
npm run build
```

If a command does not exist in the project, do not add it just for the pull request.

Make sure the application builds successfully when your changes affect the build.

---

## 4. Open a Pull Request

When creating a pull request:

* Use a clear title
* Explain what changed
* Explain why the change was needed
* Reference related issues
* Include screenshots or recordings for UI changes
* Mention any known limitations
* Mention important testing performed

Keep the pull request focused on one feature, bug, or related group of changes.

---

## Pull Request Review

Maintainers may request changes before merging.

Reviews generally focus on:

* Correctness
* Security
* Maintainability
* Performance
* Code quality
* User experience
* Testing
* Consistency with the project
* Documentation

Please address review comments before requesting another review.

---

# Issue Reporting

Before opening an issue:

1. Search existing issues.
2. Check recent changes and the [CHANGELOG](./CHANGELOG.md), if available.
3. Make sure the issue is reproducible.
4. Provide enough information for someone else to investigate it.

---

## Bug Reports

A useful bug report should include:

```markdown
## Bug Description

Describe what went wrong.

## Steps to Reproduce

1. Go to ...
2. Click ...
3. Enter ...
4. Observe ...

## Expected Behavior

Describe what should have happened.

## Actual Behavior

Describe what actually happened.

## Environment

- OS:
- Browser:
- Version:
- Node.js version:

## Screenshots / Logs

Add screenshots, videos, or relevant logs if available.

## Additional Context

Include any other information that may help investigate the issue.
```

Avoid posting sensitive information such as API keys, passwords, tokens, or private user data.

---

# Feature Requests

Feature requests should explain:

* What problem the feature solves
* Who would benefit from it
* How the feature could work
* Why existing functionality is insufficient

A good feature request focuses on the problem rather than prescribing a specific implementation.

---

# Issue Labels

Common labels include:

* `bug` — something is not working correctly
* `enhancement` — improvement or new functionality
* `documentation` — documentation changes
* `good first issue` — suitable for new contributors
* `help wanted` — additional contributors are welcome
* `performance` — performance-related issue
* `security` — security-related issue
* `question` — question or request for clarification

---

# Security

Security issues should **not** be reported through public GitHub issues.

If you discover a potential security vulnerability:

1. Do not publicly disclose the vulnerability.
2. Contact the Two Steps Studio maintainers privately.
3. Provide enough information to reproduce the issue.
4. Explain the potential impact.
5. Include the affected component or feature.

Please do not exploit a vulnerability beyond what is necessary to demonstrate the issue.

We will investigate legitimate security reports and follow responsible disclosure practices.

---

# Areas for Contribution

Contributions are welcome in many areas.

## Code

* Bug fixes
* New features
* Performance improvements
* Refactoring
* API improvements
* Database improvements
* Accessibility
* Responsive design
* Developer tooling
* CI/CD

## Documentation

* README improvements
* Setup instructions
* API documentation
* Developer guides
* Tutorials
* Architecture documentation
* Troubleshooting guides

## Testing

* Unit tests
* Integration tests
* End-to-end tests
* Regression tests
* Test infrastructure

## Community

* Code reviews
* Issue triage
* Technical discussions
* Documentation improvements
* Helping other contributors

---

# Current Areas Needing Attention

The following areas may be especially useful for contributors:

* [ ] Expand test coverage
* [ ] Improve project documentation
* [ ] Improve accessibility
* [ ] Improve mobile responsiveness
* [ ] Optimize application performance
* [ ] Improve developer experience
* [ ] Expand Discord bot functionality
* [ ] Improve CI/CD workflows

This list may change as the project evolves.

---

# Development Principles

When contributing to TSS, keep these principles in mind:

### Keep It Simple

Prefer a simple solution that solves the problem over unnecessary complexity.

### Build for Maintainability

Code should be understandable to someone who did not write it.

### Reuse Existing Systems

Before creating something new, check whether the project already has a suitable implementation.

### Security First

Authentication, authorization, database access, and user data must be handled carefully.

### Think About the User

Technical correctness is important, but changes should also provide a good user experience.

### Avoid Unrelated Changes

A pull request should not become a collection of unrelated refactors.

---

# Community

## Communication Channels

Depending on the type of discussion:

* **GitHub Issues** — bugs and feature requests
* **GitHub Discussions** — questions and general technical discussion
* **Discord** — real-time community communication

---

# Code Reviews

All significant contributions may be reviewed by TSS maintainers.

We value:

* **Clarity** — readable and understandable code
* **Correctness** — functionality works as intended
* **Security** — no unnecessary vulnerabilities
* **Consistency** — follows project conventions
* **Maintainability** — easy to modify in the future
* **Documentation** — important behavior is documented
* **Testing** — important functionality is properly verified

Code review is a collaborative process. Feedback is intended to improve the project, not the contributor.

---

# Getting Help

If you are unsure how to contribute:

1. Read the [README](./README.md).
2. Search existing GitHub issues and discussions.
3. Review similar code already present in the repository.
4. Ask questions in the project's Discord community.
5. Open a discussion if the question requires broader input.

---

# License

By contributing to Two Steps Studio, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).

---

# Acknowledgments

Thank you for contributing to **Two Steps Studio**.

Whether you fix a bug, improve documentation, add a feature, write tests, review code, or help another contributor, your contribution helps make TSS better.

**Welcome to the project.**
