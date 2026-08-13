# DESIGN — Character style showcase presets

## Core visual rule

캐릭터 전신 이미지는 훼손하지 않고 충분한 여백을 둔다. 텍스트는 원본 마스터 시트의 정보 위를 과도하게 덮지 않으며, LOOK 번호 → 무드 → 제목 → 짧은 설명 → 선택적 태그가 명확한 계층을 가진다. 모든 프리셋은 동일한 Stage 1 렌더/QA 코어와 안전영역 규칙을 공유한다.

## Stage 1.1 Visual Presets

### 1. `editorial-clean` — default

- Canvas `#F6F4F0`
- Panel `#FFFFFF`
- Text `#111111`
- Accent `#C8FF3D`
- Divider `#D9D9D9`
- Long: 캐릭터 53% / 정보 47%
- Short: 캐릭터 약 66%
- 성격: 밝고 정돈된 패션 에디토리얼, 현재 Stage 1 기본 디자인

### 2. `fashion-luxury`

- Canvas `#111111`
- Panel `#1B1B1B`
- Text `#F7F4EE`
- Accent `#D7B56D`
- Divider `#393939`
- Long: 캐릭터 56% / 정보 44%
- Short: 캐릭터 약 69%
- 성격: 어두운 프리미엄 행사/패션 무드, 느린 미세 줌, 절제된 골드 강조

### 3. `social-dynamic`

- Canvas `#F4F7FF`
- Panel `#FFFFFF`
- Text `#10131A`
- Accent `#5B6CFF`
- Divider `#CBD3E6`
- Long: 캐릭터 50% / 정보 50%
- Short: 캐릭터 약 63%
- 성격: 모바일 숏폼 친화적인 강한 타이포그래피와 빠른 전환

## Caption Presets

### `minimal-lower-third`

- 챕터 원형과 태그를 생략하고 핵심 제목/설명에 집중
- 얇은 accent line으로 정보 블록을 정리
- 화면이 복잡한 원본 이미지에 우선 사용

### `editorial-card` — default

- 챕터 원형 + eyebrow + 제목 + 1-line 설명 + 태그
- 패션 카탈로그/스타일 가이드에 적합

### `bold-kinetic`

- 제목 크기를 키우고 대비 블록을 사용
- 태그에 accent 색상을 사용
- Short hook과 빠른 SNS 콘텐츠에 적합

## Audio Presets

### `minimal-electronic` — default

- Long 92 BPM / Short 104 BPM
- soft pad + subdued kick + light hat + whoosh/chime

### `soft-ambient`

- Long 76 BPM / Short 84 BPM
- pad 중심, kick/hat 최소화, SFX도 부드럽게 감소

### `fashion-beat`

- Long 108 BPM / Short 124 BPM
- kick/hat 강조, transition SFX를 조금 더 선명하게 사용

BGM/SFX는 외부 저작권 음원을 기본값으로 사용하지 않고 코드에서 결정론적으로 합성한다. `bgmVolume`과 `sfxVolume`은 0~1 범위에서 별도로 조절한다.

## Typography

- Korean: `Noto Sans KR`, `Noto Sans CJK KR`, sans-serif
- Latin fallback: `Inter`, `Arial`, sans-serif
- Headline: 700–900 weight
- Body: 400–500 weight
- 숫자 챕터는 시각적 앵커로 사용하고 설명은 한 화면 최대 2줄을 우선한다.

## Layout safety

### Long

- 1920×1080 / 30 fps
- `object-fit: contain`
- 안전 여백: 좌우 96px / 상하 72px 이상
- 기본 장면 길이 3초

### Short

- 1080×1920 / 30 fps
- 상단 micro navigation + 캐릭터 카드 + 하단 caption 구조
- 얼굴과 발이 모두 필요한 전신 룩은 `contain`
- 기본 장면 길이 3초

## Motion rules

1. 콘텐츠는 CSS의 최종 위치를 기준으로 `gsap.from()`으로 진입한다.
2. 장면 자체를 미리 fade-out하지 않는다. 전환 레이어가 scene exit 역할을 한다.
3. 이미지 모션은 프리셋별 약 `1.012~1.028` 범위의 미세 줌으로 제한한다.
4. Caption motion: metadata reveal / chapter scale / title vertical reveal / tag stagger.
5. Transition은 accent wipe / reverse wipe / center split의 세 계열을 사용하며 프리셋별 속도만 조절한다.
6. 하단 progress bar는 현재 visual preset의 accent 색상을 따른다.
7. bounce, spin, 3D flip 등 과도한 모션은 사용하지 않는다.

## Output profile

- Acceptance default: `high`
- Long: 1920×1080 / Short: 1080×1920
- Video: H.264 Main, yuv420p, 30 fps, faststart
- High: CRF 17 / slow / AAC 192 kbps
- Standard: CRF 19 / medium / AAC 160 kbps
- Draft: CRF 22 / fast / AAC 128 kbps

## What NOT to Do

- 전신 캐릭터의 머리나 신발을 잘라내는 강제 확대
- 원본 마스터 시트의 설명 텍스트 위에 큰 새 자막을 직접 겹치기
- 3줄 이상의 긴 본문 캡션
- 장면 사이 검은 빈 프레임
- 과도한 BGM/SFX
- 무한 반복 애니메이션 (`repeat: -1`)
- preset 때문에 compatibility encode / QA / renderer selection 코어를 별도 구현하기
