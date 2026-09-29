# Phase 4 — Sharing: invites, members, person attribution
 
This is the plan for Phase 4. Pair with `hisaab-master-plan.md` (roadmap),
`hisaab-architecture.md` (what's already built), and `Phase_3_complete.md`
(most recent build).
 
---
 
## Goal
 
Make Hisaab actually shared. By the end of Phase 4, a family member can:
 
1. Get invited by email by a budget owner.
2. Sign up via the invite, land directly in the shared budget.
3. Log expenses against shared categories, with their identity tracked.
4. See other members' entries (eventually live, via realtime).
5. Have a name attached to per-person tracked expenses (Pocket Money, School
   Fees, etc.) via the People entity.
Pair this with the existing per-person totals UI on the month-view summary
(built in Phase 3.2) and the architecture is finally end-to-end multi-user.
 
---
 
## The architectural pivot Phase 4 forces
 
Up to now you've been the only user. Phase 4 surfaces decisions that have
been latent in the schema but never exercised:
 
- **`auth.users` ≠ `people`.** A `User` is an account that logs in. A
  `Person` is a name a budget attributes spending to. The two overlap (you
  are *both* a User and a Person in your family budget) but they're not the
  same record. Phase 4 finally distinguishes them in the UI.
- **Editor vs Owner matters for the first time.** Until now everyone in a
  budget has been the sole owner. Once members exist, the owner-only
  policies (add/remove member, change role) actually gate something. Verify
  they work.
- **Invite flow needs server-side privileges.** Sending an email invite via
  `auth.admin.inviteUserByEmail()` requires the service role key, which
  **cannot** ship to the browser. This means Phase 4 introduces our first
  server-side surface: a Supabase Edge Function. Small one, but it's a real
  architectural step.
---
 
## Estimated effort
 
5-6 sessions of focused work, broken into 6 substeps. The Edge Function
(4.1) is the most novel piece; the rest reuse established patterns.
 
---
 
## Build order
 
### 4.1 — Invite flow via Edge Function
 
Adds: a "Members" sidebar item on shared budgets, an "Invite by email"
dialog, and the Edge Function that actually sends the invite.
 
**Why an Edge Function:** `supabase.auth.admin.inviteUserByEmail()` requires
the service role key. We never ship that to the browser. So invites go
through a small Supabase Edge Function that runs server-side, validates the
caller (is the user actually an owner of this budget?), then calls the admin
API. This is the standard Supabase pattern for any admin-privileged operation.
 
**Schema additions:**
 
```sql
-- An invite waiting to be accepted. Created when an owner clicks "Invite",
-- consumed when the invitee signs up via the link.
create table public.budget_invites (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references public.budgets(id) on delete cascade,
  email           text not null,
  role            text not null check (role in ('editor', 'viewer')),
  invited_by      uuid not null references auth.users(id),
  created_at      timestamptz not null default now(),
  accepted_at     timestamptz,
  -- Prevent duplicate pending invites for the same email + budget
  unique (budget_id, email)
);
```
 
RLS: only budget owners can read/insert/delete pending invites for their
budget. No general SELECT for the invitee — they don't have access until
they sign up.
 
**Edge Function: `invite-to-budget`**
- Receives `{ budgetId, email, role }` from the authenticated client
- Verifies the caller is an owner of that budget (re-checks server-side
  even though RLS would block a non-owner; defense in depth)
- Inserts the row in `budget_invites`
- Calls `supabase.auth.admin.inviteUserByEmail(email, { redirectTo, data })`
  where `data` includes the `budget_invite_id` so the post-signup hook knows
  what to consume.
**Trigger: `on_auth_user_created`** (Phase 4 introduces this)
- Fires when a new row appears in `auth.users` (i.e., someone completed
  signup via an invite link or normal signup)
- Looks up `budget_invites` matching the new user's email
- For each match: insert into `budget_members` with the saved role, mark
  the invite as accepted
**TDD here:** none directly — Edge Function code is integration-tested
manually against staging. The acceptance trigger is testable via SQL in the
dashboard.
 
**UI:**
- New route: `/app/budgets/:budgetId/members`
- Members list (calls `useBudgetMembers` hook), with role badges
- "Invite member" dialog: email + role picker
- Pending invites list, with revoke button (deletes the row)
**Decisions to lock in 4.1:**
- Auth method for invitees: turn email confirmation back on for this case?
  Or use magic link sign-in for the whole app? Either works; magic links
  are friendlier for non-technical family members.
- Default role for new invites: editor (recommended; viewers are too
  restricted for the family-trust model).
### 4.2 — Members management UI
 
Adds: full CRUD on `budget_members` for the active budget's owners. Builds
on the skeleton from 4.1.
 
- `useBudgetMembers(budgetId)` query — list members joined to `auth.users`
  for display names/avatars
- `useUpdateMemberRole` mutation
- `useRemoveMember` mutation
- "Leave budget" action for non-owners (already covered by RLS — members
  can remove themselves)
- A small UX detail: prevent the last owner from leaving or being
  demoted. Either UI-side check, or a DB-level trigger that errors. UI
  check is simpler.
**TDD here:** none — this is UI over the existing data model.
 
### 4.3 — People entity CRUD
 
Adds: management of the `people` table (Minhal, Deebaj, Batool, Ismat for
your family budget). Schema already exists; this is the UI.
 
- `usePeople(budgetId)` query (already exists from earlier — re-verify it
  works)
- `useCreatePerson`, `useUpdatePerson`, `useArchivePerson` mutations
- People section on the Manage page (alongside Categories & Items)
- Or a new sidebar entry "People" — open question, see decisions below
**Important distinction:** A `Person` is a name attached to a transaction,
not an auth user. Your family Pocket Money goes to "Minhal" the person —
regardless of whether Minhal has a login account. This decoupling is
important for cases where you track spending for kids who don't have
their own accounts.
 
**Decisions to lock in 4.3:**
- People management lives on Manage page (alongside Categories/Items) or
  its own sidebar route? Manage page is simpler; own route is cleaner if
  the list grows. Recommendation: Manage page for now, refactor later if
  needed.
- Optional: link a Person to an auth User (so "Minhal the person" and
  "Minhal the account" can be related). Useful for showing avatars next
  to per-person totals. **Recommendation: defer** — adds complexity for
  marginal value. Add it in Phase 5 if you find yourself wanting it.
### 4.4 — Person picker on transaction entry form
 
Adds: the deferred Phase 2 work. When a transaction's category has
`tracks_person = true`, the entry form shows a Person dropdown.
 
Wait — this is already built. Phase 2.5 added the person picker to the
transaction entry form. Re-verify it works end-to-end now that People
have UI management. Specifically:
 
- Picker shows all active people in the budget
- Required validation fires when category is tracked but no person picked
- Edit-transaction dialog (Phase 2.6) shows the previously-picked person
- Phase 3.2 per-person totals on the month summary card pick up the new
  attribution
If something has drifted (e.g., the picker pre-fills the user's name based
on auth identity? — probably not what we want, since you'd assign to your
sister sometimes), fix here. Otherwise just verify and move on.
 
### 4.5 — Realtime updates
 
Adds: live propagation so family members see each other's entries appear
as they're logged, without manual refresh.
 
Supabase Realtime works by subscribing to Postgres logical replication via
a websocket. The pattern:
 
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`budget:${budgetId}:transactions`)
    .on('postgres_changes',
        { event: '*', schema: 'public', table: 'transactions',
          filter: `budget_id=eq.${budgetId}` },
        (payload) => {
          // Invalidate the relevant TanStack Query so it refetches
          queryClient.invalidateQueries({ queryKey: transactionKeys.byBudget(budgetId) });
        })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [budgetId]);
