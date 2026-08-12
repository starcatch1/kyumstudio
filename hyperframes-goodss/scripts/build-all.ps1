param(
  [ValidateSet('draft','standard','high')]
  [string]$Quality = 'draft',
  [ValidateSet('auto','hyperframes','fallback')]
  [string]$Renderer = 'auto'
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Assert-Exit([string]$Name) {
  if ($LASTEXITCODE -ne 0) { throw "[P0] Step failed: $Name (exit $LASTEXITCODE)" }
}
function Run-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  Assert-Exit $Name
}

$Source = Join-Path $Root 'assets\source\character-master-sheet.png'
if (-not (Test-Path $Source)) { throw '[P0] Missing assets\source\character-master-sheet.png' }
if (-not (Test-Path (Join-Path $Root 'vendor\gsap.min.js'))) { throw '[P0] vendor\gsap.min.js missing. Run scripts\setup.ps1 first.' }
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'renders') | Out-Null

Run-Step '1/8 Extract 12 look assets' { & node .\scripts\extract-looks.mjs }
Run-Step '2/8 Generate compositions' { & node .\scripts\generate-compositions.mjs }
Run-Step '3/8 Prepare independent Long / Short projects' { & node .\scripts\prepare-projects.mjs }
Run-Step '4/8 Validate generated projects' { & node .\scripts\validate-projects.mjs }

$UseHyperFrames = $false
if ($Renderer -eq 'hyperframes') {
  Write-Host "`n=== Renderer probe: HyperFrames required ===" -ForegroundColor Cyan
  & npx --yes hyperframes info
  Assert-Exit 'HyperFrames CLI probe'
  $UseHyperFrames = $true
}
elseif ($Renderer -eq 'fallback') {
  $UseHyperFrames = $false
}
else {
  Write-Host "`n=== Renderer probe: HyperFrames preferred ===" -ForegroundColor Cyan
  & npx --yes hyperframes info *> $null
  if ($LASTEXITCODE -eq 0) {
    $UseHyperFrames = $true
    Write-Host '[P0] HyperFrames CLI found. Using official renderer.' -ForegroundColor Green
  }
  else {
    $UseHyperFrames = $false
    Write-Warning '[P0] HyperFrames CLI unavailable. Using deterministic Chromium fallback renderer.'
  }
}

$LongRaw = Join-Path $Root 'renders\style-showcase-long-raw.mp4'
$ShortRaw = Join-Path $Root 'renders\style-showcase-short-raw.mp4'
$InspectLong = Join-Path $Root 'renders\inspect-long.json'
$InspectShort = Join-Path $Root 'renders\inspect-short.json'

if ($UseHyperFrames) {
  Write-Host "`n=== 5/8 HyperFrames lint / inspect / render: Long ===" -ForegroundColor Cyan
  Push-Location (Join-Path $Root 'projects\long')
  try {
    & npx --yes hyperframes lint --verbose
    Assert-Exit 'Long lint'
    $inspect = & npx --yes hyperframes inspect --json --samples 12 2>&1
    $code = $LASTEXITCODE
    $inspect | Set-Content -Encoding utf8 $InspectLong
    if ($code -ne 0) { throw "[P0] Long inspect failed (exit $code)." }
    & npx --yes hyperframes render --output $LongRaw --fps 30 --quality $Quality --strict
    Assert-Exit 'Long render'
  }
  finally { Pop-Location }

  Write-Host "`n=== 6/8 HyperFrames lint / inspect / render: Short ===" -ForegroundColor Cyan
  Push-Location (Join-Path $Root 'projects\short')
  try {
    & npx --yes hyperframes lint --verbose
    Assert-Exit 'Short lint'
    $inspect = & npx --yes hyperframes inspect --json --samples 12 2>&1
    $code = $LASTEXITCODE
    $inspect | Set-Content -Encoding utf8 $InspectShort
    if ($code -ne 0) { throw "[P0] Short inspect failed (exit $code)." }
    & npx --yes hyperframes render --output $ShortRaw --fps 30 --quality $Quality --strict
    Assert-Exit 'Short render'
  }
  finally { Pop-Location }
}
else {
  Run-Step '5/8 Fallback Chromium render: Long' {
    & node .\scripts\render-fallback.mjs projects/long/index.html style-long 30 1920 1080 renders/style-showcase-long-raw.mp4
  }
  Run-Step '6/8 Fallback Chromium render: Short' {
    & node .\scripts\render-fallback.mjs projects/short/index.html style-short 17 1080 1920 renders/style-showcase-short-raw.mp4
  }
  '{"renderer":"fallback","layoutInspect":"manual-required"}' | Set-Content -Encoding utf8 $InspectLong
  '{"renderer":"fallback","layoutInspect":"manual-required"}' | Set-Content -Encoding utf8 $InspectShort
}

Write-Host "`n=== 7/8 Browser-compatible H.264/AAC encode ===" -ForegroundColor Cyan
& .\scripts\compat-encode.ps1 -InputFile $LongRaw -OutputFile .\renders\style-showcase-long-fixed.mp4 -Width 1920 -Height 1080
Assert-Exit 'Long compatibility encode'
& .\scripts\compat-encode.ps1 -InputFile $ShortRaw -OutputFile .\renders\style-showcase-short-fixed.mp4 -Width 1080 -Height 1920
Assert-Exit 'Short compatibility encode'

Write-Host "`n=== 8/8 Final codec + full decode QA ===" -ForegroundColor Cyan
& node .\scripts\qa-video.mjs .\renders\style-showcase-long-fixed.mp4 1920 1080 .\renders\qa-long.json
Assert-Exit 'Long QA'
& node .\scripts\qa-video.mjs .\renders\style-showcase-short-fixed.mp4 1080 1920 .\renders\qa-short.json
Assert-Exit 'Short QA'

$RendererLabel = if ($UseHyperFrames) { 'HyperFrames' } else { 'Fallback Chromium' }
Write-Host "`n[P0] STAGE 1 AUTOMATED BUILD PASSED" -ForegroundColor Green
Write-Host "Renderer: $RendererLabel"
Write-Host 'Long : renders\style-showcase-long-fixed.mp4'
Write-Host 'Short: renders\style-showcase-short-fixed.mp4'
Write-Host 'QA   : renders\qa-long.json / renders\qa-short.json'
Write-Host '[P0] Remaining completion gate: human playback / visual review.'
