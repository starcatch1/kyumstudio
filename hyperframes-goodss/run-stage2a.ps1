param(
  [string]$ProjectFile = 'project.json',
  [string]$MasterSheet = '',
  [ValidateSet('auto','hyperframes','fallback')][string]$Renderer = 'auto',
  [string]$Quality = '',
  [switch]$SkipSetup,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Assert-Exit([string]$Name) {
  if ($LASTEXITCODE -ne 0) { throw "[P2A] Step failed: $Name (exit $LASTEXITCODE)" }
}
function Run-Step([string]$Name, [scriptblock]$Action) {
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  & $Action
  Assert-Exit $Name
}

$ProjectPath = if ([System.IO.Path]::IsPathRooted($ProjectFile)) { $ProjectFile } else { Join-Path $Root $ProjectFile }
if (-not (Test-Path $ProjectPath)) { throw "[P2A] Project file not found: $ProjectPath" }

if ($MasterSheet) {
  $MasterPath = if ([System.IO.Path]::IsPathRooted($MasterSheet)) { $MasterSheet } else { Join-Path (Get-Location) $MasterSheet }
  if (-not (Test-Path $MasterPath)) { throw "[P2A] Master sheet not found: $MasterPath" }
  $Target = Join-Path $Root 'assets/source/character-master-sheet.png'
  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $Target) | Out-Null
  Copy-Item -Force $MasterPath $Target
  Write-Host "[P2A] Master sheet prepared: $Target" -ForegroundColor Green
}

$VendorGsap = Join-Path $Root 'vendor/gsap.min.js'
if (-not $SkipSetup -and -not (Test-Path $VendorGsap)) {
  & (Join-Path $Root 'scripts/setup.ps1')
  Assert-Exit 'setup'
}
if (-not (Test-Path $VendorGsap)) { throw '[P2A] vendor/gsap.min.js missing. Run scripts/setup.ps1 first.' }

$RawProject = Get-Content -Raw -Encoding UTF8 $ProjectPath | ConvertFrom-Json
$ProjectId = [string]$RawProject.id
if (-not $ProjectId) { throw '[P2A] project.id is required.' }
$EffectiveQuality = if ($Quality) { $Quality } elseif ($RawProject.quality) { [string]$RawProject.quality } else { 'high' }
if ($EffectiveQuality -notin @('draft','standard','high')) { throw "[P2A] Invalid quality: $EffectiveQuality" }

