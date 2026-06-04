/*
 * mel_frontend.cpp — Streaming log-mel spectrogram matching utils.py
 *
 * DEVICE CONTRACT: every step must be byte-for-byte equivalent to
 * utils.py audio_to_logmel().  See mel_frontend.h for the full API.
 *
 * Memory layout (no 96 KB capture buffer):
 *   s_circ[4096]       int16  circular audio buffer    =  8 KB
 *   s_hann[2048]       float  Hann window              =  8 KB
 *   s_fft_re[2048]     float  FFT real / power scratch =  8 KB
 *   s_fft_im[2048]     float  FFT imag scratch         =  8 KB
 *   s_mel_spec[40][32] float  spectrogram store        =  5 KB
 *   miscellaneous                                      ~  1 KB
 *   Total                                              ~ 38 KB
 */

#include "mel_frontend.h"
#include <math.h>
#include <string.h>

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------
#define PAD_SIZE   (MEL_WIN_LENGTH / 2)        // 1024  (librosa center=True)
#define FFT_HALF   (MEL_WIN_LENGTH / 2 + 1)    // 1025
#define AMIN       1e-10f

// Circular buffer size: must hold at least WIN_LENGTH+1=2049 samples so the
// oldest sample for any frame is still present when we compute it.
// 4096 = 2*WIN_LENGTH gives comfortable headroom.
#define CIRC_SIZE  (MEL_WIN_LENGTH * 2)         // 4096 int16

// ---------------------------------------------------------------------------
// Static buffers
// ---------------------------------------------------------------------------
static float   s_hann[MEL_WIN_LENGTH];
static float   s_mel_freqs[MEL_N_MELS + 2];
static int     s_mel_start[MEL_N_MELS];
static int     s_mel_end[MEL_N_MELS];
static float   s_mel_norm[MEL_N_MELS];      // Slaney: 2/(f_upper - f_lower)
static float   s_freq_res;                  // Hz per FFT bin

static float   s_fft_re[MEL_WIN_LENGTH];    // reused as power[] after FFT
static float   s_fft_im[MEL_WIN_LENGTH];

static float   s_mel_spec[MEL_N_MELS][MEL_N_FRAMES];

// Circular audio buffer + streaming state
static int16_t s_circ[CIRC_SIZE];
static int     s_total       = 0;   // samples received in current window
static int     s_frames_done = 0;   // mel frames computed so far

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
static inline float hz_to_mel(float hz) {
    return 2595.0f * log10f(1.0f + hz / 700.0f);
}
static inline float mel_to_hz(float mel) {
    return 700.0f * (powf(10.0f, mel / 2595.0f) - 1.0f);
}

