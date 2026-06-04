/*
 * pocketbirdnet.ino — PocketBirdNET on Arduino Nano 33 BLE Sense
 *
 * Pipeline:
 *   PDM mic -> PDM ring buffer -> mel_frontend_feed() (streaming)
 *   -> INT8 TFLite inference -> BLE notify + Serial + LCD output
 *
 * Hardware : Arduino Nano 33 BLE Sense (nRF52840, 256 KB RAM, 1 MB Flash)
 *            1602A LCD (HD44780, 4-bit): RS=D12, E=D11, D4=D5, D5=D4, D6=D3, D7=D2
 *
 * Library Manager — install before compiling:
 *   "Arduino_TensorFlowLite" by TensorFlow Authors
 *   "ArduinoBLE"             by Arduino
 *   "LiquidCrystal"          (bundled with Arduino IDE)
 *   PDM                      (bundled with Nano 33 BLE board package)
 *
 * BLE contract (mirrors web/src/constants/ble.ts — change both together):
 *   Device name        : PocketBirdNET
 *   Service UUID       : 19b10000-e8f2-537e-4f6c-d104768a1214
 *   Characteristic UUID: 19b10001-e8f2-537e-4f6c-d104768a1214
 *   Payload            : 2 bytes [uint8 classIndex, uint8 confidencePercent]
 */

#include <PDM.h>
#include <ArduinoBLE.h>
#include <LiquidCrystal.h>
#include "TensorFlowLite.h"
#include "tensorflow/lite/micro/micro_error_reporter.h"
#include "tensorflow/lite/micro/micro_interpreter.h"
#include "tensorflow/lite/micro/micro_mutable_op_resolver.h"

#include "model.h"          // g_model, kCategoryLabels, kCategoryCount
#include "mel_frontend.h"   // streaming mel-spectrogram frontend

// ---------------------------------------------------------------------------
// BLE — service + characteristic
// UUIDs must match web/src/constants/ble.ts exactly.
// Pattern follows the working Arduino BLE reference sketch:
//   BLE.setLocalName()  + BLE.setDeviceName()  (both are required)
//   BLE.setAdvertisedService()  ->  BLE.addService()  ->  BLE.advertise()
// Characteristic uses BLERead | BLENotify so Web Bluetooth can both
// read the current value and subscribe to notifications.
// ---------------------------------------------------------------------------
#define BLE_DEVICE_NAME   "PocketBirdNET"
#define BLE_SERVICE_UUID  "19b10000-e8f2-537e-4f6c-d104768a1214"
#define BLE_CHAR_UUID     "19b10001-e8f2-537e-4f6c-d104768a1214"

BLEService           bleService(BLE_SERVICE_UUID);
BLECharacteristic    detectionChar(BLE_CHAR_UUID, BLERead | BLENotify, 2);

// ---------------------------------------------------------------------------
// Inference threshold
// ---------------------------------------------------------------------------
static const float CONFIDENCE_THRESHOLD = 0.70f;

// ---------------------------------------------------------------------------
// Tensor arena
// ---------------------------------------------------------------------------
static const int TENSOR_ARENA_SIZE = 88 * 1024;
static uint8_t   tensor_arena[TENSOR_ARENA_SIZE];

// ---------------------------------------------------------------------------
// TFLite objects
// ---------------------------------------------------------------------------
static const tflite::Model*      tfl_model     = nullptr;
static tflite::MicroInterpreter* interpreter   = nullptr;
static TfLiteTensor*             input_tensor  = nullptr;
static TfLiteTensor*             output_tensor = nullptr;

static tflite::MicroMutableOpResolver<7> resolver;
static tflite::MicroErrorReporter        micro_error_reporter;

// ---------------------------------------------------------------------------
// Mel output buffer
// ---------------------------------------------------------------------------
static float mel_output[MEL_OUTPUT_SIZE];

// ---------------------------------------------------------------------------
// PDM ring buffer  (ISR -> main loop)
// ---------------------------------------------------------------------------
#define PDM_RING 1024
static int16_t      pdm_ring[PDM_RING];
static volatile int pdm_write = 0;
static int          pdm_read  = 0;

static void on_pdm_data() {
    int avail = PDM.available() / 2;
    while (avail > 0) {
        int pos     = pdm_write % PDM_RING;
        int to_end  = PDM_RING - pos;
        int to_read = (avail < to_end) ? avail : to_end;
        PDM.read(pdm_ring + pos, to_read * 2);
        pdm_write += to_read;
        avail     -= to_read;
    }
}

// ---------------------------------------------------------------------------
// LCD — 1602A (HD44780), 4-bit mode
// ---------------------------------------------------------------------------
static LiquidCrystal lcd(12, 11, 5, 4, 3, 2);

static const float LCD_CONF_MIN  = 0.60f;
static const int   LCD_SCROLL_DT = 400;
static const int   LCD_HOLD_DT   = 1000;

static char          disp_cur_label[32] = "";
static int           disp_cur_score     = -99;
static int           disp_scroll_pos    = 0;
static bool          disp_scrolling     = false;
static bool          disp_holding       = false;
static unsigned long disp_tick_ms       = 0;
static const char*   disp_last_label    = "";
static int           disp_last_score    = 0;

