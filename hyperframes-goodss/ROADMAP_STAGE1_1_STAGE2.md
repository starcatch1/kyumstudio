# hyperframes-goodss — Next Development Roadmap

Date: 2026-08-13 (KST)

## 0. Current decision

Stage 1 engineering pipeline is COMPLETE. The current pipeline supports:

- master sheet → 12 look extraction
- data-driven Long / Short composition generation
- 3 transition types
- deterministic BGM + transition SFX
- high / standard / draft quality profiles
- H.264/AAC/faststart compatibility output
- FFmpeg full-decode QA
- HyperFrames CLI preferred + Chromium fallback
- Windows drag-and-drop runner
- GitHub Actions end-to-end smoke test

The latest CI pipeline is green. However, the latest transition + BGM/SFX revision still needs one final human acceptance pass with the real character master sheet. This is the first next task and is treated as a Stage 1 closure check, not a new feature.

---

## 1. Stage 1 final closure — 2026-08-13

### Goal
Render the real character master sheet with the latest pipeline and verify the exact version that includes the latest transitions and BGM/SFX.

### Tasks

1. Run `run-stage1.ps1` with the real master sheet using `-Quality high -Renderer auto`.
2. Verify Long and Short from beginning to end.
3. Check:
   - no unintended crop of face/feet
   - Korean caption readability and safe margins
   - no blank/black transition frames
   - BGM level does not overpower the content
   - SFX level is not distracting
   - seeking works and both videos reach the end normally
4. Fix only blocking defects.
5. Re-run QA and freeze Stage 1 core pipeline.

### Exit criteria

- real-master Long PASS
- real-master Short PASS
- automated QA PASS
- human visual/audio acceptance PASS
- no core Stage 1 changes afterward except bug fixes

---

## 2. Stage 1.1 — Preset and usability layer — 2026-08-14 to 2026-08-17

### Goal
Make the stable Stage 1 pipeline useful for repeated real content production without changing its renderer/QA core.

### Scope

#### A. Visual presets
Create 3 selectable visual presets.

1. `editorial-clean` — current default
2. `fashion-luxury` — darker, premium, slower motion
3. `social-dynamic` — stronger typography and faster short-form pacing

Each preset defines:

- palette
- typography scale
- image/card layout
- caption styles
- transition set
- motion speed

#### B. Caption presets

- minimal lower-third
- editorial card
- bold kinetic

#### C. Audio presets

- minimal electronic
- soft ambient
- fashion beat

Provide separate BGM and SFX level controls.

#### D. Single config file
Introduce a project-level configuration such as:

```json
{
  "visualPreset": "editorial-clean",
  "captionPreset": "editorial-card",
  "audioPreset": "minimal-electronic",
  "bgmVolume": 0.18,
  "sfxVolume": 0.28,
  "quality": "high"
}
```

### Test
Render one real master sheet with all 3 visual presets in Short format first. Only after those are approved, render Long variants.

### Exit criteria

- preset selection does not modify the Stage 1 core renderer
- 3 visual presets PASS
- 3 caption presets PASS
- 3 audio presets PASS
- configuration is reproducible
- one-click Windows build still PASS

---

## 3. Stage 2A — General project schema and timing control — 2026-08-18 to 2026-08-22

### Goal
Move from a fixed character-style showcase to a reusable HyperFrames content engine.

### Tasks

1. Introduce `project.json` as the source of truth.
2. Separate content from template code.
3. Support arbitrary scene count instead of fixed 12-look assumptions.
4. Add per-scene duration and transition selection.
5. Add optional image/video asset types.
6. Add basic timeline validation:
   - no overlapping clips on the same track
   - duration consistency
   - missing asset detection
   - invalid transition timing detection

### Exit criteria

- the existing character showcase can be expressed entirely as `project.json`
- a second non-character sample can be created without changing renderer code
- old Stage 1 sample remains backward-compatible

---

## 4. Stage 2B — External audio, beat sync, narration — 2026-08-23 to 2026-08-28

### Goal
Make timing react to actual music and narration rather than only fixed durations.

### Tasks

1. external BGM import
2. waveform / duration inspection
3. beat/onset analysis
4. beat-aware scene transition suggestions
5. TTS/narration track support
6. BGM ducking under narration
7. caption timing from narration script
8. audio normalization and final mix QA

### Exit criteria

- one music-driven Short sample
- one narration-driven Long sample
- transitions can snap to selected beats
- narration and BGM levels remain intelligible
- final output still passes existing compatibility QA

---

## 5. Stage 2C — Lightweight Web UI — 2026-08-29 to 2026-09-04

### Goal
Allow normal use without manually editing JSON or PowerShell commands.

### Minimum UI

1. create/open project
2. choose input assets
3. choose visual/caption/audio preset
4. scene list and duration editing
5. preview
6. render quality selection
7. render button
8. QA status/result links

### Explicitly excluded from first UI version

- full NLE-style timeline
- complex keyframe editor
- cloud account system
- collaboration
- large template marketplace

### Exit criteria

- user can create and render a new project without editing source files
- Windows-first workflow works end-to-end
- UI calls the same tested renderer/QA pipeline rather than creating a second pipeline

---

## 6. Development priority rule

Do not work on all stages in parallel.

Priority order:

```text
Stage 1 real-master final acceptance
→ Stage 1.1 presets
→ Stage 2A project schema/timing
→ Stage 2B audio/narration
→ Stage 2C lightweight UI
```

If a milestone fails its exit criteria, stop expansion and fix that milestone before continuing.

## 7. Core stability rule

The following Stage 1 components are considered frozen after final real-master acceptance:

- compatibility encode
- ffprobe/full-decode QA
- renderer selection policy
- Windows acceptance runner behavior
- CI smoke-test gate

New features should be added around these components rather than rewriting them.
