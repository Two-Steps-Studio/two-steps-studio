Contributing to Two Steps Studio

Thank you for your interest in contributing to Two Steps Studio (TSS)! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Issue Reporting](#issue-reporting)
- [Security Disclosures](#security-disclosures)

## Code of Conduct
Please note that this project is released with a [Code of Conduct](./CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Getting Started

### Prerequisites

Before contributing, ensure you have:
- Node.js 18+ and npm/pnpm
- Git installed
- Understanding of the project structure (see [README.md](./README.md))

### Development Setup

1. **Fork the Repository**
   ```bash
   git clone https://github.com/kenic___/tss.git
   cd tss
   ```

2. **Install Dependencies**
   ```bash
   # Website
   cd tss-website
   npm install

   # Bot
   cd ../tss-dc-bot
   npm install
   ```

3. **Configure Environment**
   - Create `.env` files with your own credentials (never commit `.env`)
   - See [README.md](./README.md) for environment variable setup

4. **Start Development**
   ```bash
   # Website in tss-website directory
   npm run dev

   # Bot in tss-dc-bot directory
   cd ../tss-dc-bot
   npm start
   ```

### Development Workflow

#### Branch Naming Convention

```
<type>/<description>
```

Examples:
- `feature/user-profile-improvement`
- `bugfix/login-page-bug`
- `docs/update-api-documentation`
- `refactor/shop-component`

#### Commit Message Format

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Build/ci changes
- `perf`: Performance improvements
- `ci`: CI configuration

Examples:
```
feat(shop): add discount coupon system

fix(login): resolve authentication timeout issue when using proxy

docs(README): update setup instructions for new developers
```

#### Code Style Guidelines

##### JavaScript/TypeScript

- Use **TypeScript** for all new code
- Follow **Airbnb JavaScript** style guide
- Use **ESLint** config provided in `.eslintrc.js`
- Maximum line length: **100 characters**
- Use **TypeScript interfaces** for types
- **JSDoc** comments for public APIs

##### Components

- Use **React hooks** (useState, useEffect, useMemo, etc.)
- Follow **React Best Practices**
- Use **Context API** for global state
- Components should be **small and focused**
- Extract sub-components when complexity grows

##### Tailwind CSS

- Use **utility-first** approach
- Follow **Tailwind Conventions**
- Custom utilities in `tailwind.config.ts`
- Use **shadcn/ui** components when possible

##### Database

- Use **Supabase RLS** for row-level security
- Index frequently queried columns
- Document schema changes in changelog
- Test database migrations thoroughly

##### Git Hooks

The project uses **Husky** for pre-commit hooks:

```bash
# Install hooks (already done in setup)
npm run setup:husky

# Run linting before commit
npm run lint
```

#### Pull Request Process

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   - Write or update code
   - Add tests for new functionality
   - Update documentation

3. **Test Locally**
   ```bash
   # Website
   npm run dev

   # Run tests
   npm test

   # Run linter
   npm run lint
   ```

4. **Create Pull Request**
   - Fill out the PR template
   - Reference related issues
   - Add screenshots for UI changes

5. **Review Process**
   - Project maintainers will review
   - May request changes
   - Tests must pass
   - Documentation must be updated

6. **Merge and Deploy**
   - Automatic CI/CD deployment on merge
   - Version bump following [semver](https://semver.org/)

##### Testing Guidelines

1. **Test Coverage**
   - Target **80%+ coverage** for new code
   - Critical paths: **100% coverage**
   - Document testing strategy

2. **Testing Tools**
   - **Vitest** for unit tests
   - **Playwright** for E2E tests
   - **React Testing Library** for component tests

3. **Testing Best Practices**
   ```typescript
   // Unit test example
   import { describe, it, expect } from 'vitest';
   import { calculateStats } from '@/lib/stats';

   describe('calculateStats', () => {
     it('should calculate correct stats', () => {
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

4. **E2E Testing**
   - Test critical user flows
   - Use Playwright for browser automation
   - Test on multiple devices

##### Issue Reporting

When reporting an issue:

1. **Check Existing Issues**
   - Search for similar issues first
   - Check the [CHANGELOG](./CHANGELOG.md) for fixed issues

2. **Issue Template**
   ```markdown
   ## Bug Report
   **Describe the bug**:
   [Clear description of the bug]

   **To Reproduce**:
   Steps to reproduce the behavior:
   1. Go to '...'
   2. Click on '...'
   3. Scroll to '...'
   4. See error

   **Expected behavior**:
   [What you expected to happen]

   **Actual behavior**:
   [What actually happened]

   **Environment**:
   - OS: [e.g., Windows 11]
   - Browser: [e.g., Chrome 120]
   - Version: [e.g., 1.0.0]

   **Screenshots**:
   [If applicable, add screenshots]

   **Additional context**:
   [Add any other context]
   ```

3. **Issue Labels**
   - `bug`: Something isn't working
   - `enhancement`: New feature request
   - `documentation`: Documentation issue
   - `good first issue`: Good for newcomers
   - `help wanted`: Needs extra help

#### Security Disclosures

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. **Email** the maintainers directly
3. Include:
   - Type of vulnerability
   - Affected component
   - Steps to reproduce
   - Potential impact

The team will respond promptly and follow responsible disclosure practices.

## Contributing Areas

### Welcome Contributions

We especially welcome:
- Bug fixes
- Documentation improvements
- Feature requests
- Code reviews
- Test additions
- Security improvements

### Areas Needing Attention

- [ ] Complete testing for all features
- [ ] Improve documentation
- [ ] Add accessibility features
- [ ] Performance optimizations
- [ ] Mobile responsiveness
- [ ] More Discord bot commands

### Style Guide

The project follows these style guides:
- [Airbnb JavaScript](https://github.com/airbnb/javascript)
- [React Guidelines](https://react.dev/learn)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/basic-types.html)
- [Tailwind CSS Conventions](https://tailwindcss.com/docs/conventions)

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General discussion and questions
- **Discord**: Real-time chat support

### Code Reviews

All contributions are reviewed by maintainers. We value:
- **Clarity**: Clear, readable code
- **Correctness**: Properly tested and bug-free
- **Consistency**: Following project conventions
- **Documentation**: Well-commented where needed

### Getting Help

If you need help contributing:
1. Check existing issues and discussions
2. Ask in the project's Discord channel
3. Review existing code and documentation

---

## License

By contributing to this project, you agree that your contributions will be licensed under its [MIT License](./LICENSE).

## Acknowledgments

Thank you for your contributions! Your support helps make Two Steps Studio better for everyone.