$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$SetConfig = Join-Path $Root 'scripts/set-config.mjs'
$Audio = Join-Path $Root 'scripts/generate-audio.mjs'
$Generate = Join-Path $Root 'scripts/generate-compositions.mjs'
$Prepare = Join-Path $Root 'scripts/prepare-projects.mjs'
$Validate = Join-Path $Root 'scripts/validate-projects.mjs'
$Render = Join-Path $Root 'scripts/render-fallback.mjs'
$Compat = Join-Path $Root 'scripts/compat-encode.ps1'
$Qa = Join-Path $Root 'scripts/qa-video.mjs'

$cases = @(
  @{Name='editorial'; Visual='editorial-clean'; Caption='editorial-card'; Audio='minimal-electronic'},
  @{Name='luxury'; Visual='fashion-luxury'; Caption='minimal-lower-third'; Audio='soft-ambient'},
  @{Name='dynamic'; Visual='social-dynamic'; Caption='bold-kinetic'; Audio='fashion-beat'}
)

foreach ($case in $cases) {
  Write-Host "`n=== Stage 1.1 preset smoke: $($case.Name) ===" -ForegroundColor Cyan
  & node $SetConfig --visualPreset $case.Visual --captionPreset $case.Caption --audioPreset $case.Audio --bgmVolume 0.18 --sfxVolume 0.28 --quality draft
  if ($LASTEXITCODE -ne 0) { throw "Preset config failed: $($case.Name)" }
  & node $Audio; if ($LASTEXITCODE -ne 0) { throw "Audio failed: $($case.Name)" }
  & node $Generate; if ($LASTEXITCODE -ne 0) { throw "Composition failed: $($case.Name)" }
  & node $Prepare; if ($LASTEXITCODE -ne 0) { throw "Prepare failed: $($case.Name)" }
  & node $Validate; if ($LASTEXITCODE -ne 0) { throw "Validation failed: $($case.Name)" }

  $raw = Join-Path $Root "renders/preset-$($case.Name)-short-raw.mp4"
  $fixed = Join-Path $Root "renders/preset-$($case.Name)-short-fixed.mp4"
  $report = Join-Path $Root "renders/preset-$($case.Name)-qa.json"
  & node $Render 'projects/short/index.html' 'style-short' '17' '1080' '1920' $raw
  if ($LASTEXITCODE -ne 0) { throw "Render failed: $($case.Name)" }
  & $Compat -InputFile $raw -OutputFile $fixed -Width 1080 -Height 1920 -AudioFile (Join-Path $Root 'audio/style-short.wav') -Quality draft
  if ($LASTEXITCODE -ne 0) { throw "Encode failed: $($case.Name)" }
  & node $Qa $fixed 1080 1920 $report
  if ($LASTEXITCODE -ne 0) { throw "QA failed: $($case.Name)" }
}

# Restore production default after smoke test.
& node $SetConfig --visualPreset editorial-clean --captionPreset editorial-card --audioPreset minimal-electronic --bgmVolume 0.18 --sfxVolume 0.28 --quality high
if ($LASTEXITCODE -ne 0) { throw 'Failed to restore default project config.' }
Write-Host "`n[P1.1] All three representative preset renders PASS." -ForegroundColor Green
