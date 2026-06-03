# PocketBirdNET — Project Plan

Distilling a state-of-the-art bird classifier (BirdNET) onto an Arduino Nano 33 BLE Sense, and comparing four training/compression strategies head-to-head.

---

## 1. Objective

Compress an audio classifier by ~3 orders of magnitude (from ~50 MB BirdNET down to **under 100 KB INT8**) so it runs fully offline on a Cortex-M4 microcontroller, while keeping usable accuracy on a focused 11-class set (10 Pacific Northwest species + 1 background class).

The graded contribution is **not** "a bird detector." It is the **systematic comparison** of four model variants on identical data and architecture, reported as a single compression-frontier table. Treat data collection as plumbing: do the minimum to make the comparison fair, then stop.

**Targets:** > 80% top-1, > 0.75 macro-F1 on a recording-level held-out test set; deployment model < 100 KB and fits the 256 KB RAM arena.

---

## 2. Hardware & fixed constraints

- **Board:** Arduino Nano 33 BLE Sense (nRF52840, Cortex-M4, **256 KB RAM**, **1 MB flash**), onboard PDM microphone.
- **Display:** SSD1306 OLED over I²C (live species + confidence).
- **Deployment stack:** TensorFlow (train) → TFLite converter (INT8) → **LiteRT for Microcontrollers** (the current name for TFLite-Micro; Arduino library).
- The model must fit RAM with headroom for the audio buffer + mel-spectrogram scratch + the OLED. Verify the tensor arena before falling in love with an architecture.

---

## 3. Environment (Apple Silicon, local, CPU)

No GPU. The model is sub-100 KB and the dataset is a few thousand 40×32 spectrograms — it trains in seconds on the M-series CPU. `tensorflow-metal` is skipped on purpose: it is finicky to install and the operations that matter here (INT8 quantization, pruning) run on CPU through the converter regardless.

**Python 3.11** (required by `birdnet-analyzer`).

```bash
# Main training/compression env
python3.11 -m venv .venv && source .venv/bin/activate
pip install -U pip
pip install tensorflow                    # native arm64, CPU; no tensorflow-macos needed for TF >=2.13
pip install tensorflow-model-optimization # pruning + QAT
pip install librosa soundfile numpy scikit-learn matplotlib
```

If `birdnet-analyzer` and `tensorflow-model-optimization` conflict on TF version, **do not fight it** — put BirdNET in its own env. The teacher stage only writes a cache file to disk, so it never needs to share an interpreter with training.

```bash
# Separate teacher env (only used by notebook 02)
python3.11 -m venv .venv-birdnet && source .venv-birdnet/bin/activate
pip install birdnet-analyzer
```

The Arduino side is outside Python entirely (Arduino IDE + LiteRT library), so Apple Silicon is a non-issue there.

---

## 4. Data plan

### Volume
Think in **minutes of usable audio per class**, not recordings. At 3 s windows / 50% overlap, each window costs ~1.5 s of new audio.

- **Target: ~15–20 min usable audio per class** (~600–800 windows). This is generous for the comparison.
- **Floor: ~6 min/class** before the comparison gets noisy.
- **~20–30 distinct recordings per class** so the recording-level 70/15/15 split is meaningful (a 15% test slice of 5 recordings is statistically useless).

### Source: Xeno-Canto v3
- Base: `https://xeno-canto.org/api/3/recordings?query=...&key=YOUR_KEY`
- **An API key is required** (since 2025-10-10). Free for registered members — register and grab a key before writing the download script or it just fails.
- Query filters to keep download small and clean:
  - `q:A` / `q:B` (quality)
  - `len:10-120` (skip the 10-minute soundscapes)
  - optionally `type:song`
- Download **mp3** (default), not WAV.

### Process-and-delete
Download one recording → cut windows → save spectrograms → **delete the mp3** → next. Peak disk stays a few MB; the raw audio is transient. Final cached dataset (~6–9k spectrograms) is ~15–25 MB.

### Classes (11)
American Robin, Black-capped Chickadee, Steller's Jay, Northern Flicker, Song Sparrow, Anna's Hummingbird, Dark-eyed Junco, American Crow, Pacific Wren, House Finch + **background** (ambient/no-bird: wind, traffic, voices).

