## What and why

Spec or issue: <!-- specs/NNN-name or link -->

## AI assistance (required)

- AI-assisted: yes / no
- Tool and model: <!-- e.g. Claude Code, Codex, Gemini CLI, Copilot -->
- Human owner (can explain every line): @
- Human reviewer (not the author, not an AI): @

## Checklist

- [ ] `deno task check` passes
- [ ] Tests added or changed, and they fail without the change
- [ ] `deno task sast`, `deno task secrets`, `deno task audit` clean or explained
- [ ] No secrets or real personal data in code, fixtures or logs
- [ ] Seen working in the real app (browser, emulator, device or window)
- [ ] Touches money, auth, permissions, personal data, migrations or infrastructure? A reviewer who knows that area
      approved
- [ ] New dependencies and their licences reviewed
- [ ] Nothing deployed, deleted or published by an agent; a human will do that

## Risk and rollback

<!-- What could go wrong, how it is detected, how to undo it -->
