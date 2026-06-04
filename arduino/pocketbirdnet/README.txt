PocketBirdNET — Arduino Nano 33 BLE Sense Setup
================================================

This folder contains everything you need to flash PocketBirdNET onto an
Arduino Nano 33 BLE Sense and pair it with the web dashboard.

HARDWARE REQUIRED
-----------------
  • Arduino Nano 33 BLE Sense (Rev1 or Rev2)
  • USB cable (USB-A to Micro-USB)
  • Optional: 1602A LCD display (HD44780, 4-bit mode)
      Wiring: RS→D12, E→D11, D4→D5, D5→D4, D6→D3, D7→D2

LIBRARY DEPENDENCIES  (install via Arduino IDE → Library Manager)
---------------------
  • Arduino_TensorFlowLite  by TensorFlow Authors
  • ArduinoBLE              by Arduino
  • LiquidCrystal           (bundled with Arduino IDE)
  • PDM                     (bundled with the Nano 33 BLE board package)

BOARD PACKAGE
-------------
  In Arduino IDE → Boards Manager, install:
    "Arduino Mbed OS Nano Boards"  (includes the Nano 33 BLE Sense)

FLASHING STEPS
--------------
  1. Open Arduino IDE (2.x recommended).
  2. File → Open → select this folder's pocketbirdnet.ino.
  3. Tools → Board → Arduino Mbed OS Nano Boards → Arduino Nano 33 BLE Sense.
  4. Tools → Port → select the COM/tty port for your board.
  5. Click Upload (→).
  6. Once flashing completes, open the Serial Monitor at 115200 baud to confirm
     the board is running and printing detections.

CONNECTING TO THE WEB DASHBOARD
--------------------------------
  1. Open https://web-neon-seven-91.vercel.app in Chrome or Edge (required —
     Web Bluetooth is not supported in Safari or Firefox).
  2. Click "Connect Board" — your browser will show a Bluetooth device picker.
  3. Select "PocketBirdNET" from the list.
  4. Click "Start Listening" and hold the board near a bird.
  5. The first confident detection (≥ 70%) will display on screen.

FILES IN THIS ZIP
-----------------
  pocketbirdnet.ino   Main Arduino sketch
  model.h             INT8 TFLite model baked in as a C byte array (Variant D)
  mel_frontend.cpp    On-device mel-spectrogram frontend (matches Python utils.py)
  mel_frontend.h      Header for the mel frontend

ABOUT THE MODEL
---------------
  The deployed model (Variant D) is a depthwise-separable CNN trained on
  10 Pacific Northwest bird species + a background class. It was produced by
  knowledge distillation from BirdNET followed by INT8 post-training
  quantization. Size: 60 KB. Peak RAM: ~85 KB. Detects:
    American Robin, Black-capped Chickadee, Steller's Jay, Northern Flicker,
    Song Sparrow, Anna's Hummingbird, Dark-eyed Junco, American Crow,
    Pacific Wren, House Finch.

SOURCE CODE & FULL RESEARCH
----------------------------
  https://github.com/rishabhlgoenka/PocketBirdNET

  The repository contains all training notebooks, evaluation results, and
  instructions for reproducing the four-variant comparison from scratch.
