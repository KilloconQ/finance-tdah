# Changelog

## [0.1.2](https://github.com/KilloconQ/finance-tdah/compare/v0.1.1...v0.1.2) (2026-10-26)


### Features

* invitaciones a grupos con aceptación e invitaciones para registrarse ([5bc7afa](https://github.com/KilloconQ/finance-tdah/commit/5bc7afa2631475b760e82bb10959210c0445ac85))
* require accepting group invitations and let users invite people to sign up ([ede0e3e](https://github.com/KilloconQ/finance-tdah/commit/ede0e3eddde42e1491ecd922db1ec80eda6219c9))

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
