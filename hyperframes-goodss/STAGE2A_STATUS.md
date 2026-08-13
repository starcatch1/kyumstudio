# hyperframes-goodss — Stage 2A Status

Date: 2026-08-13 (KST)

## Decision

**Stage 2A engineering implementation: COMPLETE**  
**Schema/timing validation: PASS**  
**Character project render: PASS**  
**Non-character image + video render: PASS**  
**Stage 1 / 1.1 regression: PASS**

## Goal achieved

Stage 2A changes the project from a fixed 12-look character showcase into a reusable data-driven HyperFrames engine. Content, assets, scene order, scene duration, transitions and composition dimensions now live in `project.json`; the renderer/compatibility/QA core is reused.

## Implemented contract

### Project

- `schemaVersion: 2`
- project id/title/quality
- Visual / Caption / Audio preset selection
- synthetic or silent audio mode
- asset registry
- one or more compositions

### Assets

- `image`
- `video`
- relative project asset paths
- compatibility preprocessors when needed

### Composition

- arbitrary composition id
- arbitrary width/height
- 30 fps compatibility profile
- `duration: "auto"` or explicit duration
- arbitrary scene count

### Scene

- `title`, `media`, `text`, `end`
- optional explicit `start`; otherwise sequential start is resolved automatically
- arbitrary `duration`
- separate scene/media track indices
- image/video asset reference
- video `mediaStart`
- `center`, `split`, `full` layouts
- per-scene transition
- text hierarchy: kicker / label / eyebrow / title / body / badge / tags

### Transitions

- `cut`
- `lime-wipe`
- `black-wipe`
- `center-split`

## Validation gate

`project-lib.mjs` / `validate-project.mjs` reject:

- unsupported schema version
- duplicate composition or scene ids
- invalid dimensions or fps
- missing/unknown assets
- unsupported asset/scene/layout/transition types
- non-positive scene durations
- same-track scene overlap
- same-track media overlap
- explicit composition duration mismatch
- unsafe transition duration

Regression tests also verify that a valid video asset is accepted.

## Renderer integration

Stage 2A does **not** create a second final-output pipeline.

It reuses:

- HyperFrames CLI when available
- deterministic Chromium fallback otherwise
- frozen Stage 1 H.264/AAC compatibility encode
- frozen Stage 1 ffprobe/full-decode QA

The fallback renderer was extended so active `<video>` clips seek to their deterministic timeline time before each captured frame.

## Samples proving the exit criteria

### 1. Existing character showcase

Source: `project.json`

- 12 image assets
- Long: `style-long-v2` — 1920×1080 / 30 s / 10 scenes
- Short: `style-short-v2` — 1080×1920 / 17 s / 6 scenes
- both final MP4s PASS codec/full-decode QA

This proves the old character showcase can be expressed as project data rather than hard-coded scene generation.

### 2. Independent non-character sample

Source: `samples/non-character/project.json`

- SVG/image assets
- generated H.264 video asset
- 1280×720 / 13.2 s / 5 scenes
- arbitrary 2.0 / 2.8 / 3.2 s scene durations
- image and video scenes use the same scene contract
- final MP4 PASS codec/full-decode QA

This proves another content type can be rendered without modifying the generic renderer template.

## Backward compatibility

The CI workflow runs Stage 1 and Stage 1.1 before Stage 2A. Both legacy paths remain PASS, so Stage 2A is additive around the frozen core.

## Windows entry point

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage2a.ps1 -ProjectFile .\project.json -Renderer auto
```

or double-click / drag a project JSON onto:

```text
run-stage2a.cmd
```

The runner supports Windows PowerShell 5.1-compatible project path handling and PowerShell 7.

## Output layout

```text
renders/stage2a/<project-id>/
  <composition-id>-fixed.mp4
  <composition-id>-qa.json
  <composition-id>-inspect.json
  project-validation.json
  build-report.json
```

## Stage 2A freeze rule

After final CI passes on the documented revision, Stage 2A schema v2 semantics should be changed only through an explicit migration/version bump. New features belong to Stage 2B+ rather than silently changing the v2 contract.

## Next milestone

**Stage 2B — External audio, beat/onset analysis, beat-aware transition timing, narration/TTS track support, ducking and audio mix QA.**
