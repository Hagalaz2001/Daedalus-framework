// See the Flutter app on a real Android emulator: boot one if none is running, build and install
// the debug app, open it and save a screenshot.
//   node scripts/mobile-shot.mjs [app=mobile] [name=home] [--wait 8]
// Output: docs/screens/<app>-<name>.png. Start `deno task dev:backend` first if the screen loads data.
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const args = process.argv.slice(2);
const waitIdx = args.indexOf("--wait");
const waitSeconds = waitIdx >= 0 ? Number(args.splice(waitIdx, 2)[1]) : 8;
const [app = "mobile", name = "home"] = args;
if (!/^[a-z0-9_-]+$/.test(app) || !/^[a-z0-9_-]+$/.test(name)) throw new Error("app and name: letters, digits, - and _");
const appDir = join("apps", app);
if (!existsSync(join(appDir, "pubspec.yaml"))) throw new Error(`${appDir} is not a Flutter app`);

const isWin = process.platform === "win32";
const sdk =
  process.env.ANDROID_HOME ??
  process.env.ANDROID_SDK_ROOT ??
  (isWin ? join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk") : join(homedir(), process.platform === "darwin" ? "Library/Android/sdk" : "Android/Sdk"));
const adb = join(sdk, "platform-tools", isWin ? "adb.exe" : "adb");
const emulator = join(sdk, "emulator", isWin ? "emulator.exe" : "emulator");
if (!existsSync(adb)) throw new Error(`adb not found in ${sdk}. Install the Android SDK (Android Studio) or set ANDROID_HOME.`);

const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const devices = () =>
  run(adb, ["devices"])
    .split("\n")
    .slice(1)
    .filter((l) => /\tdevice$/.test(l.trim()) || /\tdevice\s*$/.test(l))
    .map((l) => l.split("\t")[0]);

if (devices().length === 0) {
  const avds = existsSync(emulator) ? run(emulator, ["-list-avds"]).split("\n").map((s) => s.trim()).filter(Boolean) : [];
  if (avds.length === 0) throw new Error("No device and no emulator image. Create one in Android Studio (Device Manager).");
  console.log(`Starting emulator ${avds[0]} (headless)…`);
  spawn(emulator, ["-avd", avds[0], "-no-window", "-no-audio", "-no-snapshot-save", "-no-boot-anim"], { detached: true, stdio: "ignore" }).unref();
  for (let i = 0; i < 120 && devices().length === 0; i++) await sleep(2000);
}
const device = devices()[0];
if (!device) throw new Error("The emulator did not come up within 4 minutes.");
for (let i = 0; i < 120; i++) {
  try {
    if (run(adb, ["-s", device, "shell", "getprop", "sys.boot_completed"]).trim() === "1") break;
  } catch {
    // still booting
  }
  await sleep(2000);
}
console.log(`Device ${device} ready. Building ${app}…`);

const flutter = isWin ? "flutter.bat" : "flutter";
execFileSync(flutter, ["build", "apk", "--debug", "--dart-define=API_BASE_URL=http://10.0.2.2:8787"], { cwd: appDir, stdio: "inherit", shell: isWin });
const apk = join(appDir, "build", "app", "outputs", "flutter-apk", "app-debug.apk");
run(adb, ["-s", device, "install", "-r", apk]);

const gradle = ["build.gradle.kts", "build.gradle"].map((f) => join(appDir, "android", "app", f)).find(existsSync);
const appId = gradle && readFileSync(gradle, "utf8").match(/applicationId\s*=?\s*"([^"]+)"/)?.[1];
if (!appId) throw new Error("Could not read applicationId from android/app/build.gradle(.kts)");
run(adb, ["-s", device, "shell", "am", "force-stop", appId]);
run(adb, ["-s", device, "shell", "monkey", "-p", appId, "-c", "android.intent.category.LAUNCHER", "1"]);
await sleep(waitSeconds * 1000);

const png = execFileSync(adb, ["-s", device, "exec-out", "screencap", "-p"], { maxBuffer: 64 * 1024 * 1024 });
mkdirSync(join("docs", "screens"), { recursive: true });
const out = join("docs", "screens", `${app}-${name}.png`);
writeFileSync(out, png);
console.log(`Saved ${out} (${png.length} bytes). Look at it before calling the screen done.`);
