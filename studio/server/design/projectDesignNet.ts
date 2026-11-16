// The one downloader Design Studio uses (Stitch results and user-triggered asset embedding). https
// only, a host allow-list checked on every redirect hop (redirects are followed by hand, at most 3),
// each host resolved and vetted against private addresses and the connection pinned to the vetted
// address (rebinding cannot reach a local service), and the body is cut off as soon as it exceeds the cap.
import { request } from "node:https";
import { type Resolver, systemResolver, vetHost } from "./netGuard.ts";

export interface Fetched {
  bytes: Uint8Array;
  type: string;
}

export interface Hop {
  status: number;
  headers: Record<string, string | undefined>;
  body: AsyncIterable<Uint8Array>;
  abort(): void;
}

/** One request to one pinned address. Replaced in tests. */
export type Transport = (url: URL, lookup: Awaited<ReturnType<typeof vetHost>>) => Promise<Hop>;

const realTransport: Transport = (url, lookup) =>
  new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET",
      agent: false,
      timeout: 60_000,
      lookup,
      headers: { "user-agent": "dev-blueprint-studio/1", accept: "*/*" },
    }, (res) => {
      const headers: Record<string, string | undefined> = {};
      for (const [k, v] of Object.entries(res.headers)) headers[k] = Array.isArray(v) ? v[0] : v;
      resolve({ status: res.statusCode ?? 0, headers, body: res, abort: () => res.destroy() });
    });
    req.on("timeout", () => req.destroy(new Error("The download timed out.")));
    req.on("error", reject);
    req.end();
  });

export interface DownloadOptions {
  maxBytes: number;
  /** Hostname allow-list, applied to the first URL and to every redirect target. */
  hostAllowed: (hostname: string) => boolean;
  /** Overall time limit for the whole download, default 120 s. */
  deadlineMs?: number;
  transport?: Transport;
  resolver?: Resolver;
}

const DEFAULT_DEADLINE_MS = 120_000;

/** The whole download (every hop, the DNS vetting and the body) must finish within `deadlineMs`; the per-request idle timeout alone lets a slow trickle run forever. */
export async function guardedDownload(startUrl: string, options: DownloadOptions): Promise<Fetched> {
  let current: Hop | null = null;
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      current?.abort();
      reject(new Error("The download took too long."));
    }, options.deadlineMs ?? DEFAULT_DEADLINE_MS);
  });
  deadline.catch(() => undefined);
  try {
    return await Promise.race([download(startUrl, options, (hop) => (current = hop)), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function download(startUrl: string, options: DownloadOptions, track: (hop: Hop) => void): Promise<Fetched> {
  const transport = options.transport ?? realTransport;
  const resolver = options.resolver ?? systemResolver;
  let url = new URL(startUrl);
  for (let hop = 0; hop <= 3; hop++) {
    if (url.protocol !== "https:") throw new Error("Only https downloads are allowed.");
    if (url.username || url.password) throw new Error("Download URLs with credentials are refused.");
    if (!options.hostAllowed(url.hostname.toLowerCase())) throw new Error(`Downloads from ${url.hostname} are not allowed.`);
    const lookup = await vetHost(url.hostname, resolver);
    const res = await transport(url, lookup);
    track(res);
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      res.abort();
      url = new URL(res.headers.location, url);
      continue;
    }
    if (res.status < 200 || res.status >= 300) {
      res.abort();
      throw new Error(`Download failed (${res.status}).`);
    }
    const declared = Number(res.headers["content-length"]);
    if (Number.isFinite(declared) && declared > options.maxBytes) {
      res.abort();
      throw new Error("Download is too large.");
    }
    const parts: Uint8Array[] = [];
    let total = 0;
    for await (const chunk of res.body) {
      total += chunk.length;
      if (total > options.maxBytes) {
        res.abort();
        throw new Error("Download is too large.");
      }
      parts.push(chunk);
    }
    const bytes = new Uint8Array(total);
    let at = 0;
    for (const part of parts) {
      bytes.set(part, at);
      at += part.length;
    }
    return { bytes, type: res.headers["content-type"] ?? "" };
  }
  throw new Error("Too many redirects.");
}

/** Hosts Stitch results (HTML, screenshots) are served from. */
export const stitchHostAllowed = (host: string): boolean =>
  [/(^|\.)googleusercontent\.com$/, /(^|\.)googleapis\.com$/, /(^|\.)gstatic\.com$/, /(^|\.)google\.com$/].some((re) => re.test(host));
