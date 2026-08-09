param(
  [Parameter(Mandatory=$true)][string]$InputFile,
  [Parameter(Mandatory=$true)][string]$OutputFile,
  [Parameter(Mandatory=$true)][int]$Width,
  [Parameter(Mandatory=$true)][int]$Height
)

$ErrorActionPreference = 'Stop'
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw '[P0] ffmpeg not found.' }
if (-not (Test-Path $InputFile)) { throw "[P0] Raw render not found: $InputFile" }

$OutDir = Split-Path -Parent $OutputFile
if ($OutDir) { New-Item -ItemType Directory -Force -Path $OutDir | Out-Null }

Write-Host "[P0] Browser-compatible encode: $OutputFile"
& ffmpeg -y -v warning `
  -i $InputFile `
  -f lavfi -i 'anullsrc=channel_layout=stereo:sample_rate=48000' `
  -map '0:v:0' -map '1:a:0' -shortest `
  -vf "scale=$Width`:$Height`:flags=lanczos,setsar=1" `
  -c:v libx264 -profile:v main -level:v 4.1 -pix_fmt yuv420p `
  -r 30 -crf 20 -preset medium `
  -c:a aac -b:a 128k -ar 48000 -ac 2 `
  -movflags '+faststart' `
  $OutputFile

if ($LASTEXITCODE -ne 0) { throw '[P0] Compatibility encode failed.' }
Write-Host '[P0] Compatibility encode complete.' -ForegroundColor Green
