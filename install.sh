#!/bin/sh
# Installs the Daedalus command for the current user (no sudo).
#   curl -fsSL https://github.com/Hagalaz2001/Daedalus-framework/releases/latest/download/install.sh | sh
# Pick a version:   curl -fsSL <url> | DAEDALUS_VERSION=2.0.0 sh
# Other settings:   DAEDALUS_INSTALL (folder, default ~/.daedalus/bin), DAEDALUS_NO_MODIFY_PATH=1 (leave shell profiles alone),
#                   DAEDALUS_RELEASES (a mirror of the releases page), DAEDALUS_TARGET (e.g. linux-x64, overrides detection).
# The binary is checked against checksums.txt of the same release before it is installed.
set -eu

releases="${DAEDALUS_RELEASES:-https://github.com/Hagalaz2001/Daedalus-framework/releases}"
releases="${releases%/}"
version="${DAEDALUS_VERSION:-}"
version="${version#v}"
if [ -n "$version" ]; then base="$releases/download/v$version"; else base="$releases/latest/download"; fi
install_dir="${DAEDALUS_INSTALL:-$HOME/.daedalus/bin}"

die() { echo "error: $*" >&2; exit 1; }

target="${DAEDALUS_TARGET:-}"
if [ -z "$target" ]; then
  case "$(uname -s)" in
    Darwin) os=macos ;;
    Linux) os=linux ;;
    *) die "unsupported system $(uname -s); on Windows use install.ps1" ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) arch=x64 ;;
    arm64 | aarch64) arch=arm64 ;;
    *) die "unsupported CPU $(uname -m)" ;;
  esac
  target="$os-$arch"
fi
file="daedalus-$target"

if command -v curl >/dev/null 2>&1; then fetch() { curl -fsSL -o "$2" "$1"; }
elif command -v wget >/dev/null 2>&1; then fetch() { wget -q -O "$2" "$1"; }
else die "curl or wget is required"; fi

if command -v sha256sum >/dev/null 2>&1; then hash() { sha256sum "$1" | cut -d ' ' -f 1; }
elif command -v shasum >/dev/null 2>&1; then hash() { shasum -a 256 "$1" | cut -d ' ' -f 1; }
else die "sha256sum or shasum is required to verify the download"; fi

tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT

echo "Downloading $file from $base"
fetch "$base/$file" "$tmp/$file" || die "download failed: check your internet connection and the version number"
fetch "$base/checksums.txt" "$tmp/checksums.txt" || die "could not download checksums.txt"

expected="$(awk -v f="$file" '{ n = $2; sub(/^\*/, "", n); if (n == f) { print tolower($1); exit } }' "$tmp/checksums.txt")"
[ -n "$expected" ] || die "checksums.txt has no entry for $file; nothing was installed"
actual="$(hash "$tmp/$file")"
[ "$expected" = "$actual" ] || die "checksum mismatch (expected $expected, got $actual); nothing was installed"
echo "Checksum OK ($actual)"

mkdir -p "$install_dir"
chmod 755 "$tmp/$file"
mv -f "$tmp/$file" "$install_dir/daedalus"

if [ -z "${DAEDALUS_NO_MODIFY_PATH:-}" ]; then
  case ":$PATH:" in
    *":$install_dir:"*) ;;
    *)
      case "${SHELL:-}" in
        */zsh) profile="$HOME/.zshrc" ;;
        */bash) profile="$HOME/.bashrc" ;;
        *) profile="$HOME/.profile" ;;
      esac
      line="export PATH=\"$install_dir:\$PATH\""
      if ! grep -qsF "$line" "$profile"; then printf '\n# Daedalus\n%s\n' "$line" >> "$profile"; fi
      echo "Added $install_dir to PATH in $profile (open a new terminal to pick it up)."
      ;;
  esac
fi

cat <<EOF

Installed: $install_dir/daedalus
Next steps:
  1. Open a new terminal and run:  daedalus --version
  2. Install Deno 2.9 or newer (generated projects use it):  curl -fsSL https://deno.land/install.sh | sh
  3. Create a project:  daedalus new my-app --name "My App" --web site --backend hono
The first command that needs templates downloads the matching assets once; later runs work offline.
Update later with:  daedalus upgrade
EOF
