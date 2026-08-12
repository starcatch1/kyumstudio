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
if ($nodeMajor -lt 22) { throw "[P0] Node.js 22+ required. Current: $nodeVersion" }

Write-Host "[P0] Node $nodeVersion"
Write-Host '[P0] Installing local dependencies...'
& npm install
if ($LASTEXITCODE -ne 0) { throw '[P0] npm install failed.' }

$Vendor = Join-Path $Root 'vendor'
New-Item -ItemType Directory -Force -Path $Vendor | Out-Null
$GsapSource = Join-Path $Root 'node_modules\gsap\dist\gsap.min.js'
$GsapTarget = Join-Path $Vendor 'gsap.min.js'
if (-not (Test-Path $GsapSource)) { throw '[P0] GSAP runtime was not installed.' }
Copy-Item $GsapSource $GsapTarget -Force

$HyperFramesOk = $false
Write-Host '[P0] Probing HyperFrames CLI (preferred renderer)...'
& npx --yes hyperframes info *> $null
if ($LASTEXITCODE -eq 0) {
  $HyperFramesOk = $true
  Write-Host '[P0] HyperFrames CLI available.' -ForegroundColor Green
  & npx --yes hyperframes doctor
  if ($LASTEXITCODE -ne 0) { Write-Warning '[P0] HyperFrames doctor reported a problem; fallback renderer may still work.' }
}
else {
  Write-Warning '[P0] HyperFrames CLI unavailable. Setup will enable the Chromium fallback renderer.'
}

$browserCandidates = @()
if ($env:CHROME_PATH) { $browserCandidates += $env:CHROME_PATH }
if ($env:ProgramFiles) {
  $browserCandidates += (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')
  $browserCandidates += (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
}
if (${env:ProgramFiles(x86)}) {
  $browserCandidates += (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
  $browserCandidates += (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')
}
if ($env:LOCALAPPDATA) {
  $browserCandidates += (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
  $browserCandidates += (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
}
$BrowserPath = $browserCandidates | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($BrowserPath) {
  Write-Host "[P0] Chromium fallback browser: $BrowserPath" -ForegroundColor Green
}
elseif (-not $HyperFramesOk) {
  throw '[P0] Neither HyperFrames CLI nor Chrome/Edge was found. Install Chrome/Edge or set CHROME_PATH.'
}
else {
  Write-Warning '[P0] Chrome/Edge not found, but HyperFrames CLI is available.'
}

New-Item -ItemType Directory -Force -Path (Join-Path $Root 'assets\source') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'assets\looks') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'projects\long') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'projects\short') | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $Root 'renders') | Out-Null

Write-Host '[P0] Setup complete.' -ForegroundColor Green
Write-Host 'Place the master sheet at assets\source\character-master-sheet.png'
Write-Host 'Build: powershell -ExecutionPolicy Bypass -File .\scripts\build-all.ps1 -Quality draft -Renderer auto'