void updateDisplay(const char* label, int score_pct) {
    bool        no_bird  = (score_pct < (int)(LCD_CONF_MIN * 100.0f + 0.5f));
    const char* show     = no_bird ? "No bird detected" : label;
    int         show_len = (int)strlen(show);

    bool label_changed = (strncmp(show, disp_cur_label, 31) != 0);
    bool score_shifted = (!no_bird && abs(score_pct - disp_cur_score) > 2);

    if (label_changed) {
        strncpy(disp_cur_label, show, 31);
        disp_cur_label[31] = '\0';
        disp_cur_score  = score_pct;
        disp_scroll_pos = 0;
        disp_scrolling  = (show_len > 16);
        disp_holding    = false;
        disp_tick_ms    = millis();

        char r0[17]; strncpy(r0, show, 16); r0[16] = '\0';
        lcd.setCursor(0, 0); lcd.print("                ");
        lcd.setCursor(0, 0); lcd.print(r0);

        lcd.setCursor(0, 1); lcd.print("                ");
        if (!no_bird) {
            char r1[17]; snprintf(r1, sizeof(r1), "Score:%9d%%", score_pct);
            lcd.setCursor(0, 1); lcd.print(r1);
        }
        return;
    }

    if (score_shifted) {
        disp_cur_score = score_pct;
        lcd.setCursor(0, 1); lcd.print("                ");
        if (!no_bird) {
            char r1[17]; snprintf(r1, sizeof(r1), "Score:%9d%%", score_pct);
            lcd.setCursor(0, 1); lcd.print(r1);
        }
    }

    if (!disp_scrolling) return;
    unsigned long now = millis();
    if (disp_holding) {
        if (now - disp_tick_ms >= (unsigned long)LCD_HOLD_DT) {
            disp_holding = false; disp_scroll_pos = 0; disp_tick_ms = now;
            char r0[17]; strncpy(r0, show, 16); r0[16] = '\0';
            lcd.setCursor(0, 0); lcd.print(r0);
        }
    } else {
        if (now - disp_tick_ms >= (unsigned long)LCD_SCROLL_DT) {
            disp_tick_ms = now;
            disp_scroll_pos++;
            int max_pos = show_len - 16;
            if (disp_scroll_pos >= max_pos) { disp_scroll_pos = max_pos; disp_holding = true; }
            char r0[17]; strncpy(r0, show + disp_scroll_pos, 16); r0[16] = '\0';
            lcd.setCursor(0, 0); lcd.print(r0);
        }
    }
}

// ---------------------------------------------------------------------------
// setup()
// ---------------------------------------------------------------------------
void setup() {
    Serial.begin(115200);
    while (!Serial);

    // LCD startup
    lcd.begin(16, 2);
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("BirdNET Ready");
    { unsigned long _t = millis(); while (millis() - _t < 2000UL) {} }
    lcd.clear();

    Serial.println("=== PocketBirdNET ===");

    // ---- BLE setup (mirrors the reference Arduino BLE Sense demo) ----------
    // Must call both setLocalName (advertisement) and setDeviceName (GATT)
    // so the device appears correctly in both the browser picker and
    // paired-device lists.
    if (!BLE.begin()) {
        Serial.println("ERROR: BLE.begin() failed");
        while (1);
    }
    BLE.setLocalName(BLE_DEVICE_NAME);
    BLE.setDeviceName(BLE_DEVICE_NAME);         // ← required for browser discovery
    BLE.setAdvertisedService(bleService);
    bleService.addCharacteristic(detectionChar);
    BLE.addService(bleService);

    // Write a default payload so the characteristic has a value before
    // the first inference (Web Bluetooth can read it immediately after connect).
    uint8_t initial[2] = {10, 0};              // classIndex=10 (background), conf=0
    detectionChar.writeValue(initial, 2);

    BLE.advertise();
    Serial.print("[BLE] advertising as \""); Serial.print(BLE_DEVICE_NAME); Serial.println("\"");
    Serial.print("[BLE] service  : "); Serial.println(BLE_SERVICE_UUID);
    Serial.print("[BLE] char     : "); Serial.println(BLE_CHAR_UUID);

    // ---- Mel frontend -------------------------------------------------------
    mel_frontend_init();

    // ---- TFLite model -------------------------------------------------------
    tfl_model = tflite::GetModel(g_model);
    if (tfl_model == nullptr) {
        Serial.println("ERROR: GetModel() returned null");
        while (1);
    }

    resolver.AddConv2D();
    resolver.AddDepthwiseConv2D();
    resolver.AddFullyConnected();
    resolver.AddMean();
    resolver.AddSoftmax();
    resolver.AddQuantize();
    resolver.AddDequantize();

    static tflite::MicroInterpreter static_interp(
        tfl_model, resolver, tensor_arena, TENSOR_ARENA_SIZE,
        &micro_error_reporter);
    interpreter = &static_interp;

    if (interpreter->AllocateTensors() != kTfLiteOk) {
        Serial.println("ERROR: AllocateTensors() failed — increase TENSOR_ARENA_SIZE");
        while (1);
    }

    input_tensor  = interpreter->input(0);
    output_tensor = interpreter->output(0);

    if (input_tensor->dims->size   != 4 ||
        input_tensor->dims->data[1] != MEL_N_MELS ||
        input_tensor->dims->data[2] != MEL_N_FRAMES) {
        Serial.println("ERROR: model input shape mismatch");
        while (1);
    }

    Serial.print("Arena used : "); Serial.print(interpreter->arena_used_bytes()); Serial.println(" bytes");
    Serial.print("Classes    : "); Serial.println(kCategoryCount);

    // ---- PDM microphone -----------------------------------------------------
    PDM.onReceive(on_pdm_data);
    if (!PDM.begin(1, MEL_SAMPLE_RATE)) {
        Serial.println("ERROR: PDM.begin() failed");
        while (1);
    }

    Serial.println("Ready. Listening...");
}

