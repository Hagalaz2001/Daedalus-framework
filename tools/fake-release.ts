// A local stand-in for GitHub Releases, for tests and for trying the installers offline:
//   deno run -A tools/fake-release.ts <dist folder> [port]     then DAEDALUS_RELEASES=http://127.0.0.1:<port>
// Serves  /download/v<ver>/<file>  and  /latest/download/<file>  from the folder (any version; read-only).
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";

/** Starts the server on 127.0.0.1 (port 0 = random). `.base` is the URL to use as DAEDALUS_RELEASES. */
export function serveRelease(dir: string, port = 0): { base: string; hits: string[]; shutdown: () => Promise<void> } {
  const hits: string[] = [];
  const server = Deno.serve({ hostname: "127.0.0.1", port, onListen() {} }, (req) => {
    const path = new URL(req.url).pathname;
    hits.push(path);
    const m = /^\/(?:download\/v\d+\.\d+\.\d+|latest\/download)\/([^/]+)$/.exec(path);
    const file = m ? join(dir, basename(m[1])) : "";
    if (!m || !existsSync(file) || !statSync(file).isFile()) return new Response("not found", { status: 404 });
    return new Response(Deno.readFileSync(file));
  });
  return { base: `http://127.0.0.1:${server.addr.port}`, hits, shutdown: () => server.shutdown() };
}

if (import.meta.main) {
  const [dir, port] = Deno.args;
  if (!dir) {
    console.error("Usage: deno run -A tools/fake-release.ts <dist folder> [port]");
    Deno.exit(2);
  }
  console.log(serveRelease(dir, Number(port) || 0).base);
}
