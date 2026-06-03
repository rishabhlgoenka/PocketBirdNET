# CLAUDE.md

Context for working in the PocketBirdNET repo. Read this before editing. Full detail in `PROJECT_PLAN.md`.

## What this is

A TinyML project: distill BirdNET onto an Arduino Nano 33 BLE Sense and compare **four model variants** (A scratch, B transfer, C distillation, D distilled+pruned+quantized) on identical data and architecture. The deliverable is the **comparison**, not a bird detector. Data work is plumbing — do the minimum to make the comparison fair, then stop.

## Hard constraints — never violate

1. **The mel-spectrogram frontend MUST be byte-for-byte equivalent in Python and on-device C.** Same sample rate (16 kHz), window, hop, 40 mel bins, frequency range, log/scaling. A feature mismatch makes a working model fail silently on the Nano. Single source of truth: `utils.py`. Mirror it in `arduino/pocketbirdnet/audio_frontend/`. If you change one, change both in the same commit.
2. **Splits are recording-level, keyed on recording ID — never window-level.** Two windows from the same recording must never straddle train/val/test. `data/metadata.csv` makes this auditable; keep it accurate.
3. **All four variants share the same architecture and the same splits.** Only the training signal / compression differs. Do not "improve" one variant's architecture in isolation.
4. **Deployment model (variant D) ≤ 100 KB INT8**, and the tensor arena must fit **256 KB RAM** with headroom. Verify before optimizing accuracy.
5. **CPU TensorFlow only. Do NOT add `tensorflow-metal` or any GPU path.** The workload is tiny; GPU adds risk, not speed.

## Environment

- **Python 3.11** (required by `birdnet-analyzer`).
- Main env (`.venv`): `tensorflow` (native arm64 CPU), `tensorflow-model-optimization`, `librosa`, `soundfile`, `scikit-learn`.
- Teacher env (`.venv-birdnet`): `birdnet-analyzer`. Used only by `notebooks/02_teacher.ipynb`. It writes `data/teacher_logits.npy` and shares nothing else, so keep it isolated if TF versions conflict.
- macOS / Apple Silicon. Arduino side uses the Arduino IDE + LiteRT (TFLite-Micro) library — outside Python.

## Layout & data flow

Slow stages cache to disk and run once; TinyML stages read the cache and iterate.

```
01_data            -> data/{train,val,test}.npz, data/metadata.csv      [run once]
02_teacher         -> data/teacher_logits.npy   (variant C only)         [run once]
03_train           -> models/{A,B,C}.keras                               [iterate]
04_compress_deploy -> models/D.tflite, arduino/pocketbirdnet/model.h     [iterate]
05_evaluate        -> results table, confusion matrices
```

`teacher_logits.npy` must stay aligned to `train.npz` ordering. If you regenerate one, regenerate or re-check the other.

## Conventions

- Shared code (mel-spectrogram, split logic) lives in `utils.py`, never copy-pasted into notebooks.
- Cached artifacts go in `data/` and `models/`. Don't recompute upstream stages to satisfy a downstream change — read the cache.
- Model input shape is **40 × 32 × 1** (log-mel). 11 output classes (10 species + background).
- Convert tflite → C with `xxd -i model.tflite > model.h`.

## Data specifics

- Source: Xeno-Canto **v3** API, `https://xeno-canto.org/api/3/recordings?query=...&key=KEY`. **API key required** — read it from an env var, never hardcode or commit it.
- Filter queries: `q:A`/`q:B`, `len:10-120`, download mp3.
- Target ~15–20 min usable audio/class, ~20–30 recordings/class, cap ~15 windows/recording.
- **Process-and-delete**: download → window → spectrogram → delete the mp3. Never check raw audio into git.

## Modeling specifics

- Student: 4–5 depthwise-separable conv blocks, width multiplier α < 1, GAP → dense → 11-way softmax.
- Variant C loss: `α · KD(T=4) + (1−α) · CE(hard)`. BirdNET is multi-label **sigmoid** — filter to the 10 species and re-normalize via softmax before KD (or use an embedding+softmax-head teacher). Background = "no confident detection."
- Variant D: TFMOT magnitude pruning 30–50% → INT8 PTQ. QAT only as fallback if PTQ accuracy tanks.

## Deployment specifics

- Reuse the LiteRT `micro_speech` audio frontend — do not hand-roll the on-device mel-spectrogram.
- Register every op the model uses in the op resolver (depthwise conv, pointwise conv, global average pool, softmax, quantize/dequantize). A missing op fails at runtime, not at build.
- On-device flow: PDM mic → ring buffer → mel-spec → INT8 inference → softmax → threshold ≥ 70% → OLED (species + confidence, else "Unknown").

## Targets

> 80% top-1, > 0.75 macro-F1 on the recording-level test split. Results table reports {accuracy, size KB, peak RAM KB, latency ms} for all four variants.

## Don't

- Don't add GPU/Metal.
- Don't introduce window-level leakage in splits.
- Don't diverge the Python and C frontends.
- Don't re-run downloads to fix a training bug.
- Don't commit the Xeno-Canto API key or raw audio.
- Don't drop a variant to save time — the four-way comparison is the contribution.
