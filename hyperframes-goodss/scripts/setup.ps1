$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "[P0] Required command not found: $Name"
  }
}

Require-Command node
Require-Command npm
Require-Command ffmpeg
Require-Command ffprobe

$nodeVersion = (& node -p "process.versions.node").Trim()
$nodeMajor = [int]($nodeVersion.Split('.')[0])
if ($nodeMajor -lt 22) {
  throw "[P0] Node.js 22+ required. Current: $nodeVersion"
}

Write-Host "[P0] Node $nodeVersion"
Write-Host "[P0] Installing local dependencies..."
& npm install
if ($LASTEXITCODE -ne 0) { throw '[P0] npm install failed.' }

$Vendor = Join-Path $Root 'vendor'
New-Item -ItemType Directory -Force -Path $Vendor | Out-Null
$GsapSource = Join-Path $Root 'node_modules\gsap\dist\gsap.min.js'
$GsapTarget = Join-Path $Vendor 'gsap.min.js'
if (-not (Test-Path $GsapSource)) { throw '[P0] GSAP runtime was not installed.' }
Copy-Item $GsapSource $GsapTarget -Force

Write-Host '[P0] Checking HyperFrames CLI...'
& npx --yes hyperframes info
if ($LASTEXITCODE -ne 0) {
  throw '[P0] HyperFrames CLI is not available. Resolve this before rendering.'
}

Write-Host '[P0] Running HyperFrames doctor...'
& npx --yes hyperframes doctor
if ($LASTEXITCODE -ne 0) { throw '[P0] HyperFrames doctor reported an error.' }

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'assets\source') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'assets\looks') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'renders') | Out-Null

Write-Host '[P0] Setup complete.' -ForegroundColor Green
Write-Host 'Place the master sheet at assets\source\character-master-sheet.png'
