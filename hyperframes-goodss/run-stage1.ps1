param(
  [Parameter(Mandatory=$true)]
  [string]$MasterSheet,

  [ValidateSet('draft','standard','high')]
  [string]$Quality = 'draft',

  [ValidateSet('auto','hyperframes','fallback')]
  [string]$Renderer = 'auto',

  [switch]$SkipSetup,
  [switch]$NoOpen
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Stop-WithMessage([string]$Message) {
  Write-Host "`n[STAGE 1] $Message" -ForegroundColor Red
  exit 1
}

$ResolvedMaster = $null
try { $ResolvedMaster = (Resolve-Path -LiteralPath $MasterSheet).Path }
catch { Stop-WithMessage "Master sheet not found: $MasterSheet" }

$ext = [IO.Path]::GetExtension($ResolvedMaster).ToLowerInvariant()
if ($ext -notin @('.png','.jpg','.jpeg','.webp')) {
  Stop-WithMessage "Unsupported master sheet format: $ext. Use PNG/JPG/JPEG/WEBP."
}

$SourceDir = Join-Path $Root 'assets/source'
$SourceFile = Join-Path $SourceDir 'character-master-sheet.png'
New-Item -ItemType Directory -Force -Path $SourceDir | Out-Null

Write-Host "`n=== Stage 1 acceptance runner ===" -ForegroundColor Cyan
Write-Host "Input   : $ResolvedMaster"
Write-Host "Quality : $Quality"
Write-Host "Renderer: $Renderer"

if ($ext -eq '.png') {
  Copy-Item -LiteralPath $ResolvedMaster -Destination $SourceFile -Force
}
else {
  if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) {
    Stop-WithMessage 'FFmpeg is required to normalize non-PNG input.'
  }
  & ffmpeg -y -v error -i $ResolvedMaster -frames:v 1 $SourceFile
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Failed to convert master sheet to PNG.' }
}
Write-Host "[PASS] Master sheet prepared: $SourceFile" -ForegroundColor Green

if (-not $SkipSetup) {
  Write-Host "`n=== Environment setup ===" -ForegroundColor Cyan
  & (Join-Path $Root 'scripts/setup.ps1')
  if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'setup.ps1 failed.' }
}

Write-Host "`n=== Full Stage 1 build ===" -ForegroundColor Cyan
& (Join-Path $Root 'scripts/build-all.ps1') -Quality $Quality -Renderer $Renderer
if ($LASTEXITCODE -ne 0) { Stop-WithMessage 'Stage 1 build failed.' }

$LongFile = Join-Path $Root 'renders/style-showcase-long-fixed.mp4'
$ShortFile = Join-Path $Root 'renders/style-showcase-short-fixed.mp4'
$QaLong = Join-Path $Root 'renders/qa-long.json'
$QaShort = Join-Path $Root 'renders/qa-short.json'

foreach ($file in @($LongFile,$ShortFile,$QaLong,$QaShort)) {
  if (-not (Test-Path $file)) { Stop-WithMessage "Required output missing: $file" }
}

$longReport = Get-Content -Raw -Encoding utf8 $QaLong | ConvertFrom-Json
$shortReport = Get-Content -Raw -Encoding utf8 $QaShort | ConvertFrom-Json
if (-not $longReport.ok) { Stop-WithMessage 'Long QA did not pass.' }
if (-not $shortReport.ok) { Stop-WithMessage 'Short QA did not pass.' }

Write-Host "`n=== Automated acceptance gate PASS ===" -ForegroundColor Green
Write-Host "Long : $LongFile"
Write-Host "Short: $ShortFile"
Write-Host "QA   : both reports ok=true"

Write-Host "`nHuman review checklist:" -ForegroundColor Yellow
Write-Host '  1. Long video opens, seeks, and reaches the end.'
Write-Host '  2. Short video opens, seeks, and reaches the end.'
Write-Host '  3. Full-body looks are not unintentionally cropped.'
Write-Host '  4. Korean captions are readable and do not overlap.'
Write-Host '  5. Transitions do not show blank or incorrect frames.'
Write-Host '  6. Run this command a second time to verify reproducibility.'

if (-not $NoOpen) {
  Write-Host "`nOpening Long and Short in the Windows default player..." -ForegroundColor Cyan
  Start-Process $LongFile
  Start-Sleep -Milliseconds 700
  Start-Process $ShortFile
}

Write-Host "`n[STAGE 1] Waiting only for human playback / visual approval." -ForegroundColor Green
