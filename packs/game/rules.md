- Game code lives in `game/` (Godot 4, GDScript). Keep rules and maths in plain scripts without scene dependencies
  (`scripts/score.gd`) so they can be tested headless; scenes only wire things up.
- Do not commit exported builds, `.godot/` cache or keystores. Do not publish builds to stores; a human does.
- Assets (art, audio, fonts) need a licence you can cite in `game/ASSETS.md`. Do not ask an AI to reproduce copyrighted
  characters, music or code. Generated assets: note the tool and its terms.
- Run `deno task game:check` (needs the `godot` binary) before saying done, and play the scene.
