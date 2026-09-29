# Phase 4 — Complete
 
Sharing: invite links, member management, person attribution, and a
multi-user RLS verification pass. The phase that turns Hisaab from a
single-user app into a genuinely shared one — a family can have their own
accounts and contribute to a common ledger.
 
---
 
## Scope delivered
 
By the end of Phase 4, Hisaab supports the following:
 
- A budget owner can generate a shareable invite link and send it however
  they like (WhatsApp, SMS, anything) — no email infrastructure.
- A recipient can open the link, sign up or sign in, and land directly in
  the shared budget.
- Owners can see all members, change non-owner roles, and remove members.
- Any non-owner can leave a budget themselves.
- Member lists show real identities (email) via a profiles table.
- People (names for per-person attribution) have full CRUD on the Manage
  page, distinct from budget members.
- The transaction person picker is verified to work end-to-end with
  multi-user data.
- The full RLS model has been exercised with real second and third
  accounts: legitimate access works, illegitimate access is blocked.
The budget is now multi-user end to end. A family member with their own
account can log expenses against the shared categories with their identity
recorded, and the owner controls who has access.
 
---
 
## Substeps and timeline
 
| Substep | Topic                                                       | Outcome   |
| ------- | ----------------------------------------------------------- | --------- |
| 4.1     | Shareable-link invite flow (table, functions, accept route) | Done      |
| 4.2     | Member management UI + profiles for display names           | Done      |
| 4.3     | People entity CRUD on the Manage page                       | Done      |
| 4.4     | Person picker verification + entry-form bug fixes           | Done\*    |
| 4.5     | Realtime subscriptions                                      | Deferred  |
| 4.6     | Multi-user RLS verification with real accounts              | Done      |
 
\* 4.4 is complete with one known, deferred bug — see "Known quirks and
deferrals" below.
 
---
 
## The architectural pivot, and how it changed
 
The Phase 4 plan anticipated a Supabase Edge Function as the phase's most
novel piece — the first server-side code in the project — needed because
`auth.admin.inviteUserByEmail()` requires the service role key, which
cannot ship to the browser.
 
**The Edge Function was dropped.** By switching from email invites to
shareable links, the admin API requirement disappears entirely. The whole
invite flow reduces to a table, two security-definer functions, and client
code. Phase 4 therefore remained a no-server-side-code phase, consistent
with the project's no-Express principle. Edge Functions can be revisited if
a future phase needs scheduled jobs, exports, or transactional email.
 
Two pivots followed from that decision:
 
1. **Token-based acceptance, not an `auth.users` insert trigger.** The
   original plan consumed invites via a trigger on `auth.users` that matched
   by email. With shareable links the invite token is the credential;
   acceptance happens client-side after auth completes, by calling a
   security-definer function with the token. No cross-schema trigger needed.
2. **No email stored on the invite.** Since anyone with the link can accept
   (the family-trust model), the invite row carries no `email` column — it
   is just `(budget_id, role, token, accepted_at, accepted_by)`.
Realtime (4.5) was also deferred — see its own section below.
 
---
 
## Architecture additions
 
### New database objects
 
| Object                            | Purpose                                                        |
| ---------------------------------- | -------------------------------------------------------------- |
| `budget_invites` table             | Pending/accepted invite links. Token is the credential.        |
| `lookup_invite(token)` function    | Security-definer preview of an invite without consuming it.    |
| `accept_invite(token)` function    | Security-definer atomic accept: inserts membership, marks used.|
| `prevent_last_owner_removal` trigger| Blocks deleting or demoting the last owner of a budget.        |
| `profiles` table                   | Thin mirror of `auth.users` (id, email, display_name).         |
| `shares_budget_with(user)` function| Security-definer helper for profile-visibility RLS.            |
| `handle_new_user` trigger          | On `auth.users` insert, creates the matching profile row.      |
 
Two migrations:
 
- `add_budget_invites` — the invites table, RLS, `lookup_invite`,
  `accept_invite`, and the `prevent_last_owner_removal` trigger.
- `add_profiles_and_member_management` — the profiles table, RLS,
  `shares_budget_with`, the `handle_new_user` trigger, and a one-shot
  backfill of profiles for users created before the migration.
No changes to the Phase 1-3 schema. The `people` table was already
provisioned in Phase 1 and is used by 4.3 for the first time at full CRUD.
 
### New routes
 
