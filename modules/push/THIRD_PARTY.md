# Third-party items in the push module

| Package                     | Licence | Used for                                                  |
| --------------------------- | ------- | --------------------------------------------------------- |
| jose                        | MIT     | Signing the Google service-account JWT for FCM HTTP v1    |
| @block65/webcrypto-web-push | MIT     | Web Push (VAPID, payload encryption) on the WebCrypto API |

Expo push is called through its public HTTP API with `fetch`. `web-push` (MPL-2.0) is deliberately not used.
