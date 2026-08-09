# Stage 1 status

## 목표

캐릭터 마스터 시트 1장으로 30초 롱폼과 15~20초 숏폼을 반복 생성하고, 브라우저 호환 MP4와 자동 QA 결과를 얻는다.

## P0 구현 상태

| 항목 | 상태 | 비고 |
|---|---|---|
| Stage 1 범위 동결 | DONE | TTS/BGM/AI 영상 제외 |
| DESIGN.md | DONE | Editorial / 전신 보존 / 자막 규칙 |
| 12 Look 데이터 | DONE | `data/looks.json` |
| Master sheet extractor | DONE | FFmpeg, 6×2 contract |
| Long composition generator | DONE | 1920×1080 / 30초 |
| Short composition generator | DONE | 1080×1920 / 17초 |
| 자막 스타일 3종 이상 | DONE | lower/boxed/vertical/tag variants |
| Transition 3종 | DONE | lime/black/split wipe |
| GSAP local vendor setup | DONE | CDN 의존 제거 |
| Build pipeline | DONE | `scripts/build-all.ps1` |
| H.264/AAC compatibility encoder | DONE | Main/yuv420p/faststart |
| Automated video QA | DONE | codec/fps/audio/faststart/full decode |
| HyperFrames CLI lint | PENDING RUN | 실행 환경 필요 |
| HyperFrames inspect | PENDING RUN | Long/Short 각각 검사 |
| Long raw render | PENDING RUN | CLI 실행 필요 |
| Short raw render | PENDING RUN | CLI 실행 필요 |
| Final compatibility encode | PENDING RUN | raw render 이후 |
| Final QA PASS | PENDING RUN | `qa-long.json`, `qa-short.json` |
| User playback confirmation | PENDING | 최종 Stage 1 gate |

## 알려진 위험

### 1. HyperFrames CLI availability

이전 샘플 제작 환경에서는 공식 `npx hyperframes` 패키지 설치가 불가능했던 기록이 있다. 이번 Stage 1은 `scripts/setup.ps1`에서 이를 가장 먼저 검사하고, 사용할 수 없으면 렌더를 진행하지 않고 명시적으로 실패한다.

### 2. Master sheet crop contract

현재 extractor는 이번 프로젝트의 6열×2행 마스터 시트 포맷을 대상으로 한다. 다른 형식은 Stage 1 범위가 아니며 crop contract 수정이 필요하다.

### 3. Browser playback

Raw render를 최종본으로 제공하지 않는다. 반드시 `compat-encode.ps1`을 거쳐 H.264 Main / yuv420p / AAC 48k / faststart로 재인코딩한 `*-fixed.mp4`만 검수한다.

## 다음 실행 게이트

Windows 11 작업 PC에서 아래 순서로 실행한다.

```powershell
cd hyperframes-goodss
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\build-all.ps1 -Quality draft
```

모든 단계가 성공하면:

```text
renders/style-showcase-long-fixed.mp4
renders/style-showcase-short-fixed.mp4
renders/qa-long.json
renders/qa-short.json
```

이 4개가 만들어지고 두 QA의 `ok`가 `true`이며 사용자가 두 MP4를 실제 재생했을 때 Stage 1을 완료로 변경한다.
