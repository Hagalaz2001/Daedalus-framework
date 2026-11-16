# Game starter (Godot 4)

Godot (MIT, https://godotengine.org) with GDScript. Status: starter, **not built or run by the blueprint's own tests**
(Godot is not part of its toolchain). Treat it as a skeleton and check it on your machine.

- `project.godot`: project settings (Godot 4.x, Forward+ off to keep it light: Compatibility renderer).
- `scenes/main.tscn`: a window with a movable square and a score label.
- `scripts/player.gd`: input and movement. `scripts/score.gd`: pure scoring logic, no scene dependencies.
- `check.ts`: `deno task game:check` runs Godot headless: imports the project and parses every script (`--check-only`).
- `ci.example.yml`: GitHub Actions example, copy to `.github/workflows/game.yml` after reading it.

Unit tests: add gdUnit4 (MIT, https://github.com/MikeSchulze/gdUnit4) as an addon when your logic grows; this skeleton
only checks that scripts compile. Bevy (MIT/Apache-2.0) is the Rust alternative; use the `systems` pack's Rust notes.
