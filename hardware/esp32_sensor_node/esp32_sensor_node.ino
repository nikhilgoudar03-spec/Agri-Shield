/*
 * ============================================================================================
 * AgriShield - ESP32 DevKit V1 Smart Farmer Safety Sensor Node
 * Platform: ESP32 DevKit V1
 *
 * Real Hardware Peripherals:
 *   - DHT11 Temperature & Relative Humidity Sensor (Data Pin: GPIO 4)
 *   - NEO-6M GPS Module (HardwareSerial2: RX GPIO 16, TX GPIO 17)
 *   - MQ-135 Air-Quality Sensor (Analog Pin: GPIO 34) [General air-quality fluctuations]
 *   - MPU6050 6-Axis IMU (I2C: SDA GPIO 21, SCL GPIO 22) [Possible Fall Detection]
 *   - Warning Buzzer (GPIO 18) & Warning LED (GPIO 19)
 *
 * STRICT PROTOCOL:
 *   - NEVER use fake, simulated, or hardcoded sensor values or GPS coordinates.
 *   - If DHT11 is disconnected or reading fails, report "SENSOR_ERROR" and send null.
 *   - If NEO-6M GPS has no satellite lock, report "GPS FIX NOT AVAILABLE" and send null coordinates.
 * ============================================================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <DHT.h>
#include <TinyGPSPlus.h>

// ============================================================================================
// CONFIGURATION CONSTANTS (Adjust to match your deployment)
// ============================================================================================

// Wi-Fi Credentials
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// FastAPI Server Base URL (e.g., http://192.168.1.100:8000)
const char* SERVER_BASE_URL = "http://192.168.1.100:8000";

// Hardware Device Authentication
const char* DEVICE_ID      = "ESP32-AGRI-001";
const char* DEVICE_API_KEY = "agrishield_demo_api_key_2026";

// GPIO Pin Assignments
#define PIN_DHT11       4    // Digital Data Pin for DHT11
#define DHTTYPE     DHT11    // DHT 11 sensor model

#define GPS_RX_PIN     16    // ESP32 RX2 connects to NEO-6M TX
#define GPS_TX_PIN     17    // ESP32 TX2 connects to NEO-6M RX
#define GPS_BAUDRATE 9600    // Default NEO-6M NMEA baud rate

#define PIN_MQ135      34    // ADC1_CH6 Analog Input (General air quality)
#define PIN_BUZZER     18    // Active Buzzer
#define PIN_LED        19    // High-visibility Warning LED

// MPU6050 I2C Configuration
const int MPU_ADDR = 0x68;

// Telemetry Timers (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 4000;   // Post sensor readings every 4 seconds
const unsigned long GPS_INTERVAL_MS       = 5000;   // Check GPS coordinates every 5 seconds
const unsigned long HEARTBEAT_INTERVAL_MS = 15000;  // Send heartbeat every 15 seconds

unsigned long lastTelemetryTime = 0;
unsigned long lastGpsTime       = 0;
unsigned long lastHeartbeatTime = 0;

// Duplicate suppression tracking
double lastSentLat = 0.0;
double lastSentLon = 0.0;
unsigned long lastGpsTransmissionMs = 0;

// ============================================================================================
// GLOBAL SENSOR OBJECTS
// ============================================================================================

DHT dht(PIN_DHT11, DHTTYPE);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

// Motion state for possible fall detection
float accelX = 0.0, accelY = 0.0, accelZ = 0.0;
float gyroX  = 0.0, gyroY  = 0.0, gyroZ  = 0.0;

// ============================================================================================
// SETUP FUNCTION
// ============================================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println(F("====================================================="));
  Serial.println(F("  AGRISHIELD ESP32 DEV-KIT V1 SENSOR NODE STARTUP    "));
  Serial.println(F("====================================================="));

  // Configure output indicators
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LED, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, LOW);

  // Initialize DHT11 sensor
  Serial.println(F("[INIT] Initializing DHT11 on GPIO 4..."));
  dht.begin();

  // Initialize NEO-6M GPS on HardwareSerial2
  Serial.println(F("[INIT] Initializing NEO-6M GPS on RX2:GPIO16, TX2:GPIO17 (9600 baud)..."));
  gpsSerial.begin(GPS_BAUDRATE, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);

  // Initialize I2C for MPU6050
  Wire.begin(21, 22);
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B); // Power Management register
  Wire.write(0);    // Wake up MPU-6050
  Wire.endTransmission(true);

  // Connect to Wi-Fi
  connectWiFi();

  // Initial self-test beep
  digitalWrite(PIN_LED, HIGH);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(150);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, LOW);

  Serial.println(F("[INIT] System initialization complete. Entering main operational loop."));
}

// ============================================================================================
// MAIN LOOP
// ============================================================================================

void loop() {
  // 1. Maintain Wi-Fi connectivity
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 2. Continually decode incoming NMEA stream from NEO-6M GPS module
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // 3. Continuous motion check for possible fall detection
  readMPU6050();
  checkPossibleFall();

  unsigned long currentMillis = millis();

  // 4. Periodic Telemetry Transmission (DHT11 Temperature & Humidity)
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;
    sendTelemetry();
  }

  // 5. Periodic GPS Transmission (NEO-6M Satellite Location)
  if (currentMillis - lastGpsTime >= GPS_INTERVAL_MS) {
    lastGpsTime = currentMillis;
    sendGpsLocation();
  }

  // 6. Periodic Device Heartbeat
  if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeat();
  }

  delay(20);
}

// ============================================================================================
// WI-FI CONNECTION WITH AUTO-RECONNECT
// ============================================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print(F("[WIFI] Connecting to SSID: "));
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WIFI] Connected successfully!"));
    Serial.print(F("[WIFI] Node IP: "));
    Serial.println(WiFi.localIP());
    Serial.print(F("[WIFI] Signal Strength (RSSI): "));
    Serial.print(WiFi.RSSI());
    Serial.println(F(" dBm"));
  } else {
    Serial.println(F("\n[WIFI] Connection attempt failed. Will retry automatically."));
  }
}

// ============================================================================================
// DHT11 TELEMETRY TRANSMISSION (NO FAKE / DEFAULT VALUES)
// ============================================================================================

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Read actual DHT11 values
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  String sensorStatus = "VALID";
  bool tempValid = !isnan(temperature) && (temperature >= -20.0 && temperature <= 80.0);
  bool humValid  = !isnan(humidity) && (humidity >= 0.0 && humidity <= 100.0);

  if (!tempValid || !humValid) {
    sensorStatus = "SENSOR_ERROR";
    Serial.println(F("[DHT11] Sensor read failed or sensor disconnected! Reporting SENSOR_ERROR (no fake values)."));
  } else {
    Serial.printf("[DHT11] Temperature: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);
  }

  // Read optional MQ-135 relative index
  int rawMQ135 = analogRead(PIN_MQ135);
  float relativeMQ135 = (rawMQ135 / 4095.0) * 500.0;

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

  // Construct JSON strictly: if sensor invalid, send null (never fake numbers)
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"sensor_status\":\"" + sensorStatus + "\",";

  if (tempValid) {
    json += "\"temperature_c\":" + String(temperature, 1) + ",";
  } else {
    json += "\"temperature_c\":null,";
  }

  if (humValid) {
    json += "\"humidity_percent\":" + String(humidity, 1) + ",";
  } else {
    json += "\"humidity_percent\":null,";
  }

  json += "\"mq135_ppm\":" + String(relativeMQ135, 1) + ",";
  json += "\"accel_x\":" + String(accelX, 2) + ",";
  json += "\"accel_y\":" + String(accelY, 2) + ",";
  json += "\"accel_z\":" + String(accelZ, 2);
  json += "}";

  int httpCode = http.POST(json);
  if (httpCode == 200 || httpCode == 201) {
    Serial.printf("[TELEMETRY] Successfully transmitted to backend (HTTP %d)\n", httpCode);
  } else {
    Serial.printf("[TELEMETRY] Failed: HTTP %d | %s\n", httpCode, http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================================================
// NEO-6M GPS TRANSMISSION (STRICT SATELLITE FIX VALIDATION)
// ============================================================================================

void sendGpsLocation() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Strict GPS satellite fix validation: valid fix, age under 5000ms, at least 3 satellites, non-zero
  bool fixValid = gps.location.isValid() && 
                  (gps.location.age() < 5000) && 
                  (gps.satellites.value() >= 3) &&
                  (gps.location.lat() != 0.0 && gps.location.lng() != 0.0) &&
                  (gps.location.lat() >= -90.0 && gps.location.lat() <= 90.0) &&
                  (gps.location.lng() >= -180.0 && gps.location.lng() <= 180.0);

  int satelliteCount = gps.satellites.isValid() ? gps.satellites.value() : 0;
  double latitude  = fixValid ? gps.location.lat() : 0.0;
  double longitude = fixValid ? gps.location.lng() : 0.0;
  float altitude   = (fixValid && gps.altitude.isValid()) ? gps.altitude.meters() : 0.0;
  float speedKmph  = (fixValid && gps.speed.isValid()) ? gps.speed.kmph() : 0.0;

  // Avoid sending duplicate coordinates if stationary (< ~2 meters change) and transmitted within last 20 seconds
  if (fixValid && lastSentLat != 0.0) {
    double deltaLat = abs(latitude - lastSentLat);
    double deltaLon = abs(longitude - lastSentLon);
    if (deltaLat < 0.00002 && deltaLon < 0.00002 && (millis() - lastGpsTransmissionMs < 20000)) {
      // Position unchanged, avoid flooding duplicate points
      return;
    }
  }

  if (fixValid) {
    Serial.printf("[GPS] Fix LOCKED: Lat: %.6f, Lon: %.6f, Sats: %d, Alt: %.1fm\n",
                  latitude, longitude, satelliteCount, altitude);
  } else {
    Serial.printf("[GPS] Awaiting satellite lock (Sats visible: %d). No coordinates transmitted.\n", satelliteCount);
  }

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/gps";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

  // Construct JSON strictly: only send coordinates if fixValid is true
  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"satellites\":" + String(satelliteCount) + ",";
  json += "\"gps_fix\":" + String(fixValid ? "true" : "false") + ",";

  if (fixValid) {
    json += "\"latitude\":" + String(latitude, 6) + ",";
    json += "\"longitude\":" + String(longitude, 6) + ",";
    json += "\"altitude_m\":" + String(altitude, 1) + ",";
    json += "\"speed\":" + String(speedKmph, 1);

    // Append UTC GPS timestamp if available
    if (gps.date.isValid() && gps.time.isValid()) {
      char isoBuf[32];
      snprintf(isoBuf, sizeof(isoBuf), "%04d-%02d-%02dT%02d:%02d:%02dZ",
               gps.date.year(), gps.date.month(), gps.date.day(),
               gps.time.hour(), gps.time.minute(), gps.time.second());
      json += ",\"recorded_at\":\"" + String(isoBuf) + "\"";
    }
  } else {
    json += "\"latitude\":null,";
    json += "\"longitude\":null,";
    json += "\"altitude_m\":null,";
    json += "\"speed\":null";
  }
  json += "}";

  int httpCode = http.POST(json);

  // Automatic single retry on network glitch
  if (httpCode <= 0) {
    delay(400);
    httpCode = http.POST(json);
  }

  if (httpCode == 200 || httpCode == 201) {
    Serial.printf("[GPS] Transmitted to backend (HTTP %d)\n", httpCode);
    if (fixValid) {
      lastSentLat = latitude;
      lastSentLon = longitude;
      lastGpsTransmissionMs = millis();
    }
  } else {
    Serial.printf("[GPS] Failed: HTTP %d | %s\n", httpCode, http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================================================
// HEARTBEAT TRANSMISSION
// ============================================================================================

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/v1/devices/heartbeat";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

  int rssi = WiFi.RSSI();
  String payload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"signal_strength\":" + String(rssi) + ",\"status\":\"ONLINE\"}";

  http.POST(payload);
  http.end();
}

// ============================================================================================
// MPU6050 & POSSIBLE FALL DETECTION
// ============================================================================================

void readMPU6050() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x3B);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU_ADDR, 14, true);

  if (Wire.available() >= 14) {
    int16_t ax = Wire.read() << 8 | Wire.read();
    int16_t ay = Wire.read() << 8 | Wire.read();
    int16_t az = Wire.read() << 8 | Wire.read();
    Wire.read(); Wire.read(); // Skip temp
    int16_t gx = Wire.read() << 8 | Wire.read();
    int16_t gy = Wire.read() << 8 | Wire.read();
    int16_t gz = Wire.read() << 8 | Wire.read();

    accelX = (ax / 16384.0) * 9.80665;
    accelY = (ay / 16384.0) * 9.80665;
    accelZ = (az / 16384.0) * 9.80665;

    gyroX = gx / 131.0;
    gyroY = gy / 131.0;
    gyroZ = gz / 131.0;
  }
}

void checkPossibleFall() {
  float magnitude = sqrt(accelX * accelX + accelY * accelY + accelZ * accelZ);

  // Freefall (< 3.0 m/s^2) or heavy impact (> 26.0 m/s^2)
  if (magnitude > 26.0 || magnitude < 3.0) {
    Serial.printf("[ALERT] Possible fall detected! Acceleration Vector: %.2f m/s^2\n", magnitude);

    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_LED, HIGH);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      String url = String(SERVER_BASE_URL) + "/api/v1/fall-detection/event";
      http.begin(url);
      http.addHeader("Content-Type", "application/json");
      http.addHeader("X-Device-Id", DEVICE_ID);
      http.addHeader("X-Device-API-Key", DEVICE_API_KEY);

      String payload = "{";
      payload += "\"accel_x\":" + String(accelX, 2) + ",";
      payload += "\"accel_y\":" + String(accelY, 2) + ",";
      payload += "\"accel_z\":" + String(accelZ, 2) + ",";
      payload += "\"gyro_x\":" + String(gyroX, 2) + ",";
      payload += "\"gyro_y\":" + String(gyroY, 2) + ",";
      payload += "\"gyro_z\":" + String(gyroZ, 2) + ",";
      payload += "\"event_type\":\"POSSIBLE_FALL\"";
      payload += "}";

      http.POST(payload);
      http.end();
    }

    delay(600);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_LED, LOW);
  }
}
