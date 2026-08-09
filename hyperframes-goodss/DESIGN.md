# DESIGN — Editorial character style guide

## Style Prompt

밝은 오프화이트 캔버스 위에 패션 에디토리얼의 정돈된 그리드와 강한 흑백 타이포그래피를 사용한다. 캐릭터 전신 이미지는 훼손하지 않고 충분한 여백을 두며, 텍스트는 이미지 위를 과도하게 덮지 않는다. 룩 번호, 제목, 짧은 설명, 태그가 명확한 계층을 가진다. 모션은 빠른 숏폼에서도 읽을 수 있을 만큼 단순하고 명료하며, 롱폼에서는 이미지 감상을 방해하지 않는 느린 패닝과 미세 줌을 사용한다.

## Colors

- `#F6F4F0` — Canvas / warm off-white
- `#111111` — Primary text / strong panels
- `#FFFFFF` — Inverse text / cards
- `#C8FF3D` — Accent / chapter, transition, progress
- `#D9D9D9` — Divider / secondary UI

## Typography

- Korean: `Noto Sans KR`, `Noto Sans CJK KR`, sans-serif
- Latin fallback: `Inter`, `Arial`, sans-serif
- Headline: 700–900 weight
- Body: 400–500 weight
- 숫자 챕터는 크게, 설명은 한 화면 최대 2줄

## Long layout

- 1920×1080
- 캐릭터 영역 약 54%, 정보 영역 약 46%
- 전신 룩은 발끝까지 보이게 `object-fit: contain`
- 안전 여백: 좌우 96px / 상하 72px 이상
- 기본 장면 길이 3초

## Short layout

- 1080×1920
- 캐릭터 중심 세로 레이아웃
- 하단 25% 영역을 캡션 안전 영역으로 유지
- 얼굴과 발이 모두 필요한 장면은 `contain`, 분위기 강조 장면만 제한적으로 `cover`
- 기본 장면 길이 3초

## Motion rules

1. 모든 장면의 실제 콘텐츠는 `gsap.from()`으로 진입한다.
2. 장면 자체의 exit animation은 사용하지 않는다. 컬러 와이프 transition이 exit 역할을 한다.
3. 이미지 모션: `scale 0.98 → 1.025` 또는 `x/y 20px` 이내의 미세 이동.
4. 캡션 모션 3종:
   - Lower third slide-up
   - Chapter number scale/reveal
   - Keyword/tag stagger
5. Transition 3종:
   - Lime wipe left→right
   - Black wipe right→left
   - Center split/reveal
6. 한 장면 안에서 동일 entrance 패턴을 반복하지 않는다.
7. 과도한 bounce, spin, 3D flip은 금지한다.

## What NOT to Do

- 전신 캐릭터의 머리나 신발을 잘라내는 강제 확대
- 원본 마스터 시트의 설명 텍스트 위에 새 자막을 겹치기
- 3줄 이상의 긴 캡션
- 화면 전체에 과도한 그라디언트
- 무한 반복 애니메이션 (`repeat: -1`)
- 장면 전환 직전에 콘텐츠를 미리 fade-out 하기
