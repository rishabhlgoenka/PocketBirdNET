/*
 * mel_frontend.h — Streaming log-mel spectrogram frontend
 *
 * DEVICE CONTRACT: parameters are locked to utils.py.  Change nothing here
 * without updating utils.py in the same commit (CLAUDE.md constraint #1).
 *
 * Streaming API (replaces the old single-call compute_log_mel):
 *
 *   mel_frontend_init()          once in setup()
 *   mel_frontend_reset()         before each new 3-second window
 *   mel_frontend_feed(buf, n)    called repeatedly as PDM samples arrive
 *   mel_frontend_ready()         returns true when all 32 frames are done
 *   mel_frontend_finish(out)     power_to_db + normalise -> float[1280]
 *
 * Why streaming: buffering 48000 int16 samples (96 KB) before processing
 * exceeds the nRF52840's 256 KB RAM when combined with the tensor arena.
 * The streaming design replaces that with a 4 KB circular audio buffer and
 * computes each STFT frame the moment enough samples have arrived.
 */

#ifndef MEL_FRONTEND_H
#define MEL_FRONTEND_H

#include <stdint.h>
#include <stdbool.h>

// ---------------------------------------------------------------------------
// Locked frontend constants  (must match utils.py exactly)
// ---------------------------------------------------------------------------
#define MEL_SAMPLE_RATE    16000
#define MEL_WIN_LENGTH     2048
#define MEL_HOP_LENGTH     1500
#define MEL_N_MELS         40
#define MEL_FMIN           125.0f
#define MEL_FMAX           7500.0f
#define MEL_N_FRAMES       32        // time frames kept in the output
#define MEL_TOP_DB         80.0f
#define MEL_WINDOW_SAMPLES 48000     // 3 s x 16 kHz

// Output layout: out[mel * MEL_N_FRAMES + frame], values in [0, 1]
#define MEL_OUTPUT_SIZE    (MEL_N_MELS * MEL_N_FRAMES)  // 1280 floats

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Precompute Hann window + mel filterbank.  Call once in setup(). */
void mel_frontend_init(void);

/** Reset state for a fresh 3-second window.  Call after each inference. */
void mel_frontend_reset(void);

/**
 * Feed PCM samples into the frontend.
 * Internally fills a 4 KB circular buffer and computes each STFT frame the
 * moment enough samples have arrived.
 *
 * @param buf  int16 PCM at MEL_SAMPLE_RATE Hz, mono
 * @param n    number of samples in buf
 */
void mel_frontend_feed(const int16_t* buf, int n);

/**
 * Returns true once all MEL_N_FRAMES (32) time frames have been computed.
 * At that point call mel_frontend_finish() to get the normalised output.
 */
bool mel_frontend_ready(void);

/**
 * Apply power_to_db (ref=max, top_db=80) and normalise to [0, 1].
 * Writes MEL_OUTPUT_SIZE floats into out_mel.
 * Only call after mel_frontend_ready() returns true.
 */
void mel_frontend_finish(float* out_mel);

#endif  // MEL_FRONTEND_H
