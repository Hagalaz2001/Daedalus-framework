// Runs Godot headless: import the project, then parse every script. Needs the `godot` binary on PATH (or GODOT=...).
const godot = Deno.env.get("GODOT") ?? "godot";
const dir = new URL(".", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

async function run(args: string[]) {
  try {
    const r = await new Deno.Command(godot, {
      args: ["--headless", "--path", dir, ...args],
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    return r.code;
  } catch {
    console.error(`${godot} not found. Install Godot 4.3+ (https://godotengine.org/download) or set GODOT=<path>.`);
    return 127;
  }
}

let code = await run(["--import", "--quit"]);
if (code === 0) {
  for (const script of ["scripts/player.gd", "scripts/score.gd"]) {
    code = await run(["--check-only", "--script", `res://${script}`]);
    if (code !== 0) break;
  }
}
Deno.exit(code);
