# Copilot Instructions

## Project Overview

This is a repository containing multiple applications and design systems, primarily built with Nuxt.js frameworks. The project uses pnpm for package management.

## Tech Stack

### Frontend Frameworks
- **Nuxt.js**: Primary framework for applications and design systems
- **Vue.js**: Used within Nuxt applications

### Build Tools & Package Management
- **pnpm**: Package manager
- **Vite**: Build tool
- **TypeScript**: Type checking

### Testing
- **Vitest**: Unit testing framework 
- **Playwright**: End-to-end testing

### Code Quality
- **ESLint**: JavaScript/TypeScript linting
- **Stylelint**: CSS/SCSS linting
- **commitlint**: Commit message linting
- **Husky**: Git hooks
- **cSpell**: Spell checking

### Other Tools
- **Sentry**: Error tracking (client and server configs)
- **PWA**: Progressive Web App support

## Coding Guidelines

### File Organization
- Components should be organized in dedicated folders with related files
- Do not use `index.js` or specific component files for exports

### TypeScript
- Use TypeScript for all new code when possible
- Type definitions should be in `@types/` directories or `.d.ts` files
- Follow tsconfig.json settings for type checking

### Component Structure (Vue/Nuxt)
- Use composition API for new components
- Keep components small and focused
- Use proper typing for props and emits
- Store state management in `stores/` directory

### API
- **.DOTNET**: API are served through .NET backend on IIS

### Styling
- Follow Stylelint rules defined in `stylelint.config.cjs`
- Use SCSS for component styles
- Keep styles scoped to components
- Shared styles go in `assets/styles/`

### Testing
- Write tests using Vitest
- E2E tests using Playwright
- Test files should be co-located with source files or in `__tests__` directories

### Commits
- Follow commitlint conventions (see `commitlint.config.js`)
- Use conventional commit format: `type(scope): message`
- Types: feat, fix, docs, style, refactor, test, chore

### Configuration Files
- Application-specific configs in application directories
- Shared configs at monorepo root
- Environment variables in `env/` directories
- Use `.config.js` or `.config.ts` extensions

## Development Workflow

### Package Management
```bash
    # Install dependencies
    pnpm install

    # Add dependency to specific workspace
    pnpm add <package> --filter <workspace-name>
```

### Running Applications
```bash
    # Run specific application
    pnpm --filter <app-name> dev
```

### Testing
```bash
    # Run all tests
    pnpm test

    # Run specific workspace tests
    pnpm --filter <workspace-name> test
```

## Important Patterns

### Nuxt Applications
- Use `app.vue` as the main app component
- Layouts in `layouts/` directory
- Pages in `pages/` directory (auto-routing)
- Middleware in `middleware/` directory
- Plugins in `plugins/` directory
- Composables in `composables/` directory
- Utils in `utils/` directory

### Server-Side
- Server code in `server/` directories
- Use Nuxt server routes for API endpoints
- Separate `tsconfig.json` for server code

### Public Assets
- Static files in `public/` directory
- Icons and favicons in `public/icons/`
- PWA assets configured via `pwa-assets.config.js`

## Best Practices

1. **Type Safety**: Use TypeScript and avoid `any` types
2. **Code Quality**: Run linters before committing
3. **Testing**: Write tests for new features and bug fixes
4. **Documentation**: Update relevant docs when changing functionality
5. **Performance**: Consider SSR/SSG implications in Nuxt applications
6. **Security**: Keep certificates secure, use environment variables for secrets
7. **Accessibility**: Follow WCAG guidelines for components

## Special Considerations

- This project includes both Nuxt.js implementations
- SSL certificates are configured for local HTTPS development
- Sentry is configured for error tracking
- PWA support is enabled
- The project appears to be for UniBo (University of Bologna)

## When Suggesting Code Changes

1. Check the existing patterns in the codebase
2. Use the same formatting and style
3. Ensure TypeScript types are correct
4. Follow the component organization structure
5. Add appropriate tests
6. Consider SSR/SSG implications
7. Check for similar existing utilities before creating new ones
8. Ensure changes work in the monorepo context
