# hyperframes-goodss — Stage 1 COMPLETE

캐릭터 스타일 마스터 시트 1장을 입력해 **롱폼(16:9)** 과 **숏폼(9:16)** 스타일 소개 영상을 반복 생성하는 Stage 1 프로젝트입니다.

## 현재 상태

**Stage 1 engineering acceptance: COMPLETE**

사용자 실제 재생 확인을 통과했고, 고화질 acceptance 렌더 및 최신 GitHub Actions end-to-end smoke test에서 전체 파이프라인이 PASS했습니다. 완료 판정 근거는 `STAGE1_COMPLETE.md`에 기록합니다.

## Stage 1 파이프라인

```text
master sheet
→ 12 look extraction
→ deterministic BGM + transition SFX generation
→ data-driven Long / Short composition generation
→ independent project preparation
→ static validation
→ HyperFrames render (preferred) or deterministic Chromium fallback
→ high-quality H.264/AAC compatibility encode
→ ffprobe validation
→ full FFmpeg decode QA
→ final MP4
```

## 최종 규격

- Long: 1920×1080 / 30 fps / 30 s
- Short: 1080×1920 / 30 fps / 17 s
- Video: H.264 Main / yuv420p / faststart
- Audio: AAC / 48 kHz / stereo
- Transition: lime wipe / black reverse wipe / center split
- Audio: deterministic minimal electronic BGM + whoosh/chime SFX
- Acceptance default quality: `high` (CRF 17 / slow / AAC 192 kbps)

## 가장 쉬운 Windows 실행

`run-stage1.cmd` 위에 마스터 시트 이미지를 드래그 앤 드롭합니다.

자동으로 다음을 수행합니다.

```text
input image
→ source normalization
→ environment setup
→ 12-look extraction
→ BGM/SFX generation
→ Long/Short composition
→ render
→ high-quality compatibility encode
→ automated QA
→ two final MP4 files open
```

PowerShell 직접 실행:

```powershell
powershell -ExecutionPolicy Bypass -File .\run-stage1.ps1 `
  -MasterSheet "C:\path\master-sheet.png" `
  -Quality high `
  -Renderer auto
```

최종 파일:

```text
renders/style-showcase-long-fixed.mp4
renders/style-showcase-short-fixed.mp4
renders/qa-long.json
renders/qa-short.json
renders/inspect-long.json
renders/inspect-short.json
```

## 품질 프로필

| Profile | Video | Preset | Audio |
|---|---|---|---|
| high | CRF 17 | slow | AAC 192 kbps |
| standard | CRF 19 | medium | AAC 160 kbps |
| draft | CRF 22 | fast | AAC 128 kbps |

CI는 빠른 smoke test를 위해 `draft`와 낮은 fallback capture rate를 사용합니다. 실제 acceptance와 사용자 출력은 `high`가 기본값입니다.

## Stage 1 QA

최종 `*-fixed.mp4`만 acceptance 대상으로 사용합니다.

```text
[PASS] file exists and has meaningful size
[PASS] H.264 Main
[PASS] yuv420p
[PASS] target resolution
[PASS] 30 fps
[PASS] AAC audio / 48 kHz / stereo
[PASS] valid duration
[PASS] MP4 faststart
[PASS] full-file decode without FFmpeg errors
```

## Stage 1에서 완료된 디자인/모션

- Long: 캐릭터 53% + 정보 47% editorial layout
- Short: micro navigation + image card + caption layout
- 4가지 Short caption variation
- chapter / metadata / title / tag entrance hierarchy
- restrained image zoom
- lime progress bar
- 3종 transition
- 검은 빈 프레임을 만들지 않는 transition policy
- 코드에서 재현 가능한 BGM/SFX

## 다음 개발

Stage 1 파이프라인은 고정합니다. 이후 시각적 취향 조정은 **Stage 1.1**, 기능 확장은 **Stage 2**에서 진행합니다.

Stage 1.1 후보:
- visual preset 2~3개
- BGM preset 2~3개
- caption preset 선택

Stage 2 후보:
- TTS / narration
- 외부 음악 beat sync
- timing editor
- AI video/image asset 조합
- 웹 UI 기반 입력·편집·렌더
