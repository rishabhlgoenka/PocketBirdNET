# PocketBirdNET

A TinyML project: distill [BirdNET](https://github.com/kahst/BirdNET-Analyzer) onto an
**Arduino Nano 33 BLE Sense** (Cortex-M4, 256 KB RAM) and compare four model variants
head-to-head on identical data and architecture.

| ID | Name | Training signal | Compression |
|----|------|-----------------|-------------|
| A | Scratch | Hard labels, random init | none |
| B | Transfer | MobileNetV2 ImageNet backbone | none |
| C | Distillation | BirdNET soft targets (T=4) + hard CE | none |
| D | Deploy | = C | INT8 PTQ → `.tflite` |

The deliverable is the **comparison and compression frontier**, not a production bird
detector.  See [PROJECT_PLAN.md](PROJECT_PLAN.md) for full design rationale.

---

## ⚠ Data not included

`data/train.npz`, `data/val.npz`, `data/test.npz`, `data/teacher_logits.npy`, and all
raw audio are **not in this repo** (git-ignored).  You must regenerate them by running
notebooks 01 and 02 in order.  This takes roughly 45–90 minutes, mostly network I/O.
Do not expect the pipeline to work after a bare `git clone`.

---

## Prerequisites

### Python version
**Python 3.11 is required.** `birdnet-analyzer` (used in notebook 02) pins 3.11;
newer versions will break the teacher env.

```bash
python3.11 --version   # must be 3.11.x
```

### macOS / Apple Silicon
The project is CPU-only by design.  **Do not install `tensorflow-metal`** — it
conflicts with `tensorflow-model-optimization` and is not needed for this workload.
Plain `pip install tensorflow` on Apple Silicon gives you the native arm64 CPU build
automatically.

**Linux / Windows:** plain `pip install tensorflow` also works.  The project has no
OS-specific code.

### System dependencies

```bash
# macOS (Homebrew)
brew install ffmpeg        # required by librosa for mp3 decoding in notebook 01 and 02
```

Linux: `sudo apt install ffmpeg`.  Windows: download from https://ffmpeg.org/download.html.

### Xeno-Canto account + API key
Xeno-Canto **requires an API key** since October 2025.  Register for a free account at
https://xeno-canto.org, go to your profile → API key, and copy it.  The notebooks read
it from an environment variable — **never commit the key**.

---

## Setup

### 1. Main environment (notebooks 01, 03, 04, 05)

```bash
python3.11 -m venv .venv
source .venv/bin/activate

pip install -U pip
pip install -r requirements.txt
```

Register the kernel with Jupyter so you can select it in the notebook UI:

```bash
python -m ipykernel install --user --name pocketbirdnet-venv \
    --display-name "PocketBirdNET (.venv)"
```

### 2. Teacher environment (notebook 02 only)

This environment is isolated because `birdnet-analyzer` pins an older TensorFlow that
conflicts with `tensorflow-model-optimization`.

```bash
python3.11 -m venv .venv-birdnet
source .venv-birdnet/bin/activate

pip install -U pip
pip install -r requirements-birdnet.txt
```

Register its kernel:

```bash
python -m ipykernel install --user --name pocketbirdnet-birdnet \
    --display-name "PocketBirdNET (.venv-birdnet)"
```

Deactivate when done: `deactivate`.

### 3. API key

Add to your shell profile (`~/.zshrc` or `~/.bashrc`) so it persists across sessions:

```bash
export XENO_CANTO_API_KEY="your_key_here"
```

Then reload: `source ~/.zshrc` (or open a new terminal).  Verify with:

```bash
echo $XENO_CANTO_API_KEY   # should print your key
```

---

## Running the pipeline

Run notebooks in order.  Each one reads the previous stage's cached output — never
re-run an upstream notebook just to fix a downstream bug.

### 1. `notebooks/01_data.ipynb` — data acquisition
**Kernel:** `PocketBirdNET (.venv)`  
**Runtime:** 45–90 min (network-heavy, depends on Xeno-Canto response times)  
**Run:** once; it is resumable if interrupted  
**Produces:** `data/train.npz`, `data/val.npz`, `data/test.npz`, `data/metadata.csv`,
`data/manifest.csv`, `data/train_window_map.csv`

Downloads recordings from Xeno-Canto for 10 Pacific Northwest species + background,
windows and spectrograms each recording, then deletes the mp3 (process-and-delete
pipeline).  Splits recordings at the recording level (70/15/15 train/val/test,
stratified by species) — no window-level leakage.

### 2. `notebooks/02_teacher.ipynb` — BirdNET teacher targets
**Kernel:** `PocketBirdNET (.venv-birdnet)`  
**Runtime:** 20–60 min (re-downloads training audio and runs BirdNET inference)  
**Run:** once; only needed for variant C  
**Produces:** `data/teacher_logits.npy`

Re-downloads the training recordings at 48 kHz (BirdNET's native rate), runs BirdNET
inference, maps confidences to the 11-class vocabulary, converts sigmoid outputs to
pre-softmax pseudo-logits for temperature scaling at T=4.  Output is aligned 1:1 with
`train.npz` row ordering via `train_window_map.csv`.

### 3. `notebooks/03_train.ipynb` — train variants A, B, C
**Kernel:** `PocketBirdNET (.venv)`  
**Runtime:** 10–30 min (A: ~5 min; B: ~20 min; C sweep: ~15 min)  
**Run:** iterate freely; A is loaded from disk if `models/A.keras` already exists  
**Produces:** `models/A.keras`, `models/B.keras`, `models/C.keras`

Trains three variants on identical data and architecture; only the training signal
differs.  Variant C runs a sweep over `KD_ALPHA ∈ {0.1, 0.3, 0.5}` and saves the
best run.  Background masking (`KD_MASK_BG=True`) is on by default to prevent the
distillation loss from collapsing to the background class.

### 4. `notebooks/04_compress_deploy.ipynb` — compress + export
**Kernel:** `PocketBirdNET (.venv)`  
**Runtime:** 2–5 min  
**Run:** iterate freely  
**Produces:** `models/D.tflite`, `arduino/pocketbirdnet/model.h`

INT8 post-training quantization via the TFLite converter.  Pruning is currently
disabled (TFMOT 0.8.x is incompatible with Keras 3 functional models; the model
already fits well under 100 KB without it).  Asserts size ≤ 100 KB, arena ≤ 200 KB,
and all ops in the standard LiteRT-Micro resolver before writing `model.h`.

### 5. `notebooks/05_evaluate.ipynb` — final four-way comparison
**Kernel:** `PocketBirdNET (.venv)`  
**Runtime:** 5–10 min  
**Run:** once — this is the only notebook that opens `test.npz`  
**Produces:** `results/comparison_table.csv`, `results/per_class_f1.csv`,
`results/confusion_{A,B,C,D}.png`, `results/confusion_all.png`

> **Important:** treat this as a single, final measurement.  Once you have looked at
> the test-set numbers, the test set is burned for this data version.  Do not iterate
> model training against these numbers.

---

## "File Changed on disk" prompt in Jupyter

If you see *"File Changed on disk since the last time it was opened or saved — overwrite
or revert?"*, always choose **Revert**.  This happens when a script or external editor
modifies a notebook while it is open in the browser.  Reverting loads the current disk
version with the latest fixes; overwriting would clobber them.

---

## Expected results and sanity checks

Your numbers will differ slightly from ours (random seeds, different Xeno-Canto
recordings available at query time), but they should be in this neighbourhood:

| Check | Expected |
|-------|---------|
| 01: zero recording-level leakage | assertion passes; each recording ID in exactly one split |
| 01: windows per class | ~400–900 training windows per species after augmentation |
| 02: teacher–truth agreement | well above the 9.1% chance baseline; we got ~53% on training windows |
| 03: val macro-F1 (A) | ~0.35–0.50 |
| 03: val macro-F1 (B) | ~0.40–0.55 |
| 03: val macro-F1 (C) | ~0.40–0.55 |
| 04: D.tflite size | ~55–70 KB INT8 |
| 04: tensor arena | ~70–100 KB |
| 05: test macro-F1 (B/C/D) | ~0.40–0.45 |
| 05: test macro-F1 (A) | may be near chance (~0.01–0.10) at this data volume |

A is expected to be weak or near-random at ~10 min/class — that is a real finding, not
a bug.

---

## Known gotchas

- **Results vary run-to-run.** Xeno-Canto returns different recordings over time;
  SEED=42 controls model init and augmentation but not which recordings you get.
- **Data volume is intentionally lean.** ~10 min/class is below BirdNET's training
  regime by orders of magnitude.  All four variants will show modest absolute accuracy;
  the contribution is the relative comparison and compression story, not peak numbers.
- **Frontend-parity invariant.** The mel-spectrogram parameters in `utils.py`
  (`SR=16000`, `N_MELS=40`, `HOP=1500`, `WIN=2048`, `FMIN=125`, `FMAX=7500`) are a
  contract with the on-device C frontend.  If you change any of them you must also
  update `arduino/pocketbirdnet/audio_frontend/` in the same commit or the deployed
  model will fail silently.
- **Do not commit:** `.env`, raw audio (`*.mp3`, `*.wav`), `data/*.npz`,
  `data/teacher_logits.npy`, or the API key anywhere.  All are in `.gitignore`.
  Trained model files (`models/`) are committed and tracked normally.
- **TFMOT / Keras 3 conflict.** `tensorflow-model-optimization` 0.8.x cannot prune
  Keras 3 functional models; `import tfmot` at the top of a notebook also redirects
  `tf.keras` → the legacy `tf_keras` loader, breaking `.keras` file loading.  Always
  use `keras.models.load_model` (not `tf.keras.models.load_model`) in this project.
- **`tf.keras` vs `keras`.** Notebooks 04 and 05 import `keras` directly and use
  `keras.models.load_model`.  Do not replace these with `tf.keras`; the models were
  saved in Keras 3 format.

---

## Repo layout

```
PocketBirdNET/
├── DEVELOPER_NOTES.md             # project invariants and developer notes
├── PROJECT_PLAN.md                # full design rationale and build order
├── README.md                      # this file
├── requirements.txt               # main env (.venv): TF, TFMOT, librosa, sklearn …
├── requirements-birdnet.txt       # teacher env (.venv-birdnet): birdnet-analyzer
├── utils.py                       # SHARED: audio_to_logmel + recording_level_split
│                                  # (device-contract parameters locked here)
├── notebooks/
│   ├── 01_data.ipynb              # download → window → spectrogram → split [once]
│   ├── 02_teacher.ipynb           # BirdNET → teacher_logits.npy         [once]
│   ├── 03_train.ipynb             # variants A / B / C                   [iterate]
│   ├── 04_compress_deploy.ipynb   # variant D: INT8 + model.h            [iterate]
│   └── 05_evaluate.ipynb          # final test-set table                 [once]
├── data/                          # cached artifacts (git-ignored except metadata.csv)
│   ├── train.npz / val.npz / test.npz
│   ├── metadata.csv               # recording_id, species, split (auditable)
│   └── teacher_logits.npy
├── models/                        # trained model artifacts (committed)
│   ├── A.keras / B.keras / C.keras
│   └── D.tflite
├── results/                       # evaluation outputs
│   ├── comparison_table.csv       # headline four-way table
│   ├── per_class_f1.csv
│   └── confusion_*.png
└── arduino/
    └── pocketbirdnet/
        ├── model.h                # C array of D.tflite — auto-generated by 04
        └── audio_frontend/        # micro_speech-derived mel-spectrogram (C)
```

---

## Team

- **Rishabh Goenka** — ML pipeline (01, 02, 03)
- **Aarav Wadhwani** — Compression & embedded (04, Arduino sketch)
