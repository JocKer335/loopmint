param([string]$ReleaseDate = '2026-10-09')

$ErrorActionPreference = 'Stop'
if ($ReleaseDate -notmatch '^\d{4}-\d{2}-\d{2}$') { throw 'Use a YYYY-MM-DD release date.' }
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$outputRoot = Join-Path $projectRoot 'output'
$stageRoot = Join-Path $outputRoot ('upload-' + $ReleaseDate + '-' + [guid]::NewGuid().ToString('N'))
$zipPath = Join-Path $outputRoot ('loopmint-ready-to-upload-' + $ReleaseDate + '.zip')
New-Item -ItemType Directory -Path $stageRoot -Force | Out-Null

$rootFiles = Get-ChildItem -LiteralPath $projectRoot -File | Where-Object {
  $_.Extension -in '.html', '.css', '.js', '.xml' -or $_.Name -in 'robots.txt', 'CNAME'
} | ForEach-Object { $_.Name }
$blogFiles = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'blog') -File -Recurse |
  Where-Object { $_.Extension -in '.html', '.css', '.js' } |
  ForEach-Object { $_.FullName.Substring($projectRoot.Length + 1) }
$assetFiles = & git -C $projectRoot ls-files -- assets
if ($LASTEXITCODE -ne 0) { throw 'Could not read the approved website asset list.' }
$publicFiles = @($rootFiles) + @($blogFiles) + @($assetFiles)
foreach ($relativePath in $publicFiles) {
  $destination = Join-Path $stageRoot $relativePath
  New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
  Copy-Item -LiteralPath (Join-Path $projectRoot $relativePath) -Destination $destination
}

Compress-Archive -Path (Join-Path $stageRoot '*') -DestinationPath $zipPath -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entries = @($archive.Entries | ForEach-Object { $_.FullName.Replace('\', '/') })
  foreach ($relativePath in $publicFiles) {
    if ($relativePath.Replace('\', '/') -notin $entries) { throw "Missing bundled file: $relativePath" }
  }
  $htmlCount = @($entries | Where-Object { $_ -match '\.html$' }).Count
  if ($htmlCount -ne 20) { throw "Expected 20 HTML pages, found $htmlCount." }
  foreach ($requiredFile in 'index.html', 'blog/index.html', 'styles.min.css', 'script.min.js', 'sitemap.xml', 'robots.txt', 'CNAME', 'assets/plus-jakarta-sans-latin.woff2') {
    if ($requiredFile -notin $entries) { throw "Missing required file: $requiredFile" }
  }
} finally { $archive.Dispose() }

$fileInfo = Get-Item -LiteralPath $zipPath
$hash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash
@{ file = $zipPath; pages = $htmlCount; files = $publicFiles.Count; bytes = $fileInfo.Length; sha256 = $hash } |
  ConvertTo-Json | Tee-Object -FilePath (Join-Path $outputRoot ('upload-manifest-' + $ReleaseDate + '.json'))