// ---------------------------------------------------------------------------
// Radix-2 Cooley-Tukey FFT, in-place DIT.  n must be a power of 2.
// ---------------------------------------------------------------------------
static void fft_inplace(float* re, float* im, int n) {
    int j = 0;
    for (int i = 1; i < n; i++) {
        int bit = n >> 1;
        for (; j & bit; bit >>= 1) j ^= bit;
        j ^= bit;
        if (i < j) {
            float tr = re[i]; re[i] = re[j]; re[j] = tr;
            float ti = im[i]; im[i] = im[j]; im[j] = ti;
        }
    }
    for (int len = 2; len <= n; len <<= 1) {
        float ang = -2.0f * (float)M_PI / (float)len;
        float wre = cosf(ang), wim = sinf(ang);
        for (int i = 0; i < n; i += len) {
            float cr = 1.0f, ci = 0.0f;
            for (int k = 0; k < len / 2; k++) {
                float ur = re[i+k],       ui = im[i+k];
                float vr = re[i+k+len/2]*cr - im[i+k+len/2]*ci;
                float vi = re[i+k+len/2]*ci + im[i+k+len/2]*cr;
                re[i+k]       = ur + vr;  im[i+k]       = ui + vi;
                re[i+k+len/2] = ur - vr;  im[i+k+len/2] = ui - vi;
                float nr = cr*wre - ci*wim;  ci = cr*wim + ci*wre;  cr = nr;
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Sample access from the circular buffer with reflect-pad.
//
// Sample at audio_pos p is stored at s_circ[p % CIRC_SIZE].
//
// Reflect-pad (numpy mode='reflect'):
//   audio_pos < 0              -> use audio_pos = -audio_pos  (start reflect)
//   audio_pos >= WINDOW_SAMPLES -> use 2*N-2-audio_pos        (end reflect)
// ---------------------------------------------------------------------------
static inline float get_sample(int audio_pos) {
    if (audio_pos < 0) {
        audio_pos = -audio_pos;                           // start reflect
    } else if (audio_pos >= MEL_WINDOW_SAMPLES) {
        audio_pos = 2 * MEL_WINDOW_SAMPLES - 2 - audio_pos;  // end reflect
        if (audio_pos < 0) return 0.0f;
    }
    if (audio_pos >= s_total) return 0.0f;               // not received yet
    if (s_total - audio_pos > CIRC_SIZE) return 0.0f;   // overwritten
    return (float)s_circ[audio_pos % CIRC_SIZE] / 32768.0f;
}

// ---------------------------------------------------------------------------
// Compute one STFT frame and store mel-band energies in s_mel_spec
// ---------------------------------------------------------------------------
static void compute_frame(int frame_idx) {
    const int frame_start = frame_idx * MEL_HOP_LENGTH - PAD_SIZE;

    for (int n = 0; n < MEL_WIN_LENGTH; n++) {
        s_fft_re[n] = get_sample(frame_start + n) * s_hann[n];
        s_fft_im[n] = 0.0f;
    }

    fft_inplace(s_fft_re, s_fft_im, MEL_WIN_LENGTH);

    // Power spectrum in-place: overwrite s_fft_re with |FFT[k]|^2
    for (int k = 0; k < FFT_HALF; k++) {
        float r = s_fft_re[k], im_ = s_fft_im[k];
        s_fft_re[k] = r*r + im_*im_;
    }

    // Mel filterbank with Slaney normalisation (librosa default norm='slaney')
    for (int m = 0; m < MEL_N_MELS; m++) {
        float f_lo = s_mel_freqs[m];
        float f_c  = s_mel_freqs[m + 1];
        float f_hi = s_mel_freqs[m + 2];
        float energy = 0.0f;
        for (int k = s_mel_start[m]; k <= s_mel_end[m]; k++) {
            float f = (float)k * s_freq_res;
            float w;
            if      (f <= f_lo || f >= f_hi) w = 0.0f;
            else if (f <= f_c)               w = (f - f_lo) / (f_c - f_lo);
            else                             w = (f_hi - f) / (f_hi - f_c);
            energy += w * s_fft_re[k];
        }
        energy *= s_mel_norm[m];
        s_mel_spec[m][frame_idx] = (energy < AMIN) ? AMIN : energy;
    }
}

// ===========================================================================
// Public API
// ===========================================================================

void mel_frontend_init(void) {
    s_freq_res = (float)MEL_SAMPLE_RATE / (float)MEL_WIN_LENGTH;

    // Periodic Hann window: w[n] = 0.5*(1 - cos(2*pi*n/N))
    for (int n = 0; n < MEL_WIN_LENGTH; n++)
        s_hann[n] = 0.5f * (1.0f - cosf(2.0f*(float)M_PI*(float)n
                                         / (float)MEL_WIN_LENGTH));

    // Mel frequency grid: MEL_N_MELS+2 equally-spaced points in mel -> Hz
    float mel_lo = hz_to_mel(MEL_FMIN), mel_hi = hz_to_mel(MEL_FMAX);
    for (int i = 0; i < MEL_N_MELS + 2; i++) {
        float m = mel_lo + (mel_hi - mel_lo) * (float)i / (float)(MEL_N_MELS + 1);
        s_mel_freqs[i] = mel_to_hz(m);
    }

    // Filterbank ranges + Slaney normalisation
    for (int m = 0; m < MEL_N_MELS; m++) {
        float f_lo = s_mel_freqs[m], f_hi = s_mel_freqs[m + 2];
        s_mel_start[m] = (int)floorf(f_lo / s_freq_res);
        s_mel_end[m]   = (int)ceilf (f_hi / s_freq_res);
        if (s_mel_start[m] < 0)         s_mel_start[m] = 0;
        if (s_mel_end[m]   >= FFT_HALF) s_mel_end[m]   = FFT_HALF - 1;
        float bw = f_hi - f_lo;
        s_mel_norm[m] = (bw > 1e-8f) ? 2.0f / bw : 0.0f;
    }

    mel_frontend_reset();
}

void mel_frontend_reset(void) {
    s_total       = 0;
    s_frames_done = 0;
    memset(s_circ, 0, sizeof(s_circ));
}

void mel_frontend_feed(const int16_t* buf, int n) {
    for (int i = 0; i < n; i++) {
        if (s_frames_done >= MEL_N_FRAMES) break;  // window complete, stop

        s_circ[s_total % CIRC_SIZE] = buf[i];
        s_total++;

        // Trigger condition: frame t needs s_total > t*HOP + PAD_SIZE so that
        // the start-reflect sample (audio_pos=PAD_SIZE) is available for frame 0,
        // and all WIN_LENGTH samples fit within the CIRC_SIZE circular buffer.
        while (s_frames_done < MEL_N_FRAMES &&
               s_total > s_frames_done * MEL_HOP_LENGTH + PAD_SIZE) {
            compute_frame(s_frames_done);
            s_frames_done++;
        }
    }
}

bool mel_frontend_ready(void) {
    return (s_frames_done >= MEL_N_FRAMES);
}

void mel_frontend_finish(float* out_mel) {
    // power_to_db with ref=global max (mirrors librosa ref=np.max)
    float global_max = AMIN;
    for (int m = 0; m < MEL_N_MELS; m++)
        for (int t = 0; t < MEL_N_FRAMES; t++)
            if (s_mel_spec[m][t] > global_max) global_max = s_mel_spec[m][t];

    for (int m = 0; m < MEL_N_MELS; m++) {
        for (int t = 0; t < MEL_N_FRAMES; t++) {
            float db = 10.0f * log10f(s_mel_spec[m][t] / global_max);
            if (db < -MEL_TOP_DB) db = -MEL_TOP_DB;
            if (db >  0.0f)       db =  0.0f;
            out_mel[m * MEL_N_FRAMES + t] = (db + MEL_TOP_DB) / MEL_TOP_DB;
        }
    }
}
