# hyperframes-goodss — Stage 1

캐릭터 스타일 마스터 시트 1장을 입력해 HyperFrames 기반의 **롱폼(16:9)** 과 **숏폼(9:16)** 스타일 소개 영상을 반복 생성하는 Stage 1 프로젝트입니다.

## Stage 1 완료 기준

- 마스터 시트 1장 → 12개 룩 자산 추출
- `data/looks.json` 기반 장면 데이터 관리
- Long / Short HyperFrames composition 생성
- 최소 3종 자막 모션과 3종 장면 전환
- H.264 Main + yuv420p + AAC + faststart 호환 MP4 생성
- FFmpeg 전체 디코딩 검사 통과
- 동일 입력으로 재빌드 가능한 단일 명령 파이프라인

## 범위

Stage 1에서는 **렌더 안정성, 재생 안정성, 레이아웃, 자막/모션**까지만 완성합니다. TTS, BGM, SFX, AI 영상 생성, 대규모 템플릿 라이브러리는 Stage 2 이후로 미룹니다.

## 프로젝트 구조

```text
hyperframes-goodss/
├─ assets/
│  ├─ source/character-master-sheet.png   # 사용자가 넣는 원본
│  └─ looks/                              # 자동 추출 결과
├─ compositions/
│  └─ style-short.html
├─ data/
│  └─ looks.json
├─ renders/
├─ scripts/
│  ├─ setup.ps1
│  ├─ extract-looks.mjs
│  ├─ generate-compositions.mjs
│  ├─ compat-encode.ps1
│  ├─ qa-video.mjs
│  └─ build-all.ps1
├─ DESIGN.md
├─ index.html                             # Long composition
└─ package.json
```

## 요구 환경

- Windows 11 우선
- Node.js 22+
- FFmpeg / ffprobe
- HyperFrames CLI (`npx hyperframes`)

## 빠른 실행

1. 마스터 시트를 다음 위치에 저장합니다.

```text
assets/source/character-master-sheet.png
```

2. PowerShell에서 실행합니다.

```powershell
cd hyperframes-goodss
powershell -ExecutionPolicy Bypass -File .\scripts\setup.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\build-all.ps1
```

3. 성공 시 최종 파일:

```text
renders/style-showcase-long-fixed.mp4
renders/style-showcase-short-fixed.mp4
renders/qa-long.json
renders/qa-short.json
```

## P0 빌드 순서

```text
master sheet
→ extract looks
→ generate compositions
→ hyperframes lint
→ hyperframes inspect
→ long render
→ short render
→ compatibility encode
→ decode / codec QA
→ final MP4
```

## 실패 처리

- `lint` 또는 `inspect` 오류가 있으면 렌더하지 않습니다.
- raw MP4가 생성돼도 `qa-video.mjs`를 통과하기 전에는 최종본으로 취급하지 않습니다.
- `*-fixed.mp4`만 사용자 검수용 파일입니다.

## 현재 개발 상태

Stage 1의 구조와 P0 파이프라인을 재구축 중입니다. 이전 샘플의 문제였던 **사용자 재생 실패**를 최우선 결함으로 취급하며, 이번 버전에서는 호환 인코딩과 자동 QA를 필수 게이트로 둡니다.
