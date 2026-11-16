// Builds and tests the systems samples with whatever toolchain this machine has, and says what it skipped.
//   deno task systems [c] [cpp] [asm] [rust] [--firmware]      (no argument = everything)
// Exit code 1 only when a step that could run failed. Skipped steps are listed with the missing tool.
import { join } from "node:path";

const here = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
type Result = { step: string; status: "pass" | "fail" | "skip" | "built"; note?: string };

async function run(cmd: string[], cwd = ".", env: Record<string, string> = {}): Promise<{ ok: boolean; out: string }> {
  try {
    const r = await new Deno.Command(cmd[0], { args: cmd.slice(1), cwd, env, stdout: "piped", stderr: "piped" })
      .output();
    const dec = new TextDecoder();
    return { ok: r.success, out: dec.decode(r.stdout) + dec.decode(r.stderr) };
  } catch (e) {
    return { ok: false, out: String(e) };
  }
}
export const has = async (cmd: string[]) => (await run([...cmd, "--version"])).ok;

/** C compiler candidates in preference order; CC wins when set. */
export function ccCandidates(envCc?: string): string[][] {
  const fromEnv = envCc ? [envCc.trim().split(/\s+/)] : [];
  return [...fromEnv, ["cc"], ["gcc"], ["clang"], ["zig", "cc"], ["python-zig", "cc"]];
}
export async function findCc(): Promise<string[] | null> {
  for (const c of ccCandidates(Deno.env.get("CC"))) if (await has(c)) return c;
  return null;
}

/** NASM output format for the host OS. */
export const nasmFormat = (os: string) => os === "windows" ? "win64" : os === "darwin" ? "macho64" : "elf64";

const tmp = () => Deno.makeTempDirSync({ prefix: "systems-" });

async function cmake(dir: string): Promise<Result[]> {
  const name = dir === "c" ? "C (CMake + Unity)" : "C++ (CMake + doctest)";
  if (!(await has(["cmake"]))) return [{ step: name, status: "skip", note: "cmake not installed" }];
  const src = join(here, dir);
  const build = join(tmp(), dir);
  const extra = (Deno.env.get("CMAKE_ARGS") ?? "").split(/\s+/).filter(Boolean);
  for (
    const cmd of [["cmake", "-S", src, "-B", build, ...extra], ["cmake", "--build", build], [
      "ctest",
      "--test-dir",
      build,
      "--output-on-failure",
    ]]
  ) {
    const r = await run(cmd);
    if (!r.ok) return [{ step: name, status: "fail", note: r.out.split("\n").slice(-12).join("\n") }];
  }
  return [{ step: name, status: "pass" }];
}

