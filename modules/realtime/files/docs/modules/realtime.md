# Realtime module

Status: thin. One-way server-sent events (SSE): simple, works through proxies, reconnects by itself.

- **Subscribe.** `GET /events` (signed in; `X-Organization-Id` optional). Web:
  `new EventSource(url, { withCredentials: true })`. React Native and Flutter: read the stream with an HTTP client that
  supports streaming and send the bearer token.
- **Publish.** `publish(organizationId, "note.created", { id })` from any service. The stream sends
  `event: note.created` and `data: {"id":"..."}`; a first `ready` event confirms the subscription and a `: ping` comment
  every 25 seconds keeps idle connections open.
- **Use it for** "something changed, refetch" signals (invalidate a query) rather than shipping whole records.

Limits: events are in-process, so with more than one backend instance a client only hears events published on its
instance (fan out with Postgres `LISTEN/NOTIFY` or a broker when you scale out), and events sent while a client is
offline are not replayed (refetch on reconnect). Need two-way low-latency traffic (chat, cursors)? Use WebSockets
(`hono/ws`) on top of the same `publish` idea.
