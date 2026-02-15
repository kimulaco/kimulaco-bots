# AI Agent Guidelines - kimulaco-bots

> **Note**: This file must always be written in English for token efficiency.

## Project Overview

Discord Bot for notifying AWS/GCP/Cloudflare monthly billing via commands and scheduled messages.

### Tech Stack

| Item            | Technology                      |
| --------------- | ------------------------------- |
| Runtime         | Cloudflare Workers              |
| Framework       | Hono (TypeScript)               |
| Package Manager | pnpm workspace (monorepo)       |
| Test            | Vitest                          |
| Linter          | oxlint                          |
| Formatter       | Prettier + @prettier/plugin-oxc |
| Node.js         | 24.11.0                         |

## Directory Structure

```
├── apps/
│   └── discord-app/          # Main Discord Bot (Cloudflare Worker)
│       ├── src/
│       │   ├── index.ts      # Entry point (Hono + scheduled handler)
│       │   ├── interaction/  # Discord slash command handler
│       │   ├── api/          # API routes (health endpoint)
│       │   ├── scheduled/    # Cron job handlers
│       │   ├── services/     # Business logic
│       │   └── type/         # TypeScript types
│       └── scripts/          # Utility scripts
├── packages/
│   ├── discord/              # Discord API utilities
│   └── aws/                  # AWS Cost Explorer package
└── docs/                     # Documentation
```

## Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (in apps/discord-app)
pnpm test             # Run all tests
pnpm test:cov         # Run tests with coverage
pnpm lint             # Run oxlint
pnpm lint:fix         # Auto-fix lint issues
pnpm fmt              # Check formatting
pnpm fmt:fix          # Auto-fix formatting
pnpm deploy:dev       # Deploy to development
pnpm deploy:prod      # Deploy to production
```

## Coding Conventions

### TypeScript

- Strict mode enabled
- ES2022 target
- Bundler module resolution

### Testing

- File naming: `*.test.ts`
- Use `vi` for mocking (Vitest)
- Mock external dependencies (AWS SDK, fetch)

### Error Handling

- Use custom logger service (`services/logger.ts`)
- User-facing error messages in **Japanese**

### Imports

- Workspace packages use `@packages/` namespace
  - `@packages/aws`
  - `@packages/discord`

## Versioning

### Scope

- **Version managed**: `apps/discord-app` only
- **Fixed at 0.0.0**: root `package.json`, `packages/*`

### Update Rules

When updating version, modify both files:

1. `apps/discord-app/package.json` - `version` field
2. `apps/discord-app/src/version.ts` - `VERSION` constant

### Semantic Versioning

- **Patch (0.0.X)**: Bug fixes, dependency updates
- **Minor (0.X.0)**: New commands, feature additions
- **Major (X.0.0)**: Breaking changes

### Notes

- Do NOT modify `packages/` or root `package.json` versions
- No npm publish

## Package Configuration

### Private Packages

All `package.json` files must have `"private": true` to prevent accidental npm publish.

## Key Files

| File                             | Description                           |
| -------------------------------- | ------------------------------------- |
| `apps/discord-app/src/index.ts`  | Main entry point                      |
| `apps/discord-app/wrangler.toml` | Cloudflare Workers config             |
| `pnpm-workspace.yaml`            | Workspace config + dependency catalog |
| `vitest.config.ts`               | Test config                           |

## Environment Variables

Set in `apps/discord-app/.dev.vars` (gitignored).

```
DISCORD_PUBLIC_KEY          # Signature verification public key
DISCORD_BOT_TOKEN           # Bot auth token
DISCORD_CRON_CHANNEL_ID     # Scheduled notification channel ID
DISCORD_COMMAND_NAME        # Slash command name
AWS_ACCESS_KEY_ID           # AWS auth
AWS_SECRET_ACCESS_KEY       # AWS auth
BILL_API_PRIVATE_KEY        # Health endpoint auth
```

## Development Guidelines

### Adding Features

1. Implement in appropriate package (`packages/` for shared, `apps/` for app-specific)
2. Create test file (`*.test.ts`)
3. Verify with `pnpm lint && pnpm test`

### Adding Dependencies

- Add to `pnpm-workspace.yaml` catalog for version consistency
- Reference workspace packages with `workspace:*`

### Pre-commit Check

```bash
pnpm lint:fix && pnpm fmt:fix && pnpm test
```
