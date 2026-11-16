# Installs the Daedalus command for the current user (no administrator rights).
#   irm https://github.com/Hagalaz2001/Daedalus-framework/releases/latest/download/install.ps1 | iex
# Pick a version:   $env:DAEDALUS_VERSION = "2.0.0"; irm <url> | iex
# Other settings:   DAEDALUS_INSTALL (folder, default %LOCALAPPDATA%\daedalus\bin), DAEDALUS_NO_MODIFY_PATH=1 (leave PATH alone),
#                   DAEDALUS_RELEASES (a mirror of the releases page).
# The binary is checked against checksums.txt of the same release before it is installed.
$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
$ProgressPreference = "SilentlyContinue"

$releases = if ($env:DAEDALUS_RELEASES) { $env:DAEDALUS_RELEASES.TrimEnd("/") } else { "https://github.com/Hagalaz2001/Daedalus-framework/releases" }
$version = if ($env:DAEDALUS_VERSION) { $env:DAEDALUS_VERSION.TrimStart("v") } else { "" }
$base = if ($version) { "$releases/download/v$version" } else { "$releases/latest/download" }
$installDir = if ($env:DAEDALUS_INSTALL) { $env:DAEDALUS_INSTALL } else { Join-Path $env:LOCALAPPDATA "daedalus\bin" }
$file = "daedalus-windows-x64.exe"

$tmp = Join-Path ([IO.Path]::GetTempPath()) ("daedalus-install-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Path $tmp | Out-Null
try {
  Write-Host "Downloading $file from $base"
  try {
    Invoke-WebRequest -UseBasicParsing -Uri "$base/$file" -OutFile (Join-Path $tmp $file)
    Invoke-WebRequest -UseBasicParsing -Uri "$base/checksums.txt" -OutFile (Join-Path $tmp "checksums.txt")
  } catch {
    throw "Download failed: $($_.Exception.Message). Check your internet connection, or the version number."
  }

  $line = Get-Content (Join-Path $tmp "checksums.txt") | Where-Object { $_ -match "^[0-9a-fA-F]{64}\s+\*?$([regex]::Escape($file))\s*$" } | Select-Object -First 1
  if (-not $line) { throw "checksums.txt has no entry for $file; nothing was installed." }
  $expected = ($line -split "\s+")[0].ToLower()
  $actual = (Get-FileHash -Algorithm SHA256 -Path (Join-Path $tmp $file)).Hash.ToLower()
  if ($expected -ne $actual) { throw "Checksum mismatch (expected $expected, got $actual); nothing was installed." }
  Write-Host "Checksum OK ($actual)"

  New-Item -ItemType Directory -Force -Path $installDir | Out-Null
  $target = Join-Path $installDir "daedalus.exe"
  if (Test-Path $target) { Move-Item -Force $target "$target.old" -ErrorAction SilentlyContinue }
  Move-Item -Force (Join-Path $tmp $file) $target
  Remove-Item -Force "$target.old" -ErrorAction SilentlyContinue
} finally {
  Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
}

if (-not $env:DAEDALUS_NO_MODIFY_PATH) {
  $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
  if (-not (($userPath -split ";") -contains $installDir)) {
    [Environment]::SetEnvironmentVariable("Path", ($userPath.TrimEnd(";") + ";" + $installDir).TrimStart(";"), "User")
    Write-Host "Added $installDir to your PATH (open a new terminal to pick it up)."
  }
}

Write-Host ""
Write-Host "Installed: $target"
Write-Host "Next steps:"
Write-Host "  1. Open a new terminal and run:  daedalus --version"
Write-Host "  2. Install Deno 2.9 or newer (generated projects use it):  winget install DenoLand.Deno"
Write-Host "  3. Create a project:  daedalus new my-app --name `"My App`" --web site --backend hono"
Write-Host "The first command that needs templates downloads the matching assets once; later runs work offline."
Write-Host "Update later with:  daedalus upgrade"
