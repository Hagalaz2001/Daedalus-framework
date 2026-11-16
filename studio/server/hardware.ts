// What this computer can run: RAM, free disk, GPU memory, AVX2, Apple Silicon, Ryzen AI. Reads only what the OS exposes
// to a normal user (registry, /proc, /sys, nvidia-smi, df); every source is optional and the parsers are pure.
import type { Hardware } from "../shared/localAi.ts";

const GB = 1024 ** 3;
export type Run = (cmd: string, args: string[]) => Promise<string | null>;

/** Runs a program with a 5 s timeout and returns its stdout, or null when it is missing or fails. */
export const defaultRun: Run = async (cmd, args) => {
  try {
    const out = await new Deno.Command(cmd, {
      args,
      stdout: "piped",
      stderr: "null",
      signal: AbortSignal.timeout(5_000),
    }).output();
    return out.success ? new TextDecoder().decode(out.stdout) : null;
  } catch {
    return null;
  }
};

const INTEGRATED = /\b(intel|uhd|iris|vega \d+ graphics)\b|radeon\(tm\) graphics|radeon graphics|microsoft basic/i;

/** `nvidia-smi --query-gpu=name,memory.total --format=csv,noheader,nounits` (MiB). */
export function parseNvidiaSmi(out: string): Hardware["gpus"] {
  return out.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).flatMap((line) => {
    const at = line.lastIndexOf(",");
    const mib = Number(line.slice(at + 1));
    return at > 0 && Number.isFinite(mib)
      ? [{ name: line.slice(0, at).trim(), vramBytes: Math.round(mib * 1024 * 1024) }]
      : [];
  });
}

/**
 * `reg query HKLM\...\Class\{4d36e968-...} /s` on Windows. WMI's AdapterRAM is 32-bit and stops at 4 GB, so the 64-bit
 * HardwareInformation.qwMemorySize is read instead, with the DriverDesc of the same key as the name.
 */
export function parseWindowsDisplayRegistry(out: string): Hardware["gpus"] {
  const gpus: Hardware["gpus"] = [];
  for (const block of out.split(/\r?\n(?=HKEY_)/)) {
    const mem = /HardwareInformation\.qwMemorySize\s+REG_QWORD\s+0x([0-9a-f]+)/i.exec(block)?.[1];
    if (!mem) continue;
    const name = /DriverDesc\s+REG_SZ\s+(.+)/i.exec(block)?.[1]?.trim() ?? "Graphics adapter";
    const bytes = Number.parseInt(mem, 16);
    if (Number.isFinite(bytes) && bytes > 0) {
      gpus.push({ name, vramBytes: bytes, ...(INTEGRATED.test(name) || bytes < 2 * GB ? { integrated: true } : {}) });
    }
  }
  return gpus;
}

/** `df -Pk <dir>`: free bytes from the Available column of the last line. */
export function parseDf(out: string): number | null {
  const line = out.trim().split(/\r?\n/).at(-1)?.trim().split(/\s+/);
  const kb = line && line.length >= 6 ? Number(line[3]) : NaN;
  return Number.isFinite(kb) ? kb * 1024 : null;
}

export const parseCpuNameLinux = (cpuinfo: string): string | null =>
  /^model name\s*:\s*(.+)$/im.exec(cpuinfo)?.[1]?.trim() ?? null;
export const hasAvx2Linux = (cpuinfo: string): boolean | null => {
  const flags = /^flags\s*:\s*(.+)$/im.exec(cpuinfo)?.[1];
  return flags ? flags.split(/\s+/).includes("avx2") : null;
};

async function readText(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}

async function linuxAmdGpus(): Promise<Hardware["gpus"]> {
  const gpus: Hardware["gpus"] = [];
  try {
    for (const e of Deno.readDirSync("/sys/class/drm")) {
      if (!/^card\d+$/.test(e.name)) continue;
      const dev = `/sys/class/drm/${e.name}/device`;
      const vram = Number((await readText(`${dev}/mem_info_vram_total`))?.trim());
      const vendor = (await readText(`${dev}/vendor`))?.trim();
      if (vendor === "0x1002" && Number.isFinite(vram) && vram > 0) {
        gpus.push({ name: "AMD GPU", vramBytes: vram, ...(vram < 2 * GB ? { integrated: true } : {}) });
      }
    }
  } catch {
    // No DRM subsystem (container, WSL): nothing to add.
  }
  return gpus;
}

