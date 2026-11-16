// The one place that starts child processes: Daedalus (generator, verify scripts) and every generated project use it.
//  - `shell(cmd)`    runs a command line through cmd.exe / sh. Only for fixed strings from stack.json, module.json or tasks.
//  - `runArgs(cmd, args)` starts a program with an argument list and NO shell: use it for anything built from user input.
export interface RunOpts {
  cwd?: string;
  /** Capture stdout and stderr instead of streaming them to the terminal. */
  capture?: boolean;
  /** Extra environment variables. */
  env?: Record<string, string>;
}
export interface RunResult {
  ok: boolean;
  code: number;
  stdout: string;
  stderr: string;
}

const dec = new TextDecoder();

/** Last `lines` lines of some output, trimmed. */
export const tailOf = (text: string | Uint8Array, lines = 30): string =>
  (typeof text === "string" ? text : dec.decode(text)).trimEnd().split("\n").slice(-lines).join("\n").trim();

function finish(r: Deno.CommandOutput, capture: boolean): RunResult {
  return {
    ok: r.success,
    code: r.code,
    stdout: capture ? dec.decode(r.stdout) : "",
    stderr: capture ? dec.decode(r.stderr) : "",
  };
}

/** Starts `cmd` with `args` directly (no shell, so quotes and metacharacters in args are plain text). */
export function runArgs(cmd: string, args: string[], o: RunOpts = {}): RunResult {
  const io = o.capture ? "piped" : "inherit";
  return finish(
    new Deno.Command(cmd, { args, cwd: o.cwd, env: o.env, stdout: io, stderr: io }).outputSync(),
    !!o.capture,
  );
}

/** Runs a command line through the platform shell. Never put user input in `cmd`; use `runArgs` for that. */
export function shell(cmd: string, o: RunOpts = {}): RunResult {
  const win = Deno.build.os === "windows";
  return runArgs(win ? "cmd" : "sh", win ? ["/c", cmd] : ["-c", cmd], o);
}

/** Input that ends up as a git remote URL: no whitespace, control characters or leading dash. */
// deno-lint-ignore no-control-regex
export const isGitRemote = (s: string) => /^[A-Za-z0-9][^\s\x00-\x1f"'`$&|;<>\\^%!]*$/.test(s) && !s.startsWith("-");