// ---------------------------------------------------------------------------
// loop()
// ---------------------------------------------------------------------------
void loop() {
    // ---- BLE stack tick -----------------------------------------------------
    // BLE.poll() must be called regularly to handle connect/disconnect events
    // and to keep notifications flowing.  Call it at the TOP of every loop pass
    // so the BLE stack gets CPU time even during long mel/inference cycles.
    BLE.poll();

    // Log new BLE central connections (mirrors reference pattern)
    {
        static bool was_connected = false;
        bool now_connected = BLE.connected();
        if (now_connected && !was_connected) {
            Serial.print("[BLE] central connected: ");
            Serial.println(BLE.central().address());
        } else if (!now_connected && was_connected) {
            Serial.println("[BLE] central disconnected");
        }
        was_connected = now_connected;
    }

    // ---- LCD scroll tick ----------------------------------------------------
    updateDisplay(disp_last_label, disp_last_score);

    // ---- Drain PDM ring buffer ----------------------------------------------
    int available = pdm_write - pdm_read;
    if (available > 0) {
        int pos    = pdm_read % PDM_RING;
        int contig = PDM_RING - pos;
        int batch  = (available < contig) ? available : contig;
        mel_frontend_feed(pdm_ring + pos, batch);
        pdm_read += batch;
    }

    // ---- Wait until 32 mel frames are ready ---------------------------------
    if (!mel_frontend_ready()) return;

    mel_frontend_finish(mel_output);

    // ---- Quantise features -> INT8 -----------------------------------------
    const float   in_scale = input_tensor->params.scale;
    const int32_t in_zp    = input_tensor->params.zero_point;
    int8_t* const in_data  = input_tensor->data.int8;
    for (int i = 0; i < MEL_OUTPUT_SIZE; i++) {
        int32_t q = (int32_t)roundf(mel_output[i] / in_scale) + in_zp;
        if (q < -128) q = -128;
        if (q >  127) q =  127;
        in_data[i] = (int8_t)q;
    }

    // ---- Run inference ------------------------------------------------------
    if (interpreter->Invoke() != kTfLiteOk) {
        Serial.println("ERROR: Invoke() failed");
        mel_frontend_reset();
        return;
    }

    // ---- Read probabilities -------------------------------------------------
    float probs[11];
    const int n = kCategoryCount;
    if (output_tensor->type == kTfLiteFloat32) {
        for (int i = 0; i < n; i++) probs[i] = output_tensor->data.f[i];
    } else {
        const float   out_scale = output_tensor->params.scale;
        const int32_t out_zp    = output_tensor->params.zero_point;
        for (int i = 0; i < n; i++)
            probs[i] = (output_tensor->data.int8[i] - out_zp) * out_scale;
    }

    // ---- Argmax -------------------------------------------------------------
    int   best = 0;
    float best_p = probs[0];
    for (int i = 1; i < n; i++)
        if (probs[i] > best_p) { best_p = probs[i]; best = i; }

    const uint8_t conf_pct = (uint8_t)(best_p * 100.0f);

    // ---- Serial output ------------------------------------------------------
    const bool is_background = (best == n - 1);
    if (best_p >= CONFIDENCE_THRESHOLD && !is_background) {
        Serial.print(kCategoryLabels[best]); Serial.print("  ");
        Serial.print(conf_pct); Serial.println("%");
    } else {
        Serial.println("Unknown");
    }

    // ---- BLE notification ---------------------------------------------------
    // Write [classIndex, confidencePercent] to the characteristic.
    // BLERead | BLENotify means:
    //   - the web app can read the last value at any time
    //   - a subscribed central receives a notification immediately
    // writeValue() only sends if a central has subscribed (CCCD enabled);
    // it is safe to call even when no central is connected.
    {
        uint8_t payload[2] = { (uint8_t)best, conf_pct };
        detectionChar.writeValue(payload, 2);
    }

    // ---- LCD update ---------------------------------------------------------
    disp_last_label = kCategoryLabels[best];
    disp_last_score = (int)conf_pct;
    updateDisplay(disp_last_label, disp_last_score);

    // ---- Reset for next window ----------------------------------------------
    mel_frontend_reset();
}