### Preprocessing (locked parameters — see invariant in §9)
- Resample to **16 kHz mono**.
- Segment into **3 s windows, 50% overlap**.
- **Log-mel-spectrogram**, **40 mel bins**, framed to **~32 time frames** → model input shape **40 × 32 × 1**.
- Suggested matched params: `win ≈ 2048`, `hop ≈ 1500`, `fmin=125`, `fmax=7500`. Exact values matter less than Python == device (§9).
- **Cap ~15 windows per recording** so one long file can't dominate a class.

### Splits & augmentation
- **Split at the recording level**, stratified by species: 70 / 15 / 15. Never let two windows from the same recording land in different splits.
- Augment **training only**: time-shift, gaussian noise, pitch perturbation, mixup with background clips.

---

## 5. Student architecture (shared across all variants)

- 2D CNN over the 40×32×1 log-mel input.
- 4–5 **depthwise-separable** conv blocks (MobileNet-style: depthwise + pointwise).
- **Width multiplier α < 1** to stay under the RAM ceiling.
- Global average pool → small dense layer → **11-class softmax**.
- Footprint goal: **< 100 KB after INT8**.

All four variants use the **same architecture and the same data splits** — only the training signal / compression differs. That is what makes the comparison fair.

---

## 6. The four variants

| ID | Name | Training signal | Compression |
|----|------|-----------------|-------------|
| A | Scratch | Hard labels only, random init | none |
| B | Transfer | MobileNet backbone, freeze early, fine-tune late | none |
| C | Distillation | BirdNET soft targets (T=4) + hard-label CE | none |
| D | Deployment | = C | prune 30–50% + INT8 PTQ |

**B (transfer) caveat:** an ImageNet-pretrained MobileNet expects 3-channel ~224px RGB. Adapting it to a 40×32×1 spectrogram needs input adaptation (channel replication / resize) and the benefit may be modest — that's fine, a weak transfer result is still a valid row in the table.

**C (distillation) wrinkle:** BirdNET is a **multi-label sigmoid** model, not softmax. Two acceptable routes:
1. Run BirdNET with a species list limited to your 10 species, take its per-segment confidences for those classes, **re-normalize via softmax** before computing distillation loss (simpler; what the proposal describes).
2. Extract BirdNET **embeddings**, train a small softmax head on your 11 labels, distill from that head's temperature-scaled logits (cleaner softmax teacher; one extra step).
- Loss: `L = α · KD(student, teacher, T=4) + (1−α) · CE(student, hard_labels)`.
- **Background** has no BirdNET class — define its teacher target as the "no confident detection" case.

**D (deployment):** TFMOT magnitude pruning at 30–50% sparsity → INT8 post-training quantization via the TFLite converter. Use **QAT only as a fallback** if PTQ accuracy drops below threshold.

---

## 7. Deployment pipeline

On-device flow:

```
PDM mic → rolling audio buffer → mel-spectrogram (matched frontend)
        → INT8 CNN inference → softmax → confidence threshold (≥ 70%)
        → OLED: species name + confidence, or "Unknown"
```

- Reuse the **audio frontend from the LiteRT micro_speech example** for the on-device mel-spectrogram. Do **not** hand-roll it.
- Convert the `.tflite` to a C array (`xxd -i model.tflite > model.h`).
- **Verify every op** in the model (depthwise conv, pointwise conv, global average pool, softmax, quantize/dequantize) is registered in the op resolver, or it fails at runtime with "didn't find op for builtin opcode."
- Confirm the **tensor arena** fits 256 KB with headroom before finalizing.

---

## 8. Repository structure

```
pocketbirdnet/
├── CLAUDE.md                     # agent context / invariants
├── PROJECT_PLAN.md               # this file
├── requirements.txt              # main env
├── requirements-birdnet.txt      # teacher env
├── utils.py                      # SHARED: mel-spectrogram fn + recording-level split
├── notebooks/
│   ├── 01_data.ipynb             # query → download → window → mel-spec → split   [run once]
│   ├── 02_teacher.ipynb          # BirdNET → cached soft targets                  [run once]
│   ├── 03_train.ipynb            # variants A / B / C                             [iterate]
│   ├── 04_compress_deploy.ipynb  # variant D: prune + INT8 + tflite + model.h     [iterate]
│   └── 05_evaluate.ipynb         # metrics, confusion matrix, comparison table
├── data/                         # cached artifacts (git-ignored if large)
│   ├── train.npz / val.npz / test.npz
│   ├── metadata.csv              # recording_id, species, split  (audit the split)
│   └── teacher_logits.npy        # soft targets, aligned to train.npz order
├── models/                       # *.tflite, model.h, *.keras
└── arduino/
    └── pocketbirdnet/
        ├── pocketbirdnet.ino     # mic → frontend → inference → OLED
        ├── model.h               # quantized model as C array
        └── audio_frontend/       # micro_speech-derived mel-spectrogram
```

