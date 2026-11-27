/*
 * ============================================================================================
 * AgriShield - ESP8266 NodeMCU Smart Farmer Safety Sensor Node
 * Platform: ESP8266 NodeMCU (Amica / Lolin / ESP-12E / ESP-12F)
 *
 * Physical Hardware Components:
 *   1. ESP8266 NodeMCU V3
 *   2. DHT22 / DHT11 Temperature & Relative Humidity Sensor (NodeMCU Pin D2 / GPIO 4)
 *   3. MQ-135 Gas & Air Quality Sensor (Analog Pin A0 - ADC 0-1023)
 *   4. NEO-6M GPS Module (SoftwareSerial: RX D6/GPIO 12, TX D5/GPIO 14)
 *   5. MPU6050 6-Axis Motion & Accelerometer (I2C: SDA D2 / SCL D1 or shared I2C bus)
 *   6. 16x2 I2C LCD Display (0x27 or 0x3F)
 *   7. Active Buzzer Alarm (NodeMCU Pin D7 / GPIO 13) & Warning LED (D4 / GPIO 2)
 *
 * Registered Hardware Device Configuration:
 *   - Device ID: 3
 *   - Device UID: AGRISHIELD_ESP8266_01
 *   - Device Name: AgriShield Farmer Safety Device
 *   - Assigned Farmer: Mithun
 *   - Port: 8001
 * ============================================================================================
 */

#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecure.h>
#include <SoftwareSerial.h>
#include <Wire.h>
#include <DHT.h>
#include <TinyGPSPlus.h>
#include <LiquidCrystal_I2C.h>

// ============================================================================================
// 1. NETWORK & BACKEND CONFIGURATION
// ============================================================================================

// Wi-Fi Network Credentials (2.4 GHz only)
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// Production Single-Domain URL (Cloudflare Public HTTPS Tunnel):
// - Direct Public HTTPS: https://destination-short-correspondence-rap.trycloudflare.com
// - Local LAN IPv4 Fallback: http://10.220.195.134:8001
const char* SERVER_BASE_URL = "https://destination-short-correspondence-rap.trycloudflare.com";

// ============================================================================================
// 2. REGISTERED DEVICE #3 CREDENTIALS
// ============================================================================================
const char* DEVICE_ID      = "3";
const char* DEVICE_UID     = "AGRISHIELD_ESP8266_01";
const char* DEVICE_API_KEY = "agri_dev_j-liUs7pGbOhbqM-8S1tAiwwYCGPuu4f";
const char* DEVICE_KEY     = "agri_dev_j-liUs7pGbOhbqM-8S1tAiwwYCGPuu4f"; // API Key or Secret Key

// ============================================================================================
// 3. HARDWARE PIN DEFINITIONS
// ============================================================================================

// DHT22 Climate Sensor (Pin D2 / GPIO 4)
#define PIN_DHT          D2
#define DHTTYPE       DHT22   // Set to DHT22 (or DHT11 if using DHT11)

// MQ-135 Raw Analog Air-Quality (ESP8266 dedicated ADC Pin A0)
#define PIN_MQ135_ANALOG A0

// SoftwareSerial UART for NEO-6M GPS (Hardware UART0 is reserved for USB Serial Monitor)
#define GPS_RX_PIN       D6   // GPIO 12 -> Connects to NEO-6M TX pin
#define GPS_TX_PIN       D5   // GPIO 14 -> Connects to NEO-6M RX pin
#define GPS_BAUDRATE   9600   // NEO-6M default NMEA baud rate

// Acoustic Alarm & Indicator
#define PIN_BUZZER       D7   // GPIO 13
#define PIN_LED          D4   // GPIO 2 (Onboard blue LED, active LOW)

// MPU6050 I2C Address
const int MPU6050_ADDR = 0x68;

// Transmission Timers (milliseconds)
const unsigned long TELEMETRY_INTERVAL_MS = 4000;   // Sensor readings every 4 seconds
const unsigned long GPS_INTERVAL_MS       = 5000;   // GPS satellite tracking every 5 seconds
const unsigned long HEARTBEAT_INTERVAL_MS = 15000;  // Heartbeat every 15 seconds

unsigned long lastTelemetryTime = 0;
unsigned long lastGpsTime       = 0;
unsigned long lastHeartbeatTime = 0;

// Duplicate coordinate suppression tracking
double lastSentLat = 0.0;
double lastSentLon = 0.0;
unsigned long lastGpsTransmissionMs = 0;

// ============================================================================================
// 4. GLOBAL HARDWARE OBJECTS
// ============================================================================================

DHT dht(PIN_DHT, DHTTYPE);
TinyGPSPlus gps;
SoftwareSerial gpsSerial(GPS_RX_PIN, GPS_TX_PIN);
LiquidCrystal_I2C lcd(0x27, 16, 2); // 16x2 I2C LCD (default 0x27 or 0x3F)

bool lcdAvailable = false;
bool mpuAvailable = false;

