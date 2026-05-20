# Security Audit: Cross-User Data Access

## Scope
Static review of the authenticated data-access paths in:

- `src/app/api/**`
- `src/app/**` pages that load tenant data
- `supabase/migrations/**`

Reviewed tables and tenancy boundaries:

- `clients`
- `job_sites`
- `quotes`
- `quote_line_items`
- `profiles`

## Executive Summary
I found **one real cross-user data exposure** in the current codebase.

It comes from an exposed Supabase RPC function:

- `public.get_next_quote_number(...)`

That function is declared as **`SECURITY DEFINER`** in the exposed `public` schema and authorizes access using a **caller-controlled `p_user_id` parameter** instead of `auth.uid()`. Because of that, a logged-in user can call the RPC **directly** with their own JWT and bypass the app's normal route-level checks.

This creates **two distinct data-access paths** for one user to learn another user's data:

1. **Existence oracle for arbitrary `job_site_id` values**
2. **Disclosure of another user's quote sequence and client-name initials** when the attacker knows or can guess the victim's `user_id`

I did **not** find any other current cross-user read path in the reviewed REST routes/tables. The main CRUD tables otherwise have RLS enabled and the app routes generally perform ownership checks before returning data.

---

## Findings

### 1) Cross-user quote metadata disclosure via exposed `SECURITY DEFINER` RPC
**Severity:** High  
**Affected code:**
- `supabase/migrations/20260518000002_fix_quote_number_function.sql:7`
- `supabase/migrations/20260518000002_fix_quote_number_function.sql:30`
- `supabase/migrations/20260518000002_fix_quote_number_function.sql:53`
- `src/app/api/job-sites/[id]/quotes/route.ts:77`
- `src/app/api/job-sites/[id]/quotes/route.ts:79`

#### Why this is exploitable
The function is defined like this:

- It lives in `public`
- It is `SECURITY DEFINER`
- It trusts a caller-supplied `p_user_id`

That means the authorization decision is based on:

```sql
IF v_actual_user_id != p_user_id THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

instead of something derived from the authenticated session, such as `auth.uid()`.

In Supabase, functions in the exposed `public` schema are callable through the RPC/Data API when the caller has execute rights. I found **no privilege hardening** in migrations (no `REVOKE EXECUTE`), so default Postgres behavior makes this callable by authenticated users.

#### What another logged-in user can access
A logged-in attacker can query:

- whether a victim `job_site_id` exists
- the victim job site's **quote sequence** (`max + 1`)
- the first two letters of the victim client name (the function builds the prefix from `SUBSTRING(c.name, 1, 2)` before the app later normalizes it)

The return value therefore leaks business data such as:

- client initials
- approximate number of quotes already created for that job site
- confirmation that a job site exists

#### Exploit path A: existence oracle
Even **without** knowing the victim's `user_id`, an attacker can distinguish:

- `Job site not found`
- `Access denied`

So by calling the RPC directly on guessed UUIDs, a logged-in user can tell whether a `job_site_id` belongs to someone else.

#### Exploit path B: quote-number disclosure
If the attacker knows or can guess the victim's `user_id`, they can call:

```http
POST /rest/v1/rpc/get_next_quote_number
Authorization: Bearer <attacker JWT>
Content-Type: application/json

{
  "p_job_site_id": "<victim job site uuid>",
  "p_user_id": "<victim user uuid>"
}
```

and receive a value like:

```json
"AC-007"
```

That leaks:

- victim client initials: `AC`
- next quote number: `007`
- therefore at least six prior quotes for that site

#### Why the app route does not fix it
The application route correctly passes the current user's ID:

- `src/app/api/job-sites/[id]/quotes/route.ts:77-79`

But that only protects the app's own call path. It does **not** prevent a logged-in user from invoking the RPC directly against Supabase with their own session token.

#### Impact
A logged-in user can access another user's tenant metadata without authorization.

This is enough to leak:

- existence of another user's job sites
- some client identity data (initials)
- quote volume / sequencing metadata

In a multi-tenant CRM, that is a meaningful tenant-isolation failure.

#### Recommended fix
1. **Do not authorize a `SECURITY DEFINER` function with caller-supplied identity.**
2. Change the function to derive identity from the session:

```sql
IF v_actual_user_id != auth.uid() THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

3. Prefer one of these stronger designs:
   - remove `SECURITY DEFINER` entirely if not needed, or
   - move the function to a private schema and expose it only through a server-side path, or
   - explicitly `REVOKE EXECUTE` from `anon` / `authenticated` if the function should never be called directly.
4. Avoid detailed error messages that differentiate nonexistence from unauthorized access.

---

## Other Reviewed Paths
I reviewed the current authenticated CRUD routes for:

- `/api/clients`
- `/api/clients/[id]`
- `/api/job-sites`
- `/api/job-sites/[id]`
- `/api/job-sites/[id]/quotes`
- `/api/quotes`
- `/api/quotes/[id]`
- `/api/quotes/[id]/items`
- `/api/quotes/[id]/items/[itemId]`
- `/api/quotes/[id]/pdf`

and the corresponding RLS policies in Supabase migrations.

### Result
I did **not** find another current route/table path that allows a logged-in user to read another user's full clients, job sites, quotes, line items, PDFs, or profiles.

The rest of the tenant isolation is primarily being enforced by:

- RLS on `clients`
- RLS on `job_sites`
- RLS on `quotes`
- RLS on `quote_line_items`
- RLS on `profiles`

---

## Final Answer: Every current way a logged-in user could access another user's data
1. **Directly call the exposed `public.get_next_quote_number` RPC to determine whether another user's `job_site_id` exists** via distinguishable error messages (`Job site not found` vs `Access denied`).
2. **Directly call the same RPC with a victim `job_site_id` and victim `user_id` to retrieve another user's quote-number metadata**, which leaks client initials and quote sequence/count information.

No other current cross-user read path was identified in the reviewed code.
