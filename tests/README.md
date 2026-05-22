# Testing map

This project now has three testing layers:

## 1) Unit tests — `tests/unit/`
- Runner: **Vitest**
- Goal: small, isolated checks of helpers and logic
- Current example: `tests/unit/quotes.test.ts`

Run with:

```bash
npm run test:unit
```

## 2) Integration tests — `tests/integration/`
- Runner: **Vitest**
- Render helper: **React Testing Library** for UI-focused integration tests
- Goal: check a few pieces working together either in a browser-like `jsdom` environment or through local app + database integration without launching Playwright
- Current examples:
  - `tests/integration/signup-form.test.tsx`
  - `tests/integration/clients-crud.test.ts`

Run with:

```bash
npm run test:integration
```

Useful split commands:

```bash
npm run test:integration:ui
npm run test:integration:db
```

The database-backed integration command ensures local Supabase is available.
It exercises route handlers against the local database without using Playwright
or a browser.

## 3) End-to-end and security tests — `tests/*.spec.ts`
- Runner: **Playwright**
- Goal: check real app flows, auth redirects, browser behavior, and API/security regressions

Run with:

```bash
npm run test:e2e
```

Useful split commands:

```bash
npm run test:e2e:browser   # all browser/user-flow checks
npm run test:e2e:auth      # auth pages and auth flows only
npm run test:e2e:flows     # clients + quotes lifecycles
npm run test:security      # authorization + RLS + RPC security tests
```

These commands make sure local Supabase is running and inject the local
Supabase URL/key into the app and Playwright process, so database-backed tests
run against your local stack instead of the hosted project. They also build and
start the Next.js app on a dedicated test port (`127.0.0.1:3001`) so they do
not reuse an already-running dev server that might still point at the hosted
database.

The test harness explicitly loads `.env.test.local` before the local Supabase
wrapper and Playwright config are evaluated.

The cross-user security specs use two dedicated test-only accounts by default:

- `testuser1@example.com`
- `testuser2@example.com`

Those values now live in `.env.test.local` locally, and you can still override
them with shell env vars if needed:

```bash
E2E_USER_1_EMAIL=testuser1@example.com
E2E_USER_1_PASSWORD=playwright123!
E2E_USER_2_EMAIL=testuser2@example.com
E2E_USER_2_PASSWORD=playwright123!
```

Before each security scenario, the test bootstrap signs these users in (creating
them if needed) and deletes any tenant data they can see so reruns stay
repeatable.

Playwright is currently configured with `workers: 1` in `playwright.config.ts`.
That is intentional: the local Next.js + Supabase test stack is more reliable
when the browser flows and DB-backed checks run one at a time.

## Supporting files
- `playwright.config.ts` — Playwright setup, projects, dev server, and the auth setup dependency
- `vitest.config.ts` — Vitest setup, test discovery, `@` alias, jsdom environment
- `tests/setup/vitest.setup.ts` — shared setup for Vitest tests
- `tests/auth.setup.ts` — Playwright setup test that creates `tests/auth.json` for authenticated browser tests
- `tests/auth.json` — saved authenticated browser session for Playwright
- `tests/manual/` — debugging helpers that are not part of normal automated runs