// ============================================================================================
// HELPER: ADD REQUIRED AGRISHIELD HEADERS
// ============================================================================================
void addAgriShieldHeaders(HTTPClient& http) {
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Id", DEVICE_ID);
  http.addHeader("X-Device-UID", DEVICE_UID);
  http.addHeader("X-Device-API-Key", DEVICE_API_KEY);
  http.addHeader("X-Device-Key", DEVICE_KEY);
}

void beginHttp(HTTPClient& http, WiFiClient& client, WiFiClientSecure& secureClient, const String& url) {
  if (url.startsWith("https://")) {
    secureClient.setInsecure();
    http.begin(secureClient, url);
  } else {
    http.begin(client, url);
  }
}

// ============================================================================================
// SETUP FUNCTION
// ============================================================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println();
  Serial.println(F("=========================================================="));
  Serial.println(F("  AGRISHIELD ESP8266 NODEMCU SENSOR NODE INITIALIZATION   "));
  Serial.println(F("=========================================================="));
  Serial.printf("[INFO] Device ID: %s | UID: %s\n", DEVICE_ID, DEVICE_UID);
  Serial.printf("[INFO] Target Backend Server: %s\n", SERVER_BASE_URL);

  // Configure Indicators
  pinMode(PIN_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  digitalWrite(PIN_LED, HIGH);  // NodeMCU onboard LED active LOW (OFF)
  digitalWrite(PIN_BUZZER, LOW);

  // Initialize I2C (SDA=D2, SCL=D1)
  Wire.begin(D2, D1);

  // Initialize LCD
  Wire.beginTransmission(0x27);
  if (Wire.endTransmission() == 0) {
    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("AgriShield Node");
    lcd.setCursor(0, 1);
    lcd.print("ID:3 ESP8266");
    lcdAvailable = true;
  }

  // Initialize MPU6050
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(0x6B); // PWR_MGMT_1
  Wire.write(0);    // Wake up
  if (Wire.endTransmission() == 0) {
    mpuAvailable = true;
    Serial.println(F("[INIT] MPU6050 6-Axis motion sensor initialized."));
  }

  // Initialize DHT22
  Serial.println(F("[INIT] Initializing DHT22 Temperature & Humidity sensor..."));
  dht.begin();

  // Initialize NEO-6M GPS SoftwareSerial
  Serial.printf("[INIT] Initializing NEO-6M GPS UART at %d baud...\n", GPS_BAUDRATE);
  gpsSerial.begin(GPS_BAUDRATE);

  // Connect to Wi-Fi Network
  connectWiFi();

  // Startup Chirp
  digitalWrite(PIN_LED, LOW);
  digitalWrite(PIN_BUZZER, HIGH);
  delay(150);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_LED, HIGH);

  if (lcdAvailable) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("AgriShield OK");
    lcd.setCursor(0, 1);
    lcd.print("Mithun (Dev #3)");
  }

  Serial.println(F("[INIT] ESP8266 NodeMCU initialized successfully."));
  Serial.println(F("[INIT] Transmitting Heartbeat, DHT22, MQ-135, and GPS."));
}

// ============================================================================================
// MAIN LOOP
// ============================================================================================

void loop() {
  // 1. Maintain Wi-Fi Connectivity
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // 2. Continually decode incoming NMEA serial stream from NEO-6M via SoftwareSerial
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  unsigned long currentMillis = millis();

  // 3. Periodic Heartbeat Transmission (every 15s)
  if (currentMillis - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = currentMillis;
    sendHeartbeat();
  }

  // 4. Periodic Telemetry Transmission (every 4s)
  if (currentMillis - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = currentMillis;
    sendTelemetry();
  }

  // 5. Periodic GPS Transmission (every 5s)
  if (currentMillis - lastGpsTime >= GPS_INTERVAL_MS) {
    lastGpsTime = currentMillis;
    sendGpsLocation();
  }

  yield();
}

// ============================================================================================
// WI-FI AUTO-RECONNECT
// ============================================================================================

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.printf("\n[WIFI] Connecting to 2.4GHz Wi-Fi: %s", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(400);
    Serial.print(F("."));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println(F("[WIFI] Connected successfully!"));
    Serial.printf("[WIFI] NodeMCU IP: %s | RSSI: %d dBm\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    Serial.println(F("\n[WIFI] Connection failed. Retrying in next loop."));
  }
}

