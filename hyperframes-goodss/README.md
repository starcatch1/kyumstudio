# hyperframes-goodss — Stage 1.1 Preset RC

캐릭터 스타일 마스터 시트 1장을 입력해 **롱폼(16:9)** 과 **숏폼(9:16)** 스타일 소개 영상을 반복 생성하는 HyperFrames 프로젝트입니다.

## 현재 상태

- **Stage 1 engineering core: COMPLETE / frozen**
- **Stage 1.1 preset system: implemented and CI render PASS**
- 마지막 release gate: 최신 Stage 1.1 코드 + 실제 사용자 마스터 시트의 최종 human acceptance 1회

Stage 1의 compatibility encode, renderer selection, full-decode QA, Windows runner, CI gate는 새 프리셋 기능 때문에 별도로 재구현하지 않습니다.

## Stage 1.1 프리셋

### Visual

- `editorial-clean` — 밝고 정돈된 현재 기본 패션 에디토리얼
- `fashion-luxury` — dark / gold / premium / slower motion
- `social-dynamic` — 모바일 숏폼용 강한 대비와 빠른 전환

### Caption

- `minimal-lower-third`
- `editorial-card`
- `bold-kinetic`

### Audio

- `minimal-electronic`
- `soft-ambient`
- `fashion-beat`

BGM/SFX는 코드에서 결정론적으로 생성하며 `bgmVolume`, `sfxVolume`을 별도로 조정할 수 있습니다.

## 단일 설정 파일

`config/project.json`

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

프리셋 정의는 `config/presets.json`이 source of truth입니다.

## Windows 실행

기본 프리셋으로 가장 쉽게 실행하려면 `run-stage1.cmd` 위에 마스터 시트 이미지를 드래그 앤 드롭합니다.

PowerShell에서 프리셋을 직접 지정할 수도 있습니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage1.ps1 `
  -MasterSheet "C:\path\master-sheet.png" `
  -Quality high `
  -Renderer auto `
  -VisualPreset fashion-luxury `
  -CaptionPreset minimal-lower-third `
  -AudioPreset soft-ambient `
  -BgmVolume 0.18 `
  -SfxVolume 0.24
```

## 전체 파이프라인

```text
master sheet
→ 12 look extraction
→ resolve Stage 1.1 config
→ preset-driven BGM/SFX generation
→ preset-driven Long/Short composition generation
→ independent project preparation
→ static validation
→ HyperFrames render preferred / Chromium fallback
→ H.264/AAC compatibility encode
→ ffprobe + full FFmpeg decode QA
→ final MP4
```

## 최종 파일

```text
renders/style-showcase-long-fixed.mp4
renders/style-showcase-short-fixed.mp4
renders/qa-long.json
renders/qa-short.json
renders/inspect-long.json
renders/inspect-short.json
```

## Stage 1.1 CI 검증

CI는 기본 Stage 1 경로에 더해 아래 3개 대표 조합을 실제 Short MP4까지 렌더하고 codec/full-decode QA를 수행합니다.

1. editorial-clean + editorial-card + minimal-electronic
2. fashion-luxury + minimal-lower-third + soft-ambient
3. social-dynamic + bold-kinetic + fashion-beat

이 테스트는 저해상도/저fps CI capture를 사용하므로 **파이프라인 회귀 검증용**이며 최종 화질 평가용이 아닙니다.

## 출력 규격

- Long: 1920×1080 / 30 fps / 약 30 s
- Short: 1080×1920 / 30 fps / 약 17 s
- Video: H.264 Main / yuv420p / faststart
- Audio: AAC / 48 kHz / stereo
- Acceptance default: `high`

| Profile | Video | Preset | Audio |
|---|---|---|---|
| high | CRF 17 | slow | AAC 192 kbps |
| standard | CRF 19 | medium | AAC 160 kbps |
| draft | CRF 22 | fast | AAC 128 kbps |

## Acceptance 원칙

자동 QA가 PASS하더라도 실제 마스터 시트를 사용한 최종 릴리스에서는 사람이 다음을 확인합니다.

- 얼굴/발의 의도치 않은 crop 없음
- 한국어 자막 안전영역/가독성
- blank/black error frame 없음
- BGM/SFX 음량이 방해되지 않음
- seek 및 끝까지 재생 정상

Stage 1.1 구현 상태와 남은 실제 마스터 acceptance는 `STAGE1_1_STATUS.md`에 기록합니다.
