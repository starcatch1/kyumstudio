param(
  [ValidateSet('draft','standard','high')]
  [string]$Quality = 'draft'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Run-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) { throw "[P0] Step failed: $Name (exit $LASTEXITCODE)" }
}

$Source = Join-Path $Root 'assets\source\character-master-sheet.png'
if (-not (Test-Path $Source)) {
  throw '[P0] Missing assets\source\character-master-sheet.png'
}
if (-not (Test-Path (Join-Path $Root 'vendor\gsap.min.js'))) {
  throw '[P0] vendor\gsap.min.js missing. Run scripts\setup.ps1 first.'
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'renders') | Out-Null

Run-Step '1/8 Extract 12 look assets' { & node .\scripts\extract-looks.mjs }
Run-Step '2/8 Generate HyperFrames compositions' { & node .\scripts\generate-compositions.mjs }
Run-Step '3/8 HyperFrames lint' { & npx --yes hyperframes lint --verbose }

Write-Host "`n=== 4/8 HyperFrames inspect: long ===" -ForegroundColor Cyan
$inspectLong = & npx --yes hyperframes inspect --json --samples 12 2>&1
$inspectCode = $LASTEXITCODE
$inspectLong | Set-Content -Encoding utf8 .\renders\inspect-long.json
if ($inspectCode -ne 0) { throw "[P0] Long inspect failed (exit $inspectCode)." }

Run-Step '5/8 Render long' {
  & npx --yes hyperframes render --output renders/style-showcase-long-raw.mp4 --fps 30 --quality $Quality --strict
}

# Render the short composition as root without permanently changing the long source.
$IndexPath = Join-Path $Root 'index.html'
$ShortPath = Join-Path $Root 'compositions\style-short.html'
$Utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$LongIndex = [System.IO.File]::ReadAllText($IndexPath)
try {
  $ShortIndex = [System.IO.File]::ReadAllText($ShortPath).Replace('../vendor/','vendor/')
  [System.IO.File]::WriteAllText($IndexPath, $ShortIndex, $Utf8NoBom)

  Write-Host "`n=== 6/8 HyperFrames inspect + render: short ===" -ForegroundColor Cyan
  $inspectShort = & npx --yes hyperframes inspect --json --samples 12 2>&1
  $inspectShortCode = $LASTEXITCODE
  $inspectShort | Set-Content -Encoding utf8 .\renders\inspect-short.json
  if ($inspectShortCode -ne 0) { throw "[P0] Short inspect failed (exit $inspectShortCode)." }

  & npx --yes hyperframes render --output renders/style-showcase-short-raw.mp4 --fps 30 --quality $Quality --strict
  if ($LASTEXITCODE -ne 0) { throw '[P0] Short render failed.' }
}
finally {
  [System.IO.File]::WriteAllText($IndexPath, $LongIndex, $Utf8NoBom)
}

Write-Host "`n=== 7/8 Compatibility encode ===" -ForegroundColor Cyan
& powershell -ExecutionPolicy Bypass -File .\scripts\compat-encode.ps1 `
  -InputFile .\renders\style-showcase-long-raw.mp4 `
  -OutputFile .\renders\style-showcase-long-fixed.mp4 `
  -Width 1920 -Height 1080
if ($LASTEXITCODE -ne 0) { throw '[P0] Long compatibility encode failed.' }

& powershell -ExecutionPolicy Bypass -File .\scripts\compat-encode.ps1 `
  -InputFile .\renders\style-showcase-short-raw.mp4 `
  -OutputFile .\renders\style-showcase-short-fixed.mp4 `
  -Width 1080 -Height 1920
if ($LASTEXITCODE -ne 0) { throw '[P0] Short compatibility encode failed.' }

Write-Host "`n=== 8/8 Final decode / compatibility QA ===" -ForegroundColor Cyan
& node .\scripts\qa-video.mjs .\renders\style-showcase-long-fixed.mp4 1920 1080 .\renders\qa-long.json
if ($LASTEXITCODE -ne 0) { throw '[P0] Long QA failed.' }
& node .\scripts\qa-video.mjs .\renders\style-showcase-short-fixed.mp4 1080 1920 .\renders\qa-short.json
if ($LASTEXITCODE -ne 0) { throw '[P0] Short QA failed.' }

Write-Host "`n[P0] STAGE 1 SAMPLE BUILD PASSED" -ForegroundColor Green
Write-Host 'Long : renders\style-showcase-long-fixed.mp4'
Write-Host 'Short: renders\style-showcase-short-fixed.mp4'
Write-Host 'QA   : renders\qa-long.json / qa-short.json'
