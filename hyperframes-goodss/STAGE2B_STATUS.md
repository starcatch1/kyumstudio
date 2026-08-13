# hyperframes-goodss — Stage 2B Status

Date: 2026-08-13 (KST)

## Decision

**Stage 2B engineering implementation: COMPLETE**  
**External music analysis: PASS**  
**Beat-aware scene timing: PASS**  
**Narration + BGM ducking: PASS**  
**Audio mix QA: PASS**  
**Stage 1 / 1.1 / 2A regression: PASS**

Final implementation baseline:

- commit: `4821b03887790c609081f25ae7a898e4d4f43f9b`
- GitHub Actions run: `31674429248` / run 84
- workflow conclusion: `success`

## Goal achieved

Stage 2B connects real audio to the Stage 2A data-driven timeline. The renderer is still driven by project data, but scene boundaries can now react to music and the final audio can include narration with automatic BGM ducking.

Stage 2A schema v2 remains frozen. Stage 2B introduces `schemaVersion: 3` rather than silently changing v2 semantics.

## Stage 2B project contract

Formal schema:

`config/project.schema.v3.json`

New capabilities:

- `audio` asset type in addition to image/video
- external BGM registration
- BGM volume / loop / source start
- beat-sync configuration
- BPM range and confidence threshold
- beat / onset / hybrid candidate selection
- safe maximum scene-boundary snap distance
- minimum scene-duration guard
- per-scene `snapEnd`
- narration modes: `none`, `file`, `tts`
- narration start / volume / timed caption cues
- sidechain ducking threshold / ratio / attack / release
- target integrated loudness / true peak / LRA

## External audio analysis

`analyze-audio.mjs` performs a deterministic local analysis path:

1. `ffprobe` reads audio duration/sample rate/channels.
2. FFmpeg decodes source audio to mono PCM for analysis.
3. RMS/onset envelope is calculated.
4. autocorrelation estimates tempo.
5. beat-grid phase is resolved.
6. onset candidates are stored separately.
7. analysis is written to `audio-analysis.json`.

This works through the same local FFmpeg path for external WAV/MP3-compatible input. The CI fixture is generated only to make the regression test deterministic.

### Music sample result

The deterministic 120 BPM test fixture was analyzed at approximately 120 BPM with confidence about 0.995.

The sample intentionally starts from non-beat-aligned cut positions. The resolver successfully moved all four interior scene boundaries to safe nearby beat positions while preserving total composition duration.

Representative timing changes from the implementation test:

- `2.35s → ~2.49s`
- `5.05s → ~4.99s`
- `8.20s → ~7.99s`
- `10.75s → ~10.99s`

The exact resolved positions are stored in `timing-report.json`.

## Beat-aware timing policy

`resolve-timing.mjs` does not freely rewrite the entire timeline.

It preserves these invariants:

- final composition duration remains unchanged
- only scene boundaries marked as snap-enabled are candidates
- a boundary moves only within `maxSnap`
- `minSceneDuration` prevents unsafe compressed scenes
- beat/onset confidence policy can reject weak beat grids
- unresolved boundaries keep their original position

This keeps music assistance non-destructive and predictable.

## Narration / TTS / captions

Stage 2B supports:

- existing narration WAV/MP3 through `narration.mode = file`
- TTS adapter through `narration.mode = tts`
- narration start offset and gain
- timed caption cues rendered as HyperFrames clips

The TTS adapter calls the HyperFrames CLI `tts` command and is wired into the production path. CI deterministically validates the file-narration path; it does not claim that an external/cloud TTS provider itself is covered by the offline regression fixture.

## BGM ducking and mixing

`build-audio.mjs` performs:

1. BGM trim/loop/start handling
2. narration delay and gain
3. narration stream split into sidechain detector + audible mix stream
4. FFmpeg `sidechaincompress`
5. BGM + narration mix
6. narration sidechain padding to the full composition duration
7. two-pass loudness normalization
8. 48 kHz stereo WAV final mix

The sidechain is padded to composition duration so narration ending early cannot truncate the remaining BGM.

## Audio QA

`qa-audio.mjs` independently checks the mixed WAV before the final build is accepted:

- expected duration
- 48 kHz sample rate
- stereo channels
- full FFmpeg decode
- integrated loudness near configured target
- true peak under the configured limit

The Stage 2B samples use a target of approximately `-14 LUFS` and a configured true-peak ceiling of `-1.5 dBTP`.

A first implementation correctly failed QA at about `-16.65 LUFS`; the QA tolerance was not loosened. The mixer was corrected to two-pass loudness normalization instead. A later narration test also correctly failed when audio ended at 9.2 s instead of 14 s; the sidechain was fixed rather than weakening duration QA.

## Exit samples

### 1. Music-driven Short — PASS

Source:

`samples/stage2b-music/project.json`

Output contract:

- `beat-sync-short`
- 1080×1920
- 30 fps
- 14 s
- external audio asset
- beat analysis
- beat-aware scene-boundary snap
- two-pass loudness normalization
- video QA + audio QA PASS

### 2. Narration-driven Long — PASS

Source:

`samples/stage2b-narration/project.json`

Output contract:

- `narration-long`
- 1920×1080
- 30 fps
- 14 s
- external BGM
- narration file
- timed narration captions
- sidechain BGM ducking
- two-pass loudness normalization
- full-length mixed audio
- video QA + audio QA PASS

## Backward compatibility

The final CI workflow runs all previous gates before Stage 2B:

- Stage 1 default Long/Short acceptance — PASS
- Stage 1.1 representative preset renders — PASS
- Stage 2A schema/timing validation regression — PASS
- Stage 2A character project — PASS
- Stage 2A independent non-character image+video project — PASS
- Stage 2B music Short — PASS
- Stage 2B narration Long — PASS

Therefore Stage 2B is additive around the frozen renderer/compatibility/QA core.

## Windows entry point

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage2b.ps1 `
  -ProjectFile .\samples\stage2b-music\project.json `
  -Quality high `
  -Renderer auto
```

or:

```text
run-stage2b.cmd
```

## Stage 2B output layout

```text
renders/stage2b/<project-id>/
  <composition-id>-fixed.mp4
  <composition-id>-video-qa.json
  <composition-id>-audio-qa.json
  <composition-id>-inspect.json
  project-validation.json
  build-report.json

generated/stage2b/<project-id>/
  audio-analysis.json
  timing-report.json
  resolved-project.json
  audio-manifest.json
  audio/
  <composition-id>/index.html
```

## Freeze rule

After the successful Stage 2B implementation baseline, schema v3 timing/audio semantics should change only through explicit migration/versioning or narrowly scoped bug fixes.

Content-level listening preference remains a human review task. It is separate from the engine acceptance gate.

## Next milestone

**Stage 2C — Lightweight Web UI**

The UI should edit the same tested schema/project contract and call the same renderer/audio/QA pipeline rather than creating a second implementation path.
