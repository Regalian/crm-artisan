# Testing

This project has three test layers:

1. **Unit tests** via Vitest
2. **Integration tests** via Vitest
3. **End-to-end and security tests** via Playwright + local Supabase

## Prerequisites

Database-backed tests run against the **local Supabase stack**, so Docker must be available.

If you use Colima:

```bash
colima start
```

Optional check:

```bash
docker ps
```

Install dependencies if needed:

```bash
npm install
```

## Quick start

Run the full automated suite from the repo root:

```bash
npm run test:all
```

This runs:

- unit tests
- integration tests
- full Playwright suite

## Test commands

### Unit tests

```bash
npm run test:unit
```

### Integration tests

```bash
npm run test:integration
```

Useful splits:

```bash
npm run test:integration:ui
npm run test:integration:db
```

### Playwright end-to-end tests

```bash
npm run test:e2e
```

Useful splits:

```bash
npm run test:e2e:browser   # all browser/user-flow checks
npm run test:e2e:auth      # auth pages and auth flows only
npm run test:e2e:flows     # clients + quotes lifecycles
npm run test:security      # authorization + RLS + RPC security tests
```

### Everything

```bash
npm run test:all
```

## What the DB-backed test commands do automatically

The database-backed integration and Playwright commands already:

- ensure local Supabase is running
- inject the local Supabase URL and anon key into the app and test process
- load `.env.test.local`
- build and start the app on `http://127.0.0.1:3001`

That keeps tests pointed at the local stack instead of a hosted Supabase project.

## Dedicated test users

The cross-user security specs use two dedicated local-only accounts:

- `testuser1@example.com`
- `testuser2@example.com`

These are loaded from `.env.test.local`.

Example values:

```bash
E2E_USER_1_EMAIL=testuser1@example.com
E2E_USER_1_PASSWORD=playwright123!
E2E_USER_2_EMAIL=testuser2@example.com
E2E_USER_2_PASSWORD=playwright123!
```

Before each security scenario, the test bootstrap:

- signs these users in
- creates them if needed
- clears any tenant data visible to them

That makes reruns repeatable.

## Current test layout

### Unit

- `tests/unit/`

### Integration

- `tests/integration/signup-form.test.tsx`
- `tests/integration/clients-crud.test.ts`

### Playwright setup

- `tests/auth.setup.ts` — creates `tests/auth.json`

### Playwright specs

- `tests/auth.spec.ts`
- `tests/clients.spec.ts`
- `tests/quotes.spec.ts`
- `tests/authorization.spec.ts`
- `tests/rls-isolation.spec.ts`
- `tests/rpc-security.spec.ts`

## Playwright projects

Configured in `playwright.config.ts`:

- `setup`
- `chromium-auth`
- `chromium-no-auth`
- `chromium-security`
- `api-security`

Playwright currently runs with `workers: 1` for reliability with the local Next.js + Supabase stack.

## Useful supporting files

- `playwright.config.ts`
- `vitest.config.ts`
- `tests/setup/vitest.setup.ts`
- `tests/auth.setup.ts`
- `tests/auth.json`
- `tests/README.md`
- `scripts/with-local-supabase.mjs`
- `scripts/load-test-env.mjs`

## Resetting local Supabase

If the local database gets into a bad state, reset it and rerun the suite:

```bash
supabase db reset --local --yes
npm run test:all
```

## Recommended local workflow

```bash
colima start
npm install
npm run test:all
```
