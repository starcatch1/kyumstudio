param(
  [string]$ProjectFile = 'samples/stage2b-music/project.json',
  [ValidateSet('auto','hyperframes','fallback')][string]$Renderer = 'auto',
  [string]$Quality = '',
  [switch]$SkipSetup,
  [switch]$NoOpen
)
$ErrorActionPreference='Stop'
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root
function Assert-Exit([string]$Name){if($LASTEXITCODE -ne 0){throw "[P2B] Step failed: $Name (exit $LASTEXITCODE)"}}
function Run-Step([string]$Name,[scriptblock]$Action){Write-Host "`n=== $Name ===" -ForegroundColor Cyan;& $Action;Assert-Exit $Name}
$ProjectPath=if([System.IO.Path]::IsPathRooted($ProjectFile)){$ProjectFile}else{Join-Path $Root $ProjectFile}
if(-not(Test-Path $ProjectPath)){throw "[P2B] Project file not found: $ProjectPath"}
$ProjectPath=(Resolve-Path $ProjectPath).Path
$Vendor=Join-Path $Root 'vendor/gsap.min.js'
if(-not $SkipSetup -and -not(Test-Path $Vendor)){& (Join-Path $Root 'scripts/setup.ps1');Assert-Exit 'setup'}
if(-not(Test-Path $Vendor)){throw '[P2B] vendor/gsap.min.js missing.'}
$Raw=Get-Content -Raw -Encoding UTF8 $ProjectPath|ConvertFrom-Json
$ProjectId=[string]$Raw.id
$EffectiveQuality=if($Quality){$Quality}elseif($Raw.quality){[string]$Raw.quality}else{'high'}
if($EffectiveQuality -notin @('draft','standard','high')){throw "[P2B] invalid quality $EffectiveQuality"}
$S=Join-Path $Root 'scripts/stage2b'
$ReportDir=Join-Path $Root "renders/stage2b/$ProjectId";New-Item -ItemType Directory -Force -Path $ReportDir|Out-Null
Run-Step '1/8 Prepare audio fixtures/assets' {& node (Join-Path $S 'prepare-assets.mjs') $ProjectPath}
Write-Host "`n=== 2/8 Validate Stage 2B schema/assets ===" -ForegroundColor Cyan
$validation=& node (Join-Path $S 'validate-project.mjs') $ProjectPath 2>&1;$vc=$LASTEXITCODE;$validation|Set-Content -Encoding utf8 (Join-Path $ReportDir 'project-validation.json');$validation|Write-Host;if($vc-ne 0){throw '[P2B] project validation failed'}
Run-Step '3/8 Analyze external BGM beat/onset' {& node (Join-Path $S 'analyze-audio.mjs') $ProjectPath}
Run-Step '4/8 Resolve scene boundaries to music' {& node (Join-Path $S 'resolve-timing.mjs') $ProjectPath}
Run-Step '5/8 Build BGM + narration + ducking mix' {& node (Join-Path $S 'build-audio.mjs') $ProjectPath}
Run-Step '6/8 Generate resolved HyperFrames compositions' {& node (Join-Path $S 'generate-project.mjs') $ProjectPath}
$Generated=Join-Path $Root "generated/stage2b/$ProjectId";$Manifest=Get-Content -Raw -Encoding UTF8 (Join-Path $Generated 'manifest.json')|ConvertFrom-Json
$UseHyperFrames=$false
if($Renderer -eq 'hyperframes'){& npx --yes hyperframes info;Assert-Exit 'HyperFrames probe';$UseHyperFrames=$true}elseif($Renderer -eq 'fallback'){$UseHyperFrames=$false}else{& npx --yes hyperframes info *> $null;$UseHyperFrames=($LASTEXITCODE -eq 0)}
$RendererLabel=if($UseHyperFrames){'HyperFrames'}else{'Fallback Chromium'};Write-Host "[P2B] Renderer: $RendererLabel" -ForegroundColor Green
$Fallback=Join-Path $Root 'scripts/render-fallback.mjs';$Compat=Join-Path $Root 'scripts/compat-encode.ps1';$VideoQa=Join-Path $Root 'scripts/qa-video.mjs';$AudioQa=Join-Path $S 'qa-audio.mjs';$Results=@()
Write-Host "`n=== 7/8 Render + compatibility encode ===" -ForegroundColor Cyan
foreach($Comp in $Manifest.compositions){
  $id=[string]$Comp.id;$rawRel="renders/stage2b/$ProjectId/$id-raw.mp4";$fixedRel="renders/stage2b/$ProjectId/$id-fixed.mp4";$inspectRel="renders/stage2b/$ProjectId/$id-inspect.json";$rawAbs=Join-Path $Root $rawRel;$fixedAbs=Join-Path $Root $fixedRel;$inspectAbs=Join-Path $Root $inspectRel
  Write-Host "[P2B] Rendering $id ($($Comp.width)x$($Comp.height), $($Comp.duration)s)" -ForegroundColor Yellow
  if($UseHyperFrames){Push-Location (Join-Path $Root ([string]$Comp.directory));try{& npx --yes hyperframes lint --verbose;Assert-Exit "$id lint";$inspect=& npx --yes hyperframes inspect --json --samples 12 2>&1;$ic=$LASTEXITCODE;$inspect|Set-Content -Encoding utf8 $inspectAbs;if($ic-ne 0){throw "$id inspect failed"};& npx --yes hyperframes render --output $rawAbs --fps 30 --quality $EffectiveQuality --strict;Assert-Exit "$id render"}finally{Pop-Location}}
  else{& node $Fallback ([string]$Comp.html) $id ([string]$Comp.duration) ([string]$Comp.width) ([string]$Comp.height) $rawRel;Assert-Exit "$id fallback render";@{renderer='fallback';composition=$id}|ConvertTo-Json|Set-Content -Encoding utf8 $inspectAbs}
  $audioAbs=if($Comp.audio){Join-Path $Root ([string]$Comp.audio)}else{''}
  & $Compat -InputFile $rawAbs -OutputFile $fixedAbs -Width ([int]$Comp.width) -Height ([int]$Comp.height) -AudioFile $audioAbs -Quality $EffectiveQuality;Assert-Exit "$id compatibility encode"
  $Results+=[pscustomobject]@{id=$id;width=[int]$Comp.width;height=[int]$Comp.height;duration=[double]$Comp.duration;final=$fixedRel.Replace('\','/');audio=([string]$Comp.audio);videoQa="renders/stage2b/$ProjectId/$id-video-qa.json";audioQa="renders/stage2b/$ProjectId/$id-audio-qa.json";inspect=$inspectRel.Replace('\','/')}
}
Write-Host "`n=== 8/8 Video + audio full QA ===" -ForegroundColor Cyan
$target=if($Raw.audio.normalization.targetLufs){[string]$Raw.audio.normalization.targetLufs}else{'-14'};$peak=if($Raw.audio.normalization.truePeak){[string]$Raw.audio.normalization.truePeak}else{'-1.5'}
foreach($R in $Results){& node $VideoQa (Join-Path $Root $R.final) ([string]$R.width) ([string]$R.height) (Join-Path $Root $R.videoQa);Assert-Exit "$($R.id) video QA";& node $AudioQa (Join-Path $Root $R.audio) ([string]$R.duration) (Join-Path $Root $R.audioQa) $target $peak;Assert-Exit "$($R.id) audio QA"}
$analysis=Get-Content -Raw -Encoding UTF8 (Join-Path $Generated 'audio-analysis.json')|ConvertFrom-Json
$Build=[pscustomobject]@{ok=$true;schemaVersion=3;projectId=$ProjectId;projectFile=$ProjectPath;quality=$EffectiveQuality;renderer=$RendererLabel;generatedAt=(Get-Date).ToString('o');bpm=$analysis.analysis.bpm;beatConfidence=$analysis.analysis.confidence;timingReport=(Join-Path $Generated 'timing-report.json');compositions=$Results}
$Build|ConvertTo-Json -Depth 10|Set-Content -Encoding utf8 (Join-Path $ReportDir 'build-report.json')
Write-Host "`n[P2B] STAGE 2B BUILD PASSED" -ForegroundColor Green;Write-Host "Project: $ProjectId";Write-Host "BPM: $($Build.bpm) / confidence $($Build.beatConfidence)";Write-Host "Report: $(Join-Path $ReportDir 'build-report.json')"
if(-not $NoOpen){foreach($R in $Results|Select-Object -First 2){Start-Process (Join-Path $Root $R.final)}}