// ============================================================================================
// DEVICE HEARTBEAT TRANSMISSION
// ============================================================================================

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  WiFiClientSecure secureClient;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/v1/devices/heartbeat";

  beginHttp(http, client, secureClient, url);
  addAgriShieldHeaders(http);

  int rssi = WiFi.RSSI();
  String payload = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"signal_strength\":" + String(rssi) + ",\"status\":\"ONLINE\"}";

  int httpCode = http.POST(payload);
  if (httpCode == 200 || httpCode == 201) {
    Serial.printf("[HEARTBEAT] Sent -> HTTP %d (ONLINE confirmed)\n", httpCode);
  } else {
    Serial.printf("[HEARTBEAT] Failed: HTTP %d | %s\n", httpCode, http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================================================
// DHT22 & MQ-135 RAW TELEMETRY TRANSMISSION
// ============================================================================================

void sendTelemetry() {
  if (WiFi.status() != WL_CONNECTED) return;

  // Read DHT22
  float temperature = dht.readTemperature();
  float humidity    = dht.readHumidity();

  String sensorStatus = "VALID";
  bool tempValid = !isnan(temperature) && (temperature >= -40.0 && temperature <= 85.0);
  bool humValid  = !isnan(humidity) && (humidity >= 0.0 && humidity <= 100.0);

  if (!tempValid || !humValid) {
    sensorStatus = "SENSOR_ERROR";
    Serial.println(F("[DHT22] Reading failed or disconnected -> reporting SENSOR_ERROR (null values)."));
  }

  // Read actual MQ-135 raw ADC reading from A0 (0 to 1023)
  int mq135Raw = analogRead(PIN_MQ135_ANALOG);

  // Read MPU6050 accelerometer if available
  float ax = 0.0, ay = 0.0, az = 0.0;
  if (mpuAvailable) {
    Wire.beginTransmission(MPU6050_ADDR);
    Wire.write(0x3B);
    if (Wire.endTransmission() == 0) {
      Wire.requestFrom(MPU6050_ADDR, 6);
      if (Wire.available() >= 6) {
        int16_t rawAx = Wire.read() << 8 | Wire.read();
        int16_t rawAy = Wire.read() << 8 | Wire.read();
        int16_t rawAz = Wire.read() << 8 | Wire.read();
        ax = (float)rawAx / 16384.0;
        ay = (float)rawAy / 16384.0;
        az = (float)rawAz / 16384.0;
      }
    }
  }

  // Update LCD readout if connected
  if (lcdAvailable) {
    lcd.setCursor(0, 0);
    if (tempValid) {
      lcd.printf("T:%.1fC H:%.0f%% ", temperature, humidity);
    } else {
      lcd.print("Sensor Err      ");
    }
    lcd.setCursor(0, 1);
    lcd.printf("MQ:%4d RSSI:%2d", mq135Raw, WiFi.RSSI());
  }

  WiFiClient client;
  WiFiClientSecure secureClient;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/v1/telemetry";

  beginHttp(http, client, secureClient, url);
  addAgriShieldHeaders(http);

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

  json += "\"mq135_raw\":" + String(mq135Raw);

  if (mpuAvailable) {
    json += ",\"accel_x\":" + String(ax, 2);
    json += ",\"accel_y\":" + String(ay, 2);
    json += ",\"accel_z\":" + String(az, 2);
  }

  json += "}";

  int httpCode = http.POST(json);
  if (httpCode <= 0) {
    delay(200);
    httpCode = http.POST(json);
  }

  if (httpCode == 200 || httpCode == 201) {
    Serial.printf("[TELEMETRY] Sent -> Temp: %.1fC | Hum: %.1f%% | MQ-135 Raw: %d (HTTP %d)\n",
                  tempValid ? temperature : 0.0, humValid ? humidity : 0.0, mq135Raw, httpCode);
  } else {
    Serial.printf("[TELEMETRY] Failed: HTTP %d | %s\n", httpCode, http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ============================================================================================
// NEO-6M GPS SATELLITE FIX TRANSMISSION
// ============================================================================================

void sendGpsLocation() {
  if (WiFi.status() != WL_CONNECTED) return;

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

  // Duplicate suppression
  if (fixValid && lastSentLat != 0.0) {
    double deltaLat = abs(latitude - lastSentLat);
    double deltaLon = abs(longitude - lastSentLon);
    if (deltaLat < 0.00002 && deltaLon < 0.00002 && (millis() - lastGpsTransmissionMs < 20000)) {
      return;
    }
  }

  WiFiClient client;
  WiFiClientSecure secureClient;
  HTTPClient http;
  String url = String(SERVER_BASE_URL) + "/api/v1/gps";

  beginHttp(http, client, secureClient, url);
  addAgriShieldHeaders(http);

  String json = "{";
  json += "\"device_id\":\"" + String(DEVICE_ID) + "\",";
  json += "\"satellites\":" + String(satelliteCount) + ",";
  json += "\"gps_fix\":" + String(fixValid ? "true" : "false") + ",";

  if (fixValid) {
    json += "\"latitude\":" + String(latitude, 6) + ",";
    json += "\"longitude\":" + String(longitude, 6) + ",";
    json += "\"altitude_m\":" + String(altitude, 1) + ",";
    json += "\"speed\":" + String(speedKmph, 1);
  } else {
    json += "\"latitude\":null,";
    json += "\"longitude\":null,";
    json += "\"altitude_m\":null,";
    json += "\"speed\":null";
  }
  json += "}";

  int httpCode = http.POST(json);
  if (httpCode == 200 || httpCode == 201) {
    Serial.printf("[GPS] Sent -> Fix: %s | Sats: %d (HTTP %d)\n", fixValid ? "YES" : "NO", satelliteCount, httpCode);
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
