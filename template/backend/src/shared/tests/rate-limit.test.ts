import { assertEquals } from "@std/assert";
import { clientKey } from "../http/rate-limit.ts";

Deno.test("clientKey ignores X-Forwarded-For when no proxy is trusted", () => {
  assertEquals(clientKey("1.1.1.1", 0, "10.0.0.9"), "10.0.0.9");
  assertEquals(clientKey(undefined, 0, undefined), "local");
});

Deno.test("clientKey takes the entry the trusted proxy appended, not the client-supplied first one", () => {
  // The client sent "6.6.6.6"; our one proxy appended the address it saw (203.0.113.7).
  assertEquals(clientKey("6.6.6.6, 203.0.113.7", 1, "10.0.0.9"), "203.0.113.7");
  // Two trusted hops: the client is the second from the end.
  assertEquals(clientKey("6.6.6.6, 203.0.113.7, 10.1.1.1", 2, "10.0.0.9"), "203.0.113.7");
});

Deno.test("clientKey falls back to the socket when the header is shorter than the hop count", () => {
  assertEquals(clientKey("203.0.113.7", 2, "10.0.0.9"), "10.0.0.9");
  assertEquals(clientKey(undefined, 1, "10.0.0.9"), "10.0.0.9");
});
