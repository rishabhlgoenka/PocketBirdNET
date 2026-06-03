"""
utils.py — PocketBirdNET shared utilities
==========================================

DEVICE CONTRACT — DO NOT CHANGE THESE PARAMETERS WITHOUT UPDATING THE C FRONTEND
==================================================================================
The mel-spectrogram parameters below are locked to the on-device audio frontend
in arduino/pocketbirdnet/audio_frontend/.  If you change *any* of these values
you MUST update the C code in the same commit, or the model will fail silently on
the Nano (the features will look correct in Python but differ bit-by-bit from what
the device computes).  This is hard constraint #1 in CLAUDE.md.

Locked parameters:
    SAMPLE_RATE  = 16000   Hz, mono
    WIN_LENGTH   = 2048    samples  (~128 ms)
    HOP_LENGTH   = 1500    samples  (~94 ms)
    N_MELS       = 40      mel filterbank bins
    FMIN         = 125     Hz  (lower edge of mel filterbank)
    FMAX         = 7500    Hz  (upper edge of mel filterbank)
    N_FRAMES     = 32      time frames per spectrogram (pad/trim to exactly this)
    TOP_DB       = 80.0    dynamic range for log-mel conversion (power_to_db ref=max)

These produce model input shape (40, 32, 1) = (N_MELS, N_FRAMES, 1).

Public API
----------
audio_to_logmel(samples, sr=16000) -> np.ndarray  shape (40, 32, 1)
recording_level_split(metadata_df, seed=42) -> pd.DataFrame  (adds 'split' column)
"""

import numpy as np
import librosa

# ---------------------------------------------------------------------------
# Locked frontend parameters — single source of truth for Python and C
# ---------------------------------------------------------------------------
SAMPLE_RATE: int = 16_000
WIN_LENGTH: int = 2048
HOP_LENGTH: int = 1500
N_MELS: int = 40
FMIN: float = 125.0
FMAX: float = 7500.0
N_FRAMES: int = 32
TOP_DB: float = 80.0

# Derived: 3-second window at 16 kHz
WINDOW_SAMPLES: int = SAMPLE_RATE * 3  # 48 000 samples


def audio_to_logmel(samples: np.ndarray, sr: int = SAMPLE_RATE) -> np.ndarray:
    """Convert a raw audio array to a log-mel spectrogram.

    Parameters
    ----------
    samples : np.ndarray
        1-D float32 audio, already resampled to ``sr`` Hz mono.
    sr : int
        Sample rate.  Must equal SAMPLE_RATE (16 000 Hz); passing anything
        else raises ValueError to catch accidental mismatches.

    Returns
    -------
    np.ndarray
        Shape **(40, 32, 1)** log-mel spectrogram, dtype float32.
        Axis 0 = mel bins (N_MELS = 40).
        Axis 1 = time frames, padded/trimmed to N_FRAMES = 32.
        Axis 2 = channel (always 1, for the Conv2D input).

    Notes
    -----
    *DEVICE CONTRACT* — this function must be mirrored byte-for-byte in
    ``arduino/pocketbirdnet/audio_frontend/``.  See module docstring.
    """
    if sr != SAMPLE_RATE:
        raise ValueError(
            f"audio_to_logmel expects sr={SAMPLE_RATE} Hz, got {sr}. "
            "Resample before calling this function."
        )

    samples = samples.astype(np.float32)

    # Pad or trim to exactly WINDOW_SAMPLES (3 s)
    if len(samples) < WINDOW_SAMPLES:
        samples = np.pad(samples, (0, WINDOW_SAMPLES - len(samples)))
    else:
        samples = samples[:WINDOW_SAMPLES]

    # Mel-filterbank power spectrogram
    mel_spec = librosa.feature.melspectrogram(
        y=samples,
        sr=SAMPLE_RATE,
        n_fft=WIN_LENGTH,
        hop_length=HOP_LENGTH,
        win_length=WIN_LENGTH,
        window="hann",
        n_mels=N_MELS,
        fmin=FMIN,
        fmax=FMAX,
        power=2.0,
    )

    # Convert power to dB, clip dynamic range, normalise to [0, 1]
    log_mel = librosa.power_to_db(mel_spec, ref=np.max, top_db=TOP_DB)
    # log_mel is in [-TOP_DB, 0]; shift to [0, 1]
    log_mel = (log_mel + TOP_DB) / TOP_DB

    # Pad or trim time axis to exactly N_FRAMES
    n_frames_actual = log_mel.shape[1]
    if n_frames_actual < N_FRAMES:
        pad_width = N_FRAMES - n_frames_actual
        log_mel = np.pad(log_mel, ((0, 0), (0, pad_width)))
    else:
        log_mel = log_mel[:, :N_FRAMES]

    # Add channel axis → (N_MELS, N_FRAMES, 1)
    log_mel = log_mel[:, :, np.newaxis].astype(np.float32)

    assert log_mel.shape == (N_MELS, N_FRAMES, 1), (
        f"Unexpected spectrogram shape {log_mel.shape}; "
        f"expected ({N_MELS}, {N_FRAMES}, 1)"
    )
    return log_mel


