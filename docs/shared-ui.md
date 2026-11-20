# Shared HMS UI

The authenticated application uses shadcn/ui's **base-nova** components with Base UI, Tailwind v4, Lucide icons and the HMS blue/teal theme. Components are owned locally under `components/ui`. Configuration is in `components.json`; tokens are in `app/globals.css`.

## Adding components

Run `npx shadcn add <component>` from the client directory. Keep the Base UI family and review generated changes. The CLI is a development dependency. Do not replace the global stylesheet during initialization: it contains existing marketing/authentication styles. Legacy styles live in the components cascade layer so utilities can style shared components predictably.

`components/shared/identity.tsx` retains the original logo, domain icon mapping and exact status-to-tone mapping. Shared primitives adapt the existing form and table contracts to shadcn components; native selects and numeric/date inputs preserve form submission values and browser constraints. Checkbox fields explicitly bridge their checked state into FormData.

## Workspace interactions

- Header and sidebar account menus expose personal account and security settings, and administrators' organisation settings. Identity, role and organisation come from the server snapshot.
- `/dashboard/:role/settings/security` is a protected, reloadable security destination. Settings tabs use URL navigation and proper tab panels.
- Ctrl/Cmd + K opens navigation search containing only permitted destinations. It does not index patient records.
- Recent activity uses already-authorised activity data; it does not claim to track unread notifications.
- People uses controlled dialogs and per-person action menus. Disabling access and revoking invitations require confirmation. Existing server-side owner protection and session revocation remain authoritative.
- AI uses a responsive sheet, the local mock API, explicit review/acceptance, source records and cancellation/version safeguards. Closing an edited draft requires a discard decision; discarded edits revert to the generated content.
- Success/error/info feedback is typed and shown through Sonner. Failed forms retain their values and show inline errors. Read/audit actions do not generate success toasts.

## Unsaved changes and confirmation

Use `useConfirm` for asynchronous action confirmation and `useGuardedNavigate` for programmatic navigation. Ordinary links are guarded centrally. Forms expose `data-dirty` and `aria-busy`; dialogs do not dismiss during saving. The browser controls the native unload prompt. Do not reintroduce `window.confirm`.

This remains the authorised UI prototype with dummy accounts and simulated integrations. UI components do not replace backend authorisation, tenant isolation, or production persistence.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run test:rbac` — all role destinations, API/tenant privacy, invitations, onboarding and session security.
- `npm run test:workspace` — account menus, keyboard search, settings deep links, unsaved changes, validation, checkbox submission, tables, AI review, dialogs and mobile navigation.

Browser tests use the existing localhost server (default port 3100), synthetic data, installed Edge and the bundled Playwright runtime. Set `HMS_PREVIEW_URL` for another local server. Run browser suites sequentially because they mutate shared fixtures. Captures are written under `artifacts/workspace-ui`.