```
/invite/:token                                    → InviteAccept (public)
/app/budgets/:budgetId/members                     → Members
```
 
`/invite/:token` is a top-level public route — it must be reachable by
signed-out users, who get bounced to `/auth` with the token stashed in
sessionStorage. Sidebar nav order is now: Day view → Month → Trends →
Members → Manage.
 
### New query hooks
 
| Hook                  | Resource         | Notes                                      |
| --------------------- | ---------------- | ------------------------------------------ |
| `useBudgetInvites`    | budget_invites   | Pending invites for a budget; owners only. |
| `useInviteLookup`     | budget_invites   | Token preview via `lookup_invite` RPC.     |
| `useBudgetMembers`    | budget_members   | Members merged with profiles client-side.  |
| `usePeople`           | people           | Pre-existing; migrated to a key factory.   |
 
### New mutation hooks
 
| File                       | Mutations                                          |
| -------------------------- | -------------------------------------------------- |
| `use-invite-mutations.ts`  | useCreateInvite, useRevokeInvite, useAcceptInvite  |
| `use-member-mutations.ts`  | useUpdateMemberRole, useRemoveMember               |
| `use-people-mutations.ts`  | useCreatePerson, useUpdatePerson, useArchivePerson |
 
### New cache key factories
 
| Factory       | Hierarchy                                       |
| ------------- | ----------------------------------------------- |
| `inviteKeys`  | `['invites', budgetId]`, `['invites','token',t]`|
| `memberKeys`  | `['members', budgetId]`                         |
| `peopleKeys`  | `['people', budgetId, includeArchived]`         |
 
All follow the established `[resource, budgetId, ...keys]` convention so
prefix-based invalidation cascades correctly.
 
### New components
 
- `InviteAccept` (route) — branches on auth state; stashes token and
  redirects when signed out, previews and accepts when signed in.
- `InviteLinkDialog` — role picker, generate, copy-to-clipboard.
- `Members` (route) — member list, role badges, role change, remove/leave,
  pending invites section.
- `PersonFormDialog` — dual-mode create/edit, mirrors `CategoryFormDialog`.
- `PersonList` — People section on the Manage page, with archived toggle.
### Client-side infrastructure
 
- `lib/pending-invite.ts` — single source of truth for the
  sessionStorage invite token (set / get / clear), so the lifecycle is
  searchable and centralized.
- `AuthProvider` moved inside `BrowserRouter` so it can use `useNavigate`.
- `query-client.ts` gained `refetchOnWindowFocus: true`.
---
 
## Decisions worth remembering
 
### 1. Shareable links over email invites
The link, not an email address, is the credential. Anyone with the link can
join at the role baked in at generation time. Friendlier for a non-technical
family, no email deliverability problems, and it eliminated the Edge
Function entirely.
 
### 2. sessionStorage for the pending invite token
A signed-out user who opens an invite link has the token stashed in
`sessionStorage` under `hisaab.pending_invite_token`, then is redirected to
`/auth`. After successful sign-in/sign-up, `AuthPage` reads the token and
routes to `/invite/:token`. `sessionStorage` (not `localStorage`) because
it dies with the browser session — an abandoned token shouldn't outlive the
tab. It is cleared in four places: after a successful accept, on sign-out,
on the landing page mount (defensive sweep), and on explicit decline.
 
### 3. accept_invite is a security-definer function
The acceptor is not yet a member, so the owner-only INSERT policy on
`budget_members` would block them. The function runs as `postgres`, bypassing
RLS, and does the lookup + membership insert + mark-consumed atomically with
`SELECT ... FOR UPDATE` so two simultaneous clicks can't both succeed.
 
### 4. Single-use links, with an exception
An invite is consumed (`accepted_at` set) only when a *new* membership is
created. If the caller is already a member of the target budget — e.g. the
owner testing their own link — the function returns the budget id without
consuming the invite. So testing a link doesn't burn it.
 
### 5. Owner role is immutable in the UI
The budget creator is the sole owner for the life of the budget. No
promotion to owner, no demotion of the owner. Editors and viewers can be
changed between those two roles; "owner" is a display-only badge. This keeps
the permission model simple and means the last-owner protection is the only
ownership edge case to handle.
 