export async function collectHardware(run: Run = defaultRun): Promise<Hardware> {
  const mem = Deno.systemMemoryInfo();
  const os = Deno.build.os;
  const arch = Deno.build.arch;
  const home = Deno.env.get(os === "windows" ? "USERPROFILE" : "HOME") ?? ".";
  let cpu: string | null = null;
  let avx2: boolean | null = null;
  let gpus: Hardware["gpus"] = [];
  let freeDiskBytes: number | null = null;

  if (os === "linux") {
    const info = await readText("/proc/cpuinfo");
    if (info) [cpu, avx2] = [parseCpuNameLinux(info), hasAvx2Linux(info)];
    gpus = await linuxAmdGpus();
    freeDiskBytes = parseDfOrNull(await run("df", ["-Pk", home]));
  } else if (os === "darwin") {
    cpu = (await run("sysctl", ["-n", "machdep.cpu.brand_string"]))?.trim() ?? null;
    if (arch === "x86_64") avx2 = /AVX2/i.test((await run("sysctl", ["-n", "machdep.cpu.leaf7_features"])) ?? "");
    freeDiskBytes = parseDfOrNull(await run("df", ["-Pk", home]));
  } else if (os === "windows") {
    const reg = await run("reg", [
      "query",
      "HKLM\\HARDWARE\\DESCRIPTION\\System\\CentralProcessor\\0",
      "/v",
      "ProcessorNameString",
    ]);
    cpu = /ProcessorNameString\s+REG_SZ\s+(.+)/i.exec(reg ?? "")?.[1]?.trim() ?? null;
    gpus = parseWindowsDisplayRegistry(
      (await run("reg", [
        "query",
        "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Class\\{4d36e968-e325-11ce-bfc1-08002be10318}",
        "/s",
      ])) ?? "",
    );
    if (arch === "x86_64") {
      // PF_AVX2_INSTRUCTIONS_AVAILABLE (40) through kernel32; works in Windows PowerShell 5.1.
      const out = await run("powershell", [
        "-NoProfile",
        "-Command",
        "Add-Type -MemberDefinition '[DllImport(\"kernel32.dll\")] public static extern bool IsProcessorFeaturePresent(int f);' -Name K -Namespace W; [W.K]::IsProcessorFeaturePresent(40)",
      ]);
      avx2 = out?.trim() === "True" ? true : out?.trim() === "False" ? false : null;
    }
    const drive = /^([A-Za-z]):/.exec(home)?.[1] ?? "C";
    const free = Number(
      (await run("powershell", ["-NoProfile", "-Command", `(Get-PSDrive -Name ${drive}).Free`]))?.trim(),
    );
    freeDiskBytes = Number.isFinite(free) && free > 0 ? free : null;
  }
  // NVIDIA's tool reports real VRAM on every OS and wins over the guesses above for the same card.
  const nv = parseNvidiaSmi(
    (await run("nvidia-smi", ["--query-gpu=name,memory.total", "--format=csv,noheader,nounits"])) ?? "",
  );
  if (nv.length) gpus = [...nv, ...gpus.filter((g) => !/nvidia|geforce|rtx|gtx|quadro/i.test(g.name))];

  const appleSilicon = os === "darwin" && arch === "aarch64";
  return {
    os,
    arch,
    cpu,
    ramBytes: mem.total,
    availableRamBytes: mem.available || mem.free, // Windows reports available as 0
    freeDiskBytes,
    avx2: appleSilicon ? null : avx2,
    gpus,
    unifiedMemory: appleSilicon,
    ryzenAi: /ryzen\s*ai/i.test(cpu ?? ""),
  };
}

const parseDfOrNull = (out: string | null) => (out ? parseDf(out) : null);