async function asm(): Promise<Result[]> {
  const cc = await findCc();
  if (!cc) return [{ step: "assembly", status: "skip", note: "no C compiler (gcc, clang, zig cc)" }];
  const dir = tmp();
  const harness = join(here, "asm/test/test_sum.c");
  const out: Result[] = [];

  if (Deno.build.arch === "x86_64") {
    if (!(await has(["nasm"]))) out.push({ step: "x86-64 NASM", status: "skip", note: "nasm not installed" });
    else {
      const obj = join(dir, "sum.o");
      const exe = join(dir, Deno.build.os === "windows" ? "t.exe" : "t");
      const steps = [["nasm", "-f", nasmFormat(Deno.build.os), join(here, "asm/x86_64/sum_u64.asm"), "-o", obj], [
        ...cc,
        harness,
        obj,
        "-o",
        exe,
      ], [exe]];
      let failed = "";
      for (const s of steps) {
        const r = await run(s);
        if (!r.ok) {
          failed = r.out;
          break;
        }
      }
      out.push({
        step: "x86-64 NASM",
        status: failed ? "fail" : "pass",
        note: failed.split("\n").slice(-12).join("\n") || undefined,
      });
    }
  } else out.push({ step: "x86-64 NASM", status: "skip", note: `host is ${Deno.build.arch}` });

  // ARM64: native when the host is ARM64 Linux, otherwise cross-assemble (clang or zig) and run under QEMU when present.
  const native = Deno.build.arch === "aarch64" && Deno.build.os === "linux";
  const target = native ? [] : ["-target", "aarch64-linux-musl"];
  const crossOk = native || cc[0] === "zig" || cc[0] === "python-zig";
  if (!crossOk) {
    out.push({
      step: "ARM64 GAS",
      status: "skip",
      note: "needs an ARM64 Linux host or zig cc (a clang cross build also needs an ARM64 sysroot: see README)",
    });
  } else {
    const obj = join(dir, "arm.o");
    const exe = join(dir, "t-arm");
    const link = [...cc, ...target, ...(native ? [] : ["-static"]), harness, obj, "-o", exe];
    let failed = "";
    for (const s of [[...cc, ...target, "-c", join(here, "asm/arm64/sum_u64.S"), "-o", obj], link]) {
      const r = await run(s);
      if (!r.ok) {
        failed = r.out;
        break;
      }
    }
    if (failed) out.push({ step: "ARM64 GAS", status: "fail", note: failed.split("\n").slice(-12).join("\n") });
    else if (native) {
      const r = await run([exe]);
      out.push({ step: "ARM64 GAS", status: r.ok ? "pass" : "fail", note: r.ok ? undefined : r.out });
    } else if (await has(["qemu-aarch64"])) {
      const r = await run(["qemu-aarch64", exe]);
      out.push({ step: "ARM64 GAS (qemu-aarch64)", status: r.ok ? "pass" : "fail", note: r.ok ? undefined : r.out });
    } else {out.push({
        step: "ARM64 GAS",
        status: "built",
        note: "cross-assembled and linked; not run (install qemu-user / qemu-aarch64)",
      });}
  }
  return out;
}

async function rust(firmware: boolean): Promise<Result[]> {
  if (!(await has(["cargo"]))) return [{ step: "Rust no_std", status: "skip", note: "cargo not installed" }];
  const dir = join(here, "rust-embedded");
  const env = { RUSTC_WRAPPER: "" }; // a broken compiler cache must not fail the build
  const out: Result[] = [];
  const test = await run(["cargo", "test", "--manifest-path", join(dir, "core/Cargo.toml")], ".", env);
  out.push({
    step: "Rust core: host tests",
    status: test.ok ? "pass" : "fail",
    note: test.ok ? undefined : test.out.split("\n").slice(-12).join("\n"),
  });
  const targets = await run(["rustup", "target", "list", "--installed"]);
  if (!targets.out.includes("thumbv7em-none-eabihf")) {
    out.push({ step: "Rust core: no_std build", status: "skip", note: "run: rustup target add thumbv7em-none-eabihf" });
    return out;
  }
  const nostd = await run(
    ["cargo", "build", "--manifest-path", join(dir, "core/Cargo.toml"), "--target", "thumbv7em-none-eabihf"],
    ".",
    env,
  );
  out.push({
    step: "Rust core: no_std build (thumbv7em)",
    status: nostd.ok ? "pass" : "fail",
    note: nostd.ok ? undefined : nostd.out.split("\n").slice(-12).join("\n"),
  });
  if (firmware) {
    const fw = await run(["cargo", "build", "--release"], join(dir, "app"), env);
    out.push({
      step: "Rust Embassy firmware build",
      status: fw.ok ? "built" : "fail",
      note: fw.ok ? "compiled for STM32F401RE; flashing needs a board" : fw.out.split("\n").slice(-12).join("\n"),
    });
  }
  return out;
}

if (import.meta.main) {
  const flags = Deno.args.filter((a) => a.startsWith("--"));
  const want = new Set(Deno.args.filter((a) => !a.startsWith("--")));
  const all = want.size === 0;
  const results: Result[] = [];
  if (all || want.has("c")) results.push(...await cmake("c"));
  if (all || want.has("cpp")) results.push(...await cmake("cpp"));
  if (all || want.has("asm")) results.push(...await asm());
  if (all || want.has("rust")) results.push(...await rust(flags.includes("--firmware")));
  for (const r of results) {
    console.log(
      `${r.status.toUpperCase().padEnd(5)} ${r.step}${
        r.note ? `\n        ${r.note.replaceAll("\n", "\n        ")}` : ""
      }`,
    );
  }
  Deno.exit(results.some((r) => r.status === "fail") ? 1 : 0);
}
