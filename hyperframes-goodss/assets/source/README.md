# Source asset contract

Stage 1 입력 파일명은 반드시 아래와 같습니다.

```text
character-master-sheet.png
```

현재 Stage 1 extractor는 이번 프로젝트에서 사용하는 **6열 × 2행, 총 12개 룩** 마스터 시트를 기준으로 합니다.

- 상단: 제목 밴드
- 중앙: 6개 룩
- 하단: 6개 룩
- 전체 비율: 약 3:2

입력 형식이 달라지면 `scripts/extract-looks.mjs`의 crop contract를 먼저 수정해야 합니다.

원본 이미지는 저장소에 커밋하지 않아도 됩니다. 로컬에서 이 폴더에 복사한 뒤 `scripts/build-all.ps1`을 실행하세요.
