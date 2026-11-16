type Env = (name: string) => string | undefined;

/**
 * Product analytics from the server: `track("note_created", user.id, { length: 42 })`.
 * Sends to PostHog and/or Plausible when configured; does nothing otherwise. Never throws: analytics must not
 * break a request. Send ids, not personal data, and respect your users' consent settings.
 */
export async function track(
  event: string,
  distinctId: string,
  props: Record<string, unknown> = {},
  env: Env = Deno.env.get.bind(Deno.env),
): Promise<void> {
  const jobs: Promise<Response>[] = [];
  const posthogKey = env("POSTHOG_KEY");
  if (posthogKey) {
    jobs.push(fetch(`${env("POSTHOG_HOST") ?? "https://us.i.posthog.com"}/capture/`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ api_key: posthogKey, event, distinct_id: distinctId, properties: props }),
    }));
  }
  const domain = env("PLAUSIBLE_DOMAIN");
  if (domain) {
    jobs.push(fetch(`${env("PLAUSIBLE_HOST") ?? "https://plausible.io"}/api/event`, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "server" },
      body: JSON.stringify({ name: event, domain, url: `https://${domain}/server`, props }),
    }));
  }
  await Promise.allSettled(jobs);
}