### Notebook I/O contracts (each reads the previous stage's cache)

| Notebook | Reads | Writes | Re-run frequency |
|----------|-------|--------|------------------|
| 01_data | Xeno-Canto API | `train/val/test.npz`, `metadata.csv` | once |
| 02_teacher | `train.npz` | `teacher_logits.npy` | once (variant C only) |
| 03_train | `*.npz`, `teacher_logits.npy` | `models/{A,B,C}.keras` | often |
| 04_compress_deploy | `models/C.keras` | `models/D.tflite`, `model.h` | often |
| 05_evaluate | `test.npz`, all models | results table, confusion matrices | per result |

The point of this layout: the slow, boring stages (01, 02) run **once** and cache to disk; the TinyML stages (03, 04) read the cache and iterate freely. You never re-download while tuning models.

---

## 9. Invariants (do not break)

1. **The mel-spectrogram frontend must be identical in Python and on-device C.** Same sample rate, window, hop, mel count, frequency range, log/scaling. A model that works in the notebook will fail silently on the Nano if the features differ. Define it once in `utils.py`; mirror it exactly in `arduino/.../audio_frontend/`.
2. **Splits are recording-level, keyed on recording ID** — never window-level. `metadata.csv` exists so this is auditable.
3. **All four variants share architecture + data splits.** Only the training signal / compression changes.
4. **Deployment model ≤ 100 KB INT8** and arena fits 256 KB.
5. **CPU TensorFlow, no `tensorflow-metal`.**

---

## 10. Build order (de-risk, don't perfect)

1. **Prove the toolchain.** Flash stock LiteRT `micro_speech` to the Nano; print "hello" to the OLED. No custom ML yet.
2. **Close a thin end-to-end loop.** 3 species + background, ~50 windows each → train variant A to mediocre accuracy → INT8 → deploy → OLED shows a (possibly wrong) live prediction. Once this loop closes, everything after is improving numbers, not finding blockers.
3. **Scale data + lock the pipeline.** Full 11 classes, recording-level split, augmentation. Variant A = baseline.
4. **Add B, C, D** on identical data/architecture. Cache the teacher once.
5. **Eval table + demo.**

---

## 11. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| 256 KB RAM ceiling | Depthwise-separable convs, α < 1, INT8, verify arena early |
| On-device mel-spec in C | Reuse micro_speech frontend; don't hand-roll |
| Op not supported in LiteRT resolver | Check ops before finalizing architecture; stick to common ops |
| Python vs device feature mismatch | Single source of truth in `utils.py`; mirror in C (invariant #1) |
| Domain mismatch (clean Xeno-Canto vs noisy PDM mic) | Heavy augmentation, "Unknown" threshold, small self-collected validation set |
| Distillation doesn't beat baselines | A null/negative result is still a valid, reportable finding — the 4-way comparison stands on its own |
| Dependency conflict (BirdNET vs TFMOT) | Separate envs; teacher writes a cache file |

---

## 12. Team responsibilities

- **Rishabh Goenka** — ML pipeline: dataset curation (01), BirdNET teacher extraction (02), student architecture, variant training (03).
- **Aarav Wadhwani** — Compression & embedded: TFLite conversion, INT8, pruning (04), Arduino deployment + on-device frontend.
- **Carson Large** — Evaluation & demo: benchmarking, results table, OLED/threshold logic (05), live demo, report writing.

---

## 13. Definition of done

- [ ] `train/val/test.npz` cached with auditable recording-level `metadata.csv`
- [ ] `teacher_logits.npy` cached and alignment spot-checked
- [ ] Variants A–D trained on identical data/architecture
- [ ] Variant D < 100 KB INT8, arena verified under 256 KB
- [ ] On-device demo: correct live classification + "Unknown" fallback on non-bird sound
- [ ] Comparison table: {accuracy, size KB, peak RAM KB, latency ms} × {A,B,C,D}
- [ ] Repo + demo video