### 6. prevent_last_owner_removal is a DB trigger
A `before update or delete` trigger on `budget_members` raises
`cannot_remove_last_owner` if the operation would leave a budget with no
owner. The UI also avoids showing a remove/leave control on the owner's own
row, but the trigger is the real guarantee — a raw API call cannot orphan a
budget.
 
### 7. profiles table over a view or bare function
Cross-schema access to `auth.users` is needed to show member identities.
Rather than a security-definer view or a per-budget function, Phase 4 adds a
`public.profiles` table mirroring `auth.users` (id, email, display_name),
kept in sync by a trigger on signup and seeded by a one-shot backfill. This
is the canonical Supabase pattern and generalizes — any future feature
needing user display info can join `profiles`.
 
### 8. Profile visibility is scoped by shared membership
RLS on `profiles` allows a user to read their own profile plus profiles of
anyone they share at least one budget with, via the `shares_budget_with`
helper. An unaffiliated user sees only themselves. Verified in 4.6 (B8).
 
### 9. useBudgetMembers merges client-side
PostgREST cannot auto-embed `profiles` from `budget_members` because the
foreign key on `budget_members.user_id` points at `auth.users`, not
`public.profiles`. The hook does two queries — members, then profiles by
id — and merges them in JS. RLS on `profiles` still enforces the same
visibility, so the behavior is unchanged.
 
### 10. People are taxonomy, not members
A Person is a name a budget attributes spending to (Pocket Money to
"Minhal"). A Member is an account that logs in. They are different records;
a person need not have a login. People use soft-delete (archive), matching
categories and items — archived people stay attached to their historical
transactions.
 
### 11. Realtime deferred to Phase 5
Full Supabase channel subscriptions were deferred. Realtime is a polish
feature, not a correctness one: the app is correct without it, just not
live. As an interim, `refetchOnWindowFocus` was enabled (data refreshes
when a user returns to the tab) and a short note in the budget sidebar tells
users the app is not live-updating. The master plan already lists realtime
under Phase 5; this formalizes that.
 
### 12. Display-name editing deferred
The `profiles.display_name` column exists but has no editing UI. Member
lists show email everywhere a name would go. A Settings page to edit the
display name is a Phase 5 item; the column existing now means no further
migration is needed for it.
 
---
 
## Known quirks and deferrals
 
1. **Person not pre-selected in the edit-transaction dialog.** When editing
   a transaction in a tracked category, the assigned person does not appear
   pre-selected in the picker (both for active and archived people). A fix
   was drafted (a `SelectValue` children fallback plus a `peopleForPicker`
   list that appends an archived assignee) but was **not committed** — it is
   parked for the UI-polish pass. The transaction's underlying `person_id`
   is unaffected; this is a display bug in the edit form only.
2. **budget_members has no created_at.** The table does not record when a
   member joined. `useBudgetMembers` orders by `user_id` for a stable but
   arbitrary order. Adding the column (with a `default now()` that would be
   misleading for existing rows) is a possible Phase 5 polish item; not
   worth a migration on its own.
3. **Removed member, live session.** If an owner removes a member while
   that member has an active session in another tab, the member's session
   stays alive but RLS begins denying their queries. The app degrades
   gracefully (the budget shows a not-found state) but the member is not
   force-signed-out. True session invalidation is out of scope.
4. **Double-invalidation on own writes would occur with realtime.** Noted
   for whoever builds 4.5 in Phase 5: a client's own mutation already
   invalidates its caches; a realtime event for that same write would
   invalidate again. The accepted plan is to tolerate the one extra
   refetch rather than build origin-filtering.
5. **Transaction entry-form fixes shipped in 4.4.** Three latent Phase 2
   bugs were fixed while verifying the person picker: edit mode overwriting
   numeric values with item defaults (data corruption), search-selected
   items not displaying in the item dropdown, and the search dropdown
   reopening after submit. These predate Phase 4 but were fixed here.
---
 
## Multi-user RLS verification (4.6)
 
Verified with four real accounts: one owner, two editors, one unaffiliated
outsider, plus a fresh signup for the invite lifecycle.
 
**Group A — legitimate workflow (all passed):** both users see the same
budget; an editor's transaction is visible to the owner; either party can
edit or delete the other's transactions (family-trust model); income/savings
entries propagate; editors can manage taxonomy; cross-user person
attribution shows correctly on per-person totals.
 
