# Push notifications module

Status: thin. A token registry and delivery to Expo, FCM and web push; no scheduling, topics or delivery receipts.

- **Register a device.** After sign-in the app calls `PUT /push/tokens { platform, token }`; on sign-out
  `DELETE /push/tokens/{id}`.
  - React Native (Expo): `Notifications.getExpoPushTokenAsync()` -> `platform: "expo"`.
  - Flutter: `FirebaseMessaging.instance.getToken()` -> `platform: "fcm"`.
  - Web: `registration.pushManager.subscribe(...)` -> `platform: "web"`, `token` = `JSON.stringify(subscription)`.
- **Send.** `await sendPush(db, userId, { title, body, data })`; dead tokens (uninstalled apps) are removed
  automatically. Send from a job for anything slow or batched (jobs module).
- **Keys.** Expo needs none for basic use. FCM needs `FCM_SERVICE_ACCOUNT_JSON` (Firebase console -> service accounts).
  Web push needs a VAPID key pair (generate once, keep the private key secret) and `VAPID_SUBJECT`.

The in-app `notifications` table is part of the base schema; write a row there for the in-app inbox and call `sendPush`
for the same event. iOS and Android prompts for permission are the app's job; ask at a moment that explains the value.
