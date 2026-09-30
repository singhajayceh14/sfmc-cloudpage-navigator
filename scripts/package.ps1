# Builds the Chrome Web Store upload: dist/ab-cloudpage-navigator-<version>.zip
# Only runtime files go in. Dev and store material (store/, scripts/, graphify-out/, .vscode/, *.md,
# icon SVG sources) stays out.
# Usage (from the repo root):  powershell -ExecutionPolicy Bypass -File scripts/package.ps1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$version = (Get-Content manifest.json -Raw | ConvertFrom-Json).version
$files = @('manifest.json') +
  (Get-ChildItem src -File | Where-Object { $_.Extension -in '.js', '.txt' } | ForEach-Object { "src/$($_.Name)" }) +
  (Get-ChildItem icons -Filter *.png | ForEach-Object { "icons/$($_.Name)" })

# Written entry by entry: Windows PowerShell's Compress-Archive stores "src\x.js" with backslashes,
# which the Web Store (a Linux unzip) does not treat as folders. Entry names here always use "/".
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
New-Item -ItemType Directory -Force dist | Out-Null
$zip = Join-Path $root "dist/ab-cloudpage-navigator-$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
$archive = [IO.Compression.ZipFile]::Open($zip, 'Create')
try {
  foreach ($f in $files) {
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($archive, (Join-Path $root $f), $f, 'Optimal') | Out-Null
  }
} finally { $archive.Dispose() }

Write-Host "Built $zip ($($files.Count) files):"
$files | ForEach-Object { Write-Host "  $_" }