**Group B — permission boundaries (all passed):** an editor sees no invite
button or role dropdowns; a direct API UPDATE by an editor on
`budget_members` is silently filtered to zero rows (role unchanged); a
direct API INSERT into `budget_invites` by an editor is rejected with
`42501 row-level security policy`; an outsider's `transactions` query for
the budget returns zero rows; an outsider sees only their own profile.
 
**Group C — membership lifecycle (all passed):** invite → signup → join
works; a new member can contribute; an owner can remove a member; a removed
member loses access and degrades to a not-found state; the last-owner
delete is blocked at the DB with `P0001 cannot_remove_last_owner`; a used
link shows "already used"; a revoked link shows "invalid".
 
---
 
## File index
 
### New files added in Phase 4
 
```
src/
├── components/
│   └── members/
│       └── invite-link-dialog.tsx
│   └── manage/
│       ├── person-form-dialog.tsx
│       └── person-list.tsx
├── lib/
│   └── pending-invite.ts
├── queries/
│   ├── invite-keys.ts
│   ├── member-keys.ts
│   ├── people-keys.ts
│   ├── use-budget-invites.ts
│   ├── use-budget-members.ts
│   ├── use-invite-lookup.ts
│   ├── use-invite-mutations.ts
│   ├── use-member-mutations.ts
│   └── use-people-mutations.ts
└── routes/
    ├── invite-accept.tsx
    └── members.tsx
 
supabase/migrations/
├── <timestamp>_add_budget_invites.sql
└── <timestamp>_add_profiles_and_member_management.sql
```
 
### Modified files
 
- `src/App.tsx` — `/invite/:token` and `/members` routes; `AuthProvider`
  moved inside `BrowserRouter`.
- `src/lib/auth-context.tsx` — sign-out clears query cache and pending
  invite token, navigates to `/`; ordered so the navigate precedes the
  Supabase sign-out to avoid a RequireAuth race.
- `src/routes/auth.tsx` — clears cache on sign-in; redirects to a pending
  invite if one is stashed.
- `src/routes/landing.tsx` — defensive clear of any abandoned invite token.
- `src/components/layout/budget-layout.tsx` — Members sidebar entry; the
  non-realtime honesty note.
- `src/components/layout/app-layout.tsx` — sign-out call site verified to
  route through the auth context.
- `src/routes/manage.tsx` — People section added below Categories & Items.
- `src/queries/use-people.ts` — migrated to the `peopleKeys` factory.
- `src/lib/format/initials.ts` — `InitialsInput` widened to accept `null`.
- `src/lib/query-client.ts` — `refetchOnWindowFocus: true`.
- `src/components/transactions/transaction-entry-form.tsx` — three latent
  bug fixes (see Known quirks #5).
---
 
## Commits
 
Phase 4 was delivered across the following conventional commits:
 
```
feat: add shareable-link invite flow for budget sharing
fix: order sign-out steps so user lands on landing, not /auth
feat: add member management with profiles for display names
fix: rewrite useBudgetMembers to merge profiles client-side
feat: add people CRUD on Manage page
fix: transaction entry form correctness bugs surfaced during 4.4
feat: enable focus-refetch and note non-realtime behavior
```
 
(The sign-out fix was a small follow-up to 4.1; depending on how it was
applied it may have been amended into the 4.1 commit rather than standing
alone.)
 
---
 
## Phase 5 readiness
 
Phase 4 leaves Phase 5 (polish) with a clear, well-defined backlog. The
items below are carried in from Phase 4 deferrals and should be folded into
the Phase 5 plan:
 
- **Full realtime** (deferred 4.5) — Supabase channel subscriptions via a
  `useBudgetRealtime` hook mounted at `BudgetLayout`, invalidating cache
  keys on `postgres_changes` events. Requires enabling replication per
  table in the Supabase dashboard. The design is sketched in the Phase 4
  plan and in Known quirks #4.
- **Person pre-selection in the edit-transaction dialog** (Known quirks #1)
  — the drafted fix is in the Phase 4 chat history.
- **Display-name editing** (decision #12) — a Settings page to edit
  `profiles.display_name`; the column already exists.
- **budget_members.created_at** (Known quirks #2) — optional, only if a
  join-date or activity feed is wanted.
The pre-existing Phase 5 scope from the master plan (CSV export, inline
category/item creation, date editing in the edit dialog, toast
notifications, keyboard shortcuts, mobile polish, end-to-end tests) is
unchanged.
 
The app is now fully multi-user and independently shippable.
 