# Organisation onboarding and People

**Current access model:** Sign-in now requires email and password, with role and organisation obtained from the server session. New organisations begin at `/auth/get-started`; the profile step also sets the first administrator’s password. Invitations require the invitee to set a password and keep their assigned role. Workspace data and verification transactions are server-managed, not held in session storage. See [RBAC test accounts and boundaries](./RBAC-TEST-ACCOUNTS.md) for the current implementation; the earlier preview walkthrough below is retained as historical context.

Start at `/auth/sign-in` or `/auth/get-started`.

1. Enter an official work email. Common personal-email domains are rejected in this preview; this is a UX policy, not employment/domain-ownership verification.
2. The check-inbox screen shows the exact address and a simulated verification message. Open its link, then confirm the email. Links expire after 15 minutes; resending replaces the previous link.
3. A new organisation's first verified user completes their name and the hospital profile. Their role is fixed to **Hospital administrator**. Profile fields include organisation name/type, address, phone, city, state, country and optional website.
4. Creation adds a clean organisation with starter departments and one active administrator. It does not copy seeded patients, clinical activity or stock into the new hospital.
5. The first destination is `/dashboard/admin/people`. Administrator root routes also show People first.
6. People shows available department cards, counts, a search field and an **Add department** button. Adding a department uses a modal with name and description; case-insensitive duplicate names are rejected.
7. Selecting a card opens `/dashboard/admin/people/:department`. **Add user** opens a modal requiring a full name, official work email and explicit hospital role. Platform and patient roles cannot be assigned through hospital staff invitations.
8. Preparing an invitation creates a disabled/pending member in that department with the selected role. The email preview contains a working same-tab invitation link; nothing is actually emailed.
9. Invitation acceptance activates that member and opens their assigned workspace. It does not promote the invitee to administrator. Admins can resend or revoke pending invitations. Resending replaces the token; expiry, revocation and replay are checked on acceptance.
10. A returning active member enters through the work-email verification flow and returns to their existing workspace. Unknown users on an existing organisation domain must request an invitation rather than becoming a second first administrator.

The prototype shares its existing tab-local synthetic store with onboarding. Refreshing preserves the current organisation, departments, staff and pending invitations. Existing seeded hospitals and clinical workflows remain available through the demo selector. Backend authentication, durable organisation identity, verified domain ownership, real email delivery and cross-device invitation handling remain future integrations.

## Verification

- `npm.cmd run test:onboarding:domain`: work-email validation, verification/expiry, first-admin ownership, duplicate organisation prevention, department permissions, required roles, invite acceptance, resend/revoke/replay, and organisation isolation.
- `npm.cmd run test:onboarding:ui`: the complete email-to-People journey, department modal, required role, invitation acceptance, returning sign-in, refresh, mobile layout and empty hospital screens.
- `npm.cmd run lint` and `npm.cmd run build`: static checks and production build.

Browser screenshots are written to `artifacts/onboarding/`, outside the build directory so subsequent builds do not remove them. This uses the same bundled Playwright/Microsoft Edge setup as the existing UI test suite.
