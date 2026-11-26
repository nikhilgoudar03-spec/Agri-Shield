/*
 * ============================================================================================
 * AgriShield - ESP32-CAM Incident Capture Node
 * Camera Model: AI-THINKER ESP32-CAM
 * Captures JPEG frame on emergency trigger or periodic safety checkpoint and uploads to
 * AgriShield FastAPI Backend: POST /api/v1/camera/upload (multipart/form-data)
 * ============================================================================================
 */

#include "esp_camera.h"
#include <WiFi.h>
#include <HTTPClient.h>

// ---------- NETWORK CONFIGURATION ----------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Server Configuration
const char* SERVER_HOST   = "192.168.1.100";
const int   SERVER_PORT   = 8000;
const char* UPLOAD_PATH   = "/api/v1/camera/upload";
const char* DEVICE_API_KEY = "agrishield_demo_api_key_2026";

// ---------- CAMERA PIN DEFINITIONS (AI-THINKER) ----------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27

#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Trigger Pin (Connected to Main ESP32 Buzzer/Alarm or Fall Trigger signal)
#define TRIGGER_PIN       13

unsigned long lastCaptureTime = 0;
const unsigned long PERIODIC_INTERVAL_MS = 60000; // Periodic snapshot every 60s

void setup() {
  Serial.begin(115200);
  pinMode(TRIGGER_PIN, INPUT_PULLDOWN);

  Serial.println(F("[ESP32-CAM] Initializing camera..."));

  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer   = LEDC_TIMER_0;
  config.pin_d0       = Y2_GPIO_NUM;
  config.pin_d1       = Y3_GPIO_NUM;
  config.pin_d2       = Y4_GPIO_NUM;
  config.pin_d3       = Y5_GPIO_NUM;
  config.pin_d4       = Y6_GPIO_NUM;
  config.pin_d5       = Y7_GPIO_NUM;
  config.pin_d6       = Y8_GPIO_NUM;
  config.pin_d7       = Y9_GPIO_NUM;
  config.pin_xclk     = XCLK_GPIO_NUM;
  config.pin_pclk     = PCLK_GPIO_NUM;
  config.pin_vsync    = VSYNC_GPIO_NUM;
  config.pin_href     = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn     = PWDN_GPIO_NUM;
  config.pin_reset    = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_VGA; // 640x480
    config.jpeg_quality = 12;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_CIF; // 400x296
    config.jpeg_quality = 14;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("[ESP32-CAM] Camera init failed with error 0x%x\n", err);
    return;
  }

  // Connect to WiFi
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(F("."));
  }
  Serial.println(F("\n[ESP32-CAM] WiFi Connected!"));
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    WiFi.reconnect();
    delay(1000);
    return;
  }

  // Check hardware trigger (e.g., fall event or manual SOS pulse)
  if (digitalRead(TRIGGER_PIN) == HIGH) {
    Serial.println(F("[TRIGGER] Fall / SOS trigger detected on PIN 13! Capturing incident frame..."));
    captureAndUpload("FALL_TRIGGERED");
    delay(5000); // Debounce
  }

  // Periodic capture
  if (millis() - lastCaptureTime >= PERIODIC_INTERVAL_MS) {
    lastCaptureTime = millis();
    captureAndUpload("PERIODIC");
  }

  delay(200);
}

void captureAndUpload(const char* triggerType) {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println(F("[ESP32-CAM] Camera capture failed"));
    return;
  }

  WiFiClient client;
  if (!client.connect(SERVER_HOST, SERVER_PORT)) {
    Serial.println(F("[ESP32-CAM] Connection to server failed"));
    esp_camera_fb_return(fb);
    return;
  }

  String boundary = "----AgriShieldBoundary7MA4YWxkTrZu0gW";
  
  // Multipart body parts
  String head = "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"trigger_type\"\r\n\r\n";
  head += String(triggerType) + "\r\n";
  head += "--" + boundary + "\r\n";
  head += "Content-Disposition: form-data; name=\"file\"; filename=\"incident.jpg\"\r\n";
  head += "Content-Type: image/jpeg\r\n\r\n";

  String tail = "\r\n--" + boundary + "--\r\n";

  uint32_t totalLen = head.length() + fb->len + tail.length();

  client.println("POST " + String(UPLOAD_PATH) + " HTTP/1.1");
  client.println("Host: " + String(SERVER_HOST) + ":" + String(SERVER_PORT));
  client.println("X-Device-API-Key: " + String(DEVICE_API_KEY));
  client.println("Content-Type: multipart/form-data; boundary=" + boundary);
  client.println("Content-Length: " + String(totalLen));
  client.println("Connection: close");
  client.println();

  client.print(head);

  // Send JPEG buffer in chunks
  uint8_t *fbBuf = fb->buf;
  size_t fbLen = fb->len;
  for (size_t n = 0; n < fbLen; n += 1024) {
    if (n + 1024 < fbLen) {
      client.write(fbBuf, 1024);
      fbBuf += 1024;
    } else if (fbLen % 1024 > 0) {
      size_t remainder = fbLen % 1024;
      client.write(fbBuf, remainder);
    }
  }

  client.print(tail);
  esp_camera_fb_return(fb);

  Serial.println(F("[ESP32-CAM] Photo uploaded successfully!"));
}
