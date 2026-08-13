# hyperframes-goodss — Development Roadmap

Date: 2026-08-13 (KST)

## Current milestone state

| Milestone | Status | Decision |
|---|---|---|
| Stage 1 — stable Long/Short renderer | COMPLETE | frozen except bug fixes |
| Stage 1.1 — presets/usability | ACCEPTED | preset semantics frozen |
| Stage 2A — generic project schema/timing | COMPLETE | schema v2 frozen |
| **Stage 2B — external audio/beat/narration** | **COMPLETE** | schema v3/audio timing gate PASS |
| **Stage 2C — lightweight Web UI** | **NEXT** | build on tested Stage 2B contract |

---

## Stage 1 — COMPLETE

Delivered and verified:

- master sheet → Long / Short generation
- transitions and deterministic BGM/SFX
- high / standard / draft profiles
- HyperFrames preferred + Chromium fallback
- H.264 Main / yuv420p / AAC 48 kHz stereo / faststart
- ffprobe + full FFmpeg decode QA
- Windows runner

Core output/QA responsibility is frozen.

---

## Stage 1.1 — ACCEPTED

Delivered:

- Visual presets: `editorial-clean`, `fashion-luxury`, `social-dynamic`
- Caption presets: `minimal-lower-third`, `editorial-card`, `bold-kinetic`
- Audio presets: `minimal-electronic`, `soft-ambient`, `fashion-beat`
- separate BGM/SFX volume
- deterministic preset regression renders

---

## Stage 2A — COMPLETE

Delivered:

- `schemaVersion: 2`
- formal schema `config/project.schema.v2.json`
- arbitrary compositions/scenes
- image/video assets
- scene types/layouts/transitions
- arbitrary scene durations
- automatic or explicit start timing
- asset/duration/overlap/transition validation
- deterministic video seeking in Chromium fallback
- Windows `run-stage2a.ps1` / `run-stage2a.cmd`
- character project and independent non-character image+video sample
- Stage 1/1.1 regression gate

Stage 2A schema v2 changes now require an explicit migration/version bump.

---

## Stage 2B — COMPLETE

### Goal achieved

Real audio can now drive video timing, narration can coexist with BGM, and final mixed audio has its own acceptance gate.

### Delivered

- `schemaVersion: 3`
- formal schema `config/project.schema.v3.json`
- audio assets
- external WAV/MP3-compatible FFmpeg input path
- ffprobe audio metadata inspection
- deterministic PCM analysis
- BPM estimation
- beat-grid phase detection
- onset candidates
- cached `audio-analysis.json`
- beat/onset/hybrid candidate policy
- safe scene-boundary Beat Snap
- total composition duration preservation
- max-snap guard
- minimum-scene-duration guard
- per-scene `snapEnd`
- narration file support
- HyperFrames CLI TTS adapter
- timed narration caption cues
- sidechain BGM ducking
- full-duration narration sidechain padding
- two-pass loudness normalization
- 48 kHz stereo mixed WAV
- separate audio QA for duration/sample rate/channels/decode/LUFS/true peak
- Windows `run-stage2b.ps1` / `run-stage2b.cmd`

### Exit samples

#### Music-driven Short — PASS

`samples/stage2b-music/project.json`

- 1080×1920
- 30 fps
- 14 s
- ~120 BPM analysis
- confidence ~0.995
- 4/4 interior boundaries beat-snapped
- video QA PASS
- audio QA PASS

#### Narration-driven Long — PASS

`samples/stage2b-narration/project.json`

- 1920×1080
- 30 fps
- 14 s
- external BGM path
- narration file
- timed caption cues
- sidechain ducking
- two-pass loudness normalization
- full-duration audio
- video QA PASS
- audio QA PASS

### Engineering gate

Implementation baseline:

`4821b03887790c609081f25ae7a898e4d4f43f9b`

GitHub Actions run:

`31674429248` / run 84 — **success**

The same run passed Stage 1, Stage 1.1, Stage 2A character/non-character projects, Stage 2B music Short and Stage 2B narration Long.

Stage 2B schema v3 semantics should now change only through explicit migration/versioning or narrowly scoped bug fixes.

---

## Stage 2C — NEXT

### Objective

Provide a small Windows-first Web UI that edits and invokes the same tested Stage 2B schema/runner/QA pipeline.

### Phase 2C.1 — Project shell

- create/open project
- schema v3 JSON load/save
- validation result panel
- unsaved-change protection
- Windows local workflow first

### Phase 2C.2 — Assets and audio

- image/video/audio asset registration
- local path selection
- BGM selection
- narration file/script controls
- audio metadata display
- BPM/confidence/beat analysis result display

### Phase 2C.3 — Scene editor

- add/delete/reorder scene
- duration
- layout
- transition
- `snapEnd`
- beat-snap settings
- narration caption cues

### Phase 2C.4 — Preview and render

- composition preview
- timing/beat markers
- quality selection
- renderer selection
- render button
- progress/log surface
- output/open-folder action

### Phase 2C.5 — QA surface

- video QA result
- audio QA result
- duration/LUFS/true-peak status
- build-report links

### Explicitly excluded from first UI version

- full NLE-style timeline
- complex keyframe editor
- DAW-grade waveform editing
- collaboration/cloud account system
- template marketplace

### Stage 2C exit criteria

- a user can create/open a schema v3 project without editing JSON manually
- image/video/audio assets can be configured through the UI
- a scene can be added/reordered and beat-snap configured
- music Short and narration Long can be rendered through the existing Stage 2B runner
- existing QA results are surfaced rather than reimplemented
- Stage 1/1.1/2A/2B regression remains green

---

## Development priority rule

```text
Stage 1 / 1.1 frozen core
→ Stage 2A schema v2 frozen
→ Stage 2B schema v3/audio timing frozen after successful CI
→ Stage 2C lightweight UI
```

Do not create a second renderer, second mixer, or second QA implementation in Stage 2C. The UI must remain a thin control layer over the tested project contract and runners.
