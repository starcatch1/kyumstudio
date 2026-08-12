# hyperframes-goodss — Stage 1

캐릭터 스타일 마스터 시트 1장을 입력해 **롱폼(16:9)** 과 **숏폼(9:16)** 스타일 소개 영상을 반복 생성하는 Stage 1 프로젝트입니다.

## 현재 상태 — Automated Gate PASS

2026-08-12 기준 GitHub Actions end-to-end smoke test가 연속으로 통과했습니다.

자동으로 검증된 흐름:

```text
master sheet
→ 12 look extraction
→ data-driven composition generation
→ independent Long / Short project preparation
→ static project validation
→ Chromium render (fallback)
→ H.264/AAC compatibility encode
→ ffprobe codec validation
→ full FFmpeg decode QA
→ artifact upload
```

자동화 게이트에서 확인한 최종 규격:

- Long: 1920×1080 / 30 fps / 30 s
- Short: 1080×1920 / 30 fps / 17 s
- Video: H.264 Main / yuv420p
- Audio: AAC / 48 kHz / stereo
- MP4 faststart: PASS
- Full decode: PASS

**Stage 1 최종 완료 판정은 아직 보류합니다.** 남은 마지막 게이트는 실제 사용자 캐릭터 마스터 시트를 사용한 acceptance render와 사용자의 실제 재생·육안 검수입니다.

## Stage 1 완료 기준

- 마스터 시트 1장 → 12개 룩 자산 추출
- `data/looks.json` 기반 장면 데이터 관리
- Long / Short composition 생성
- 최소 3종 자막 표현과 3종 장면 전환
- H.264 Main + yuv420p + AAC + faststart 호환 MP4 생성
- FFmpeg 전체 디코딩 검사 통과
- 동일 입력으로 재빌드 가능한 단일 명령 파이프라인
- 실제 마스터 시트로 Long / Short 렌더 성공
- 사용자가 두 MP4를 실제로 재생하고 가독성·크롭·전환을 승인

## 프로젝트 구조

```text
hyperframes-goodss/
├─ assets/
│  ├─ source/character-master-sheet.png   # 실제 입력
│  └─ looks/                              # 자동 추출 결과
├─ data/
│  └─ looks.json
├─ compositions/
│  └─ style-short.html                    # 생성 중간 산출물
├─ projects/
│  ├─ long/index.html                     # 독립 Long 프로젝트
│  └─ short/index.html                    # 독립 Short 프로젝트
├─ renders/
├─ vendor/
│  └─ gsap.min.js                         # 로컬 deterministic runtime
├─ scripts/
│  ├─ setup.ps1
│  ├─ extract-looks.mjs
│  ├─ generate-compositions.mjs
│  ├─ prepare-projects.mjs
│  ├─ validate-projects.mjs
│  ├─ render-fallback.mjs
│  ├─ compat-encode.ps1
│  ├─ qa-video.mjs
│  └─ build-all.ps1
├─ DESIGN.md
├─ index.html                             # 생성 중간 Long composition
└─ package.json
```

## 렌더러 정책

`build-all.ps1 -Renderer auto`는 다음 순서로 동작합니다.

1. 공식 `npx hyperframes` CLI가 사용 가능하면 HyperFrames의 `lint → inspect → render`를 우선합니다.
2. CLI를 사용할 수 없는 환경에서는 Chromium fallback renderer로 HTML/GSAP 타임라인을 결정론적으로 캡처합니다.
3. 어느 렌더러를 쓰더라도 최종 파일은 동일한 compatibility encode와 QA 게이트를 통과해야 합니다.

fallback은 공식 HyperFrames를 대체하는 최종 제품 기능이 아니라 **Stage 1의 렌더·재생 파이프라인이 CLI 설치 문제 때문에 중단되지 않도록 하는 검증 경로**입니다.

## 요구 환경

- Windows 11 우선
- Node.js 22+
- FFmpeg / ffprobe
- Chrome 또는 Edge
- HyperFrames CLI는 권장(사용 가능할 때 자동 우선)

## 빠른 실행

1. 실제 캐릭터 마스터 시트를 저장합니다.

```text
assets/source/character-master-sheet.png
```

2. 최초 한 번 설정합니다.

```powershell
cd hyperframes-goodss
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
```

3. Stage 1 acceptance build를 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-all.ps1 -Quality draft -Renderer auto
```

공식 CLI를 건너뛰고 fallback만 시험하려면:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-all.ps1 -Quality draft -Renderer fallback
```

4. 성공 시 확인할 파일:

```text
renders/style-showcase-long-fixed.mp4
renders/style-showcase-short-fixed.mp4
renders/qa-long.json
renders/qa-short.json
renders/inspect-long.json
renders/inspect-short.json
```

## QA 원칙

raw MP4는 사용자 검수용 최종 파일이 아닙니다. `*-fixed.mp4`만 사용합니다.

자동 QA는 다음을 모두 검사합니다.

```text
[PASS] file exists and has meaningful size
[PASS] H.264 video
[PASS] Main profile
[PASS] yuv420p
[PASS] target resolution
[PASS] 30 fps
[PASS] AAC audio
[PASS] 48 kHz stereo
[PASS] valid duration
[PASS] MP4 faststart
[PASS] full-file decode without FFmpeg errors
```

## 남은 Stage 1 작업

1. 실제 캐릭터 마스터 시트로 acceptance build 실행
2. Long / Short 결과를 Chrome/Edge 및 Windows 플레이어에서 실제 재생
3. 인물 전신 크롭, 한국어 가독성, 자막 안전영역, 전환 타이밍 육안 검수
4. 발견된 결함만 수정한 뒤 동일 입력으로 재빌드
5. 사용자 승인 시 **Stage 1 COMPLETE**로 태깅

TTS, BGM, SFX, AI 영상 생성, 추가 템플릿은 Stage 1 승인 후 Stage 2에서 진행합니다.
