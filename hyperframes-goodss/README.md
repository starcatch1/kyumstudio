# hyperframes-goodss — Stage 2B Music-driven Engine

HyperFrames 기반 데이터 주도형 영상 생성 프로젝트입니다. Stage 1/1.1의 렌더·호환 인코딩·QA 코어와 Stage 2A의 `project.json` 장면 계약을 유지하면서, Stage 2B에서 **실제 음악 분석·Beat Sync·Narration·BGM Ducking·Audio QA**를 추가했습니다.

## 현재 상태

| Milestone | Status |
|---|---|
| Stage 1 renderer / compatibility / video QA | COMPLETE / frozen |
| Stage 1.1 presets | ACCEPTED / frozen semantics |
| Stage 2A generic scene/timing engine | COMPLETE / schema v2 frozen |
| **Stage 2B external audio / beat / narration** | **COMPLETE / CI PASS** |
| Stage 2C lightweight Web UI | NEXT |

상세 판정은 `STAGE1_1_STATUS.md`, `STAGE2A_STATUS.md`, `STAGE2B_STATUS.md`에 기록합니다.

## Stage 2B 핵심 파이프라인

```text
project schema v3
→ image / video / audio asset registry
→ external BGM
→ ffprobe metadata + FFmpeg PCM decode
→ BPM / beat-grid / onset analysis
→ safe scene-boundary beat snap
→ narration file or HyperFrames TTS adapter
→ timed narration caption clips
→ sidechain BGM ducking
→ 2-pass loudness normalization
→ HyperFrames or Chromium render
→ frozen H.264/AAC compatibility encode
→ video QA + audio QA
```

Stage 2A schema v2는 그대로 유지하며, Stage 2B는 `schemaVersion: 3`으로 명시적으로 확장합니다. 정식 v3 구조는 `config/project.schema.v3.json`입니다.

## Stage 2B audio 예시

```json
{
  "schemaVersion": 3,
  "audio": {
    "mode": "external",
    "bgm": {
      "asset": "music",
      "volume": 0.28,
      "loop": false,
      "start": 0
    },
    "beatSync": {
      "enabled": true,
      "maxSnap": 0.22,
      "minSceneDuration": 1.5,
      "bpmMin": 70,
      "bpmMax": 160,
      "minConfidence": 0.10,
      "candidateSource": "beats"
    },
    "narration": {
      "mode": "file",
      "asset": "narration",
      "start": 4.0,
      "volume": 1.0,
      "captions": [
        {"start": 4.15, "duration": 1.45, "text": "Timed narration caption"}
      ]
    },
    "ducking": {
      "enabled": true,
      "threshold": 0.025,
      "ratio": 8,
      "attackMs": 20,
      "releaseMs": 320
    },
    "normalization": {
      "targetLufs": -14,
      "truePeak": -1.5,
      "lra": 11
    }
  },
  "assets": {
    "music": {"type": "audio", "src": "assets/music.mp3"},
    "narration": {"type": "audio", "src": "assets/narration.wav"}
  }
}
```

각 scene은 `snapEnd: false`로 Beat Snap을 개별 비활성화할 수 있습니다. 기본값은 snap 허용이며, `maxSnap`과 `minSceneDuration` 안전 규칙 안에서만 컷이 이동합니다. 최종 composition 길이는 유지됩니다.

## 지원 자산

- image
- video (`mediaStart` 지원)
- audio

Visual scene 종류는 `title`, `media`, `text`, `end`, layout은 `center`, `split`, `full`, transition은 `cut`, `lime-wipe`, `black-wipe`, `center-split`을 유지합니다.

## Windows 실행

Stage 2B 음악 샘플:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage2b.ps1 `
  -ProjectFile .\samples\stage2b-music\project.json `
  -Quality high `
  -Renderer auto
```

나레이션 샘플:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage2b.ps1 `
  -ProjectFile .\samples\stage2b-narration\project.json `
  -Quality high `
  -Renderer auto
```

또는 `run-stage2b.cmd`를 실행하거나 project JSON을 CMD 파일 위에 드래그할 수 있습니다.

Stage 2A 프로젝트는 기존 `run-stage2a.ps1` / `run-stage2a.cmd`로 계속 실행할 수 있습니다.

## Stage 2B 검증 샘플

### Music-driven Short

`samples/stage2b-music/project.json`

- 1080×1920 / 30 fps / 14 s
- deterministic 120 BPM CI fixture
- BPM 분석 약 120 BPM / confidence 약 0.995
- 4개 내부 scene boundary 모두 안전한 인접 beat로 snap
- 총 영상 길이 유지
- video QA PASS
- audio QA PASS

### Narration-driven Long

`samples/stage2b-narration/project.json`

- 1920×1080 / 30 fps / 14 s
- external BGM path
- narration file path
- timed caption cues
- sidechain BGM ducking
- full-duration narration-sidechain padding
- 2-pass loudness normalization
- video QA PASS
- audio QA PASS

TTS 모드는 HyperFrames CLI `tts` adapter가 연결되어 있습니다. CI는 재현성을 위해 file narration을 검증하며 외부/cloud TTS 공급자 자체를 CI acceptance 대상으로 간주하지 않습니다.

## QA

기존 최종 MP4 규격은 유지합니다.

- H.264 Main
- yuv420p
- 30 fps
- AAC 48 kHz stereo
- MP4 faststart
- FFmpeg full-decode

Stage 2B는 별도 mixed-audio QA도 수행합니다.

- expected duration
- 48 kHz
- stereo
- full decode
- integrated LUFS target guard
- true-peak guard

## 출력 위치

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
```

## 최종 검증 기준

Stage 2B implementation baseline commit `4821b03887790c609081f25ae7a898e4d4f43f9b`는 GitHub Actions run `31674429248`에서 **Stage 1 → Stage 1.1 → Stage 2A → Stage 2B Music Short → Stage 2B Narration Long** 전체 회귀를 `success`로 통과했습니다.

다음 단계는 **Stage 2C — Lightweight Web UI**입니다. UI는 새 파이프라인을 만드는 것이 아니라 현재 검증된 schema v3 / runner / QA를 편집·호출하는 얇은 계층으로 구현합니다.
