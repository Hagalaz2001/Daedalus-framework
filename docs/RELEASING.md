# Releasing Daedalus

For the maintainer. A release publishes four things from one tag: the GitHub Release (binaries, assets tarball,
checksums, SBOM, installers), a build-provenance attestation for them, and the JSR package `@daedalus-framework/cli`.
Nothing is published until you push a tag; `release:prepare` only edits files and prints commands.

## One-time setup (maintainer)

1. **Create the JSR scope.** Sign in at https://jsr.io with GitHub, create the scope `daedalus-framework`, then the package
   `cli` inside it.
2. **Link the repository.** In the package settings on jsr.io, link the GitHub repository
   `Hagalaz2001/Daedalus-framework`. This lets the release workflow publish through GitHub's OIDC identity, so no token
   is stored anywhere.
3. **Protect the release path.** In the repository settings, restrict who can create `v*` tags, and (optional) add a
   required reviewer to an environment if you want a manual approval gate before publishing.
4. **Check Actions permissions.** Settings, Actions, General: workflows may run; the workflow asks only for the
   permissions it needs, per job.

## Every release

1. Work lands on `main` with conventional commit messages (`feat:`, `fix:`, `docs:` ...). Run `deno task check`.
2. Prepare: `deno task release:prepare 2.1.0`. It bumps `VERSION` (the source) and its copies in `deno.json` and
   `lib/version.ts`, dates the entry in `CHANGELOG.md` (an existing "unreleased" entry is renamed, otherwise one is
   generated from the commits since the last tag) and prints the git commands. It never commits, tags or pushes.
3. Read the diff and edit the changelog, then run the printed commands: commit, tag `v2.1.0`, push the branch, push the tag.
4. **Approve the first release.** The first tag needs your eyes on the result: watch the `release` workflow, check
   the GitHub Release page and the JSR page, then try the installers on a clean machine.

## What the workflow does (`.github/workflows/release.yml`)

| Job | Permissions | Does |
|---|---|---|
| `check` | contents: read | Tag equals `VERSION`; `deno task check`; `deno publish --dry-run`. |
| `build` | contents: read | Builds `daedalus-assets-vX.Y.Z.tar.gz`, writes its SHA-256 into `lib/embedded-checksums.ts`, compiles the five binaries, makes the SBOM (`dist/sbom.cdx.json`) and `checksums.txt`. |
| `release` | contents: write, id-token: write, attestations: write | Attests build provenance, creates the GitHub Release with every file. |
| `publish-jsr` | contents: read, id-token: write | `deno publish` with the embedded checksum. |

Every third-party action is pinned to a commit SHA (`deno task lint:workflows` enforces it).

## Why there is a checksum inside the program

The CLI downloads the assets of its own version at run time. It accepts them only when the SHA-256 matches both
`checksums.txt` of that release and the value built into the CLI (binary or JSR package). Someone who could replace the
release files would still not get a CLI to accept them without also changing the CLI. The tarball excludes
`lib/embedded-checksums.ts`, so the hash does not contain itself. In a checkout that file is empty and only
`checksums.txt` is checked.

## Trying a release locally

```
deno run -A tools/build-release.ts assets
deno run -A tools/build-release.ts binaries windows-x64      # any name from TARGETS in tools/build-release.ts
deno run -A tools/build-release.ts checksums
deno run -A tools/fake-release.ts dist                       # prints http://127.0.0.1:<port>
```

Then `DAEDALUS_RELEASES=<that url>` for the binary or `install.ps1` / `install.sh`. This publishes nothing.

## If a release goes wrong

- A failed `check` or `build` job published nothing: fix, delete the tag, tag again.
- If the GitHub Release exists but JSR failed: re-run the `publish-jsr` job after fixing the cause (JSR versions cannot be
  overwritten; a bad published version is yanked on jsr.io and superseded by the next patch version).
- Never move a published tag: users and checksums already point at it.
