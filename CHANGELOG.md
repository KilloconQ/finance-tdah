# Changelog

## [0.1.5](https://github.com/KilloconQ/finance-tdah/compare/v0.1.4...v0.1.5) (2026-11-25)


### Features

* always show the calendar notification options in settings ([5e30ed9](https://github.com/KilloconQ/finance-tdah/commit/5e30ed93883e50dfac3a4c4625632c7c82ed8564))
* **api:** accept bearer tokens for native clients ([5360748](https://github.com/KilloconQ/finance-tdah/commit/5360748b1fb6ae7fbb87dadf3d4ad762cf093bb0))
* **api:** branded transactional emails with a Cada Quien sender name ([#66](https://github.com/KilloconQ/finance-tdah/issues/66)) ([62b00ba](https://github.com/KilloconQ/finance-tdah/commit/62b00baf964b29fc56ce359a07589d2fa82459e2))
* **api:** calendar push notifications with per-kind options ([616b455](https://github.com/KilloconQ/finance-tdah/commit/616b4553f2f395a47573979cecb85793980acd65))
* **api:** native push for iPhone through APNs ([a42aa70](https://github.com/KilloconQ/finance-tdah/commit/a42aa70cafbca22410fb00b9bab665f3bea50ddb))
* **api:** open sign-up, per-platform onboarding, RevenueCat entitlement gate and admin stats ([7de2cf9](https://github.com/KilloconQ/finance-tdah/commit/7de2cf9516980ca94387cbc7488cb4172d40c134))
* **api:** payment calendar and scheduled income endpoints ([0ab0345](https://github.com/KilloconQ/finance-tdah/commit/0ab0345dfbeaa0bf14542c67b7d08ddebd662840))
* close accounts instead of deleting them ([333fcdf](https://github.com/KilloconQ/finance-tdah/commit/333fcdfb923657ae9506254fc927d1a29eb9fa14))
* **ios:** add app session model, auth and onboarding screens, expense form rules ([82cf5c9](https://github.com/KilloconQ/finance-tdah/commit/82cf5c9d5848cbf0a4c6d9d2b00dd74588e5ab14))
* **ios:** add CadaQuienKit with API client, bearer auth and models ([de8b10f](https://github.com/KilloconQ/finance-tdah/commit/de8b10fadc63d611bc9fe84f5e79e592787ad748))
* **ios:** add design system tokens, buttons, cards and resource loading ([d301106](https://github.com/KilloconQ/finance-tdah/commit/d30110606a79ac31dcb34369bfbc80b925f98c9e))
* **ios:** add groups screens and rules ([34feb01](https://github.com/KilloconQ/finance-tdah/commit/34feb01b6abc12fe2a2cd8c1652cd488d05e1d64))
* **ios:** add native push registration, notification settings and tap-to-open links ([a38daae](https://github.com/KilloconQ/finance-tdah/commit/a38daae98c3d959e9780a6b7360a15a89acc6010))
* **ios:** add push device registration service and reminder hour labels ([29fcc69](https://github.com/KilloconQ/finance-tdah/commit/29fcc69d4fe541a9f98e90808bd97a41d220c466))
* **ios:** add quick-add widget, Siri and Shortcuts intents, and deep links ([78ab645](https://github.com/KilloconQ/finance-tdah/commit/78ab645fd652998f5890526cb70fba0ab6af49be))
* **ios:** add resource services and lowercase EntityID ([be31928](https://github.com/KilloconQ/finance-tdah/commit/be319289455aa2ad6a4ac58e92dade1db575e74f))
* **ios:** add tabs, home, movements, expense form, money hub, accounts, envelopes, goals, subscriptions, settings, panic and challenge ([5cba4c0](https://github.com/KilloconQ/finance-tdah/commit/5cba4c0905852b42d4b6e91b00b52bcbb0edee04))
* **ios:** calendar notification options in settings ([426ea77](https://github.com/KilloconQ/finance-tdah/commit/426ea77aea7167f3902cec030bb83190c82915e6))
* **ios:** local network usage description for device builds ([f479e4a](https://github.com/KilloconQ/finance-tdah/commit/f479e4acbad5d0763c18348d21b53b84f06fb852))
* **ios:** payment calendar tab with income management ([1339c19](https://github.com/KilloconQ/finance-tdah/commit/1339c19b99f4285fc8d5dae5215968701a9e1e4f))
* **ios:** port envelope, net worth and split rules ([831cde5](https://github.com/KilloconQ/finance-tdah/commit/831cde5629a052865148cb414896b30f21064cf9))
* **ios:** port money, subscription and jar domain logic with Spanish API errors ([c0f6e2c](https://github.com/KilloconQ/finance-tdah/commit/c0f6e2c2c0ab08178ad4ed61c4eb86be7caa9a95))
* **ios:** RevenueCat paywall, platform header and billing status ([f412c1f](https://github.com/KilloconQ/finance-tdah/commit/f412c1f5b4888635343530b7ac5295ed20ff8460))
* **ios:** scaffold app, widget extension and test target ([d9adaa8](https://github.com/KilloconQ/finance-tdah/commit/d9adaa86347392251fb066efbf86df75e5c336e5))
* **ios:** shrink the tab bar while scrolling on iOS 26 ([f38d6b2](https://github.com/KilloconQ/finance-tdah/commit/f38d6b22128d84b383480899da1e80eb9fae5097))
* **ios:** thousands separators while typing an amount ([99912ea](https://github.com/KilloconQ/finance-tdah/commit/99912eabdb5d5417b9b4d033b88b660e4d9a0a4d))
* open sign-up, RevenueCat billing, iOS paywall and close accounts ([7f8db07](https://github.com/KilloconQ/finance-tdah/commit/7f8db07e8f59821009165614d8c43e83d0f55b7a))
* **web:** calendar notification options in settings ([06ea1ed](https://github.com/KilloconQ/finance-tdah/commit/06ea1ed6fe7f2cb7b98bf29176a2bf730d00535f))
* **web:** payment calendar page and income management ([cd91db5](https://github.com/KilloconQ/finance-tdah/commit/cd91db53100793fe91a47965b9f9584a81f036ca))
* **web:** RevenueCat paywall, onboarding per platform guard and admin stats page ([1516790](https://github.com/KilloconQ/finance-tdah/commit/1516790949e27dce84d1607f71fb7cc2560b4986))


### Bug Fixes

* **api:** count only enabled channels when picking who gets the daily reminder ([df78256](https://github.com/KilloconQ/finance-tdah/commit/df78256c779cb9e85636f573adb110203176dfca))
* **ios:** don't surface cancelled requests, wrap chips naturally, compose money phrases as one Text ([6f57cd2](https://github.com/KilloconQ/finance-tdah/commit/6f57cd25ed4b462c394dfebe0bcb14b533238a48))
* **ios:** draw the goal jar with a lid and level marks ([4c88c4f](https://github.com/KilloconQ/finance-tdah/commit/4c88c4fd8a40b3026411ad0e3377f67333bddc62))
* **ios:** give an empty account selection its own row so the picker never has an untagged value ([1b4f2a0](https://github.com/KilloconQ/finance-tdah/commit/1b4f2a0a94286d199ed40753169da4f4543f8033))
* **ios:** inline title on the widget gallery ([ac6b3f0](https://github.com/KilloconQ/finance-tdah/commit/ac6b3f0febf9b565a9cb6ea1be55a486001893fa))
* **ios:** unique ids for calendar grid headers and blanks ([eba26a6](https://github.com/KilloconQ/finance-tdah/commit/eba26a62e830730a9fbc61287b6c2917c940f552))
* **ios:** use a bearer-only session and add API contract test ([13802b3](https://github.com/KilloconQ/finance-tdah/commit/13802b3d20c4b50896b379f052d7b2e31fd1189a))
* **web:** load paywall offerings through react-query ([de1986f](https://github.com/KilloconQ/finance-tdah/commit/de1986fda0fedd901a3f4d11f8a7cc46871c037e))

## [0.1.4](https://github.com/KilloconQ/finance-tdah/compare/v0.1.3...v0.1.4) (2026-11-17)


### Features

* **api:** make sign-up invite-only ([b4562b8](https://github.com/KilloconQ/finance-tdah/commit/b4562b80f68990df5e62fb89bd1138b8b30259b1))
* credit card statement days and subscription charge alerts ([#64](https://github.com/KilloconQ/finance-tdah/issues/64)) ([87cd165](https://github.com/KilloconQ/finance-tdah/commit/87cd16544fc9eb43a6b46e6eb387b7baa3902d86))

## [0.1.3](https://github.com/KilloconQ/finance-tdah/compare/v0.1.2...v0.1.3) (2026-11-03)


### Bug Fixes

* **web:** keep the bottom sheet above the keyboard on iOS ([38303f9](https://github.com/KilloconQ/finance-tdah/commit/38303f9245b82770c471aafd9e98ed85704278d9))
* **web:** keep the bottom sheet above the keyboard on iOS ([b806df0](https://github.com/KilloconQ/finance-tdah/commit/b806df03a6517347f17ea3c448a665cf71f3fcd7))

## [0.1.2](https://github.com/KilloconQ/finance-tdah/compare/v0.1.1...v0.1.2) (2026-11-02)


### Features

* invitaciones a grupos con aceptación e invitaciones para registrarse ([5bc7afa](https://github.com/KilloconQ/finance-tdah/commit/5bc7afa2631475b760e82bb10959210c0445ac85))
* require accepting group invitations and let users invite people to sign up ([ede0e3e](https://github.com/KilloconQ/finance-tdah/commit/ede0e3eddde42e1491ecd922db1ec80eda6219c9))
* **web:** add thousands commas to money inputs as you type ([56996f2](https://github.com/KilloconQ/finance-tdah/commit/56996f254785fc5f1f6b767befaafea1185be37e))
* **web:** add-movement bottom sheet on mobile ([c698f3b](https://github.com/KilloconQ/finance-tdah/commit/c698f3bbdd5faf4ee3e81a4c06f6436a5def128c))
* **web:** open the add-movement form as a bottom sheet on mobile ([2b81e3d](https://github.com/KilloconQ/finance-tdah/commit/2b81e3d98c0940125114b0d97346cf930ec491bd))

## [0.1.1](https://github.com/KilloconQ/finance-tdah/compare/v0.1.0...v0.1.1) (2026-10-26)


### Features

* **web:** add Dinero hub and slim the mobile tab bar to four tabs ([c3c8923](https://github.com/KilloconQ/finance-tdah/commit/c3c8923e268e1cf0903d8922a46cce1325145355))
* **web:** Dinero hub and a four-tab mobile bar ([a9dc70b](https://github.com/KilloconQ/finance-tdah/commit/a9dc70bb0cf91357c49618c93cb4866f24f94ab4))
* **web:** keep one docked action on Hoy and show the challenge as a card ([290f34f](https://github.com/KilloconQ/finance-tdah/commit/290f34f8abcffcf200bdf1e176693c0ec896b047))


### Bug Fixes

* **web:** handle load errors and narrow screens on Dinero and Hoy ([25cfac2](https://github.com/KilloconQ/finance-tdah/commit/25cfac236cb0cbe101484740fa05db71ab85f275))
* **web:** shrink the jar card on Hoy ([256c9e8](https://github.com/KilloconQ/finance-tdah/commit/256c9e860bdf08d60e337350d96823617c499757))
* **web:** shrink the jar card on Hoy ([f47d71a](https://github.com/KilloconQ/finance-tdah/commit/f47d71af1ba7662f392e8da554154c0ad856140a))

## 0.1.0 (2026-10-24)


### Features

* shared expense groups with balances and settle up ([510a6d5](https://github.com/KilloconQ/finance-tdah/commit/510a6d518d6f790ec68c3629873301b020af54a4))
* **web:** drop Subs. from the mobile tab bar ([599853e](https://github.com/KilloconQ/finance-tdah/commit/599853eb94ac4b36d6a0471263921d41c5b1d9f5))


### Bug Fixes

* **api:** cap cents at int32, 400 on malformed JSON, 409 on duplicate account name ([373d555](https://github.com/KilloconQ/finance-tdah/commit/373d55512c72fb0cc7505c9a97ef400d95c99a08))
* delete the auth user when deleting the account ([a8b0e68](https://github.com/KilloconQ/finance-tdah/commit/a8b0e68b68d786db97c07b9dc07405568411c08b))
* **groups:** cap amounts and group totals to int32 ([1f15bd6](https://github.com/KilloconQ/finance-tdah/commit/1f15bd6459fa2ed2bc7302bc7a41577d2cef0e63))
* **groups:** cap cents fields and reject group totals above int32 ([828cae1](https://github.com/KilloconQ/finance-tdah/commit/828cae151beb44c9f2d53f634ad653ed55cba5e1))
* **groups:** confirm destructive actions, add leave group, harden members and settlements ([74b901b](https://github.com/KilloconQ/finance-tdah/commit/74b901b4829334759ae5a9b6bd414df7aa1745b4))
* **groups:** safety fixes from QA ([a27c536](https://github.com/KilloconQ/finance-tdah/commit/a27c536e1f5c73ca251ad2ca5709a7f2d4d356ab))
* **money:** parse comma/dot decimals, reject &gt;2 decimals and scientific notation ([5162a1f](https://github.com/KilloconQ/finance-tdah/commit/5162a1f8ef7f020c7081c68465850aec4f9e4c16))
* start release-please at 0.1.0 and ignore history before adoption ([0190659](https://github.com/KilloconQ/finance-tdah/commit/0190659d9cceb7d09893558a606bd38738a714d4))
* start release-please at 0.1.0 and ignore history before adoption ([17f7927](https://github.com/KilloconQ/finance-tdah/commit/17f7927bb25b55dcf46606281e91b9d4b5c1f97d))
* trim names, bound dates, confirm budget save and enlarge tap targets ([6b4e972](https://github.com/KilloconQ/finance-tdah/commit/6b4e972a26443db1836a1d8227158ea3e9c48102))
* **web:** copy nits, day pluralization and larger tap targets ([fae0a92](https://github.com/KilloconQ/finance-tdah/commit/fae0a923d774b96ae935b943acb312d852d62f99))
* **web:** date-only values shown one day early in timezones behind UTC ([60cbadb](https://github.com/KilloconQ/finance-tdah/commit/60cbadb3c3cfe7111153ee0bd18f10470c54d38a))
* **web:** feedback when offline or when a request times out ([86d3cf8](https://github.com/KilloconQ/finance-tdah/commit/86d3cf897be67c872fb3a7190648cc29aaa849ff))
* **web:** friendly errors, Spanish validation, not-found screens, copy nits ([1d74c53](https://github.com/KilloconQ/finance-tdah/commit/1d74c5309b4d8229c19ca49e8a425364d6f0cf49))
* **web:** show offline banner, waiting label and calm timeout message ([d6719b5](https://github.com/KilloconQ/finance-tdah/commit/d6719b5b096890e44edad3fc797fadc563d6ae4c))
* **web:** unify copy vocabulary and replace anglicisms ([4f11415](https://github.com/KilloconQ/finance-tdah/commit/4f114151c75af522cb9267d0bd4408206d542729))
* **web:** unify copy vocabulary and replace anglicisms ([04788d5](https://github.com/KilloconQ/finance-tdah/commit/04788d5b9ca1acacf7416cd9e3437fb7d9748599))


### Performance Improvements

* **web:** self-host Geist fonts and add inline splash ([6586d12](https://github.com/KilloconQ/finance-tdah/commit/6586d12f15193696128530bf848446f3c5ca73cc))
* **web:** self-host Geist fonts and add inline splash ([b49e602](https://github.com/KilloconQ/finance-tdah/commit/b49e602654fd48babc4c2fbb135a66e389989582))
