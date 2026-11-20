# Credential-based RBAC testing

Use `/auth/sign-in`. Every account below uses password **`HmsAccess!2026`**.

| Assigned role | Work email | Login destination |
|---|---|---|
| Hospital administrator | admin@central.hms.test | /dashboard/admin/people |
| Doctor | doctor@central.hms.test | /dashboard/doctor |
| Nurse | nurse@central.hms.test | /dashboard/nurse |
| Records officer | records@central.hms.test | /dashboard/records |
| Receptionist | reception@central.hms.test | /dashboard/reception |
| Pharmacist | pharmacy@central.hms.test | /dashboard/pharmacy |
| Laboratory staff | lab@central.hms.test | /dashboard/lab |
| Imaging staff | imaging@central.hms.test | /dashboard/imaging |
| Cashier | cashier@central.hms.test | /dashboard/cashier |
| Claims officer | claims@central.hms.test | /dashboard/claims |
| Platform administrator | platform@central.hms.test | /dashboard/platform |
| Patient | patient@central.hms.test | /dashboard/patient |
| Second organisation administrator | admin@harbour.hms.test | /dashboard/admin/people, scoped to Harbour |

These are intentionally dummy accounts for **development only**. They are not shown in the public product UI and are not included in client bundles. Fixture authentication is disabled whenever `NODE_ENV=production`, and can also be disabled in development with `HMS_FIXTURE_AUTH=disabled`. A production login fails closed until a real identity/persistence adapter is configured. Never use these credentials for real records.

## Implemented access boundary

- Login validates a password hash on the server. The role, account and organisation come from the server account record, never a browser role selector or URL parameter.
- A random opaque token is placed in an HttpOnly, SameSite=Strict cookie. Only its SHA-256 digest is held in the server session map. Sessions expire after eight hours or thirty minutes of inactivity. Login rotates the current session and logout revokes it; disabled staff cannot continue using an existing session.
- Protected dashboard pages check the session and assigned role before rendering. Changing `/dashboard/doctor` to `/dashboard/admin` returns the user to their assigned dashboard.
- Workspace, mutation, settings and AI endpoints check the session independently. Mutations validate same-origin requests. Supplying another role or organisation in a command is rejected.
- Server responses contain one authorised organisation and role-filtered data, with no password hashes. The complete organisation profile, staff directory and invitations are restricted to hospital administrators. Platform operations receive customer summaries and no clinical records. Patient accounts receive only their linked patient's released records.
- All roles have personal Settings. Role/email/organisation are read-only there; one user cannot target another user's preferences. Organisation profile and hospital configuration are separate administrator-only screens.
- The old role picker, organisation switcher, public dashboard links and demonstration controls were removed from reachable product routes. `/auth/workspace` now redirects to public capabilities. Old `hms-demo-v1` browser data is discarded, and private workspace data is no longer persisted in browser storage.
- Department URLs use stable slugs such as `general-medicine`. Earlier encoded name URLs such as `General%20medicine` are also resolved.
- Mock AI context is reconstructed on the server from the signed-in user's authorised records. The API does not trust a client-supplied chart snapshot, actor role or organisation. AI inference remains simulated as requested.

## What is still a fixture

The current adapter stores accounts, sessions, preferences and synthetic hospital records in server process memory. Restarting the development server resets this data. This is not a durable database or a production identity service. The existing Express/MongoDB starter is not silently treated as an RBAC provider: it needs tenant membership, identity verification, migrations, durable sessions/revocation, account recovery and an email adapter before replacing this boundary.

Development organisation verification returns a test link only to the browser holding the matching HttpOnly registration cookie. Onboarding creates the first user as hospital administrator; accepting an invitation activates exactly its preselected role and requires a password. Real email delivery remains to be connected. Production must use durable storage, verified email delivery and a supported identity provider; MFA, operational security review and deployment testing remain separate work.

Clinical roles currently work with synthetic records within their organisation. Production care-team/ward assignments, consent-based access, emergency access and durable audit retention still need explicit policies and enforcement. Passing the fixture tests is not a claim of production readiness or healthcare compliance.

## Test

### Account security and People management

- **Settings → Security** lists only the signed-in account's active sessions, with browser/device labels and activity times. The interface does not receive raw session tokens or password hashes.
- Users can sign out an individual other session, sign out all other sessions, or sign out everywhere. Session identifiers are scoped to the account; attempts to revoke another account's session are rejected.
- Password changes require the current password and confirmation of a new password. The current session token rotates, other sessions are revoked and password inputs are cleared after success. The standard dummy passwords remain unchanged unless that account's user changes one; changes last until the development server restarts.
- **People → Department → Edit user** updates a member's name, department and assigned hospital role. A role/department change revokes the member's sessions; their next login opens the newly assigned dashboard. Disabling a member also revokes their sessions immediately.
- The organisation owner's administrator role and department cannot be reassigned by this editor, and the owner cannot be disabled. Pending invitations receive a replacement link when their role or department changes.
- Password/session audit events are visible only to the affected account and authorised hospital administrators.

Run `npm.cmd run dev -- -p 3100`, then `npm.cmd run test:rbac`. The test covers all role credentials and dashboard destinations, anonymous denial, HttpOnly cookies, wrong-role URL access, organisation isolation, response privacy, personal settings, restricted organisation profile, invite role assignment, token replay/logout and first-admin registration.

The older `tests/ui-check.cjs`, `tests/api-check.cjs` and `tests/onboarding-ui.cjs` files describe the superseded role-picker prototype. Package commands `test:ui`, `test:api` and `test:onboarding:ui` now run the current RBAC regression suite. Prefer `test:rbac`; it also verifies authenticated mock AI context and ownership of draft acceptance.

References: [Next.js authentication and data access](https://nextjs.org/docs/app/guides/authentication), [OWASP authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).

## Latest verification

- Production build, TypeScript and ESLint passed.
- All twelve role logins, assigned dashboard routes and personal Settings passed browser/API checks.
- Anonymous access, wrong-role URLs, forged roles/cookies, cross-organisation requests, CSRF origins, organisation-profile privacy and patient-only record filtering passed.
- Invitation role assignment, first-admin registration, personal preference persistence, logout/token replay and server-owned AI draft acceptance passed.
- Both `General%20medicine` and `general-medicine` department URLs opened successfully.
- Production browser bundles were scanned: fixture passwords, credential emails and scrypt credential logic were absent.
- Security-tab tests passed for password confirmation/reset, current-token rotation, signing out other/all sessions and account-scoped session controls.
- People-editor tests passed for role/department changes, owner protection, fresh-login routing and immediate revocation after disabling a user.
- Session expiry is evaluated explicitly at request time. Browser regression checks now catch route prerender/hydration errors as well as page exceptions; the previously observed development warning no longer occurs.
