// Android release build of a Flutter app, pointed at a deployed backend.
//   node scripts/build-android.mjs <api-url> [app=mobile] [--bundle]
// Output: an APK (default) or an App Bundle for Google Play (--bundle). Play uploads need the app
// signed with your upload key: see android/app/build.gradle(.kts) signingConfigs and the deploy skill.
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const args = process.argv.slice(2);
const bundle = args.includes("--bundle");
const [apiUrl, app = "mobile"] = args.filter((a) => a !== "--bundle");
if (!apiUrl || !/^https:\/\//.test(apiUrl)) throw new Error("Give the deployed backend URL (https://…)");
if (!/^[a-z0-9_]+$/.test(app)) throw new Error("app: the folder name under apps/");
const flutter = process.platform === "win32" ? "flutter.bat" : "flutter";
execFileSync(flutter, ["build", bundle ? "appbundle" : "apk", "--release", `--dart-define=API_BASE_URL=${apiUrl}`], {
  cwd: join("apps", app),
  stdio: "inherit",
  shell: process.platform === "win32",
});
console.log(bundle ? `apps/${app}/build/app/outputs/bundle/release/app-release.aab` : `apps/${app}/build/app/outputs/flutter-apk/app-release.apk`);