```
 
We don't merge the payload into the cache directly — we just invalidate.
TanStack Query refetches with all the joins and RLS applied. Simpler than
trying to keep optimistic state and realtime state in sync.
 
Where to subscribe:
- `transactions` (day view + month view + trends)
- `income_entries` and `savings_entries` (month view)
- `categories`, `items` (Manage page)
- `budget_members` (Members page)
- `people` (anywhere)
One subscription per resource per budget, lifecycle tied to the BudgetLayout
mount. Centralize in a `useBudgetRealtime(budgetId)` hook.
 
**Caveats:**
- Realtime needs to be enabled per-table in the Supabase dashboard
  (Database → Replication → choose tables).
- The free tier has a connection limit (~200 concurrent). Fine for family
  use.
- RLS still applies — the subscription only receives events for rows the
  user has SELECT access to.
**Decisions to lock in 4.5:**
- Subscribe to everything, or only the active page's resources? Subscribing
  to everything keeps things simple (no juggling subscription lifecycles
  across route changes) and the overhead is negligible at family scale.
  Recommendation: subscribe to all per-budget resources from BudgetLayout.
### 4.6 — Multi-user RLS verification + polish
 
Final sweep:
 
- Sign up a second test account, accept an invite to your family budget,
  do a real two-user workflow: log a transaction, see it appear in the
  other account, edit each other's entries.
- Verify all the policies actually behave as the family-trust model
  promised: any editor can edit any transaction, including someone else's.
- Verify owner-only policies: a non-owner cannot invite, cannot change
  roles, cannot delete the budget.
- Member list shows display names (or email fallback). Make sure
  `useBudgetMembers` joins to `auth.users` correctly — RLS on `auth.users`
  needs checking, since by default you can't read other users' rows. May
  need a Postgres view or RPC that exposes just `id + email + display_name`
  for "people who share at least one budget with me."
- Update the Phase 4 completion doc.
---
 
## New patterns introduced in Phase 4
 
These will be the first time each appears in the codebase:
 
1. **Supabase Edge Function** (in `supabase/functions/invite-to-budget/`).
   Local development via `supabase functions serve`, deploy via
   `supabase functions deploy`. Uses Deno runtime — slightly different
   from Node.
2. **Realtime channel subscriptions.** New `useBudgetRealtime` hook
   pattern. Mounted at BudgetLayout level for the whole budget.
3. **Cross-schema join** (likely): pulling display info from `auth.users`
   for the member list, probably via a security-definer Postgres function
   or view rather than direct cross-schema access (since RLS on
   `auth.users` is restrictive by default).
4. **Trigger on `auth.users` insert.** Fires the invite-acceptance flow.
---
 
## Decisions to lock in before starting
 
Bundle these into the first message:
 
1. **Auth method for invitees:** keep email + password, or switch the whole
   app to magic links? *Recommendation:* magic links for the whole app —
   friendlier for non-technical family, no password fatigue. Existing
   email/password users keep their passwords; new signups via invite use
   magic links.
2. **Default invited role:** `editor` recommended. `viewer` exists but is
   essentially useless for family-trust model.
3. **People management location:** Manage page (alongside Categories &
   Items) recommended.
4. **Realtime granularity:** subscribe to all per-budget resources from
   BudgetLayout (recommended) vs. per-page subscriptions.
5. **Edge Function deployment target:** Supabase hosted (recommended, free
   tier covers it) vs. self-host.
---
 
## What's *not* in Phase 4
 
- Multi-budget bulk invites (one budget at a time is fine for now).
- Permission audit log ("Minhal changed Deebaj's role on 2026-05-15").
- Member avatars uploaded by users (just use initials, like the existing
  header avatar).
- Notifications to invitees outside of the email Supabase sends.
- Real-time presence indicators ("Mom is viewing this page").
All reasonable Phase 5+ additions.
 
---
 
## Patterns to reuse
 
Phase 4 should be ~80% reuse of established conventions:
 
- Dual-mode form for invite dialog (matches CategoryFormDialog pattern,
  though here invite is create-only — no edit mode).
- Cache key factories per resource (`memberKeys`, `inviteKeys`).
- `existing` prop pattern for any edit dialogs (member role).
- Hard delete for `budget_members` (matching `transactions`). Soft delete
  doesn't make sense for membership.
- Float-safety carried over from Phase 3 (no new aggregations in Phase 4).
- Skeleton loading states for member list.
- Mutations omit `created_by` / `invited_by`, let DB defaults fill in.
---
 
## Test count target
 
Phase 4 adds fewer pure-logic tests than Phases 2-3 because it's mostly
integration work (Edge Function, realtime, RLS verification).
 
- Edge Function request validation helpers (~5 tests)
- Member role-check helpers (~3 tests)
- Anything else that emerges
Target: ~10-15 new tests. End-of-Phase-4 total: ~195-200.
 
The real "tests" for Phase 4 are integration scenarios verified manually
with two real accounts. Document these in Phase_4_complete.md as
verification scripts.
 
---
 
## Database migration outline
 
One migration: `add_budget_invites_and_acceptance_trigger.sql`
 
- Create `budget_invites` table with constraints
- RLS policies on `budget_invites` (owners can manage, no general SELECT)
- `on_auth_user_created` trigger function (owned by postgres, security
  definer) — looks up matching invites by email, inserts membership rows,
  marks invites accepted
- Possibly a `member_profile` view or RPC for cross-schema `auth.users`
  access in the member list
Run `npm run types:supabase` after.
 
---
 
## Edge Function outline
 
Path: `supabase/functions/invite-to-budget/index.ts`
 
```typescript
// Pseudocode shape, fill in during 4.1
import { serve } from 'std/http/server'
import { createClient } from '@supabase/supabase-js'
 
