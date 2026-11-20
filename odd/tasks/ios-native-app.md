# Native iOS app (SwiftUI) with full web parity + expense widget
Objective: native SwiftUI app in `apps/ios` with full parity with the web app, plus a home-screen widget to add expenses.
Branch: feat/ios-app. Delivery strategy: ask-on-risk. Test runner: XCTest / Swift Testing for iOS, Vitest for api/shared.

## Specs
- S1: "quiero tener la version de ios de la app y quiero que sea nativo para ios" — SwiftUI app, no webview wrapper.
- S2: "quiero la paridad con la web" — every web screen has an iOS equivalent: auth (sign-in, sign-up, forgot/reset password), onboarding, Hoy, Movimientos, add/edit expense (incl. income/transfer), Dinero, accounts + envelopes + card statement, goals, subscriptions, groups + invitations + settlements, challenge, panic, settings (tweaks, reminder, theme, sign out, delete account).
- S3: "sumado la parte de widget para meter gastos" — home-screen widget to add expenses. Assumption: also App Intents for Siri/Shortcuts (original motivation, not yet confirmed).
- S4: "buscate una skill para meter como se debe la forma de ui de apple" — UI follows Apple HIG; use SwiftUI/HIG skills. Assumption: install pending user OK.
- S5 (assumption): the API is reused as is; Swift models are hand-written from `packages/shared/src/schemas`. Amounts are integer cents. UI copy in Spanish, identifiers in English.
- S6 (assumption): visual language follows DESIGN.md tokens (sage accent, never pure black/white, 44pt targets, light + dark).

## Tasks
- [x] T1 (S2,S3) API: native login path (better-auth bearer plugin, Keychain token) — route: inline — RED/GREEN observed, api suite 210/210 — commit: feat(api): accept bearer tokens for native clients — Risk: item 2 (auth)
- [ ] T2 (S1) Xcode project scaffold in apps/ios (app + widget extension + App Group) — inline — files written, xcodegen OK; xcodebuild blocked until the iOS 26.5 simulator runtime finishes downloading (10.6 GB) — commit: pending
- [x] T3 (S2,S5) Core: API client, Codable models, bearer auth, token store — inline — swift test 52/52 + real-API contract test over every service (auth, profile, accounts, envelopes, expenses, goals, subscriptions, challenges, dashboard, groups) — commits: de8b10f, 13802b3, be31928 — Risk: none (new package, no shared code)
- [ ] T4 (S4,S6) Design system: tokens, components (Btn, Card, Chip, Sheet, AmountInput, Money) — inline — -
- [ ] T5 (S2) Auth + onboarding — inline — -
- [ ] T6 (S2) Hoy, Movimientos, add/edit expense — inline — -
- [ ] T7 (S2) Dinero: accounts, envelopes, statement, goals, subscriptions — inline — -
- [ ] T8 (S2) Groups, challenge, panic, settings — inline — -
- [ ] T9 (S3) Widget + App Intents (quick expense) — inline — -
- [ ] T10 (S2) Native push (APNs): device token table, endpoint, sender — inline — -

## Log
- L1 (2026-11-20, user): "sabes que yo se que te dije que me iba a esperar pero se me hincharon los huevos, quiero tener la version de ios de la app y quiero que sea nativo para ios"
- L2 (2026-11-20, user): "buscate una skill para meter como se debe la forma de ui de apple"
- L3 (2026-11-20, user): "quiero la paridad con la web y sumado la parte de widget para meter gastos me la sopla lo que nos tardemos"
- Findings: web session is a better-auth cookie, no plugins, `trustedOrigins` only WEB_ORIGIN (apps/api/src/auth.ts:44). Push is web-push only; `push_subscription` cannot hold APNs tokens. Xcode 26.5, simulator runtime iOS 17.2 only. No OpenAPI spec.
- Open: auth approach, Geist vs SF, min iOS, push scope, password-reset deep link.
- 2026-11-20 T1 review: native review granted (risk+reliability lenses), approved and acknowledged; 2 advisory findings. R3-001 (revoked token after sign-out) now covered by commit 63563ad.
- 2026-11-20 Finding (real API, contract test): URLSession.shared stored better-auth's session cookie; with a cookie present the API demands `Origin` on every POST (403 "Missing or null Origin"), which broke sign-out and the next sign-in and left the token alive on the server. Fix: APIClient.defaultSession never stores/sends cookies (13802b3). Bearer-only sign-out returns 200 and revokes.
- 2026-11-20 Env: Xcode 26.5 only accepts iOS 26.5 simulator destinations; downloading the runtime with `xcodebuild -downloadPlatform iOS` (installed xcodegen via brew for the project file). Throwaway Postgres: docker container `ft-test-pg` on :54329 (db ft_test); remove when done.
- Decisions taken by default (user said "lo que sea"): bearer plugin, SF system font, min iOS 17, push last. swiftui-pro skill installed (user choice).
- 2026-11-20 Finding #2 (contract test): Swift's UUID encodes UPPERCASE and the API compares ids as text, so an expense with envelopeId was rejected ("Esa cajita es de otra cuenta"). Fix: ids are `EntityID` (always lowercase), covered by EntityIDTests + the contract test (be31928).
- 2026-11-20 Env: the first `xcodebuild -downloadPlatform iOS` died at 29.5% (3.12/10.6 GB) when its shell exited; relaunched as a tracked background task. T2 and every SwiftUI task (T4-T9) are blocked on that runtime for build/test; Kit work (T3) needs no simulator.