def recording_level_split(
    metadata_df,
    seed: int = 42,
    train_frac: float = 0.70,
    val_frac: float = 0.15,
) -> "pd.DataFrame":  # type: ignore[name-defined]
    """Assign each *recording* to train / val / test.

    Splits are stratified by species and keyed on ``recording_id`` — every
    window from the same recording lands in exactly one split.  This
    satisfies hard constraint #2 in CLAUDE.md (no window-level leakage).

    Parameters
    ----------
    metadata_df : pd.DataFrame
        Must have columns: ``recording_id`` (str), ``species`` (str).
        May have additional columns (e.g. ``window_idx``).
    seed : int
        Random seed for reproducibility.
    train_frac : float
        Fraction of recordings per class for training (default 0.70).
    val_frac : float
        Fraction for validation (default 0.15); remainder goes to test.

    Returns
    -------
    pd.DataFrame
        A copy of ``metadata_df`` with a new ``split`` column
        ('train' | 'val' | 'test').

    Raises
    ------
    AssertionError
        If any recording_id appears in more than one split (sanity check).
    """
    import pandas as pd
    from sklearn.model_selection import train_test_split

    df = metadata_df.copy()

    # One row per recording (deduplicated)
    recordings = (
        df[["recording_id", "species"]].drop_duplicates("recording_id").copy()
    )

    split_labels = []

    rng = np.random.default_rng(seed)

    for species, grp in recordings.groupby("species"):
        ids = grp["recording_id"].tolist()
        n = len(ids)

        # Shuffle deterministically per species using the shared seed
        rng_species = np.random.default_rng(rng.integers(0, 2**32))
        rng_species.shuffle(ids)

        n_train = max(1, round(n * train_frac))
        n_val = max(1, round(n * val_frac))
        # ensure at least 1 in test
        n_val = min(n_val, n - n_train - 1)
        n_val = max(1, n_val)

        train_ids = ids[:n_train]
        val_ids = ids[n_train : n_train + n_val]
        test_ids = ids[n_train + n_val :]

        split_labels.extend([(rid, "train") for rid in train_ids])
        split_labels.extend([(rid, "val") for rid in val_ids])
        split_labels.extend([(rid, "test") for rid in test_ids])

    split_map = {rid: split for rid, split in split_labels}

    df["split"] = df["recording_id"].map(split_map)

    # Hard invariant: no recording_id in more than one split
    leakage = (
        df.groupby("recording_id")["split"].nunique()
    )
    assert (leakage == 1).all(), (
        "BUG: some recording_id appears in multiple splits — recording-level "
        "split invariant violated.  Offending IDs: "
        + str(leakage[leakage > 1].index.tolist())
    )

    return df
