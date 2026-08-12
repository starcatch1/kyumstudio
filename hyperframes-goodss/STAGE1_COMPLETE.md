# hyperframes-goodss — Stage 1 Completion Decision

**Decision:** COMPLETE  
**Date:** 2026-08-13 (KST)  
**Scope:** 캐릭터 스타일 마스터 시트 → Long/Short 스타일 소개 영상 반복 생성 파이프라인

## 1. Stage 1 목표

캐릭터 스타일 마스터 시트 1장을 입력하면 12개 룩을 추출하고, 데이터 기반 Long/Short composition을 생성한 뒤 재생 호환 MP4까지 안정적으로 출력하는 Ver.1 파이프라인을 완성한다.

## 2. 완료된 기능

- 6×2 마스터 시트에서 12개 룩 자동 추출
- `data/looks.json` 기반의 장면 데이터 관리
- Long 1920×1080 / Short 1080×1920 독립 composition
- 자막 계층 및 Long/Short 전용 레이아웃
- 4종 숏폼 caption variation
- 미세 이미지 줌과 caption entrance
- 3종 scene transition
  - lime wipe
  - black reverse wipe
  - center split/reveal
- 검은 빈 프레임을 만들지 않는 transition 정책
- 전체 progress bar
- 코드에서 결정론적으로 생성하는 BGM + transition SFX
- High / Standard / Draft 출력 프로필
- H.264 Main / yuv420p / AAC / faststart 호환 인코딩
- FFmpeg full decode QA
- HyperFrames CLI 우선 + deterministic Chromium fallback
- Windows drag-and-drop acceptance runner
- GitHub Actions end-to-end smoke test

## 3. Acceptance 기록

이전 Stage 1 smoke test에서 Long/Short 모두 실제 재생이 정상임을 사용자 확인으로 통과했다. 이후 고화질 acceptance 단계에서 1920×1080 Long과 1080×1920 Short를 생성하고 코덱 및 full decode QA를 통과했다.

이번 Stage 1 마감 수정에서는 다음을 추가했다.

1. 자막/레이아웃 계층 미세 조정
2. scene transition 강화 및 black error frame 방지
3. deterministic BGM/SFX 생성 파이프라인
4. acceptance 기본 품질을 `high`로 변경

## 4. 완료 판정 기준

| Gate | Result |
|---|---|
| Master sheet input | PASS |
| 12-look extraction | PASS |
| Data-driven composition | PASS |
| Long render | PASS |
| Short render | PASS |
| Caption/layout system | PASS |
| 3 transition types | PASS |
| BGM/SFX pipeline | PASS |
| H.264/AAC compatibility | PASS |
| faststart | PASS |
| Full-file decode QA | PASS |
| Reproducible build | PASS |
| Human playback | PASS |

## 5. Stage 1 이후 변경 규칙

Stage 1의 목표는 기능 확장이 아니라 **안정적으로 재생 가능한 반복 제작 파이프라인**이었다. 이 기준은 충족되었으므로 Stage 1을 COMPLETE로 판정한다.

이후 아래 항목은 Stage 1 결함이 아니라 Stage 1.1 또는 Stage 2 개선 항목으로 관리한다.

- 개인 취향에 따른 자막 디자인 변경
- BGM 장르/템포 선택 UI
- TTS/narration
- 외부 음원 beat sync
- AI 영상 클립 사용
- 자동 얼굴/의상 crop 분석
- 템플릿 라이브러리 확대
- 웹 UI에서 입력/편집/렌더 실행

## 6. 권장 다음 단계

**Stage 1.1:** 실제 콘텐츠 제작에 필요한 visual preset 2~3개와 BGM preset을 추가하되 현재 P0 렌더/QA 파이프라인은 변경하지 않는다.

그 이후 **Stage 2:** TTS, BGM 선택, SFX variation, timing editor, 외부 영상/이미지 asset 조합으로 확장한다.
