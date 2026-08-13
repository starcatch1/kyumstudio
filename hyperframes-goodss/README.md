# hyperframes-goodss — Stage 2A Data-driven Engine

HyperFrames 기반 영상 생성 프로젝트입니다. Stage 1/1.1에서 검증한 렌더·호환 인코딩·QA 코어를 유지하면서, Stage 2A부터는 **`project.json`이 콘텐츠와 타임라인의 source of truth**가 됩니다.

## 현재 상태

- **Stage 1 engineering core: COMPLETE / frozen**
- **Stage 1.1 preset system: ACCEPTED / frozen semantics**
- **Stage 2A generic project schema + timing engine: COMPLETE / CI PASS**
- 다음 개발: **Stage 2B external audio / beat sync / narration**

상세 판정은 `STAGE1_1_STATUS.md`, `STAGE2A_STATUS.md`에 기록합니다.

## Stage 2A 핵심 변화

이전에는 마스터 시트 12룩과 Long/Short 장면 구성이 코드에 가까이 묶여 있었습니다. 이제 아래 항목을 프로젝트 데이터로 정의합니다.

```text
project.json
→ asset registry (image / video)
→ compositions
→ arbitrary scenes
→ per-scene duration / transition / layout / text
→ validation
→ HyperFrames or Chromium render
→ frozen H.264/AAC compatibility encode
→ frozen full-decode QA
```

## 프로젝트 구조 예시

```json
{
  "schemaVersion": 2,
  "id": "my-video",
  "quality": "high",
  "presets": {
    "visual": "editorial-clean",
    "caption": "editorial-card",
    "audio": "minimal-electronic"
  },
  "assets": {
    "hero": { "type": "image", "src": "assets/hero.png" },
    "clip": { "type": "video", "src": "assets/clip.mp4" }
  },
  "compositions": [
    {
      "id": "main",
      "width": 1920,
      "height": 1080,
      "fps": 30,
      "duration": "auto",
      "scenes": [
        {
          "id": "intro",
          "kind": "title",
          "duration": 2.5,
          "layout": "center",
          "transition": { "type": "lime-wipe", "duration": 0.5 },
          "text": { "title": "My Video" }
        },
        {
          "id": "hero-scene",
          "kind": "media",
          "asset": "hero",
          "duration": 3.2,
          "layout": "full",
          "transition": "cut",
          "text": { "title": "Data-driven scene" }
        }
      ]
    }
  ]
}
```

정식 구조 정의는 `config/project.schema.v2.json`을 참고합니다.

## 지원 범위

### Assets

- image
- video
- video `mediaStart`

### Scenes

- `title`
- `media`
- `text`
- `end`

### Layouts

- `center`
- `split`
- `full`

### Transitions

- `cut`
- `lime-wipe`
- `black-wipe`
- `center-split`

### Timing

- 장면별 자유로운 `duration`
- `start` 생략 시 순차 자동 배치
- 필요하면 명시적 `start`
- composition `duration: "auto"`
- 동일 track overlap 검증
- duration/asset/transition timing 검증

현재 Stage 2A 출력은 기존 QA 호환성을 위해 30 fps를 기준으로 합니다.

## 프리셋

Stage 1.1의 프리셋을 그대로 재사용합니다.

Visual:
- `editorial-clean`
- `fashion-luxury`
- `social-dynamic`

Caption:
- `minimal-lower-third`
- `editorial-card`
- `bold-kinetic`

Audio:
- `minimal-electronic`
- `soft-ambient`
- `fashion-beat`

## Windows 실행

기본 Stage 2A 프로젝트 실행:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage2a.ps1 `
  -ProjectFile .\project.json `
  -Quality high `
  -Renderer auto
```

또는 `run-stage2a.cmd`를 실행합니다. 다른 project JSON을 CMD 파일 위에 드래그해도 됩니다.

기존 캐릭터 마스터 시트를 갱신하면서 Stage 2A 프로젝트를 만들 경우:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage2a.ps1 `
  -ProjectFile .\project.json `
  -MasterSheet "C:\path\character-master-sheet.png" `
  -Quality high `
  -Renderer auto
```

## 검증 샘플

### Character showcase

`project.json`

- 12 image assets
- Long: 1920×1080 / 30 s / 10 scenes
- Short: 1080×1920 / 17 s / 6 scenes

### Non-character image + video

`samples/non-character/project.json`

- image/SVG assets
- moving H.264 video fixture
- 1280×720 / 13.2 s / 5 scenes
- 2.0 / 2.8 / 3.2 s 등 서로 다른 scene duration

두 프로젝트 모두 같은 Stage 2A generator/runner를 사용하고 codec/full-decode QA를 통과합니다.

## 출력 위치

```text
renders/stage2a/<project-id>/
  <composition-id>-fixed.mp4
  <composition-id>-qa.json
  <composition-id>-inspect.json
  project-validation.json
  build-report.json
```

최종 MP4 규격은 기존 검증 규격을 유지합니다.

- H.264 Main
- yuv420p
- 30 fps
- AAC 48 kHz stereo
- MP4 faststart
- FFmpeg full-decode QA

## 개발 원칙

Stage 2A는 기존 렌더러/QA를 대체하지 않습니다. 콘텐츠 계약을 바깥으로 분리하고 검증된 Stage 1 코어를 재사용합니다.

다음 단계인 **Stage 2B**에서는 이 프로젝트 데이터 구조 위에 외부 음악, beat/onset 분석, beat-aware transition, narration/TTS, ducking, mix QA를 추가합니다.
