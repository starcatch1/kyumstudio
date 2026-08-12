# DESIGN — Editorial character style guide

## Style Prompt

밝은 오프화이트 캔버스 위에 패션 에디토리얼의 정돈된 그리드와 강한 흑백 타이포그래피를 사용한다. 캐릭터 전신 이미지는 훼손하지 않고 충분한 여백을 두며, 텍스트는 이미지 위를 과도하게 덮지 않는다. 룩 번호, 영문 무드, 한글 제목, 짧은 설명, 태그가 명확한 계층을 가진다. 모션은 빠른 숏폼에서도 읽을 수 있을 만큼 단순하고 명료하며, 롱폼에서는 이미지 감상을 방해하지 않는 미세 줌을 사용한다.

## Colors

- `#F6F4F0` — Canvas / warm off-white
- `#111111` — Primary text / strong panels
- `#FFFFFF` — Image cards / inverse text
- `#C8FF3D` — Accent / chapter, transition, progress
- `#D9D9D9` — Divider / secondary UI

## Typography

- Korean: `Noto Sans KR`, `Noto Sans CJK KR`, sans-serif
- Latin fallback: `Inter`, `Arial`, sans-serif
- Headline: 700–900 weight
- Body: 400–500 weight
- 숫자 챕터는 시각적 앵커로 사용하고 설명은 한 화면 최대 2줄을 우선한다.

## Long layout

- 1920×1080 / 30 fps
- 캐릭터 영역 53%, 정보 영역 47%
- 전신 룩은 `object-fit: contain`
- 안전 여백: 좌우 96px / 상하 72px 이상
- 정보 계층: LOOK label → chapter → English mood → Korean title → 1-line description → tags
- 기본 장면 길이 3초

## Short layout

- 1080×1920 / 30 fps
- 상단 micro navigation + 캐릭터 카드 + 하단 caption의 3단 구조
- 캐릭터 영역 약 66%, caption 약 30%
- 하단 caption 안전 여백 유지
- 4개 룩에서 caption-a/b/c/d를 순환해 자막 표현에 변화를 준다.
- 기본 장면 길이 3초

## Motion rules

1. 콘텐츠는 CSS의 최종 위치를 기준으로 `gsap.from()`으로 진입한다.
2. 장면 자체를 미리 fade-out하지 않는다. 전환 레이어가 scene exit 역할을 한다.
3. 이미지 모션은 `scale 0.982~0.985 → 1.014~1.018` 범위의 미세 줌으로 제한한다.
4. Caption motion:
   - metadata slide/reveal
   - chapter scale/reveal
   - title vertical reveal
   - keyword/tag stagger
5. Transition 3종:
   - Lime wipe left→right
   - Black wipe right→left
   - Center split/reveal
6. 하단에 얇은 lime progress bar를 사용해 전체 진행감을 표시한다.
7. 과도한 bounce, spin, 3D flip은 사용하지 않는다.

## Audio identity

- 외부 저작권 음원을 기본값으로 사용하지 않는다.
- Stage 1 기본 BGM은 코드에서 결정론적으로 합성한 미니멀 electronic fashion bed를 사용한다.
- BGM 구성: soft pad + subdued kick + light hat.
- Scene boundary마다 짧은 stereo whoosh + chime SFX를 사용한다.
- 오디오는 48 kHz stereo로 생성하고 최종 MP4에서 AAC로 인코딩한다.
- BGM/SFX는 영상 정보를 방해하지 않는 낮은 레벨을 유지한다.

## Output profile

- Acceptance default: `high`
- Long: 1920×1080 / Short: 1080×1920
- Video: H.264 Main, yuv420p, 30 fps, faststart
- High: CRF 17 / slow preset / AAC 192 kbps
- Standard: CRF 19 / medium / AAC 160 kbps
- Draft: CRF 22 / fast / AAC 128 kbps

## What NOT to Do

- 전신 캐릭터의 머리나 신발을 잘라내는 강제 확대
- 원본 마스터 시트의 설명 텍스트 위에 큰 새 자막을 직접 겹치기
- 3줄 이상의 긴 본문 캡션
- 장면 사이 검은 빈 프레임
- 화면 전체에 과도한 그라디언트
- 과도하게 큰 BGM/SFX
- 무한 반복 애니메이션 (`repeat: -1`)
- 장면 전환 직전에 콘텐츠를 미리 fade-out 하기
