# HMS connected UI MVP

**Access-control update:** The browser role picker and tab-local workspace store described in the original prototype notes have been replaced by credential login, server-managed sessions and role-filtered organisation data. Current credentials, access boundaries, production limitations and tests are documented in [RBAC test accounts](./RBAC-TEST-ACCOUNTS.md). Use that document as the current authentication reference; the historical UI/demo descriptions below are not a production-security claim.

This is an interactive synthetic-data application, not a production clinical service. Start at `/auth/sign-in` to verify a work email, create an organisation as its first hospital administrator, and manage departments and role-based invitations on People. See [Organisation onboarding](./ORGANISATION-ONBOARDING.md) for the complete flow. `/auth/workspace` remains available to explore the twelve demo roles and cross-department handoffs. The two seeded hospitals contain ten patients each; newly onboarded organisations start without sample clinical records. Records are stored per hospital in this tab's `sessionStorage` under `hms-demo-v1`.

## Run and verify

```powershell
cd C:\Users\DLL\Desktop\HMS\client
npm.cmd run dev -- -p 3100
npm.cmd run lint
npm.cmd exec -- tsc --noEmit
npm.cmd run build
npm.cmd run test:domain
npm.cmd run test:api
npm.cmd run test:ui
```

Browser checks use the Playwright installation bundled with this Codex environment and installed Microsoft Edge. On another workstation install Playwright in your test environment and change the import in `tests/ui-check.cjs`. Set `HMS_PREVIEW_URL` to test a different local server. Screenshots are generated under `.next/ui-review`.

### Verification record

- Production build, including TypeScript: passed after the final workflow and source-review changes.
- ESLint: passed, including the Node test runners.
- Connected domain tests: passed. Cover note immutability, stock/charge conservation, payment limits, claims resubmission, bed allocation, patient scope and AI review guards.
- Full browser journeys: passed across all twelve roles and all modules, including outpatient/inpatient handoffs, telemedicine fallback, released patient records, caregiver revocation, AI acceptance/retry/stale/cancellation, offline draft review, hospital switching and mobile navigation.
- Supplemental AI endpoint suite: the initial runs exposed test-context/scoping issues which were corrected. Its final rerun was declined at the execution permission prompt. Do not treat all sixteen endpoint cases as verified until `npm.cmd run test:api` completes successfully.

The browser/domain passes preceded the final source-inspection, medication-task and read/export-audit refinements. Those refinements passed the final production build and lint; a fresh complete runtime regression remains useful before a release.

## References and traceability

The source requirements, stories, APIs and data decisions are in `C:/Users/DLL/Desktop/mySchool/planning/hms/01-requirements.md`, `02-stories-and-flows.md`, `03-api-design.md` and `04-database-and-decisions.md`. The blue/teal foundations and original logo are in `C:/Users/DLL/Desktop/mySchool/design/hms/`. The following table traces **UI demonstrations**, not fulfillment of production backend or regulatory requirements.

| Task | Requirements / stories | Screens and synthetic data changes | Acceptance evidence | AI dependency |
|---|---|---|---|---|
| 1. Longitudinal EMR | FR-12–14; US-06–07 | `patients/:id`: identity, history, observations, medication, results, documents, appointments | Browser opens a chart; signed originals and amendments preserved in domain tests | Chart summary, questions |
| 2. Shared demo foundation | FR-01–03,34; US-01–02,20 | Versioned hospital datasets, role/module permissions, scenario controls, queue | Domain scope checks; browser reload, hospital switching and offline queue | Shared request/review contract |
| 3. Patient registry | FR-05–07; US-03,19 | Registration, duplicate rejection/reviewed merge, contacts, proxy access, documents | Browser registration and caregiver revocation; domain duplicate and patient-scope guards | Document extraction |
| 4. Scheduling/arrival | FR-08–11; US-04–05 | Day/week schedules, clinician/room choices, booking, reschedule, arrivals, cancellation, no-show | Domain conflicting booking; browser check-in and visit start | Operational context |
| 5. Triage | FR-12,22; US-06,22 | Validated observations with units, source and notes | Browser new observations; range validation in domain | Summary uses recorded observations |
| 6. Doctor encounter | FR-13–15; US-07–08 | Draft/save/sign/amend, diagnosis, referral/follow-up, requests, prescription | Browser signs and amends; domain immutable note checks | Ambient, dictation, completeness |
| 7. Pharmacy | FR-15–17,23–24; US-08–10 | Verify/clarify/cancel, batch issue, partial supply, stock and charge records | Browser partial/full issue; domain stock/charge conservation | Medication alert explanation |
| 8. Laboratory | FR-18–19; US-11–12 | Collect/reject/recollect/receive, draft/review/release/amend, critical acknowledgement | Browser release; domain rejected specimen and amended result checks | Result summary |
| 9. Imaging | FR-20; US-13 | Schedule/perform/report/review/release with synthetic study placeholder | Browser module smoke; same report transition guards | Report draft from supplied findings |
| 10. Admission/beds | FR-21; US-14 | Admission, occupancy, available/reserved/unavailable beds, transfer history | Browser admission/transfer; domain double-allocation guard | Context for handover/discharge |
| 11. Ward care | FR-17,22; US-10,14 | Tasks, observations, medication outcomes, intake/output and handover notes | Domain omissions require reasons and outcomes cannot be repeated | Handover draft |
| 12. Discharge | FR-21–22; US-14 | Summary, reconciliation, follow-up, pending results/balance, task disposition | Browser discharge releases bed; domain outstanding-task guard | Discharge draft |
| 13. Inventory | FR-23; US-09 | Receive/transfer/count, locations/batches/expiry, ledger, procurement drafts | Domain transfer conservation and counted-balance delta | Reorder draft |
| 14. Finance | FR-24–25; US-15 | Charges, part-payments, receipts, discount/refund request/approval, export/print | Browser part-payment; domain limits, allocation and refund checks | No AI needed for arithmetic |
| 15. HMO/claims | FR-26–27; US-16 | Authorisation, attachment checklist, preparation/export/submission, rejection/resubmission/remittance | Browser rejection; domain submission snapshots and partial/full settlement | Completeness and response drafts |
| 16. Telemedicine | FR-28–30; US-17–18 | Intake/consent/device preview/waiting/call/chat/disconnect/fallback/end, linked encounter | Browser entire simulated call lifecycle | Pre-visit and encounter drafts |
| 17. Patient/caregiver | FR-31; US-19 | Own bookings, released records, verified prescriptions, bills, messages, revocable proxy view | Browser released-result and revoked-caregiver checks | Released-information explanation |
| 18. Hospital admin | FR-02–04,36–38; US-02,22–23 | Staff configuration, departments, rooms, fees, beds, reminders, AI off-switch | Browser module smoke; changes consumed by booking and signing | Governance toggle |
| 19. Platform admin | FR-01,39,41; US-01,24 | Organisations, provisioning, plans, entitlements, support | Browser distinct platform workspace; clinical module access denied | Workload fixture only |
| 20. Smart clinic | FR-08–11,32; US-05,20 | Missed visits, reminder outbox, incoming device readings and duplicate/stale review | Domain duplicate reading guard; browser clinic route | Operational explanations |
| 21. Entry/auth | FR-02,04; US-01–02 | Landing imagery, sign-in/verification/recovery/invitation, invalid/expired/session-ended states | Existing preview flow retained; browser landing imagery check | None |