$ProjectArg = [System.IO.Path]::GetRelativePath($Root, $ProjectPath).Replace('\','/')
$PrepareAssets = Join-Path $Root 'scripts/stage2a/prepare-assets.mjs'
$ValidateProject = Join-Path $Root 'scripts/stage2a/validate-project.mjs'
$GenerateAudio = Join-Path $Root 'scripts/stage2a/generate-audio.mjs'
$GenerateProject = Join-Path $Root 'scripts/stage2a/generate-project.mjs'
$FallbackScript = Join-Path $Root 'scripts/render-fallback.mjs'
$CompatScript = Join-Path $Root 'scripts/compat-encode.ps1'
$QaScript = Join-Path $Root 'scripts/qa-video.mjs'

$ReportDir = Join-Path $Root "renders/stage2a/$ProjectId"
New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
$ValidationReport = Join-Path $ReportDir 'project-validation.json'

Run-Step '1/6 Prepare project assets' { & node $PrepareAssets $ProjectArg }
Write-Host "`n=== 2/6 Validate project schema / timing / assets ===" -ForegroundColor Cyan
$validation = & node $ValidateProject $ProjectArg 2>&1
$validationCode = $LASTEXITCODE
$validation | Set-Content -Encoding utf8 $ValidationReport
if ($validationCode -ne 0) {
  $validation | Write-Host
  throw "[P2A] Project validation failed (exit $validationCode)."
}
$validation | Write-Host

Run-Step '3/6 Generate project audio' { & node $GenerateAudio $ProjectArg }
Run-Step '4/6 Generate generic HyperFrames compositions' { & node $GenerateProject $ProjectArg }

$ManifestPath = Join-Path $Root "generated/stage2a/$ProjectId/manifest.json"
if (-not (Test-Path $ManifestPath)) { throw "[P2A] Manifest missing: $ManifestPath" }
$Manifest = Get-Content -Raw -Encoding UTF8 $ManifestPath | ConvertFrom-Json

$UseHyperFrames = $false
if ($Renderer -eq 'hyperframes') {
  & npx --yes hyperframes info
  Assert-Exit 'HyperFrames CLI probe'
  $UseHyperFrames = $true
}
elif ($Renderer -eq 'fallback') {
  $UseHyperFrames = $false
}
else {
  & npx --yes hyperframes info *> $null
  $UseHyperFrames = ($LASTEXITCODE -eq 0)
}
$RendererLabel = if ($UseHyperFrames) { 'HyperFrames' } else { 'Fallback Chromium' }
Write-Host "[P2A] Renderer: $RendererLabel" -ForegroundColor Green

$Results = @()
Write-Host "`n=== 5/6 Render and compatibility encode ===" -ForegroundColor Cyan
foreach ($Comp in $Manifest.compositions) {
  $CompId = [string]$Comp.id
  $RawRel = "renders/stage2a/$ProjectId/$CompId-raw.mp4"
  $FixedRel = "renders/stage2a/$ProjectId/$CompId-fixed.mp4"
  $QaRel = "renders/stage2a/$ProjectId/$CompId-qa.json"
  $InspectRel = "renders/stage2a/$ProjectId/$CompId-inspect.json"
  $RawAbs = Join-Path $Root $RawRel
  $FixedAbs = Join-Path $Root $FixedRel
  $QaAbs = Join-Path $Root $QaRel
  $InspectAbs = Join-Path $Root $InspectRel

  Write-Host "`n[P2A] Rendering $CompId ($($Comp.width)x$($Comp.height), $($Comp.duration)s)" -ForegroundColor Yellow
  if ($UseHyperFrames) {
    Push-Location (Join-Path $Root ([string]$Comp.directory))
    try {
      & npx --yes hyperframes lint --verbose
      Assert-Exit "$CompId lint"
      $inspect = & npx --yes hyperframes inspect --json --samples 12 2>&1
      $inspectCode = $LASTEXITCODE
      $inspect | Set-Content -Encoding utf8 $InspectAbs
      if ($inspectCode -ne 0) { throw "[P2A] $CompId inspect failed." }
      & npx --yes hyperframes render --output $RawAbs --fps 30 --quality $EffectiveQuality --strict
      Assert-Exit "$CompId render"
    }
    finally { Pop-Location }
  }
  else {
    & node $FallbackScript ([string]$Comp.html) $CompId ([string]$Comp.duration) ([string]$Comp.width) ([string]$Comp.height) $RawRel
    Assert-Exit "$CompId fallback render"
    @{ renderer = 'fallback'; composition = $CompId; layoutInspect = 'static-validator+human-review' } | ConvertTo-Json | Set-Content -Encoding utf8 $InspectAbs
  }

  $AudioAbs = ''
  if ($Comp.audio) { $AudioAbs = Join-Path $Root ([string]$Comp.audio) }
  & $CompatScript -InputFile $RawAbs -OutputFile $FixedAbs -Width ([int]$Comp.width) -Height ([int]$Comp.height) -AudioFile $AudioAbs -Quality $EffectiveQuality
  Assert-Exit "$CompId compatibility encode"

  $Results += [pscustomobject]@{
    id = $CompId
    width = [int]$Comp.width
    height = [int]$Comp.height
    duration = [double]$Comp.duration
    final = $FixedRel.Replace('\','/')
    qa = $QaRel.Replace('\','/')
    inspect = $InspectRel.Replace('\','/')
  }
}

Write-Host "`n=== 6/6 Final codec + full-decode QA ===" -ForegroundColor Cyan
foreach ($Result in $Results) {
  $FixedAbs = Join-Path $Root $Result.final
  $QaAbs = Join-Path $Root $Result.qa
  & node $QaScript $FixedAbs ([string]$Result.width) ([string]$Result.height) $QaAbs
  Assert-Exit "$($Result.id) QA"
}

$BuildReport = [pscustomobject]@{
  ok = $true
  schemaVersion = 2
  projectId = $ProjectId
  projectFile = $ProjectArg
  quality = $EffectiveQuality
  renderer = $RendererLabel
  generatedAt = (Get-Date).ToString('o')
  compositions = $Results
}
$BuildReportPath = Join-Path $ReportDir 'build-report.json'
$BuildReport | ConvertTo-Json -Depth 8 | Set-Content -Encoding utf8 $BuildReportPath

Write-Host "`n[P2A] STAGE 2A PROJECT BUILD PASSED" -ForegroundColor Green
Write-Host "Project: $ProjectId"
Write-Host "Scenes are driven by project.json; frozen Stage 1 compatibility encode and QA are reused."
Write-Host "Report : $BuildReportPath"

if (-not $NoOpen -and $Results.Count -gt 0) {
  foreach ($Result in $Results | Select-Object -First 2) {
    Start-Process (Join-Path $Root $Result.final)
  }
}
