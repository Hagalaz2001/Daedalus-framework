import { buildPushPayload } from "@block65/webcrypto-web-push";
import { importPKCS8, SignJWT } from "jose";

export interface Notice {
  title: string;
  body?: string;
  /** Small JSON for deep links, e.g. { noteId }. */
  data?: Record<string, unknown>;
}

/** Result of one delivery: `gone` means the token is dead and should be deleted. */
export type Outcome = "sent" | "gone";

export async function sendExpo(token: string, n: Notice): Promise<Outcome> {
  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ to: token, title: n.title, body: n.body, data: n.data }),
  });
  if (!res.ok) throw new Error(`Expo push answered ${res.status}`);
  const { data } = await res.json() as { data?: { status: string; details?: { error?: string } } };
  if (data?.details?.error === "DeviceNotRegistered") return "gone";
  if (data?.status === "error") throw new Error(`Expo push error: ${data.details?.error}`);
  return "sent";
}

/** FCM HTTP v1 with a service account: one short-lived OAuth token per call keeps this dependency-light. */
export async function sendFcm(
  token: string,
  n: Notice,
  serviceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT_JSON"),
): Promise<Outcome> {
  if (!serviceAccountJson) throw new Error("FCM_SERVICE_ACCOUNT_JSON is not set");
  const account = JSON.parse(serviceAccountJson) as { client_email: string; private_key: string; project_id: string };
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/firebase.messaging" })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(account.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 300)
    .sign(await importPKCS8(account.private_key, "RS256"));
  const auth = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  });
  if (!auth.ok) throw new Error(`Google OAuth answered ${auth.status}`);
  const { access_token } = await auth.json() as { access_token: string };
  const data = Object.fromEntries(Object.entries(n.data ?? {}).map(([k, v]) => [k, String(v)])); // FCM data values are strings
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: "POST",
    headers: { authorization: `Bearer ${access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ message: { token, notification: { title: n.title, body: n.body }, data } }),
  });
  if (res.status === 404) return "gone";
  if (!res.ok) throw new Error(`FCM answered ${res.status}`);
  return "sent";
}

export async function sendWeb(subscriptionJson: string, n: Notice): Promise<Outcome> {
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT");
  if (!publicKey || !privateKey || !subject) {
    throw new Error("VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT are required");
  }
  const request = await buildPushPayload(
    { data: JSON.stringify(n), options: { ttl: 3600 } },
    JSON.parse(subscriptionJson),
    { subject, publicKey, privateKey },
  );
  const res = await fetch(JSON.parse(subscriptionJson).endpoint, request);
  if (res.status === 404 || res.status === 410) return "gone";
  if (!res.ok) throw new Error(`Push service answered ${res.status}`);
  return "sent";
}
