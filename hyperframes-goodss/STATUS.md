# Stage 1 status

**Date:** 2026-08-12  
**State:** READY FOR REAL-ASSET ACCEPTANCE TEST

## Gate summary

| Gate | Status |
|---|---|
| Master-sheet extraction | PASS (CI fixture) |
| 12 look asset generation | PASS |
| Data-driven composition generation | PASS |
| Long / Short project separation | PASS |
| Static composition validation | PASS |
| Chromium fallback render | PASS |
| H.264 Main / yuv420p encode | PASS |
| AAC 48 kHz stereo | PASS |
| MP4 faststart | PASS |
| Full FFmpeg decode | PASS |
| GitHub Actions end-to-end smoke | PASS |
| Actual character master-sheet render | PENDING |
| User playback / visual acceptance | PENDING |

## Latest verified smoke

GitHub Actions workflow: `hyperframes-goodss Stage 1 smoke`

Verified outputs from the passing pipeline:

- Long: 1920×1080 / 30 fps / 30 seconds
- Short: 1080×1920 / 30 fps / 17 seconds
- Codec: H.264 Main
- Pixel format: yuv420p
- Audio: AAC / 48 kHz / stereo
- Faststart: true
- Full decode: clean

## Defects found and fixed by CI

1. GitHub runner did not include FFmpeg → workflow now installs FFmpeg explicitly.
2. Windows-style script arguments failed on Linux PowerShell → external command paths are now absolute/cross-platform.
3. Generated titles contained forced `<br>` line breaks → replaced with block title spans to comply with the composition rules.
4. A single mixed Long/Short layout made render targeting ambiguous → Long and Short are now prepared as independent projects.
5. HyperFrames CLI availability could block all sample testing → deterministic Chromium fallback renderer added; official HyperFrames remains preferred when available.

## Acceptance test required for Stage 1 COMPLETE

Use the user's real `character-master-sheet.png`, run the complete build, and then verify:

- Long and Short open and seek normally in the user's environment.
- Character is not unintentionally cropped.
- Full-body looks remain readable where required.
- Korean titles and captions do not clip or overlap.
- Mobile-safe spacing is acceptable in the Short version.
- Scene transitions do not expose blank/incorrect frames.
- The same input can be rebuilt successfully a second time.

Only after these checks pass should Stage 1 be marked `COMPLETE`.
