// Outbound-request guard: resolve a host, refuse private addresses, and pin the connection to the vetted
// address so a DNS answer that changes between check and connect (rebinding) cannot reach a local service.
import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { isIP } from "node:net";

export type Resolver = (host: string) => Promise<LookupAddress[]>;
type PinnedLookup = (
  host: string,
  options: { all?: boolean },
  callback: (error: Error | null, address: string | LookupAddress[], family?: number) => void,
) => void;

export const systemResolver: Resolver = (host) =>
  new Promise((resolve, reject) =>
    dnsLookup(host, { all: true, verbatim: true }, (error, addresses) => (error ? reject(error) : resolve(addresses)))
  );

export function isPrivateAddress(address: string): boolean {
  const ip = address.replace(/^\[|\]$/g, "").toLowerCase().split("%")[0] ?? "";
  if (isIP(ip) === 4) {
    const [a = 0, b = 0, c = 0] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a === 192 && b === 0 && (c === 0 || c === 2)) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113);
  }
  if (isIP(ip) !== 6) return true; // unparseable: never treat as public
  const groups = expandV6(ip);
  if (groups.slice(0, 5).every((g) => g === 0) && (groups[5] === 0xffff || groups[5] === 0)) {
    // ::ffff:a.b.c.d and the deprecated ::a.b.c.d carry an IPv4 address; judge that. ::1 and :: land on 0.0.0.x / 0.0.0.0.
    const [hi = 0, lo = 0] = [groups[6], groups[7]];
    return isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  }
  const first = groups[0] ?? 0;
  const v4 = (hi = 0, lo = 0) => isPrivateAddress(`${hi >> 8}.${hi & 255}.${lo >> 8}.${lo & 255}`);
  // NAT64 64:ff9b::/96 and 6to4 2002::/16 embed an IPv4 address: judge that. 64:ff9b:1::/48 is local-use.
  if (first === 0x64 && groups[1] === 0xff9b) return groups.slice(2, 6).every((g) => g === 0) ? v4(groups[6], groups[7]) : true;
  if (first === 0x2002) return v4(groups[1], groups[2]);
  return (first & 0xffc0) === 0xfec0 || (first & 0xfe00) === 0xfc00 || (first & 0xffc0) === 0xfe80 || (first & 0xff00) === 0xff00;
}

function expandV6(ip: string): number[] {
  let text = ip;
  const tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(text)?.[1];
  if (tail) {
    const [a = 0, b = 0, c = 0, d = 0] = tail.split(".").map(Number);
    text = `${text.slice(0, -tail.length)}${((a << 8) | b).toString(16)}:${((c << 8) | d).toString(16)}`;
  }
  const [head = "", rest] = text.split("::");
  const left = head ? head.split(":") : [];
  const right = rest === undefined ? [] : rest ? rest.split(":") : [];
  const fill = rest === undefined ? 0 : 8 - left.length - right.length;
  return [...left, ...Array.from({ length: fill }, () => "0"), ...right].map((g) => Number.parseInt(g, 16));
}

/** Resolves `host`, refuses when ANY address is non-public and returns a lookup that only ever answers with the vetted address. */
export async function vetHost(host: string, resolver: Resolver): Promise<PinnedLookup> {
  const bare = host.replace(/^\[|\]$/g, "");
  const addresses = isIP(bare) ? [{ address: bare, family: isIP(bare) }] : await resolver(bare);
  if (addresses.length === 0) throw new Error("the name does not resolve");
  if (addresses.some((entry) => isPrivateAddress(entry.address))) throw new Error("resolves to a local or private address");
  const chosen = addresses[0]!;
  return (
    _host,
    options,
    callback,
  ) => (options.all ? callback(null, [{ address: chosen.address, family: chosen.family }]) : callback(null, chosen.address, chosen.family));
}