serve(async (req) => {
  // 1. Auth check: get the user from the JWT in the Authorization header
  // 2. Parse body: { budgetId, email, role }
  // 3. Validate: caller is owner of budgetId? (query budget_members)
  // 4. Insert into budget_invites
  // 5. Call admin.inviteUserByEmail(email, { redirectTo, data: { invite_id } })
  // 6. Return { success: true } or detailed error
})
```
 
Deploy: `supabase functions deploy invite-to-budget`.
 
Local test: `supabase functions serve invite-to-budget`, then POST to
`http://localhost:54321/functions/v1/invite-to-budget` with a real JWT.
 
---
 
## Phase 4 readiness check (the inputs)
 
These should all be true going in:
 
- ✅ Auth system works (Phase 1)
- ✅ Budgets table with owner trigger (Phase 1)
- ✅ RLS policies including `has_budget_role(b_id, 'owner')` helper (Phase 1)
- ✅ Per-person totals UI on month summary (Phase 3.2)
- ✅ `people` table provisioned in schema (Phase 1)
- ✅ Person picker on transaction entry form (Phase 2.5)
What's missing:
- ❌ Members management UI
- ❌ Invite flow
- ❌ People CRUD
- ❌ Realtime
- ❌ Verification with multiple real users
These are the deliverables.
 
---
 
## Suggested first-message prompt for the new chat
 
Pasted in the kickoff prompt document. Starts the conversation with the
decisions above so the new instance can confirm and begin.
