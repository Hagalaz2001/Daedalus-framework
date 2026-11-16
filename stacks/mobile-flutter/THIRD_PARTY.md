# Third-party code in the Flutter stack

Nothing is copied in as source; every item is a pub.dev dependency. All are MIT, BSD-3-Clause or Apache-2.0.
The core agent folds this list into the repository's `THIRD_PARTY_NOTICES.md`.

| Package | Pinned | Licence | Used for |
|---|---|---|---|
| forui (<https://github.com/forus-labs/forui>) | 0.27.7 | MIT | shadcn-style widgets: button, text field, card, avatar, badge, checkbox, switch, item, dialog, sheet, toast, scaffold, bottom navigation |
| forui_lucide (installed by forui) | 0.27.0 | MIT | Lucide icon font (`FLucideIcons`) |
| Inter font (bundled by forui) | n/a | SIL OFL 1.1 | default typeface |
| flutter_riverpod | ^3.5.0 | MIT | state |
| flutter_secure_storage | ^11.2.0 | BSD-3-Clause | token in Keychain / Keystore |
| shared_preferences | ^2.5.3 | BSD-3-Clause | theme choice and first-run flag |
| dio | ^5.9.0 | MIT | account actions (password reset, delete account) |

Forui is pinned to 0.27.7 because 0.28.0 needs Flutter 3.50 and this stack builds on Flutter 3.47. Raise the pin when
the toolchain moves.
