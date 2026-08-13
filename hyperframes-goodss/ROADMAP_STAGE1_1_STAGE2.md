# hyperframes-goodss — Development Roadmap

Date: 2026-08-13 (KST)

## Current milestone state

| Milestone | Status | Decision |
|---|---|---|
| Stage 1 — stable Long/Short renderer | COMPLETE | frozen except bug fixes |
| Stage 1.1 — presets/usability | ACCEPTED | preset semantics frozen |
| Stage 2A — generic project schema/timing | COMPLETE | schema v2 engineering gate PASS |
| Stage 2B — external audio/beat/narration | NEXT | begin after Stage 2A final CI |
| Stage 2C — lightweight Web UI | PLANNED | depends on stable Stage 2B/project contract |

---

## Stage 1 — COMPLETE

Delivered and verified:

- master sheet → 12 look extraction
- Long / Short generation
- transitions and deterministic BGM/SFX
- high / standard / draft output profiles
- HyperFrames preferred + Chromium fallback
- H.264 Main / yuv420p / AAC 48 kHz stereo / faststart
- ffprobe + full FFmpeg decode QA
- Windows runner

The user confirmed local Long/Short generation works. Core output/QA responsibility is frozen.

---

## Stage 1.1 — ACCEPTED

Delivered:

- Visual presets: `editorial-clean`, `fashion-luxury`, `social-dynamic`
- Caption presets: `minimal-lower-third`, `editorial-card`, `bold-kinetic`
- Audio presets: `minimal-electronic`, `soft-ambient`, `fashion-beat`
- separate BGM/SFX volume
- deterministic preset-driven audio
- preset regression renders in CI

The low-quality smoke output was confirmed to generate normally in the real environment. High quality remains a selectable output profile.

---

## Stage 2A — COMPLETE

### Goal achieved

The fixed character-style showcase has been converted into a reusable data-driven HyperFrames engine.

### Delivered

- `project.json` schemaVersion 2 as content/timeline source of truth
- formal schema: `config/project.schema.v2.json`
- arbitrary composition count
- arbitrary scene count
- image and video assets
- scene types: title/media/text/end
- layouts: center/split/full
- arbitrary per-scene durations
- sequential automatic start or explicit start
- per-scene transition selection
- auto composition duration
- asset registry and missing asset checks
- same-track overlap checks
- explicit duration consistency checks
- transition timing safety checks
- deterministic video seeking in Chromium fallback
- generic Windows runner: `run-stage2a.ps1` / `run-stage2a.cmd`
- existing character project represented entirely by `project.json`
- independent non-character image+video sample without renderer-template modification
- Stage 1/1.1 backward compatibility regression gate

### Exit criteria

- existing character showcase entirely expressible as project data — PASS
- second non-character project generated without changing renderer template — PASS
- legacy Stage 1 path remains green — PASS
- final codec/full-decode QA — PASS

Stage 2A schema v2 should now change only through explicit migration/versioning.

---

## Stage 2B — NEXT

### Objective

Make scene timing react to real audio and narration instead of relying only on manually specified durations.

### Work order

1. **External audio asset contract**
   - BGM/audio file registration in `project.json`
   - duration/sample-rate/channel inspection
   - safe local path validation

2. **Audio analysis layer**
   - waveform metadata
   - beat estimation
   - onset/energy markers
   - analysis JSON cached per source audio

3. **Beat-aware timing**
   - snap scene boundaries to selected beats
   - keep manual timing as source-of-truth option
   - transition timing suggestions rather than destructive automatic rewriting

4. **Narration/TTS track contract**
   - narration script per scene
   - external narration WAV/MP3 support first
   - generated TTS adapter separated from core schema
   - caption timing metadata

5. **Mixing**
   - BGM ducking under narration
   - narration/BGM/SFX gains
   - fade policy
   - peak/loudness guardrails

6. **Stage 2B QA samples**
   - one music-driven Short
   - one narration-driven Long
   - final outputs must still pass Stage 1 compatibility/full-decode QA

### Stage 2B exit criteria

- external audio can drive one real project without editing renderer code
- beat/onset analysis is deterministic and saved as data
- user can choose manual timing or beat-assisted timing
- narration remains intelligible over BGM
- music-driven Short sample PASS
- narration-driven Long sample PASS
- Stage 1/1.1/2A regression remains green

---

## Stage 2C — PLANNED

### Objective

Provide a small Windows-first Web UI that edits the same tested project contract rather than inventing another pipeline.

Minimum scope:

- create/open project
- asset registration
- preset selection
- scene add/delete/reorder
- duration/transition editing
- preview
- output quality selection
- render
- QA result display

Explicitly excluded from first UI version:

- full NLE timeline
- complex keyframe editor
- collaboration/cloud account system
- template marketplace

---

## Development priority rule

```text
Stage 1 / 1.1 frozen core
→ Stage 2A schema v2 frozen after final CI
→ Stage 2B audio/timing
→ Stage 2C UI
```

Do not build Stage 2C around assumptions that have not survived Stage 2B. Each milestone must keep previous regression gates green before expansion continues.