## Mock AI contract

`POST /api/demo/ai` accepts a request ID, task, organisation ID, demo role, patient/record IDs, context version, bounded synthetic context, input and scenario. It returns `demo: true`, structured editable sections, supporting record references with versions, missing information, request/context IDs, fixture version and generation time.

`lib/demo/ai.ts` defines sixteen tasks and a replaceable fetch client. The route validates tasks, roles, context structure and input lengths, bounds the request body to 128 KB, disables caching, and supports success (~1.2 s), slow (6 s), failure (503), timeout (504), insufficient context and a deliberately stale response. The fixture generator uses supplied records; unsupported chart questions produce an insufficient-information response.

Every response is a simulated draft. Users select sections, edit, reject, regenerate or apply once. The store rejects stale versions, repeated acceptance and signed-note replacement. Source records are inspectable. Signing, releasing results, issuing stock, confirming discharge and payer submission remain separate actions. The Python `hms-ai` starter and its real provider endpoint are never used by this UI.

## Data and workflow boundaries

- `lib/demo/types.ts`: typed related entities and module access.
- `lib/demo/seed.ts`: two isolated synthetic datasets.
- `lib/demo/commands.ts`: atomic cloned-state transitions, validation and activity events.
- `components/demo/provider.tsx`: shared store, persistence, hospital selection and reviewed offline queue.
- `components/demo/*`: dedicated clinical, operational, virtual-care and AI review screens.
- Deep links: `/dashboard/:role/:module/:recordId`. A wrong hospital ID produces an unavailable record, and an unauthorised module produces an access-unavailable screen.
- Only observations, encounter drafts and messages can be queued in the offline simulation. Reconnection does not automatically post them; users inspect the old/current version and explicitly apply or discard each draft.
- Screen controls can show loading, empty, error and unavailable states without deleting records.
- Arithmetic and allergy/duplicate examples are deterministic rules, separate from AI text generation.

## Production integration work remains separate

The UI demonstrates intended permissions; it is not authenticated tenant isolation. Authentication, email/SMS, payments, video, HMO submission, hardware feeds, document OCR and model inference are simulated. The module-entitlement and staff screens demonstrate configuration, not real identity provisioning. Patient proxy identity verification needs a backend.

Session storage is tab-local and not a database or cross-device synchronisation mechanism. Offline is a selectable workflow simulation. Clinical protocols, drug knowledge, scoring and thresholds need clinical governance before use with real data. FHIR, HL7, DICOM/PACS, DHIS2, national/payer integrations, real callbacks, durable audit logs, backups and retention require later implementation and validation. No claim of regulatory certification or production clinical readiness is made by this prototype.

## Research used

- OpenEMR: https://www.open-emr.org/wiki/index.php/OpenEMR_Features
- Bahmni: https://www.bahmni.org/feature-list
- Practo calendar: https://help.practo.com/practo-ray/calendar/calendar-overview/
- Doxy.me waiting room: https://helpcenter.doxy.me/en/articles/8272808-waiting-room
- SimplePractice portal: https://support.simplepractice.com/hc/en-us/articles/207925883-Setting-up-the-Client-Portal
- athenaOne ambient notes: https://www.athenahealth.com/solutions/athenaone/enhancements/ambient-notes
- Oracle chart review: https://docs.oracle.com/en/industries/health/clinical-ai-agent/ohaca/
- Helium FAQ: https://heliumhealth.com/faqs/ (undated answers need vendor confirmation)
- Intron: https://www.intron.io/health/ (performance figures are vendor claims)
- SmartHealth: https://smarthealth.interswitchgroup.com/hospitals
