# Cada Quien for iOS

The native iPhone and iPad app (SwiftUI, iOS 17+). It talks to the same API as the web app, adds a home-screen widget and
Siri/Shortcuts actions for logging an expense, and receives native push notifications. The UI is Spanish; identifiers are English.

## Layout

| Path | What it is |
|---|---|
| `CadaQuienKit/` | A Swift package with everything that isn't UI: API client, bearer auth, models, one service per API resource, and the business rules ported from `packages/shared` (money, envelopes, subscriptions, forms). Plain Foundation, so `swift test` runs it in seconds with no simulator. |
| `CadaQuien/` | The app. `App/` (session, navigation, data store), `DesignSystem/` (tokens, components), `Features/` (one folder per screen group). |
| `CadaQuienWidget/` | The WidgetKit extension. |
| `Shared/` | Compiled into both the app and the widget: the App Intents, the shared Keychain client and the widget view. |
| `project.yml` | The [XcodeGen](https://github.com/yonaskolb/XcodeGen) spec. `CadaQuien.xcodeproj` is generated and not committed. |

## Build and run

```sh
brew install xcodegen
cd apps/ios
xcodegen generate
open CadaQuien.xcodeproj
```

Needs Xcode 26 and its iOS 26 simulator runtime (`xcodebuild -downloadPlatform iOS`, about 10 GB).

The simulator reaches the API on `http://localhost:3001` (start it with `pnpm dev`). For another server, set the build setting:

```sh
xcodebuild … API_BASE_URL=https://your-domain
```

### Running on a real device

Signing is not configured in the repo. In Xcode, pick your team for the `CadaQuien` and `CadaQuienWidget` targets. The two
targets share a Keychain access group and an App Group (`app.cadaquien.shared`, `group.app.cadaquien.shared`), which is how the
widget and Siri read the session token the app saved. The App ID needs the **Push Notifications** capability. Notifications
and the real-device Keychain sharing are the parts that cannot be exercised on the simulator on an Intel Mac.

## Sign-in

The API sends a session cookie to browsers. Native clients use the better-auth **bearer** plugin instead: sign-in answers with a
`set-auth-token` header, the app keeps the token in the Keychain and sends it as `Authorization: Bearer`. The API client never
stores cookies: with a cookie present the API demands an `Origin` header on every POST, which breaks sign-out.

Registration is invite-only, like the web. Password reset opens the web page from the emailed link.

## Tests

```sh
# Business rules, services and models (no simulator)
cd CadaQuienKit && swift test

# App and intents, in the simulator
xcodebuild test -project CadaQuien.xcodeproj -scheme CadaQuien \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' CODE_SIGN_IDENTITY=-
```

Two opt-in suites run against a real API, so a drift from `packages/shared` fails here and not in the app. Start the API on a
throwaway database with `ALLOWED_EMAILS=ios-contract@test.local` and, for the push part, any valid `APNS_*` set:

```sh
CADAQUIEN_CONTRACT_URL=http://localhost:3001 swift test --filter APIContractTests          # every service, end to end
TEST_RUNNER_CADAQUIEN_INTENT_TEST=1 xcodebuild test …                                       # Siri intent + widget buttons
```

The API rate-limits sign-ups to 5 per minute, so don't rerun the contract suite in a tight loop.

## Debug launch arguments

Debug builds only. They let a script open the app signed in on a given screen, to check it with `xcrun simctl io … screenshot`:

```sh
xcrun simctl launch <device> app.cadaquien.ios -cq-token <token> -cq-tab 2 -cq-route accounts
```

`-cq-tab 0..4` (Hoy, Movimientos, Dinero, Calendario, Grupos), `-cq-route settings|challenge|accounts|goals|subscriptions|widgets|…`,
`-cq-add` (open the add-expense sheet), `-cq-panic`. `-cq-route widgets` shows the widget at its real sizes.

## Calendar

The Calendario tab shows, month by month, when each credit card is due, when subscriptions charge and the income the person
registers (payroll or other payments, once or weekly, every 14 days, semimonthly or monthly). The server computes the events
(`GET /api/calendar?from&to`), so the web and the app always show the same days; the income itself lives at `/api/incomes`.
Income only reminds: it never creates a movement. On iOS 26 the tab bar shrinks to a small pill while scrolling down.

The server also sends a push before each event (Ajustes → Avisos del calendario, shown once notifications are on). Per kind you can turn
it off and pick how many days before and the hour. Defaults: income the same day at 19:00, card cutoff 2 days before, card payment
4 days before, monthly subscriptions 1 day before, yearly ones 7 days before (09:00 for all but income). Each event notifies once.

## Widget, Siri and Shortcuts

- **Widget** (small, medium, lock screen): shows what you can spend today and, in the medium size, logs a preset expense
  (☕ $50, 🍔 $120, 🚗 $40) in one tap. "Otro monto" opens `cadaquien://add`.
- **Siri / Shortcuts**: "Anota un gasto en Cada Quien" asks for the amount; "Anota un gasto de comida en Cada Quien" asks only for
  the amount. Like the web's voice capture, these record no account.

Both only work after signing in once in the app.

## Notifications

The server needs `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY` (and `APNS_BUNDLE_ID`); see `infra/env.example.md`. Without them
the app works and Ajustes shows the toggle, but nothing is delivered. Debug builds register against Apple's sandbox, TestFlight
and App Store builds against production; the server picks the host per device.

## Not verified yet

Be aware of what the automated checks do not cover: push delivery to a real iPhone (needs an Apple Developer account and a key),
the widget on a real home screen, Siri by voice, and App Store submission.
